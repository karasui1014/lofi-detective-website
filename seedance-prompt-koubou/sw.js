/* Service Worker ── オフライン対応(PWA) */
"use strict";

/* 中身を変えたらここの数字を必ず上げること。
   上げないと、古いキャッシュが同じ名前のまま残って更新が反映されない。 */
const CACHE_NAME = "seedance-koubou-v6";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./data.js",
  "./builder.js",
  "./validator.js",
  "./app.js",
  "./manifest.webmanifest",
  "./favicon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  /* ネットワーク優先。更新したファイルが必ず反映されるようにし、
     オフライン時だけキャッシュに落とす。 */
  event.respondWith(
    fetch(req).then(res => {
      if (res && res.status === 200 && res.type === "basic") {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req).then(hit => hit || caches.match("./index.html")))
  );
});
