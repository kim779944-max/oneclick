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
  /* 302수리C — 지적도(연속지적도 WMS 레이어를 이미지로) — 위성과 다른 그림 */
  function cadUrl(lat, lon) {
    if (!lat || !lon) return '';
    return 'https://api.vworld.kr/req/image?service=image&request=getmap&key=' + encodeURIComponent(VW_KEY)
      + '&domain=autooneclick.com&format=png&basemap=GRAPHIC_WHITE&layers=lp_pa_cbnd_bonbun,lp_pa_cbnd_bubun'
      + '&center=' + (+lon).toFixed(6) + ',' + (+lat).toFixed(6) + '&zoom=17&size=1000,700&crs=EPSG:4326';
  }

  /* 302수리C — 주소만 넘어온 매물(매물수집기 → 물건표)도 위성·지적도를 갖게 좌표를 한 번 찍는다 */
  function jsonpVW(url) {
    return new Promise(function (res) {
      var cb = '__ktsp' + Math.floor(Math.random() * 1e7);
      var s = document.createElement('script'), done = false;
      function fin(v) { if (done) return; done = true; try { delete window[cb] } catch (e) { window[cb] = null } if (s.parentNode) s.parentNode.removeChild(s); res(v); }
      var tm = setTimeout(function () { fin(null) }, 9000);
      window[cb] = function (d) { clearTimeout(tm); fin(d) };
      s.onerror = function () { clearTimeout(tm); fin(null) };
      s.src = url + '&callback=' + cb;
      document.head.appendChild(s);
    });
  }
  function geocodeAddr(addr) {
    var q = String(addr || '').trim();
    if (!q) return Promise.resolve(null);
    var url = 'https://api.vworld.kr/req/address?service=address&request=getcoord&version=2.0&crs=EPSG:4326&format=json'
      + '&type=parcel&key=' + encodeURIComponent(VW_KEY) + '&domain=autooneclick.com&address=' + encodeURIComponent(q);
    return jsonpVW(url).then(function (r) {
      if (r && r.response && r.response.status === 'OK' && r.response.result && r.response.result.point) {
        return { lat: +r.response.result.point.y, lon: +r.response.result.point.x };
      }
      return null;
    }).catch(function () { return null });
  }
  function ensureGeo(m) {
    if (!m || (m.map && m.cad) || !m.addr) return;
    geocodeAddr(m.addr).then(function (pt) {
      if (!pt || !M) return;
      m.lat = pt.lat; m.lon = pt.lon;
      if (!m.map) m.map = mapUrl(pt.lat, pt.lon);
      if (!m.cad) m.cad = cadUrl(pt.lat, pt.lon);
      if (M === m) { persist(); render(); }
    });
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
    m.cad = it.cad || cadUrl(it.lat, it.lon);
    m.lat = it.lat; m.lon = it.lon;
    m.itemId = it.id;
    m.polygon = it.polygon || null;
    return m;
  }

  function numTxt(v) { return (Math.round(+v * 10) / 10).toLocaleString('ko-KR'); }

  /* 매물장(listing) 매물 → 물건표 모델 */
  function fromListing(L, broker) {
    if (!L) return null;
    var p = L.price || {}, f = L.facts || {};
    var site = parseFloat(String(f.site || L.site || '').replace(/[^\d.]/g, ''));
    var gross = parseFloat(String(f.gross || L.gross || '').replace(/[^\d.]/g, ''));
    var isLandKind = /^(대지|임야|답|전|전답|농지|과수원|토지|야적장|잡종지)$/.test(String(L.type || ''));
    /* 302수리C — 문자에서 넘어온 숫자만으로 핵심 포인트를 세운다(안 채워진 빈 말 금지) */
    var pts = [];
    if (site) pts.push('대지 ' + numTxt(site) + '㎡' + (gross ? ' · 건물 ' + numTxt(gross) + '㎡' : ''));
    if (!site && gross) pts.push('건물 ' + numTxt(gross) + '㎡' + (L.floors ? ' · ' + L.floors : ''));
    if (p.loanAmount) pts.push('융자 ' + B.eok(p.loanAmount * 1e4) + ' 승계 — 실인수 잔가로 계산');
    if (p.deposit || p.rent) pts.push([p.deposit ? '보증금 ' + B.eok(p.deposit * 1e4) : '', p.rent ? '월세 ' + B.eok(p.rent * 1e4) : ''].filter(Boolean).join(' / ') + ' (임대 조건)');
    if (L.floors && site) pts.push(L.floors);
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
      monthly: p.rent ? p.rent * 1e4 : null,
      tags: [],
      points: pts.slice(0, 3),
      photos: (L.photos || []).slice(0, 4),
      lat: L.lat, lon: L.lng,
      gb: {
        char: {
          lndcgrCodeNm: isLandKind ? (L.type || '') : '',
          lndpclAr: site || null,
          roadSideCodeNm: f.road || '',
          pblntfPclnd: f.landPrice ? +String(f.landPrice).replace(/[^\d]/g, '') : null
        },
        use: f.zone ? [{ nm: f.zone }] : [],
        bld: (f.built || f.use) ? { st: 'OK', items: [{ mainPurpsCdNm: f.use || '', strctCdNm: f.structure || '', grndFlrCnt: f.floors || null, totArea: gross || null }] } : { st: 'EMPTY' }
      }
    };
    it.map = mapUrl(L.lat, L.lng);
    it.cad = cadUrl(L.lat, L.lng);
    var me = broker || {};
    var m = B.build(it, {
      org: me.office || me.org || me.company || 'KTS 원클릭 공인중개사',
      title: me.title || '대표',
      name: me.name || '김태수',
      phone: me.phone || '010-2002-2899',
      fax: me.fax || '', email: me.email || '', addr: me.address || '',
      stamp: 'circle'
    });
    m.use = ((L.points || []).map(function (x) { return x.t }).filter(Boolean).slice(0, 3).join(' · ')) || '용도 협의';
    m.lat = L.lat; m.lon = L.lng;
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

  /* ==========================================================================
     304 — 그림 2장은 메인 사진 속 코너 인셋, QR은 네모 테두리 없이 코너 구석
     · 2장: 큰 사진 1장으로 그리고 두 번째 그림(지적도·위치도 등)을 코너에 겹쳐 얹는다
       (좌우 반반 쪼개기·아래 썸네일 줄 없이 한 덩어리로)
     · 3장: 큰 1장 + 밑에 작은 2장(기존 썸네일 줄 그대로)
     · 하단 직인 도장(테두리 두 줄) 대신, 테두리 없는 QR만 종이 맨 구석에
     ========================================================================== */
  function photoList(m) { return ((m && m.photos) || []).filter(Boolean); }

  /* 인셋에 넣을 그림 — 그림 2장이면 두 번째 그림, 1장이면 지적도(없으면 위성) */
  function insetInfo() {
    var ph = photoList(M);
    if (ph.length === 2) return { src: ph[1], slot: 'photo:1' };
    if (ph.length === 1) {
      if (M.cad) return { src: M.cad, slot: 'cad' };
      if (M.map) return { src: M.map, slot: 'sat' };
    }
    return null;
  }

  /* 화면·저장 모두 인셋으로 옮긴 그림은 큰 칸에서 빼고 그린다(중복·빈 칸 없이) */
  function renderModel() {
    var ph = photoList(M);
    var c = Object.assign({}, M);
    if (ph.length === 2) c.photos = [ph[0]];
    if (insetInfo()) { c.cad = ''; c.map = ''; c.lat = null; c.lon = null; }
    return c;
  }

  /* 코너 인셋 자리 — 메인 사진 오른쪽 아래에 사진처럼 얹는다 */
  function insetRect(ph) {
    var ih = Math.round(ph.h * 0.42);
    var iw = Math.round(ih * 1.36);
    if (iw > ph.w * 0.46) { iw = Math.round(ph.w * 0.46); ih = Math.round(iw / 1.36); }
    if (iw < 160) { iw = Math.max(120, iw); ih = Math.round(iw / 1.36); }
    var mg = Math.max(10, Math.round(Math.min(ph.w, ph.h) * 0.018));
    return { x: ph.x + ph.w - iw - mg, y: ph.y + ph.h - ih - mg, w: iw, h: ih, mg: mg };
  }
  function rrect(x, px, py, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    x.beginPath();
    x.moveTo(px + r, py);
    x.lineTo(px + w - r, py); x.quadraticCurveTo(px + w, py, px + w, py + r);
    x.lineTo(px + w, py + h - r); x.quadraticCurveTo(px + w, py + h, px + w - r, py + h);
    x.lineTo(px + r, py + h); x.quadraticCurveTo(px, py + h, px, py + h - r);
    x.lineTo(px, py + r); x.quadraticCurveTo(px, py, px + r, py);
    x.closePath();
  }
  function coverImg(x, img, dx, dy, dw, dh, radius) {
    if (!img || !((img.naturalWidth || 0) + (img.width || 0))) return false;
    x.save();
    if (radius) { rrect(x, dx, dy, dw, dh, radius); x.clip(); }
    else { x.beginPath(); x.rect(dx, dy, dw, dh); x.clip(); }
    var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    var s = Math.max(dw / iw, dh / ih), w = iw * s, h = ih * s;
    x.drawImage(img, dx + (dw - w) / 2, dy + (dh - h) / 2, w, h);
    x.restore();
    return true;
  }

  /* 화면 — 사진 위에 인셋 겹치기(사진 틀처럼 흰 테두리 + 그림자) */
  function paintInsetDom(page, P) {
    var info = insetInfo();
    if (!info || !P.photo) return;
    var r = insetRect(P.photo);
    var d = document.createElement('div');
    d.className = 'pb-slot pb-inset';
    d.setAttribute('data-slot', info.slot);
    d.style.cssText = 'position:absolute;z-index:5;left:' + r.x + 'px;top:' + r.y + 'px;width:' + r.w + 'px;height:' + r.h
      + 'px;border-radius:12px;overflow:hidden;background:#fff;box-shadow:0 10px 26px rgba(0,0,0,.46)';
    var im = document.createElement('img');
    im.alt = '';
    im.src = info.src;
    im.style.cssText = 'position:absolute;left:5px;top:5px;width:calc(100% - 10px);height:calc(100% - 10px);object-fit:cover;border-radius:8px;display:block;max-width:none';
    im.addEventListener('error', function () {
      if (info.slot === 'photo:1' && M.cad && im.src !== M.cad) im.src = M.cad;
      else if (info.slot === 'sat' && M.cad && im.src !== M.cad) im.src = M.cad;
    });
    d.appendChild(im);
    page.appendChild(d);
  }

  /* 저장 캔버스 — 직인 도장 없이(테두리 없는 QR만 코너), 사진 위에 인셋 */
  function decorateCanvas(ctx, R, o, k) {
    var P = B.plan(R, o);
    var land = o !== 'port';
    /* 1) 네모 테두리 없는 QR — 종이 맨 구석 */
    var size = land ? 84 : 136, mg = 8;
    var qx = P.W - size - mg, qy = P.foot.y + P.foot.h - size - mg;
    var off = document.createElement('canvas');
    paintQR(off, size, qrText(), k);
    ctx.drawImage(off, qx, qy, off.width / k, off.height / k);
    /* 2) 그림 2장 — 메인 사진 속 코너 인셋 */
    var info = insetInfo();
    if (!info || !P.photo) return Promise.resolve();
    return insetImage(info).then(function (img) {
      if (!img) return;
      var r = insetRect(P.photo);
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 8;
      ctx.fillStyle = '#fff';
      rrect(ctx, r.x, r.y, r.w, r.h, 12); ctx.fill();
      ctx.restore();
      coverImg(ctx, img, r.x + 5, r.y + 5, r.w - 10, r.h - 10, 8);
    }).catch(function () { });
  }

  function insetImage(info) {
    if (info.slot === 'photo:1') {
      return B.loadImg(info.src, true).then(function (im) {
        if (im) return im;
        return M.cad ? B.loadImg(M.cad, true) : null;
      });
    }
    if (info.slot === 'cad') {
      return B.loadImg(M.cad || '', true).then(function (im) {
        if (im) return im;
        if (M.lat && M.lon) return B.cadVector(M.lat, M.lon, 640, 470, 17);
        return null;
      });
    }
    return B.loadImg(M.map || '', true);
  }

  /* QR에 담을 글자 — 전자명함 주소(직인 도장과 같은 내용) */
  function qrText() {
    try {
      if (window.KTS && KTS.Seal && KTS.Seal.payload) {
        return KTS.Seal.payload({
          name: (M.broker || {}).name, phone: (M.broker || {}).phone,
          org: (M.broker || {}).org, qrKind: 'url'
        });
      }
    } catch (e) { }
    return 'https://autooneclick.com/bizcard/';
  }
  function qrMatrix(v) {
    var lib = window.qrcode;
    if (!lib || !v) return null;
    var keep = lib.stringToBytes;
    try {
      if (/[^\x00-\x7F]/.test(v) && lib.stringToBytesFuncs) lib.stringToBytes = lib.stringToBytesFuncs['UTF-8'];
      var q = lib(0, 'H');
      q.addData(v); q.make();
      return q;
    } catch (e) { return null; } finally { lib.stringToBytes = keep; }
  }
  /* 테두리 없는 QR — 흰 바탕판 위에 모듈만(도장 테두리·박스 선 없음)
     모듈을 장치 픽셀 정수에 맞춰 그려 흐림·깨짐 없이 선명하게 */
  function paintQR(cv, size, value, dpr) {
    dpr = dpr || 1;
    var dev = Math.max(8, Math.round(size * dpr));
    cv.width = dev;
    cv.height = dev;
    if (cv.style && cv.style.width !== undefined) { cv.style.width = size + 'px'; cv.style.height = size + 'px'; }
    var x = cv.getContext('2d');
    if (!x) return;
    x.clearRect(0, 0, dev, dev);
    var q = qrMatrix(value);
    if (!q) return;
    x.save();
    x.scale(dev / size, dev / size);
    x.fillStyle = '#ffffff';
    rrect(x, 0, 0, size, size, size * 0.035); x.fill();
    x.restore();
    var n = q.getModuleCount(), QZ = 3;
    var mDev = Math.max(1, Math.floor(dev / (n + QZ * 2)));
    var span = mDev * (n + QZ * 2);
    var oDev = Math.round((dev - span) / 2) + mDev * QZ;
    x.fillStyle = '#0B1526';
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (q.isDark(r, c)) x.fillRect(oDev + c * mDev, oDev + r * mDev, mDev, mDev);
      }
    }
  }

  /* ---------------- 그리기 ---------------- */
  function render() {
    var wrap = $('#pwrap');
    var R = renderModel();
    var html = B.dom(R, orient);
    wrap.innerHTML = '<div class="pbs" style="transform-origin:top left">' + html + '</div>';
    var P = B.plan(R, orient);
    paintInsetDom(wrap.querySelector('.pb-page'), P);
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
    bindSlots();
    bindSeal();
  }

  /* 302수리C — 큰 사진·위성·지적도 칸을 누르면 그 칸만 골라 바꾼다 */
  function bindSlots() {
    if (guest) return;
    Array.prototype.forEach.call(document.querySelectorAll('.pb-slot'), function (el) {
      el.style.cursor = 'pointer';
      el.title = '눌러서 이 칸 그림 바꾸기';
      el.addEventListener('click', function (ev) {
        if (marking) return;
        ev.preventDefault(); ev.stopPropagation();
        pickSlot(el.getAttribute('data-slot'));
      });
    });
  }
  function pickSlot(slot) {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.addEventListener('change', function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        var im = new Image();
        im.onload = function () {
          var max = 1400, s = Math.min(1, max / Math.max(im.width, im.height));
          var c = document.createElement('canvas');
          c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          var data = fr.result;
          try { data = c.toDataURL('image/jpeg', 0.86); } catch (e) { }
          applySlot(slot, data);
        };
        im.onerror = function () { applySlot(slot, fr.result); };
        im.src = fr.result;
      };
      fr.readAsDataURL(f);
    });
    inp.click();
  }
  function applySlot(slot, data) {
    var p = String(slot || '').split(':');
    if (p[0] === 'photo') {
      var i = parseInt(p[1], 10) || 0;
      while (M.photos.length <= i) M.photos.push('');
      M.photos[i] = data;
    } else if (slot === 'cad') { M.cad = data; M.cadOwn = 1; }
    else if (slot === 'sat') { M.map = data; M.satOwn = 1; }
    else return;
    persist(); render(); toast('이 칸의 그림을 바꿨습니다');
  }

  /* 304 — 직인 도장 대신, 테두리 없는 QR을 종이 맨 구석에 */
  function bindSeal() {
    var slot = $('.pb-seal');
    if (!slot) return;
    var land = orient !== 'port';
    var size = land ? 84 : 136;
    slot.style.left = 'auto'; slot.style.right = '8px';
    slot.style.top = 'auto'; slot.style.bottom = '8px';
    slot.style.width = size + 'px'; slot.style.height = size + 'px';
    slot.style.borderRadius = '0'; slot.style.background = 'transparent';
    var cv = document.createElement('canvas');
    paintQR(cv, size, qrText(), 3);
    slot.innerHTML = '';
    slot.appendChild(cv);
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
    var ph = P.photo || (P.blocks && P.blocks[0]);
    if (!ph) return;
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
      + '</div><p class="note">큰 사진·위성·지적도 칸을 눌러도 그 칸만 바로 바꿀 수 있습니다(302).</p></div>';

    h += '<div class="grp"><b>위치 그림</b><div class="row">'
      + '<button class="btn sm" id="tCadAuto">지적도 다시 받기</button>'
      + '<button class="btn sm" id="tSatAuto">위성사진 다시 받기</button>'
      + '</div><p class="note">주소를 넣고 4대 공부를 받으면 지적도·위성사진이 자동으로 붙습니다. 사진이 0장이면 이 두 장이 대표가 됩니다.</p></div>';

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
    var cadA = $('#tCadAuto'), satA = $('#tSatAuto');
    if (cadA) cadA.addEventListener('click', function () {
      M.cad = cadUrl(M.lat, M.lon); persist(); render(); toast(M.cad ? '지적도를 다시 받았습니다' : '주소가 있어야 지적도를 받습니다');
    });
    if (satA) satA.addEventListener('click', function () {
      M.map = mapUrl(M.lat, M.lon); persist(); render(); toast(M.map ? '위성사진을 다시 받았습니다' : '주소가 있어야 위성사진을 받습니다');
    });
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
    /* 304 — 물건이 바뀌면 저장 캔버스(미리보기·PNG)를 비운다. 안 비우면 고치기 전 그림이 저장된다 */
    canvases = {};
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
    /* 302수리C — 브이월드 위성사진은 CORS가 없어 저장 캔버스에 담기지 않는다(지적도로 대신) */
    $('#mdNote').textContent = (M && M.map && !(M.photos || []).length)
      ? '위성사진은 저장 이미지에 담을 수 없어 지적도로 대신 들어갑니다 · 손가락으로 벌려 확인하세요'
      : '손가락으로 벌려 크게 확인한 뒤 저장하세요.';
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
  /* 저장 캔버스 — toCanvas와 같은 방식으로 그림을 모아 그리되, 직인 도장은 빼고 그린다 */
  function renderCanvas(o) {
    var R = renderModel();
    var k = o === 'port' ? 1.6 : 1.2;
    return new Promise(function (res, rej) {
      try {
        var photos = (R.photos || []).slice(0, 4);
        var jobs = photos.map(function (s) { return B.loadImg(s, true); })
          .concat([B.loadImg(R.map || '', true), B.loadImg(R.cad || '', true)]);
        Promise.all(jobs).then(function (imgs) {
          var sat = imgs[imgs.length - 2], cad = imgs[imgs.length - 1];
          var ph = imgs.slice(0, -2);
          var needVec = !cad && R.lat && R.lon;
          var job = needVec ? B.cadVector(R.lat, R.lon, o === 'port' ? 620 : 1100, o === 'port' ? 560 : 620, 17) : Promise.resolve(null);
          job.then(function (vcv) {
            if (vcv) cad = vcv;
            var opt = { noSat: !sat };
            var P0 = B.plan(R, o, opt);
            var cv = document.createElement('canvas');
            cv.width = Math.round(P0.W * k);
            cv.height = Math.round(P0.H * k);
            var ctx = cv.getContext('2d');
            ctx.scale(k, k);
            var subs = [];
            for (var i = 1; i < ph.length; i++) if (ph[i]) subs.push({ img: ph[i], idx: i });
            B.draw(ctx, R, o, { main: ph[0] || null, subs: subs, map: sat, cad: cad, seal: null }, opt);
            decorateCanvas(ctx, R, o, k).then(function () { res(cv) }, function () { res(cv) });
          }).catch(function () { rej(new Error('draw failed')); });
        }).catch(function (e) { rej(e); });
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
          m0.cad = it0.cad || cadUrl(it0.lat, it0.lon);
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
    /* 매물수집기(realty)에서 「물건 포스터」를 누르고 온 매물 — 예시가 아니라 그 물건으로 */
    if (!M && qs('from') === 'realty') {
      var hand = null;
      try { hand = JSON.parse(sessionStorage.getItem('kts_poster_hand') || 'null'); } catch (e) { }
      if (hand) {
        try { sessionStorage.removeItem('kts_poster_hand'); } catch (e) { }
        M = fromListing(hand, null);
        if (M) { M.lat = hand.lat; M.lon = hand.lng; }
      }
    }
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
    ensureGeo(M);

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
