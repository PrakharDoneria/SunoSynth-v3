const CACHE_NAME = 'sunosynth-v1';
const ASSET_CACHE = [
  '/',
  '/static/manifest.webmanifest',
  '/static/img/icon-192.svg',
  '/static/img/icon-512.svg',
  '/static/css/base.css',
  '/static/css/layout.css',
  '/static/css/components.css',
  '/static/css/player.css',
  '/static/css/pages.css',
  '/static/css/responsive.css',
  '/static/js/utils.js',
  '/static/js/storage.js',
  '/static/js/api.js',
  '/static/js/recommender.js',
  '/static/js/ui.js',
  '/static/js/player.js',
  '/static/js/views.js',
  '/static/js/router.js',
  '/static/js/core.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSET_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/'))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      });
    })
  );
});
