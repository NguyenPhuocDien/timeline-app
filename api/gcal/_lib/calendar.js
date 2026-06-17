'use strict';

/**
 * Google Calendar helpers: ensure the dedicated "Timeline Focus" calendar
 * exists, and translate between the app's data shape and Google events.
 *
 * App shapes (see apps/web/src/core/schema.js):
 *   task : { id, title, date 'YYYY-MM-DD', start 'HH:MM', end 'HH:MM',
 *            duration(min), notes, ... }  → only synced when it has a date
 *   event: { id, title, type, date 'YYYY-MM-DD', notes, ... }
 */
const { google } = require('googleapis');
const { APP_CALENDAR_SUMMARY, TLF_PROP_KEY } = require('./config');

const TIME_ZONE = 'Asia/Ho_Chi_Minh';

function calendarApi(authClient) {
  return google.calendar({ version: 'v3', auth: authClient });
}

/** Find the app's calendar by summary, or create it. Returns its calendarId. */
async function ensureAppCalendar(authClient) {
  const cal = calendarApi(authClient);
  const list = await cal.calendarList.list({ maxResults: 250 });
  const found = (list.data.items || []).find((c) => c.summary === APP_CALENDAR_SUMMARY);
  if (found) return found.id;

  const created = await cal.calendars.insert({
    requestBody: { summary: APP_CALENDAR_SUMMARY, timeZone: TIME_ZONE },
  });
  return created.data.id;
}

/** True when an app item should be pushed to Google (has a concrete date). */
function isSyncable(item) {
  return !!(item && typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date));
}

/** Convert an app task/event to a Google event body (stamps tlfId). */
function toGoogleEvent(appId, item) {
  const body = {
    summary: String(item.title || '(không tiêu đề)'),
    description: item.notes ? String(item.notes) : undefined,
    extendedProperties: { private: { [TLF_PROP_KEY]: appId } },
  };

  if (item.start && /^\d{2}:\d{2}$/.test(item.start)) {
    const endHHMM = item.end && /^\d{2}:\d{2}$/.test(item.end)
      ? item.end
      : addMinutes(item.start, item.duration || 30);
    body.start = { dateTime: `${item.date}T${item.start}:00`, timeZone: TIME_ZONE };
    body.end = { dateTime: `${item.date}T${endHHMM}:00`, timeZone: TIME_ZONE };
  } else {
    body.start = { date: item.date };
    body.end = { date: item.date };
  }
  return body;
}

