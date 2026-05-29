// Timeline Focus Service Worker — v9
// Strategy: Cache-first for static, Stale-While-Revalidate for HTML, Network-first for dynamic
const CACHE_STATIC = 'tl-focus-static-v9';
const CACHE_DYNAMIC = 'tl-focus-dynamic-v9';

// Critical: SW install thất bại nếu thiếu những file này
const CRITICAL_ASSETS = [
  './',
  './index.html',
  './app.js',
  './style.css',
  './manifest.webmanifest',
  './icon.svg',
  './img/icon-192.png',
  './img/icon-512.png'
];

// Optional: cố gắng cache, không block install nếu thiếu
const OPTIONAL_ASSETS = [
  './img/campus-bg.png',
  './img/campus-building.png',
  './img/campus-logo.png'
];

// Install: cache critical assets bắt buộc, optional assets best-effort
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then(cache =>
      // Critical phải thành công
      cache.addAll(CRITICAL_ASSETS).then(() =>
        // Optional: thử từng file, bỏ qua nếu lỗi
        Promise.allSettled(
          OPTIONAL_ASSETS.map(url =>
            cache.add(url).catch(err => console.warn('[SW] Optional asset skipped:', url, err))
          )
        )
      )
    ).then(() => self.skipWaiting())
    .catch(err => {
      console.error('[SW] Critical asset cache failed:', err);
      // Vẫn skipWaiting để SW activate dù critical cache lỗi
      return self.skipWaiting();
    })
  );
});

// Activate: xóa cache cũ (v7 và trước đó)
self.addEventListener('activate', event => {
  const allowedCaches = [CACHE_STATIC, CACHE_DYNAMIC];
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => !allowedCaches.includes(key))
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch strategy:
//   - HTML (index.html): Stale-While-Revalidate → luôn trả cached, update ngầm
//   - Images/fonts/static: Cache-first
//   - Khác: Network-first với fallback cache
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Chỉ handle same-origin và google fonts
  if (url.origin !== location.origin && !url.hostname.includes('fonts.g')) return;

  const isHTML = event.request.headers.get('accept')?.includes('text/html');
  const isStatic = /\.(png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf|css|js)$/i.test(url.pathname);

  if (isHTML) {
    // Stale-While-Revalidate cho HTML
    event.respondWith(
      caches.open(CACHE_STATIC).then(cache =>
        cache.match(event.request).then(cached => {
          const networkFetch = fetch(event.request).then(response => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          }).catch(() => cached || new Response('Offline', { status: 503 }));
          return cached || networkFetch;
        })
      )
    );
  } else if (isStatic) {
    // Cache-first cho static assets
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            caches.open(CACHE_STATIC).then(c => c.put(event.request, response.clone()));
          }
          return response;
        }).catch(() => new Response('', { status: 408 }));
      })
    );
  } else {
    // Network-first cho API calls / dynamic content
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            caches.open(CACHE_DYNAMIC).then(c => c.put(event.request, response.clone()));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then(c => c || caches.match('./index.html')))
    );
  }
});
