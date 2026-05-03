/* ═══════════════════════════════════════════════════════════
   شجرة العائلة — Service Worker (sw.js)
   استراتيجية: Cache-First للأصول الثابتة، Network-First للبيانات
   ═══════════════════════════════════════════════════════════ */

const CACHE_NAME = 'family-tree-v1';
const SHELL_CACHE = 'family-tree-shell-v1';

/* الملفات الأساسية التي تُخزَّن فوراً عند التثبيت */
const SHELL_ASSETS = [
  './index.html',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './icons/apple-touch-icon.png'
];

/* ─── Install: pre-cache the app shell ─── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
      .catch(err => {
        // Don't block install even if pre-cache fails
        console.warn('[SW] Pre-cache failed (might be offline):', err);
        return self.skipWaiting();
      })
  );
});

/* ─── Activate: clean up old caches ─── */
self.addEventListener('activate', event => {
  const VALID_CACHES = [CACHE_NAME, SHELL_CACHE];
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => !VALID_CACHES.includes(k))
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ─── Fetch: smart caching strategy ─── */
self.addEventListener('fetch', event => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip non-HTTP(S) requests (e.g. chrome-extension://)
  if (!request.url.startsWith('http')) return;

  // Skip cross-origin requests (CDNs, APIs, etc.)
  const requestURL = new URL(request.url);
  if (requestURL.origin !== self.location.origin) {
    // For cross-origin: try network, fall back to nothing
    event.respondWith(fetch(request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // Determine strategy based on request type
  if (isShellAsset(request)) {
    // Cache-First for app shell (HTML, icons, manifest)
    event.respondWith(cacheFirst(request));
  } else {
    // Stale-While-Revalidate for everything else
    event.respondWith(staleWhileRevalidate(request));
  }
});

/* ─── Helper: is this a shell/core asset? ─── */
function isShellAsset(request) {
  const url = request.url;
  return (
    url.endsWith('index.html') ||
    url.endsWith('/') ||
    url.includes('manifest.json') ||
    url.includes('/icons/') ||
    request.mode === 'navigate'
  );
}

/* ─── Strategy: Cache-First ─── */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    // Offline and not cached — return a minimal offline page
    return new Response(
      `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
       <title>غير متصل</title>
       <style>body{font-family:system-ui;text-align:center;padding:60px;color:#374151;background:#f9fafb}
       h1{font-size:3rem;margin-bottom:1rem}p{color:#6b7280}</style></head>
       <body><h1>🌳</h1><h2>أنت غير متصل بالإنترنت</h2>
       <p>تحقق من اتصالك وأعد المحاولة</p></body></html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

/* ─── Strategy: Stale-While-Revalidate ─── */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  // Kick off network fetch in background regardless
  const networkFetch = fetch(request)
    .then(response => {
      if (response && response.status === 200) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  // Return cached immediately if available, otherwise wait for network
  return cached || networkFetch || new Response('', { status: 503 });
}

/* ─── Message handling (for skip-waiting from UI) ─── */
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
