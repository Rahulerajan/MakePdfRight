const CACHE_NAME = 'makepdfright-v1.1.0';
const STATIC_ASSETS = [
  '/manifest.json',
  '/favicon.ico',
  '/favicon.svg',
  '/favicon.png',
  '/apple-touch-icon.png',
  '/robots.txt'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames.map((cache) => cache !== CACHE_NAME ? caches.delete(cache) : Promise.resolve(false))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  // Always prefer the network for document navigations so releases, SEO metadata,
  // auth state and tool pages do not get pinned to stale cached HTML.
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html').then((response) => response || Response.error()))
    );
    return;
  }

  // Cache immutable/static assets only. Query-stringed build assets are safe because
  // the full Request is used as the cache key.
  const isStaticAsset =
    STATIC_ASSETS.includes(url.pathname) ||
    ['style', 'script', 'font', 'image'].includes(request.destination) ||
    url.pathname.startsWith('/assets/');

  if (!isStaticAsset) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkResponse = fetch(request).then((response) => {
        if (response && response.ok && response.type === 'basic') {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
        }
        return response;
      });
      return cachedResponse || networkResponse;
    })
  );
});
