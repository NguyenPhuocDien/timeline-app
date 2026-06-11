/**
 * Timeline Focus — Sync Engine v2 (Phase B FIX)
 *
 * Sửa từ Phase A:
 *   - focusSessions → sessions (khớp app.js)
 *   - Thêm reviews subscription (1 doc map theo ngày)
 *   - Conflict resolution dùng updatedAt ISO string (app.js dùng ISO, không phải Timestamp)
 *
 * Giữ NGUYÊN interface với app.js:
 *   - window.firebaseLogin()
 *   - window.firebaseLogout()
 *   - window.firebaseSync(db)
 *   - window.updateDbFromFirebase(db)  ← app.js đã định nghĩa, em không override
 *   - window.currentUserId
 *
 * App.js shape:
 *   db = { tasks: [], events: [], sessions: [], settings: {}, reviews: {} }
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  initializeFirestore,
  persistentLocalCache,
  memoryLocalCache,
  doc,
  collection,
  onSnapshot,
  writeBatch,
  setDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

import {
  sanitizeTaskForFirestore,
  sanitizeEventForFirestore,
  sanitizeSessionForFirestore,
  sanitizeSettingsForFirestore,
  sanitizeReviewsForFirestore,
} from './schema.js';
import { runMigrationIfNeeded } from './migration.js';

// ════════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIG (match config gốc trong index.html cũ)
// ════════════════════════════════════════════════════════════════════════════
const DEFAULT_CONFIG = {
  apiKey: 'AIzaSyBaSHqy3Vo7tYmsimmTMz7BJARPxtFmwdI',
  authDomain: 'timeline-app-9a872.firebaseapp.com',
  projectId: 'timeline-app-9a872',
  storageBucket: 'timeline-app-9a872.firebasestorage.app',
  messagingSenderId: '217681480315',
  appId: '1:217681480315:web:c3f39cb900bc0091c3f0de',
};

// ════════════════════════════════════════════════════════════════════════════
// MODULE STATE
// ════════════════════════════════════════════════════════════════════════════
let app = null;
let auth = null;
let dbFire = null;
let unsubscribers = [];
let lastSyncedLocalDb = null;
let pushDebounceTimer = null;
const PUSH_DEBOUNCE_MS = 800;
let syncStatus = 'signed-out';
let lastSyncError = null;
let isOnline = navigator.onLine;
let latestRemoteDb = coerceDbShape({});

// Track initial sync để KHÔNG echo lại remote data (tránh loop)
let initialSyncDone = false;

window.addEventListener('online', () => {
  isOnline = true;
  setSyncStatus(auth?.currentUser ? 'syncing' : 'signed-out');
});
window.addEventListener('offline', () => {
  isOnline = false;
  setSyncStatus('offline');
});

// ════════════════════════════════════════════════════════════════════════════
// SYNC STATUS API
// ════════════════════════════════════════════════════════════════════════════
function setSyncStatus(status, error = null) {
  syncStatus = status;
  lastSyncError = error;
  document.dispatchEvent(new CustomEvent('sync-status-change', {
    detail: { status, error }
  }));
  if (window.currentTab === 'settings' && typeof window.render === 'function') {
    window.render();
  }
}
window.getSyncStatus = () => ({ status: syncStatus, error: lastSyncError });

// ════════════════════════════════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════════════════════════════════
export function initSyncEngine(config = DEFAULT_CONFIG) {
  if (app) return;

  try {
    app = initializeApp(config);
    auth = getAuth(app);
    try {
      dbFire = initializeFirestore(app, { localCache: persistentLocalCache() });
    } catch (persistErr) {
      console.warn('[sync] Persistent cache unavailable, using memory cache:', persistErr.message);
      dbFire = initializeFirestore(app, { localCache: memoryLocalCache() });
    }

    window.dbFire = dbFire;
    window.auth = auth;

    onAuthStateChanged(auth, handleAuthStateChange);
    getRedirectResult(auth).catch((err) => {
      console.error('[sync] Redirect sign-in failed:', err);
      setSyncStatus('error', `Login failed: ${err?.message || err}`);
      showToast('Đăng nhập thất bại: ' + (err?.message || err));
      if (window.Sentry) window.Sentry.captureException(err);
    });
    setSyncStatus(isOnline ? 'signed-out' : 'offline');
  } catch (err) {
    console.error('[sync] Firebase init failed:', err);
    setSyncStatus('error', err.message);
    if (window.Sentry) window.Sentry.captureException(err);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════════════════════════════════════
window.firebaseLogin = async () => {
  if (!auth) {
    showToast('⚠️ Sync engine chưa init.');
    return;
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    const btn = document.getElementById('loginBtn');
    if (btn) btn.innerHTML = '⏳ Đang xử lý...';
    showToast('Đang chuyển sang Google để đăng nhập...');
    await signInWithRedirect(auth, provider);
  } catch (err) {
    if ([
      'auth/popup-blocked',
      'auth/cancelled-popup-request',
      'auth/internal-error',
      'auth/operation-not-supported-in-this-environment',
    ].includes(err?.code)) {
      showToast('Popup bị chặn, đang chuyển sang Google...');
      try {
        await signInWithRedirect(auth, provider);
      } catch (e2) {
        showToast('❌ Đăng nhập thất bại: ' + (e2?.message || e2));
        if (window.Sentry) window.Sentry.captureException(e2);
      }
      return;
    }
    showToast('❌ Đăng nhập thất bại: ' + (err?.message || err));
    if (window.Sentry) window.Sentry.captureException(err);
  }
};

window.firebaseLogout = () => {
  if (!auth) return;
  signOut(auth)
    .then(() => showToast('Đã đăng xuất'))
    .catch((err) => {
      showToast('❌ Đăng xuất thất bại: ' + err.message);
      if (window.Sentry) window.Sentry.captureException(err);
    });
};

async function handleAuthStateChange(user) {
  // Cleanup
  unsubscribers.forEach((u) => { try { u(); } catch {} });
  unsubscribers = [];
  initialSyncDone = false;
  lastSyncedLocalDb = null;

  const btn = document.getElementById('loginBtn');

  if (!user) {
    window.currentUserId = null;
    if (btn) {
      btn.innerHTML = '&#128273; Đăng nhập Đồng bộ';
      btn.onclick = window.firebaseLogin;
    }
    setSyncStatus(isOnline ? 'signed-out' : 'offline');
    if (window.currentTab === 'settings' && typeof window.render === 'function') {
      window.render();
    }
    return;
  }

  // Signed in
  window.currentUserId = user.uid;
  if (window.Sentry) {
    window.Sentry.setUser({ id: user.uid }); // KHÔNG gửi email
  }

  const displayName = user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'User';
  if (btn) {
    btn.innerHTML = `👤 ${escapeHtml(displayName)} (Đăng xuất)`;
    btn.onclick = window.firebaseLogout;
  }

  showToast('✅ Đã kết nối Cloud: ' + user.email);
  if (window.currentTab === 'settings' && typeof window.render === 'function') {
    window.render();
  }

  setSyncStatus('syncing');

  // Migration
  try {
    const result = await runMigrationIfNeeded(dbFire, user.uid);
    if (result.migrated) {
      showToast(
        `✅ Đã chuyển dữ liệu cũ sang schema mới: ` +
        `${result.taskCount} task, ${result.eventCount} sự kiện, ${result.sessionCount} session`
      );
    }
    if (result.error) {
      showToast('⚠️ Lỗi migration: ' + result.error);
      setSyncStatus('error', result.error);
      if (window.Sentry) window.Sentry.captureMessage('Migration failed: ' + result.error);
      return;
    }
  } catch (err) {
    console.error('[sync] Migration error:', err);
    showToast('❌ Lỗi migration.');
    setSyncStatus('error', err.message);
    if (window.Sentry) window.Sentry.captureException(err);
    return;
  }

  // Subscribe to subcollections
  subscribeToCollections(user.uid);
}

// ════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION
// ════════════════════════════════════════════════════════════════════════════
function subscribeToCollections(uid) {
  const tasksRef = collection(dbFire, 'users', uid, 'tasks');
  const eventsRef = collection(dbFire, 'users', uid, 'events');
  const sessionsRef = collection(dbFire, 'users', uid, 'sessions');
  const settingsRef = doc(dbFire, 'users', uid, 'settings', 'main');
  const reviewsRef = doc(dbFire, 'users', uid, 'reviews', 'main');

  /** @type {Map<string, any>} */
  const remoteTasks = new Map();
  const remoteEvents = new Map();
  const remoteSessions = new Map();
  let remoteSettings = null;
  let remoteReviews = null;
  let initialLoadsRemaining = 5;

  function onInitialLoad() {
    initialLoadsRemaining -= 1;
    if (initialLoadsRemaining === 0) {
      mergeAndApply();
      initialSyncDone = true;
      setSyncStatus('synced');
      const localDb = getLocalDbSnapshot();
      if (localDb) window.firebaseSync(localDb);
    }
  }

  function mergeAndApply() {
    const remoteDb = {
      tasks: [...remoteTasks.values()],
      events: [...remoteEvents.values()],
      sessions: [...remoteSessions.values()],
      settings: remoteSettings || {},
      reviews: remoteReviews || {},
    };
    latestRemoteDb = coerceDbShape(remoteDb);

    // Phát hiện xung đột (cùng 1 mục bị sửa trên 2 thiết bị) TRƯỚC khi merge ghi đè
    try { detectConflicts(latestRemoteDb); } catch (err) { console.warn('[sync] conflict detection failed:', err); }

    // Gọi app.js merge logic (mergeDbStates đã có sẵn ở app.js)
    if (typeof window.updateDbFromFirebase === 'function') {
      try {
        window.updateDbFromFirebase(remoteDb);
      } catch (err) {
        console.error('[sync] updateDbFromFirebase threw:', err);
        if (window.Sentry) window.Sentry.captureException(err);
      }
    }

    // Snapshot lastSynced AFTER merge để diff đúng
    lastSyncedLocalDb = deepClone(latestRemoteDb);
  }

  // Tasks
  unsubscribers.push(onSnapshot(tasksRef, (snap) => {
    snap.docChanges().forEach((change) => {
      const id = change.doc.id;
      const data = change.doc.data();
      if (change.type === 'removed') {
        remoteTasks.delete(id);
      } else {
        remoteTasks.set(id, { ...data, id, status: data.deletedAt ? 'deleted' : data.status });
      }
    });
    if (initialLoadsRemaining > 0) onInitialLoad();
    else mergeAndApply();
  }, (err) => handleSyncError('tasks', err)));

  // Events
  unsubscribers.push(onSnapshot(eventsRef, (snap) => {
    snap.docChanges().forEach((change) => {
      const id = change.doc.id;
      const data = change.doc.data();
      if (change.type === 'removed') {
        remoteEvents.delete(id);
      } else {
        remoteEvents.set(id, { ...data, id });
      }
    });
    if (initialLoadsRemaining > 0) onInitialLoad();
    else mergeAndApply();
  }, (err) => handleSyncError('events', err)));

  // Sessions
  unsubscribers.push(onSnapshot(sessionsRef, (snap) => {
    snap.docChanges().forEach((change) => {
      const id = change.doc.id;
      const data = change.doc.data();
      if (change.type === 'removed') {
        remoteSessions.delete(id);
      } else {
        remoteSessions.set(id, { ...data, id });
      }
    });
    if (initialLoadsRemaining > 0) onInitialLoad();
    else mergeAndApply();
  }, (err) => handleSyncError('sessions', err)));

  // Settings (single doc)
  unsubscribers.push(onSnapshot(settingsRef, (snap) => {
    remoteSettings = snap.exists() ? snap.data() : {};
    if (initialLoadsRemaining > 0) onInitialLoad();
    else mergeAndApply();
  }, (err) => handleSyncError('settings', err)));

  // Reviews (single doc with object map)
  unsubscribers.push(onSnapshot(reviewsRef, (snap) => {
    remoteReviews = snap.exists() ? (snap.data().data || {}) : {};
    if (initialLoadsRemaining > 0) onInitialLoad();
    else mergeAndApply();
  }, (err) => handleSyncError('reviews', err)));
}

