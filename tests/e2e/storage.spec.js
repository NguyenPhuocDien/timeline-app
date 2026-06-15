const { test, expect } = require('@playwright/test');

const LS_KEY = 'timeline_focus_product_final_v6';
const IDB_PREFIX = 'timeline_focus_idb_v2_';

async function waitForApp(page) {
  await page.waitForFunction(() => typeof window.openTask === 'function', { timeout: 10000 });
}

async function waitForStorage(page) {
  await page.waitForFunction(() => window.idbActive === true, { timeout: 10000 });
}

// Đọc thẳng IndexedDB từ trang (không phụ thuộc Dexie API)
async function readIdbTable(page, table) {
  return page.evaluate(({ dbPrefix, tableName }) => new Promise((resolve, reject) => {
    const dbName = `${dbPrefix}${window.timelineStorageScope || 'anonymous'}`;
    const req = indexedDB.open(dbName);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(tableName)) { db.close(); resolve([]); return; }
      const tx = db.transaction(tableName, 'readonly');
      const getAll = tx.objectStore(tableName).getAll();
      getAll.onsuccess = () => { db.close(); resolve(getAll.result); };
      getAll.onerror = () => { db.close(); reject(getAll.error); };
    };
  }), { dbPrefix: IDB_PREFIX, tableName: table });
}

test('migrates legacy localStorage data into IndexedDB on first run', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('desktop'), 'Desktop-only storage test');

  const legacyTask = {
    id: 'legacy-task-1',
    title: 'Task từ localStorage cũ',
    date: new Date().toISOString().slice(0, 10),
    duration: 45,
    priority: 'high',
    status: 'todo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await page.addInitScript(({ key, task }) => {
    localStorage.setItem(key, JSON.stringify({ tasks: [task], events: [], sessions: [], settings: {}, reviews: {} }));
  }, { key: LS_KEY, task: legacyTask });

  await page.goto('/index.html');
  await waitForApp(page);
  await waitForStorage(page);

  // Task cũ hiển thị ngay (boot từ localStorage)
  await expect(page.locator('#dashboard')).toContainText('Task từ localStorage cũ');

  // Và đã được seed sang IndexedDB
  await expect.poll(async () => {
    const rows = await readIdbTable(page, 'tasks');
    return rows.some((t) => t.id === 'legacy-task-1');
  }, { timeout: 10000 }).toBe(true);
});

test('data survives localStorage loss once stored in IndexedDB', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('desktop'), 'Desktop-only storage test');

  await page.goto('/index.html');
  await waitForApp(page);
  await waitForStorage(page);

  const title = `IDB persist ${Date.now()}`;
  await page.click('#openTaskBtn');
  await page.fill('#fTitle', title);
  await page.fill('#fDuration', '30');
  await page.click('#saveTaskBtn');
  await expect(page.locator('#dashboard')).toContainText(title);

  // Chờ debounce ghi IDB hoàn tất
  await expect.poll(async () => {
    const rows = await readIdbTable(page, 'tasks');
    return rows.some((t) => t.title === title);
  }, { timeout: 10000 }).toBe(true);

  // Giả lập localStorage bị mất (quota/clear) — IndexedDB phải khôi phục được dữ liệu
  await page.evaluate((key) => localStorage.removeItem(key), LS_KEY);
  await page.reload();
  await waitForApp(page);
  await waitForStorage(page);

  await expect(page.locator('#dashboard')).toContainText(title, { timeout: 10000 });
});

test('background image is kept out of localStorage but restored from IndexedDB', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('desktop'), 'Desktop-only storage test');

  await page.goto('/index.html');
  await waitForApp(page);
  await waitForStorage(page);

  // Gắn ảnh nền nhỏ trực tiếp qua state (mô phỏng upload)
  await page.evaluate(() => {
    const db = window.getTimelineDb();
    db.settings.backgroundImage = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
    db.settings.backgroundName = 'test.gif';
    db.settings.backgroundPreset = 'upload';
    window.saveTimelineDb ? window.saveTimelineDb() : window.setTheme(db.settings.theme); // setTheme gọi save()
  });

  // localStorage boot-cache không được chứa base64
  await expect.poll(async () => page.evaluate((key) => {
    const raw = JSON.parse(localStorage.getItem(key) || '{}');
    return raw.settings ? raw.settings.backgroundImage || '' : '';
  }, LS_KEY), { timeout: 5000 }).toBe('');

  // IndexedDB phải giữ ảnh đầy đủ
  await expect.poll(async () => {
    const rows = await readIdbTable(page, 'kv');
    const settings = rows.find((r) => r.key === 'settings');
    return settings && settings.value.backgroundImage ? settings.value.backgroundImage.startsWith('data:image/') : false;
  }, { timeout: 10000 }).toBe(true);

  // Reload: ảnh nền được khôi phục từ IndexedDB
  await page.reload();
  await waitForApp(page);
  await waitForStorage(page);
  await expect.poll(async () => page.evaluate(() => window.getTimelineDb().settings.backgroundImage.startsWith('data:image/')), { timeout: 10000 }).toBe(true);
});
