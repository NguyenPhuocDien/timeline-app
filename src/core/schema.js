/**
 * Timeline Focus — Schema Definitions (Phase B FIX)
 *
 * Sửa tên field cho KHỚP app.js thật:
 *   - sessions (không phải focusSessions)
 *   - reviews (object map, treat như settings - 1 doc)
 *   - tags là array string
 *   - mission boolean (không phải isMission)
 *
 * App.js dùng các field: tasks, events, sessions, settings, reviews
 */

export const SCHEMA_VERSION = 2;

export const TASK_STATUSES = ['todo', 'doing', 'done', 'deferred', 'stack', 'deleted'];
export const TASK_PRIORITIES = ['high', 'medium', 'low'];
export const EVENT_TYPES = ['solar', 'lunar'];

/**
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} title
 * @property {string} date                     YYYY-MM-DD
 * @property {number} duration                 phút
 * @property {'high'|'medium'|'low'} priority
 * @property {string} status
 * @property {string} [start]                  HH:MM
 * @property {string} [end]                    HH:MM
 * @property {string} [deadline]
 * @property {string[]} [tags]                 array of strings (không có #)
 * @property {string} [eventId]
 * @property {string} [notes]
 * @property {boolean} [mission]               KHÔNG phải isMission
 * @property {boolean} [done]                  legacy, status === 'done' là chính
 * @property {string} [stackType]              'overdue' | 'unfinished'
 * @property {string} [stackedAt]
 * @property {string} [reason]
 * @property {number} [deferCount]
 * @property {string} [doneAt]
 * @property {Object} [flow]                   { summary, checklist[], notes[], blockers[], nextActions[], logs[] }
 *
 * @property {string} [createdAt]              ISO string (app.js dùng new Date().toISOString())
 * @property {string} [updatedAt]              ISO string
 * @property {string} [deletedAt]              ISO string (soft delete)
 * @property {1} [migratedFrom]
 */

/**
 * @typedef {Object} Event
 * @property {string} id
 * @property {string} title
 * @property {'solar'|'lunar'} type
 * @property {string} date
 * @property {boolean} recurring               app.js: boolean (true/false), NOT 'yes'/'no'
 * @property {string} [notes]
 * @property {string} [createdAt]
 * @property {string} [updatedAt]
 */

/**
 * @typedef {Object} Session
 * @property {string} id
 * @property {string} [taskId]
 * @property {string} [date]
 * @property {number} [minutes]
 * @property {string} [createdAt]
 */

/**
 * @typedef {Object} Settings
 * @property {string} [theme]
 * @property {string} [accent]
 * @property {string} [availableStart]
 * @property {string} [availableEnd]
 * @property {number} [dailyMissionLimit]
 * @property {boolean} [notifications]
 * @property {string} [backgroundPreset]
 * @property {string} [backgroundImage]        base64 - KHÔNG sync
 * @property {string} [backgroundName]
 */

// ════════════════════════════════════════════════════════════════════════════
// SANITIZERS — clean dữ liệu trước khi ghi Firestore
// Loại field undefined, giới hạn size, ép kiểu
// KHÔNG đụng đến field metadata sync (createdAt/updatedAt được set bằng serverTimestamp)
// ════════════════════════════════════════════════════════════════════════════

