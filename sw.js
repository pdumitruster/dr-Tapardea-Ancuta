/* ============================================
   SERVICE WORKER — Cabinet Dr. Țăpârdea PWA
   Strategie: Cache-first doar pentru assets statice
   API Supabase → ÎNTOTDEAUNA rețea directă
   ============================================ */

const CACHE_NAME = 'dr-tapardea-v1.0.3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = event.request.url;

  // !! Supabase și orice API extern → NICIODATĂ din cache, întotdeauna rețea
  if (url.includes('supabase.co') || url.includes('supabase.io') || event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Assets statice → cache-first cu fallback la rețea
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200 || response.type === 'opaque') return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        }).catch(() => {
          if (event.request.destination === 'document') return caches.match('/index.html');
        });
      })
  );
});

self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Cabinet Dr. Țăpârdea', {
      body: data.body || 'Aveți o notificare nouă',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [200, 100, 200],
      data: { url: data.url || '/' }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/'));
});
