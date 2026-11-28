/* ==========================================================================
   KTS 전자명함 · 매물장 — 화면과 동작
   위 → 아래 4단 : ① 명함 ② 대표매물 ③ 전체 매물 + 문자 5초 ④ 상세 + AI 비서
   ========================================================================== */
(function (g) {
  'use strict';

  var K = { me: 'kts_bc_me', items: 'kts_bc_items', plan: 'kts_bc_plan', seen: 'kts_bc_seen',
            inq: 'kts_bc_inq', tip: 'kts_bc_tip', kb: 'kts_bc_kakaobar', shared: 'kts_bc_shared',
            inst: 'kts_bc_installed' };

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
    pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L20 8l-4-4L4 16z"/><path d="M14.5 5.5 18.5 9.5"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 6V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h1"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11"/><path d="m7.5 11 4.5 4.5L16.5 11"/><path d="M5 19h14"/></svg>',
    fax: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="9" width="17" height="10.5" rx="2"/><path d="M7 9V4.5h10V9"/><path d="M7 15.5h5"/><circle cx="17" cy="12.6" r=".8" fill="currentColor"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m3.6 6.6 8.4 6.6 8.4-6.6"/></svg>'
  };

  /* ---------------- 예시 매물 (처음 둘러보기용 · '예시' 표시) ---------------- */
  var DEMO = [
    { kind: '임야', addr: '경기도 가평군 북면 목동리 271', areaM2: 3967, areaP: 1200, price: 380000000,
      tags: ['보전관리', '전원주택지', '경사지'], title: '임야 1,200평 · 북면', days: 1,
      photo: 'img/sample_land.jpg',
      raw: '[한빛부동산] 가평 북면 목동리 271 임야 3,967㎡(1,200평) 매매 3억8천 보전관리 전원주택지 010-2345-6789' },
    { kind: '대지', addr: '경기도 가평군 조종면 신하리 162-9', areaM2: 991, areaP: 300, price: 520000000,
      tags: ['도로접', '평지', '전원주택지'], title: '대지 300평 · 조종면', days: 3,
      photo: 'img/sample_house.jpg',
      raw: '[한빛부동산] 가평 조종면 신하리 162-9 대지 991㎡(300평) 매매 5억2천 도로접 평지 010-2345-6789' },
    /* 사진이 없는 예시 — 지적항공도가 자동으로 붙는 모습을 그대로 보여 준다 */
    { kind: '답', addr: '충남 당진시 석문면 초락도리 204-1', areaM2: 6612, areaP: 2000, price: 400000000,
      tags: ['도로접', '평지', '농지'], title: '답 2,000평 · 석문면', days: 6, photo: '',
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
      /* 예시도 「별표 켠 매물」로 둔다 — 명함에는 별표만 올라가므로 셋 다 별표 */
      it.starred = true;
      it.photos = d.photo ? [d.photo] : [];
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
        if (r.jibun && !it.jibun) it.jibun = String(r.jibun).replace(/[^0-9-]/g, '');
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
      if (r.jibun && !it.jibun) it.jibun = String(r.jibun).replace(/[^0-9-]/g, '');
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
  var route = { name: 'card', id: null }, lastKey = '', editing = null;
  function go(h) { if (location.hash === h) render(); else location.hash = h; }

  function parseHash() {
    var h = (location.hash || '#/card').replace(/^#\/?/, '');
    var p = h.split('/');
    if (p[0] === 'item' && p[1]) return { name: 'detail', id: p[1] };
    if (p[0] === 'g') return { name: 'guest', id: null, code: p[1] || '' };
    if (['card', 'list', 'new', 'price', 'setup'].indexOf(p[0]) >= 0) return { name: p[0], id: null };
    return { name: 'card', id: null };
  }

  function render() {
    route = parseHash();
    $$('.view').forEach(function (v) { v.classList.remove('on') });
    var v = $('#v-' + (route.name === 'guest' ? 'card' : route.name));
    if (v) v.classList.add('on');

    if (route.name === 'card') viewCard();
    else if (route.name === 'guest') viewGuest();
    else if (route.name === 'list') viewList();
    else if (route.name === 'new') viewNew();
    else if (route.name === 'detail') viewDetail(route.id);
    else if (route.name === 'price') viewPrice();
    else if (route.name === 'setup') viewSetup();

    /* 손님 화면에서는 주인용 탭·도구를 전부 감춘다(265번) */
    document.body.classList.toggle('guestmode', route.name === 'guest');

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

  /* 265번 — 실물 명함 서열: 상호가 가장 크게, 그 아래 「직책 + 이름」, 팩스·이메일·주소까지 */
  function splitOrg(me) {
    var org = String(me.org || '').trim();
    var title = String(me.title || '').trim();
    if (!title && org.indexOf(' · ') > 0) {
      var p = org.split(' · ');
      title = p.pop(); org = p.join(' · ');
    }
    return { org: org, title: title };
  }
  function cardHtml(me, guest) {
    var o = splitOrg(me);
    var tel = (me.phone || '').replace(/[^0-9+]/g, '');
    var hasPhoto = !!me.photo;
    var h = '<div class="biz' + (hasPhoto ? '' : ' nophoto') + (guest ? ' guest' : '') + '">';
    h += '<button class="biz-stamp" id="btnSeal" type="button" aria-label="직인 도장 QR 크게 보기"><canvas id="sealCv"></canvas></button>';
    h += '<div class="biz-top">';
    if (hasPhoto) h += '<div class="av"><img src="' + esc(me.photo) + '" alt="' + esc(me.name || '') + ' 사진"></div>';
    h += '<div class="who">';
    h += '<div class="co">' + esc(o.org || '전자명함') + '</div>';
    h += '<div class="nm">' + (o.title ? '<em>' + esc(o.title) + '</em> ' : '') + '<b>' + esc(me.name || '이름') + '</b></div>';
    if (me.field) h += '<span class="role">' + esc(me.field) + '</span>';
    h += '</div></div>';

    /* 연락 — 전화는 바로 누를 수 있게 가장 크게, 팩스·메일·주소는 한 줄씩 */
    h += '<div class="clines">';
    h += '<a class="cline tel" href="tel:' + esc(tel) + '">' + IC.phone + '<b>' + (me.phone ? esc(me.phone) : '전화번호를 넣어 주세요') + '</b></a>';
    if (me.fax) h += '<div class="cline">' + IC.fax + '<span>' + esc(me.fax) + '</span><i>FAX</i></div>';
    if (me.email) h += '<a class="cline" href="mailto:' + esc(me.email) + '">' + IC.mail + '<span>' + esc(me.email) + '</span></a>';
    if (me.bizAddr) h += '<div class="cline">' + IC.home + '<span>' + esc(me.bizAddr) + '</span></div>';
    h += '</div>';

    if (me.strength) h += '<div class="edge-line">' + IC.spark + '<span>' + esc(me.strength) + '</span></div>';
    if (me.intro) h += '<p class="intro"><em>“</em>' + esc(me.intro) + '</p>';

    /* 265번 — 주인과 손님 화면 완전 분리 */
    h += '<div class="biz-acts">';
    if (guest) {
      h += '<button class="pact save" id="btnSaveCard" type="button">' + IC.down + '<span>저장하기</span></button>';
      if (!isInstalledNow()) h += '<button class="pact inst" id="btnInstall" type="button">' + IC.install + '<span>바로가기</span></button>';
      h += '<a class="pact tel" href="tel:' + esc(tel) + '">' + IC.phone + '<span>전화</span></a>';
      h += '<a class="pact kakao" href="#" id="btnKakao">' + IC.chat + '<span>카톡</span></a>';
    } else {
      h += '<button class="pact out" id="btnShare" type="button">' + IC.share + '<span>내보내기</span></button>';
      h += '<button class="pact img" id="btnImg" type="button">' + IC.down + '<span>이미지 저장</span></button>';
      h += '<button class="pact edit" id="btnEdit" type="button">' + IC.pen + '<span>고치기</span></button>';
      h += '<button class="pact" id="btnInbox" type="button">' + IC.bell + '<span>문의</span>' + (unreadCount() ? '<i class="cnt">' + unreadCount() + '</i>' : '') + '</button>';
    }
    h += '</div>';
    h += '</div>';
    return h;
  }

  function viewCard() {
    if (!S.me) { go('#/setup'); return; }
    var me = S.me;
    var starred = S.items.filter(function (x) { return x.starred })
      .sort(function (a, b) { return b.createdAt - a.createdAt });
    var list = starred.slice(0, 3);

    var h = cardHtml(me, false);

    /* 명함 아래 — 평소에는 한 줄만, 나머지는 눌렀을 때 */
    h += '<div class="biz-tools"><span class="wm">KTS <i>전자명함</i></span>'
      + '<a class="tl" href="' + esc(posterUrl(list[0] && list[0].id)) + '">물건표</a>'
      + '<a class="tl" href="#/list">매물장 <i>' + S.items.length + '</i></a></div>';

    h += '<div class="sec-h starred"><b>새 물건표</b><span>'
      + (starred.length ? '별표 ' + starred.length + '건' : '별표 없음') + '</span></div>';
    if (list.length) {
      h += '<div class="grid3">';
      list.forEach(function (it) { h += gcard(it); });
      h += '</div>';
    } else {
      h += '<a class="star-empty" href="#/list"><b>★</b><span>매물장에서 별표를 켜면<br>이 자리에 손님에게 먼저 보입니다</span></a>';
    }

    h += '<a class="wide slim" href="#/list"><b>매물 전체 보기</b><span>' + S.items.length + '건 →</span></a>';
    h += '<p class="tiny">문자 → 매물장 → 전자명함 · KTS 원클릭</p>';

    $('#v-card').innerHTML = h;

    $('#btnInbox').addEventListener('click', openInbox);
    $('#btnShare').addEventListener('click', shareCard);
    $('#btnImg').addEventListener('click', saveCardImage);
    $('#btnEdit').addEventListener('click', function () { go('#/setup'); });
    $('#btnSeal').addEventListener('click', openSeal);
    var bk = $('#btnKakao');
    if (bk) bk.addEventListener('click', function (e) { e.preventDefault(); openKakao(); });
    paintSeal($('#sealCv'), 92);

    LS.set(K.seen, Date.now());
    updateBadge();
    list.forEach(ensureGeo);
  }

  /* ---------------- 손님 화면 (265·281번) ---------------- */
  function sharePayload() {
    var me = S.me || {};
    var o = splitOrg(me);
    var top = S.items.filter(function (x) { return x.starred }).sort(function (a, b) { return b.createdAt - a.createdAt })[0];
    var p = {
      v: 1,
      o: o.org, t: o.title, n: me.name || '', p: me.phone || '', f: me.fax || '',
      e: me.email || '', a: me.bizAddr || '', k: me.kakao || '',
      fd: me.field || '', st: me.strength || '', it: me.intro || '',
      q: top ? { i: top.id, t: top.title || '', a: top.addr || '', p: top.price || 0, r: top.residual || 0, k: top.kind || '', ap: top.areaP || 0 } : null,
      pm: top ? posterModelCode(top) : ''
    };
    return p;
  }
  function guestLink() {
    var code = g.KTS_BRIEF ? KTS_BRIEF.enc(sharePayload()) : '';
    return location.origin + location.pathname + '#/g/' + code;
  }
  function viewGuest() {
    var code = (location.hash.split('/')[2] || '');
    var p = g.KTS_BRIEF ? KTS_BRIEF.dec(code) : null;
    if (!p) {
      $('#v-card').innerHTML = '<div class="empty">명함 주소가 올바르지 않습니다.<br>보내 주신 링크를 다시 눌러 주세요.</div>';
      return;
    }
    var me = { org: p.o, title: p.t, name: p.n, phone: p.p, fax: p.f, email: p.e, bizAddr: p.a, kakao: p.k, field: p.fd, strength: p.st, intro: p.it, stamp: p.sm || 'circle' };
    var h = cardHtml(me, true);
    if (p.q && p.q.i) {
      var price = p.q.r ? '잔가 ' + money(p.q.r) : money(p.q.p);
      h += '<a class="guest-item" href="' + esc('../listing/poster.html?m=' + encodeURIComponent(p.pm || '') + '&g=1') + '">'
        + '<span class="gi-t">보내 드린 물건표</span>'
        + '<b>' + esc(p.q.t || '매물') + '</b>'
        + '<span class="gi-a">' + esc(p.q.a || '') + '</span>'
        + '<span class="gi-p">' + esc(price) + '</span>'
        + '<i>눌러서 크게 보기 · 이미지로 받기</i></a>';
    }
    h += '<p class="tiny">KTS 원클릭 전자명함 · 문의는 전화·카톡으로</p>';
    $('#v-card').innerHTML = h;
    $('#btnSeal').addEventListener('click', openSeal);
    paintSeal($('#sealCv'), 92);
    var bs = $('#btnSaveCard');
    if (bs) bs.addEventListener('click', function () { saveGuestContact(me); });
    var bi = $('#btnInstall');
    if (bi) bi.addEventListener('click', function (e) { e.preventDefault(); doInstall(); });
    var bk = $('#btnKakao');
    if (bk) bk.addEventListener('click', function (e) { e.preventDefault(); openKakaoOf(me); });
  }
  function saveGuestContact(me) {
    var o = splitOrg(me);
    var v = function (s) { return String(s || '').replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\r?\n/g, '\\n') };
    var lines = ['BEGIN:VCARD', 'VERSION:3.0', 'N:' + v(me.name) + ';;;;', 'FN:' + v(o.title ? o.title + ' ' + me.name : me.name),
      'ORG:' + v(o.org), 'TITLE:' + v(o.title), 'TEL;TYPE=CELL:' + v(me.phone)];
    if (me.fax) lines.push('TEL;TYPE=FAX:' + v(me.fax));
    if (me.email) lines.push('EMAIL:' + v(me.email));
    if (me.bizAddr) lines.push('ADR;TYPE=WORK:;;' + v(me.bizAddr) + ';;;;');
    lines.push('NOTE:' + v([me.field, me.strength].filter(Boolean).join(' · ')), 'END:VCARD');
    try {
      var blob = new Blob([lines.join('\r\n')], { type: 'text/vcard;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = (me.name || 'KTS') + '.vcf';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { try { URL.revokeObjectURL(url) } catch (e) { } }, 4000);
      toast('연락처를 저장했습니다 — 폰 주소록에 「' + (me.name || 'KTS') + '」이 생깁니다', 3400);
    } catch (e) { toast('이 기기에서는 저장이 어렵습니다 — 번호를 길게 눌러 저장해 주세요'); }
  }
  function openKakaoOf(me) {
    me = me || S.me || {};
    var k = KTS_PARSE ? KTS_PARSE.normUrl(me.kakao) : me.kakao;
    if (k && /^https?:/.test(k)) { window.open(k, '_blank'); return; }
    if (k) {
      if (navigator.clipboard) navigator.clipboard.writeText(k).then(function () { toast('카톡 ID 「' + k + '」 복사 — 카톡에서 붙여넣으세요'); });
      else toast('카톡 ID: ' + k);
      return;
    }
    toast('카톡 ID나 오픈채팅 주소가 아직 없습니다');
  }

  /* ---------------- 직인 도장 QR (250번) ---------------- */
  function sealShape() {
    var s = (S.me && S.me.stamp) || 'circle';
    return (s === 'square' || s === 'oval') ? s : 'circle';
  }
  function sealOpts(extra) {
    var me = S.me || {};
    var o = { shape: sealShape(), name: me.name || '', me: me,
              value: (g.KTS && KTS.Seal) ? KTS.Seal.payload(me) : '' };
    if (extra) for (var k in extra) o[k] = extra[k];
    return o;
  }
  function paintSeal(cv, size) {
    if (!cv || !g.KTS || !KTS.Seal) return;
    /* 명함 위 도장은 세로가 길어지지 않게 — 타원은 가로를 줄여 높이를 92px 안에 맞춘다 */
    var s2 = sealShape() === 'oval' ? Math.round(size * 0.76) : size;
    try {
      KTS.Seal.paint(cv, s2, sealOpts());
      /* 화면에서는 CSS 크기로 — 캔버스 속성(기기 배율)이 그대로 쓰이면 도장이 커진다 */
      cv.style.width = size + 'px';
      cv.style.height = 'auto';
    } catch (e) { }
  }
  function openSeal() {
    var box = $('#sealBox'); if (!box) return;
    var stage = $('#sealStage');
    var w = Math.min(360, Math.max(220, Math.round((window.innerWidth || 390) * 0.66)));
    stage.innerHTML = '';
    var cv = document.createElement('canvas');
    stage.appendChild(cv);
    try { KTS.Seal.paint(cv, w, sealOpts()) } catch (e) { stage.innerHTML = '<p class="tiny">QR을 만들지 못했습니다.</p>' }
    $('#sealShape').textContent = '모양 바꾸기 (' + ({ circle: '원형', square: '사각', oval: '타원' })[sealShape()] + ')';
    box.hidden = false;
  }
  function closeSeal() { var b = $('#sealBox'); if (b) b.hidden = true; }
  function cycleSealShape() {
    var order = ['circle', 'square', 'oval'];
    var i = order.indexOf(sealShape());
    S.me.stamp = order[(i + 1) % 3];
    save();
    openSeal();
    if ($('#sealCv')) paintSeal($('#sealCv'), 92);
    toast('직인 모양 — ' + ({ circle: '원형', square: '사각', oval: '타원' })[S.me.stamp]);
  }
  function saveSealImage() {
    try {
      var url = KTS.Seal.dataUrl(1000, sealOpts());
      if (!url) { toast('QR 이미지를 만들지 못했습니다'); return; }
      var a = document.createElement('a');
      a.href = url;
      a.download = (S.me && S.me.name ? S.me.name : 'KTS') + '_직인QR.png';
      document.body.appendChild(a); a.click(); a.remove();
      toast('직인 QR을 저장했습니다 — 인쇄물·포스터에 붙이세요', 3200);
    } catch (e) { toast('이 기기에서는 저장이 어렵습니다'); }
  }
  function isInstalledNow() {
    if (installed) return true;
    if (LS.get(K.inst, 0)) return true;
    try {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
      if (window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches) return true;
      if (navigator.standalone) return true;
    } catch (e) { }
    return false;
  }

  /* 명함 위 작은 물건 카드 — 썸네일 아래는 「지역/평수」·「가격」 두 줄만, 굵고 크게 */
  function regionOf(it) {
    var parts = String(it.addr || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    for (var i = parts.length - 1; i >= 0; i--) {
      if (/[읍면동]$/.test(parts[i]) && !/^\d/.test(parts[i])) return parts[i];
    }
    for (var j = 0; j < parts.length; j++) {
      if (/[시군구]$/.test(parts[j]) && parts[j].length > 1) return parts[j];
    }
    return it.kind || '지역';
  }

  function gcard(it) {
    var price = (it.dealType !== '매매' && it.deposit) ? '보증 ' + money(it.deposit) : money(it.price);
    var line1 = regionOf(it) + (it.areaP ? ' ' + num(it.areaP) + '평'
      : (it.areaM2 ? ' ' + num(it.areaM2) + '㎡' : ''));
    return '<a class="gcard" href="#/item/' + it.id + '">'
      + '<div class="gth">' + thumb(it) + (it.demo ? '<i class="dm">예시</i>' : '') + '</div>'
      + '<b class="gc1">' + esc(line1) + '</b>'
      + '<span class="gc2">' + esc(price) + '</span>'
      + '</a>';
  }

  function posterUrl(id, guest) {
    if (!id) return '../listing/poster.html';
    return '../listing/poster.html?item=' + encodeURIComponent(id) + (guest ? '&g=1' : '');
  }
  function posterModelCode(it) {
    if (!it || !g.KTS_BRIEF) return '';
    try {
      var m = KTS_BRIEF.build(it, S.me);
      m.photos = [];                       /* 손님 링크에는 사진을 싣지 않는다(주소가 길어진다) */
      return KTS_BRIEF.enc(m);
    } catch (e) { return '' }
  }

  function shareCard() {
    var me = S.me || {};
    var url = guestLink();
    var text = (me.name || '') + (me.org ? ' · ' + me.org : '') + ' 전자명함\n' + url;
    if (navigator.share) {
      navigator.share({ title: (me.name || 'KTS') + ' 전자명함', text: text, url: url }).catch(function () { });
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function () { toast('손님용 명함 주소를 복사했습니다'); });
    } else toast(url);
  }

  function openKakao() {
    var me = S.me || {};
    var k = g.KTS_PARSE ? KTS_PARSE.normUrl(me.kakao) : me.kakao;
    if (k && /^https?:/.test(k)) { window.open(k, '_blank'); return; }
    if (k) {
      if (navigator.clipboard) navigator.clipboard.writeText(k).then(function () { toast('카톡 ID 「' + k + '」 복사 — 카톡에서 붙여넣으세요'); });
      else toast('카톡 ID: ' + k);
      return;
    }
    toast('명함 고치기에서 카톡 ID나 오픈채팅 주소를 넣어 두세요');
  }

  /* ---------------- 카톡 인앱 → 크롬 탈출 (intent://) ---------------- */
  function chromeIntentUrl() {
    var host = location.host || 'autooneclick.com';
    /* 해시(#/card)를 intent 경로에 붙이면 안드로이드가 Intent; 를 못 찾는다 — 경로만 넣고
       뒤로 돌아갈 곳(browser_fallback_url)에만 해시를 살려 넣는다. */
    var path = location.pathname || '/bizcard/';
    return 'intent://' + host + path + '#Intent;scheme=https;package=com.android.chrome;'
      + 'S.browser_fallback_url=' + encodeURIComponent(location.origin + path + (location.hash || '')) + ';end';
  }
  function openChrome() { location.href = chromeIntentUrl(); }

  /* ---------------- 명함 1장 → PNG (Canvas) ---------------- */
  function rr(x, px, py, w, h, r) {
    x.beginPath();
    x.moveTo(px + r, py);
    x.lineTo(px + w - r, py); x.quadraticCurveTo(px + w, py, px + w, py + r);
    x.lineTo(px + w, py + h - r); x.quadraticCurveTo(px + w, py + h, px + w - r, py + h);
    x.lineTo(px + r, py + h); x.quadraticCurveTo(px, py + h, px, py + h - r);
    x.lineTo(px, py + r); x.quadraticCurveTo(px, py, px + r, py);
    x.closePath();
  }

  function saveCardImage() {
    var me = S.me || {};
    /* 카톡 인앱에서는 내려받기가 막힌다 — 크롬으로 탈출해서 저장 */
    if (isKakao && !isIOS) {
      toast('카톡 안에서는 저장이 막힙니다 — 크롬에서 저장합니다', 2400);
      setTimeout(openChrome, 700);
      return;
    }
    /* 위 594 = 명함 한 장 / 아래 306 = 직인 도장 QR 띠(흰 바탕 → 스캔 여백 확보) */
    var W = 1080, H = 900, PAD = 62, right = W - PAD, CARDH = 594;
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var x = c.getContext('2d');
    if (!x) { toast('이 기기에서는 이미지 저장이 어렵습니다'); return; }

    function font(size, weight) {
      return (weight || 700) + ' ' + size + 'px "Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR","Noto Sans CJK KR",sans-serif';
    }

    /* 바탕 — 화면과 같은 딥네이비 그라데이션 + 금색 테두리 */
    var g = x.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#26375a'); g.addColorStop(.44, '#1b2949'); g.addColorStop(1, '#121d36');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    var glow = x.createRadialGradient(W, 0, 0, W, 0, 640);
    glow.addColorStop(0, 'rgba(201,160,99,.22)'); glow.addColorStop(1, 'rgba(201,160,99,0)');
    x.fillStyle = glow; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(201,160,99,.55)'; x.lineWidth = 3; x.strokeRect(1.5, 1.5, W - 3, H - 3);
    var tl = x.createLinearGradient(0, 0, W, 0);
    tl.addColorStop(0, 'rgba(226,186,122,0)'); tl.addColorStop(.5, 'rgba(226,186,122,.9)'); tl.addColorStop(1, 'rgba(226,186,122,0)');
    x.fillStyle = tl; x.fillRect(0, 0, W, 3);

    function text(str) { return String(str == null ? '' : str); }

    function wrap(t, wx, wy, maxW, lh, maxLines) {
      var words = text(t).split(/\s+/).filter(Boolean), line = '', n = 0;
      for (var i = 0; i < words.length; i++) {
        var cand = line ? line + ' ' + words[i] : words[i];
        if (x.measureText(cand).width > maxW && line) {
          x.fillText(line, wx, wy + n * lh); n++; line = words[i];
          if (n >= maxLines) return;
        } else line = cand;
      }
      if (line && n < maxLines) x.fillText(line, wx, wy + n * lh);
    }

    function exportPng() {
      c.toBlob(function (b) {
        if (!b) { toast('이미지를 만들지 못했습니다'); return; }
        var url = URL.createObjectURL(b);
        var a = document.createElement('a');
        a.href = url;
        a.download = text(me.name || '전자명함').replace(/[\\/:*?"<>|]/g, '') + '_명함.png';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { try { URL.revokeObjectURL(url) } catch (e) { } }, 6000);
        toast('명함 1장을 PNG로 저장했습니다 — 카톡·문자에 붙여 보내세요', 3600);
      }, 'image/png');
    }

    function paint(img) {
      var top = 118;
      var tx = PAD, wText = W - PAD * 2;

      /* KTS 마크 */
      x.textAlign = 'right'; x.textBaseline = 'alphabetic';
      x.fillStyle = '#e2ba7a'; x.font = font(26, 900);
      try { x.letterSpacing = '7px' } catch (e) { }
      x.fillText('KTS', right, PAD + 12);
      try { x.letterSpacing = '0px' } catch (e) { }

      /* 사진 — 있으면 금색 테두리 안에 4:5 로 채워 넣는다 */
      if (img) {
        var pw = 196, ph = 245;
        rr(x, PAD - 3, top - 3, pw + 6, ph + 6, 14);
        x.fillStyle = 'rgba(226,186,122,.42)'; x.fill();
        x.save();
        rr(x, PAD, top, pw, ph, 11); x.clip();
        var s = Math.max(pw / img.width, ph / img.height);
        var dw = img.width * s, dh = img.height * s;
        x.drawImage(img, PAD + (pw - dw) / 2, top + (ph - dh) / 2, dw, dh);
        x.restore();
        tx = PAD + pw + 40;
        wText = right - tx;
      }

      /* 265번 서열 — 상호(회사)가 가장 크고, 그 아래 「직책 이름」 */
      var o = splitOrg(me);
      var orgSize = img ? 44 : 50;
      var orgY = top + (img ? 40 : 44);
      x.textAlign = 'left'; x.fillStyle = '#ffffff'; x.font = font(orgSize, 900);
      var orgTxt = text(o.org || '전자명함');
      while (x.measureText(orgTxt).width > wText && orgTxt.length > 4) orgTxt = orgTxt.slice(0, -1);
      x.fillText(orgTxt, tx, orgY, wText);

      var nameY = orgY + (img ? 52 : 56);
      x.fillStyle = '#e8eef8'; x.font = font(34, 800);
      var idTxt = (o.title ? o.title + ' ' : '');
      x.fillText(idTxt + text(me.name || '이름'), tx, nameY, wText);

      /* 직책은 조금 흐리게, 이름은 흰색 굵게 — 앞부분을 다시 덧그린다 */
      if (o.title) {
        x.fillStyle = '#f2d8a8'; x.font = font(34, 800);
        var tw2 = x.measureText(idTxt).width;
        x.fillText(text(me.name || ''), tx + tw2, nameY, Math.max(40, wText - tw2));
      }

      /* 전문 분야 배지 + 핵심 장점 */
      var y = nameY + 50;
      var px = tx;
      if (me.field) {
        x.font = font(28, 900);
        var fw = x.measureText(me.field).width + 40;
        rr(x, px, y - 30, fw, 42, 21);
        x.fillStyle = 'rgba(226,186,122,.15)'; x.fill();
        x.strokeStyle = 'rgba(226,186,122,.6)'; x.lineWidth = 2; x.stroke();
        x.fillStyle = '#f2d8a8'; x.fillText(me.field, px + 20, y);
        px += fw + 16;
      }
      if (me.strength) {
        x.font = font(28, 700); x.fillStyle = '#cbb68f';
        x.fillText(me.strength, px, y, Math.max(40, right - px));
      }

      /* 인삿말 */
      if (me.intro) {
        y += 58;
        x.font = font(30, 500); x.fillStyle = '#c1ccdd';
        wrap('“ ' + me.intro, tx, y, wText, 42, 2);
      }

      /* 금색 구분선 */
      var lg = x.createLinearGradient(tx, 0, right, 0);
      lg.addColorStop(0, 'rgba(226,186,122,.55)'); lg.addColorStop(.45, 'rgba(255,255,255,.14)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = lg; x.fillRect(tx, 430, right - tx, 2);

      /* 연락 알약 — 전화·문자·카톡 */
      var py2 = 458, ph2 = 64, qx = tx;
      function pill(label, fill, stroke, color) {
        x.font = font(28, 900);
        var w2 = x.measureText(label).width + 46;
        rr(x, qx, py2, w2, ph2, 14);
        x.fillStyle = fill; x.fill();
        if (stroke) { x.strokeStyle = stroke; x.lineWidth = 2; x.stroke(); }
        x.fillStyle = color; x.textAlign = 'center';
        x.fillText(label, qx + w2 / 2, py2 + 42);
        x.textAlign = 'left';
        qx += w2 + 12;
      }
      pill('전화' + (me.phone ? '  ' + me.phone : ''), 'rgba(34,197,94,.16)', 'rgba(34,197,94,.42)', '#8ff0b4');
      pill('문자', 'rgba(96,165,250,.15)', 'rgba(96,165,250,.4)', '#a9ccff');
      pill('카톡', '#fee500', null, '#2a2200');

      /* 팩스·이메일·주소(265번) — 두 줄로 또박또박 */
      x.textAlign = 'left'; x.font = font(23, 600); x.fillStyle = '#a9bcd4';
      var l1 = [me.fax ? 'FAX ' + me.fax : '', me.email || ''].filter(Boolean).join('   ·   ');
      if (l1) x.fillText(l1, tx, 540, wText);
      if (me.bizAddr) {
        x.fillStyle = '#93a7c0';
        x.fillText(text(me.bizAddr), tx, 570, wText);
      }

      /* ── 직인 도장 QR 띠 ── */
      x.fillStyle = '#ffffff'; x.fillRect(0, CARDH, W, H - CARDH);
      x.fillStyle = '#c9a063'; x.fillRect(0, CARDH, W, 3);
      var sealSize = 268, sealX = 54, sealY = CARDH + 19;
      try {
        var sealCanvas = document.createElement('canvas');
        KTS.Seal.paint(sealCanvas, sealSize, sealOpts());
        var sh2 = sealSize * sealCanvas.height / Math.max(1, sealCanvas.width);
        x.drawImage(sealCanvas, sealX, sealY, sealSize, sh2);
      } catch (e) { }

      var tx2 = sealX + sealSize + 40;
      x.textAlign = 'left'; x.fillStyle = '#111111';
      x.font = font(24, 900);
      x.fillText('직인 QR', tx2, CARDH + 66);
      x.font = font(40, 900);
      x.fillText(text(me.name || '이름'), tx2, CARDH + 124, right - tx2);
      x.font = font(24, 700); x.fillStyle = '#333333';
      x.fillText(text([me.org, me.title].filter(Boolean).join(' · ') || 'KTS 원클릭'), tx2, CARDH + 162, right - tx2);
      x.font = font(38, 900); x.fillStyle = '#000000';
      x.fillText(text(me.phone || ''), tx2, CARDH + 218, right - tx2);
      x.font = font(20, 700); x.fillStyle = '#444444';
      x.fillText('휴대폰 카메라로 찍으면 전자명함이 열립니다', tx2, CARDH + 262, right - tx2);
      x.textAlign = 'right'; x.font = font(18, 800); x.fillStyle = '#b01b22';
      x.fillText('KTS', right, CARDH + 284);
      x.textAlign = 'left';
      /* 테두리 다시 — 흰 띠 위에도 금선이 이어지게 */
      x.strokeStyle = 'rgba(201,160,99,.55)'; x.lineWidth = 3; x.strokeRect(1.5, 1.5, W - 3, H - 3);

      exportPng();
    }

    if (me.photo) {
      toast('명함 이미지를 만드는 중입니다', 1600);
      var im = new Image();
      im.onload = function () { try { paint(im) } catch (e) { paint(null) } };
      im.onerror = function () { paint(null) };
      im.src = me.photo;
    } else paint(null);
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

    if (!LS.get(K.tip, {}).star && !S.items.some(function (x) { return x.demo })) {
      h += '<div class="bubble tip" id="tipStar"><b>★</b> 별표를 누르면 명함 맨 위「새 물건표」로 올라가 손님에게 먼저 보입니다.'
        + '<button id="tipStarX">알겠습니다</button></div>';
    }

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
    var ts = $('#tipStar');
    if (ts) $('#tipStarX').addEventListener('click', function () {
      var t = LS.get(K.tip, {}); t.star = 1; LS.set(K.tip, t); ts.remove();
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

    /* 안드로이드 [공유]로 들어온 문자는 곧바로 물건표로 (pending 을 바로 세팅해야 다시 그려도 살아남는다) */
    var shared = LS.get(K.shared, '');
    if (shared) {
      LS.set(K.shared, '');
      $('#raw').value = shared;
      if (g.KTS_PARSE) {
        pending = g.KTS_PARSE.parse(shared);
        viewNewPreview();
        return;
      }
    }

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
      /* 별표는 당사자가 직접 누를 때만 — 새 매물이 명함에 저절로 올라가지 않는다 */
      it.starred = false;
      S.items.push(it); save();
      pending = null;
      toast('매물장에 담았습니다 — 명함에 올리려면 매물장에서 ★를 누르세요', 3200);
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

  /* ---------------- ④ 상세 ---------------- */
  var mapView = {}, terrCache = {}, txQ = {};

  function priceOf(it) {
    var mode = it.priceMode || 'residual';
    var residual = it.residual != null ? it.residual
      : (it.price ? Math.max(0, it.price - (it.loan || 0) - (it.deposit || 0)) : null);
    return {
      mode: mode,
      residual: residual,
      label: mode === 'sale' ? '매매가' : (mode === 'exchange' ? '교환가' : '잔가(실투수)'),
      text: mode === 'sale' ? money(it.price) : (mode === 'exchange' ? (it.exchange ? money(it.exchange) : '교환 협의') : money(residual)),
      sub: [
        it.price && mode !== 'sale' ? '매매 ' + money(it.price) : '',
        residual != null && mode !== 'residual' ? '잔가 ' + money(residual) : '',
        it.loan ? '융자 ' + money(it.loan) + ' 승계' : ''
      ].filter(Boolean).join(' · ')
    };
  }

  function viewDetail(id) {
    var it = byId(id);
    if (!it) { go('#/list'); return; }
    ensureFull(it);
    if (!mapView[it.id]) mapView[it.id] = '지도';

    var gb = it.gb || {};
    var jiga = jigaPerM2(gb);
    var zone = zoneName(gb);
    var pr = priceOf(it);
    var owner = true;                       /* 이 화면은 주인(중개사) 화면 */
    var cover = it.cover || 0;
    var photos = (it.photos || []).filter(Boolean);

    var h = '';
    h += '<div class="dhead"><button class="icob" id="btnBack">' + IC.back + '</button>'
      + '<b>매물 상세</b><span class="sp"></span>'
      + '<button class="icob" id="btnEditItem" aria-label="매물 고치기">' + IC.pen + '</button>'
      + '<button class="icob" id="btnShareItem">' + IC.share + '</button></div>';
    if (editing === it.id) h += editBlock(it);

    /* ---- 사진: 대표 크게 + 보조 썸네일 정렬(282번) ---- */
    h += '<div class="hero2">';
    if (photos.length) {
      h += '<div class="hmain" id="hmain"><img src="' + esc(photos[cover] || photos[0]) + '" alt=""></div>';
      if (photos.length > 1) {
        h += '<div class="hthumbs">';
        photos.forEach(function (p, i) {
          h += '<button type="button" class="hth' + (i === cover ? ' on' : '') + '" data-ph="' + i + '"><img src="' + p + '" alt=""></button>';
        });
        h += '</div>';
      }
    } else {
      var m0 = mapImg(it, '위성');
      h += '<div class="hmain">' + (m0
        ? '<img src="' + m0 + '" alt="지적항공도" onerror="this.parentNode.classList.add(\'noimg-on\');this.remove()">'
        : '<div class="noimg">' + IC.map + '<span>사진을 넣으면 크게 보입니다</span></div>') + '<i class="tagmap">위성·지적 자동</i></div>';
    }
    h += '<button class="photo-add" id="btnPhoto">' + IC.plus + ' 사진</button>';
    h += '</div>';

    /* ---- 지도: 일반·위성·경사도·3D 선택(280번) ---- */
    h += '<div class="mapbox">';
    h += '<div class="mswitch" id="mswitch">';
    ['지도', '위성', '경사도', '3D'].forEach(function (v) {
      h += '<button type="button" data-map="' + v + '"' + (mapView[it.id] === v ? ' class="on"' : '') + '>' + v + '</button>';
    });
    h += '</div>';
    h += '<div class="mstage" id="mstage"></div>';
    h += '<p class="mnote" id="mnote"></p>';
    h += '</div>';

    /* ---- 제목 · 가격(잔가 기본 · 284번) ---- */
    h += '<div class="dtitle"><b>' + esc(it.title || '매물') + '</b>'
      + '<button class="star big' + (it.starred ? ' on' : '') + '" id="btnStar">' + (it.starred ? IC.starOn : IC.star) + '</button></div>';
    h += '<div class="price-big"><span>' + pr.label + '</span><b>' + esc(pr.text) + '</b>'
      + (pr.sub ? '<em>' + esc(pr.sub) + '</em>' : '') + '</div>';
    /* 주인 전용 선택창 — 손님 화면에는 나오지 않는다 */
    if (owner) {
      h += '<div class="pmode" id="pmode">';
      [['residual', '잔가'], ['sale', '매가'], ['exchange', '교환가']].forEach(function (x) {
        h += '<button type="button" data-pm="' + x[0] + '"' + (pr.mode === x[0] ? ' class="on"' : '') + '>' + x[1] + '</button>';
      });
      h += '</div>';
    }
    h += '<div class="kpis">'
      + '<div class="kpi"><span>면적</span><b>' + (it.areaP ? num(it.areaP) + '평' : '미정') + '</b><em>' + (it.areaM2 ? num(it.areaM2, 1) + '㎡' : '') + '</em></div>'
      + '<div class="kpi"><span>평당</span><b>' + (pyPrice(it) ? money(pyPrice(it)) : '—') + '</b></div>'
      + '<div class="kpi"><span>공시지가</span><b>' + (jiga ? num(jiga) + '원' : '—') + '</b><em>㎡당</em></div>'
      + '</div>';
    var jibunDup = it.jibun && String(it.addr || '').replace(/\s/g, '').indexOf(String(it.jibun).replace(/\s/g, '')) >= 0;
    if (it.addr) h += '<div class="addr">' + IC.map + '<span>' + esc(it.addr) + (it.jibun && !jibunDup ? ' (' + esc(it.jibun) + ')' : '') + '</span><button class="lnk sm" id="btnCopyAddr">복사</button></div>';
    if (it.tags && it.tags.length) h += '<div class="tags">' + it.tags.map(function (t) { return '<i>' + esc(t) + '</i>' }).join('') + '</div>';

    /* ---- 물건표(프리미엄 1장) ---- */
    h += '<div class="brief-cta">';
    h += '<div class="bc-h"><b>물건표 · 1장 브리핑</b><span>가로 16:9 · 세로 9:16</span></div>';
    h += '<div class="bc-acts"><a class="btn sm main" href="' + esc(posterUrl(it.id)) + '">물건표 열기 · 고치기</a>'
      + '<button class="btn sm" id="btnBriefImg">이미지 받기</button></div>';
    h += '<p class="tiny">손님에게는 잔가만 크게 보입니다. 권리·감정·실거래는 넣고 빼실 수 있습니다.</p>';
    h += '</div>';

    /* ---- 4대 공부 (접기) ---- */
    h += '<details class="acc" open><summary><b>4대 공부</b><span>' + gbLabel(it) + '</span></summary>';
    h += '<div class="gongbu">' + gongbuTiles(it, gb, jiga, zone) + '</div>';
    h += '<a class="wide ghost" href="../gongbu/?q=' + encodeURIComponent(it.addr || '') + '" target="_blank" rel="noopener">4대 공부 원문 · PDF/이미지 저장 ' + IC.doc + '</a>';
    if (it.gbSt === 'err' || it.gbSt === 'NOT_FOUND') h += '<button class="btn ghost wide2" id="btnRetry">4대 공부 다시 불러오기</button>';
    h += '<p class="credit">지도·지적 © 브이월드(Vworld) · 건축물대장 © 국토교통부 건축HUB</p>';
    h += '</details>';

    /* ---- 주변 실거래가 (자동 · 280번) ---- */
    h += '<details class="acc" id="accTx"><summary><b>주변 실거래가</b><span id="txSt">' + (it.tx && it.tx.length ? it.tx.length + '건' : '자동 확인') + '</span></summary>';
    h += '<div id="txBody">' + txHtml(it) + '</div>';
    h += '</details>';

    /* ---- 권리분석 ---- */
    h += '<details class="acc"><summary><b>권리분석</b><span>체크리스트</span></summary>' + rightHtml(it, gb) + '</details>';

    /* ---- 입지·개발 ---- */
    h += '<details class="acc"><summary><b>입지 · 개발 정보</b><span>' + esc(zone || '확인') + '</span></summary>' + locHtml(it, gb, zone) + '</details>';

    /* ---- 감정가 ---- */
    h += '<details class="acc"><summary><b>감정가 · 시세 판단</b><span>' + (it.appraisal ? money(it.appraisal) : '미입력') + '</span></summary>'
      + '<div class="block">' + (it.appraisal
        ? '<ul><li>감정가 <b>' + money(it.appraisal) + '</b>' + (it.price ? ' · 매매가 ' + money(it.price) + (it.appraisal > it.price ? ' (감정가 대비 ' + money(it.appraisal - it.price) + ' 낮음)' : '') : '') + '</li></ul>'
        : '<p class="dim">감정가를 넣으면 물건표에 함께 담깁니다. 매물 고치기에서 넣어 주세요.</p>')
      + '</div></details>';

    /* ---- AI 상담 — 말풍선(280번) ---- */
    h += '<button class="ai-bubble" id="btnAI" type="button"><i>💬</i><span>AI 상담에게 묻기</span></button>';

    $('#v-detail').innerHTML = h;

    /* --- 동작 --- */
    $('#btnBack').addEventListener('click', function () { history.length > 1 ? history.back() : go('#/list'); });
    $('#btnShareItem').addEventListener('click', function () { shareItem(it); });
    $('#btnEditItem').addEventListener('click', function () { editing = (editing === it.id) ? null : it.id; render(); });
    var edSave = $('#edSave');
    if (edSave) edSave.addEventListener('click', function () { saveEdit(it); });
    var edCancel = $('#edCancel');
    if (edCancel) edCancel.addEventListener('click', function () { editing = null; render(); });
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
    $$('[data-ph]').forEach(function (b) {
      b.addEventListener('click', function () { it.cover = +b.getAttribute('data-ph'); save(); viewDetail(it.id); });
    });
    $$('#mswitch button').forEach(function (b) {
      b.addEventListener('click', function () {
        mapView[it.id] = b.getAttribute('data-map');
        $$('#mswitch button').forEach(function (o) { o.classList.toggle('on', o === b); });
        paintMap(it);
      });
    });
    $$('#pmode button').forEach(function (b) {
      b.addEventListener('click', function () {
        it.priceMode = b.getAttribute('data-pm'); save(); viewDetail(it.id);
      });
    });
    $('#btnBriefImg').addEventListener('click', function () { briefImage(it); });
    var accTx = $('#accTx');
    if (accTx.addEventListener) accTx.addEventListener('toggle', function () { if (accTx.open) loadTx(it); });

    paintMap(it);
    if (it.tx === undefined) it.tx = null;
  }

  /* 지도 그림 주소 */
  function mapImg(it, kind) {
    if (!it.lat || !it.lon || !g.KTS_GB) return '';
    var base = kind === '위성' ? 'PHOTO' : (kind === '지적' ? 'PHOTO_HYBRID' : 'GRAPHIC');
    return KTS_GB.mapUrl(it.lat, it.lon, 900, 560, 16, base);
  }

  function paintMap(it) {
    var stage = $('#mstage'), note = $('#mnote');
    if (!stage) return;
    var v = mapView[it.id] || '지도';
    if (v === '지도' || v === '위성') {
      var src = mapImg(it, v);
      stage.className = 'mstage';
      stage.innerHTML = src
        ? '<img src="' + src + '" alt="' + v + '">'
        : '<div class="mhint">주소를 넣으면 ' + v + '가 자동으로 붙습니다</div>';
      if (note) note.textContent = v === '위성' ? '항공·위성 사진 (브이월드)' : '일반 지도 (브이월드)';
      return;
    }
    if (!it.lat || !it.lon) {
      stage.className = 'mstage';
      stage.innerHTML = '<div class="mhint">주소를 넣으면 지형을 계산합니다</div>';
      if (note) note.textContent = '';
      return;
    }
    var key = it.id + ':' + v;
    if (terrCache[it.id]) { paintTerr(stage, note, it, v, terrCache[it.id]); return; }
    stage.className = 'mstage loading';
    stage.innerHTML = '<div class="mhint">지형을 계산하는 중… <i class="dot wait"></i></div>';
    if (note) note.textContent = '공개 수치표고 타일을 받아 계산합니다 (한 번만)';
    if (terrCache['q' + it.id]) return;
    terrCache['q' + it.id] = 1;
    KTS_TERRAIN.load(it.lat, it.lon, function (D) {
      terrCache['q' + it.id] = 0;
      if (!D.ok) {
        stage.className = 'mstage';
        stage.innerHTML = '<div class="mhint">' + esc(D.msg || '지형을 받지 못했습니다') + '</div>';
        return;
      }
      terrCache[it.id] = D;
      if (mapView[it.id] === v) paintTerr(stage, note, it, v, D);
    });
  }
  function paintTerr(stage, note, it, v, D) {
    stage.className = 'mstage';
    stage.innerHTML = '<canvas id="terrCv"></canvas>';
    var cv = $('#terrCv');
    var w = Math.max(300, stage.clientWidth || 360);
    cv.width = Math.round(w * 2); cv.height = Math.round(w * 1.24 * 2);
    cv.style.width = '100%'; cv.style.height = 'auto';
    if (v === '3D') KTS_TERRAIN.threeView(cv, D);
    else KTS_TERRAIN.slopeView(cv, D);
    if (note) {
      note.textContent = v === '3D'
        ? '표고 ' + Math.round(D.min) + '~' + Math.round(D.max) + 'm · 30m 공개 DEM 참고 그림'
        : '필지 주변 평균 경사 ' + D.mean.toFixed(1) + '° · 30m 공개 DEM 참고값(현장 실측 아님)';
    }
  }

  /* 물건표 PNG 한 장 — 손님도 주인도 한 번에 */
  function briefImage(it) {
    if (!g.KTS_BRIEF) { toast('잠시 후 다시 시도해 주세요'); return; }
    if (isKakao && !isIOS) { toast('카톡 안에서는 저장이 막힙니다 — 크롬에서 저장합니다', 2400); setTimeout(openChrome, 700); return; }
    toast('물건표 이미지를 만드는 중입니다', 2000);
    var m = KTS_BRIEF.build(it, S.me);
    KTS_BRIEF.toCanvas(m, 'port', 2, function (cv) {
      cv.toBlob(function (bum) {
        if (!bum) { toast('이미지를 만들지 못했습니다'); return; }
        var url = URL.createObjectURL(bum);
        var a = document.createElement('a');
        a.href = url;
        a.download = String(it.title || '물건표').replace(/[\\/:*?"<>|]/g, '').slice(0, 26) + '_물건표.png';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { try { URL.revokeObjectURL(url) } catch (e) { } }, 6000);
        toast('물건표 이미지를 저장했습니다 — 카톡·문자로 그대로 보내세요', 3600);
      }, 'image/png');
    });
  }

  /* 주변 실거래가 — 자동 채우기 */
  function txHtml(it) {
    if (it.tx && it.tx.length) {
      return '<div class="txlist">' + it.tx.map(function (r) {
        return '<div class="txrow"><b>' + esc(r.jibun || r.addr || '주변') + '</b>'
          + '<span>' + esc(r.area || '') + ' · ' + esc(r.ym || '') + '</span>'
          + '<em>' + (r.amount ? money(r.amount) : esc(r.amt || '')) + '</em></div>';
      }).join('') + '</div>'
        + '<p class="tiny">국토교통부 실거래가 공개 자료 · 같은 읍·면·동 최근 거래</p>';
    }
    if (it.txSt === 'loading') return '<p class="dim">실거래가를 불러오는 중…</p>';
    if (it.txSt === 'nokey') {
      return '<div class="block"><p class="dim">실거래가 자동 조회는 공공데이터 인증키가 있어야 합니다. 한 번만 넣어 두면 이 기기에서 계속 자동으로 채웁니다.</p>'
        + '<div class="keyrow"><input id="txKey" type="text" placeholder="공공데이터포털 인증키(일반)" autocomplete="off"><button class="btn sm" id="txKeySave">넣기</button></div>'
        + '<p class="tiny" style="text-align:left">받는 곳 — data.go.kr → 「국토교통부_토지매매 실거래가」 활용신청</p></div>';
    }
    if (it.txSt === 'fail') {
      return '<p class="dim">' + esc(it.txMsg || '실거래가를 받지 못했습니다.') + ' · <a class="lnk" href="https://rt.molit.go.kr/" target="_blank" rel="noopener">실거래가 열기</a></p>';
    }
    return '<p class="dim">해당 지번을 먼저 찾고, 없으면 같은 읍·면·동의 최근 5건을 채웁니다.</p>'
      + '<button class="btn sm" id="txGo">실거래가 자동 채우기</button>';
  }
  function loadTx(it) {
    if (it.txSt === 'loading') return;
    if (it.tx && it.tx.length) return;
    if (!g.KTS_TX) return;
    if (!KTS_TX.key()) {
      it.txSt = 'nokey';
      var b = $('#txBody'); if (b) { b.innerHTML = txHtml(it); bindTx(it); }
      return;
    }
    if (!it.pnu) {
      it.txSt = 'fail'; it.txMsg = '필지(PNU)를 먼저 확인해야 합니다. 주소를 넣고 4대 공부를 불러와 주세요.';
      var b2 = $('#txBody'); if (b2) { b2.innerHTML = txHtml(it); bindTx(it); }
      return;
    }
    it.txSt = 'loading';
    var b3 = $('#txBody'); if (b3) { b3.innerHTML = txHtml(it); }
    KTS_TX.nearby({ pnu: it.pnu, addr: it.addr, jibun: it.jibun, kind: it.kind }, function (r) {
      if (r.ok) { it.tx = r.items; it.txSt = 'ok'; }
      else if (r.why === 'nokey') it.txSt = 'nokey';
      else if (r.why === 'badkey') { it.txSt = 'fail'; it.txMsg = '인증키가 이 서비스에 등록되어 있지 않습니다'; }
      else { it.txSt = 'fail'; it.txMsg = '주변 실거래를 찾지 못했습니다'; }
      save();
      var b4 = $('#txBody'); if (b4) { b4.innerHTML = txHtml(it); bindTx(it); }
      var st = $('#txSt'); if (st) st.textContent = it.tx ? it.tx.length + '건' : '직접 확인';
    });
  }
  function bindTx(it) {
    var g2 = $('#txGo');
    if (g2) g2.addEventListener('click', function () { loadTx(it); });
    var ks = $('#txKeySave');
    if (ks) ks.addEventListener('click', function () {
      var v = ($('#txKey') && $('#txKey').value || '').trim();
      if (!v) { toast('인증키를 붙여넣어 주세요'); return; }
      KTS_TX.setKey(v); it.txSt = ''; loadTx(it);
    });
  }

  /* 권리·입지 블록 */
  function rightHtml(it, gb) {
    var chk = ['등기부등본 갑구(소유권)·을구(근저당·가압류)', '토지대장·건축물대장 확인', '국세·지방세 완납증명'];
    if (['답', '농지', '과수원'].indexOf(it.kind) >= 0) chk.push('농지취득자격증명, 농지전용 여부');
    if (it.kind === '임야') chk.push('산지관리법 산지전용·입목 확인');
    if (['대지', '주택', '상가', '공장', '창고'].indexOf(it.kind) >= 0) chk.push('건축물대장 용도·위반건축물·사용승인');
    if (useNames(gb).some(function (u) { return /토지거래/.test(u) })) chk.push('토지거래허가구역 — 허가 필요');
    return '<div class="block"><ul class="chk">' + chk.map(function (c) { return '<li>' + esc(c) + '</li>' }).join('') + '</ul>'
      + '<a class="btn sm ghost" href="https://www.iros.go.kr/" target="_blank" rel="noopener">인터넷등기소 열기</a></div>';
  }
  function locHtml(it, gb, zone) {
    var ch = gb.char || {};
    var pos = [];
    if (ch.roadSideCodeNm) pos.push('도로접면 ' + ch.roadSideCodeNm);
    if (ch.tpgrphHgCodeNm) pos.push('경사 ' + ch.tpgrphHgCodeNm);
    if (ch.tpgrphFrmCodeNm) pos.push('형상 ' + ch.tpgrphFrmCodeNm);
    if (ch.ladUseSittnNm) pos.push('이용상황 ' + ch.ladUseSittnNm);
    if (zone) pos.push('용도지역 ' + zone + (ZONE[zone] ? ' (건폐 ' + ZONE[zone][0] + '%·용적 ' + ZONE[zone][1] + '%)' : ''));
    var out = '<div class="block">';
    out += pos.length ? '<ul>' + pos.map(function (p) { return '<li>' + esc(p) + '</li>' }).join('') + '</ul>'
      : '<p class="dim">4대 공부를 불러오면 도로·경사·용도지역이 채워집니다.</p>';
    out += '<a class="btn sm ghost" href="https://www.eum.go.kr/web/am/amMain.jsp" target="_blank" rel="noopener">토지이음 열기</a></div>';
    return out;
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
      bTxt = '건축물 없음';
      if (it.kind === '대지') bSub = '나대지';
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
      l1: it.jibun ? '지번 ' + it.jibun : (it.pnu ? '필지 확인됨' : '필지 확인 중'),
      l2: it.pnu ? 'PNU ' + it.pnu : ''
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

  function erow(id, label, val, ph) {
    return '<label class="fl"><span>' + label + '</span>'
      + '<input id="' + id + '" type="text" value="' + esc(val == null ? '' : val) + '" placeholder="' + esc(ph || '') + '" autocomplete="off"></label>';
  }
  function editBlock(it) {
    var sec = it.sections || {};
    function sw(k, label, on) {
      return '<label class="swrow"><span>' + label + '</span><input type="checkbox" id="e-sec-' + k + '"' + (on ? ' checked' : '') + '><i></i></label>';
    }
    return '<div class="block edit"><h3>매물 고치기</h3>'
      + erow('e-title', '제목', it.title, '예) 임야 1,200평 · 북면')
      + erow('e-addr', '소재지', it.addr, '예) 경기도 가평군 북면 목동리 271')
      + '<div class="two">'
      + erow('e-m2', '면적(㎡)', it.areaM2 || '', '예) 3967')
      + erow('e-price', '매매가(만원)', it.price ? Math.round(it.price / 1e4) : '', '예) 38000')
      + '</div>'
      + '<div class="two">'
      + erow('e-loan', '융자 승계(만원)', it.loan ? Math.round(it.loan / 1e4) : '', '예) 15000')
      + erow('e-residual', '잔가(만원)', it.residual ? Math.round(it.residual / 1e4) : '', '비우면 자동')
      + '</div>'
      + '<div class="two">'
      + erow('e-exchange', '교환가(만원)', it.exchange ? Math.round(it.exchange / 1e4) : '', '예) 40000')
      + erow('e-appraisal', '감정가(만원)', it.appraisal ? Math.round(it.appraisal / 1e4) : '', '예) 45000')
      + '</div>'
      + erow('e-tags', '특징 (쉼표로 구분)', (it.tags || []).join(', '), '예) 도로접, 평지')
      + '<div class="sec-toggles"><b>물건표에 넣기</b>'
      + sw('right', '권리분석', sec.right !== 0)
      + sw('tx', '주변 실거래', sec.tx !== 0)
      + sw('appraisal', '감정가', sec.appraisal !== 0)
      + '</div>'
      + '<div class="row2"><button class="btn sm main" id="edSave">저장</button>'
      + '<button class="btn sm" id="edCancel">취소</button></div>'
      + '<p class="tiny" style="text-align:left;margin-top:8px">주소를 고치면 4대 공부·지적항공도를 새로 받습니다.</p></div>';
  }
  function saveEdit(it) {
    var v = function (id) { var el = $('#' + id); return el ? el.value : ''; };
    var man = function (id) {
      var n = parseFloat(String(v(id)).replace(/[^\d.]/g, ''));
      return (isFinite(n) && n > 0) ? Math.round(n) * 10000 : null;
    };
    var addr = v('e-addr').trim();
    var m2 = parseFloat(String(v('e-m2')).replace(/[^\d.]/g, ''));
    it.title = v('e-title').trim() || it.title;
    if (addr !== it.addr) {
      it.addr = addr; it.gb = null; it.lat = null; it.lon = null; it.pnu = ''; it.jibun = ''; it.gbSt = 'none';
      delete fullQ[it.id]; delete geoQ[it.id]; delete terrCache[it.id];
    }
    it.areaM2 = (isFinite(m2) && m2 > 0) ? m2 : null;
    it.areaP = it.areaM2 ? Math.round(it.areaM2 / 3.305785) : null;
    it.price = man('e-price');
    it.loan = man('e-loan');
    it.residual = man('e-residual');
    it.exchange = man('e-exchange');
    it.appraisal = man('e-appraisal');
    it.tags = String(v('e-tags')).split(/[,\s]+/).filter(Boolean);
    it.sections = {
      right: ($('e-sec-right') && $('e-sec-right').checked) ? 1 : 0,
      tx: ($('e-sec-tx') && $('e-sec-tx').checked) ? 1 : 0,
      appraisal: ($('e-sec-appraisal') && $('e-sec-appraisal').checked) ? 1 : 0
    };
    editing = null; save(); render();
    if (!it.gb && it.addr) ensureFull(it);
    toast('고쳤습니다');
  }

  function shareItem(it) {
    var pr = priceOf(it);
    var url = posterUrl(it.id, true);
    var text = (it.title || '') + ' · ' + pr.label + ' ' + pr.text + '\n' + (it.addr || '') + '\n' + url;
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

  function compress(file, cb, maxW, q) {
    var r = new FileReader();
    r.onload = function () {
      var img = new Image();
      img.onload = function () {
        var w = maxW || 900, h = Math.round(img.height * (w / img.width));
        if (img.width < w) { w = img.width; h = img.height; }
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        try { cb(c.toDataURL('image/jpeg', q || 0.7)) } catch (e) { cb(r.result) }
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
    var cur = { photo: me.photo || '' };
    var h = '';
    h += '<div class="page-h"><b>' + (S.me ? '명함 고치기' : '내 명함 만들기') + '</b><span>사진 · 10초</span></div>';

    /* 프로필 사진 */
    h += '<div class="photobox">';
    h += '<div class="pv" id="mePv">' + (cur.photo
      ? '<img src="' + esc(cur.photo) + '" alt="프로필 사진">'
      : '<b>' + esc((me.name || '?').slice(0, 1)) + '</b>') + '</div>';
    h += '<div class="pbtns">'
      + '<button class="btn sm main" id="btnPickMe" type="button">내 사진 넣기</button>'
      + '<button class="btn sm" id="btnSampleMe" type="button">예시 사진</button>'
      + '<button class="btn sm ghost" id="btnClearMe" type="button">지우기</button>'
      + '<em>얼굴이 잘 보이는 세로 사진이 명함에 가장 잘 어울립니다.</em>'
      + '</div></div>';

    h += '<div class="form">';
    h += field('org', '상호 (회사·사무소 이름)', me.org, '예) KTS 원클릭 공인중개사');
    h += field('title', '직책', me.title, '예) 대표');
    h += field('name', '이름', me.name, '예) 김태수');
    h += '<div class="two-col">' + field('phone', '전화번호', me.phone, '010-0000-0000', 'tel')
      + field('fax', '팩스 (선택)', me.fax, '02-000-0000', 'tel') + '</div>';
    h += field('email', '이메일 (선택)', me.email, 'name@example.com', 'email');
    h += field('bizAddr', '사무실 주소 (선택)', me.bizAddr, '예) 경기 가평군 조종면 …');
    h += field('field', '전문 분야 (배지)', me.field, '예) 교환·급매물 전문');
    h += field('strength', '핵심 장점 한 줄', me.strength, '예) 급매 3건 · 평당 시세 즉시 비교');
    h += field('intro', '상태메시지 · 인삿말', me.intro, '예) 가평·남양주 토지와 전원주택 — 문자 주시면 5초 만에 물건표로 보내 드립니다.');
    h += field('kakao', '카톡 ID나 오픈채팅 주소 (선택)', me.kakao, '예) open.kakao.com/o/abcd');
    h += '</div>';

    /* 직인 도장 QR — 모양 3종 + QR에 담을 것 */
    h += '<div class="seal-set"><div class="ss-h"><b>직인 도장 QR</b><em>명함·포스터에 찍히는 도장</em></div>';
    h += '<div class="seal-shapes" id="sealShapes">';
    [['circle', '원형'], ['square', '사각'], ['oval', '타원']].forEach(function (p) {
      h += '<button type="button" class="ss-btn' + (sealShape() === p[0] ? ' on' : '') + '" data-shape="' + p[0] + '">'
        + '<i class="ss-ico ' + p[0] + '"></i>' + p[1] + '</button>';
    });
    h += '</div>';
    h += '<div class="seal-prev" id="sealPrev"></div>';
    h += '<label class="seal-kind"><span>QR에 담을 것</span><select id="f-qr">'
      + '<option value="url"' + ((me.qrKind || 'url') === 'url' ? ' selected' : '') + '>전자명함 주소(누구나 열림)</option>'
      + '<option value="contact"' + (me.qrKind === 'contact' ? ' selected' : '') + '>연락처 — 찍으면 명함 저장</option>'
      + '</select></label></div>';

    h += '<button class="big" id="btnSaveMe">저장</button>';
    if (!S.me) h += '<button class="btn ghost wide2" id="btnDemoMe">예시로 채우고 둘러보기</button>';
    $('#v-setup').innerHTML = h;

    function paintPv() {
      $('#mePv').innerHTML = cur.photo
        ? '<img src="' + esc(cur.photo) + '" alt="프로필 사진">'
        : '<b>' + esc((($('#f-name') && $('#f-name').value) || me.name || '?').slice(0, 1)) + '</b>';
    }
    $('#btnPickMe').addEventListener('click', function () {
      var inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*';
      inp.addEventListener('change', function () {
        var f = inp.files && inp.files[0];
        if (!f) return;
        compress(f, function (data) {
          cur.photo = data; paintPv(); toast('사진을 넣었습니다 — 저장을 눌러 주세요');
        }, 320, 0.82);
      });
      inp.click();
    });
    $('#btnSampleMe').addEventListener('click', function () {
      cur.photo = 'img/sample_person.jpg'; paintPv();
      toast('예시 인물 사진입니다 — 「내 사진 넣기」로 바꿔 주세요');
    });
    $('#btnClearMe').addEventListener('click', function () {
      cur.photo = ''; paintPv(); toast('사진을 지웠습니다 — 이름 첫 글자로 표시됩니다');
    });

    /* 직인 미리보기 — 이름·모양을 바꾸면 바로 다시 그린다 */
    var previewShape = sealShape();
    function paintPreview() {
      var box = $('#sealPrev'); if (!box) return;
      box.innerHTML = '';
      var cv = document.createElement('canvas');
      box.appendChild(cv);
      var nameV = ($('#f-name') && $('#f-name').value) || me.name || '';
      var kind = ($('#f-qr') && $('#f-qr').value) || 'url';
      try {
        KTS.Seal.paint(cv, 140, { shape: previewShape, name: nameV,
          value: KTS.Seal.payload({ name: nameV, phone: ($('#f-phone') && $('#f-phone').value) || me.phone, org: ($('#f-org') && $('#f-org').value) || me.org, qrKind: kind }) });
      } catch (e) { }
    }
    $$('#sealShapes .ss-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        previewShape = b.getAttribute('data-shape');
        $$('#sealShapes .ss-btn').forEach(function (o) { o.classList.toggle('on', o === b) });
        paintPreview();
      });
    });
    ['#f-name', '#f-phone', '#f-org'].forEach(function (sel) {
      var el2 = $(sel); if (el2) el2.addEventListener('input', paintPreview);
    });
    if ($('#f-qr')) $('#f-qr').addEventListener('change', paintPreview);
    paintPreview();

    $('#btnSaveMe').addEventListener('click', function () {
      var name = ($('#f-name').value || '').trim();
      if (!name) { toast('이름을 넣어 주세요'); $('#f-name').focus(); return; }
      var org = ($('#f-org').value || '').trim();
      var title = ($('#f-title') ? $('#f-title').value || '' : '').trim();
      S.me = {
        name: name,
        org: org,
        title: title,
        phone: ($('#f-phone').value || '').trim(),
        fax: ($('#f-fax') ? $('#f-fax').value || '' : '').trim(),
        email: ($('#f-email') ? $('#f-email').value || '' : '').trim(),
        bizAddr: ($('#f-bizAddr') ? $('#f-bizAddr').value || '' : '').trim(),
        field: ($('#f-field').value || '').trim(),
        strength: ($('#f-strength').value || '').trim(),
        intro: ($('#f-intro').value || '').trim(),
        kakao: g.KTS_PARSE ? KTS_PARSE.normUrl($('#f-kakao').value || '') : ($('#f-kakao').value || '').trim(),
        photo: cur.photo || '',
        stamp: previewShape,
        qrKind: ($('#f-qr') && $('#f-qr').value) || 'url'
      };
      save(); toast('저장했습니다');
      go(LS.get(K.shared, '') ? '#/new' : '#/card');
    });
    var bd = $('#btnDemoMe');
    if (bd) bd.addEventListener('click', function () {
      S.me = {
        name: '김태수', org: 'KTS 원클릭 공인중개사', title: '대표', phone: '010-2002-2899',
        fax: '031-585-0000', email: 'kts@autooneclick.com', bizAddr: '경기 가평군 조종면 신하리 162-9',
        field: '교환·급매물 전문', strength: '급매 3건 · 평당 시세 즉시 비교',
        intro: '가평·남양주 토지와 전원주택 — 문자 주시면 5초 만에 물건표로 보내 드립니다.',
        kakao: '', photo: 'img/sample_person.jpg'
      };
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
  var isKakao = /KAKAOTALK/i.test(ua) || /[?&]kakao=1/.test(location.search);
  var isIOS = /iPhone|iPad|iPod/i.test(ua);
  var isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;

  function doInstall() {
    if (isStandalone) { toast('이미 바탕화면 아이콘으로 열려 있습니다'); return; }
    /* 카톡 인앱 브라우저는 홈 화면 추가가 아예 막힌다 — 안내만 띄우지 말고 크롬으로 바로 탈출 */
    if (isKakao && !isIOS) {
      toast('카톡 안에서는 설치가 막힙니다 — 크롬으로 엽니다', 2000);
      openChrome();
      return;
    }
    if (isKakao && isIOS) {
      toast('아이폰은 오른쪽 위 ⋯ → 「Safari로 열기」를 누른 뒤 홈 화면에 추가해 주세요', 5000);
      return;
    }
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then(function (c) {
        if (c.outcome === 'accepted') { installed = true; LS.set(K.inst, Date.now()); toast('바탕화면에 아이콘을 만들었습니다'); render(); }
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
      b.addEventListener('click', openChrome);
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

  /* ---------------- [공유]로 들어온 문자 받기 ---------------- */
  /* 안드로이드에서 문자·카톡을 꾹 눌러 [공유 → 전자명함]을 고르면
     manifest 의 share_target 이 ?title=&text=&url= 로 이 앱을 연다. */
  function takeShared() {
    var q = String(location.search || '').replace(/^\?/, '');
    if (!q) return '';
    var p;
    try { p = new URLSearchParams(q) } catch (e) { return ''; }
    var title = (p.get('title') || '').trim();
    var text = (p.get('text') || '').trim();
    var url = (p.get('url') || '').trim();
    var body = (text || title || url || '').trim();
    if (!body) return '';
    /* 새로고침해도 다시 파싱하지 않게 주소의 공유값을 지운다 */
    try { history.replaceState(null, '', location.pathname + (location.hash || '')); } catch (e) { }
    return body.slice(0, 4000);
  }

  /* ---------------- 시작 ---------------- */
  function boot() {
    /* 검수용: ?reset=1 이면 이 기기의 매물장·명함을 비우고 처음부터 */
    if (/[?&]reset=1/.test(location.search)) {
      [K.me, K.items, K.plan, K.seen, K.inq, K.tip, K.inst].forEach(function (k) { try { localStorage.removeItem(k) } catch (e) { } });
      S.me = null; S.items = null; S.plan = 'free';
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(function () { });
    }
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault(); installPrompt = e;
      var b = $('#btnInstall'); if (b) b.classList.add('ready');
    });
    window.addEventListener('appinstalled', function () {
      installed = true; LS.set(K.inst, Date.now());
      toast('바탕화면에 아이콘을 만들었습니다'); render();
    });
    window.addEventListener('hashchange', render);
    /* 직인 도장 QR 크게 보기 */
    if ($('#sealX')) $('#sealX').addEventListener('click', closeSeal);
    if ($('#sealSave')) $('#sealSave').addEventListener('click', saveSealImage);
    if ($('#sealShape')) $('#sealShape').addEventListener('click', cycleSealShape);
    if ($('#sealBox')) $('#sealBox').addEventListener('click', function (e) { if (e.target === this) closeSeal(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSeal(); });
    $('#aiX').addEventListener('click', closeSheet);
    $('#sheet').addEventListener('click', function (e) { if (e.target === $('#sheet')) closeSheet(); });
    if (isStandalone) installed = true;
    if (!S.items && !/^#\/g\//.test(location.hash || '')) seedDemo();

    /* PWA [공유](share_target) — 문자·카톡에서 공유하면 ?title=&text= 로 들어온다 */
    var shared = takeShared();
    if (shared) {
      LS.set(K.shared, shared);
      location.hash = S.me ? '#/new' : '#/setup';
      render();
      if (S.me) toast('공유한 문자를 물건표로 만드는 중입니다');
    }

    if (!location.hash) location.hash = S.me ? '#/card' : '#/setup';
    render();
    kakaoBar();
    if (!S.me && !/^#\/g\//.test(location.hash || '')) go('#/setup');
  }

  g.KTS_APP = { go: go, state: S, cardPng: saveCardImage, chromeIntent: chromeIntentUrl,
    guestLink: guestLink, posterUrl: posterUrl, briefImage: briefImage, priceOf: priceOf };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
