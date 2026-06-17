'use strict';

/**
 * POST /api/gcal/watch   (Pha 3 — bật đồng bộ Google → App)
 * Auth: Firebase ID token. Đăng ký push channel của Google trên calendar
 * "Timeline Focus" và seed syncToken. Gọi sau khi user kết nối (Pha 1).
 *
 * Channel Google hết hạn ~7 ngày → cron /api/gcal/renew gia hạn (xem renew.js).
 */
const crypto = require('crypto');
const { requireUser } = require('./_lib/auth');
const store = require('./_lib/store');
const cryptoBox = require('./_lib/crypto');
const oauth = require('./_lib/oauth');
const { redirectUri, appBaseUrl } = require('./_lib/config');
const { ensureAppCalendar, watchCalendar, stopChannel, listChanges } = require('./_lib/calendar');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method-not-allowed' });

  const uid = await requireUser(req);
  if (!uid) return res.status(401).json({ error: 'unauthenticated' });

  const tokenDoc = await store.getToken(uid);
  if (!tokenDoc || !tokenDoc.refreshEnc) return res.status(409).json({ error: 'not-connected' });
  let refreshToken;
  try {
    refreshToken = cryptoBox.decrypt(tokenDoc.refreshEnc, process.env.GCAL_TOKEN_KEY);
  } catch (err) {
    console.error('[gcal/watch] decrypt', err);
    return res.status(500).json({ error: 'token-decrypt-failed' });
  }
  const authed = oauth.clientWithRefreshToken(redirectUri(req), refreshToken);

  try {
    let state = await store.getState(uid);
    let calendarId = state && state.calendarId;
    if (!calendarId) {
      calendarId = await ensureAppCalendar(authed);
      await store.saveState(uid, { calendarId });
    }

    // Dừng channel cũ (nếu có) để tránh trùng notification.
    if (state && state.channelId && state.resourceId) {
      await stopChannel(authed, state.channelId, state.resourceId).catch(() => {});
      await store.deleteChannel(state.channelId).catch(() => {});
    }

    const channelId = crypto.randomBytes(16).toString('hex');
    // Token bí mật xác thực webhook. KHÔNG dùng uid (uid không phải bí mật — lộ ở
    // client/log/path → ai biết uid+channelId sẽ giả mạo được notification).
    const channelToken = crypto.randomBytes(24).toString('hex');
    const address = `${appBaseUrl(req)}/api/gcal/webhook`;
    const { resourceId, expiration } = await watchCalendar(authed, calendarId, channelId, address, channelToken);
    await store.saveChannel(channelId, { uid, calendarId, resourceId, expiration, token: channelToken });

    // Seed syncToken: full list lần đầu để các webhook sau chạy incremental.
    const seed = await listChanges(authed, calendarId, null);
    await store.saveState(uid, {
      channelId,
      resourceId,
      channelExpiry: expiration,
      syncToken: seed.nextSyncToken || null,
    });

    return res.status(200).json({ ok: true, channelId, expiration });
  } catch (err) {
    console.error('[gcal/watch]', err);
    const code = err && (err.code || (err.response && err.response.status));
    if (code === 401 || code === 403) return res.status(409).json({ error: 'reauth-needed' });
    return res.status(500).json({ error: 'watch-failed' });
  }
};
