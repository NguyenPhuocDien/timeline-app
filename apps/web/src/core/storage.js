/**
 * Timeline Focus local storage engine.
 *
 * Every signed-in Firebase user gets an isolated IndexedDB database and
 * localStorage boot cache. Anonymous data lives in a separate scope.
 */

import Dexie from '../../vendor/dexie.min.js';

const LEGACY_IDB_NAME = 'timeline_focus_idb_v1';
const IDB_PREFIX = 'timeline_focus_idb_v2_';
const LEGACY_LOCAL_KEY = 'timeline_focus_product_final_v6';
const OWNER_KEY = 'timeline_focus_legacy_owner_uid';
const ACTIVE_UID_KEY = 'timeline_focus_active_uid';
const SAVE_DEBOUNCE_MS = 400;
const MAX_CONFLICT_ROWS = 200;

let idb = null;
let active = false;
const initialUid = localStorage.getItem(ACTIVE_UID_KEY);
let currentScope = scopeForUid(initialUid);
let saveTimer = null;
let pendingDb = null;
let resolveStorageReady;

window.idbActive = false;
window._conflictCount = 0;
window.timelineStorageScope = currentScope;
window.timelineStorageReady = new Promise((resolve) => {
  resolveStorageReady = resolve;
});

function scopeForUid(uid) {
  return uid ? `user-${encodeURIComponent(String(uid))}` : 'anonymous';
}

function databaseName(scope) {
  return `${IDB_PREFIX}${scope}`;
}

function createDatabase(scope) {
  const db = new Dexie(databaseName(scope));
  db.version(1).stores({
    tasks: 'id',
    events: 'id',
    sessions: 'id',
    kv: 'key',
    conflicts: '++seq, detectedAt',
  });
  return db;
}

function coerceShape(source = {}) {
  return {
    tasks: Array.isArray(source.tasks) ? source.tasks : [],
    events: Array.isArray(source.events) ? source.events : [],
    sessions: Array.isArray(source.sessions) ? source.sessions : [],
    settings: source.settings && typeof source.settings === 'object' ? source.settings : {},
    reviews: source.reviews && typeof source.reviews === 'object' ? source.reviews : {},
  };
}

function hasData(data) {
  return Boolean(
    data.tasks.length
    || data.events.length
    || data.sessions.length
    || Object.keys(data.settings).length
    || Object.keys(data.reviews).length
  );
}

async function readAll(database = idb) {
  if (!database) return coerceShape({});
  const [tasks, events, sessions, settingsRow, reviewsRow] = await Promise.all([
    database.tasks.toArray(),
    database.events.toArray(),
    database.sessions.toArray(),
    database.kv.get('settings'),
    database.kv.get('reviews'),
  ]);
  return {
    tasks,
    events,
    sessions,
    settings: settingsRow?.value || {},
    reviews: reviewsRow?.value || {},
  };
}

async function writeAll(dbState, database = idb) {
  if (!database) return;
  const clean = JSON.parse(JSON.stringify(coerceShape(dbState)));
  await database.transaction(
    'rw',
    database.tasks,
    database.events,
    database.sessions,
    database.kv,
    async () => {
      const pairs = [
        [database.tasks, clean.tasks],
        [database.events, clean.events],
        [database.sessions, clean.sessions],
      ];
      for (const [table, items] of pairs) {
        const rows = items
          .filter((item) => item && typeof item === 'object' && item.id != null)
          .map((item) => ({ ...item, id: String(item.id) }));
        const keep = new Set(rows.map((item) => item.id));
        const existing = await table.toCollection().primaryKeys();
        const stale = existing.filter((key) => !keep.has(key));
        if (stale.length) await table.bulkDelete(stale);
        if (rows.length) await table.bulkPut(rows);
      }
      await database.kv.bulkPut([
        { key: 'settings', value: clean.settings },
        { key: 'reviews', value: clean.reviews },
      ]);
    }
  );
}

async function clearDatabase(database) {
  if (!database) return;
  await database.transaction(
    'rw',
    database.tasks,
    database.events,
    database.sessions,
    database.kv,
    database.conflicts,
    async () => {
      await Promise.all([
        database.tasks.clear(),
        database.events.clear(),
        database.sessions.clear(),
        database.kv.clear(),
        database.conflicts.clear(),
      ]);
    }
  );
}

async function readLegacyIdb() {
  const legacy = new Dexie(LEGACY_IDB_NAME);
  try {
    const exists = await Dexie.exists(LEGACY_IDB_NAME);
    if (!exists) return null;
    await legacy.open();
    const names = new Set(legacy.tables.map((table) => table.name));
    if (!['tasks', 'events', 'sessions', 'kv'].every((name) => names.has(name))) return null;
    return await readAll(legacy);
  } catch (err) {
    console.warn('[storage] Cannot read legacy IndexedDB:', err);
    return null;
  } finally {
    legacy.close();
  }
}

async function openScope(scope) {
  if (idb) idb.close({ disableAutoOpen: true });
  const next = createDatabase(scope);
  await next.open();
  idb = next;
  currentScope = scope;
  active = true;
  window.idbActive = true;
  window.timelineStorageScope = scope;
  window._conflictCount = await idb.conflicts.count().catch(() => 0);
  return readAll();
}

function getAppSnapshot() {
  if (typeof window.getTimelineDbSnapshot !== 'function') return null;
  try {
    return window.getTimelineDbSnapshot();
  } catch (err) {
    console.warn('[storage] Cannot read app snapshot:', err);
    return null;
  }
}

