/* ============================================================================
   KTS 원클릭 — 방문 카운트 (256번 · 267번 보강 2026-11-28)
   ----------------------------------------------------------------------------
   · 계정·쿠키·개인정보를 만들지 않습니다. 브라우저가 보내는 것은
     '페이지 이름'과 '유입경로 분류(네이버/카카오/구글/직접…)' 두 가지뿐입니다.
   · 집계는 무료·키 없는 카운터(abacus.jasoncameron.dev)에 숫자만 더합니다.
     실패하면 화면에 아무것도 쓰지 않고 조용히 끝납니다(사이트 동작에 영향 0).
   · 267번(429 보완): 카운터는 IP당 10초에 30번까지만 받습니다.
     → 모든 요청을 한 줄로 세워 0.34초 간격으로 보내고(초당 ~3회),
       429가 오면 1.5초·3초 쉬었다 다시 보냅니다(최대 2번).
     → 받아 온 값은 90초 동안 이 기기에 담아 두고 그대로 씁니다(같은 화면 왕복 줄임).
     → 한 번 본 페이지는 그 세션에서 다시 세지 않습니다(sessionStorage).
   · 보이는 곳: <p data-kts-visit></p> 가 있는 페이지(쇼룸 푸터 등).
   · 대표님 조회: admin.html [방문자 현황] (앱별 누적·오늘) 또는
       전체 페이지 누적  https://abacus.jasoncameron.dev/get/oneclick-kts/p-home
       오늘 전체        https://abacus.jasoncameron.dev/get/oneclick-kts/d-all-YYYYMMDD
   · 다른 화면에서 쓰는 창구: window.KTSVisit
       .get(key) -> Promise<number|null>   (캐시 먼저, 없으면 요청)
       .hit(key) -> Promise<number|null>
       .pageKey(slug) .dayKey(slug, ymd) .todayKey() .labels
   ========================================================================== */
