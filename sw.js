const CACHE_NAME = 'lynqchat-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/assets/css/styles.css',
  '/assets/js/app.js',
  '/assets/js/auth.js',
  '/assets/js/chat.js',
  '/assets/js/utils.js',
  '/assets/js/firebase-init.js',
  '/assets/views/login.html',
  '/assets/views/chat.html',
  '/assets/views/register.html',
  '/assets/views/settings.html',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png',
  '/assets/views/privacy.html',
  '/assets/views/notifications.html',
  '/assets/views/about.html',
  '/assets/views/profile.html',
'/assets/views/contacts.html',
'/assets/views/media.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
// تحديث إستراتيجية التخزين المؤقت
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    // تجاهل طلبات API
    event.respondWith(fetch(event.request));
  } else {
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
  }
});
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});