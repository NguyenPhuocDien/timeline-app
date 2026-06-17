/**
 * Timeline Focus — Google Calendar 2 CHIỀU (client wiring cho backend /api/gcal).
 *
 * Bổ trợ cho gcal.js (read-only). Module này lo phần GHI: app → Google qua
 * /api/gcal/push, và bật webhook Google → App qua /api/gcal/watch.
 *
 * NGUYÊN TẮC AN TOÀN:
 *   - Chỉ hoạt động khi user đã bật "kết nối 2 chiều" (cờ localStorage).
 *   - Mọi lỗi đều nuốt gọn — KHÔNG bao giờ chặn luồng lưu của app.
 *   - Chỉ đẩy item ĐỔI (so signature) + debounce, tránh spam API.
 *   - Chưa nạp cấu hình server (Pha 0) thì các call trả lỗi → tự tắt cờ, báo nhẹ.
 *
 * API (window):
 *   gcalServerIsConnected() -> bool
 *   gcalServerConnect()     -> Promise<bool>  (mở popup OAuth server)
 *   gcalServerDisconnect()  -> void
 *   gcalServerPush(kind, op, item) -> Promise<void>
 *   gcalSyncOnPersist(db)   -> void  (app.js gọi trong save())
 *   gcalSyncPushAll(db)     -> void  (đẩy toàn bộ lần đầu sau khi connect)
 */
(function () {
  'use strict';

  const FLAG = 'tlf_gcal_server_v1';
  const API = { authUrl: '/api/gcal/auth-url', watch: '/api/gcal/watch', push: '/api/gcal/push' };

  function isConnected() { try { return localStorage.getItem(FLAG) === '1'; } catch { return false; } }
  function setConnected(v) { try { if (v) localStorage.setItem(FLAG, '1'); else localStorage.removeItem(FLAG); } catch { /* ignore */ } }
  function notify(msg) { if (typeof window.toast === 'function') window.toast(msg); else console.log('[gcal-sync]', msg); }

  async function idToken() {
    const u = window.auth && window.auth.currentUser;
    if (!u || typeof u.getIdToken !== 'function') return null;
    try { return await u.getIdToken(); } catch { return null; }
  }
  async function authedFetch(path, opts) {
    const t = await idToken();
    if (!t) throw new Error('no-id-token');
    const o = opts || {};
    const headers = Object.assign({ Authorization: 'Bearer ' + t }, o.headers || {});
    return fetch(path, Object.assign({}, o, { headers }));
  }

  window.gcalServerIsConnected = isConnected;

  window.gcalServerConnect = async function gcalServerConnect() {
    if (!(await idToken())) { notify('Hãy đăng nhập đồng bộ trước khi kết nối Google Calendar.'); return false; }
    let url;
    try {
      const res = await authedFetch(API.authUrl);
      if (!res.ok) throw new Error('auth-url ' + res.status);
      url = (await res.json()).url;
      if (!url) throw new Error('no-url');
    } catch {
      notify('Chưa kết nối được (server). Có thể cấu hình Google trên server chưa sẵn sàng.');
      return false;
    }

    const popup = window.open(url, 'gcal-oauth', 'width=480,height=660');
    return await new Promise((resolve) => {
      let done = false;
      function cleanup() { if (done) return; done = true; window.removeEventListener('message', onMsg); clearInterval(iv); }
      function onMsg(ev) {
        if (!ev.data || (ev.data.type !== 'gcal-connected' && ev.data.type !== 'gcal-error')) return;
        cleanup();
        if (ev.data.type === 'gcal-connected') {
          setConnected(true);
          notify('Đã kết nối Google Calendar (2 chiều).');
          authedFetch(API.watch, { method: 'POST' }).catch(() => { /* webhook không bật được cũng không sao */ });
          resolve(true);
        } else { notify('Kết nối Google thất bại.'); resolve(false); }
      }
      const iv = setInterval(() => { if (popup && popup.closed) { cleanup(); resolve(isConnected()); } }, 800);
      window.addEventListener('message', onMsg);
    });
  };

  window.gcalServerDisconnect = function gcalServerDisconnect() {
    setConnected(false);
    prev = null;
    notify('Đã tắt đồng bộ 2 chiều (cục bộ). Sự kiện đã đẩy vẫn nằm trên Google.');
  };

  // ── Push một item ────────────────────────────────────────────────────────────
  async function push(kind, op, item) {
    if (!isConnected() || !item || !item.id) return;
    try {
      const res = await authedFetch(API.push, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, op, item }),
      });
      if (res.status === 409) {
        const j = await res.json().catch(() => ({}));
        if (j.error === 'reauth-needed') { setConnected(false); notify('Phiên Google hết hạn — hãy kết nối lại Google Calendar (2 chiều).'); }
      }
    } catch { /* nuốt gọn: không chặn app */ }
  }
  window.gcalServerPush = push;

  // ── Diff theo signature: chỉ đẩy item thực sự đổi ─────────────────────────────
  let prev = null;          // { tasks: Map<id,{sig}>, events: Map<id,{sig}> }
  let lastDb = null;
  let timer = null;

  function taskSig(t) { return [t.title, t.date, t.start, t.end, t.duration, t.notes, t.status].join('|'); }
  function eventSig(e) { return [e.title, e.date, e.notes].join('|'); }
  function vals(obj) { return obj ? Object.values(obj) : []; }

  function baseline(db) {
    const tasks = new Map(), events = new Map();
    vals(db.tasks).forEach((t) => { if (t && t.id) tasks.set(t.id, { sig: taskSig(t) }); });
    vals(db.events).forEach((e) => { if (e && e.id) events.set(e.id, { sig: eventSig(e) }); });
    return { tasks, events };
  }

  window.gcalSyncOnPersist = function gcalSyncOnPersist(db) {
    if (!isConnected() || !db) return;
    lastDb = db;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; try { diffAndPush(db); } catch { /* never block */ } }, 1200);
  };

  function diffAndPush(db) {
    if (!prev) { prev = baseline(db); return; } // lần đầu: chỉ đặt mốc, không đẩy ồ ạt
    vals(db.tasks).forEach((t) => {
      if (!t || !t.id) return;
      const sig = taskSig(t); const p = prev.tasks.get(t.id);
      if (t.status === 'deleted') { if (!p || p.sig !== sig) push('task', 'delete', t); }
      else if (!p || p.sig !== sig) push('task', 'upsert', t);
    });
    prev.tasks.forEach((_p, id) => { if (!db.tasks || !db.tasks[id]) push('task', 'delete', { id }); });
    vals(db.events).forEach((e) => {
      if (!e || !e.id) return;
      const sig = eventSig(e); const p = prev.events.get(e.id);
      if (!p || p.sig !== sig) push('event', 'upsert', e);
    });
    prev.events.forEach((_p, id) => { if (!db.events || !db.events[id]) push('event', 'delete', { id }); });
    prev = baseline(db);
  }

  // Đẩy toàn bộ dữ liệu hiện có (gọi ngay sau khi connect lần đầu).
  window.gcalSyncPushAll = function gcalSyncPushAll(db) {
    const d = db || lastDb;
    if (!isConnected() || !d) return;
    vals(d.tasks).forEach((t) => { if (t && t.id && t.status !== 'deleted') push('task', 'upsert', t); });
    vals(d.events).forEach((e) => { if (e && e.id) push('event', 'upsert', e); });
    prev = baseline(d);
  };
})();
