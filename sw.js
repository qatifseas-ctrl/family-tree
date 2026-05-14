/* ═══════════════════════════════════════════════════════════
   شجرة العائلة — Service Worker (sw.js)
   استراتيجية:
   - index.html  → Network-First (لا نخدم HTML قديم يحمل بيانات مضمّنة)
   - الأصول الثابتة (أيقونات، manifest) → Cache-First
   ═══════════════════════════════════════════════════════════ */

const CACHE_NAME = 'family-tree-v1';
const SHELL_CACHE = 'family-tree-shell-v1';

/* الملفات الأساسية التي تُخزَّن فوراً عند التثبيت */
const SHELL_ASSETS = [
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './icons/apple-touch-icon.png'
  /* ملاحظة: index.html متعمَّد إزالته من هنا — نجلبه من الشبكة دائماً */
];

/* ─── Install ─── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

/* ─── Activate: clean up old caches ─── */
self.addEventListener('activate', event => {
  const VALID_CACHES = [CACHE_NAME, SHELL_CACHE];
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => !VALID_CACHES.includes(k)).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ─── Fetch ─── */
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (!request.url.startsWith('http')) return;

  const requestURL = new URL(request.url);

  // Cross-origin: pass through
  if (requestURL.origin !== self.location.origin) {
    event.respondWith(fetch(request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // index.html → Network-First
  // البيانات محفوظة في IDB/localStorage — لا نحتاج نسخة HTML قديمة
  if (isHTMLPage(request)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // الأصول الثابتة (أيقونات، manifest، sw.js) → Cache-First
  event.respondWith(cacheFirst(request));
});

function isHTMLPage(request) {
  const url = request.url;
  return (
    request.mode === 'navigate' ||
    url.endsWith('index.html') ||
    url.endsWith('/') ||
    (!url.includes('.') && !url.includes('?'))
  );
}

/* ─── Network-First: شبكة أولاً، كاش كـ fallback عند انقطاع النت ─── */
async function networkFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      // خزّن النسخة الجديدة (لكن لن تُستخدم إلا عند انقطاع النت)
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    // غير متصل — أرجع النسخة المخزّنة إن وجدت
    const cached = await cache.match(request);
    if (cached) return cached;
    // لا يوجد كاش — أرجع صفحة offline بسيطة
    return new Response(
      `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
       <title>غير متصل</title>
       <style>body{font-family:system-ui;text-align:center;padding:60px;color:#374151;background:#f9fafb}
       h1{font-size:3rem}p{color:#6b7280}</style></head>
       <body><h1>🌳</h1><h2>أنت غير متصل</h2>
       <p>تحقق من اتصالك وأعد المحاولة</p></body></html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

/* ─── Cache-First: كاش أولاً، شبكة كـ fallback ─── */
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
    return new Response('', { status: 503 });
  }
}

/* ─── Message handling ─── */
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
