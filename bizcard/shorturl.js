/* ==========================================================================
   KTS 짧은 주소 — autooneclick.com/1, /2, /3 …  (2026-11-28 · 트랙3)
   --------------------------------------------------------------------------
   명함 [내보내기] ② 「짧은 주소」를 누르면
     ① 번호를 하나 받는다 (1, 2, 3 … 차례로)   ← abacus 숫자 카운터
     ② 그 번호 칸에 명함+별표 매물을 담는다       ← Pantry 경량 저장소
     ③ https://autooneclick.com/<번호> 를 돌려준다.
   손님이 그 주소를 열면 404.html 이 같은 번호 칸을 읽어 손님 명함을 그린다.
   · 저장소는 손님에게 보이는 공개 자료(명함·매물)만 담는다. 개인 메모·원가 없음.
   · 저장소가 응답하지 않으면 **없는 주소를 만들지 않고** 실패를 그대로 알린다.
     (그때는 주인 화면이 긴 주소로 보내는 길을 안내한다.)
   --------------------------------------------------------------------------
     KTS_SHORT.build(me, items)   → Promise<payload>
     KTS_SHORT.publish(me, items) → Promise<{ok, n, url} | {ok:false, why, msg}>
     KTS_SHORT.load(n)            → Promise<payload|null>
     KTS_SHORT.url(n)             → 글자 주소
   ========================================================================== */
