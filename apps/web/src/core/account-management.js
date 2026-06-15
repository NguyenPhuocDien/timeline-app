/**
 * Account deletion and client-triggered retention cleanup.
 *
 * Integration:
 *   <script type="module" src="src/core/account-management.js"></script>
 *
 * Public APIs:
 *   window.firebaseDeleteAccount(options?)
 *   window.firebasePurgeExpiredData(options?)
 */

import {
  deleteUser,
  GoogleAuthProvider,
  reauthenticateWithPopup,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocFromServer,
  getDocsFromServer,
  limit,
  query,
  updateDoc,
  waitForPendingWrites,
  where,
  writeBatch,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const KNOWN_SUBCOLLECTIONS = [
  'tasks',
  'events',
  'sessions',
  'settings',
  'reviews',
  'meta',
];
const TOMBSTONE_COLLECTIONS = ['tasks', 'events', 'sessions'];
const BATCH_LIMIT = 450;
const RETENTION_DAYS = 30;
const RECENT_LOGIN_WINDOW_MS = 4 * 60 * 1000;

let pendingDeletionUid = null;

function makeError(code, message, details = {}) {
  const error = new Error(message);
  error.name = 'AccountManagementError';
  error.code = code;
  Object.assign(error, details);
  return error;
}

function requireOnline() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw makeError(
      'account/offline',
      'Cần kết nối mạng để xác nhận việc xóa dữ liệu với Firebase.'
    );
  }
}

function getFirebaseContext({ allowPendingDeletion = false } = {}) {
  const auth = window.auth;
  const dbFire = window.dbFire;
  const user = auth?.currentUser;

  if (!auth || !dbFire) {
    throw makeError(
      'account/firebase-not-ready',
      'Firebase chưa sẵn sàng. Hãy đợi ứng dụng khởi tạo xong rồi thử lại.'
    );
  }
  if (!user) {
    throw makeError('account/not-signed-in', 'Bạn cần đăng nhập để quản lý tài khoản.');
  }

  const activeUid = window.currentUserId;
  const pendingMatches = allowPendingDeletion && pendingDeletionUid === user.uid;
  if ((!activeUid && !pendingMatches) || (activeUid && activeUid !== user.uid)) {
    throw makeError(
      'account/user-mismatch',
      'Phiên đăng nhập và dữ liệu đang mở không khớp. Hãy tải lại ứng dụng.'
    );
  }

  return { auth, dbFire, user, uid: user.uid };
}

function reportProgress(callback, phase, details = {}) {
  if (typeof callback === 'function') {
    callback({ phase, ...details });
  }
}

function signedInRecently(user) {
  const lastSignInMs = Date.parse(user?.metadata?.lastSignInTime || '');
  return Number.isFinite(lastSignInMs)
    && Date.now() - lastSignInMs < RECENT_LOGIN_WINDOW_MS;
}

async function reauthenticateIfNeeded(user, mode, onProgress) {
  if (mode === false || mode === 'never') return;
  if (mode !== true && mode !== 'always' && signedInRecently(user)) return;

  const usesGoogle = user.providerData?.some((provider) => provider.providerId === 'google.com');
  if (!usesGoogle) {
    throw makeError(
      'account/reauth-provider-unsupported',
      'Phiên đăng nhập đã cũ. Hãy đăng xuất, đăng nhập lại, rồi thử xóa tài khoản ngay.',
      { requiresRecentLogin: true }
    );
  }

  reportProgress(onProgress, 'reauthenticating');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  await reauthenticateWithPopup(user, provider);
}

async function deleteCollectionInBatches(dbFire, uid, collectionName, onProgress) {
  let deleted = 0;

  while (true) {
    const ref = collection(dbFire, 'users', uid, collectionName);
    const snapshot = await getDocsFromServer(query(ref, limit(BATCH_LIMIT)));
    if (snapshot.empty) break;

    const batch = writeBatch(dbFire);
    snapshot.docs.forEach((item) => batch.delete(item.ref));
    await batch.commit();
    await waitForPendingWrites(dbFire);

    deleted += snapshot.size;
    reportProgress(onProgress, 'deleting-firestore', {
      collection: collectionName,
      deleted,
    });
  }

  return deleted;
}

/**
 * Delete known Firestore data for the signed-in user, then delete the Auth user.
 *
 * Call this directly from a user gesture because reauthentication may open a
 * popup. If a recent-login error still occurs after Firestore deletion, call
 * the same function again from a fresh click; it will reauthenticate first.
 */
