const { defineConfig } = require('@playwright/test');

const browser = process.env.CI
  ? { browserName: 'chromium' }
  : { browserName: 'chromium', channel: 'msedge' };

module.exports = defineConfig({
  testDir: '../../tests/e2e',
  outputDir: '../../test-results/playwright',
  timeout: 45000,
  fullyParallel: false,
  reporter: process.env.CI
    ? [['list'], ['html', { outputFolder: '../../playwright-report', open: 'never' }]]
    : [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:4173/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 30000
  },
  projects: [
    {
      name: 'desktop-edge',
      use: {
        ...browser,
        viewport: { width: 1440, height: 960 }
      }
    },
    {
      name: 'mobile-edge',
      use: {
        ...browser,
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true
      }
    }
  ]
});
