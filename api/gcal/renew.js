'use strict';

/**
 * GET /api/gcal/renew   (Pha 3 — cron)
 * Channel push của Google hết hạn ~7 ngày. Cron này (vercel.json "crons") quét
 * mọi channel sắp hết hạn (< 24h) và đăng ký lại để Google → App không gián đoạn.
 *
 * Bảo vệ: nếu đặt env CRON_SECRET thì yêu cầu header Authorization: Bearer <secret>
 * (Vercel Cron tự gửi header này khi CRON_SECRET được cấu hình).
 */
const crypto = require('crypto');
const store = require('./_lib/store');
const cryptoBox = require('./_lib/crypto');
const oauth = require('./_lib/oauth');
const { redirectUri, appBaseUrl } = require('./_lib/config');
const { watchCalendar, stopChannel } = require('./_lib/calendar');

const RENEW_THRESHOLD_MS = 24 * 60 * 60 * 1000;

module.exports = async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.authorization || '';
    if (auth !== `Bearer ${secret}`) return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    const channels = await store.listChannels();
    const nowMs = Date.now();
    let renewed = 0;
    for (const ch of channels) {
      const exp = Number(ch.expiration) || 0;
      if (exp - nowMs > RENEW_THRESHOLD_MS) continue; // còn hạn → bỏ qua

      const tokenDoc = await store.getToken(ch.uid);
      if (!tokenDoc || !tokenDoc.refreshEnc) continue;
      let refreshToken;
      try {
        refreshToken = cryptoBox.decrypt(tokenDoc.refreshEnc, process.env.GCAL_TOKEN_KEY);
      } catch {
        continue;
      }
      const authed = oauth.clientWithRefreshToken(redirectUri(req), refreshToken);

      await stopChannel(authed, ch.channelId, ch.resourceId).catch(() => {});
      await store.deleteChannel(ch.channelId).catch(() => {});

      const channelId = crypto.randomBytes(16).toString('hex');
      const channelToken = crypto.randomBytes(24).toString('hex');
      const address = `${appBaseUrl(req)}/api/gcal/webhook`;
      try {
        const { resourceId, expiration } = await watchCalendar(authed, ch.calendarId, channelId, address, channelToken);
        await store.saveChannel(channelId, { uid: ch.uid, calendarId: ch.calendarId, resourceId, expiration, token: channelToken });
        // Chỉ ghi state nếu channel ta vừa thay đúng là channel hiện hành của user
        // (tránh đè channel mới hơn do /watch chạy song song tạo ra).
        const cur = await store.getState(ch.uid);
        if (!cur || !cur.channelId || cur.channelId === ch.channelId) {
          await store.saveState(ch.uid, { channelId, resourceId, channelExpiry: expiration });
        }
        renewed++;
      } catch (err) {
        console.error('[gcal/renew] watch failed for', ch.uid, err);
      }
    }
    return res.status(200).json({ ok: true, total: channels.length, renewed });
  } catch (err) {
    console.error('[gcal/renew]', err);
    return res.status(500).json({ error: 'renew-failed' });
  }
};
