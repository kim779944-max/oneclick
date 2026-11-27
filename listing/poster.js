/* ==========================================================================
   물건 포스터 (260번) — 5대 항목 자동 배치 · 그 자리에서 고치기 · A4/PNG
   --------------------------------------------------------------------------
   화면: A4 종이 그대로(글자 눌러 바로 수정)
   PNG : 같은 내용을 A4 150dpi(1240×1754) 캔버스에 다시 그린다
   ========================================================================== */
(function () {
  'use strict';

  var $ = function (s) { return document.querySelector(s) };
  var C = {
    navy: '#0f1b2d', navy2: '#16233a', org: '#f97316',
    ink: '#111111', ink2: '#333333', ink3: '#4b5563',
    line: '#d6dbe4', soft: '#f2f4f8', white: '#ffffff'
  };
  var FONT = '"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR","Noto Sans CJK KR",sans-serif';
  function f(px, w) { return (w || 400) + ' ' + Math.round(px) + 'px ' + FONT; }

  var photos = [];   /* [{src, img}] 최대 3장 */

  /* ---------------- 값 읽기 ---------------- */
  function txt(sel) {
    var el = $(sel);
    return el ? (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim() : '';
  }
  function lines(sel) {
    return Array.prototype.map.call(document.querySelectorAll(sel + ' li'), function (li) {
      return (li.innerText || li.textContent || '').replace(/\s+/g, ' ').trim();
    }).filter(Boolean);
  }
  function rows(sel) {
    return Array.prototype.map.call(document.querySelectorAll(sel + ' tbody tr'), function (tr) {
      return Array.prototype.map.call(tr.children, function (c) {
        return (c.innerText || c.textContent || '').replace(/\s+/g, ' ').trim();
      });
    });
  }
  function head(sel) {
    return Array.prototype.map.call(document.querySelectorAll(sel + ' thead th'), function (c) {
      return (c.innerText || c.textContent || '').replace(/\s+/g, ' ').trim();
    });
  }
  function model() {
    return {
      date: txt('#p-date'), no: txt('#p-no'),
      title: txt('#p-title'), addr: txt('#p-addr'),
      price: txt('#p-price'), pnote: txt('#p-price-note'),
      keys: [txt('#k1'), txt('#k2'), txt('#k3'), txt('#k4')],
      gongbu: rows('#p-gongbu'),
      loc: lines('#p-loc'), right: lines('#p-right'),
      txHead: head('#p-tx'), tx: rows('#p-tx'),
      name: txt('#p-name'), role: txt('#p-role'), phone: txt('#p-phone'),
      fine: (document.querySelector('.p-foot .fine') || {}).innerText || ''
    };
  }

  /* ---------------- 직인 도장 ---------------- */
  function sealOpts() {
    var name = txt('#p-name') || '김태수';
    var phone = txt('#p-phone') || '';
    var shape = localStorage.getItem('kts_poster_seal') || 'circle';
    return {
      shape: shape, name: name,
      value: KTS.Seal.payload({ name: name, org: 'KTS 교환급매물', phone: phone, qrKind: 'url' })
    };
  }
  function paintSeal() {
    var cv = $('#pSeal');
    if (!cv || !window.KTS || !KTS.Seal) return;
    try { KTS.Seal.paint(cv, 78, sealOpts()) } catch (e) { }
  }

  /* ---------------- 사진 ---------------- */
  function setPhoto(i, src) {
    var img = $('#ph' + i);
    if (!img) return;
    if (!src) { img.removeAttribute('src'); return; }
    img.src = src;
  }
  function loadPhotos(list) {
    Array.prototype.forEach.call(list, function (file, k) {
      var slot = findEmptySlot();
      if (slot < 0) return;
      shrink(file, 1400, function (data) { setPhoto(slot, data) });
    });
  }
  function findEmptySlot() {
    for (var i = 0; i < 3; i++) { var im = $('#ph' + i); if (im && !im.getAttribute('src')) return i }
    return -1;
  }
  function shrink(file, max, cb) {
    var fr = new FileReader();
    fr.onload = function () {
      var im = new Image();
      im.onload = function () {
        var s = Math.min(1, max / Math.max(im.width, im.height));
        var w = Math.round(im.width * s), h = Math.round(im.height * s);
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(im, 0, 0, w, h);
        try { cb(c.toDataURL('image/jpeg', 0.86)) } catch (e) { cb(fr.result) }
      };
      im.onerror = function () { cb(fr.result) };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  }

  /* ---------------- 불러오기 ---------------- */
  var DEMO_PHOTOS = ['../bizcard/img/sample_land.jpg', 'img/ex4.jpg', '../bizcard/img/sample_house.jpg'];

  function sample() {
    DEMO_PHOTOS.forEach(function (p, i) { setPhoto(i, p) });
    toast('예시 물건입니다 — 글자를 눌러 고치고 사진을 바꿔 보세요');
  }

  function fromListing(L) {
    if (!L) return;
    function money(man) {
      if (man == null) return '';
      var eok = Math.floor(man / 10000), m = man % 10000;
      return (eok ? eok + '억 ' : '') + (m ? m.toLocaleString('ko-KR') + '만' : (eok ? '' : '0'));
    }
    var p = L.price || {}, fa = L.facts || {};
    if (L.title) $('#p-title').textContent = [L.address && L.address.split(' ').slice(0, 2).join(' '), L.title].filter(Boolean).join(' ');
    if (L.address) $('#p-addr').textContent = L.address;
    if (p.sale) $('#p-price').textContent = money(p.sale);
    if (p.note) $('#p-price-note').textContent = p.note;
    if (L.id) $('#p-no').textContent = L.id;
    $('#k1').textContent = p.sale ? money(p.sale) : $('#k1').textContent;
    $('#k2').textContent = p.loanAmount ? money(p.loanAmount) : $('#k2').textContent;
    $('#k3').textContent = p.realInvest ? money(p.realInvest) : $('#k3').textContent;
    /* 4대 공부 */
    var g = [
      ['토지대장', [fa.site ? '대지 ' + fa.site : '', fa.zone ? fa.zone : '', fa.landPrice ? '공시지가 ' + fa.landPrice + '원/㎡' : ''].filter(Boolean).join(' · ')],
      ['건축물대장', [fa.built ? '준공 ' + fa.built : '', fa.structure || '', fa.use || '', fa.gross ? '연면적 ' + fa.gross : '', fa.lift != null ? '승강기 ' + fa.lift + '대' : ''].filter(Boolean).join(' · ')],
      ['등기부', '소유자·근저당은 계약 전 등기부 원본으로 확인'],
      ['토지이용계획', fa.zone || '토지이음에서 확인']
    ];
    var tb = document.querySelector('#p-gongbu tbody');
    tb.innerHTML = g.map(function (r) {
      return '<tr><th>' + r[0] + '</th><td contenteditable="true">' + (r[1] || '미확인') + '</td></tr>';
    }).join('');
    /* 입지·권리·실거래가는 매물에서 아는 것만 새로 채운다(예시 문구 남기지 않음) */
    var locBits = [];
    if (fa.behind) locBits.push('배후 상권: ' + fa.behind);
    if (L.floors) locBits.push('규모: ' + L.floors);
    if (L.site || fa.site) locBits.push('대지 ' + (fa.site || L.site) + ' · 연면적 ' + (fa.gross || L.gross || '미확인'));
    if (L.moveIn) locBits.push('입주: ' + L.moveIn);
    locBits.push('상세 입지는 현장 확인 후 한 줄씩 고쳐 주세요');
    $('#p-loc').innerHTML = locBits.map(function (t) {
      return '<li contenteditable="true">' + t + '</li>';
    }).join('');

    var rightBits = [];
    if (p.loanAmount) rightBits.push('을구: 근저당 ' + money(p.loanAmount) + '(승계 가능) — 매도인 승계 또는 말소 선택');
    rightBits.push('갑구: 소유권 이외 제한 — 계약 전 등기부 원본으로 확인');
    rightBits.push('토지거래허가구역·토지이용계획은 토지이음에서 확인');
    if (p.appraisal && p.sale) {
      var gap = p.appraisal - p.sale;
      rightBits.push('감정가 ' + money(p.appraisal) + ' 대비 ' + money(gap) + ' 낮은 가격');
    }
    $('#p-right').innerHTML = rightBits.map(function (t) {
      return '<li contenteditable="true">' + t + '</li>';
    }).join('');

    /* 주변 실거래가는 공개 자료를 넣기 전까지 비워 둔다 */
    var txb = document.querySelector('#p-tx tbody');
    txb.innerHTML = '<tr><td contenteditable="true">—</td><td contenteditable="true">—</td><td contenteditable="true">—</td>'
      + '<td contenteditable="true">—</td><td contenteditable="true">실거래가 확인 후 입력</td></tr>';
    if (L.photos && L.photos.length) L.photos.slice(0, 3).forEach(function (p2, i) {
      if (typeof p2 === 'string') setPhoto(i, p2);
    });
    toast('매물 정보를 불러왔습니다 — 빈 칸은 눌러서 채워 주세요');
  }

  function fromSession() {
    try {
      var raw = sessionStorage.getItem('kts_realty_hand') || sessionStorage.getItem('kts_poster_hand');
      if (!raw) return false;
      fromListing(JSON.parse(raw));
      return true;
    } catch (e) { return false }
  }

  function fromId(id) {
    fetch('data/listings.json', { cache: 'no-store' }).then(function (r) { return r.json() }).then(function (j) {
      var L = (j.listings || []).filter(function (x) { return x.id === id })[0];
      if (L) fromListing(L); else toast('매물 ' + id + '을 찾지 못했습니다');
    }).catch(function () { });
  }

  /* ======================================================================
     PNG — A4 150dpi 캔버스에 다시 그린다
     ====================================================================== */
  var W = 1240, H = 1754, M = 54;

  function wrap(ctx, text, maxW) {
    var words = String(text || '').split(/\s+/).filter(Boolean), out = [], line = '';
    for (var i = 0; i < words.length; i++) {
      var cand = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(cand).width > maxW && line) { out.push(line); line = words[i]; }
      else line = cand;
    }
    if (line) out.push(line);
    return out.length ? out : [''];
  }

  function drawPoster(scale, fill) {
    fill = fill || 0;
    var c = drawPoster.cv;
    var ctx = c.getContext('2d');
    var m = model();
    var S = scale;
    var pad = M;

    ctx.save();
    ctx.fillStyle = C.white; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';

    /* ---- 머리 ---- */
    var y = pad;
    ctx.fillStyle = C.navy; ctx.font = f(34 * S, 900);
    ctx.fillText('교환급매물', pad, y + 30 * S);
    var bw = ctx.measureText('교환급매물').width;
    ctx.fillStyle = C.org; ctx.font = f(19 * S, 900);
    ctx.fillText('.com', pad + bw + 3, y + 30 * S);
    ctx.fillStyle = C.ink2; ctx.font = f(15 * S, 500);
    ctx.fillText('부동산 1:1 맞교환 · 급매물 전문', pad, y + 50 * S);
    ctx.textAlign = 'right'; ctx.font = f(15 * S, 800); ctx.fillStyle = C.ink2;
    ctx.fillText(m.date, W - pad, y + 18 * S);
    ctx.fillStyle = C.org; ctx.fillText(m.no, W - pad, y + 38 * S);
    ctx.textAlign = 'left';
    y += 60 * S;
    ctx.fillStyle = C.navy; ctx.fillRect(pad, y, W - pad * 2, 2.5);
    y += 14 * S;

    /* ---- 제목·가격 ---- */
    var priceW = 330 * S;
    var titleMax = W - pad * 2 - priceW;
    ctx.fillStyle = C.ink; ctx.font = f(40 * S, 900);
    var tl = wrap(ctx, m.title, titleMax).slice(0, 2);
    tl.forEach(function (ln, i) { ctx.fillText(ln, pad, y + 34 * S + i * 44 * S) });
    var ty = y + 34 * S + (tl.length - 1) * 44 * S;
    ctx.fillStyle = C.ink2; ctx.font = f(17 * S, 600);
    var al = wrap(ctx, m.addr, titleMax).slice(0, 1);
    ctx.fillText(al[0] || '', pad, ty + 26 * S);
    /* 가격 오른쪽 */
    ctx.textAlign = 'right';
    ctx.fillStyle = C.ink; ctx.font = f(44 * S, 900);
    ctx.fillText(m.price, W - pad, y + 40 * S);
    ctx.fillStyle = '#b45309'; ctx.font = f(16 * S, 800);
    ctx.fillText(m.pnote, W - pad, y + 64 * S);
    ctx.textAlign = 'left';
    y = ty + 40 * S;
    ctx.fillStyle = C.line; ctx.fillRect(pad, y, W - pad * 2, 1.5);
    y += 12 * S;

    /* ---- ① 사진 ---- */
    var availW = W - pad * 2;
    var phH = 380 * S, gap = 8 * S;
    var bigW = Math.round((availW - gap) * 0.62), smW = availW - gap - bigW;
    function drawImg(im, x, yy, w, h) {
      ctx.fillStyle = C.soft; ctx.fillRect(x, yy, w, h);
      if (!im || !im.complete || !im.naturalWidth) return;
      var s = Math.max(w / im.naturalWidth, h / im.naturalHeight);
      var dw = im.naturalWidth * s, dh = im.naturalHeight * s;
      ctx.save(); ctx.beginPath(); ctx.rect(x, yy, w, h); ctx.clip();
      ctx.drawImage(im, x + (w - dw) / 2, yy + (h - dh) / 2, dw, dh);
      ctx.restore();
    }
    drawImg(photos[0], pad, y, bigW, phH);
    drawImg(photos[1], pad + bigW + gap, y, smW, (phH - gap) / 2);
    drawImg(photos[2], pad + bigW + gap, y + (phH + gap) / 2, smW, (phH - gap) / 2);
    /* 사진 라벨 */
    ctx.fillStyle = 'rgba(15,27,45,.9)'; ctx.fillRect(pad, y + phH - 28 * S, 104 * S, 28 * S);
    ctx.fillStyle = '#fff'; ctx.font = f(14 * S, 900);
    ctx.fillText('① 현장 사진', pad + 10 * S, y + phH - 9 * S);
    y += phH + 12 * S + fill;

    /* ---- 핵심 4칸 ---- */
    var kw = (availW - 3 * 8 * S) / 4, kh = 78 * S;
    m.keys.forEach(function (k, i) {
      var x = pad + i * (kw + 8 * S);
      ctx.fillStyle = i === 1 ? '#fff8ef' : (i === 2 ? '#fff4f4' : '#fbfcfe');
      ctx.fillRect(x, y, kw, kh);
      ctx.strokeStyle = i === 1 ? '#f6c58e' : (i === 2 ? '#f3c1c1' : C.line);
      ctx.lineWidth = 1.5; ctx.strokeRect(x, y, kw, kh);
      ctx.fillStyle = C.ink3; ctx.font = f(14 * S, 800);
      ctx.fillText(['매매가', '승계 대출', '실투자금', '교환 조건'][i], x + 12 * S, y + 26 * S);
      ctx.fillStyle = C.ink; ctx.font = f(24 * S, 900);
      var val = k || '—';
      while (ctx.measureText(val).width > kw - 24 * S && val.length > 2) val = val.slice(0, -2) + '…';
      ctx.fillText(val, x + 12 * S, y + 58 * S);
    });
    y += kh + 16 * S + fill;

    /* ---- 섹션 머리 ---- */
    function secHead(num, title, note) {
      ctx.fillStyle = C.org; ctx.fillRect(pad, y + 2 * S, 4 * S, 20 * S);
      ctx.fillStyle = C.navy; ctx.font = f(21 * S, 900);
      var label = num + ' ' + title;
      ctx.fillText(label, pad + 12 * S, y + 19 * S);
      var lw = ctx.measureText(label).width;
      if (note) {
        ctx.fillStyle = '#6b7280'; ctx.font = f(13 * S, 600);
        ctx.fillText(note, pad + 12 * S + lw + 8 * S, y + 19 * S);
      }
      y += 28 * S;
    }
    function table(rowsData, opts) {
      var c1 = (opts && opts.c1) || 130 * S;
      var fs2 = (opts && opts.fs) || 16 * S;
      var lh = fs2 * 1.5;
      rowsData.forEach(function (r, ri) {
        ctx.font = f(fs2, ri === 0 && opts && opts.headRow ? 900 : 600);
        var valLines = wrap(ctx, r[1], availW - c1 - 24 * S);
        var rowH = Math.max(34 * S, valLines.length * lh + 12 * S);
        ctx.fillStyle = (ri === 0 && opts && opts.headRow) ? '#eef1f6' : C.soft;
        ctx.fillRect(pad, y, c1, rowH);
        ctx.fillStyle = C.white; ctx.fillRect(pad + c1, y, availW - c1, rowH);
        ctx.strokeStyle = C.line; ctx.lineWidth = 1;
        ctx.strokeRect(pad, y, availW, rowH);
        ctx.beginPath(); ctx.moveTo(pad + c1, y); ctx.lineTo(pad + c1, y + rowH); ctx.stroke();
        ctx.fillStyle = C.ink; ctx.font = f(fs2, 900);
        ctx.fillText(r[0], pad + 10 * S, y + 12 * S + fs2);
        ctx.fillStyle = C.ink; ctx.font = f(fs2, 600);
        valLines.forEach(function (ln, i) { ctx.fillText(ln, pad + c1 + 12 * S, y + 12 * S + fs2 + i * lh) });
        y += rowH;
      });
    }
    function bullets(arr) {
      var fs2 = 16 * S, lh = fs2 * 1.5;
      arr.forEach(function (t) {
        var ls = wrap(ctx, t, availW - 22 * S);
        ctx.fillStyle = C.org;
        ctx.beginPath(); ctx.arc(pad + 5 * S, y + fs2 * 0.55, 3.2 * S, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.ink; ctx.font = f(fs2, 500);
        ls.forEach(function (ln, i) { ctx.fillText(ln, pad + 16 * S, y + fs2 + i * lh - 2 * S) });
        y += ls.length * lh + 4 * S;
      });
    }

    /* ---- ② 4대 공부 ---- */
    secHead('②', '4대 공부', '(토지대장 · 건축물대장 · 등기부 · 토지이용계획)');
    table(m.gongbu);
    y += 14 * S + fill;

    /* ---- ③ 입지 정보 ---- */
    secHead('③', '입지 정보');
    bullets(m.loc);
    y += 10 * S + fill;

    /* ---- ④ 권리 분석 ---- */
    secHead('④', '권리 분석');
    bullets(m.right);
    y += 10 * S + fill;

    /* ---- ⑤ 주변 실거래가 ---- */
    secHead('⑤', '주변 실거래가', '(국토부 실거래 공개 기준 · 최근 6개월)');
    /* 5칸 표 */
    (function txTable() {
      var fs2 = 15 * S, lh = fs2 * 1.45;
      var cols = [0.16, 0.28, 0.16, 0.24, 0.16].map(function (r) { return r * availW });
      var head2 = m.txHead.length === 5 ? m.txHead : ['거래 시점', '소재지', '면적', '거래 금액', '거리'];
      function row(cells, isHead) {
        ctx.font = f(fs2, isHead ? 900 : 600);
        var hgt = 32 * S;
        var x = pad;
        for (var i = 0; i < 5; i++) {
          ctx.fillStyle = isHead ? '#eef1f6' : C.white;
          ctx.fillRect(x, y, cols[i], hgt);
          ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.strokeRect(x, y, cols[i], hgt);
          ctx.fillStyle = C.ink;
          var v = String(cells[i] == null ? '' : cells[i]);
          while (ctx.measureText(v).width > cols[i] - 14 * S && v.length > 2) v = v.slice(0, -2) + '…';
          ctx.fillText(v, x + 8 * S, y + hgt / 2 + fs2 * 0.36);
          x += cols[i];
        }
        y += hgt;
      }
      row(head2, true);
      m.tx.forEach(function (r) { row(r, false) });
    })();

    /* ---- 발 ---- */
    var footH = 186 * S;
    drawPoster.lastContent = y;
    var fy = Math.max(y + 18 * S, H - footH);
    ctx.fillStyle = C.navy; ctx.fillRect(0, fy, W, H - fy);
    /* 직인 */
    try {
      var sealSize = 200 * S;
      var sc = document.createElement('canvas');
      KTS.Seal.paint(sc, sealSize, sealOpts());
      var sh = sealSize * sc.height / Math.max(1, sc.width);
      ctx.drawImage(sc, W - pad - sealSize, fy + 18 * S, sealSize, sh);
    } catch (e) { }
    ctx.fillStyle = C.white; ctx.font = f(28 * S, 900);
    ctx.fillText(m.name, pad, fy + 42 * S);
    ctx.fillStyle = '#c7d4e8'; ctx.font = f(17 * S, 600);
    ctx.fillText(m.role, pad, fy + 68 * S);
    ctx.fillStyle = '#ffb066'; ctx.font = f(32 * S, 900);
    ctx.fillText(m.phone, pad, fy + 108 * S);
    ctx.fillStyle = '#9db0ca'; ctx.font = f(13 * S, 500);
    var fl = wrap(ctx, m.fine, availW - 190 * S).slice(0, 3);
    fl.forEach(function (ln, i) { ctx.fillText(ln, pad, fy + 134 * S + i * 19 * S) });
    ctx.fillStyle = '#6f819c'; ctx.font = f(12 * S, 700);
    ctx.fillText('교환급매물.com · KTS 원클릭', pad, fy + footH - 14 * S);

    ctx.restore();
    return y;
  }

  function buildPng() {
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    drawPoster.cv = cv;
    var scale = 1, fill = 0;
    for (var i = 0; i < 9; i++) {
      drawPoster(scale, fill);
      /* 본문 끝이 발(footer) 자리를 넘으면 글자를 줄여 다시 그린다 */
      if (drawPoster.lastContent <= H - 186 * scale - M) break;
      fill = 0; scale -= 0.045;
      if (scale < 0.68) break;
    }
    /* 내용이 짧아 아래가 비면 섹션 사이 여백을 고르게 늘려 A4를 채운다 */
    var rest = (H - 186 * scale - M) - drawPoster.lastContent;
    if (rest > 24) {
      fill = Math.min(46, Math.round(rest / 6));
      drawPoster(scale, fill);
    }
    return cv;
  }

  function savePng() {
    try {
      var cv = buildPng();
      /* data URL 로 바로 내려받기 — 카톡·문자·인쇄 어디서든 같은 파일 */
      var url = cv.toDataURL('image/png');
      var a = document.createElement('a');
      a.href = url;
      a.download = (txt('#p-title') || '물건포스터').replace(/[\\/:*?"<>|]/g, '').slice(0, 30) + '_포스터.png';
      document.body.appendChild(a); a.click(); a.remove();
      toast('A4 포스터 PNG를 저장했습니다 (1240×1754)', 3200);
    } catch (e) { toast('이 기기에서는 PNG 저장이 어렵습니다'); }
  }

  /* ---------------- 준비 ---------------- */
  function toast(msg, ms) {
    var t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove('on') }, ms || 2600);
  }

  function collectPhotos() {
    photos = [];
    for (var i = 0; i < 3; i++) {
      var im = $('#ph' + i);
      var src = im && im.getAttribute('src');
      if (!src) { photos.push(null); continue; }
      if (im.complete && im.naturalWidth) photos.push(im);
      else {
        var n = new Image(); n.src = src;
        photos.push(n.complete && n.naturalWidth ? n : null);
      }
    }
  }

  function boot() {
    if (window.KTS && KTS.Seal) paintSeal();
    var id = (location.search.match(/[?&]id=([^&]+)/) || [])[1];
    if (!fromSession() && id) fromId(decodeURIComponent(id));
    else if (!fromSession()) {
      /* 처음 열면 예시 사진으로 모양을 보여 준다 */
      DEMO_PHOTOS.forEach(function (p, i) { setPhoto(i, p) });
    }

    $('#btnPrint').addEventListener('click', function () { collectPhotos(); window.print() });
    $('#btnPng').addEventListener('click', function () { collectPhotos(); savePng() });
    $('#ph').addEventListener('change', function () { loadPhotos(this.files); this.value = '' });
    $('#btnSample').addEventListener('click', sample);
    $('#btnRealty').addEventListener('click', function () { location.href = '../realty/' });
    $('#btnShape').addEventListener('click', function () {
      var order = ['circle', 'square', 'oval'];
      var cur = localStorage.getItem('kts_poster_seal') || 'circle';
      var nx = order[(order.indexOf(cur) + 1) % 3];
      localStorage.setItem('kts_poster_seal', nx);
      paintSeal();
      toast('직인 모양 — ' + ({ circle: '원형', square: '사각', oval: '타원' })[nx]);
    });
    $('#pSeal').addEventListener('click', function () {
      /* 크게 보기 — 새 창 없이 화면에 크게 */
      var w = window.open('', '_blank');
      if (!w) { toast('팝업이 막혔습니다'); return }
      var url = KTS.Seal.dataUrl(700, sealOpts());
      w.document.write('<title>직인 QR</title><body style="margin:0;display:grid;place-items:center;height:100vh"><img src="' + url + '" style="width:88vw;max-width:600px">');
    });
    document.addEventListener('input', function () { });
    /* 발 이름·전화를 고치면 도장 이름도 따라간다 */
    ['#p-name'].forEach(function (s) {
      var el = $(s); if (el) el.addEventListener('blur', paintSeal);
    });
    collectPhotos();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
