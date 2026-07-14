const CACHE_NAME = 'kerim-servis-cache-v1.2';
const ASSETS_TO_CACHE = [
  '/admin',
  '/assets/images/favicon.svg',
  '/assets/images/kerim-logo.svg',
  '/assets/images/kerim-logo-beyaz.svg'
];

// Install Event
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event (Stale While Revalidate or Network First for API)
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  
  // API veya dinamik admin isteklerini cache'leme, doğrudan ağa git
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/admin/')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Arka planda güncelle
        fetch(e.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, networkResponse));
          }
        }).catch(() => {/* ignore network errors */});
        return cachedResponse;
      }
      return fetch(e.request);
    })
  );
});