/**
 * Phát hiện xung đột giữa local và remote so với baseline lần sync trước.
 * Một mục bị coi là xung đột khi CẢ local và remote đều đã đổi updatedAt so với
 * baseline, và khác nhau. Merge của app.js vẫn giữ bản mới hơn (LWW) — nhưng bản
 * thua được lưu vào IndexedDB (window.idbLogConflict) thay vì mất im lặng.
 */
function detectConflicts(remoteDb) {
  if (!initialSyncDone || !lastSyncedLocalDb) return;
  const localDb = getLocalDbSnapshot();
  if (!localDb) return;

  const conflicts = [];
  for (const scope of ['tasks', 'events', 'sessions']) {
    const baseMap = new Map((lastSyncedLocalDb[scope] || []).filter(e => e?.id != null).map(e => [String(e.id), e]));
    const localMap = new Map((localDb[scope] || []).filter(e => e?.id != null).map(e => [String(e.id), e]));
    for (const remote of remoteDb[scope] || []) {
      if (remote?.id == null) continue;
      const id = String(remote.id);
      const base = baseMap.get(id);
      const local = localMap.get(id);
      if (!base || !local) continue;
      const baseStamp = String(base.updatedAt || '');
      const localStamp = String(local.updatedAt || '');
      const remoteStamp = String(remote.updatedAt || '');
      const localChanged = localStamp !== baseStamp;
      const remoteChanged = remoteStamp !== baseStamp;
      // Yêu cầu nội dung thực sự khác nhau — tránh false positive khi 2 thiết bị cùng
      // auto-stack một task qua ngày (chỉ lệch updatedAt, nội dung giống hệt).
      if (localChanged && remoteChanged && localStamp !== remoteStamp
          && !deepEqual(stripSyncMeta(local), stripSyncMeta(remote))) {
        conflicts.push({
          scope,
          id,
          title: remote.title || local.title || id,
          kept: remoteStamp > localStamp ? 'remote' : 'local',
          localCopy: local,
          remoteCopy: remote,
        });
      }
    }
  }

  if (conflicts.length) {
    if (typeof window.idbLogConflict === 'function') {
      conflicts.forEach((c) => window.idbLogConflict(c));
    }
    console.warn('[sync] Conflicts detected:', conflicts.map(c => `${c.scope}/${c.id}`));
    showToast(`⚠️ ${conflicts.length} mục được sửa trên 2 thiết bị cùng lúc — đã giữ bản mới hơn, bản còn lại lưu trong Cài đặt.`);
  }
}

