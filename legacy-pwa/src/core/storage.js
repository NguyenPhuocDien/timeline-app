/**
 * Timeline Focus — Local Storage Engine (IndexedDB qua Dexie.js)
 *
 * Vai trò:
 *   - IndexedDB là NGUỒN DỮ LIỆU CHÍNH trên thiết bị (dung lượng lớn, transaction, per-entity)
 *   - localStorage chỉ còn là boot-cache (bản rút gọn, không chứa ảnh nền base64)
 *   - Lần chạy đầu: tự migrate dữ liệu từ localStorage cũ sang IndexedDB
 *   - Lưu nhật ký xung đột sync (bản thua không bị mất)
 *
 * Interface với app.js (classic script — load trước module này):
 *   - window.updateDbFromStorage(data)  ← app.js định nghĩa, module này gọi sau khi load IDB
 *   - window.getTimelineDbSnapshot()    ← app.js định nghĩa, dùng để seed lần đầu
 *   - window.idbActive                  ← true khi IndexedDB sẵn sàng
 *   - window.idbSaveAll(db)             ← app.js gọi trong save() (debounced)
 *   - window.idbLogConflict(entry)      ← sync-engine gọi khi phát hiện xung đột
 *   - window.exportConflicts() / window.clearConflicts()
 */

import Dexie from '../../vendor/dexie.min.js';

const IDB_NAME = 'timeline_focus_idb_v1';
const SAVE_DEBOUNCE_MS = 400;
const MAX_CONFLICT_ROWS = 200;

const idb = new Dexie(IDB_NAME);
idb.version(1).stores({
  tasks: 'id',
  events: 'id',
  sessions: 'id',
  kv: 'key',
  conflicts: '++seq, detectedAt',
});

let active = false;
let saveTimer = null;
let pendingDb = null;

window.idbActive = false;
window._conflictCount = 0;

function coerceShape(source = {}) {
  return {
    tasks: Array.isArray(source.tasks) ? source.tasks : [],
    events: Array.isArray(source.events) ? source.events : [],
    sessions: Array.isArray(source.sessions) ? source.sessions : [],
    settings: source.settings && typeof source.settings === 'object' ? source.settings : {},
    reviews: source.reviews && typeof source.reviews === 'object' ? source.reviews : {},
  };
}

async function readAll() {
  const [tasks, events, sessions, settingsRow, reviewsRow] = await Promise.all([
    idb.tasks.toArray(),
    idb.events.toArray(),
    idb.sessions.toArray(),
    idb.kv.get('settings'),
    idb.kv.get('reviews'),
  ]);
  return {
    tasks,
    events,
    sessions,
    settings: settingsRow?.value || {},
    reviews: reviewsRow?.value || {},
  };
}

async function writeAll(dbState) {
  // JSON round-trip: tách khỏi object đang dùng + loại undefined/function (IDB structured clone an toàn)
  const clean = JSON.parse(JSON.stringify(coerceShape(dbState)));
  await idb.transaction('rw', idb.tasks, idb.events, idb.sessions, idb.kv, async () => {
    const pairs = [
      [idb.tasks, clean.tasks],
      [idb.events, clean.events],
      [idb.sessions, clean.sessions],
    ];
    for (const [table, items] of pairs) {
      const rows = items
        .filter((x) => x && typeof x === 'object' && x.id != null)
        .map((x) => ({ ...x, id: String(x.id) }));
      const keep = new Set(rows.map((x) => x.id));
      const existing = await table.toCollection().primaryKeys();
      const stale = existing.filter((k) => !keep.has(k));
      if (stale.length) await table.bulkDelete(stale);
      if (rows.length) await table.bulkPut(rows);
    }
    await idb.kv.bulkPut([
      { key: 'settings', value: clean.settings },
      { key: 'reviews', value: clean.reviews },
    ]);
  });
}

function flushPending() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (!pendingDb) return;
  const snapshot = pendingDb;
  pendingDb = null;
  writeAll(snapshot).catch((err) => console.warn('[storage] IDB flush failed:', err));
}

window.idbSaveAll = (dbState) => {
  if (!active || !dbState) return;
  pendingDb = dbState;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const snapshot = pendingDb;
    pendingDb = null;
    writeAll(snapshot).catch((err) => console.warn('[storage] IDB save failed:', err));
  }, SAVE_DEBOUNCE_MS);
};

// Ghi nốt thay đổi đang chờ debounce khi tab đóng/ẩn — tránh mất dữ liệu chỉ có trong IDB (vd: ảnh nền)
window.idbFlush = flushPending;
window.addEventListener('pagehide', flushPending);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushPending();
});

window.idbLogConflict = async (entry) => {
  if (!active || !entry) return;
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
    console.warn('[storage] log conflict failed:', err);
  }
};

window.exportConflicts = async () => {
  try {
    const rows = await idb.conflicts.toArray();
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `timeline-focus-conflicts-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (err) {
    console.warn('[storage] export conflicts failed:', err);
    if (typeof window.toast === 'function') window.toast('Không xuất được nhật ký xung đột.');
  }
};

window.clearConflicts = async () => {
  try {
    await idb.conflicts.clear();
    window._conflictCount = 0;
    if (typeof window.toast === 'function') window.toast('Đã xóa nhật ký xung đột.');
    if (typeof window.render === 'function' && window.currentTab === 'settings') window.render();
  } catch (err) {
    console.warn('[storage] clear conflicts failed:', err);
  }
};

async function initStorage() {
  try {
    await idb.open();
    active = true;
    window.idbActive = true;

    window._conflictCount = await idb.conflicts.count().catch(() => 0);

    const data = await readAll();
    const hasData = data.tasks.length || data.events.length || data.sessions.length
      || Object.keys(data.settings).length || Object.keys(data.reviews).length;

    if (hasData) {
      if (typeof window.updateDbFromStorage === 'function') {
        window.updateDbFromStorage(data);
      }
    } else if (typeof window.getTimelineDbSnapshot === 'function') {
      // Lần chạy đầu: migrate dữ liệu hiện có (từ localStorage) vào IndexedDB
      const current = window.getTimelineDbSnapshot();
      if (current) {
        await writeAll(current);
        console.log('[storage] Seeded IndexedDB from existing local data');
      }
    }

    document.dispatchEvent(new CustomEvent('storage-ready', { detail: { hasData: !!hasData } }));
  } catch (err) {
    console.warn('[storage] IndexedDB unavailable — falling back to localStorage only:', err);
    active = false;
    window.idbActive = false;
  }
}

initStorage();
