const CACHE_NAME = 'zaman-negar-v1';
const DYNAMIC_CACHE = 'zaman-negar-dynamic-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/login',
  '/manifest.json',
  '/icons/icon.png', // Ensure you have these icons or remove
  '/icons/logo.png'
];

// 1. Install Event
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use map to attempt adding each asset individually
      return Promise.allSettled(
        STATIC_ASSETS.map(asset => 
          cache.add(asset).catch(err => console.warn(`Failed to cache ${asset}:`, err))
        )
      );
    })
  );
});
// 2. Activate Event (Cleanup old caches)
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
  return self.clients.claim(); // Take control immediately
});

// 3. Fetch Event (The Proxy)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // A. API Requests: Network First -> Cache Fallback
  if (url.pathname.startsWith('/api/') || url.href.includes('localhost:8000')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone and cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // If offline, return cached API response
          return caches.match(event.request);
        })
    );
    return;
  }

  // B. Static Assets (Next.js chunks, CSS, Images): Cache First -> Network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        // Cache new static assets dynamically
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

// 4. Background Sync (Optional - for advanced "save later" logic)
// This requires the frontend to register a 'sync' event.
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-events') {
        console.log("Service Worker: Syncing events...");
        // Logic to read IndexedDB and post to API would go here
    }
});


// 5. Push Notification Event
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'زمان‌نگار', body: 'اعلان جدید دریافت شد' };
  
  const options = {
    body: data.body,
    icon: '/icons/logo.png', // The app icon we set earlier
    badge: '/icons/icon.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 6. Notification Click Action
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});