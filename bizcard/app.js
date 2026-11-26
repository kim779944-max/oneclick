/* ==========================================================================
   KTS 전자명함 · 매물장 — 화면과 동작
   위 → 아래 4단 : ① 명함 ② 대표매물 ③ 전체 매물 + 문자 5초 ④ 상세 + AI 비서
   ========================================================================== */
(function (g) {
  'use strict';

  var K = { me: 'kts_bc_me', items: 'kts_bc_items', plan: 'kts_bc_plan', seen: 'kts_bc_seen',
            inq: 'kts_bc_inq', tip: 'kts_bc_tip', kb: 'kts_bc_kakaobar' };

  /* ---------------- 기본 도구 ---------------- */
  var $ = function (s, r) { return (r || document).querySelector(s) };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)) };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function num(n, d) {
    if (n == null || n === '' || !isFinite(+n)) return '—';
    return (+n).toLocaleString('ko-KR', { maximumFractionDigits: d == null ? 0 : d });
  }
  function money(v) {
    if (!v) return '가격 미정';
    var eok = Math.floor(v / 1e8), man = Math.round((v % 1e8) / 1e4);
    if (eok && man) return eok + '억 ' + man.toLocaleString('ko-KR') + '만';
    if (eok) return eok + '억';
    if (man >= 1) return man.toLocaleString('ko-KR') + '만';
    return num(v) + '원';
  }
  function ago(ts) {
    var d = Math.floor((Date.now() - ts) / 86400000);
    if (d <= 0) return '오늘';
    if (d === 1) return '어제';
    if (d < 7) return d + '일 전';
    var dt = new Date(ts);
    return (dt.getMonth() + 1) + '/' + dt.getDate();
  }
  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v) } catch (e) { return d } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) { } }
  };

  var S = { me: LS.get(K.me, null), items: LS.get(K.items, null), plan: LS.get(K.plan, 'free') };
  var saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      LS.set(K.me, S.me); LS.set(K.items, S.items); LS.set(K.plan, S.plan);
    }, 120);
  }

  /* ---------------- 아이콘 ---------------- */
  var IC = {
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6.6 3h2.2l1.6 4-2 1.4a11.5 11.5 0 0 0 5.2 5.2l1.4-2 4 1.6v2.2A2.6 2.6 0 0 1 16.4 18C9.6 17.6 4.4 12.4 4 5.6A2.6 2.6 0 0 1 6.6 3z"/></svg>',
    sms: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5a8 8 0 0 1 8 8 8 8 0 0 1-8 8H4l1.8-3.4A8 8 0 0 1 12 3.5z"/><circle cx="9" cy="11.5" r=".9" fill="currentColor"/><circle cx="12" cy="11.5" r=".9" fill="currentColor"/><circle cx="15" cy="11.5" r=".9" fill="currentColor"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10.5 12 4l8 6.5V20h-5v-6H9v6H4z"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4.5" cy="6" r="1.2" fill="currentColor"/><circle cx="4.5" cy="12" r="1.2" fill="currentColor"/><circle cx="4.5" cy="18" r="1.2" fill="currentColor"/></svg>',
    won: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l2.8 12L12 8l5.2 10L20 6"/><path d="M6 11h12M6 14h12"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="m12 3.6 2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z"/></svg>',
    starOn: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 3.6 2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3.2l1.9 4.6 4.6 1.9-4.6 1.9L12 16.2l-1.9-4.6L5.5 9.7l4.6-1.9z"/><path d="M18.5 15.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11"/><path d="m8 8 4-4 4 4"/><path d="M5 13v6h14v-6"/></svg>',
    install: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v10"/><path d="m8 10 4 4 4-4"/><path d="M4 18h16"/></svg>',
    map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z"/><path d="M9 4v13.5M15 6.5V20"/></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h6"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2.5h-15z"/><path d="M10 21h4"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 6V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h1"/></svg>'
  };

  /* ---------------- 예시 매물 (처음 둘러보기용 · '예시' 표시) ---------------- */
  var DEMO = [
    { kind: '임야', addr: '경기도 가평군 북면 목동리 271', areaM2: 3967, areaP: 1200, price: 380000000,
      tags: ['보전관리', '전원주택지', '경사지'], title: '임야 1,200평 · 북면', days: 1,
      raw: '[한빛부동산] 가평 북면 목동리 271 임야 3,967㎡(1,200평) 매매 3억8천 보전관리 전원주택지 010-2345-6789' },
    { kind: '대지', addr: '경기도 가평군 조종면 신하리 162-9', areaM2: 991, areaP: 300, price: 520000000,
      tags: ['도로접', '평지', '전원주택지'], title: '대지 300평 · 조종면', days: 3,
      raw: '[한빛부동산] 가평 조종면 신하리 162-9 대지 991㎡(300평) 매매 5억2천 도로접 평지 010-2345-6789' },
    { kind: '답', addr: '충남 당진시 석문면 초락도리 204-1', areaM2: 6612, areaP: 2000, price: 400000000,
      tags: ['도로접', '평지', '농지'], title: '답 2,000평 · 석문면', days: 6,
      raw: '[한빛부동산] 당진 석문면 초락도리 204-1 답 6,612㎡(2,000평) 매매 4억 도로접 농지 010-2345-6789' }
  ];

  function seedDemo() {
    if (S.items !== null) return;
    S.items = DEMO.map(function (d, i) {
      var it = baseItem({
        kind: d.kind, title: d.title, addr: d.addr, areaM2: d.areaM2, areaP: d.areaP,
        price: d.price, tags: d.tags, phone: '010-2345-6789', raw: d.raw
      });
      it.demo = 1;
      it.starred = i === 0;
      it.createdAt = Date.now() - d.days * 86400000 - 3600000;
      return it;
    });
    save();
  }

  /* ---------------- 매물 ---------------- */
  function baseItem(p) {
    return {
      id: 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      createdAt: Date.now(), starred: false, demo: 0,
      kind: p.kind || '', title: p.title || '', addr: p.addr || '',
      areaM2: p.areaM2 || null, areaP: p.areaP || null,
      price: p.price || null, dealType: p.dealType || '매매',
      deposit: p.deposit || null, monthly: p.monthly || null,
      tags: p.tags || [], phone: p.phone || '', raw: p.raw || '', note: '',
      photos: [], lat: null, lon: null, pnu: '', gb: null, gbSt: 'none'
    };
  }

  var geoQ = {}, fullQ = {};

  /* 지도·지번만 (목록 썸네일용 — 요청을 아끼려고 좌표만 받는다) */
  function ensureGeo(it) {
    if (!it || !it.addr || (it.lat && it.lon) || geoQ[it.id] || !g.KTS_GB) return;
    geoQ[it.id] = 1;
    g.KTS_GB.geo(it.addr).then(function (r) {
      delete geoQ[it.id];
      if (r.st === 'OK') {
        it.lat = r.lat; it.lon = r.lon; it.geoSt = 'ok';
        if (r.pnu) it.pnu = r.pnu;
        if (r.jibun) it.jibun = it.jibun || r.jibun;
      } else it.geoSt = r.st;
      save(); render();
    }).catch(function () { delete geoQ[it.id]; it.geoSt = 'err'; render(); });
  }

  /* 4대 공부까지 (상세를 열었을 때만) */
  function ensureFull(it) {
    if (!it) return;
    if (!it.addr) { it.gbSt = 'noaddr'; return; }
    if (it.gb || fullQ[it.id] || !g.KTS_GB) return;
    fullQ[it.id] = 1;
    it.gbSt = 'loading';
    render();
    g.KTS_GB.lookup(it.addr, (it.lat && it.lon) ? { lat: it.lat, lon: it.lon } : null).then(function (r) {
      delete fullQ[it.id];
      it.gb = r; it.gbSt = (r.st === 'OK') ? 'ok' : r.st;
      if (r.lat) { it.lat = r.lat; it.lon = r.lon; }
      if (r.pnu) it.pnu = r.pnu;
      if (r.jibun) it.jibun = it.jibun || r.jibun;
      if (!it.areaM2) {
        var a = +(r.char && r.char.lndpclAr || r.toji && r.toji.lndpclAr);
        if (a > 0) { it.areaM2 = a; it.areaP = Math.round(a / 3.305785); }
      }
      save(); render();
    }).catch(function () {
      delete fullQ[it.id]; it.gbSt = 'err'; save(); render();
    });
  }

  function mapOf(it, w, h) {
    if (it.lat && it.lon && g.KTS_GB) return g.KTS_GB.mapUrl(it.lat, it.lon, w || 800, h || 520, 16);
    return '';
  }
  function thumb(it) {
    if (it.photos && it.photos.length) return '<img src="' + it.photos[0] + '" alt="">';
    var m = mapOf(it, 420, 300);
    if (m) return '<img src="' + m + '" alt="지적항공도" loading="lazy">';
    return '<span class="ph">' + esc((it.kind || '매물').slice(0, 2)) + '</span>';
  }

  function pyPrice(it) {
    if (!it.price || !it.areaP) return null;
    return Math.round(it.price / it.areaP);
  }

  /* ---------------- 라우터 ---------------- */
  var route = { name: 'card', id: null }, lastKey = '';
  function go(h) { if (location.hash === h) render(); else location.hash = h; }

  function parseHash() {
    var h = (location.hash || '#/card').replace(/^#\/?/, '');
    var p = h.split('/');
    if (p[0] === 'item' && p[1]) return { name: 'detail', id: p[1] };
    if (['card', 'list', 'new', 'price', 'setup'].indexOf(p[0]) >= 0) return { name: p[0], id: null };
    return { name: 'card', id: null };
  }

  function render() {
    route = parseHash();
    $$('.view').forEach(function (v) { v.classList.remove('on') });
    var v = $('#v-' + route.name);
    if (v) v.classList.add('on');

    if (route.name === 'card') viewCard();
    else if (route.name === 'list') viewList();
    else if (route.name === 'new') viewNew();
    else if (route.name === 'detail') viewDetail(route.id);
    else if (route.name === 'price') viewPrice();
    else if (route.name === 'setup') viewSetup();

    $$('#bnav a').forEach(function (a) {
      var t = a.getAttribute('data-t');
      a.classList.toggle('on', t === route.name || (t === 'list' && route.name === 'detail'));
    });
    var key = route.name + ':' + (route.id || '');
    if (key !== lastKey) { window.scrollTo(0, 0); lastKey = key; }
    updateBadge();
  }

  /* ---------------- ① 명함 ---------------- */
  var installPrompt = null, installed = false;

  function viewCard() {
    if (!S.me) { go('#/setup'); return; }
    var me = S.me;
    var starred = S.items.filter(function (x) { return x.starred }).slice(0, 8);
    var list = starred.length ? starred.slice(0, 4) : [];
    if (list.length < 3) {
      S.items.slice().sort(function (a, b) { return b.createdAt - a.createdAt }).forEach(function (x) {
        if (list.length < 3 && list.indexOf(x) < 0) list.push(x);
      });
    }
    var unread = unreadCount();

    var h = '';
    h += '<div class="biz">';
    h += '<div class="biz-top">';
    h += '<div class="av">' + (me.photo ? '<img src="' + me.photo + '" alt="">' : esc((me.name || '?').slice(0, 1))) + '</div>';
    h += '<div class="who"><b>' + esc(me.name || '이름') + '</b><span>' + esc([me.org, me.title].filter(Boolean).join(' · ') || '전자명함') + '</span></div>';
    h += '<button class="bell' + (unread ? ' on' : '') + '" id="btnInbox" aria-label="문의함">' + IC.bell + (unread ? '<i>' + unread + '</i>' : '') + '</button>';
    h += '</div>';
    if (me.intro) h += '<p class="intro"><em>“</em>' + esc(me.intro) + '</p>';
    h += '<div class="biz-line"></div>';

    h += '<div class="acts3">';
    h += '<a class="act" href="tel:' + esc((me.phone || '').replace(/[^0-9+]/g, '')) + '"><u>' + IC.phone + '</u><span>전화</span></a>';
    h += '<a class="act" href="sms:' + esc((me.phone || '').replace(/[^0-9+]/g, '')) + '"><u>' + IC.sms + '</u><span>문자</span></a>';
    h += '<a class="act" href="#" id="btnKakao"><u>' + IC.chat + '</u><span>카톡</span></a>';
    h += '</div>';

    h += '<button class="install" id="btnInstall">' + IC.install + '<b>바탕화면 아이콘 추가</b><em>누르면 폰 화면에 바로가기가 생깁니다</em></button>';
    h += '<div class="biz-foot"><span class="wm">KTS <i>전자명함</i></span>'
      + '<button class="lnk" id="btnShare">' + IC.share + ' 보내기</button>'
      + '<button class="lnk" id="btnEdit">고치기</button></div>';
    h += '</div>';

    /* ② 대표매물 */
    h += '<div class="sec-h"><b>새 물건표</b><span>' + (starred.length ? '별표 ' + starred.length + '건' : '최근 매물') + '</span></div>';
    if (list.length) {
      h += '<div class="rail">';
      list.forEach(function (it) {
        h += '<a class="rcard" href="#/item/' + it.id + '">'
          + '<div class="rth">' + thumb(it) + (it.demo ? '<i class="dm">예시</i>' : '') + (ago(it.createdAt) === '오늘' ? '<i class="new">NEW</i>' : '') + '</div>'
          + '<b>' + esc(it.title || '매물') + '</b>'
          + '<span class="pr">' + esc(it.dealType !== '매매' && it.deposit ? '보증 ' + money(it.deposit) : money(it.price)) + '</span>'
          + '<span class="ar">' + (it.areaP ? num(it.areaP) + '평' : '면적 미정') + '</span>'
          + '</a>';
      });
      h += '</div>';
    } else {
      h += '<div class="empty">아직 매물이 없습니다. 받은 문자를 붙여넣으면 바로 생깁니다.</div>';
    }

    h += '<a class="wide" href="#/list"><b>매물 전체 보기</b><span>' + S.items.length + '건 →</span></a>';
    h += '<p class="tiny">문자 → 매물장 → 전자명함 · KTS 원클릭</p>';

    $('#v-card').innerHTML = h;

    $('#btnInbox').addEventListener('click', openInbox);
    $('#btnShare').addEventListener('click', shareCard);
    $('#btnEdit').addEventListener('click', function () { go('#/setup'); });
    $('#btnInstall').addEventListener('click', doInstall);
    $('#btnKakao').addEventListener('click', function (e) { e.preventDefault(); openKakao(); });

    LS.set(K.seen, Date.now());
    updateBadge();
    if (installed) $('#btnInstall').classList.add('done');
    list.forEach(ensureGeo);
  }

  function shareCard() {
    var me = S.me || {};
    var url = location.origin + location.pathname + '#/card';
    var text = (me.name || '') + (me.org ? ' · ' + me.org : '') + ' 전자명함\n' + url;
    if (navigator.share) {
      navigator.share({ title: (me.name || 'KTS') + ' 전자명함', text: text, url: url }).catch(function () { });
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function () { toast('명함 주소를 복사했습니다'); });
    } else toast(url);
  }

  function openKakao() {
    var me = S.me || {};
    if (me.kakao && /^https?:/.test(me.kakao)) { window.open(me.kakao, '_blank'); return; }
    if (me.kakao) {
      if (navigator.clipboard) navigator.clipboard.writeText(me.kakao).then(function () { toast('카톡 ID 「' + me.kakao + '」 복사 — 카톡에서 붙여넣으세요'); });
      else toast('카톡 ID: ' + me.kakao);
      return;
    }
    toast('명함 고치기에서 카톡 ID나 오픈채팅 주소를 넣어 두세요');
  }

  /* ---------------- ③ 매물장 ---------------- */
  var filter = '전체';
  function viewList() {
    var h = '';
    h += '<div class="page-h"><b>내 매물장</b><span>' + S.items.length + '건</span></div>';
    h += '<button class="paste" id="btnPaste">' + IC.plus + '<b>문자 붙여넣기 → 5초 매물장</b><em>받은 매물 문자를 그대로 넣으면 물건표가 됩니다</em></button>';

    if (S.items.some(function (x) { return x.demo }) && !LS.get(K.tip, {}).demo) {
      h += '<div class="bubble" id="tipDemo"><b>예시 매물 3건</b>으로 모양을 보여 드립니다. 문자를 넣으면 내 매물로 바뀝니다.<button id="tipDemoX">예시 지우기</button></div>';
    }

    h += '<div class="chips" id="filter">';
    ['전체', '토지', '건물', '상가', '급매'].forEach(function (f) {
      h += '<button class="chip' + (f === filter ? ' on' : '') + '" data-f="' + f + '">' + f + '</button>';
    });
    h += '</div>';

    var items = S.items.slice().sort(function (a, b) {
      if (!!b.starred !== !!a.starred) return (b.starred ? 1 : 0) - (a.starred ? 1 : 0);
      return b.createdAt - a.createdAt;
    }).filter(fMatch);

    if (!items.length) h += '<div class="empty">이 분류에 매물이 없습니다.</div>';

    items.forEach(function (it) {
      h += '<div class="row" data-id="' + it.id + '">'
        + '<a class="rth" href="#/item/' + it.id + '">' + thumb(it) + (it.demo ? '<i class="dm">예시</i>' : '') + '</a>'
        + '<a class="rbd" href="#/item/' + it.id + '">'
        + '<b>' + esc(it.title || '매물') + '</b>'
        + '<span class="pr">' + esc(it.dealType !== '매매' && it.deposit ? '보증 ' + money(it.deposit) + (it.monthly ? ' / 월 ' + money(it.monthly) : '') : money(it.price))
        + (pyPrice(it) ? ' <i>평당 ' + money(pyPrice(it)) + '</i>' : '') + '</span>'
        + '<span class="sub">' + (it.areaP ? num(it.areaP) + '평' : '면적 미정') + ' · ' + esc(it.addr || '소재지 미정') + '</span>'
        + '</a>'
        + '<button class="star' + (it.starred ? ' on' : '') + '" data-star="' + it.id + '" aria-label="별표">' + (it.starred ? IC.starOn : IC.star) + '</button>'
        + '</div>';
    });

    h += '<p class="tiny">★ 별표를 누르면 명함 맨 위「새 물건표」로 올라갑니다.</p>';
    $('#v-list').innerHTML = h;
    items.slice(0, 12).forEach(ensureGeo);

    $('#btnPaste').addEventListener('click', function () { go('#/new'); });
    $$('#filter .chip').forEach(function (b) {
      b.addEventListener('click', function () { filter = b.getAttribute('data-f'); viewList(); });
    });
    $$('[data-star]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        var it = byId(b.getAttribute('data-star'));
        if (!it) return;
        it.starred = !it.starred; save();
        toast(it.starred ? '명함 맨 위「새 물건표」에 올렸습니다' : '별표를 뺐습니다');
        viewList();
      });
    });
    var td = $('#tipDemo');
    if (td) $('#tipDemoX').addEventListener('click', function () {
      S.items = S.items.filter(function (x) { return !x.demo }); save();
      var t = LS.get(K.tip, {}); t.demo = 1; LS.set(K.tip, t);
      viewList();
    });
  }

  function fMatch(it) {
    if (filter === '전체') return true;
    if (filter === '급매') return (it.tags || []).indexOf('급매') >= 0;
    if (filter === '토지') return ['임야', '답', '농지', '대지', '토지', '과수원', '야적장'].indexOf(it.kind) >= 0;
    if (filter === '건물') return ['주택', '빌라', '아파트', '오피스텔', '공장', '창고'].indexOf(it.kind) >= 0;
    if (filter === '상가') return ['상가'].indexOf(it.kind) >= 0;
    return true;
  }

  function byId(id) {
    for (var i = 0; i < S.items.length; i++) if (S.items[i].id === id) return S.items[i];
    return null;
  }

  /* ---------------- ④ 문자 → 5초 ---------------- */
  var pending = null;
  function viewNew() {
    if (pending) { viewNewPreview(); return; }
    var h = '';
    h += '<div class="page-h"><b>문자 넣기</b><span>5초</span></div>';
    h += '<div class="step"><i>1</i><b>받은 매물 문자를 그대로 붙여넣으세요</b></div>';
    h += '<textarea id="raw" class="ta" placeholder="예)&#10;[한빛부동산] 가평 북면 목동리 271 임야 1,200평 매매 3억8천 보전관리 010-2345-6789"></textarea>';
    h += '<div class="ta-row"><button class="btn sm" id="btnClip">' + IC.copy + ' 붙여넣기</button><button class="btn sm" id="btnClear">지우기</button></div>';
    h += '<button class="big" id="btnParse">5초 만에 매물장 만들기</button>';
    h += '<p class="tiny">소재지는 4대 공부(토지·건축물·지적·이용계획)까지 자동으로 붙습니다.</p>';
    $('#v-new').innerHTML = h;

    $('#btnClip').addEventListener('click', function () {
      if (!navigator.clipboard || !navigator.clipboard.readText) { toast('붙여넣기 칸을 길게 눌러 붙여넣어 주세요'); return; }
      navigator.clipboard.readText().then(function (t) {
        $('#raw').value = t || ''; toast('붙여넣었습니다'); doParse();
      }).catch(function () { toast('붙여넣기 칸을 길게 눌러 붙여넣어 주세요'); });
    });
    $('#btnClear').addEventListener('click', function () { $('#raw').value = ''; });
    $('#btnParse').addEventListener('click', doParse);
  }

  function doParse() {
    var raw = ($('#raw') && $('#raw').value || '').trim();
    if (!raw) { toast('문자를 먼저 붙여넣어 주세요'); return; }
    if (!g.KTS_PARSE) { toast('잠시 후 다시 시도해 주세요'); return; }
    pending = g.KTS_PARSE.parse(raw);
    viewNewPreview();
  }

  function tableRows(p) {
    var rows = [
      ['종류', p.kind || '—'],
      ['소재지', p.addr || '—'],
      ['면적', p.areaM2 ? num(p.areaM2, 1) + '㎡ (' + num(p.areaP) + '평)' : '—'],
      ['가격', p.dealType !== '매매' && p.deposit ? '보증금 ' + money(p.deposit) + (p.monthly ? ' / 월 ' + money(p.monthly) : '') : money(p.price)],
      ['특징', (p.tags || []).join(' ') || '—'],
      ['연락처', p.phone || '—']
    ];
    return rows.map(function (r) {
      return '<tr><th>' + r[0] + '</th><td>' + esc(r[1]) + '</td></tr>';
    }).join('');
  }

  function viewNewPreview() {
    var p = pending;
    var h = '';
    h += '<div class="page-h"><b>물건표 완성</b><span>' + ((p.missing && p.missing.length) ? p.missing.join('·') + ' 확인' : '모두 채움') + '</span></div>';
    h += '<div class="obj-table"><div class="ot-h">물 건 표</div><table>' + tableRows(p) + '</table></div>';
    if (p.missing && p.missing.length) {
      h += '<p class="warnline">문자에 ' + p.missing.join('·') + '이(가) 없습니다. 담은 뒤 매물 상세에서 고칠 수 있습니다.</p>';
    }
    h += '<button class="big" id="btnSave">매물장에 담기</button>';
    h += '<button class="btn ghost wide2" id="btnAgain">다시 넣기</button>';
    $('#v-new').innerHTML = h;
    $('#btnSave').addEventListener('click', function () {
      var it = baseItem(p);
      it.starred = S.items.filter(function (x) { return !x.demo }).length < 3;
      S.items.push(it); save();
      pending = null;
      toast('매물장에 담았습니다');
      setTimeout(function () { go('#/item/' + it.id); }, 220);
    });
    $('#btnAgain').addEventListener('click', function () { pending = null; viewNew(); });
  }

  /* ---------------- ④ 상세 ---------------- */
  var ZONE = {
    '제1종전용주거지역': [50, 100], '제2종전용주거지역': [50, 150], '제1종일반주거지역': [60, 150],
    '제2종일반주거지역': [60, 200], '제3종일반주거지역': [50, 300], '준주거지역': [70, 400],
    '중심상업지역': [90, 1000], '일반상업지역': [80, 800], '근린상업지역': [70, 600], '유통상업지역': [80, 700],
    '전용공업지역': [70, 300], '일반공업지역': [70, 350], '준공업지역': [70, 400],
    '보전녹지지역': [20, 80], '생산녹지지역': [20, 100], '자연녹지지역': [20, 100],
    '보전관리지역': [20, 80], '생산관리지역': [20, 80], '계획관리지역': [40, 100],
    '농림지역': [20, 80], '자연환경보전지역': [20, 80]
  };

  function useNames(gb) {
    return ((gb && gb.use) || []).map(function (u) { return u.nm }).filter(Boolean);
  }
  function zoneName(gb) {
    var list = useNames(gb);
    for (var i = 0; i < list.length; i++) if (/지역$/.test(list[i]) && ZONE[list[i]]) return list[i];
    for (var j = 0; j < list.length; j++) if (/지역$/.test(list[j])) return list[j];
    return (gb && gb.char && gb.char.prposArea1Nm) || '';
  }
  function jigaPerM2(gb) {
    if (!gb) return null;
    if (gb.price && +gb.price.pblntfPclnd) return +gb.price.pblntfPclnd;
    if (gb.char && +gb.char.pblntfPclnd) return +gb.char.pblntfPclnd;
    if (gb.jiga) return +gb.jiga;
    return null;
  }

  function viewDetail(id) {
    var it = byId(id);
    if (!it) { go('#/list'); return; }
    ensureFull(it);

    var gb = it.gb || {};
    var jiga = jigaPerM2(gb);
    var zone = zoneName(gb);

    var h = '';
    h += '<div class="dhead"><button class="icob" id="btnBack">' + IC.back + '</button>'
      + '<b>매물 상세</b><span class="sp"></span>'
      + '<button class="icob" id="btnShareItem">' + IC.share + '</button></div>';

    /* 대표 사진 */
    h += '<div class="hero" id="hero">';
    if (it.photos && it.photos.length) {
      h += '<img src="' + it.photos[0] + '" alt="">';
      if (it.photos.length > 1) {
        h += '<div class="thumbs">' + it.photos.slice(1, 4).map(function (p) { return '<img src="' + p + '" alt="">'; }).join('') + '</div>';
      }
    } else {
      var m = mapOf(it, 800, 520);
      h += m ? '<img src="' + m + '" alt="지적항공도">' : '<div class="noimg">' + IC.map + '<span>지적항공도 준비 중</span></div>';
      h += '<i class="tagmap">지적항공도 · 자동</i>';
    }
    h += '<button class="photo-add" id="btnPhoto">' + IC.plus + ' 사진</button>';
    h += '</div>';

    /* 제목·값 */
    h += '<div class="dtitle"><b>' + esc(it.title || '매물') + '</b>'
      + '<button class="star big' + (it.starred ? ' on' : '') + '" id="btnStar">' + (it.starred ? IC.starOn : IC.star) + '</button></div>';
    h += '<div class="kpis">'
      + '<div class="kpi"><span>매매가</span><b>' + esc(it.dealType !== '매매' && it.deposit ? '보증 ' + money(it.deposit) : money(it.price)) + '</b></div>'
      + '<div class="kpi"><span>면적</span><b>' + (it.areaP ? num(it.areaP) + '평' : '미정') + '</b><em>' + (it.areaM2 ? num(it.areaM2, 1) + '㎡' : '') + '</em></div>'
      + '<div class="kpi"><span>평당</span><b>' + (pyPrice(it) ? money(pyPrice(it)) : '—') + '</b></div>'
      + '</div>';
    if (it.addr) h += '<div class="addr">' + IC.map + '<span>' + esc(it.addr) + (it.jibun ? ' (' + esc(it.jibun) + ')' : '') + '</span><button class="lnk sm" id="btnCopyAddr">복사</button></div>';
    if (it.tags && it.tags.length) h += '<div class="tags">' + it.tags.map(function (t) { return '<i>' + esc(t) + '</i>' }).join('') + '</div>';

    /* 4대 공부 */
    h += '<div class="sec-h"><b>4대 공부</b><span>' + gbLabel(it) + '</span></div>';
    h += '<div class="gongbu">' + gongbuTiles(it, gb, jiga, zone) + '</div>';
    h += '<a class="wide ghost" href="../gongbu/?q=' + encodeURIComponent(it.addr || '') + '" target="_blank" rel="noopener">4대 공부 원문 · PDF/이미지 저장 ' + IC.doc + '</a>';
    h += '<p class="credit">지도·지적 © 브이월드(Vworld) · 건축물대장 © 국토교통부 건축HUB</p>';
    if (it.gbSt === 'err' || it.gbSt === 'NOT_FOUND') {
      h += '<button class="btn ghost wide2" id="btnRetry">4대 공부 다시 불러오기</button>';
    }

    /* 자동 정리 */
    h += '<div class="sec-h"><b>자동 정리</b><span>조회값 기준</span></div>';
    h += autoBlocks(it, gb, jiga, zone);

    h += '<div class="ai-cta"><button class="big" id="btnAI">' + IC.spark + ' AI 영업 비서에게 물어보기</button>'
      + '<p class="tiny">관심 조건 조사 · 비슷한 물건 추천 · 요구 전달까지</p></div>';

    $('#v-detail').innerHTML = h;

    $('#btnBack').addEventListener('click', function () { history.length > 1 ? history.back() : go('#/list'); });
    $('#btnShareItem').addEventListener('click', function () { shareItem(it); });
    $('#btnStar').addEventListener('click', function () {
      it.starred = !it.starred; save(); toast(it.starred ? '명함 맨 위「새 물건표」에 올렸습니다' : '별표를 뺐습니다'); viewDetail(it.id);
    });
    $('#btnAI').addEventListener('click', function () { openAI(it); });
    $('#btnPhoto').addEventListener('click', function () { pickPhoto(it); });
    var ca = $('#btnCopyAddr');
    if (ca) ca.addEventListener('click', function () {
      if (navigator.clipboard) navigator.clipboard.writeText(it.addr).then(function () { toast('주소를 복사했습니다'); });
      else toast(it.addr);
    });
    var rt = $('#btnRetry');
    if (rt) rt.addEventListener('click', function () { it.gb = null; it.gbSt = 'none'; delete fullQ[it.id]; ensureFull(it); });
  }

  function gbLabel(it) {
    if (it.gbSt === 'loading') return '<i class="dot wait"></i> 불러오는 중';
    if (it.gbSt === 'ok') return '<i class="dot ok"></i> 자동 첨부됨';
    if (it.gbSt === 'NOT_FOUND') return '<i class="dot warn"></i> 주소 확인 필요';
    if (it.gbSt === 'err') return '<i class="dot warn"></i> 다시 시도';
    return '<i class="dot"></i> 대기';
  }

  function gongbuTiles(it, gb, jiga, zone) {
    var T = [];
    /* 토지대장 */
    var ch = gb.char || {}, toji = gb.toji || {};
    var jimok = ch.lndcgrCodeNm || toji.lndcgrCodeNm || it.kind || '';
    var area = it.areaM2 || (ch.lndpclAr ? +ch.lndpclAr : null);
    T.push({
      n: '토지', ok: !!(ch.lndcgrCodeNm || toji.lndcgrCodeNm),
      l1: jimok ? jimok + (area ? ' ' + num(area, 1) + '㎡' : '') : '지목 확인 중',
      l2: ch.ladUseSittnNm ? '이용상황 ' + ch.ladUseSittnNm : (toji.jimok || '')
    });
    /* 건축물대장 */
    var b = gb.bld || {};
    var bOK = b.st === 'OK' && b.items && b.items.length;
    var bTxt, bSub = '';
    if (bOK) {
      bTxt = b.items[0].mainPurpsCdNm || '건축물 있음';
      bSub = b.items[0].platArea ? '대지 ' + num(b.items[0].platArea, 1) + '㎡' : '';
    } else if (b.st === 'EMPTY') {
      bTxt = '건축물 없음(대지)';
    } else if (b.st === 'NOKEY') {
      bTxt = '인증키 필요'; bSub = '4대 공부 원문에서 확인';
    } else if (b.st === 'loading' || it.gbSt === 'loading') {
      bTxt = '확인 중';
    } else if (b.st === 'NET' || b.st === 'BADJSON' || b.st === 'KEYERR' || b.st === 'ERR') {
      bTxt = '지금 확인 불가'; bSub = '건축HUB 응답 없음';
    } else {
      bTxt = '확인 중';
    }
    T.push({ n: '건축물', ok: bOK, l1: bTxt, l2: bSub });
    /* 지적 */
    T.push({
      n: '지적', ok: !!it.pnu,
      l1: it.pnu ? 'PNU ' + it.pnu : '필지 확인 중',
      l2: it.jibun ? '지번 ' + it.jibun : ''
    });
    /* 이용계획 */
    var uses = useNames(gb);
    T.push({
      n: '이용계획', ok: uses.length > 0,
      l1: zone || '용도지역 확인 중',
      l2: uses.filter(function (u) { return u !== zone }).slice(0, 2).join(' · ')
    });
    /* 공시지가 */
    if (jiga) {
      T.push({
        n: '공시지가', ok: true,
        l1: num(jiga) + '원/㎡',
        l2: (gb.price && gb.price.stdrYear ? gb.price.stdrYear + '년 기준' : '') + (area ? ' · ' + money(Math.round(jiga * area)) : '')
      });
    }
    return T.map(function (t) {
      return '<div class="gtile' + (t.ok ? ' ok' : '') + '"><span>' + t.n + (t.ok ? ' <i>✓</i>' : '') + '</span><b>' + esc(t.l1 || '—') + '</b><em>' + esc(t.l2 || '') + '</em></div>';
    }).join('');
  }

  function autoBlocks(it, gb, jiga, zone) {
    var out = '';

    /* 실거래가 */
    var ref = jiga && it.areaM2 ? Math.round(jiga * it.areaM2) : null;
    out += '<div class="block"><h3>실거래가</h3>';
    out += '<ul>';
    if (ref) out += '<li>공시지가 기준 환산 <b>' + money(ref) + '</b> (' + num(jiga) + '원/㎡ × ' + num(it.areaM2, 1) + '㎡)</li>';
    out += '<li>최근 실거래는 국토부 실거래가 공개시스템에서 주소로 확인합니다.</li>';
    out += '</ul><div class="row2"><a class="btn sm ghost" href="https://rt.molit.go.kr/" target="_blank" rel="noopener">실거래가 열기</a>'
      + '<button class="btn sm ghost" id="btnCopyAddr2">주소 복사</button></div></div>';

    /* 입지조건 */
    var ch = gb.char || {};
    var pos = [];
    if (ch.roadSideCodeNm) pos.push('도로접면 ' + ch.roadSideCodeNm);
    if (ch.tpgrphHgCodeNm) pos.push('경사 ' + ch.tpgrphHgCodeNm);
    if (ch.tpgrphFrmCodeNm) pos.push('형상 ' + ch.tpgrphFrmCodeNm);
    if (ch.ladUseSittnNm) pos.push('이용상황 ' + ch.ladUseSittnNm);
    if (zone) pos.push('용도지역 ' + zone);
    out += '<div class="block"><h3>입지조건</h3>';
    out += pos.length ? '<ul>' + pos.map(function (p) { return '<li>' + esc(p) + '</li>' }).join('') + '</ul>'
      : '<p class="dim">4대 공부를 불러오면 도로·경사·용도지역이 자동으로 채워집니다.</p>';
    out += '</div>';

    /* 권리분석 */
    var chk = ['등기부등본 갑구(소유권)·을구(근저당·가압류)', '토지대장·건축물대장 확인', '국세·지방세 완납증명'];
    if (['답', '농지', '과수원'].indexOf(it.kind) >= 0) chk.push('농지취득자격증명, 농지전용 여부');
    if (it.kind === '임야') chk.push('산지관리법 산지전용·입목 확인');
    if (['대지', '주택', '상가', '공장', '창고'].indexOf(it.kind) >= 0) chk.push('건축물대장 용도·위반건축물·사용승인');
    if (it.kind === '상가') chk.push('상가임대차(권리금·시설비) 확인');
    if (useNames(gb).some(function (u) { return /토지거래/.test(u) })) chk.push('토지거래허가구역 — 허가 필요');
    out += '<div class="block"><h3>권리분석 <i class="hint">체크리스트</i></h3><ul class="chk">'
      + chk.map(function (c) { return '<li>' + esc(c) + '</li>' }).join('') + '</ul>'
      + '<a class="btn sm ghost" href="https://www.iros.go.kr/" target="_blank" rel="noopener">인터넷등기소 열기</a></div>';

    /* 개발정보 */
    out += '<div class="block"><h3>개발정보</h3><ul>';
    if (zone && ZONE[zone]) out += '<li>' + esc(zone) + ' — 건폐율 ' + ZONE[zone][0] + '% 이하 · 용적률 ' + ZONE[zone][1] + '% 이하 (국토계획법 시행령 기준)</li>';
    else if (zone) out += '<li>' + esc(zone) + ' — 세부 행위제한은 토지이음에서 확인</li>';
    var regs = useNames(gb).filter(function (u) { return /지구|구역|보호/.test(u) });
    if (regs.length) out += '<li>규제: ' + esc(regs.slice(0, 4).join(', ')) + '</li>';
    if (!zone && !regs.length) out += '<li class="dim">이용계획을 불러오면 개발 제한이 채워집니다.</li>';
    out += '</ul><a class="btn sm ghost" href="https://www.eum.go.kr/web/am/amMain.jsp" target="_blank" rel="noopener">토지이음 열기</a></div>';

    /* 매가 기준 장점 */
    var good = [];
    if (it.price && it.areaP) good.push('평당 ' + money(pyPrice(it)) + ' — 같은 지역 평당 시세와 바로 비교됩니다');
    if (jiga && it.price && it.areaM2) {
      var ratio = it.price / (jiga * it.areaM2);
      good.push('공시지가 대비 ' + (Math.round(ratio * 10) / 10) + '배 (공시지가 ' + num(jiga) + '원/㎡ 기준)');
    }
    if (ch.roadSideCodeNm) good.push('도로접면 ' + ch.roadSideCodeNm + (ch.tpgrphHgCodeNm ? ' · ' + ch.tpgrphHgCodeNm : ''));
    if (zone) good.push(zone + ' — ' + (ZONE[zone] ? '건폐율 ' + ZONE[zone][0] + '%까지' : '용도 확인됨'));
    if (!good.length) good.push('가격·면적을 넣으면 평당 단가와 공시지가 배율이 자동으로 계산됩니다');
    out += '<div class="block good"><h3>매가 기준 장점</h3><ul>'
      + good.slice(0, 4).map(function (x) { return '<li>' + esc(x) + '</li>' }).join('') + '</ul>'
      + '<p class="tiny">조회값으로 자동 정리한 문장입니다. 최종 매가 판단은 사장님 확인이 필요합니다.</p></div>';

    setTimeout(function () {
      var b2 = $('#btnCopyAddr2');
      if (b2) b2.addEventListener('click', function () {
        if (navigator.clipboard) navigator.clipboard.writeText(it.addr || '').then(function () { toast('주소를 복사했습니다'); });
      });
    }, 0);
    return out;
  }

  function shareItem(it) {
    var url = location.origin + location.pathname + '#/item/' + it.id;
    var text = (it.title || '') + ' · ' + money(it.price) + '\n' + (it.addr || '') + '\n' + url;
    if (navigator.share) navigator.share({ title: it.title, text: text, url: url }).catch(function () { });
    else if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { toast('매물 주소를 복사했습니다'); });
  }

  /* ---------------- 사진 ---------------- */
  function pickPhoto(it) {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.addEventListener('change', function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      compress(f, function (data) {
        it.photos = (it.photos || []).concat([data]).slice(0, 3);
        save(); viewDetail(it.id); toast('사진을 넣었습니다');
      });
    });
    inp.click();
  }

  function compress(file, cb) {
    var r = new FileReader();
    r.onload = function () {
      var img = new Image();
      img.onload = function () {
        var w = 900, h = Math.round(img.height * (w / img.width));
        if (img.width < w) { w = img.width; h = img.height; }
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        try { cb(c.toDataURL('image/jpeg', 0.7)) } catch (e) { cb(r.result) }
      };
      img.onerror = function () { cb(r.result) };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  }

  /* ---------------- 요금 ---------------- */
  function viewPrice() {
    var h = '';
    h += '<div class="page-h"><b>요금</b><span>부가세 별도</span></div>';
    h += '<div class="price-card free"><div class="pc-h"><b>무료</b><i>단건 제작</i></div>'
      + '<ul><li>문자 → 물건표 만들기 무제한</li><li>4대 공부 조회</li><li>매물장 저장(이 기기)</li><li>전자명함 1개</li></ul></div>';
    h += '<div class="price-card"><div class="pc-h"><b>심플</b><i>월 9,000원</i></div>'
      + '<div class="pc-sub">결제 9,900원 · 부가세 별도</div>'
      + '<ul><li>문자 → 매물장 자동 정리</li><li>전자명함 = 내 개인 홈페이지</li><li>바탕화면 아이콘 설치</li><li>새 매물 알림 배지</li></ul></div>';
    h += '<div class="price-card pro"><div class="pc-h"><b>프로</b><i>월 30,000원</i></div>'
      + '<div class="pc-sub">결제 33,000원 · 부가세 별도</div>'
      + '<ul><li>AI 비서 자동 응대</li><li>손님 관심 알림(어떤 매물을 몇 번 봤는지)</li><li>매물장 맞춤 세팅</li><li>홍보글·포스터 묶음</li></ul>'
      + '<button class="btn main wide2" id="btnPro">프로 신청 문구 복사</button></div>';
    h += '<div class="note">맞춤형 세팅 — 사장님 스타일에 맞춰 개인 홈페이지·전용 앱을 세팅해 드립니다. 단건 제작은 계속 무료입니다.</div>';
    h += '<a class="wide ghost" href="../" >KTS 원클릭 다른 도구 보기</a>';
    $('#v-price').innerHTML = h;
    $('#btnPro').addEventListener('click', function () {
      var me = S.me || {};
      var body = '[전자명함 프로 신청]\n이름: ' + (me.name || '') + '\n연락처: ' + (me.phone || '') + '\n플랜: 프로 월 30,000원(부가세 별도)';
      if (navigator.clipboard) navigator.clipboard.writeText(body).then(function () { toast('신청 문구를 복사했습니다 — KTS 원클릭으로 보내 주세요', 3400); });
      else toast('신청: ' + body, 4200);
    });
  }

  /* ---------------- 명함 세팅 ---------------- */
  function viewSetup() {
    var me = S.me || {};
    var h = '';
    h += '<div class="page-h"><b>' + (S.me ? '명함 고치기' : '내 명함 만들기') + '</b><span>10초</span></div>';
    h += '<div class="form">';
    h += field('name', '이름', me.name, '예) 김중개');
    h += field('org', '회사 · 직함', me.org, '예) 한빛부동산 대표');
    h += field('phone', '전화번호', me.phone, '010-0000-0000', 'tel');
    h += field('intro', '한 줄 소개 (선택)', me.intro, '예) 가평·남양주 토지와 전원주택 전문');
    h += field('kakao', '카톡 ID나 오픈채팅 주소 (선택)', me.kakao, '예) open.kakao.com/o/abcd');
    h += '</div>';
    h += '<button class="big" id="btnSaveMe">저장</button>';
    if (!S.me) h += '<button class="btn ghost wide2" id="btnDemoMe">예시로 채우고 둘러보기</button>';
    $('#v-setup').innerHTML = h;

    $('#btnSaveMe').addEventListener('click', function () {
      var name = ($('#f-name').value || '').trim();
      if (!name) { toast('이름을 넣어 주세요'); $('#f-name').focus(); return; }
      S.me = {
        name: name,
        org: ($('#f-org').value || '').trim(),
        phone: ($('#f-phone').value || '').trim(),
        intro: ($('#f-intro').value || '').trim(),
        kakao: ($('#f-kakao').value || '').trim(),
        photo: (S.me && S.me.photo) || ''
      };
      save(); toast('저장했습니다'); go('#/card');
    });
    var bd = $('#btnDemoMe');
    if (bd) bd.addEventListener('click', function () {
      S.me = { name: '김중개', org: '한빛부동산 · 대표', phone: '010-2345-6789',
        intro: '가평·남양주 토지와 전원주택 — 문자 주시면 5초 만에 물건표로 보내 드립니다.', kakao: '', photo: '' };
      seedDemo(); save(); go('#/card');
    });
  }
  function field(id, label, val, ph, type) {
    return '<label class="fl"><span>' + label + '</span>'
      + '<input id="f-' + id + '" type="' + (type || 'text') + '" value="' + esc(val || '') + '" placeholder="' + esc(ph || '') + '" autocomplete="off"></label>';
  }

  /* ---------------- AI 비서 시트 ---------------- */
  function openAI(it) {
    var sheet = $('#sheet');
    sheet.classList.add('on');
    document.body.style.overflow = 'hidden';
    $('#aiTitle').textContent = (S.me ? S.me.name + ' ' : '') + 'AI 영업 비서';
    g.KTS_AI.open({
      item: it, items: S.items, me: S.me,
      openItem: function (id) { closeSheet(); go('#/item/' + id); },
      saveInquiry: function (q, kind) {
        var list = LS.get(K.inq, []);
        list.unshift({ id: 'q' + Date.now(), at: Date.now(), read: false, itemId: q.itemId, itemTitle: q.itemTitle, text: q.text, kind: kind });
        LS.set(K.inq, list.slice(0, 50));
        updateBadge();
      }
    });
  }
  function closeSheet() { $('#sheet').classList.remove('on'); document.body.style.overflow = ''; }

  /* ---------------- 문의함 ---------------- */
  function inbox() { return LS.get(K.inq, []); }
  function unreadCount() {
    return inbox().filter(function (q) { return !q.read }).length;
  }
  function openInbox() {
    var list = inbox();
    var h = '<div class="sheet-h"><b>받은 문의 ' + list.length + '</b><button class="icob" id="ibX">✕</button></div>';
    if (!list.length) h += '<div class="empty" style="margin:12px 0">아직 받은 문의가 없습니다.<br>손님이 AI 비서로 요구를 전달하면 여기에 쌓입니다.</div>';
    h += '<div class="inbox">' + list.map(function (q) {
      return '<div class="iq"><b>' + esc(q.itemTitle || '매물') + '</b><pre>' + esc(q.text) + '</pre><span>' + ago(q.at) + '</span></div>';
    }).join('') + '</div>';
    $('#sheet').classList.add('on');
    document.body.style.overflow = 'hidden';
    $('#aiTitle').textContent = '문의함';
    var log = $('#aiLog'); log.innerHTML = h;
    $('#aiChips').innerHTML = ''; $('#aiInput').hidden = true;
    var x = $('#ibX'); if (x) x.addEventListener('click', closeSheet);
    var list2 = inbox(); list2.forEach(function (q) { q.read = true }); LS.set(K.inq, list2);
    updateBadge();
  }

  /* ---------------- 배지 ---------------- */
  function updateBadge() {
    var unread = unreadCount();
    var seen = LS.get(K.seen, 0) || 0;
    var fresh = S.items.filter(function (x) { return x.createdAt > seen }).length;
    var n = Math.max(unread, fresh);
    try {
      if ('setAppBadge' in navigator) {
        if (n > 0) navigator.setAppBadge(n).catch(function () { });
        else navigator.clearAppBadge().catch(function () { });
      }
    } catch (e) { }
  }

  /* ---------------- 설치(PWA) · 카톡 ---------------- */
  var ua = navigator.userAgent || '';
  var isKakao = /KAKAOTALK/i.test(ua);
  var isIOS = /iPhone|iPad|iPod/i.test(ua);
  var isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;

  function doInstall() {
    if (isStandalone) { toast('이미 바탕화면 아이콘으로 열려 있습니다'); return; }
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then(function (c) {
        if (c.outcome === 'accepted') { installed = true; toast('바탕화면에 아이콘을 만들었습니다'); }
        installPrompt = null;
      });
      return;
    }
    guideInstall();
  }

  function guideInstall() {
    var msg = isIOS
      ? 'Safari에서 열고 아래 공유(⬆︎) → 「홈 화면에 추가」를 누르면 아이콘이 생깁니다.'
      : '크롬에서 열고 오른쪽 위 ⋮ → 「홈 화면에 추가」를 누르면 아이콘이 생깁니다.';
    toast(msg, 5200);
  }

  function kakaoBar() {
    if (!isKakao || LS.get(K.kb, false)) return;
    var bar = document.createElement('div');
    bar.className = 'kakaobar';
    var txt = document.createElement('div');
    txt.innerHTML = '<b>카톡 안에서는 홈 화면 추가가 막힙니다</b><span>' +
      (isIOS ? 'Safari로 열기 → 공유 → 홈 화면에 추가' : '크롬으로 열면 아이콘·알림이 됩니다') + '</span>';
    bar.appendChild(txt);
    if (!isIOS) {
      var b = document.createElement('button');
      b.className = 'btn sm main';
      b.textContent = '크롬으로 열기';
      b.addEventListener('click', function () {
        var host = location.host, path = location.pathname + location.hash;
        location.href = 'intent://' + host + path + '#Intent;scheme=https;package=com.android.chrome;'
          + 'S.browser_fallback_url=' + encodeURIComponent(location.href) + ';end';
      });
      bar.appendChild(b);
    }
    var x = document.createElement('button');
    x.className = 'kbx'; x.textContent = '✕';
    x.addEventListener('click', function () { LS.set(K.kb, true); bar.remove(); });
    bar.appendChild(x);
    document.getElementById('app').prepend(bar);
  }

  /* ---------------- 토스트 ---------------- */
  var toastT = null;
  function toast(msg, ms) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove('on') }, ms || 2600);
  }

  /* ---------------- 시작 ---------------- */
  function boot() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(function () { });
    }
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault(); installPrompt = e;
      var b = $('#btnInstall'); if (b) b.classList.add('ready');
    });
    window.addEventListener('appinstalled', function () { installed = true; toast('바탕화면에 아이콘을 만들었습니다'); });
    window.addEventListener('hashchange', render);
    $('#aiX').addEventListener('click', closeSheet);
    $('#sheet').addEventListener('click', function (e) { if (e.target === $('#sheet')) closeSheet(); });
    if (isStandalone) installed = true;
    if (!S.items) seedDemo();
    if (!location.hash) location.hash = S.me ? '#/card' : '#/setup';
    render();
    kakaoBar();
    if (!S.me) go('#/setup');
  }

  g.KTS_APP = { go: go, state: S };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
