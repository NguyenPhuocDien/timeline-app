const { test, expect } = require('@playwright/test');

test('cold-starts from the service worker cache while fully offline', async ({ context, page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('desktop'), 'Desktop-only offline test');

  await page.goto('/index.html');
  await page.waitForFunction(() => typeof window.openTask === 'function');
  await page.waitForFunction(async () => {
    if (!('serviceWorker' in navigator)) return false;
    await navigator.serviceWorker.ready;
    return Boolean(navigator.serviceWorker.controller);
  });

  const title = `Offline cold start ${Date.now()}`;
  await page.click('#openTaskBtn');
  await page.fill('#fTitle', title);
  await page.fill('#fDuration', '25');
  await page.click('#saveTaskBtn');
  await expect(page.locator('#dashboard')).toContainText(title);

  await expect.poll(async () => page.evaluate(async () => {
    const keys = await caches.keys();
    return keys.some((key) => key.startsWith('tlf-v23'));
  })).toBe(true);

  await page.close();
  await context.setOffline(true);

  const offlinePage = await context.newPage();
  await offlinePage.goto('/index.html', { waitUntil: 'domcontentloaded' });
  await offlinePage.waitForFunction(() => typeof window.openTask === 'function');

  await expect(offlinePage.locator('#pageTitle')).toContainText(/Dashboard|Hôm nay/i);
  await expect(offlinePage.locator('#dashboard')).toContainText(title);
  await expect(offlinePage.locator('#netStatus')).toContainText(/offline/i);
});
