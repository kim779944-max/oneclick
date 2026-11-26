/* ============================================================================
   KTS 공용 — 바탕화면 바로가기(PWA) 자동 설치 안내  ·  240번
   ----------------------------------------------------------------------------
   각 앱 HTML 끝에 한 줄만 넣으면 동작한다:

   <script src="/shared/pwa-install.js?v=20261126"
           data-name="4대 공부" data-start="/gongbu/"
           data-manifest="/shared/pwa/gongbu.webmanifest" defer></script>

   · 안드로이드 크롬: beforeinstallprompt 를 잡아 하단에 [바탕화면 바로가기 추가] 배너
   · 이미 설치된 standalone 모드면 아무것도 띄우지 않는다
   · 카카오톡 인앱 브라우저: 크롬 탈출(intent) / 아이폰 Safari 안내 1줄
   · 배너는 × 로 닫을 수 있고 7일 동안 다시 뜨지 않는다 (30초 뒤 자동 접힘)
   · /sw.js 를 함께 등록해 설치 조건(서비스워커)을 만족시킨다 — 네트워크 우선이라
     온라인일 때 화면은 항상 최신 그대로다
   ========================================================================== */
(function () {
  'use strict';
  if (window.__KTS_PWA_LOADED) return;
  window.__KTS_PWA_LOADED = 1;

  var me = document.currentScript;
  if (!me) {
    var ss = document.getElementsByTagName('script');
    for (var i = ss.length - 1; i >= 0; i--) { if (/pwa-install\.js/.test(ss[i].src || '')) { me = ss[i]; break } }
  }
  function attr(n, d) { try { return (me && me.getAttribute(n)) || d } catch (e) { return d } }
  var NAME = attr('data-name', 'KTS 원클릭');
  var START = attr('data-start', '/');
  var MANIFEST = attr('data-manifest', '');
  var ICON = attr('data-icon', '/shared/pwa/icon-192.png');

  var UA = navigator.userAgent || '';
  var isKakao = /KAKAOTALK/i.test(UA);
  var isAndroid = /Android/i.test(UA);
  var isIOS = /iPhone|iPad|iPod/i.test(UA) || (/Macintosh/i.test(UA) && 'ontouchend' in document);

  function standalone() {
    try {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
      if (window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches) return true;
      if (navigator.standalone) return true;
    } catch (e) {}
    return false;
  }
  var HIDE_KEY = 'kts_pwa_hide_v1';
  function hiddenRecently() {
    try {
      var t = +(localStorage.getItem(HIDE_KEY) || 0);
      return t && (Date.now() - t) < 7 * 864e5;
    } catch (e) { return false }
  }
  function rememberHide() { try { localStorage.setItem(HIDE_KEY, String(Date.now())) } catch (e) {} }

  /* 1) manifest 링크가 없는 예전 페이지면 여기서 붙인다 */
  try {
    if (MANIFEST && !document.querySelector('link[rel="manifest"]')) {
      var lk = document.createElement('link');
      lk.rel = 'manifest'; lk.href = MANIFEST;
      (document.head || document.documentElement).appendChild(lk);
    }
  } catch (e) {}

  /* 2) 서비스워커 등록 — 설치형 앱 조건 + 오프라인 최소 대비 (https 에서만) */
  try {
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      var reg = function () { navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {}) };
      if (document.readyState === 'complete') reg();
      else window.addEventListener('load', reg);
    }
  } catch (e) {}

  if (standalone() || hiddenRecently()) return;

  var CSS = ''
    + '.kts-pwa{position:fixed;left:0;right:0;bottom:0;z-index:2147482000;display:flex;align-items:center;gap:10px;'
    + 'padding:9px 12px calc(9px + env(safe-area-inset-bottom));'
    + 'background:linear-gradient(180deg,rgba(13,32,62,.98),rgba(8,18,38,.99));'
    + 'color:#F3F6FA;border-top:1px solid rgba(255,107,0,.5);box-shadow:0 -8px 26px rgba(0,0,0,.5);'
    + 'font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",Roboto,sans-serif;'
    + 'letter-spacing:-.2px;animation:ktsPwaUp .26s ease-out;-webkit-tap-highlight-color:transparent}'
    + '.kts-pwa *{box-sizing:border-box}'
    + '.kts-pwa img{width:34px;height:34px;border-radius:9px;flex:none;background:#0F1B33;display:block}'
    + '.kts-pwa-tx{flex:1;min-width:0;line-height:1.3}'
    + '.kts-pwa-tx b{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:12.5px;font-weight:800;line-height:1.25}'
    + '.kts-pwa-tx span{display:block;font-size:11px;font-weight:500;color:#AFBDD0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}'
    + '.kts-pwa-go,.kts-pwa-a{flex:none;background:#FF6B00;color:#0A1224;border:0;border-radius:10px;padding:8px 11px;'
    + 'font-size:12px;font-weight:800;font-family:inherit;text-decoration:none;line-height:1.2;white-space:nowrap;display:inline-block}'
    + '.kts-pwa-a{background:#1B2C4E;color:#FFC08A;border:1px solid rgba(255,107,0,.5);font-weight:700}'
    + '.kts-pwa-x{flex:none;background:transparent;border:0;color:#8FA0B8;font-size:20px;line-height:1;'
    + 'padding:2px 1px 2px 4px;font-family:inherit;cursor:pointer}'
    + '@keyframes ktsPwaUp{from{transform:translateY(110%)}to{transform:translateY(0)}}';
  try {
    var st = document.createElement('style');
    st.id = 'kts-pwa-css'; st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  } catch (e) {}

  var bar = null, timer = 0, deferred = null;

  function kill() {
    if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
    bar = null; clearTimeout(timer);
  }
  function close(remember) {
    if (remember) rememberHide();
    kill();
  }
  function mk(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  /* 배너 그리기 — mode: 'browser' | 'kakao' | 'ios' */
  function show(mode) {
    if (bar || standalone() || hiddenRecently()) return;
    if (!document.body) { document.addEventListener('DOMContentLoaded', function () { show(mode) }, { once: true }); return }
    bar = mk('div', 'kts-pwa');
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', '바탕화면 바로가기 안내');

    var ic = mk('img'); ic.alt = ''; ic.src = ICON; ic.onerror = function () { ic.style.visibility = 'hidden' };
    var tx = mk('div', 'kts-pwa-tx');
    var go;

    if (mode === 'kakao' || mode === 'ios') {
      if (isAndroid) {
        var host = location.host + (location.pathname || '/') + (location.search || '') + (location.hash || '');
        var intent = 'intent://' + host + '#Intent;scheme=' + location.protocol.replace(':', '')
          + ';package=com.android.chrome;S.browser_fallback_url=' + encodeURIComponent(location.href) + ';end';
        tx.innerHTML = '<b>카카오톡에서는 설치가 안 됩니다</b>'
          + '<span>크롬으로 열고 [바로가기 추가]</span>';
        go = mk('a', 'kts-pwa-go', '크롬으로 열기');
        go.href = intent; go.rel = 'noopener';
        go.addEventListener('click', function () { setTimeout(kill, 900) });
      } else if (isIOS) {
        tx.innerHTML = '<b>' + NAME + ' — 사파리에서 바로가기</b>'
          + '<span>' + (isKakao ? '⋯ → Safari로 열기 → ' : '') + '공유 → 홈 화면에 추가</span>';
        go = mk('button', 'kts-pwa-a', '링크 복사');
        go.type = 'button';
        go.addEventListener('click', function () {
          var t = location.href;
          function done() { if (go) go.textContent = '복사됨' }
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, function () {})
          else { try { var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done() } catch (e) {} }
        });
      } else {
        tx.innerHTML = '<b>' + NAME + '</b><span>브라우저 주소창에 주소를 넣어 열면 바로가기를 만들 수 있습니다</span>';
      }
    } else {
      tx.innerHTML = '<b>' + NAME + ' 바탕화면에 두기</b><span>홈 화면 아이콘으로 바로 열립니다</span>';
      go = mk('button', 'kts-pwa-go', '바로가기 추가');
      go.type = 'button';
      go.addEventListener('click', function () {
        if (!deferred) { close(false); return }
        var ev = deferred; deferred = null;
        go.disabled = true; go.textContent = '설치 중…';
        try { ev.prompt() } catch (e) { close(false); return }
        var pr = ev.userChoice;
        if (pr && pr.then) pr.then(function (r) { if (r && r.outcome === 'accepted') close(true); else close(true) }, function () { close(true) });
      });
    }

    var x = mk('button', 'kts-pwa-x', '&times;');
    x.type = 'button'; x.setAttribute('aria-label', '닫기');
    x.addEventListener('click', function () { close(true) });

    bar.appendChild(ic); bar.appendChild(tx);
    if (go) bar.appendChild(go);
    bar.appendChild(x);
    document.body.appendChild(bar);
    timer = setTimeout(function () { kill() }, 30000);   /* 30초 뒤 스스로 접힘 — 화면을 오래 가리지 않는다 */
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    show('browser');
  });
  window.addEventListener('appinstalled', function () { close(true) });
  try {
    if (window.matchMedia) {
      var mq = window.matchMedia('(display-mode: standalone)');
      if (mq && mq.addEventListener) mq.addEventListener('change', function (e) { if (e.matches) close(false) });
    }
  } catch (e) {}

  if (isKakao) {
    if (document.readyState === 'complete') setTimeout(function () { show('kakao') }, 300);
    else window.addEventListener('load', function () { setTimeout(function () { show('kakao') }, 300) });
  } else if (isIOS) {
    /* iOS 사파리는 beforeinstallprompt 가 없다 — 공유→홈 화면 추가 안내로 대신한다 */
    setTimeout(function () { if (!deferred) show('ios') }, 2200);
  }

  window.KTS_PWA = { show: show, hide: function () { close(false) }, state: function () { return { name: NAME, start: START, deferred: !!deferred, bar: !!bar, kakao: isKakao, ios: isIOS } } };
})();