export async function firebaseDeleteAccount(options = {}) {
  requireOnline();
  const onProgress = options.onProgress;
  const context = getFirebaseContext({ allowPendingDeletion: true });
  const { dbFire, user, uid } = context;

  try {
    await reauthenticateIfNeeded(
      user,
      pendingDeletionUid === uid ? 'always' : (options.reauthenticate ?? 'if-needed'),
      onProgress
    );
  } catch (error) {
    if (error?.code === 'auth/requires-recent-login') {
      throw makeError(
        'auth/requires-recent-login',
        'Firebase yêu cầu đăng nhập lại trước khi xóa tài khoản.',
        { cause: error, requiresRecentLogin: true, firestoreDeleted: false }
      );
    }
    throw error;
  }

  pendingDeletionUid = uid;
  // Prevent the sync engine from recreating documents while deletion snapshots arrive.
  window.currentUserId = null;

  const deletedByCollection = {};
  let firestoreDeleted = false;

  try {
    reportProgress(onProgress, 'deleting-firestore', { collection: null, deleted: 0 });
    for (const collectionName of KNOWN_SUBCOLLECTIONS) {
      deletedByCollection[collectionName] = await deleteCollectionInBatches(
        dbFire,
        uid,
        collectionName,
        onProgress
      );
    }

    await deleteDoc(doc(dbFire, 'users', uid));
    await waitForPendingWrites(dbFire);
    firestoreDeleted = true;
    reportProgress(onProgress, 'deleting-auth');

    await deleteUser(user);
    pendingDeletionUid = null;
    reportProgress(onProgress, 'complete', { deletedByCollection });

    return {
      ok: true,
      uid,
      firestoreDeleted: true,
      authDeleted: true,
      deletedByCollection,
    };
  } catch (error) {
    const requiresRecentLogin = error?.code === 'auth/requires-recent-login';
    if (requiresRecentLogin) {
      throw makeError(
        'auth/requires-recent-login',
        'Dữ liệu Firestore đã được xóa nhưng Firebase yêu cầu đăng nhập lại để xóa hồ sơ đăng nhập. Hãy gọi lại firebaseDeleteAccount từ một lần nhấp mới.',
        {
          cause: error,
          requiresRecentLogin: true,
          firestoreDeleted,
          authDeleted: false,
          deletedByCollection,
        }
      );
    }

    throw makeError(
      'account/delete-failed',
      'Không thể hoàn tất xóa tài khoản. Có thể gọi lại cùng API để tiếp tục dọn dữ liệu còn lại.',
      {
        cause: error,
        firestoreDeleted,
        authDeleted: false,
        deletedByCollection,
      }
    );
  }
}

async function purgeCollectionTombstones(dbFire, uid, collectionName, cutoffIso, onProgress) {
  let deleted = 0;

  while (true) {
    const ref = collection(dbFire, 'users', uid, collectionName);
    const expiredQuery = query(
      ref,
      where('deletedAt', '<=', cutoffIso),
      limit(BATCH_LIMIT)
    );
    const snapshot = await getDocsFromServer(expiredQuery);
    if (snapshot.empty) break;

    const batch = writeBatch(dbFire);
    snapshot.docs.forEach((item) => batch.delete(item.ref));
    await batch.commit();
    await waitForPendingWrites(dbFire);

    deleted += snapshot.size;
    reportProgress(onProgress, 'purging-tombstones', {
      collection: collectionName,
      deleted,
      cutoff: cutoffIso,
    });
  }

  return deleted;
}

function timestampToMillis(value) {
  if (value?.toMillis instanceof Function) return value.toMillis();
  if (value?.toDate instanceof Function) return value.toDate().getTime();
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

async function purgeExpiredMigrationBackup(dbFire, uid, cutoffMs) {
  const userRef = doc(dbFire, 'users', uid);
  const snapshot = await getDocFromServer(userRef);
  if (!snapshot.exists()) return { deleted: false, reason: 'user-doc-missing' };

  const data = snapshot.data();
  if (!Object.prototype.hasOwnProperty.call(data, '_backup_v1')) {
    return { deleted: false, reason: 'backup-missing' };
  }

  const createdAtMs = timestampToMillis(data._migrationStartedAt || data.migratedAt);
  if (createdAtMs == null) {
    return { deleted: false, reason: 'retention-start-missing' };
  }
  if (createdAtMs > cutoffMs) {
    return { deleted: false, reason: 'not-expired' };
  }

  await updateDoc(userRef, { _backup_v1: deleteField() });
  await waitForPendingWrites(dbFire);
  return { deleted: true, reason: 'expired' };
}

/**
 * Hard-delete tombstones and the migration backup after 30 days.
 *
 * This is client-triggered cleanup, not an automatic server scheduler.
 */
export async function firebasePurgeExpiredData(options = {}) {
  requireOnline();
  const { dbFire, uid } = getFirebaseContext();
  const onProgress = options.onProgress;
  const now = options.now instanceof Date ? options.now : new Date();
  const cutoffMs = now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const cutoffIso = new Date(cutoffMs).toISOString();
  const tombstonesDeleted = {};

  for (const collectionName of TOMBSTONE_COLLECTIONS) {
    tombstonesDeleted[collectionName] = await purgeCollectionTombstones(
      dbFire,
      uid,
      collectionName,
      cutoffIso,
      onProgress
    );
  }

  const migrationBackup = await purgeExpiredMigrationBackup(dbFire, uid, cutoffMs);
  reportProgress(onProgress, 'complete', {
    cutoff: cutoffIso,
    tombstonesDeleted,
    migrationBackup,
  });

  return {
    ok: true,
    uid,
    retentionDays: RETENTION_DAYS,
    cutoff: cutoffIso,
    tombstonesDeleted,
    migrationBackup,
  };
}

window.firebaseDeleteAccount = firebaseDeleteAccount;
window.firebasePurgeExpiredData = firebasePurgeExpiredData;