function addMinutes(hhmm, minutes) {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + (Number(minutes) || 30);
  const nh = Math.floor((total % (24 * 60)) / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

// ── Pha 2: ghi sự kiện lên Google ────────────────────────────────────────────
/** Tạo event mới trên calendarId. Trả { gcalId, etag }. */
async function insertEvent(authClient, calendarId, appId, item) {
  const cal = calendarApi(authClient);
  const res = await cal.events.insert({ calendarId, requestBody: toGoogleEvent(appId, item) });
  return { gcalId: res.data.id, etag: res.data.etag };
}

/** Cập nhật event đã có (giữ nguyên tlfId). Trả { gcalId, etag }. */
async function patchEvent(authClient, calendarId, gcalId, appId, item) {
  const cal = calendarApi(authClient);
  const res = await cal.events.patch({ calendarId, eventId: gcalId, requestBody: toGoogleEvent(appId, item) });
  return { gcalId: res.data.id, etag: res.data.etag };
}

/** Xoá event. Bỏ qua 404/410 (đã không còn) → coi như thành công. */
async function deleteEvent(authClient, calendarId, gcalId) {
  const cal = calendarApi(authClient);
  try {
    await cal.events.delete({ calendarId, eventId: gcalId });
  } catch (err) {
    const code = err && (err.code || (err.response && err.response.status));
    if (code !== 404 && code !== 410) throw err;
  }
}

// ── Pha 3: kéo thay đổi từ Google (incremental syncToken) ─────────────────────
/**
 * Liệt kê thay đổi của calendarId.
 *   - Lần đầu (không syncToken): full list để lấy nextSyncToken.
 *   - Các lần sau: chỉ trả event đã đổi/xoá kể từ syncToken.
 * Trả { events, nextSyncToken, expired }. expired=true nếu syncToken hết hạn (410)
 * → caller nên gọi lại không kèm syncToken để full resync.
 */
async function listChanges(authClient, calendarId, syncToken) {
  const cal = calendarApi(authClient);
  const events = [];
  let pageToken;
  let nextSyncToken = null;
  do {
    const params = { calendarId, singleEvents: true, showDeleted: true, maxResults: 250 };
    if (syncToken) params.syncToken = syncToken;
    else params.timeMin = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(); // full: 30 ngày gần đây
    if (pageToken) params.pageToken = pageToken;
    let res;
    try {
      res = await cal.events.list(params);
    } catch (err) {
      const code = err && (err.code || (err.response && err.response.status));
      if (code === 410) return { events: [], nextSyncToken: null, expired: true };
      throw err;
    }
    (res.data.items || []).forEach((e) => events.push(e));
    pageToken = res.data.nextPageToken;
    if (res.data.nextSyncToken) nextSyncToken = res.data.nextSyncToken;
  } while (pageToken);
  return { events, nextSyncToken, expired: false };
}

/** Đăng ký push channel cho calendarId. Trả { resourceId, expiration }. */
async function watchCalendar(authClient, calendarId, channelId, address, token) {
  const cal = calendarApi(authClient);
  const res = await cal.events.watch({
    calendarId,
    requestBody: { id: channelId, type: 'web_hook', address, token },
  });
  return { resourceId: res.data.resourceId, expiration: Number(res.data.expiration) || 0 };
}

/** Dừng một push channel. */
async function stopChannel(authClient, channelId, resourceId) {
  const cal = calendarApi(authClient);
  try {
    await cal.channels.stop({ requestBody: { id: channelId, resourceId } });
  } catch (err) {
    const code = err && (err.code || (err.response && err.response.status));
    if (code !== 404) throw err;
  }
}

/**
 * Chuẩn hoá một event Google (từ listChanges) về shape app dùng để ghi Firestore.
 * Trả { kind, appId, deleted, record } — record là phần ghi đè cho task/event.
 *   - kind suy từ link đã lưu; nếu là event Google mới (chưa có tlfId) → mặc định 'task'.
 */
function fromGoogleEvent(raw) {
  const tlfId = raw.extendedProperties && raw.extendedProperties.private
    ? raw.extendedProperties.private[TLF_PROP_KEY] : null;
  const deleted = raw.status === 'cancelled';
  const start = raw.start || {};
  const end = raw.end || {};
  const out = { gcalId: String(raw.id || ''), etag: raw.etag || '', updated: raw.updated || '', tlfId: tlfId || null, deleted };

  if (deleted) return out;

  out.title = String(raw.summary || '(không tiêu đề)');
  out.notes = typeof raw.description === 'string' ? raw.description : '';
  if (start.dateTime) {
    const s = new Date(start.dateTime);
    const e = end.dateTime ? new Date(end.dateTime) : null;
    const sp = partsInTZ(s);
    out.date = sp.date;
    out.start = sp.time;
    out.end = e ? partsInTZ(e).time : '';
    out.duration = e ? Math.max(0, Math.round((e - s) / 60000)) : 30;
    out.allDay = false;
  } else if (start.date) {
    out.date = String(start.date);
    out.start = '';
    out.end = '';
    out.duration = 0;
    out.allDay = true;
  }
  return out;
}

// Định dạng một Date theo TIME_ZONE (Vercel chạy UTC) → { date:'YYYY-MM-DD', time:'HH:MM' }.
function partsInTZ(d) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const p = {};
  for (const part of fmt.formatToParts(d)) p[part.type] = part.value;
  const hour = p.hour === '24' ? '00' : p.hour;
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${hour}:${p.minute}` };
}

module.exports = {
  calendarApi,
  ensureAppCalendar,
  isSyncable,
  toGoogleEvent,
  insertEvent,
  patchEvent,
  deleteEvent,
  listChanges,
  watchCalendar,
  stopChannel,
  fromGoogleEvent,
  TIME_ZONE,
  TLF_PROP_KEY,
};