(function (g) {
  'use strict';

  var CFG = {
    pantry: '603308a5-cffb-4166-999a-40e9600ef37e',          /* KTS 전자명함 저장소 */
    api: 'https://getpantry.cloud/apiv1/pantry/',
    seq: 'https://abacus.jasoncameron.dev/hit/oneclick-kts/bc-seq',
    home: 'https://autooneclick.com',
    basket: 'c',
    maxBytes: 1250000,
    photoMax: 820,
    photoQ: 0.66
  };

  function home() {
    var o = (g.location && g.location.origin) || '';
    return /^https:\/\/(www\.)?autooneclick\.com$/.test(o) ? o : CFG.home;
  }
  function url(n) { return home() + '/' + n; }

  /* 상대 주소(예: img/photo.jpg)는 손님 화면(/)에서 깨진다 — 절대 주소로 바꿔 담는다 */
  function abs(src) {
    var s2 = String(src || '');
    if (!s2 || /^(data:|https?:|blob:)/.test(s2)) return s2;
    try { return new URL(s2, (g.location && g.location.href) || 'https://autooneclick.com/bizcard/').href; } catch (e) { return s2; }
  }

  /* ---------- 사진 줄이기(공개용) ---------- */
  function shrink(src, max, q) {
    return new Promise(function (res) {
      src = abs(src);
      if (!src || String(src).indexOf('data:') !== 0) return res(src || '');
      var im = new Image();
      im.onload = function () {
        try {
          var s = Math.min(1, max / Math.max(im.width, im.height));
          var w = Math.round(im.width * s), h = Math.round(im.height * s);
          var c = document.createElement('canvas');
          c.width = w; c.height = h;
          c.getContext('2d').drawImage(im, 0, 0, w, h);
          res(c.toDataURL('image/jpeg', q));
        } catch (e) { res(src); }
      };
      im.onerror = function () { res(src); };
      im.src = src;
    });
  }

  /* ---------- 4대 공부 — 물건표에 쓰는 만큼만 ---------- */
  function slimGb(gb) {
    if (!gb) return null;
    var out = {
      char: gb.char || null,
      use: ((gb.use || []).slice(0, 8)).map(function (u) { return { nm: u.nm }; }),
      bld: null,
      price: null
    };
    if (gb.bld) {
      out.bld = { st: gb.bld.st, items: (gb.bld.items || []).slice(0, 1) };
    }
    if (gb.price) out.price = { pblntfPclnd: gb.price.pblntfPclnd, stdrYear: gb.price.stdrYear };
    return out;
  }

  function slimMe(me) {
    me = me || {};
    return {
      org: me.org || '', title: me.title || '', name: me.name || '',
      phone: me.phone || '', fax: me.fax || '', email: me.email || '',
      bizAddr: me.bizAddr || '', kakao: me.kakao || '', field: me.field || '',
      strength: me.strength || '', intro: me.intro || '',
      photo: abs(me.photo), stamp: me.stamp || 'circle',
      style: me.style || 'seal', qrKind: me.qrKind || 'url'
    };
  }

  function slimItem(it, photoMax) {
    var photos = (it.photos || []).filter(Boolean).slice(0, photoMax || 2);
    return {
      id: it.id, title: it.title, addr: it.addr, kind: it.kind,
      areaM2: it.areaM2, areaP: it.areaP, price: it.price, dealType: it.dealType,
      deposit: it.deposit, monthly: it.monthly, residual: it.residual,
      loan: it.loan, exchange: it.exchange, appraisal: it.appraisal,
      tags: (it.tags || []).slice(0, 6), demo: it.demo ? 1 : 0, stories: it.story || '',
      lat: it.lat, lon: it.lon, pnu: it.pnu, photos: photos, gb: slimGb(it.gb),
      sections: it.sections || null, tx: (it.tx || []).slice(0, 5), point: it.point || ''
    };
  }

  /* ---------- 담을 것 만들기(사진은 공개용으로 줄여서) ---------- */
  function build(me, items) {
    var list = (items || []);
    var max = CFG.photoMax;
    return Promise.all(list.map(function (it) {
      var ph = (it.photos || []).filter(Boolean).slice(0, 2);
      return Promise.all(ph.map(function (p) { return shrink(p, max, CFG.photoQ); }))
        .then(function (small) {
          var copy = {};
          for (var k in it) copy[k] = it[k];
          copy.photos = small;
          return slimItem(copy, 2);
        });
    })).then(function (arr) {
      return { v: 3, at: Date.now(), me: slimMe(me), items: arr, n: null };
    });
  }

  /* ---------- 번호 받기 ---------- */
  function alloc(tries) {
    tries = tries || 2;
    return fetch(CFG.seq, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('번호 ' + r.status);
      return r.json();
    }).then(function (j) {
      var n = parseInt(j && j.value, 10);
      if (!(n > 0)) throw new Error('번호 없음');
      return n;
    }).catch(function (e) {
      if (tries > 1) return new Promise(function (res) { setTimeout(res, 900) }).then(function () { return alloc(tries - 1); });
      throw e;
    });
  }

  function put(n, payload) {
    return fetch(CFG.api + CFG.pantry + '/basket/' + CFG.basket + n, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) {
      if (!r.ok) throw new Error('저장 ' + r.status);
      return true;
    });
  }

  function publish(me, items) {
    return build(me, items).then(function (payload) {
      var size = 0;
      try { size = JSON.stringify(payload).length; } catch (e) { }
      if (size > CFG.maxBytes) {
        /* 너무 크면 사진을 1장·더 작게 줄여 한 번만 다시 */
        return Promise.all((items || []).map(function (it) {
          var ph = (it.photos || []).filter(Boolean).slice(0, 1);
          return Promise.all(ph.map(function (p) { return shrink(p, 640, 0.6); })).then(function (small) {
            var copy = {}; for (var k in it) copy[k] = it[k];
            copy.photos = small;
            return slimItem(copy, 1);
          });
        })).then(function (arr) {
          payload.items = arr;
          return payload;
        });
      }
      return payload;
    }).then(function (payload) {
      var known = parseInt((me && me.shortNo) || 0, 10);
      var job = known > 0 ? Promise.resolve(known) : alloc();
      return job.then(function (n) {
        payload.n = n;
        var size = 0;
        try { size = JSON.stringify(payload).length; } catch (e) { }
        if (size > 1440000) return { ok: false, why: 'big', msg: '사진이 많아 짧은 주소에 담지 못했습니다 — 사진을 1~2장으로 줄여 주세요' };
        return put(n, payload).then(function () {
          return { ok: true, n: n, url: url(n), bytes: size };
        });
      });
    }).catch(function (e) {
      var msg = String((e && e.message) || e || '');
      return { ok: false, why: /번호/.test(msg) ? 'seq' : 'net', msg: msg };
    });
  }

  /* ---------- 읽기: 이 기기 캐시 먼저, 429(붐비는 중)면 잠깐 쉬었다 다시 ---------- */
  var MEM = {};
  function cacheKey(n) { return 'kts_card_' + n; }
  function cacheGet(n) {
    if (MEM[n] && Date.now() - MEM[n].at < 600000) return MEM[n].p;
    try {
      var v = sessionStorage.getItem(cacheKey(n));
      if (!v) return null;
      var o = JSON.parse(v);
      if (!o || !o.p || Date.now() - o.at > 600000) return null;
      MEM[n] = o; return o.p;
    } catch (e) { return null; }
  }
  function cacheSet(n, p) {
    var o = { at: Date.now(), p: p };
    MEM[n] = o;
    try { sessionStorage.setItem(cacheKey(n), JSON.stringify(o)); } catch (e) { }
  }
  function wait(ms) { return new Promise(function (res) { setTimeout(res, ms) }); }

  function load(n, tries) {
    n = String(n || '').replace(/[^0-9]/g, '');
    if (!n) return Promise.resolve({ ok: false, why: 'miss', p: null });
    var hit = cacheGet(n);
    if (hit) return Promise.resolve({ ok: true, why: 'cache', p: hit });
    if (tries == null) tries = 2;
    return fetch(CFG.api + CFG.pantry + '/basket/' + CFG.basket + n, { cache: 'no-store' })
      .then(function (r) {
        if (r.status === 404) return { ok: false, why: 'miss', p: null };
        if (r.status === 429) {
          if (tries > 0) return wait(1400).then(function () { return load(n, tries - 1) });
          return { ok: false, why: 'busy', p: null };
        }
        if (!r.ok) throw new Error(String(r.status));
        return r.json().then(function (j) {
          if (!j || !j.me) return { ok: false, why: 'miss', p: null };
          delete j._metadata;
          cacheSet(n, j);
          return { ok: true, why: 'net', p: j };
        });
      })
      .catch(function () {
        if (tries > 0) return wait(900).then(function () { return load(n, tries - 1) });
        return { ok: false, why: 'net', p: null };
      });
  }

  g.KTS_SHORT = { build: build, publish: publish, load: load, put: put, url: url, CFG: CFG, home: home };
})(window);
