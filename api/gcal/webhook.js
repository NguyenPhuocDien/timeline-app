'use strict';

/**
 * POST /api/gcal/webhook   (Pha 3 — Google → App)
 * Google gọi khi calendar "Timeline Focus" có thay đổi (headers X-Goog-*).
 * Ta dùng syncToken để lấy incremental changes rồi ghi về Firestore.
 *
 * PHẠM VI AN TOÀN: chỉ xử lý event do app tạo (mang extendedProperties.private.tlfId).
 * Tức là user SỬA/XOÁ trên Google một event app đã đẩy → app phản chiếu lại.
 * Event user tạo TRỰC TIẾP trong lịch "Timeline Focus" (không có tlfId) → bỏ qua
 * (tránh đoán sai task/event + tránh đụng dữ liệu ngoài tầm). Xem README/doc.
 *
 * Luôn trả 200 để Google không retry dồn; lỗi được log lại.
 */
const store = require('./_lib/store');
const cryptoBox = require('./_lib/crypto');
const oauth = require('./_lib/oauth');
const { redirectUri } = require('./_lib/config');
const { listChanges, fromGoogleEvent } = require('./_lib/calendar');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const channelId = req.headers['x-goog-channel-id'];
  const resourceState = req.headers['x-goog-resource-state'];
  const token = req.headers['x-goog-channel-token'];
  if (!channelId) return res.status(400).end();

  try {
    const channel = await store.getChannel(String(channelId));
    if (!channel) return res.status(200).end(); // channel lạ/đã huỷ → bỏ qua
    // Bắt buộc token khớp token bí mật của channel (KHÔNG dùng uid). Thiếu token
    // hoặc sai → từ chối, tránh kẻ lạ ép server pull/ghi đè dữ liệu user.
    if (!token || String(token) !== String(channel.token || '')) return res.status(200).end();
    if (resourceState === 'sync') return res.status(200).end(); // handshake khởi tạo channel

    const tokenDoc = await store.getToken(channel.uid);
    if (!tokenDoc || !tokenDoc.refreshEnc) return res.status(200).end();
    const refreshToken = cryptoBox.decrypt(tokenDoc.refreshEnc, process.env.GCAL_TOKEN_KEY);
    const authed = oauth.clientWithRefreshToken(redirectUri(req), refreshToken);

    await processChanges(channel.uid, authed, channel.calendarId);
    return res.status(200).end();
  } catch (err) {
    console.error('[gcal/webhook]', err);
    return res.status(200).end();
  }
};

// Thay đổi xảy ra trong khoảng này sau khi app push được coi là ECHO của chính
// app (etag feed có thể khác etag insert/patch nên không đủ tin một mình).
const PUSH_ECHO_GRACE_MS = 90 * 1000;

async function processChanges(uid, authed, calendarId) {
  const state = await store.getState(uid);
  const syncToken = state && state.syncToken;
  let result = await listChanges(authed, calendarId, syncToken);
  if (result.expired) result = await listChanges(authed, calendarId, null); // syncToken hết hạn → full

  let skippedForeign = 0;
  let failed = 0;
  for (const raw of result.events) {
    const ev = fromGoogleEvent(raw);
    const appId = ev.tlfId; // chỉ event do app tạo mới mang tlfId
    if (!appId) { skippedForeign++; continue; }
    try {
      const handled = await applyChange(uid, appId, ev);
      if (!handled) skippedForeign++;
    } catch (err) {
      failed++;
      console.error(`[gcal/webhook] xử lý event appId=${appId} lỗi:`, err && err.message);
    }
  }

  // CHỈ tiến syncToken khi không event nào lỗi — nếu có lỗi, giữ token cũ để lần
  // webhook sau pull lại (Google luôn nhận 200 nên sẽ không tự retry batch này).
  if (result.nextSyncToken && failed === 0) await store.saveState(uid, { syncToken: result.nextSyncToken });
  if (skippedForeign) console.log(`[gcal/webhook] uid=${uid} bỏ qua ${skippedForeign} event (không phải do app / không có link)`);
  if (failed) console.warn(`[gcal/webhook] uid=${uid} ${failed} event lỗi — giữ syncToken cũ để thử lại`);
}

/** Áp một thay đổi từ Google về Firestore. Trả true nếu đã xử lý, false nếu bỏ qua. */
async function applyChange(uid, appId, ev) {
  const link = await store.getLink(uid, appId);
  if (!link) return false; // mang tlfId nhưng app không còn link → bỏ qua
  const coll = link.kind === 'event' ? 'events' : 'tasks';
  const now = new Date().toISOString();

  if (ev.deleted) {
    const patch = coll === 'tasks'
      ? { status: 'deleted', deletedAt: now, updatedAt: now }
      : { deletedAt: now, updatedAt: now };
    await store.setAppItem(uid, coll, appId, patch);
    await store.deleteLink(uid, appId);
    return true;
  }

  // Chống loop: (a) etag trùng lần app vừa đẩy, hoặc (b) thay đổi xảy ra ngay sau
  // khi app push (echo của chính app). Là echo → bỏ qua nhưng vẫn cập nhật etag.
  const updatedMs = ev.updated ? Date.parse(ev.updated) : 0;
  const isEcho = (link.etag && ev.etag && link.etag === ev.etag)
    || (link.lastPushAt && updatedMs && updatedMs <= Number(link.lastPushAt) + PUSH_ECHO_GRACE_MS);
  if (isEcho) {
    if (ev.etag && ev.etag !== link.etag) await store.saveLink(uid, appId, { etag: ev.etag, gcalId: ev.gcalId });
    return true;
  }

  // User sửa trên Google → cập nhật bản ghi app (merge, giữ field app-only như priority/tags/status).
  const patch = { title: ev.title, date: ev.date, notes: ev.notes || '', updatedAt: now };
  if (coll === 'tasks') {
    patch.start = ev.start || '';
    patch.end = ev.end || '';
    if (typeof ev.duration === 'number') patch.duration = ev.duration;
  }
  await store.setAppItem(uid, coll, appId, patch);
  await store.saveLink(uid, appId, { etag: ev.etag || '', gcalId: ev.gcalId });
  return true;
}
