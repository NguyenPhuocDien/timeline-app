'use strict';

/**
 * GET /api/gcal/callback?code=...&state=...
 * Google redirects here after consent. Exchanges the code, stores the encrypted
 * refresh token, and ensures the "Timeline Focus" calendar exists.
 */
const store = require('./_lib/store');
const oauth = require('./_lib/oauth');
const cryptoBox = require('./_lib/crypto');
const { ensureAppCalendar } = require('./_lib/calendar');
const { redirectUri, OAUTH_STATE_TTL_MS } = require('./_lib/config');

function toMillis(ts) {
  if (ts && typeof ts.toMillis === 'function') return ts.toMillis();
  return 0;
}

function doneHtml(message, ok) {
  return `<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;text-align:center;padding:3rem">
<h2>${ok ? '✅' : '⚠️'} ${message}</h2><p>Bạn có thể đóng cửa sổ này.</p>
<script>try{window.opener&&window.opener.postMessage({type:'${ok ? 'gcal-connected' : 'gcal-error'}'},'*')}catch(e){}${ok ? 'setTimeout(()=>window.close(),1200)' : ''}</script>
</body>`;
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  try {
    const { code, state: nonce } = req.query;
    if (!code || !nonce) return res.status(400).send(doneHtml('Thiếu code/state.', false));

    const stateDoc = await store.takeOauthState(String(nonce));
    if (!stateDoc || Date.now() - toMillis(stateDoc.createdAt) > OAUTH_STATE_TTL_MS) {
      return res.status(400).send(doneHtml('Phiên kết nối đã hết hạn, thử lại.', false));
    }
    const uid = stateDoc.uid;

    const client = oauth.clientFromEnv(redirectUri(req));
    const tokens = await oauth.exchangeCode(client, String(code));
    if (!tokens.refresh_token) {
      return res.status(400).send(doneHtml('Google không cấp refresh token. Thử lại và nhấn "Cho phép".', false));
    }

    const enc = cryptoBox.encrypt(tokens.refresh_token, process.env.GCAL_TOKEN_KEY);
    await store.saveToken(uid, { refreshEnc: enc, scope: tokens.scope || '' });

    const authed = oauth.clientWithRefreshToken(redirectUri(req), tokens.refresh_token);
    const calendarId = await ensureAppCalendar(authed);
    await store.saveState(uid, { calendarId });

    return res.status(200).send(doneHtml('Đã kết nối Google Calendar', true));
  } catch (err) {
    console.error('[gcal/callback]', err);
    return res.status(500).send(doneHtml('Kết nối thất bại. Đóng cửa sổ và thử lại.', false));
  }
};
