'use strict';

/**
 * Google Calendar helpers: ensure the dedicated "Timeline Focus" calendar
 * exists, and translate between the app's data shape and Google events.
 *
 * App shapes (see apps/web/src/core/schema.js):
 *   task : { id, title, date 'YYYY-MM-DD', start 'HH:MM', end 'HH:MM',
 *            duration(min), notes, ... }  → only synced when it has a date+time
 *   event: { id, title, type, date 'YYYY-MM-DD', notes, ... }
 */
const { google } = require('googleapis');
const { APP_CALENDAR_SUMMARY, TLF_PROP_KEY } = require('./config');

function calendarApi(authClient) {
  return google.calendar({ version: 'v3', auth: authClient });
}

/**
 * Find the app's calendar by summary, or create it. Returns its calendarId.
 * Stored in gcal_state so we only look it up once per user.
 */
async function ensureAppCalendar(authClient) {
  const cal = calendarApi(authClient);
  const list = await cal.calendarList.list({ maxResults: 250 });
  const found = (list.data.items || []).find((c) => c.summary === APP_CALENDAR_SUMMARY);
  if (found) return found.id;

  const created = await cal.calendars.insert({
    requestBody: { summary: APP_CALENDAR_SUMMARY, timeZone: 'Asia/Ho_Chi_Minh' },
  });
  return created.data.id;
}

/** True when an app item should be pushed to Google (has a concrete date). */
function isSyncable(item) {
  return !!(item && typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date));
}

/**
 * Convert an app task/event to a Google event body. Items with a start time map
 * to timed events; date-only items map to all-day events. Stamps tlfId so the
 * pull side can skip our own writes.
 */
function toGoogleEvent(appId, item) {
  const body = {
    summary: String(item.title || '(không tiêu đề)'),
    description: item.notes ? String(item.notes) : undefined,
    extendedProperties: { private: { [TLF_PROP_KEY]: appId } },
  };

  if (item.start && /^\d{2}:\d{2}$/.test(item.start)) {
    const startISO = `${item.date}T${item.start}:00`;
    const endHHMM = item.end && /^\d{2}:\d{2}$/.test(item.end) ? item.end : addMinutes(item.start, item.duration || 30);
    const endISO = `${item.date}T${endHHMM}:00`;
    body.start = { dateTime: startISO, timeZone: 'Asia/Ho_Chi_Minh' };
    body.end = { dateTime: endISO, timeZone: 'Asia/Ho_Chi_Minh' };
  } else {
    body.start = { date: item.date };
    body.end = { date: item.date }; // single all-day
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

module.exports = { calendarApi, ensureAppCalendar, isSyncable, toGoogleEvent };
