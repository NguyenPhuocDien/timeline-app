'use strict';

/**
 * Timeline Focus — two-way Google Calendar sync (Cloud Functions, gen 2).
 *
 *   Pha 1 (OAuth):   gcalGetAuthUrl (callable) + gcalOauthCallback (https)
 *   Pha 2 (push):    onAppEventWrite / onAppTaskWrite (Firestore triggers)
 *   Pha 3 (pull):    gcalWebhook (https) + renewGcalChannels (scheduled)
 *
 * Secrets (firebase functions:secrets:set NAME):
 *   GCAL_CLIENT_ID, GCAL_CLIENT_SECRET, GCAL_TOKEN_KEY
 */
const crypto = require('crypto');
const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');

const { REGION, OAUTH_STATE_TTL_MS } = require('./lib/config');
const store = require('./lib/firestore');
const oauth = require('./lib/oauth');
const cryptoBox = require('./lib/crypto');
const { ensureAppCalendar } = require('./lib/calendar');

const GCAL_CLIENT_ID = defineSecret('GCAL_CLIENT_ID');
const GCAL_CLIENT_SECRET = defineSecret('GCAL_CLIENT_SECRET');
const GCAL_TOKEN_KEY = defineSecret('GCAL_TOKEN_KEY');

const baseOpts = { region: REGION };
const oauthSecrets = [GCAL_CLIENT_ID, GCAL_CLIENT_SECRET, GCAL_TOKEN_KEY];

/** Redirect URI must exactly match the Authorized redirect URI on the client. */
function callbackUrl(req) {
  // 2nd-gen URL host is stable per function; derive from the incoming request.
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${req.headers.host}/gcalOauthCallback`;
}

function makeClient(redirectUri) {
  return oauth.makeOAuthClient({
    clientId: GCAL_CLIENT_ID.value(),
    clientSecret: GCAL_CLIENT_SECRET.value(),
    redirectUri,
  });
}

// ════════════════════════════════════════════════════════════════════════════
// PHA 1 — OAuth: get a refresh token (offline access)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Callable from the app (requires Firebase auth). Returns a Google consent URL
 * carrying a single-use state nonce bound to the caller's uid.
 */
exports.gcalGetAuthUrl = onCall(
  { ...baseOpts, secrets: oauthSecrets },
  async (request) => {
    const uid = request.auth && request.auth.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Bạn cần đăng nhập trước.');

    const nonce = crypto.randomBytes(16).toString('hex');
    await store.putOauthState(nonce, uid);

    // redirectUri is fixed per deployment; build it from the known callback fn.
    // We cannot read the request host here (callable), so the deployer sets it
    // via the OAuth client + this must match. Use the canonical 2nd-gen host.
    const redirectUri = `https://${REGION}-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/gcalOauthCallback`;
    const client = makeClient(redirectUri);
    return { url: oauth.buildConsentUrl(client, nonce) };
  }
);

/**
 * Google redirects here after consent. Exchanges the code, stores the encrypted
 * refresh token, and ensures the "Timeline Focus" calendar exists.
 */
exports.gcalOauthCallback = onRequest(
  { ...baseOpts, secrets: oauthSecrets },
  async (req, res) => {
    try {
      const code = req.query.code;
      const nonce = req.query.state;
      if (!code || !nonce) return res.status(400).send('Thiếu code/state.');

      const stateDoc = await store.takeOauthState(String(nonce));
      if (!stateDoc) return res.status(400).send('Phiên kết nối đã hết hạn, thử lại.');
      if (Date.now() - toMillis(stateDoc.createdAt) > OAUTH_STATE_TTL_MS) {
        return res.status(400).send('Phiên kết nối đã hết hạn, thử lại.');
      }
      const uid = stateDoc.uid;

      const client = makeClient(callbackUrl(req));
      const tokens = await oauth.exchangeCode(client, String(code));
      if (!tokens.refresh_token) {
        // Happens if the user previously granted without revoking; prompt=consent
        // should force one, but guard anyway.
        return res.status(400).send('Google không cấp refresh token. Hãy thử lại và nhấn "Cho phép".');
      }

      const enc = cryptoBox.encrypt(tokens.refresh_token, GCAL_TOKEN_KEY.value());
      await store.saveToken(uid, { refreshEnc: enc, scope: tokens.scope || '' });

      // Ensure dedicated calendar, remember its id.
      oauth.clientWithRefreshToken(client, tokens.refresh_token);
      const calendarId = await ensureAppCalendar(client);
      await store.saveState(uid, { calendarId });

      res.set('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(doneHtml());
    } catch (err) {
      logger.error('gcalOauthCallback failed', err);
      return res.status(500).send('Kết nối thất bại. Đóng cửa sổ và thử lại.');
    }
  }
);

function toMillis(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  return 0;
}

function doneHtml() {
  return `<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;text-align:center;padding:3rem">
<h2>✅ Đã kết nối Google Calendar</h2><p>Bạn có thể đóng cửa sổ này.</p>
<script>try{window.opener&&window.opener.postMessage({type:'gcal-connected'},'*')}catch(e){}setTimeout(()=>window.close(),1200)</script>
</body>`;
}

// ════════════════════════════════════════════════════════════════════════════
// PHA 2 — App -> Google (Firestore triggers). SCAFFOLD: wired, logic in Pha 2.
// ════════════════════════════════════════════════════════════════════════════
exports.onAppEventWrite = onDocumentWritten(
  { ...baseOpts, secrets: oauthSecrets, document: 'users/{uid}/events/{eventId}' },
  async (event) => {
    // TODO Pha 2: diff before/after, push create/update/delete to Google,
    // store mapping in gcal_links, stamp extendedProperties.private.tlfId.
    logger.debug('onAppEventWrite (scaffold)', { uid: event.params.uid, id: event.params.eventId });
  }
);

exports.onAppTaskWrite = onDocumentWritten(
  { ...baseOpts, secrets: oauthSecrets, document: 'users/{uid}/tasks/{taskId}' },
  async (event) => {
    // TODO Pha 2: only sync tasks with a date+time; same push/mapping logic.
    logger.debug('onAppTaskWrite (scaffold)', { uid: event.params.uid, id: event.params.taskId });
  }
);

// ════════════════════════════════════════════════════════════════════════════
// PHA 3 — Google -> App (webhook + incremental sync). SCAFFOLD.
// ════════════════════════════════════════════════════════════════════════════
exports.gcalWebhook = onRequest(
  { ...baseOpts, secrets: oauthSecrets },
  async (req, res) => {
    // TODO Pha 3: validate channel headers, look up uid by channelId, run an
    // incremental events.list with syncToken, write changes to Firestore,
    // skipping events whose extendedProperties.private.tlfId we just wrote.
    logger.debug('gcalWebhook (scaffold)', { channel: req.headers['x-goog-channel-id'] });
    res.status(200).send('ok');
  }
);

exports.renewGcalChannels = onSchedule(
  { ...baseOpts, secrets: oauthSecrets, schedule: 'every 24 hours' },
  async () => {
    // TODO Pha 3: re-create watch channels expiring within ~48h.
    logger.debug('renewGcalChannels (scaffold)');
  }
);