/** @param {Partial<Task>} task */
export function sanitizeTaskForFirestore(task) {
  const out = {};

  // Required
  out.id = String(task.id || '');
  out.title = String(task.title || '').slice(0, 500);
  out.date = String(task.date || '').slice(0, 10);
  out.duration = Math.max(0, Math.min(1440, Number(task.duration) || 60));
  out.priority = TASK_PRIORITIES.includes(task.priority) ? task.priority : 'medium';
  out.status = TASK_STATUSES.includes(task.status) ? task.status : 'todo';

  // Booleans (app.js: mission, done — không phải isMission)
  out.mission = Boolean(task.mission);
  if (task.done !== undefined) out.done = Boolean(task.done);

  // Optional strings
  if (task.start) out.start = String(task.start).slice(0, 8);
  if (task.end) out.end = String(task.end).slice(0, 8);
  if (task.deadline) out.deadline = String(task.deadline).slice(0, 8);
  if (task.notes) out.notes = String(task.notes).slice(0, 10000);
  if (task.eventId) out.eventId = String(task.eventId).slice(0, 100);

  // Stack-related
  if (task.stackType) out.stackType = String(task.stackType).slice(0, 50);
  if (task.stackedAt) out.stackedAt = String(task.stackedAt).slice(0, 30);
  if (task.reason) out.reason = String(task.reason).slice(0, 500);
  if (task.deferCount !== undefined) out.deferCount = Math.max(0, Number(task.deferCount) || 0);
  if (task.doneAt) out.doneAt = String(task.doneAt).slice(0, 30);

  // Tags = array of strings (app.js dùng `(t.tags || []).map(x => '#' + x)`)
  if (Array.isArray(task.tags)) {
    out.tags = task.tags.map(t => String(t).slice(0, 50)).filter(Boolean).slice(0, 50);
  } else if (typeof task.tags === 'string' && task.tags.trim()) {
    // Legacy: convert "#study #work" → ['study', 'work']
    out.tags = task.tags.split(/\s+/).filter(Boolean).map(t => t.replace(/^#/, '').slice(0, 50)).slice(0, 50);
  } else {
    out.tags = [];
  }

  // Flow object — giữ NGUYÊN structure app.js dùng
  if (task.flow && typeof task.flow === 'object') {
    out.flow = sanitizeFlow(task.flow);
  }

  // Timestamp metadata — app.js dùng ISO string
  if (task.createdAt) out.createdAt = String(task.createdAt).slice(0, 30);
  if (task.updatedAt) out.updatedAt = String(task.updatedAt).slice(0, 30);
  if (task.migratedFrom) out.migratedFrom = task.migratedFrom;

  return out;
}

function sanitizeFlow(flow) {
  const out = {
    summary: String(flow.summary || '').slice(0, 5000),
    checklist: [],
    notes: [],
    blockers: [],
    nextActions: [],
    logs: []
  };
  ['checklist'].forEach(k => {
    if (Array.isArray(flow[k])) {
      out[k] = flow[k].slice(0, 200).map(item => ({
        id: String(item?.id || ''),
        text: String(item?.text || '').slice(0, 1000),
        done: Boolean(item?.done)
      })).filter(x => x.id);
    }
  });
  ['notes', 'blockers', 'nextActions', 'logs'].forEach(k => {
    if (Array.isArray(flow[k])) {
      out[k] = flow[k].slice(0, 200).map(item => ({
        id: String(item?.id || ''),
        text: String(item?.text || '').slice(0, 2000),
        createdAt: String(item?.createdAt || '').slice(0, 30)
      })).filter(x => x.id);
    }
  });
  return out;
}

/** @param {Partial<Event>} event */
export function sanitizeEventForFirestore(event) {
  const out = {};
  out.id = String(event.id || '');
  out.title = String(event.title || '').slice(0, 500);
  out.date = String(event.date || '').slice(0, 10);
  out.type = EVENT_TYPES.includes(event.type) ? event.type : 'solar';
  // App.js: recurring là boolean (true/false), NOT 'yes'/'no'
  out.recurring = event.recurring !== false;
  if (event.notes) out.notes = String(event.notes).slice(0, 5000);
  if (event.createdAt) out.createdAt = String(event.createdAt).slice(0, 30);
  if (event.updatedAt) out.updatedAt = String(event.updatedAt).slice(0, 30);
  if (event.migratedFrom) out.migratedFrom = event.migratedFrom;
  return out;
}

/** @param {Partial<Session>} session - app.js: sessions, KHÔNG phải focusSessions */
export function sanitizeSessionForFirestore(session) {
  const out = {};
  out.id = String(session.id || '');
  if (session.taskId) out.taskId = String(session.taskId).slice(0, 100);
  if (session.date) out.date = String(session.date).slice(0, 10);
  if (session.minutes !== undefined) {
    out.minutes = Math.max(0, Math.floor(Number(session.minutes) || 0));
  }
  if (session.createdAt) out.createdAt = String(session.createdAt).slice(0, 30);
  if (session.migratedFrom) out.migratedFrom = session.migratedFrom;
  return out;
}

/** @param {Settings} settings */
export function sanitizeSettingsForFirestore(settings) {
  if (!settings || typeof settings !== 'object') return {};
  const out = { ...settings };
  // Background image base64 có thể MB → KHÔNG sync (đã đúng theo app.js cloudComparableDb)
  delete out.backgroundImage;
  delete out.backgroundName;
  // Giữ backgroundPreset = 'none' nếu là 'upload' (vì upload phụ thuộc backgroundImage local-only)
  if (out.backgroundPreset === 'upload') out.backgroundPreset = 'none';
  return out;
}

/**
 * Reviews là object map { 'YYYY-MM-DD': reviewData }
 * App.js dùng `db.reviews` như dictionary, không phải array.
 * Treat như settings — 1 document duy nhất.
 * @param {Object} reviews
 */
export function sanitizeReviewsForFirestore(reviews) {
  if (!reviews || typeof reviews !== 'object') return {};
  const out = {};
  // Giới hạn 365 ngày để không vỡ 1MB doc
  const keys = Object.keys(reviews).slice(-365);
  for (const k of keys) {
    if (typeof k !== 'string' || k.length > 30) continue;
    const v = reviews[k];
    if (v && typeof v === 'object') {
      // Clean each review object
      out[k] = JSON.parse(JSON.stringify(v));
    }
  }
  return out;
}
