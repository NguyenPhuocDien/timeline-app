'use strict';

/**
 * POST /api/gcal/push   (Pha 2 — App → Google)
 * Auth: Firebase ID token (Authorization: Bearer <idToken>).
 * Body: { kind: 'event'|'task', op: 'upsert'|'delete', item }.
 *
 * Đẩy một item của app lên calendar "Timeline Focus" của user và lưu mapping
 * appId ↔ gcalEventId vào gcal_links. Vercel không có Firestore trigger nên app
 * tự gọi endpoint này ngay sau khi ghi Firestore.
 *
 * Chống loop: event tạo trên Google luôn mang extendedProperties.private.tlfId=appId;
 * link lưu etag để Pha 3 (webhook) nhận ra thay đổi do chính app đẩy mà bỏ qua.
 */
const { requireUser } = require('./_lib/auth');
const store = require('./_lib/store');
const cryptoBox = require('./_lib/crypto');
const oauth = require('./_lib/oauth');
const { redirectUri } = require('./_lib/config');
const {
  isSyncable, insertEvent, patchEvent, deleteEvent, ensureAppCalendar,
} = require('./_lib/calendar');

function parseBody(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
  return b || {};
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method-not-allowed' });

  const uid = await requireUser(req);
  if (!uid) return res.status(401).json({ error: 'unauthenticated' });

  const { kind, op, item } = parseBody(req);
  if (!op || !item || !item.id) return res.status(400).json({ error: 'bad-request' });
  const appId = String(item.id);

  // 1. Token: load + giải mã refresh token.
  const tokenDoc = await store.getToken(uid);
  if (!tokenDoc || !tokenDoc.refreshEnc) return res.status(409).json({ error: 'not-connected' });
  let refreshToken;
  try {
    refreshToken = cryptoBox.decrypt(tokenDoc.refreshEnc, process.env.GCAL_TOKEN_KEY);
  } catch (err) {
    console.error('[gcal/push] decrypt', err);
    return res.status(500).json({ error: 'token-decrypt-failed' });
  }
  const authed = oauth.clientWithRefreshToken(redirectUri(req), refreshToken);

  // 2. calendarId ("Timeline Focus"); tạo nếu chưa có.
  let state = await store.getState(uid);
  let calendarId = state && state.calendarId;
  if (!calendarId) {
    calendarId = await ensureAppCalendar(authed);
    await store.saveState(uid, { calendarId });
  }

  try {
    // 3a. delete: gỡ event trên Google + xoá link.
    if (op === 'delete') {
      const link = await store.getLink(uid, appId);
      if (link && link.gcalId) {
        await deleteEvent(authed, link.calendarId || calendarId, link.gcalId);
        await store.deleteLink(uid, appId);
      }
      return res.status(200).json({ ok: true, op: 'delete' });
    }

    // 3b. upsert nhưng item không đẩy được (vd task chưa có ngày) → nếu từng có
    //     event trên Google thì gỡ đi để khỏi lệch.
    if (!isSyncable(item)) {
      const link = await store.getLink(uid, appId);
      if (link && link.gcalId) {
        await deleteEvent(authed, link.calendarId || calendarId, link.gcalId);
        await store.deleteLink(uid, appId);
      }
      return res.status(200).json({ ok: true, skipped: 'not-syncable' });
    }

    // 3c. upsert: patch nếu đã có link, insert nếu chưa.
    const link = await store.getLink(uid, appId);
    let result;
    if (link && link.gcalId) {
      result = await patchEvent(authed, link.calendarId || calendarId, link.gcalId, appId, item);
    } else {
      result = await insertEvent(authed, calendarId, appId, item);
    }
    await store.saveLink(uid, appId, {
      gcalId: result.gcalId,
      etag: result.etag || '',
      calendarId,
      kind: kind === 'event' ? 'event' : 'task',
      lastPushAt: Date.now(),
    });
    return res.status(200).json({ ok: true, op: link ? 'update' : 'create', gcalId: result.gcalId });
  } catch (err) {
    console.error('[gcal/push]', err);
    const code = err && (err.code || (err.response && err.response.status));
    // Refresh token bị thu hồi / thiếu quyền → app nên mời kết nối lại.
    if (code === 401 || code === 403) return res.status(409).json({ error: 'reauth-needed' });
    return res.status(500).json({ error: 'push-failed' });
  }
};
