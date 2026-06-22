const CACHE = 'sb-gen-v5';
const ASSETS = [
  './storyboard.html',
  './manifest.json?v=3',
  './favicon.ico?v=3',
  './favicon.svg?v=3',
  './favicon.png',
  './favicon-16.png?v=3',
  './favicon-32.png?v=3',
  './apple-touch-icon.png?v=3',
  './icon-192.png?v=3',
  './icon-512.png?v=3',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