(function () {
  if (window.__ktsVisit) return;
  window.__ktsVisit = 1;

  var NS = 'oneclick-kts';
  var API = 'https://abacus.jasoncameron.dev';
  var GAP = 600;              /* 요청 사이 최소 간격(ms) — 10초에 16번(제한 30번) 안쪽 */
  var TTL = 90000;            /* 받아 온 값 보관(ms) */
  var KEY_CACHE = 'kts_v1_';

  /* ---------- 한 줄 대기열: 동시에 1개, 간격 GAP ---------- */
  var Q = [], busy = false, lastAt = 0;
  function pump() {
    if (busy || !Q.length) return;
    var job = Q.shift();
    busy = true;
    var wait = Math.max(0, GAP - (Date.now() - lastAt));
    setTimeout(function () {
      lastAt = Date.now();
      send(job);
    }, wait);
  }
  function send(job) {
    var url = API + '/' + job.kind + '/' + NS + '/' + encodeURIComponent(job.key);
    var done = function (val, retryAfter) {
      busy = false;
      if (val === 'RETRY' && (job.tries = (job.tries || 0) + 1) <= 2) {
        lastAt = Date.now() + (retryAfter || 1500 * job.tries) - GAP;   /* 쉬었다 다시 */
        Q.unshift(job);
      } else {
        job.resolve(val === 'RETRY' ? null : val);
      }
      pump();
    };
    if (!window.fetch) { busy = false; job.resolve(null); return pump(); }
    try {
      fetch(url, { cache: 'no-store', credentials: 'omit' })
        .then(function (r) {
          if (r.status === 429) {
            var ra = 0;
            try { ra = Number(r.headers.get('ratelimit-reset')) * 1000 - Date.now(); } catch (e) { ra = 0; }
            return done('RETRY', ra > 0 && ra < 6000 ? ra + 250 : 0);
          }
          if (r.status === 404) return done(0);     /* 아직 한 번도 안 센 페이지 = 0 */
          if (!r.ok) return done(null);
          return r.json().then(function (o) { done(num(o)); }, function () { done(null); });
        })
        .catch(function () { done(null); });
    } catch (e) { busy = false; job.resolve(null); pump(); }
  }
  function req(kind, key) {
    return new Promise(function (resolve) {
      Q.push({ kind: kind, key: key, resolve: resolve, tries: 0 });
      pump();
    });
  }
  function num(o) {
    if (!o) return null;
    var v = (o.value != null ? o.value : o.count);
    v = Number(v);
    return isFinite(v) ? v : null;
  }

  /* ---------- 값 캐시(90초) — 같은 화면을 오갈 때 요청을 줄인다 ---------- */
  function cacheGet(kind, key) {
    try {
      var raw = localStorage.getItem(KEY_CACHE + kind + '_' + key);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || (Date.now() - (o.t || 0)) > TTL) return null;
      return (typeof o.v === 'number') ? o.v : null;
    } catch (e) { return null; }
  }
  function cachePut(kind, key, v) {
    try { localStorage.setItem(KEY_CACHE + kind + '_' + key, JSON.stringify({ v: v, t: Date.now() })); } catch (e) { }
  }
  function get(key) {
    var c = cacheGet('get', key);
    if (c != null) return Promise.resolve(c);
    return req('get', key).then(function (v) { if (v != null) cachePut('get', key, v); return v; });
  }
  function hit(key) { return req('hit', key).then(function (v) { if (v != null) cachePut('get', key, v); return v; }); }

  /* ---------- 지금 페이지 ---------- */
  function slugOf(p) {
    p = String(p || '/').replace(/\/index\.html?$/i, '/').replace(/\.html?$/i, '');
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
  function ymd(d) { d = d || new Date(); return d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2); }
  function pageKey(slug) { return 'p-' + slug; }
  function dayKey(slug, day) { return 'd-' + slug + '-' + (day || ymd()); }
  function todayKey() { return 'd-all-' + ymd(); }
  function won(n) { try { return Number(n).toLocaleString('ko-KR'); } catch (e) { return String(n); } }

  var P = 'p-' + slugOf(location.pathname);
  var S = 's-' + srcOf();
  var D = 'd-' + slugOf(location.pathname) + '-' + ymd();

  var seen = false;
  try { seen = sessionStorage.getItem('kts_visit_' + P) === '1'; } catch (e) { }

  var pTotal, dToday;
  if (seen) {
    pTotal = get(P);
    dToday = get(D);
  } else {
    pTotal = hit(P);
    dToday = hit(D);
    hit(S);                            /* 유입경로 — 세션당 1회 */
    if (slugOf(location.pathname) === 'home') {
      hit('s-all');                    /* 전체 유입 합계 */
      hit(todayKey());                 /* 오늘 전체 — admin 현황판 머리줄 */
    }
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
      (today == null ? '' : ' · 오늘 ' + won(today) + '회');
    for (var j = 0; j < els.length; j++) {
      els[j].textContent = txt;
      els[j].setAttribute('data-kts-visit-on', '1');
    }
  });

  /* 앱 이름 — admin 현황판이 그대로 씁니다(새 앱이 생기면 여기만 고치면 됨) */
  var LABELS = [
    ['home', '쇼룸 홈'], ['land', '1호 통합'], ['area', '면적그리기'], ['slope', '경사도·토지정보'], ['gongbu', '4대 공부'],
    ['contract', '5초 계약서'], ['theform', '양식만들기'], ['sign', '더싸인'], ['viewer', '더뷰'],
    ['bizcard', '전자명함·매물장'], ['listing', '매물장·포스터'], ['realty', '매물수집기'], ['exchange', '교환급매물'],
    ['hogang', '경공매 내비'], ['redev', '재개발 조회'], ['loan', '사업자 대출'],
    ['thedetail', '설명서 제작기'], ['sale', '오늘의 특가'], ['gagebu', '가계부'], ['interior', '인테리어'],
    ['thescan', '더스캔'], ['theeraser', '더지우개'], ['seller', '원클릭 셀러'],
    ['organizer', '폰정리'], ['saycap', '세이캡'], ['navi2', '독심술'], ['thetongyeok', '더통역']
  ];

  window.KTSVisit = {
    page: P, src: S, day: D,
    slugOf: slugOf, pageKey: pageKey, dayKey: dayKey, todayKey: todayKey, ymd: ymd,
    get: get, hit: hit, labels: LABELS,
    /* admin 현황판 — 앱 하나씩 차례로(대기열이 간격을 지켜 줍니다) */
    stats: function (slug, day, onEach) {
      var out = { slug: slug, total: null, today: null };
      return get(pageKey(slug)).then(function (v) {
        out.total = v;
        if (onEach) onEach(out);
        if (v === 0) { out.today = 0; if (onEach) onEach(out); return out; }   /* 누적 0 = 오늘도 0, 한 번 더 묻지 않는다 */
        return get(dayKey(slug, day)).then(function (d) { out.today = d; if (onEach) onEach(out); return out; });
      });
    }
  };
})();