function handleSyncError(scope, err) {
  console.error(`[sync] Error in ${scope}:`, err);
  setSyncStatus('error', `${scope}: ${err.message || err}`);
  showToast(`❌ Lỗi sync (${scope}): ${err.message || err}`);
  if (window.Sentry) {
    window.Sentry.captureException(err, { tags: { sync_scope: scope } });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// PUSH SIDE — window.firebaseSync(db)
// ════════════════════════════════════════════════════════════════════════════

window.firebaseSync = (localDb) => {
  if (!window.currentUserId || !dbFire) return;
  if (!localDb || typeof localDb !== 'object') return;

  // KHÔNG push trước khi initial sync xong (tránh push data outdated)
  if (!initialSyncDone) {
    return;
  }

  if (pushDebounceTimer) clearTimeout(pushDebounceTimer);
  pushDebounceTimer = setTimeout(() => {
    pushDebounceTimer = null;
    actuallyPush(localDb);
  }, PUSH_DEBOUNCE_MS);
};

async function actuallyPush(localDb) {
  if (!window.currentUserId || !dbFire) return;

  setSyncStatus('syncing');

  const uid = window.currentUserId;
  const current = coerceDbShape(localDb);
  const prev = lastSyncedLocalDb || coerceDbShape({});

  try {
    const writes = [];

    writes.push(...diffArrays(prev.tasks, current.tasks, 'tasks'));
    writes.push(...diffArrays(prev.events, current.events, 'events'));
    writes.push(...diffArrays(prev.sessions, current.sessions, 'sessions'));

    // Settings — 1 doc
    const prevSettings = sanitizeSettingsForFirestore(prev.settings);
    const currSettings = sanitizeSettingsForFirestore(current.settings);
    if (!deepEqual(prevSettings, currSettings)) {
      writes.push({ kind: 'doc', path: 'settings/main', data: currSettings });
    }

    // Reviews — 1 doc map
    const prevReviews = sanitizeReviewsForFirestore(prev.reviews);
    const currReviews = sanitizeReviewsForFirestore(current.reviews);
    if (!deepEqual(prevReviews, currReviews)) {
      writes.push({ kind: 'doc', path: 'reviews/main', data: { data: currReviews } });
    }

    if (writes.length === 0) {
      setSyncStatus('synced');
      return;
    }

    await commitBatched(uid, writes);

    lastSyncedLocalDb = deepClone(current);
    setSyncStatus('synced');
  } catch (err) {
    console.error('[sync] Push failed:', err);
    setSyncStatus('error', err.message);
    showToast('❌ Lỗi đồng bộ: ' + (err.message || err));
    if (window.Sentry) window.Sentry.captureException(err);
  }
}

/**
 * Diff 2 arrays of entities, return list of ops.
 */
function diffArrays(prevArr, currArr, scope) {
  const ops = [];
  const sanitizer = {
    tasks: sanitizeTaskForFirestore,
    events: sanitizeEventForFirestore,
    sessions: sanitizeSessionForFirestore,
  }[scope];

  const prevMap = new Map();
  for (const e of prevArr) if (e?.id != null) prevMap.set(String(e.id), e);

  const currMap = new Map();
  for (const e of currArr) if (e?.id != null) currMap.set(String(e.id), e);

  // CREATE / UPDATE
  for (const [id, entity] of currMap) {
    const prev = prevMap.get(id);
    if (!prev || !deepEqual(stripSyncMeta(prev), stripSyncMeta(entity))) {
      ops.push({
        kind: 'doc',
        path: `${scope}/${id}`,
        data: sanitizer(entity),
      });
    }
  }

  // SOFT DELETE
  for (const [id] of prevMap) {
    if (!currMap.has(id)) {
      ops.push({
        kind: 'softDelete',
        path: `${scope}/${id}`,
      });
    }
  }

  return ops;
}

function stripSyncMeta(entity) {
  const { createdAt, updatedAt, deletedAt, migratedFrom, ...rest } = entity || {};
  return rest;
}

async function commitBatched(uid, ops) {
  const BATCH_SIZE = 450;
  for (let i = 0; i < ops.length; i += BATCH_SIZE) {
    const slice = ops.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(dbFire);

    for (const op of slice) {
      const [collName, docId] = op.path.split('/');
      const ref = doc(dbFire, 'users', uid, collName, docId);

      if (op.kind === 'softDelete') {
        const tombstone = {
          deletedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        if (collName === 'tasks') tombstone.status = 'deleted';
        batch.set(ref, tombstone, { merge: true });
      } else {
        const dataWithStamp = {
          ...op.data,
          updatedAt: op.data.updatedAt || new Date().toISOString(),
        };
        if (!op.data.createdAt) dataWithStamp.createdAt = dataWithStamp.updatedAt;
        batch.set(ref, dataWithStamp, { merge: true });
      }
    }

    await batch.commit();
  }
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════
function coerceDbShape(source = {}) {
  return {
    tasks: Array.isArray(source.tasks) ? source.tasks : [],
    events: Array.isArray(source.events) ? source.events : [],
    sessions: Array.isArray(source.sessions) ? source.sessions : [],
    settings: (source.settings && typeof source.settings === 'object') ? source.settings : {},
    reviews: (source.reviews && typeof source.reviews === 'object') ? source.reviews : {},
  };
}

function getLocalDbSnapshot() {
  if (typeof window.getTimelineDbSnapshot === 'function') {
    try {
      return coerceDbShape(window.getTimelineDbSnapshot());
    } catch (err) {
      console.warn('[sync] getTimelineDbSnapshot failed:', err);
    }
  }
  if (typeof window.getTimelineDb === 'function') {
    try {
      return deepClone(coerceDbShape(window.getTimelineDb()));
    } catch (err) {
      console.warn('[sync] getTimelineDb failed:', err);
    }
  }
  if (window.db) return deepClone(coerceDbShape(window.db));
  return null;
}

function showToast(msg) {
  if (typeof window.toast === 'function') {
    window.toast(msg);
  } else {
    console.log('[toast]', msg);
  }
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (!deepEqual(a[k], b[k])) return false;
  return true;
}

// ════════════════════════════════════════════════════════════════════════════
// AUTO INIT
// ════════════════════════════════════════════════════════════════════════════
initSyncEngine();