function replaceAppState(data) {
  if (typeof window.replaceDbFromStorage === 'function') {
    window.replaceDbFromStorage(data);
  } else if (typeof window.updateDbFromStorage === 'function') {
    window.updateDbFromStorage(data);
  }
}

async function flushPending() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (!pendingDb || !active || !idb) return;
  const snapshot = pendingDb;
  pendingDb = null;
  await writeAll(snapshot).catch((err) => {
    pendingDb = snapshot;
    console.warn('[storage] IDB flush failed:', err);
  });
}

window.idbSaveAll = (dbState) => {
  if (!active || !dbState) return;
  pendingDb = JSON.parse(JSON.stringify(dbState));
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void flushPending();
  }, SAVE_DEBOUNCE_MS);
};

window.idbFlush = flushPending;
window.addEventListener('pagehide', () => {
  void flushPending();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') void flushPending();
});

window.switchTimelineStorageScope = async (uid) => {
  await window.timelineStorageReady;
  const targetScope = scopeForUid(uid);
  if (targetScope === currentScope) return readAll();

  await flushPending();
  const anonymousSnapshot = currentScope === 'anonymous' ? getAppSnapshot() : null;
  let targetData = await openScope(targetScope);

  // Persist the boot marker ONLY after openScope() has fully resolved (DB open +
  // scope hydrated). If openScope throws, this line is skipped so the marker keeps
  // pointing at the previously-open scope, keeping boot state consistent.
  if (uid) localStorage.setItem(ACTIVE_UID_KEY, String(uid));
  else localStorage.removeItem(ACTIVE_UID_KEY);

  if (uid && !hasData(targetData)) {
    const legacyOwner = localStorage.getItem(OWNER_KEY);
    const canClaimLegacy = !legacyOwner || legacyOwner === String(uid);
    if (canClaimLegacy && anonymousSnapshot && hasData(coerceShape(anonymousSnapshot))) {
      await writeAll(anonymousSnapshot);
      targetData = coerceShape(anonymousSnapshot);
      localStorage.setItem(OWNER_KEY, String(uid));

      const anonymousDb = createDatabase('anonymous');
      try {
        await anonymousDb.open();
        await clearDatabase(anonymousDb);
      } finally {
        anonymousDb.close();
      }
      localStorage.removeItem(`${LEGACY_LOCAL_KEY}:anonymous`);
      localStorage.removeItem(LEGACY_LOCAL_KEY);
    }
  }

  replaceAppState(targetData);
  document.dispatchEvent(new CustomEvent('storage-scope-change', {
    detail: { scope: targetScope, uid: uid || null },
  }));
  return targetData;
};

window.deleteTimelineStorageScope = async (uid) => {
  if (!uid) return;
  await window.timelineStorageReady;
  await flushPending();
  const scope = scopeForUid(uid);
  if (currentScope === scope && idb) {
    idb.close({ disableAutoOpen: true });
    idb = null;
    active = false;
  }
  await Dexie.delete(databaseName(scope));
  localStorage.removeItem(`${LEGACY_LOCAL_KEY}:${scope}`);
  if (localStorage.getItem(ACTIVE_UID_KEY) === String(uid)) {
    localStorage.removeItem(ACTIVE_UID_KEY);
  }
  if (localStorage.getItem(OWNER_KEY) === String(uid)) {
    localStorage.removeItem(OWNER_KEY);
  }
  if (currentScope === scope) {
    const anonymousData = await openScope('anonymous');
    replaceAppState(anonymousData);
  }
};

window.idbLogConflict = async (entry) => {
  if (!active || !entry || !idb) return;
  try {
    const row = JSON.parse(JSON.stringify({
      ...entry,
      detectedAt: entry.detectedAt || new Date().toISOString(),
    }));
    await idb.conflicts.add(row);
    let count = await idb.conflicts.count();
    if (count > MAX_CONFLICT_ROWS) {
      const stale = await idb.conflicts.orderBy('seq').limit(count - MAX_CONFLICT_ROWS).primaryKeys();
      await idb.conflicts.bulkDelete(stale);
      count = MAX_CONFLICT_ROWS;
    }
    window._conflictCount = count;
  } catch (err) {
    console.warn('[storage] Conflict log failed:', err);
  }
};

window.exportConflicts = async () => {
  try {
    const rows = idb ? await idb.conflicts.toArray() : [];
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `timeline-focus-conflicts-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  } catch (err) {
    console.warn('[storage] Conflict export failed:', err);
    window.toast?.('Không xuất được nhật ký xung đột.');
  }
};

window.clearConflicts = async () => {
  try {
    if (idb) await idb.conflicts.clear();
    window._conflictCount = 0;
    window.toast?.('Đã xóa nhật ký xung đột.');
    if (window.currentTab === 'settings') window.render?.();
  } catch (err) {
    console.warn('[storage] Conflict cleanup failed:', err);
  }
};

async function initStorage() {
  try {
    let data = await openScope(currentScope);
    if (!hasData(data)) {
      const legacyData = await readLegacyIdb();
      const snapshot = legacyData && hasData(legacyData) ? legacyData : getAppSnapshot();
      if (snapshot && hasData(coerceShape(snapshot))) {
        await writeAll(snapshot);
        data = coerceShape(snapshot);
      }
    }
    if (hasData(data)) replaceAppState(data);
    document.dispatchEvent(new CustomEvent('storage-ready', {
      detail: { hasData: hasData(data), scope: currentScope },
    }));
  } catch (err) {
    console.warn('[storage] IndexedDB unavailable; using scoped localStorage only:', err);
    active = false;
    window.idbActive = false;
  } finally {
    resolveStorageReady();
  }
}

void initStorage();
