/* おかいものメモ — Service Worker
   アプリ本体（HTML/CSS/JS/アイコン）をキャッシュしてオフライン動作。
   スコープは /shopping/ 配下のみ（サイト本体の sw.js とは独立）。 */
const CACHE = 'okaimono-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './categories.js',
  './manifest.json',
  './icon.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // stale-while-revalidate：まずキャッシュ→裏で更新（フォントなど外部も対象）
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
