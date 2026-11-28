/* KTS 전자명함 · 매물장 — 오프라인에서도 명함이 열리게 (네트워크 우선, 없으면 캐시) */
var CACHE = 'kts-bizcard-20261128a';
var SHELL = ['./', './index.html', './app.css', './app.js', './parse.js', './gongbu.js',
  './premium.js', './terrain.js', './realtx.js', './seal.js', './vendor/qrcode.js',
  './assistant.js', './manifest.webmanifest', './icon-192.png', './icon-512.png',
  './img/sample_person.jpg', './img/sample_land.jpg', './img/sample_house.jpg', './img/og_card.jpg'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL) }).then(function () { return self.skipWaiting() }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE }).map(function (k) { return caches.delete(k) }));
  }).then(function () { return self.clients.claim() }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var u;
  try { u = new URL(req.url) } catch (err) { return }
  if (u.origin !== location.origin) return;      /* 브이월드·공공데이터는 그대로 네트워크로 */
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok && res.type === 'basic') {
        var cp = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, cp) });
      }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (r) {
        return r || caches.match('./index.html');
      });
    })
  );
});
