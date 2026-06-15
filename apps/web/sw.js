/**
 * Timeline Focus — Service Worker v18
 *
 * Strategy:
 *   - HTML: network-first (luôn lấy bản mới, fallback cache khi offline)
 *   - JS/CSS: network-first, fallback cache khi offline
 *   - img/font/etc: cache-first với revalidate background
 *   - Firebase API: KHÔNG cache (Firebase SDK có IndexedDB persistence riêng)
 *   - Sentry: KHÔNG cache
 *
 * v18: mobile performance patch + cache refresh
 * v19: sync auto-retry + network-flap debounce + notification error handling
 *      + sticky notes (Ghi chú nhanh), task color accent + date chip, macOS polish
 *
 * Tăng CACHE_VERSION khi:
 *   - Đổi cấu trúc cache (thêm/bớt resource)
 *   - Cần force invalidate cache cũ
 *
 * App.js register: navigator.serviceWorker.register('./sw.js?v=23', { updateViaCache: 'none' })
 * → updateViaCache: 'none' đảm bảo SW file luôn fetch từ network (không cache SW)
 */

const CACHE_VERSION = 'tlf-v23';
const CACHE_NAME = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Pre-cache các file core khi install
const PRECACHE_URLS = [
  './',
  './index.html',
  './app.js?v=23',
  './style.css',
  './manifest.webmanifest',
  './vendor/dexie.min.js',
  './src/core/storage.js?v=23',
  './src/core/schema.js',
  './src/core/migration.js',
  './src/core/sync-engine.js?v=23',
  './src/core/gcal.js?v=23',
  './src/core/account-management.js?v=23',
  './src/ui/sync-indicator.js?v=23',
];

// ─── INSTALL ────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Core assets are atomic: an incomplete cache must not become active.
      return Promise.all(
        PRECACHE_URLS.map((url) =>
          fetch(url, { cache: 'reload' })
            .then((res) => {
              if (res.ok) return cache.put(url, res);
              throw new Error(`Pre-cache failed: ${url} (${res.status})`);
            })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ─── ACTIVATE: xóa cache version cũ ─────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => {
            console.log('[SW] Deleting old cache:', k);
            return caches.delete(k);
          })
      ))
      .then(() => self.clients.claim())
  );
});

// ─── FETCH ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Chỉ handle GET
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // CHỈ xử lý request cùng origin. Mọi request cross-origin (Firebase, gapi,
  // accounts.google.com, Sentry, CDN...) để browser tự xử lý — SW intercept
  // script bên thứ ba từng làm hỏng Google login (apis.google.com nhận về HTML).
  if (url.origin !== self.location.origin) return;

  // Skip non-http(s) (chrome-extension, etc.)
  if (!url.protocol.startsWith('http')) return;

  // Không đụng vào đường auth helper (/__/auth/*, /__/firebase/*) — proxy về Firebase
  if (url.pathname.startsWith('/__/')) return;

  // HTML → network-first
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // JS/CSS must update promptly after deploy; cache remains offline fallback.
  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(networkFirst(request));
    return;
  }
  // Other assets → cache-first
  event.respondWith(cacheFirst(request));
});

// ─── STRATEGIES ─────────────────────────────────────────────────────────────

async function networkFirst(request) {
  try {
    const networkRes = await fetch(request);
    // Lưu vào runtime cache cho lần offline
    if (networkRes.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkRes.clone());
    }
    return networkRes;
  } catch (err) {
    // Network fail → fallback cache
    const cached = await caches.match(request);
    if (cached) return cached;

    // Cache miss → offline page CHỈ cho navigation (trả HTML cho script/style
    // sẽ gây lỗi MIME 'text/html is not executable' với nosniff)
    if (request.mode === 'navigate') {
      const indexCache = await caches.match('./index.html');
      if (indexCache) return indexCache;
    }

    // Cuối cùng: trả về error response
    return new Response('Offline. Không có cached version.', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    // Background revalidate (stale-while-revalidate light)
    fetch(request)
      .then((res) => {
        if (res.ok) {
          caches.open(RUNTIME_CACHE).then((c) => c.put(request, res));
        }
      })
      .catch(() => {});
    return cached;
  }

  // Cache miss → fetch + cache
  try {
    const networkRes = await fetch(request);
    if (networkRes.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkRes.clone());
    }
    return networkRes;
  } catch (err) {
    return new Response('Resource unavailable offline', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

// ─── MESSAGE: cho phép app gọi skipWaiting/clearCache ───────────────────────
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data === 'CLEAR_CACHE') {
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    ).then(() => {
      event.ports[0]?.postMessage({ cleared: true });
    });
  }
});
