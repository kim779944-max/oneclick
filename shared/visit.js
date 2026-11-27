/* ============================================================================
   KTS 원클릭 — 방문 카운트 (256번 · 2026-11-27)
   ----------------------------------------------------------------------------
   · 계정·쿠키·개인정보를 만들지 않습니다. 브라우저가 보내는 것은
     '페이지 이름'과 '유입경로 분류(네이버/카카오/구글/직접…)' 두 가지뿐입니다.
   · 집계는 무료·키 없는 카운터(abacus.jasoncameron.dev)에 숫자만 더합니다.
     실패하면 화면에 아무것도 쓰지 않고 조용히 끝납니다(사이트 동작에 영향 0).
   · 보이는 곳: <p data-kts-visit></p> 가 있는 페이지(쇼룸·재개발 등).
   · 대표님 조회:
       전체 페이지 누적  https://abacus.jasoncameron.dev/get/oneclick-kts/p-home
       재개발 누적       https://abacus.jasoncameron.dev/get/oneclick-kts/p-redev
       유입경로(네이버)  https://abacus.jasoncameron.dev/get/oneclick-kts/s-naver
   ========================================================================== */
(function () {
  if (window.__ktsVisit) return;
  window.__ktsVisit = 1;
  var NS = 'oneclick-kts';
  var API = 'https://abacus.jasoncameron.dev';

  function slug() {
    var p = location.pathname || '/';
    p = p.replace(/\/index\.html?$/i, '/').replace(/\.html?$/i, '');
    if (p === '/' || p === '') return 'home';
    return p.replace(/^\/+|\/+$/g, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'home';
  }
  function srcOf() {
    var r = '';
    try { r = document.referrer || ''; } catch (e) { }
    if (!r) return 'direct';
    var h = '';
    try { h = new URL(r).hostname.replace(/^www\./, '').toLowerCase(); } catch (e) { return 'other'; }
    if (h.indexOf('autooneclick.com') >= 0) return 'inside';
    if (h.indexOf('naver') >= 0) return 'naver';
    if (h.indexOf('kakao') >= 0 || h.indexOf('daum') >= 0) return 'kakao';
    if (h.indexOf('google') >= 0) return 'google';
    if (h.indexOf('instagram') >= 0) return 'instagram';
    if (h.indexOf('facebook') >= 0 || h === 'fb.com' || h.indexOf('fb.') === 0) return 'facebook';
    if (h.indexOf('band.') >= 0 || h.indexOf('band.us') >= 0) return 'band';
    if (h.indexOf('tistory') >= 0 || h.indexOf('blog') >= 0) return 'blog';
    if (h.indexOf('youtube') >= 0) return 'youtube';
    return 'other';
  }
  function call(kind, key) {
    if (!window.fetch) return Promise.resolve(null);
    try {
      return fetch(API + '/' + kind + '/' + NS + '/' + encodeURIComponent(key), { cache: 'no-store', credentials: 'omit' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
    } catch (e) { return Promise.resolve(null); }
  }
  function num(o) {
    if (!o) return null;
    var v = (o.value != null ? o.value : o.count);
    v = Number(v);
    return isFinite(v) ? v : null;
  }
  function won(n) { try { return Number(n).toLocaleString('ko-KR'); } catch (e) { return String(n); } }

  var P = 'p-' + slug();
  var S = 's-' + srcOf();
  var d = new Date();
  var ymd = d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2);
  var D = 'd-' + slug() + '-' + ymd;

  var seen = false;
  try { seen = sessionStorage.getItem('kts_visit_' + P) === '1'; } catch (e) { }

  var pTotal, dToday;
  if (seen) {
    pTotal = call('get', P).then(num);
    dToday = call('get', D).then(num);
  } else {
    pTotal = call('hit', P).then(num);
    dToday = call('hit', D).then(num);
    call('hit', S);            /* 유입경로 — 세션당 1회 */
    call('hit', 's-all');      /* 전체 유입 합계 */
    call('hit', 'd-all-' + ymd);
    try { sessionStorage.setItem('kts_visit_' + P, '1'); } catch (e) { }
  }

  Promise.all([pTotal, dToday]).then(function (v) {
    var total = v[0], today = v[1];
    var els = document.querySelectorAll('[data-kts-visit]');
    if (!els.length) return;
    if (total == null && today == null) {
      for (var i = 0; i < els.length; i++) els[i].style.display = 'none';
      return;
    }
    var txt = '이 페이지 누적 ' + (total == null ? '—' : won(total) + '회') +
              (today == null ? '' : ' · 오늘 ' + won(today) + '명');
    for (var j = 0; j < els.length; j++) {
      els[j].textContent = txt + ' 방문';
      els[j].setAttribute('data-kts-visit-on', '1');
    }
  });

  window.KTSVisit = {
    page: P, src: S, day: D,
    get: function (k) { return call('get', k).then(num); },
    hit: function (k) { return call('hit', k).then(num); }
  };
})();
