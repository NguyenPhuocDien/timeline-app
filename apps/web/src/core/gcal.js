/**
 * Timeline Focus — Google Calendar (Phase 2): ĐỒNG BỘ 1 CHIỀU, READ-ONLY.
 *
 * App ĐỌC & HIỂN THỊ sự kiện từ Google Calendar của user.
 *   - KHÔNG ghi ngược lên Google.
 *   - KHÔNG lưu sự kiện Google vào Firestore / IndexedDB / db local.
 *   - Chỉ giữ trong bộ nhớ (+ token trong sessionStorage để sống qua reload) và render.
 *
 * Token Google (scope calendar.readonly) sống ~1h và KHÔNG có refresh token
 * (Firebase web không cấp). Khi hết hạn → mời user "Kết nối lại".
 *
 * Module này CHỦ YẾU trả data. app.js lo phần render (và phải esc() mọi text
 * untrusted từ Google).
 *
 * Public API (gắn lên window để app.js gọi):
 *   window.gcalConnect()                       → OAuth lấy quyền, lưu token. Promise<bool>
 *   window.gcalDisconnect()                    → xóa token + cache. void
 *   window.gcalIsConnected()                   → bool (còn token hợp lệ)
 *   window.gcalListCalendars()                 → Promise<[{id,summary,backgroundColor}]>
 *   window.gcalEnsureEvents(timeMinISO, max)   → fetch events khoảng [min,max), cache theo ngày
 *   window.gcalGetEventsForDay('YYYY-MM-DD')   → [normalized events] từ cache (đồng bộ, để render)
 *   window.gcalGetCalendars()                  → [{id,summary,backgroundColor}] từ cache
 *   window.gcalIsCalendarVisible(calId)        → bool (theo lựa chọn ẩn/hiện localStorage)
 *   window.gcalSetCalendarVisible(calId, bool) → lưu lựa chọn, không động storage.js
 *
 * Sự kiện DOM phát ra (app.js lắng nghe để re-render):
 *   'gcal-state-change'  → đổi trạng thái kết nối / danh sách lịch
 *   'gcal-events-change' → cache sự kiện đã cập nhật
 */

const API_BASE = 'https://www.googleapis.com/calendar/v3';
const VISIBILITY_KEY = 'tlf_gcal_hidden_v1'; // tập calId bị ẩn (lưu riêng, KHÔNG đụng storage.js)
// Token Google thực tế ~3600s; trừ hao 5 phút để tránh dùng sát giờ hết hạn.
const EXPIRY_SKEW_MS = 5 * 60 * 1000;
const MAX_EVENTS_PER_CAL = 250;

// ── MODULE STATE (chỉ memory) ────────────────────────────────────────────────
let accessToken = null;
let tokenExpiresAt = 0; // epoch ms
let calendarsCache = []; // [{id, summary, backgroundColor}]
// eventsByDay: Map<'YYYY-MM-DD', normalizedEvent[]>
let eventsByDay = new Map();
// Theo dõi khoảng đã fetch để debounce/tránh refetch trùng.
let lastFetchKey = '';
let inflightFetch = null;

// ════════════════════════════════════════════════════════════════════════════
// TOKEN — server cấp (không còn popup OAuth phía client)
// ════════════════════════════════════════════════════════════════════════════
// Access token để gọi Google REST trực tiếp KHÔNG còn lấy từ popup nữa. SERVER
// (giữ refresh token sống mãi) mint token tươi qua /api/gcal/token mỗi khi cần →
// user kết nối Google MỘT LẦN là dùng mãi, không phải đăng nhập/cấp quyền lại.

function serverConnected() {
  return typeof window.gcalServerIsConnected === 'function' && window.gcalServerIsConnected();
}

async function firebaseIdToken() {
  const u = window.auth && window.auth.currentUser;
  if (!u || typeof u.getIdToken !== 'function') return null;
  try { return await u.getIdToken(); } catch { return null; }
}

function clearToken() {
  accessToken = null;
  tokenExpiresAt = 0;
}

function hasValidToken() {
  return !!accessToken && Date.now() < (tokenExpiresAt - EXPIRY_SKEW_MS);
}

let tokenFetchInflight = null;
/** Đảm bảo có access token hợp lệ — xin server cấp nếu thiếu/hết hạn. Trả bool. */
async function ensureToken() {
  if (hasValidToken()) return true;
  if (!serverConnected()) return false;
  if (!tokenFetchInflight) {
    tokenFetchInflight = (async () => {
      const idt = await firebaseIdToken();
      if (!idt) return false;
      let res;
      try {
        res = await fetch('/api/gcal/token', { headers: { Authorization: 'Bearer ' + idt } });
      } catch { return false; }
      if (res.status === 409) {
        // Refresh token bị thu hồi/hết hiệu lực → coi như ngắt kết nối.
        if (typeof window.gcalServerDisconnect === 'function') window.gcalServerDisconnect();
        emit('gcal-state-change');
        return false;
      }
      if (!res.ok) return false;
      let j; try { j = await res.json(); } catch { return false; }
      if (!j || !j.access_token) return false;
      accessToken = j.access_token;
      const ttl = Number(j.expires_in) > 0 ? Number(j.expires_in) : 3600;
      tokenExpiresAt = Date.now() + ttl * 1000;
      return true;
    })().finally(() => { tokenFetchInflight = null; });
  }
  return tokenFetchInflight;
}

