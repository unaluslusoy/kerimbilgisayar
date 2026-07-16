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
    e.respondWith(
      fetch(e.request).catch(async (err) => {
        const cached = await caches.match(e.request);
        if (cached) return cached;
        if (url.pathname.startsWith('/api')) {
          return new Response(JSON.stringify({ error: 'Network error', details: err.message }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return new Response('Network error. Lütfen bağlantınızı kontrol edin.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      })
    );
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
