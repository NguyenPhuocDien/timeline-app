/**
 * Timeline Focus — Migration Engine (Phase B FIX)
 *
 * Đổi tên field cho khớp app.js:
 *   - focusSessions → sessions
 *   - thêm reviews (object map → 1 document reviews/main)
 *
 * Schema v1 (legacy):
 *   users/{uid}.db = { tasks, events, sessions, settings, reviews }
 *
 * Schema v2:
 *   users/{uid}                  → root metadata + _backup_v1
 *   users/{uid}/tasks/{taskId}
 *   users/{uid}/events/{eventId}
 *   users/{uid}/sessions/{sessionId}    ← KHÔNG phải focusSessions
 *   users/{uid}/settings/main
 *   users/{uid}/reviews/main             ← MỚI THÊM
 *   users/{uid}/meta/main
 */

import {
  doc,
  getDoc,
  setDoc,
  writeBatch,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

import {
  SCHEMA_VERSION,
  sanitizeTaskForFirestore,
  sanitizeEventForFirestore,
  sanitizeSessionForFirestore,
  sanitizeSettingsForFirestore,
  sanitizeReviewsForFirestore,
} from './schema.js';

/**
 * @typedef {Object} MigrationResult
 * @property {boolean} migrated
 * @property {boolean} skipped
 * @property {number} taskCount
 * @property {number} eventCount
 * @property {number} sessionCount
 * @property {number} reviewCount
 * @property {string} [error]
 */

const EMPTY_RESULT = {
  migrated: false, skipped: true,
  taskCount: 0, eventCount: 0, sessionCount: 0, reviewCount: 0
};

/**
 * @param {import('firebase/firestore').Firestore} dbFire
 * @param {string} uid
 * @returns {Promise<MigrationResult>}
 */
export async function runMigrationIfNeeded(dbFire, uid) {
  if (!dbFire || !uid) return { ...EMPTY_RESULT };

  const userDocRef = doc(dbFire, 'users', uid);

  let userDoc;
  try {
    userDoc = await getDoc(userDocRef);
  } catch (err) {
    console.error('[migration] Cannot read user doc:', err);
    return { ...EMPTY_RESULT, skipped: false, error: err.message || String(err) };
  }

  const data = userDoc.exists() ? userDoc.data() : null;

  // Already migrated → skip
  if (data && (data.migrationVersion || 0) >= SCHEMA_VERSION) {
    console.log('[migration] Already at version', data.migrationVersion, '— skipping');
    return { ...EMPTY_RESULT };
  }

  // New user or no legacy data → just mark
  if (!data || !data.db) {
    console.log('[migration] No legacy data — marking as schema v2');
    try {
      await setDoc(userDocRef, {
        migrationVersion: SCHEMA_VERSION,
        migratedAt: serverTimestamp(),
        _v1HadData: false,
      }, { merge: true });
    } catch (err) {
      console.error('[migration] Failed to mark v2:', err);
    }
    return { ...EMPTY_RESULT };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CÓ DATA CŨ → migrate
  // ──────────────────────────────────────────────────────────────────────────

  console.log('[migration] Starting v1 → v2 migration...');
  const legacyDb = data.db || {};
  const tasks = Array.isArray(legacyDb.tasks) ? legacyDb.tasks : [];
  const events = Array.isArray(legacyDb.events) ? legacyDb.events : [];
  // ⚠️ App.js dùng SESSIONS (không phải focusSessions)
  const sessions = Array.isArray(legacyDb.sessions) ? legacyDb.sessions : [];
  const settings = legacyDb.settings || {};
  const reviews = (legacyDb.reviews && typeof legacyDb.reviews === 'object') ? legacyDb.reviews : {};

  console.log(
    `[migration] Found ${tasks.length} tasks, ${events.length} events, ` +
    `${sessions.length} sessions, ${Object.keys(reviews).length} reviews`
  );

  // Bước 1: Backup data cũ
  try {
    await setDoc(userDocRef, {
      _backup_v1: legacyDb,
      _v1HadData: true,
      _migrationStartedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.error('[migration] Failed to write backup, aborting:', err);
    return { ...EMPTY_RESULT, skipped: false, error: 'Backup failed: ' + (err.message || err) };
  }

  const BATCH_SIZE = 450;
  let totalWrites = 0;

  // ── Helper để batch-write 1 collection ──────────────────────────────────
  async function migrateCollection(items, collName, sanitizer) {
    let written = 0;
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const slice = items.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(dbFire);
      for (const item of slice) {
        if (!item || !item.id) continue;
        const ref = doc(dbFire, 'users', uid, collName, String(item.id));
        const sanitized = sanitizer(item);
        // Đặt updatedAt nếu chưa có
        if (!sanitized.updatedAt) sanitized.updatedAt = new Date().toISOString();
        if (!sanitized.createdAt) sanitized.createdAt = sanitized.updatedAt;
        sanitized.migratedFrom = 1;
        batch.set(ref, sanitized, { merge: true });
      }
      try {
        await batch.commit();
      } catch (err) {
        console.error(`[migration] Batch failed for ${collName}:`, err);
        throw err;
      }
      written += slice.length;
      console.log(`[migration] ${collName}: ${Math.min(i + BATCH_SIZE, items.length)}/${items.length}`);
    }
    return written;
  }

  // 2a. Tasks
  try {
    totalWrites += await migrateCollection(tasks, 'tasks', sanitizeTaskForFirestore);
  } catch (err) {
    return { ...EMPTY_RESULT, skipped: false, error: 'Tasks migration failed: ' + (err.message || err) };
  }

  // 2b. Events
  try {
    totalWrites += await migrateCollection(events, 'events', sanitizeEventForFirestore);
  } catch (err) {
    return {
      ...EMPTY_RESULT, skipped: false,
      taskCount: tasks.length,
      error: 'Events migration failed: ' + (err.message || err)
    };
  }

  // 2c. Sessions (KHÔNG phải focusSessions!)
  try {
    totalWrites += await migrateCollection(sessions, 'sessions', sanitizeSessionForFirestore);
  } catch (err) {
    console.error('[migration] Sessions migration failed:', err);
    return {
      ...EMPTY_RESULT,
      skipped: false,
      taskCount: tasks.length,
      eventCount: events.length,
      error: 'Sessions migration failed: ' + (err.message || err),
    };
  }

  // 2d. Settings — 1 doc
  try {
    const settingsRef = doc(dbFire, 'users', uid, 'settings', 'main');
    const sanitized = sanitizeSettingsForFirestore(settings);
    await setDoc(settingsRef, {
      ...sanitized,
      updatedAt: new Date().toISOString(),
      migratedFrom: 1,
    });
  } catch (err) {
    console.error('[migration] Settings migration failed:', err);
    return {
      ...EMPTY_RESULT,
      skipped: false,
      taskCount: tasks.length,
      eventCount: events.length,
      sessionCount: sessions.length,
      error: 'Settings migration failed: ' + (err.message || err),
    };
  }

  // 2e. Reviews — 1 doc (object map theo ngày)
  try {
    const reviewsRef = doc(dbFire, 'users', uid, 'reviews', 'main');
    const sanitized = sanitizeReviewsForFirestore(reviews);
    await setDoc(reviewsRef, {
      data: sanitized,
      updatedAt: new Date().toISOString(),
      migratedFrom: 1,
    });
  } catch (err) {
    console.error('[migration] Reviews migration failed:', err);
    return {
      ...EMPTY_RESULT,
      skipped: false,
      taskCount: tasks.length,
      eventCount: events.length,
      sessionCount: sessions.length,
      error: 'Reviews migration failed: ' + (err.message || err),
    };
  }

  // Bước 3: Mark migration done
  try {
    await setDoc(userDocRef, {
      migrationVersion: SCHEMA_VERSION,
      migratedAt: serverTimestamp(),
      _v1ItemCount: tasks.length + events.length + sessions.length,
    }, { merge: true });
    console.log(`[migration] ✅ Done. Migrated ${totalWrites} entities.`);
  } catch (err) {
    console.error('[migration] Failed to mark version (data is safe, will retry next login):', err);
    return {
      ...EMPTY_RESULT,
      skipped: false,
      taskCount: tasks.length,
      eventCount: events.length,
      sessionCount: sessions.length,
      reviewCount: Object.keys(reviews).length,
      error: 'Migration finalization failed: ' + (err.message || err),
    };
  }

  return {
    migrated: true,
    skipped: false,
    taskCount: tasks.length,
    eventCount: events.length,
    sessionCount: sessions.length,
    reviewCount: Object.keys(reviews).length,
  };
}

/**
 * EMERGENCY ROLLBACK
 * Dùng trong DevTools Console nếu phát hiện migration hỏng:
 *   import('./src/core/migration.js').then(m =>
 *     m.rollbackMigration(window.dbFire, window.currentUserId)
 *   );
 */
export async function rollbackMigration(dbFire, uid) {
  const userDocRef = doc(dbFire, 'users', uid);
  await setDoc(userDocRef, {
    migrationVersion: 1,
    _rolledBackAt: serverTimestamp(),
  }, { merge: true });
  console.warn('[migration] Rolled back to v1.');
  console.warn('Original data preserved at users/{uid}._backup_v1 và .db');
  console.warn('Subcollections (tasks/events/sessions) vẫn còn — xóa thủ công nếu muốn.');
}