// ════════════════════════════════════════════════════════════════════════════
// PUBLIC: CONNECT / DISCONNECT / STATUS
// ════════════════════════════════════════════════════════════════════════════
// Trạng thái "đã kết nối" = đã kết nối Google qua server (nhớ mãi), không phụ
// thuộc token tức thời (token sẽ được xin khi cần).
window.gcalIsConnected = function gcalIsConnected() {
  return serverConnected();
};

/** Nạp token + danh sách lịch sau khi kết nối (app.js gọi sau connect & khi khởi động). */
window.gcalActivateDisplay = async function gcalActivateDisplay() {
  if (!serverConnected()) return false;
  const ok = await ensureToken();
  if (!ok) return false;
  try { await window.gcalListCalendars(); } catch { /* đã xử lý nội bộ */ }
  return true;
};

window.gcalConnect = async function gcalConnect() {
  // Kết nối DUY NHẤT: OAuth phía server (lấy refresh token, scope đọc + ghi). Sau
  // đó server cấp access token cho hiển thị; đồng bộ 2 chiều cũng dùng chung kết nối.
  if (typeof window.gcalServerConnect !== 'function') {
    notify('Đồng bộ chưa sẵn sàng, thử lại sau vài giây.');
    return false;
  }
  const ok = await window.gcalServerConnect();
  if (!ok) return false;
  emit('gcal-state-change');
  await window.gcalActivateDisplay(); // nạp token + danh sách lịch để hiển thị ngay
  return true;
};

window.gcalDisconnect = function gcalDisconnect() {
  // Xoá cache hiển thị + token cục bộ. (Cờ kết nối server do gcalServerDisconnect lo.)
  clearToken();
  calendarsCache = [];
  eventsByDay = new Map();
  lastFetchKey = '';
  emit('gcal-state-change');
  emit('gcal-events-change');
};

