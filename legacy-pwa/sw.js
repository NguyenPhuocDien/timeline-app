/**
 * Timeline Focus — Service Worker v11
 *
 * Strategy:
 *   - HTML: network-first (luôn lấy bản mới, fallback cache khi offline)
 *   - JS/CSS/img: cache-first với revalidate background
 *   - Firebase API: KHÔNG cache (Firebase SDK có IndexedDB persistence riêng)
 *   - Sentry: KHÔNG cache
 *
 * v11: thêm storage engine (IndexedDB/Dexie) + module sync vào precache
 *
 * Tăng CACHE_VERSION khi:
 *   - Đổi cấu trúc cache (thêm/bớt resource)
 *   - Cần force invalidate cache cũ
 *
 * App.js register: navigator.serviceWorker.register('./sw.js?v=11', { updateViaCache: 'none' })
 * → updateViaCache: 'none' đảm bảo SW file luôn fetch từ network (không cache SW)
 */

const CACHE_VERSION = 'tlf-v11';
const CACHE_NAME = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Pre-cache các file core khi install
const PRECACHE_URLS = [
  './',
  './index.html',
  './app.js',
  './style.css',
  './manifest.webmanifest',
  './vendor/dexie.min.js',
  './src/core/storage.js',
  './src/core/schema.js',
  './src/core/migration.js',
  './src/core/sync-engine.js',
  './src/ui/sync-indicator.js',
];

// Domains/paths KHÔNG bao giờ cache (xử lý riêng Firebase, Sentry, analytics)
const NEVER_CACHE_PATTERNS = [
  /firebaseio\.com/,
  /googleapis\.com/,
  /firebase\.com/,
  /firebaseapp\.com/,
  /gstatic\.com\/firebasejs/,  // Firebase SDK - tự revalidate
  /sentry\.io/,
  /ingest\.sentry\.io/,
  /plausible\.io/,
  /umami/,
];

// ─── INSTALL ────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // addAll fail-fast: nếu 1 file fail thì toàn bộ install fail
      // → dùng Promise.allSettled để tolerant với 404 lẻ tẻ
      return Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          fetch(url, { cache: 'reload' })
            .then((res) => {
              if (res.ok) return cache.put(url, res);
              console.warn('[SW] Pre-cache miss:', url, res.status);
            })
            .catch((err) => console.warn('[SW] Pre-cache error:', url, err))
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

  // Skip cross-origin Firebase/Sentry/analytics
  if (NEVER_CACHE_PATTERNS.some((pattern) => pattern.test(url.href))) {
    return; // fall-through, browser xử lý
  }

  // Skip non-http(s) (chrome-extension, etc.)
  if (!url.protocol.startsWith('http')) return;

  // HTML → network-first
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Other (JS/CSS/img) → cache-first
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

    // Cache miss → offline page (nếu có)
    const indexCache = await caches.match('./index.html');
    if (indexCache) return indexCache;

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
