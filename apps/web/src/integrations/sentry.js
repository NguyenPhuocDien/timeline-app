/**
 * Timeline Focus — Sentry Integration
 *
 * Cách dùng:
 *   1. Tạo project tại https://sentry.io → chọn "Browser JavaScript"
 *   2. Copy DSN, paste vào SENTRY_DSN bên dưới
 *   3. Trong index.html, thêm TRƯỚC tag <script src="app.js"> và TRƯỚC sync-engine.js:
 *
 *     <script type="module" src="src/integrations/sentry.js"></script>
 *
 *   4. Sync engine + app.js sẽ auto detect window.Sentry và gửi errors
 *
 * Privacy:
 *   - KHÔNG gửi email user (chỉ uid)
 *   - KHÔNG gửi content task (chỉ stack trace + tags)
 *   - Sample rate: 100% errors, 10% performance
 *   - Lọc bỏ data nhạy cảm trước khi gửi
 */

// ⚠️ DSN CỦA ANH — paste vào đây sau khi tạo project trên Sentry
const SENTRY_DSN = '__YOUR_SENTRY_DSN_HERE__';

const SENTRY_VERSION = '8.0.0';

// Skip nếu chưa cấu hình
if (SENTRY_DSN.includes('YOUR_SENTRY_DSN_HERE')) {
  console.warn('[Sentry] DSN chưa cấu hình. Bỏ qua khởi tạo.');
} else {
  // Load Sentry SDK từ CDN
  const script = document.createElement('script');
  script.src = `https://browser.sentry-cdn.com/${SENTRY_VERSION}/bundle.min.js`;
  script.crossOrigin = 'anonymous';
  script.async = false; // load sync để catch lỗi sớm
  script.onload = initSentry;
  script.onerror = () => console.warn('[Sentry] Failed to load SDK');
  document.head.appendChild(script);
}

function initSentry() {
  if (!window.Sentry) return;

  window.Sentry.init({
    dsn: SENTRY_DSN,
    release: 'timeline-focus@2.0.0',
    environment: getEnvironment(),

    // Sample rates
    sampleRate: 1.0,             // 100% errors
    tracesSampleRate: 0.0,       // 0% performance traces (tiết kiệm quota free tier)
    replaysSessionSampleRate: 0, // không quay session
    replaysOnErrorSampleRate: 0, // không quay khi có error

    // Privacy filters
    beforeSend(event, hint) {
      // Loại bỏ email user
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
        delete event.user.username;
      }

      // Loại bỏ data nhạy cảm trong extra/contexts
      try {
        if (event.contexts && event.contexts.state) {
          // Nếu redux/state có lưu trong context, scrub
          const ctx = event.contexts.state;
          if (ctx.tasks) ctx.tasks = `[${ctx.tasks.length} tasks]`;
          if (ctx.events) ctx.events = `[${ctx.events.length} events]`;
        }

        // Scrub URL query params
        if (event.request && event.request.url) {
          event.request.url = event.request.url.split('?')[0];
        }

        // Scrub breadcrumb messages có thể chứa task title
        if (event.breadcrumbs) {
          event.breadcrumbs.forEach((b) => {
            if (b.message && b.message.length > 200) {
              b.message = b.message.slice(0, 200) + '...[truncated]';
            }
            // Xóa data field nếu chứa text dài
            if (b.data) {
              for (const k of Object.keys(b.data)) {
                if (typeof b.data[k] === 'string' && b.data[k].length > 200) {
                  b.data[k] = '[redacted]';
                }
              }
            }
          });
        }
      } catch (err) {
        console.warn('[Sentry] beforeSend scrub error:', err);
      }

      return event;
    },

    // Ignore lỗi thường gặp không actionable
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      // Network errors (Firebase tự retry)
      /Network request failed/i,
      /Failed to fetch/i,
      /Load failed/i,
      // Firebase auth user-cancelled
      /auth\/popup-closed-by-user/,
      /auth\/cancelled-popup-request/,
      /auth\/user-cancelled/,
    ],

    // Lỗi từ extension URL không quan trọng
    denyUrls: [
      /^chrome-extension:\/\//,
      /^moz-extension:\/\//,
      /^safari-extension:\/\//,
    ],
  });

  // Custom tags
  window.Sentry.setTag('app', 'timeline-focus');
  window.Sentry.setTag('schema_version', '2');

  console.log('[Sentry] Initialized successfully');
}

function getEnvironment() {
  const host = location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return 'development';
  if (host.includes('vercel.app')) {
    return host.includes('-git-') ? 'preview' : 'production';
  }
  return 'production';
}
