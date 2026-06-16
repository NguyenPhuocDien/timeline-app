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

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  reauthenticateWithPopup,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  signOut,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js';
import {
  initializeFirestore,
  memoryLocalCache,
  doc,
  collection,
  onSnapshot,
  writeBatch,
  setDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js';

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
// Các host được Firebase Hosting phục vụ /__/auth/* NATIVE và đã/sẽ đăng ký
// redirect URI trong Google OAuth client → dùng chính host đó làm authDomain
// để toàn bộ flow đăng nhập same-origin (không phụ thuộc cookie bên thứ ba).
// Host khác (Vercel, localhost) fallback về firebaseapp.com (cross-origin).
const SAME_ORIGIN_AUTH_HOSTS = [
  'timeline-app-9a872.firebaseapp.com',
  'timelinefocus.web.app',
];

const DEFAULT_CONFIG = {
  apiKey: 'AIzaSyBaSHqy3Vo7tYmsimmTMz7BJARPxtFmwdI',
  authDomain: SAME_ORIGIN_AUTH_HOSTS.includes(location.hostname)
    ? location.hostname
    : 'timeline-app-9a872.firebaseapp.com',
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
let queuedPushDb = null;
let pushLoopPromise = null;
let sessionGeneration = 0;
const PUSH_DEBOUNCE_MS = 800;
// Auto-retry khi push lỗi (mạng chập chờn): nếu user không thao tác tiếp, data
// sẽ kẹt unsynced tới lần edit sau. Thử lại có giới hạn + exponential backoff.
let retryTimer = null;
let retryCount = 0;
const MAX_PUSH_RETRIES = 4;
// Debounce sự kiện online/offline để tránh nháy trạng thái khi WiFi chập chờn.
let netDebounceTimer = null;
const NET_DEBOUNCE_MS = 1500;
let syncStatus = 'signed-out';
let lastSyncError = null;
let isOnline = navigator.onLine;
let latestRemoteDb = coerceDbShape({});
let activeSessionUid = null;
let sessionStartPromise = null;
let authPersistenceReady = Promise.resolve();

// Track initial sync để KHÔNG echo lại remote data (tránh loop)
let initialSyncDone = false;

window.addEventListener('online', () => {
  isOnline = true;
  if (netDebounceTimer) clearTimeout(netDebounceTimer);
  netDebounceTimer = setTimeout(() => {
    netDebounceTimer = null;
    if (!isOnline) return; // flap đã quay lại offline trong cửa sổ debounce
    if (auth?.currentUser && initialSyncDone) {
      // Mạng vừa ổn định lại — đẩy ngay phần chưa sync thay vì chờ user edit.
      retryCount = 0;
      setSyncStatus('syncing');
      const localDb = getLocalDbSnapshot();
      if (localDb) enqueuePush(localDb);
    } else {
      setSyncStatus(auth?.currentUser ? 'syncing' : 'signed-out');
    }
  }, NET_DEBOUNCE_MS);
});
window.addEventListener('offline', () => {
  isOnline = false;
  if (netDebounceTimer) clearTimeout(netDebounceTimer);
  netDebounceTimer = setTimeout(() => {
    netDebounceTimer = null;
    if (!isOnline) setSyncStatus('offline');
  }, NET_DEBOUNCE_MS);
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
    authPersistenceReady = setPersistence(auth, browserLocalPersistence).catch((persistErr) => {
      console.warn('[sync] Auth persistence setup failed, using browser default:', persistErr);
    });
    // App data is persisted in our UID-scoped IndexedDB. Keeping Firestore's
    // own persistent cache would leave prior-account documents on shared devices.
    dbFire = initializeFirestore(app, { localCache: memoryLocalCache() });

    window.dbFire = dbFire;
    window.auth = auth;
    // Expose tối thiểu cho gcal.js (Phase 2 — Google Calendar read-only). Không
    // đổi luồng login thường: scope calendar chỉ được xin trong gcal.gcalConnect().
    window.firebaseAuthApi = {
      GoogleAuthProvider,
      signInWithPopup,
      reauthenticateWithPopup,
    };

    onAuthStateChanged(auth, handleAuthStateChange);
    authPersistenceReady.then(() => getRedirectResult(auth)).then((result) => {
      if (result?.user) {
        return handleAuthStateChange(result.user);
      }
      return null;
    }).catch((err) => {
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
    showToast('Đồng bộ chưa sẵn sàng, thử lại sau vài giây.');
    return;
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  const btn = document.getElementById('loginBtn');
  const previousButtonHtml = btn?.innerHTML;

  try {
    if (btn) {
      btn.innerHTML = 'Đang mở Google...';
      btn.disabled = true;
    }

    showToast('Đang mở cửa sổ Google để đăng nhập...');
    await authPersistenceReady;
    const result = await signInWithPopup(auth, provider);
    if (result?.user) {
      showToast('Đã đăng nhập Google: ' + (result.user.email || result.user.displayName || 'OK'));
      await handleAuthStateChange(result.user);
    }
  } catch (err) {
    if (err?.code === 'auth/popup-closed-by-user') {
      showToast('Đã hủy đăng nhập Google.');
    } else if ([
      'auth/popup-blocked',
      'auth/cancelled-popup-request',
      'auth/operation-not-supported-in-this-environment',
    ].includes(err?.code)) {
      showToast('Popup bị chặn, đang chuyển sang chế độ đăng nhập toàn trang...');
      try {
        await signInWithRedirect(auth, provider);
      } catch (redirectErr) {
        showToast('Đăng nhập thất bại: ' + getAuthErrorMessage(redirectErr));
        if (window.Sentry) window.Sentry.captureException(redirectErr);
      }
    } else {
      showToast('Đăng nhập thất bại: ' + getAuthErrorMessage(err));
      if (window.Sentry) window.Sentry.captureException(err);
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      if (!auth.currentUser && previousButtonHtml) btn.innerHTML = previousButtonHtml;
    }
  }
};

function getAuthErrorMessage(err) {
  const code = err?.code || '';
  if (code === 'auth/unauthorized-domain') {
    return 'domain chưa được cho phép trong Firebase Auth.';
  }
  if (code === 'auth/internal-error') {
    return 'Google/Firebase trả về lỗi nội bộ. Hãy thử lại bằng popup hoặc kiểm tra domain OAuth.';
  }
  if (code === 'auth/network-request-failed') {
    return 'lỗi mạng khi kết nối Google.';
  }
  return err?.message || String(err || 'unknown error');
}

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
  const btn = document.getElementById('loginBtn');

  if (!user) {
    cleanupSyncSession();
    activeSessionUid = null;
    sessionStartPromise = null;
    window.currentUserId = null;
    try {
      await window.timelineStorageReady;
      if (typeof window.switchTimelineStorageScope === 'function') {
        await window.switchTimelineStorageScope(null);
      }
    } catch (err) {
      console.warn('[sync] Failed to switch to anonymous storage:', err);
    }
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

  if (activeSessionUid === user.uid && (sessionStartPromise || unsubscribers.length)) {
    applySignedInUi(user, { toast: false });
    return sessionStartPromise || Promise.resolve();
  }

  activeSessionUid = user.uid;
  sessionStartPromise = startUserSession(user).finally(() => {
    if (activeSessionUid === user.uid) sessionStartPromise = null;
  });
  return sessionStartPromise;
}

async function startUserSession(user) {
  // Cleanup — hủy cả push đang chờ debounce: timer cũ bắn sau khi đổi user sẽ
  // diff với baseline null và có thể đẩy data của user cũ sang account mới.
  cleanupSyncSession();
  applySignedInUi(user, { toast: true });

  setSyncStatus('syncing');
  const generation = sessionGeneration;

  try {
    await window.timelineStorageReady;
    if (activeSessionUid !== user.uid || generation !== sessionGeneration) return;
    if (typeof window.switchTimelineStorageScope === 'function') {
      await window.switchTimelineStorageScope(user.uid);
    }
    if (activeSessionUid !== user.uid || generation !== sessionGeneration) return;
  } catch (err) {
    console.error('[sync] Local storage scope switch failed:', err);
    setSyncStatus('error', err.message || String(err));
    showToast('❌ Không thể mở vùng dữ liệu của tài khoản này.');
    return;
  }

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

function cleanupSyncSession() {
  sessionGeneration++;
  if (pushDebounceTimer) { clearTimeout(pushDebounceTimer); pushDebounceTimer = null; }
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
  queuedPushDb = null;
  retryCount = 0;
  unsubscribers.forEach((u) => { try { u(); } catch {} });
  unsubscribers = [];
  initialSyncDone = false;
  lastSyncedLocalDb = null;
}

function applySignedInUi(user, opts = {}) {
  window.currentUserId = user.uid;
  if (window.Sentry) {
    window.Sentry.setUser({ id: user.uid }); // KHÔNG gửi email
  }

  const btn = document.getElementById('loginBtn');
  const displayName = user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'User';
  if (btn) {
    btn.innerHTML = `👤 ${escapeHtml(displayName)} (Đăng xuất)`;
    btn.onclick = window.firebaseLogout;
  }

  if (opts.toast) showToast('✅ Đã kết nối Cloud: ' + user.email);
  if (window.currentTab === 'settings' && typeof window.render === 'function') {
    window.render();
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION
// ════════════════════════════════════════════════════════════════════════════
function subscribeToCollections(uid) {
  // Capture the session identity at subscription time. Mọi snapshot callback
  // in-flight của session này phải tự kiểm tra: nếu generation đã tăng (do
  // cleanupSyncSession của user mới) hoặc uid không còn là user hiện hành thì
  // bỏ qua — tránh callback session cũ set lại initialSyncDone / push nhầm
  // account (BLOCKER A).
  const sessionGen = sessionGeneration;
  const isStaleSession = () => sessionGen !== sessionGeneration || window.currentUserId !== uid;

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
  // Đếm theo NGUỒN đã load, không đếm số lần snapshot bắn: với persistentLocalCache
  // mỗi listener có thể bắn 2 lần (cache + server) → counter kiểu trừ dần sẽ về 0
  // trước khi đủ 5 nguồn, chốt baseline thiếu settings/reviews.
  const loadedSources = new Set();

  function onSourceSnapshot(source) {
    // Guard: callback của session cũ không được tiếp tục apply/push sau khi
    // user đã đổi (BLOCKER A).
    if (isStaleSession()) return;
    if (initialSyncDone) {
      mergeAndApply();
      return;
    }
    loadedSources.add(source);
    if (loadedSources.size === 5) {
      mergeAndApply();
      initialSyncDone = true;
      setSyncStatus('synced');
      const localDb = getLocalDbSnapshot();
      if (localDb) window.firebaseSync(localDb);
    }
  }

  function mergeAndApply() {
    // Guard lần hai ngay tại điểm ghi remote vào local + cập nhật baseline:
    // chặn snapshot session cũ đẩy dữ liệu sai account (BLOCKER A).
    if (isStaleSession()) return;
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
    onSourceSnapshot('tasks');
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
    onSourceSnapshot('events');
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
    onSourceSnapshot('sessions');
  }, (err) => handleSyncError('sessions', err)));

  // Settings (single doc)
  unsubscribers.push(onSnapshot(settingsRef, (snap) => {
    remoteSettings = snap.exists() ? snap.data() : {};
    onSourceSnapshot('settings');
  }, (err) => handleSyncError('settings', err)));

  // Reviews (single doc with object map)
  unsubscribers.push(onSnapshot(reviewsRef, (snap) => {
    remoteReviews = snap.exists() ? (snap.data().data || {}) : {};
    onSourceSnapshot('reviews');
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
  const snapshot = deepClone(coerceDbShape(localDb));
  pushDebounceTimer = setTimeout(() => {
    pushDebounceTimer = null;
    enqueuePush(snapshot);
  }, PUSH_DEBOUNCE_MS);
};

function enqueuePush(localDb) {
  if (!localDb || !window.currentUserId || !initialSyncDone) return;
  queuedPushDb = deepClone(coerceDbShape(localDb));
  if (pushLoopPromise) return;
  const uid = window.currentUserId;
  const generation = sessionGeneration;
  pushLoopPromise = drainPushQueue(uid, generation).finally(() => {
    pushLoopPromise = null;
    if (queuedPushDb) {
      enqueuePush(queuedPushDb);
    }
  });
}

async function drainPushQueue(uid, generation) {
  while (queuedPushDb && window.currentUserId === uid && generation === sessionGeneration) {
    const snapshot = queuedPushDb;
    queuedPushDb = null;
    const succeeded = await actuallyPush(snapshot, uid, generation);
    if (!succeeded) break;
  }
}

async function actuallyPush(localDb, expectedUid = window.currentUserId, generation = sessionGeneration) {
  if (!window.currentUserId || !dbFire) return;
  // Hàng rào thứ hai: timer cũ có thể bắn sau khi đổi user/re-subscribe
  if (!initialSyncDone || window.currentUserId !== expectedUid || generation !== sessionGeneration) return false;

  setSyncStatus('syncing');

  const uid = expectedUid;
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
      retryCount = 0;
      setSyncStatus('synced');
      return true;
    }

    await commitBatched(uid, writes);
    if (window.currentUserId !== uid || generation !== sessionGeneration) return false;

    lastSyncedLocalDb = deepClone(current);
    retryCount = 0;
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    setSyncStatus('synced');
    return true;
  } catch (err) {
    console.error('[sync] Push failed:', err);
    setSyncStatus('error', err.message);
    showToast('❌ Lỗi đồng bộ: ' + (err.message || err));
    if (window.Sentry) window.Sentry.captureException(err);
    scheduleRetry(uid);
    return false;
  }
}

/**
 * Lên lịch thử lại push sau khi lỗi (vd mạng chập chờn). Có giới hạn để tránh
 * retry-storm khi lỗi vĩnh viễn (vd doc vượt 1MB) — sau MAX_PUSH_RETRIES thì
 * dừng, lần edit kế của user sẽ tự kích hoạt sync lại.
 */
function scheduleRetry(uid) {
  if (retryTimer) return;                       // đã có lịch retry
  if (!isOnline) return;                         // offline → 'online' handler sẽ lo
  if (retryCount >= MAX_PUSH_RETRIES) return;    // bỏ cuộc, chờ user thao tác
  const delay = Math.min(30000, 1000 * 2 ** retryCount); // 1s, 2s, 4s, 8s
  retryCount++;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    if (window.currentUserId !== uid || !initialSyncDone || !isOnline) return;
    const localDb = getLocalDbSnapshot();
    if (localDb) enqueuePush(localDb);
  }, delay);
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
          // Phải có `id` khớp document id: nếu doc đích chưa tồn tại trên
          // server, set(merge) tạo mới mà thiếu `id` → firestore rule
          // hasMatchingId fail → cả batch fail → sync kẹt error vĩnh viễn
          // (BLOCKER B).
          id: docId,
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
        // settings/main & reviews/main: REPLACE toàn doc, không merge.
        // merge:true deep-merge map lồng nhau → key review đã xóa/cắt ở client
        // không bao giờ biến mất trên server, doc phình dần tới trần 1MB.
        const isSingletonDoc = collName === 'settings' || collName === 'reviews';
        batch.set(ref, dataWithStamp, { merge: !isSingletonDoc });
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
