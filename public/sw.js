// Continuum Service Worker
const CACHE_NAME = 'continuum-sw-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Push notification handling
self.addEventListener('push', (event) => {
  let data = {
    title: 'Continuum',
    body: 'New update in your personal space.',
    icon: '/icon-192',
    badge: '/icon',
    url: '/dashboard',
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  const title = data.title || 'Continuum';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192',
    badge: data.badge || '/icon',
    data: {
      url: data.url || '/dashboard',
    },
    tag: data.tag || 'continuum-notification',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