// ════════════════════════════════════════════════════════════════════════════
// VISIBILITY (lựa chọn ẩn/hiện lịch Google — localStorage riêng)
// ════════════════════════════════════════════════════════════════════════════
function loadHiddenSet() {
  try {
    const raw = localStorage.getItem(VISIBILITY_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}
function saveHiddenSet(set) {
  try { localStorage.setItem(VISIBILITY_KEY, JSON.stringify([...set])); } catch { /* ignore */ }
}

window.gcalIsCalendarVisible = function gcalIsCalendarVisible(calId) {
  return !loadHiddenSet().has(String(calId));
};

window.gcalSetCalendarVisible = function gcalSetCalendarVisible(calId, visible) {
  const set = loadHiddenSet();
  const id = String(calId);
  if (visible) set.delete(id); else set.add(id);
  saveHiddenSet(set);
  emit('gcal-events-change');
};

// ════════════════════════════════════════════════════════════════════════════
// FETCH HELPER
// ════════════════════════════════════════════════════════════════════════════
/**
 * Gọi Google Calendar API với Bearer token. Trả { ok, data, error } — KHÔNG ném
 * exception ra ngoài để không làm vỡ app.
 *   error.kind ∈ 'no-token' | 'auth' | 'api-disabled' | 'network' | 'http'
 */
async function apiFetch(pathAndQuery) {
  if (!(await ensureToken())) {
    return { ok: false, error: { kind: 'no-token', message: 'Chưa kết nối Google Calendar.' } };
  }
  let res;
  try {
    res = await fetch(`${API_BASE}${pathAndQuery}`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    });
  } catch (err) {
    return { ok: false, error: { kind: 'network', message: 'Lỗi mạng khi gọi Google Calendar.', raw: err } };
  }

  if (res.ok) {
    try {
      return { ok: true, data: await res.json() };
    } catch (err) {
      return { ok: false, error: { kind: 'http', message: 'Phản hồi Google không hợp lệ.', raw: err } };
    }
  }

  // Lỗi: cố đọc body để phân loại.
  let body = null;
  try { body = await res.json(); } catch { /* body có thể rỗng */ }
  const reason = body?.error?.errors?.[0]?.reason || body?.error?.status || '';
  const message = body?.error?.message || `HTTP ${res.status}`;

  if (res.status === 401) {
    // Token hết hạn / bị thu hồi → buộc kết nối lại.
    clearToken();
    emit('gcal-state-change');
    return { ok: false, error: { kind: 'auth', message: 'Phiên Google đã hết hạn, bấm Kết nối lại.' } };
  }
  if (res.status === 403) {
    if (reason === 'SERVICE_DISABLED' || /not been used|is disabled|enable/i.test(message)) {
      return {
        ok: false,
        error: {
          kind: 'api-disabled',
          message: 'Hãy bật Google Calendar API trong Cloud Console rồi thử lại.',
        },
      };
    }
    // 403 khác (thiếu scope, quota) → coi như cần kết nối lại với quyền đúng.
    return { ok: false, error: { kind: 'auth', message: 'Thiếu quyền Calendar — hãy Kết nối lại và chấp nhận quyền.' } };
  }
  return { ok: false, error: { kind: 'http', message: `Google trả lỗi: ${message}` } };
}

function reportError(error) {
  if (!error) return;
  // Lỗi auth/no-token đã có thông báo riêng ở chỗ gọi; chỉ toast các lỗi đáng chú ý.
  if (error.kind === 'no-token' || error.kind === 'auth') {
    notify(error.message || 'Phiên Google đã hết hạn, bấm Kết nối lại.');
  } else if (error.kind === 'api-disabled') {
    notify(error.message);
  } else if (error.kind === 'network') {
    notify('Không lấy được lịch Google (mạng). Sẽ thử lại khi bạn đổi view.');
  } else {
    notify(error.message || 'Lỗi khi tải lịch Google.');
    if (window.Sentry && error.raw) window.Sentry.captureException(error.raw);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// PUBLIC: CALENDAR LIST
// ════════════════════════════════════════════════════════════════════════════
window.gcalGetCalendars = function gcalGetCalendars() {
  return calendarsCache.slice();
};

window.gcalListCalendars = async function gcalListCalendars() {
  const result = await apiFetch('/users/me/calendarList?minAccessRole=reader&maxResults=250');
  if (!result.ok) {
    reportError(result.error);
    return [];
  }
  const items = Array.isArray(result.data?.items) ? result.data.items : [];
  calendarsCache = items.map((c) => ({
    id: String(c.id || ''),
    summary: String(c.summaryOverride || c.summary || c.id || 'Lịch'),
    backgroundColor: typeof c.backgroundColor === 'string' ? c.backgroundColor : '#4285f4',
    primary: !!c.primary,
  })).filter((c) => c.id);
  emit('gcal-state-change');
  return calendarsCache.slice();
};

// ════════════════════════════════════════════════════════════════════════════
// PUBLIC: EVENTS
// ════════════════════════════════════════════════════════════════════════════
window.gcalGetEventsForDay = function gcalGetEventsForDay(dateStr) {
  const list = eventsByDay.get(String(dateStr));
  if (!list) return [];
  // Tôn trọng ẩn/hiện lịch.
  const hidden = loadHiddenSet();
  return list.filter((ev) => !hidden.has(String(ev.calId)));
};

/**
 * Đảm bảo đã fetch events cho khoảng [timeMinISO, timeMaxISO). Debounce theo key
 * khoảng để tránh spam khi user đổi view liên tục. Trả Promise<void>.
 */
window.gcalEnsureEvents = async function gcalEnsureEvents(timeMinISO, timeMaxISO, force = false) {
  if (!serverConnected()) return;
  const key = `${timeMinISO}|${timeMaxISO}`;
  if (!force && key === lastFetchKey && eventsByDay.size) return; // đã có dữ liệu cho khoảng này
  // Nếu đang fetch khoảng này rồi → chờ promise đó.
  if (inflightFetch && inflightFetch.key === key) return inflightFetch.promise;

  const promise = fetchEventsRange(timeMinISO, timeMaxISO, key);
  inflightFetch = { key, promise };
  try {
    await promise;
  } finally {
    if (inflightFetch && inflightFetch.key === key) inflightFetch = null;
  }
};

async function fetchEventsRange(timeMinISO, timeMaxISO, key) {
  // Đảm bảo có danh sách lịch trước (cần để biết màu + calId).
  if (!calendarsCache.length) {
    await window.gcalListCalendars();
    if (!serverConnected()) return; // mất kết nối server giữa chừng
  }
  const targets = calendarsCache.length ? calendarsCache : [{ id: 'primary', summary: 'primary', backgroundColor: '#4285f4' }];

  const nextByDay = new Map();
  let anyError = null;

  for (const cal of targets) {
    if (!window.gcalIsCalendarVisible(cal.id)) continue; // không tốn quota cho lịch đang ẩn
    const q = new URLSearchParams({
      singleEvents: 'true',
      orderBy: 'startTime',
      timeMin: timeMinISO,
      timeMax: timeMaxISO,
      maxResults: String(MAX_EVENTS_PER_CAL),
    });
    const result = await apiFetch(`/calendars/${encodeURIComponent(cal.id)}/events?${q.toString()}`);
    if (!result.ok) {
      anyError = result.error;
      // auth/api-disabled là lỗi toàn cục → dừng sớm, không lặp các lịch khác.
      if (result.error.kind === 'auth' || result.error.kind === 'no-token' || result.error.kind === 'api-disabled') break;
      continue;
    }
    const items = Array.isArray(result.data?.items) ? result.data.items : [];
    for (const raw of items) {
      const ev = normalizeEvent(raw, cal);
      if (!ev) continue;
      bucketEventByDay(ev, nextByDay);
    }
  }

  eventsByDay = nextByDay;
  lastFetchKey = key;
  if (anyError) reportError(anyError);
  emit('gcal-events-change');
}

/**
 * Chuẩn hóa event Google về shape app dùng:
 *   { gcalId, calId, title, start, end, allDay, date, color }
 *   - start/end: 'HH:MM' (chỉ cho event có giờ), '' nếu all-day
 *   - date: 'YYYY-MM-DD' ngày bắt đầu (local)
 *   - htmlLink: link mở trên Google (để xem chi tiết)
 * Trả null nếu event bị hủy / thiếu thời gian.
 */
function normalizeEvent(raw, cal) {
  if (!raw || raw.status === 'cancelled') return null;
  const startInfo = raw.start || {};
  const endInfo = raw.end || {};

  // All-day: có .date (YYYY-MM-DD), không có .dateTime.
  if (startInfo.date && !startInfo.dateTime) {
    const date = String(startInfo.date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    return {
      gcalId: String(raw.id || ''),
      calId: String(cal.id),
      title: String(raw.summary || '(không có tiêu đề)'),
      start: '',
      end: '',
      allDay: true,
      date,
      // Google all-day .end là exclusive (ngày kết thúc + 1) → endDate để tính kéo dài nếu cần.
      endDate: endInfo.date ? String(endInfo.date) : date,
      color: cal.backgroundColor || '#4285f4',
      htmlLink: typeof raw.htmlLink === 'string' ? raw.htmlLink : '',
    };
  }

  // Event có giờ.
  if (startInfo.dateTime) {
    const startD = new Date(startInfo.dateTime);
    const endD = endInfo.dateTime ? new Date(endInfo.dateTime) : null;
    if (Number.isNaN(startD.getTime())) return null;
    return {
      gcalId: String(raw.id || ''),
      calId: String(cal.id),
      title: String(raw.summary || '(không có tiêu đề)'),
      start: hhmm(startD),
      end: endD && !Number.isNaN(endD.getTime()) ? hhmm(endD) : '',
      allDay: false,
      date: ymd(startD),
      endDate: endD && !Number.isNaN(endD.getTime()) ? ymd(endD) : ymd(startD),
      color: cal.backgroundColor || '#4285f4',
      htmlLink: typeof raw.htmlLink === 'string' ? raw.htmlLink : '',
    };
  }

  return null;
}

/**
 * Đặt event vào các ngày nó phủ. Event nhiều ngày (all-day kéo dài / qua đêm)
 * được nhân bản vào từng ngày để view tháng/tuần/ngày đều thấy.
 */
function bucketEventByDay(ev, map) {
  const startDate = ev.date;
  // All-day .endDate là exclusive; event có giờ .endDate là inclusive.
  let lastDate = ev.endDate || startDate;
  if (ev.allDay && ev.endDate && ev.endDate > startDate) {
    // lùi 1 ngày vì end exclusive
    lastDate = prevDay(ev.endDate);
    if (lastDate < startDate) lastDate = startDate;
  }
  let cursor = startDate;
  let guard = 0;
  while (cursor <= lastDate && guard < 400) {
    if (!map.has(cursor)) map.set(cursor, []);
    map.get(cursor).push(ev);
    cursor = nextDay(cursor);
    guard++;
  }
}

// ── date utils (local time, tránh lệch timezone bằng cách dùng Date local) ───
function pad2(n) { return String(n).padStart(2, '0'); }
function ymd(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function hhmm(d) { return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }
function nextDay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const x = new Date(y, m - 1, d + 1);
  return ymd(x);
}
function prevDay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const x = new Date(y, m - 1, d - 1);
  return ymd(x);
}

// ════════════════════════════════════════════════════════════════════════════
// UTIL
// ════════════════════════════════════════════════════════════════════════════
function emit(name) {
  try { document.dispatchEvent(new CustomEvent(name)); } catch { /* ignore */ }
}
function notify(msg) {
  if (typeof window.toast === 'function') window.toast(msg);
  else console.log('[gcal]', msg);
}
