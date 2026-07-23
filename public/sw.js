const CACHE_NAME = 'kerim-servis-cache-v2.0';
const ASSETS_TO_CACHE = [
  '/',
  '/admin',
  '/ariza-sorgulama',
  '/assets/images/favicon.svg',
  '/assets/images/kerim-logo.svg',
  '/assets/images/kerim-logo-beyaz.svg'
];

// Install Event - Pre-cache core shell
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean old caches
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

// Fetch Event (Network First for API & dynamic pages, Stale-While-Revalidate for static assets)
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  
  // Dynamic API & Admin routes -> Network First
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/admin')) {
    e.respondWith(
      fetch(e.request).catch(async (err) => {
        const cached = await caches.match(e.request);
        if (cached) return cached;
        if (url.pathname.startsWith('/api')) {
          return new Response(JSON.stringify({ error: 'İnternet bağlantısı kesildi.', details: err.message }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return new Response('İnternet bağlantısı kesildi. Lütfen ağ bağlantınızı kontrol edip tekrar deneyin.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      })
    );
    return;
  }

  // Static Assets -> Stale-While-Revalidate
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      const fetchPromise = fetch(e.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, responseToCache));
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
