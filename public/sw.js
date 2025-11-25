const CACHE_NAME = 'zurvanex-v2';
const urlsToCache = [
  '/',
  '/manifest.json',
];

// Install service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Fetch with network-first strategy
self.addEventListener('fetch', (event) => {
  // Only process requests from the same origin to avoid issues with extensions or external resources
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip Next.js development resources and hot module reloading
  const url = new URL(event.request.url);
  if (url.pathname.includes('/_next/webpack-hmr') ||
      url.pathname.includes('/__nextjs_') ||
      url.searchParams.has('v')) {
    return;
  }

  // A network-first, cache-second strategy
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If the request is successful, clone the response and cache it
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // If the network request fails, try to serve from the cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If no cache is available, return a basic offline response
          return new Response('Offline - No cached version available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
  );
});

// Activate and clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Handle push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || 'Zurvanex';
  const options = {
    body: data.body || 'You have a new message',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'notification',
    data: data.data || {},
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if ('focus' in client) {
            return client.focus();
          }
        }
        // Open new window if none exists
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data?.url || '/');
        }
      })
  );
});
