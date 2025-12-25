const CACHE_NAME = 'zaman-negar-v1';
const DYNAMIC_CACHE = 'zaman-negar-dynamic-v1';

const STATIC_ASSETS = [
  '/',
  '/login',
  '/manifest.json',
  '/icons/icon.png',
  '/icons/logo.png',
  '/globe.svg',
  '/window.svg'
];

// 1. Install Event
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use map to safely add assets; logs failures but doesn't crash the whole install
      return Promise.allSettled(
        STATIC_ASSETS.map(asset => 
          cache.add(asset).catch(err => console.warn(`Failed to cache ${asset}:`, err))
        )
      );
    })
  );
});

// 2. Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== DYNAMIC_CACHE) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// 3. Fetch Event
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // A. API Requests
  if (url.pathname.startsWith('/api/') || url.href.includes('localhost:8000')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // B. Static Assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then((response) => {
        if (response.status === 200 && (url.pathname.startsWith('/_next') || url.pathname.match(/\.(png|jpg|jpeg|svg|css|js)$/))) {
             const responseClone = response.clone();
             caches.open(CACHE_NAME).then((cache) => {
               cache.put(event.request, responseClone);
             });
        }
        return response;
      });
    })
  );
});

// 4. Push Notification Event
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'زمان‌نگار', body: 'اعلان جدید' };
  
  const options = {
    body: data.body,
    icon: '/icons/logo.png',
    badge: '/icons/icon.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
    dir: 'rtl',
    lang: 'fa'
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 5. Notification Click Action (FIXED)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window for this app open
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});