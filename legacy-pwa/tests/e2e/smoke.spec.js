const { test, expect } = require('@playwright/test');

const CONSOLE_ALLOWLIST = [
  'favicon.ico',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

function collectConsoleIssues(page) {
  const issues = [];
  page.on('pageerror', err => issues.push(`pageerror: ${err.message}`));
  page.on('console', msg => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (CONSOLE_ALLOWLIST.some(token => text.includes(token))) return;
    issues.push(`console.${msg.type()}: ${text}`);
  });
  page.on('response', response => {
    if (response.status() < 400) return;
    const url = response.url();
    if (CONSOLE_ALLOWLIST.some(token => url.includes(token))) return;
    issues.push(`http ${response.status()}: ${url}`);
  });
  return issues;
}

async function waitForApp(page) {
  await page.waitForFunction(() => typeof window.openTask === 'function', {
    timeout: 10000
  });
  await page.waitForFunction(() => {
    return typeof window.firebaseLogin === 'function'
      && typeof window.firebaseSync === 'function';
  }, { timeout: 15000 });
}

test('desktop shell, task flow, focus flow, and sync runtime are healthy', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('desktop'), 'Desktop-only smoke test');
  const issues = collectConsoleIssues(page);

  await page.goto('/index.html');
  await page.waitForLoadState('networkidle');
  await waitForApp(page);

  await expect(page.locator('#pageTitle')).toHaveText(/Dashboard|H.m nay/i);
  await expect(page.locator('#nav')).toBeVisible();
  await expect(page.locator('#openTaskBtn')).toBeVisible();
  await expect(page.locator('#syncIndicator')).toBeVisible();

  await page.click('#openTaskBtn');
  await expect(page.locator('#taskModal')).toHaveClass(/open/, { timeout: 2000 });

  const title = `Smoke task ${Date.now()}`;
  await page.fill('#fTitle', title);
  await page.fill('#fDuration', '50');
  await page.fill('#fStart', '09:00');
  await page.click('#saveTaskBtn');

  await expect(page.locator('#taskModal')).not.toHaveClass(/open/);
  await expect(page.locator('#dashboard')).toContainText(title);

  await page.click('button[data-tab="timeline"]');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#timelineWrap')).toBeVisible();
  await expect(page.locator('.tblock').filter({ hasText: title })).toBeVisible();

  await page.click('button[data-tab="focus"]');
  await page.waitForLoadState('networkidle');
  await page.locator('#focus button').filter({ hasText: /trung/i }).first().click();
  await expect(page.locator('#focusRemain')).not.toHaveText('0:00');
  await expect(page.getByRole('button', { name: /Pause/i })).toBeVisible();
  await page.getByRole('button', { name: /Pause/i }).click();
  await expect(page.getByRole('button', { name: /Resume/i })).toBeVisible();

  await page.click('button[data-tab="settings"]');
  await expect(page.locator('.syncCard')).toContainText(/workspace/i);
  await expect(page.locator('#settings')).not.toContainText(/firebaseConfig|cấu hình/i);
  await expect(page.locator('#loginBtn')).toBeVisible();

  expect(issues, issues.join('\n')).toEqual([]);
});

test('mobile layout shows mobile navigation and opens key flows', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), 'Mobile-only smoke test');
  const issues = collectConsoleIssues(page);

  await page.goto('/index.html');
  await page.waitForLoadState('networkidle');
  await waitForApp(page);

  await expect(page.locator('#mobileTabs')).toBeVisible();
  await expect(page.locator('#sidebar')).toBeHidden();
  await expect(page.locator('#selectedDate')).toBeVisible();

  await page.click('#openTaskBtn');
  await expect(page.locator('#taskModal')).toHaveClass(/open/, { timeout: 2000 });
  await page.click('#taskModal .btn.secondary');
  await expect(page.locator('#taskModal')).not.toHaveClass(/open/);

  await page.click('#mobileTabs button[data-tab="tasks"]');
  await expect(page.locator('#tasks.section.active')).toBeVisible();

  await page.click('#mobileTabs #moreBtn');
  await expect(page.locator('#moreDrawer')).toBeVisible();
  await page.click('#moreDrawer button[data-tab="analytics"]');
  await expect(page.locator('#analytics.section.active')).toBeVisible();

  expect(issues, issues.join('\n')).toEqual([]);
});
