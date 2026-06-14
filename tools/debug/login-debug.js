const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const events = [];
  page.on('console', m => { if (['error','warning'].includes(m.type())) events.push(`CONSOLE ${m.type()}: ${m.text().slice(0,300)}`); });
  page.on('pageerror', e => events.push('PAGEERROR: ' + e.message.slice(0,300)));
  page.on('requestfailed', r => events.push(`REQFAIL: ${r.url().slice(0,150)} :: ${r.failure()?.errorText}`));
  page.on('response', async r => {
    if (r.status() >= 400) events.push(`HTTP ${r.status()}: ${r.url().slice(0,200)}`);
  });
  ctx.on('page', async p => {
    events.push('POPUP OPENED: ' + p.url().slice(0,250));
    p.on('response', async r => {
      if (r.status() >= 400) {
        let body = '';
        try { body = (await r.text()).slice(0, 300); } catch {}
        events.push(`POPUP HTTP ${r.status()}: ${r.url().slice(0,200)} BODY: ${body}`);
      }
    });
    p.on('framenavigated', f => { if (f === p.mainFrame()) events.push('POPUP NAV: ' + f.url().slice(0,250)); });
  });
  await page.goto('https://timeline-app-one-beta.vercel.app/', { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(2000);
  await page.click('#loginBtn');
  await page.waitForTimeout(12000);
  const toast = await page.locator('#toast').innerText().catch(() => '');
  console.log('TOAST:', JSON.stringify(toast));
  console.log('EVENTS:');
  events.forEach(e => console.log(' -', e));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
