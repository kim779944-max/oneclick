/* ============================================================================
   KTS 공용 서비스워커 — 설치형 바로가기(PWA) 조건 충족 + 오프라인 최소 대비
   ----------------------------------------------------------------------------
   · 네트워크 우선: 온라인일 때는 언제나 서버의 최신 화면을 그대로 쓴다.
     (캐시는 네트워크가 실패했을 때만 꺼내 쓴다 → 옛 화면이 남는 사고 없음)
   · 같은 출처(autooneclick.com)의 화면·스크립트·이미지만 담는다. 외부 API
     (공공데이터포털·브이월드 등)와 POST 요청은 손대지 않는다.
   · /admin 은 캐시하지 않는다.
   ========================================================================== */
var CACHE = 'kts-pwa-v1';
var MAX = 120;
var OK_TYPE = /(text\/html|text\/css|javascript|application\/json|manifest\+json|image\/(png|jpeg|webp|svg\+xml|gif)|font\/(woff2?|ttf))/i;

self.addEventListener('install', function (e) { self.skipWaiting(); });

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.map(function (k) { return k === CACHE ? null : caches.delete(k) }));
  }).then(function () { return self.clients.claim() }));
});

function trim(c) {
  return c.keys().then(function (keys) {
    if (keys.length <= MAX) return;
    return Promise.all(keys.slice(0, keys.length - MAX).map(function (k) { return c.delete(k) }));
  }).catch(function () {});
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var u;
  try { u = new URL(req.url) } catch (err) { return }
  if (u.origin !== location.origin) return;
  if (/^\/admin(\.html)?(\/|$)/.test(u.pathname)) return;

  e.respondWith(fetch(req).then(function (res) {
    try {
      var ct = (res.headers.get('content-type') || '');
      var len = +(res.headers.get('content-length') || 0);
      if (res && res.ok && res.type === 'basic' && OK_TYPE.test(ct) && (!len || len < 3e6)) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { return c.put(req, copy).then(function () { return trim(c) }) }).catch(function () {});
      }
    } catch (err) {}
    return res;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      if (req.mode === 'navigate') {
        return caches.match('/index.html', { ignoreSearch: true }).then(function (home) {
          return home || new Response(
            '<!DOCTYPE html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            + '<body style="margin:0;background:#0A1128;color:#F3F6FA;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center">'
            + '<div><b style="font-size:16px">인터넷 연결을 확인해 주세요</b><p style="color:#AFBDD0;font-size:13px">연결되면 다시 열립니다</p></div></body></html>',
            { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
        });
      }
      return new Response('', { status: 504, statusText: 'offline' });
    });
  }));
});
