/* ==========================================================================
   물건표 스튜디오 (285·271·281·282·283·284번)
   --------------------------------------------------------------------------
   · 화면은 배치도 그대로(가로 16:9 / 세로 9:16), 저장은 같은 배치로 캔버스.
   · 글자를 누르면 그 자리에 입력칸이 떠서 바로 고친다(260번).
   · 주인: 도구(사진·가격 기준·항목 넣고 빼기·경계 찍기).
     손님(?m= 링크): 도구 없이 「이미지 받기」와 전화만.
   ========================================================================== */
(function () {
  'use strict';

  var B = window.KTS_BRIEF;
  var $ = function (s) { return document.querySelector(s) };
  var VW_KEY = '0C4AD93D-75D2-447B-B533-C5ADDD4A5B2F';
  var STATE = 'kts_poster_state';

  var M = null, orient = 'land', guest = false, marking = false, scale = 1;
  var canvases = {};

  function st_qs_orient() { return /[?&]o=(land|port)/.test(location.search) }
  function qs(k) {
    var m = location.search.match(new RegExp('[?&]' + k + '=([^&]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }
  function toast(msg, ms) {
    var t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove('on') }, ms || 2600);
  }
  function LS(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v) } catch (e) { return d } }
  function LSSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) { } }

  function mapUrl(lat, lon) {
    if (!lat || !lon) return '';
    return 'https://api.vworld.kr/req/image?service=image&request=getmap&key=' + encodeURIComponent(VW_KEY)
      + '&domain=autooneclick.com&format=png&basemap=PHOTO_HYBRID'
      + '&center=' + (+lon).toFixed(6) + ',' + (+lat).toFixed(6) + '&zoom=16&size=1000,700&crs=EPSG:4326';
  }

  /* ---------------- 모델 만들기 ---------------- */
  function fromStore(id) {
    var items = LS('kts_bc_items', []) || [];
    var me = (window.KTSProfile && KTSProfile.me()) || LS('kts_bc_me', {}) || {};
    var it = null;
    for (var i = 0; i < items.length; i++) if (items[i].id === id) it = items[i];
    if (!it) return null;
    var m = B.build(it, me);
    m.map = it.map || mapUrl(it.lat, it.lon);
    m.itemId = it.id;
    m.polygon = it.polygon || null;
    return m;
  }

  /* 매물장(listing) 매물 → 물건표 모델 */
  function fromListing(L, broker) {
    if (!L) return null;
    var p = L.price || {}, f = L.facts || {};
    var site = parseFloat(String(f.site || L.site || '').replace(/[^\d.]/g, ''));
    var gross = parseFloat(String(f.gross || L.gross || '').replace(/[^\d.]/g, ''));
    var it = {
      id: L.id,
      title: L.title || '매물',
      addr: L.address || '',
      kind: L.type || '',
      areaM2: site || null,
      areaP: site ? Math.round(site / 3.305785) : null,
      price: p.sale ? p.sale * 1e4 : null,
      loan: p.loanAmount ? p.loanAmount * 1e4 : null,
      residual: p.realInvest ? p.realInvest * 1e4 : null,
      appraisal: p.appraisal ? p.appraisal * 1e4 : null,
      deposit: p.deposit ? p.deposit * 1e4 : null,
      tags: (L.points || []).map(function (x) { return x.t }).filter(Boolean).slice(0, 3),
      photos: (L.photos || []).slice(0, 4),
      lat: L.lat, lon: L.lng,
      gb: {
        char: {
          lndcgrCodeNm: L.type || '',
          lndpclAr: site || null,
          roadSideCodeNm: f.road || '',
          pblntfPclnd: f.landPrice ? +String(f.landPrice).replace(/[^\d]/g, '') : null
        },
        use: f.zone ? [{ nm: f.zone }] : [],
        bld: (f.built || f.use) ? { st: 'OK', items: [{ mainPurpsCdNm: f.use || '', strctCdNm: f.structure || '', grndFlrCnt: f.floors || null, totArea: gross || null }] } : { st: 'EMPTY' }
      }
    };
    it.map = mapUrl(L.lat, L.lng);
    var me = broker || {};
    var m = B.build(it, {
      org: me.office || me.org || me.company || 'KTS 원클릭 공인중개사',
      title: me.title || '대표',
      name: me.name || '김태수',
      phone: me.phone || '010-2002-2899',
      fax: me.fax || '', email: me.email || '', addr: me.address || '',
      stamp: 'circle'
    });
    m.use = (L.points || []).map(function (x) { return x.t }).filter(Boolean).slice(0, 3).join(' · ') || '용도 협의';
    return m;
  }

  function demo() {
    var it = {
      id: 'demo', title: '가평 신하리 사계절 풀빌라 부지', titleAccent: '매매 브리핑',
      point: '계곡 150m · 도로접 15필지 일괄',
      addr: '경기도 가평군 조종면 신하리 162-9 외 14필지',
      kind: '대지', areaM2: 5434, areaP: 1644, price: 950000000, residual: 950000000,
      tags: ['도로접', '평지', '계곡'],
      photos: ['../bizcard/img/sample_land.jpg', '../bizcard/img/sample_house.jpg', 'img/ex4.jpg', 'img/ex2.jpg'],
      gb: {
        char: { lndcgrCodeNm: '대지', lndpclAr: 5434, roadSideCodeNm: '중로한면', tpgrphHgCodeNm: '완경사', pblntfPclnd: 51700, prposArea1Nm: '계획관리지역' },
        use: [{ nm: '계획관리지역' }],
        price: { pblntfPclnd: 51700, stdrYear: '2026' },
        bld: { st: 'EMPTY' }
      }
    };
    var me = {
      org: 'KTS 원클릭 공인중개사', title: '대표', name: '김태수', phone: '010-2002-2899',
      fax: '031-585-0000', email: 'kts@autooneclick.com',
      intro: '숫자만 보여 드리지 않겠습니다. 계약 전 등기부와 토지대장 원본으로 권리관계를 다시 확인하고, 현장까지 함께 걸어 보겠습니다.'
    };
    var m = B.build(it, me);
    m.use = '풀빌라 단지 · 연수원 · 수익형 분할 매각';
    return m;
  }

  function applyMode(m, mode) {
    var money = m.money || (m.money = {});
    money.mode = mode;
    money.label = mode === 'sale' ? '매 매 가' : (mode === 'exchange' ? '교 환 가' : '실인수 잔가');
    money.value = mode === 'sale' ? B.won(money.sale) : (mode === 'exchange' ? (money.exchange ? B.won(money.exchange) : '협의') : B.won(money.residual));
    money.note = mode === 'sale' ? '(부가세·취득세 별도)' : (mode === 'exchange' ? '(교환 조건 협의)' : '(보증금·대출 승계 제외)');
    money.sub = [
      money.sale ? '매매 ' + B.eok(money.sale) : '',
      money.residual && mode !== 'residual' ? '잔가 ' + B.eok(money.residual) : '',
      money.exchange ? '교환 ' + B.eok(money.exchange) : ''
    ].filter(Boolean).join(' · ');
  }

  /* ---------------- 그리기 ---------------- */
  function render() {
    var wrap = $('#pwrap');
    var html = B.dom(M, orient);
    wrap.innerHTML = '<div class="pbs" style="transform-origin:top left">' + html + '</div>';
    var P = B.plan(M, orient);
    var avail = Math.max(280, ($('#stage').clientWidth || 380) - 20);
    scale = Math.min(1, avail / P.W);
    var inner = wrap.firstChild;
    inner.style.transform = 'scale(' + scale + ')';
    inner.style.width = P.W + 'px';
    inner.style.height = P.H + 'px';
    wrap.style.width = Math.round(P.W * scale) + 'px';
    wrap.style.height = Math.round(P.H * scale) + 'px';
    wrap.style.margin = '0 auto';
    window.KTS_POSTER = { model: M, plan: P, orient: orient };
    if (marking && !guest) addMarkOverlay(P);
    bindEdit();
    bindSeal();
  }

  function bindSeal() {
    var slot = $('.pb-seal');
    if (!slot || !window.KTS || !KTS.Seal) return;
    var cv = document.createElement('canvas');
    cv.width = 200; cv.height = 200;
    try {
      KTS.Seal.paint(cv, 200, {
        shape: (M.broker && M.broker.stamp) || 'circle',
        name: M.broker.name || '',
        value: KTS.Seal.payload({ name: M.broker.name, phone: M.broker.phone, org: M.broker.org, qrKind: 'url' })
      });
      cv.style.width = '100%';
      cv.style.height = '100%';
      slot.innerHTML = '';
      slot.appendChild(cv);
    } catch (e) { }
  }

  /* ---------------- 글자 직접 고치기 ---------------- */
  function bindEdit() {
    if (guest) return;
    Array.prototype.forEach.call(document.querySelectorAll('[data-edit]'), function (el) {
      el.addEventListener('click', function (ev) {
        if (marking) return;
        ev.preventDefault(); ev.stopPropagation();
        openEditor(el, el.getAttribute('data-edit'));
      });
    });
  }

  function getField(key) {
    var p = key.split(':');
    if (p[0] === 'spec') return M.specs[+p[1]] ? M.specs[+p[1]][1] : '';
    if (p[0] === 'point') return M.points[+p[1]] || '';
    if (key === 'title') return M.title;
    if (key === 'titleAccent') return M.titleAccent;
    if (key === 'point') return M.point;
    if (key === 'addr') return M.addr;
    if (key === 'price') return M.money.value;
    if (key === 'use') return M.use;
    if (key === 'org') return M.broker.org;
    if (key === 'who') return ((M.broker.title ? M.broker.title + ' ' : '') + M.broker.name).trim();
    if (key === 'phone') return M.broker.phone;
    return '';
  }
  function setField(key, v) {
    var p = key.split(':');
    if (p[0] === 'spec') { if (M.specs[+p[1]]) M.specs[+p[1]][1] = v; return; }
    if (p[0] === 'point') { M.points[+p[1]] = v; return; }
    if (key === 'title') M.title = v;
    else if (key === 'titleAccent') M.titleAccent = v;
    else if (key === 'point') M.point = v;
    else if (key === 'addr') M.addr = v;
    else if (key === 'price') M.money.value = v;
    else if (key === 'use') M.use = v;
    else if (key === 'org') M.broker.org = v;
    else if (key === 'who') {
      var t = v.trim().split(/\s+/);
      if (t.length > 1) { M.broker.title = t[0]; M.broker.name = t.slice(1).join(' '); }
      else M.broker.name = v;
    }
    else if (key === 'phone') M.broker.phone = v;
  }

  function openEditor(el, key) {
    var r = el.getBoundingClientRect();
    var box = $('#edov'), ta = $('#edta');
    var fs = parseFloat(getComputedStyle(el).fontSize) * scale;
    var w = Math.max(120, Math.min(window.innerWidth - 24, r.width + 8));
    var h = Math.max(38, Math.min(window.innerHeight * 0.4, r.height + 12));
    ta.value = getField(key);
    ta.style.fontSize = Math.max(13, Math.min(28, fs)) + 'px';
    ta.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left - 4)) + 'px';
    ta.style.top = Math.max(8, Math.min(window.innerHeight - h - 8, r.top - 4)) + 'px';
    ta.style.width = w + 'px';
    ta.style.height = h + 'px';
    box.hidden = false;
    ta.focus(); ta.select();
    ta.oninput = function () { setField(key, ta.value); };
    ta.onblur = closeEditor;
    ta.onkeydown = function (e) {
      if (e.key === 'Escape') { e.preventDefault(); ta.value = getField(key); closeEditor(); }
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); closeEditor(); }
    };
    box.onclick = function (e) { if (e.target === box) closeEditor(); };
  }
  function closeEditor() {
    var box = $('#edov'); if (!box || box.hidden) return;
    box.hidden = true;
    $('#edta').oninput = $('#edta').onblur = $('#edta').onkeydown = null;
    persist(); render();
  }

  /* ---------------- 사진·경계 ---------------- */
  function addPhotos(files) {
    var list = Array.prototype.slice.call(files || []).slice(0, 4 - (M.photos.length || 0));
    if (!list.length) { toast('사진은 4장까지 넣습니다'); return; }
    var left = list.length;
    list.forEach(function (f) {
      var fr = new FileReader();
      fr.onload = function () {
        var im = new Image();
        im.onload = function () {
          var max = 1500, s = Math.min(1, max / Math.max(im.width, im.height));
          var c = document.createElement('canvas');
          c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          try { M.photos.push(c.toDataURL('image/jpeg', 0.86)) } catch (e) { M.photos.push(fr.result) }
          if (--left <= 0) { persist(); render(); toast('사진을 넣었습니다'); }
        };
        im.onerror = function () { if (--left <= 0) { persist(); render(); } };
        im.src = fr.result;
      };
      fr.readAsDataURL(f);
    });
  }

  function addMarkOverlay(P) {
    var page = $('.pb-page');
    if (!page) return;
    var ph = P.map && false ? P.map : P.photo;
    var ov = document.createElement('div');
    ov.style.cssText = 'position:absolute;left:' + ph.x + 'px;top:' + ph.y + 'px;width:' + ph.w + 'px;height:' + ph.h + 'px;'
      + 'z-index:20;cursor:crosshair;background:rgba(255,122,0,.06);border:2px dashed rgba(255,122,0,.7);border-radius:10px';
    ov.title = '땅 모서리를 차례로 찍으세요';
    ov.addEventListener('click', function (e) {
      var r = ov.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      if (!M.polygon) M.polygon = { photo: 0, points: [] };
      M.polygon.photo = 0;
      M.polygon.points.push([Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y))]);
      persist(); render();
      toast(M.polygon.points.length + '점 — 3점 이상이면 빨간 테두리로 닫힙니다', 1600);
    });
    page.appendChild(ov);
  }

  /* ---------------- 도구 시트 ---------------- */
  function openTools() {
    var b = $('#shBody');
    var money = M.money || {};
    var sec = M.sections || {};
    var items = LS('kts_bc_items', []) || [];
    var h = '';
    h += '<div class="grp"><b>사진 (앞의 1장이 대표)</b><div class="row">'
      + '<label class="btn sm file">사진 넣기<input type="file" id="tPhoto" accept="image/*" multiple></label>'
      + (M.photos.length ? '<button class="btn sm" id="tPhotoClear">사진 비우기</button>' : '')
      + '</div><p class="note">보조 사진은 아래 줄에 자동으로 작게 정렬됩니다(282번).</p></div>';

    if (items.length) {
      h += '<div class="grp"><b>매물장에서 가져오기</b><div class="inp"><select id="tItem"><option value="">— 매물 고르기 —</option>';
      items.forEach(function (it) {
        h += '<option value="' + it.id + '">' + ((it.title || '매물') + ' · ' + (it.addr || '')).slice(0, 40) + '</option>';
      });
      h += '</select></div></div>';
    }

    h += '<div class="grp"><b>가격 기준 (주인만 · 284번)</b><div class="row" id="tMode">'
      + ['residual', 'sale', 'exchange'].map(function (k) {
        var nm = k === 'residual' ? '잔가' : (k === 'sale' ? '매가' : '교환가');
        return '<button class="btn sm' + ((money.mode || 'residual') === k ? ' on' : '') + '" data-m="' + k + '">' + nm + '</button>';
      }).join('')
      + '</div><div class="two" style="margin-top:8px">'
      + '<div class="inp"><span>매가(만원)</span><input id="tSale" type="number" inputmode="numeric" value="' + (money.sale ? Math.round(money.sale / 1e4) : '') + '"></div>'
      + '<div class="inp"><span>잔가(만원)</span><input id="tRes" type="number" inputmode="numeric" value="' + (money.residual ? Math.round(money.residual / 1e4) : '') + '"></div>'
      + '</div>'
      + '<div class="inp"><span>교환가(만원)</span><input id="tEx" type="number" inputmode="numeric" value="' + (money.exchange ? Math.round(money.exchange / 1e4) : '') + '"></div>'
      + '<p class="note">손님에게는 지금 고른 기준 한 가지만 크게 보입니다.</p></div>';

    h += '<div class="grp"><b>물건표에 넣기 (283번)</b><div class="row" id="tSec">'
      + [['right', '권리분석'], ['tx', '주변 실거래'], ['appraisal', '감정가']].map(function (x) {
        return '<button class="btn sm' + (((x[0] === 'tx') ? sec.tx !== 0 : sec[x[0]] === 1) ? ' on' : '') + '" data-s="' + x[0] + '">' + x[1] + '</button>';
      }).join('')
      + '</div><p class="note">기본은 빼 두고, 필요할 때만 켭니다.</p></div>';

    h += '<div class="grp"><b>경계 찍기 (271번)</b><div class="row">'
      + '<button class="btn sm' + (marking ? ' on' : '') + '" id="tMark">' + (marking ? '찍기 끝내기' : '드론 사진 위에 찍기') + '</button>'
      + (M.polygon && M.polygon.points && M.polygon.points.length ? '<button class="btn sm" id="tMarkClear">선 지우기</button>' : '')
      + '</div><p class="note">대표 사진 위에서 땅 모서리를 차례로 톡톡 찍으면 빨간 테두리로 닫힙니다.</p></div>';

    h += '<div class="grp"><b>추천 용도 · 연락처</b>'
      + '<div class="inp"><span>추천 용도</span><input id="tUse" type="text" value="' + esc(M.use) + '" placeholder="예) 풀빌라 단지 · 연수원"></div>'
      + '<div class="inp"><span>상호</span><input id="tOrg" type="text" value="' + esc(M.broker.org) + '"></div>'
      + '<div class="two"><div class="inp"><span>직책 · 이름</span><input id="tWho" type="text" value="' + esc(((M.broker.title ? M.broker.title + ' ' : '') + M.broker.name)) + '"></div>'
      + '<div class="inp"><span>전화</span><input id="tPhone" type="text" value="' + esc(M.broker.phone) + '"></div></div>'
      + '</div>';

    h += '<div class="grp"><div class="row"><button class="btn sm" id="tReset">예시로 되돌리기</button></div></div>';
    b.innerHTML = h;

    $('#tPhoto').addEventListener('change', function () { addPhotos(this.files); });
    var pc = $('#tPhotoClear');
    if (pc) pc.addEventListener('click', function () { M.photos = []; persist(); render(); openTools(); });
    var sel = $('#tItem');
    if (sel) sel.addEventListener('change', function () {
      if (!this.value) return;
      var m2 = fromStore(this.value);
      if (!m2) { toast('매물을 찾지 못했습니다'); return; }
      var keep = { use: M.use };
      M = m2;
      if (keep.use) M.use = keep.use;
      persist(); render(); closeTools(); toast('매물을 불러왔습니다');
    });
    Array.prototype.forEach.call(b.querySelectorAll('#tMode [data-m]'), function (btn) {
      btn.addEventListener('click', function () {
        applyMode(M, btn.getAttribute('data-m'));
        persist(); render(); openTools();
      });
    });
    ['tSale', 'tRes', 'tEx'].forEach(function (id) {
      var el = $('#' + id);
      if (!el) return;
      el.addEventListener('change', function () {
        var v = parseFloat(el.value) * 1e4;
        if (id === 'tSale') M.money.sale = isFinite(v) && v > 0 ? v : null;
        if (id === 'tRes') M.money.residual = isFinite(v) && v > 0 ? v : null;
        if (id === 'tEx') M.money.exchange = isFinite(v) && v > 0 ? v : null;
        applyMode(M, M.money.mode || 'residual');
        persist(); render();
      });
    });
    Array.prototype.forEach.call(b.querySelectorAll('#tSec [data-s]'), function (btn) {
      btn.addEventListener('click', function () {
        var k = btn.getAttribute('data-s');
        M.sections = M.sections || {};
        M.sections[k] = (k === 'tx') ? (M.sections.tx === 0 ? 1 : 0) : (M.sections[k] === 1 ? 0 : 1);
        rebuildExtras();
        btn.classList.toggle('on', (k === 'tx') ? M.sections.tx !== 0 : M.sections[k] === 1);
        persist(); render();
      });
    });
    var mk = $('#tMark');
    if (mk) mk.addEventListener('click', function () {
      marking = !marking;
      if (marking && !M.photos.length) { toast('먼저 드론·항공뷰 사진을 넣어 주세요'); marking = false; }
      closeTools(); render();
      if (marking) toast('사진 위 땅 모서리를 차례로 찍으세요', 3000);
    });
    var mc = $('#tMarkClear');
    if (mc) mc.addEventListener('click', function () { M.polygon = null; persist(); render(); openTools(); });
    ['tUse', 'tOrg', 'tWho', 'tPhone'].forEach(function (id) {
      var el = $('#' + id);
      if (!el) return;
      el.addEventListener('change', function () {
        if (id === 'tUse') M.use = el.value.trim();
        if (id === 'tOrg') M.broker.org = el.value.trim();
        if (id === 'tPhone') M.broker.phone = el.value.trim();
        if (id === 'tWho') {
          var t = el.value.trim().split(/\s+/);
          if (t.length > 1) { M.broker.title = t[0]; M.broker.name = t.slice(1).join(' '); }
          else M.broker.name = el.value.trim();
        }
        persist(); render();
      });
    });
    $('#tReset').addEventListener('click', function () {
      M = demo(); persist(); render(); closeTools(); toast('예시 물건으로 되돌렸습니다');
    });
    $('#sheet').hidden = false;
  }
  function closeTools() { $('#sheet').hidden = true; }

  function rebuildExtras() {
    var s = M.sections || {};
    var out = [];
    if (s.right === 1) out.push({ t: '권리분석', lines: ['등기부 갑구·을구 확인', '토지·건축물대장 원본 확인', '국세·지방세 완납 확인'] });
    if (s.tx !== 0 && M.tx && M.tx.length) {
      out.push({ t: '주변 실거래', lines: M.tx.slice(0, 3).map(function (r) {
        return [r.ym || '', r.jibun || '', r.area || '', B.won(r.amount)].filter(Boolean).join(' · ');
      }) });
    }
    if (s.appraisal === 1 && M.appraisal) out.push({ t: '감정가', lines: ['감정가 ' + B.won(M.appraisal)] });
    M.extras = out;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function persist() {
    if (guest) return;
    LSSet(STATE, { orient: orient, m: M });
  }

  /* ---------------- 저장 ---------------- */
  function openSave() {
    var modal = $('#modal');
    modal.hidden = false;
    $('#mdOrient').querySelectorAll('button').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-r') === orient);
    });
    paintPreview(orient);
    $('#mdNote').textContent = '손가락으로 벌려 크게 확인한 뒤 저장하세요.';
  }
  function paintPreview(o) {
    var stage = $('#mdStage');
    stage.innerHTML = '<p style="color:#71829b;font-size:13px">이미지를 만드는 중…</p>';
    var job = canvases[o] ? Promise.resolve(canvases[o]) : renderCanvas(o);
    job.then(function (cv) {
      canvases[o] = cv;
      stage.innerHTML = '';
      var img = new Image();
      img.src = cv.toDataURL('image/png');
      img.style.maxWidth = '100%';
      stage.appendChild(img);
    }).catch(function () {
      stage.innerHTML = '<p style="color:#ffb877;font-size:13px">이미지를 만들지 못했습니다 — 사진을 줄여 다시 시도해 주세요.</p>';
    });
  }
  function renderCanvas(o) {
    return new Promise(function (res, rej) {
      try {
        B.toCanvas(M, o, o === 'port' ? 1.6 : 1.2, function (cv) { res(cv) });
      } catch (e) { rej(e) }
    });
  }

  function fileName(o) {
    var t = String(M.title || '물건표').replace(/[\\/:*?"<>|]/g, '').slice(0, 22);
    return t + (o === 'port' ? '_세로' : '_가로');
  }
  function downloadCv(cv, name) {
    cv.toBlob(function (b) {
      if (!b) { toast('저장하지 못했습니다'); return; }
      var url = URL.createObjectURL(b);
      var a = document.createElement('a');
      a.href = url; a.download = name + '.png';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { try { URL.revokeObjectURL(url) } catch (e) { } }, 6000);
    }, 'image/png');
  }
  function currentTargets() {
    var sel = $('#mdOrient').querySelector('button.on');
    var r = sel ? sel.getAttribute('data-r') : orient;
    return r === 'both' ? ['land', 'port'] : [r];
  }
  function savePng() {
    var list = currentTargets();
    var done = 0;
    list.forEach(function (o) {
      var go = function (cv) { downloadCv(cv, fileName(o)); if (++done === list.length) toast('PNG를 저장했습니다 — 카톡·문자로 그대로 보내세요', 3400); };
      if (canvases[o]) go(canvases[o]); else renderCanvas(o).then(go);
    });
  }
  function savePdf() {
    var o = currentTargets()[0];
    var go = function (cv) {
      var data = cv.toDataURL('image/png');
      var wmm = o === 'port' ? 167 : 297, hmm = o === 'port' ? 297 : 167;
      var w = window.open('', '_blank');
      if (!w) { toast('팝업이 막혔습니다 — PNG로 저장해 주세요', 3200); return; }
      w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>' + fileName(o) + '</title>'
        + '<style>@page{size:' + wmm + 'mm ' + hmm + 'mm;margin:0}html,body{margin:0;padding:0}'
        + 'img{width:' + wmm + 'mm;height:' + hmm + 'mm;object-fit:contain;display:block}</style></head>'
        + '<body><img src="' + data + '"></body></html>');
      w.document.close();
      setTimeout(function () { try { w.focus(); w.print() } catch (e) { } }, 700);
      toast('인쇄 창에서 「PDF로 저장」을 고르세요', 3600);
    };
    if (canvases[o]) go(canvases[o]); else renderCanvas(o).then(go);
  }

  /* ---------------- 시작 ---------------- */
  var shortP = null;
  function boot() {
    var code = qs('m'), itemId = qs('item'), listId = qs('id');
    var pno = qs('p'), pi = parseInt(qs('i') || '0', 10) || 0;
    if (qs('g') === '1') guest = true;
    /* 짧은 주소가 실어 온 물건 — /1?i=2 같은 주소가 여기로 넘어온다 */
    if (pno && window.KTS_SHORT && !shortP) {
      var hint0 = $('#hint'); if (hint0) hint0.textContent = '물건표를 불러오는 중입니다';
      KTS_SHORT.load(pno).then(function (res) {
        var pl = res && res.ok ? res.p : null;
        if (pl && pl.items && pl.items[pi]) {
          var it0 = pl.items[pi];
          var m0 = B.build(it0, pl.me || {});
          m0.map = it0.map || mapUrl(it0.lat, it0.lon);
          m0.itemId = it0.id; m0.polygon = it0.polygon || null;
          shortP = { m: m0, n: pno };
        }
        boot();
      }).catch(function () { boot(); });
      return;
    }
    if (code) {
      var d = null;
      try { d = B.dec(code) } catch (e) { d = null }
      if (d) { M = d; guest = true; }
    }
    if (!M && shortP) { M = shortP.m; guest = true; }
    if (!M && itemId) M = fromStore(itemId);
    if (!M && listId) {
      fetch('data/listings.json', { cache: 'no-store' }).then(function (r) { return r.json() }).then(function (j) {
        var L = (j.listings || []).filter(function (x) { return x.id === listId })[0];
        fetch('data/broker.json', { cache: 'no-store' }).then(function (r) { return r.json() }).then(function (b) {
          var m2 = fromListing(L, b);
          if (m2) { M = m2; rebuildExtras(); render(); }
        }).catch(function () {
          var m3 = fromListing(L, null);
          if (m3) { M = m3; rebuildExtras(); render(); }
        });
      }).catch(function () { });
    }
    if (!M) {
      var st = LS(STATE, null);
      if (st && st.m) { M = st.m; orient = st.orient === 'port' ? 'port' : 'land'; }
    }
    if (!M) M = demo();
    /* 휴대폰에서는 세로(9:16)가 먼저 보이게 — 한 번 고르면 그 선택을 기억한다 */
    if (!itemId && !code && !listId && !LS(STATE, null) && !st_qs_orient() && (window.innerWidth || 390) < 620) orient = 'port';
    if (!M.sections) M.sections = { right: 0, tx: 1, appraisal: 0 };
    rebuildExtras();

    if (guest) {
      if (!st_qs_orient()) orient = 'port';   /* 손님 휴대폰에서는 세로가 먼저 */
      document.body.classList.add('guest');
      $('#guestbar').hidden = false;
      $('#btnTools').hidden = true;
      $('#btnSave').textContent = '이미지';
      $('#hint').textContent = '보내 드린 물건표입니다 · 이미지로 저장해 두세요';
      $('#gCall').href = 'tel:' + String((M.broker && M.broker.phone) || '').replace(/[^0-9+]/g, '');
      $('#gCall').hidden = !(M.broker && M.broker.phone);
    }
    $('#oswitch').querySelectorAll('button').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-o') === orient);
      b.addEventListener('click', function () {
        orient = b.getAttribute('data-o');
        $('#oswitch').querySelectorAll('button').forEach(function (o) { o.classList.toggle('on', o === b); });
        persist(); render();
      });
    });
    $('#btnSave').addEventListener('click', function () { openSave(); });
    $('#btnTools').addEventListener('click', openTools);
    $('#shX').addEventListener('click', closeTools);
    $('#sheet').addEventListener('click', function (e) { if (e.target === this) closeTools(); });
    $('#mdX').addEventListener('click', function () { $('#modal').hidden = true; });
    $('#mdOrient').querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        var r = b.getAttribute('data-r');
        if (r !== 'both') { orient = r; persist(); }
        $('#mdOrient').querySelectorAll('button').forEach(function (o) { o.classList.toggle('on', o === b); });
        paintPreview(r === 'both' ? (orient === 'port' ? 'port' : 'land') : r);
      });
    });
    $('#mdPng').addEventListener('click', savePng);
    $('#mdPdf').addEventListener('click', savePdf);
    $('#gGet').addEventListener('click', function () {
      openSave();
      $('#mdOrient').hidden = false;
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      closeEditor();
      if (!$('#sheet').hidden) closeTools();
      else if (!$('#modal').hidden) $('#modal').hidden = true;
    });
    var rz = null;
    window.addEventListener('resize', function () {
      clearTimeout(rz);
      rz = setTimeout(function () { if (!guest || true) render(); }, 160);
    });
    render();
    if (guest) setTimeout(function () { $('#hint').textContent = '보내 드린 물건표 · 크게 보려면 두 손가락으로 벌리세요'; }, 100);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
