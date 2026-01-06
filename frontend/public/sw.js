const CACHE_NAME = 'zaman-negar-shell-v2';

// Assets to pre-cache immediately
const APP_SHELL = [
  '/',
  '/login',
  '/manifest.json',
  '/icons/icon.png',
  '/icons/logo.png',
  '/globe.svg',
  '/window.svg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // console.log('[SW] Pre-caching App Shell');
      return cache.addAll(APP_SHELL).catch(err => console.warn('Pre-cache failed:', err));
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            // console.log('[SW] removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. IGNORE API REQUESTS (Let React Query + LocalStorage handle data)
  // This prevents SW from returning stale JSON data
  if (url.pathname.startsWith('/api/') || url.href.includes(':8000')) {
    return;
  }

  // 2. HTML Navigation (Network First -> Fallback to Cache)
  // We always want the latest version of the page logic if possible
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
        .catch(() => {
          return caches.match(event.request)
            .then(res => res || caches.match('/')); // Fallback to root if specific page fails
        })
    );
    return;
  }

  // 3. Static Assets (Stale-While-Revalidate)
  // Serve cached version immediately, but update cache in background
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|css|js|woff2)$/) || url.pathname.startsWith('/_next')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
             caches.open(CACHE_NAME).then((cache) => {
               cache.put(event.request, networkResponse.clone());
             });
          }
          return networkResponse;
        });
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }
});

// Push Notifications (Keep existing logic)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'زمان‌نگار', body: 'اعلان جدید' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/logo.png',
      badge: '/icons/icon.png',
      dir: 'rtl',
      data: { url: data.url || '/' }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url === urlToOpen && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(urlToOpen);
    })
  );
});