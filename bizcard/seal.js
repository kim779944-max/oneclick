/* ==========================================================================
   KTS 직인 도장 QR — 원형 · 사각 · 타원  (250번)
   --------------------------------------------------------------------------
   이름을 가운데 넣은 도장 모양 QR. 화면·명함 PNG·포스터 어디에 찍어도
   스캔이 되도록 ① 오류정정 H(30%) ② QR 둘레 4모듈 흰 여백 ③ 기둥(파인더)
   무늬 원형 유지 ④ 도장 바탕 흰색 고정 으로 그린다.

   쓰는 법
     KTS.Seal.paint(canvas, size, {shape:'circle'|'square'|'oval', name, value})
     KTS.Seal.onCtx(ctx, x, y, size, opts)      // 이미 그려진 캔버스 위에 찍기
     KTS.Seal.dataUrl(size, opts)               // PNG data URL
     KTS.Seal.payload(me)                       // QR에 담을 글자
   ========================================================================== */
(function (g) {
  'use strict';
  var KTS = g.KTS = g.KTS || {};
  var RED = '#B01B22';          /* 진한 인주 빨강 — 흰 바탕과 명암비 8.6:1 */
  var QZ = 4;                   /* QR 규격 흰 여백 4모듈 */

  /* ---------------- QR 행렬 (qrcode-generator: vendor/qrcode.js) ---------------- */
  function makeQR(text, utf8) {
    var lib = g.qrcode;
    if (!lib) throw new Error('QR 라이브러리를 찾지 못했습니다');
    var keep = lib.stringToBytes;
    if (utf8) lib.stringToBytes = lib.stringToBytesFuncs['UTF-8'];
    try {
      var q = lib(0, 'H');          /* 형식 자동 · 오류정정 H */
      q.addData(text);
      q.make();
      return q;
    } finally { lib.stringToBytes = keep; }
  }

  function hasHangul(s) { return /[^\x00-\x7F]/.test(s); }

  /* QR에 담을 내용 — 기본은 전자명함 주소, 고르면 연락처(MECARD) */
  function payload(me) {
    me = me || {};
    if (me.qrKind === 'contact') {
      var parts = ['MECARD:N:' + (me.name || '')];
      if (me.org) parts.push('ORG:' + String(me.org).replace(/·/g, '/'));
      if (me.phone) parts.push('TEL:' + String(me.phone).replace(/[^0-9+]/g, ''));
      parts.push('URL:' + cardUrl());
      return parts.join(';') + ';;';
    }
    return cardUrl();
  }
  function cardUrl() {
    var o = (g.location && g.location.origin) || 'https://autooneclick.com';
    if (!/^https?:/.test(o)) o = 'https://autooneclick.com';
    return o.replace(/\/$/, '') + '/bizcard/';
  }

  /* ---------------- 모양별 판(版) 계산 ---------------- */
  function geom(shape, S) {
    /* S = 도장 가로 크기(px) · 타원은 세로가 1.3배 */
    var H = shape === 'oval' ? Math.round(S * 1.3) : S;
    var box = shape === 'oval' ? 0.64 : (shape === 'square' ? 0.66 : 0.60);
    var qr = Math.round(S * box);            /* QR 한 변(흰 여백 포함) */
    var cx = S / 2, cy = H / 2;
    return { W: S, H: H, qr: qr, cx: cx, cy: cy };
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function shapePath(ctx, shape, W, H, inset) {
    var i = inset || 0;
    ctx.beginPath();
    if (shape === 'oval') {
      ctx.ellipse(W / 2, H / 2, W / 2 - i, H / 2 - i, 0, 0, Math.PI * 2);
    } else if (shape === 'square') {
      roundRect(ctx, i, i, W - i * 2, H - i * 2, Math.max(4, W * 0.06));
    } else {
      ctx.arc(W / 2, H / 2, W / 2 - i, 0, Math.PI * 2);
    }
  }

  /* ---------------- 그리기 ---------------- */
  function draw(ctx, S, o) {
    o = o || {};
    var shape = (o.shape === 'square' || o.shape === 'oval') ? o.shape : 'circle';
    var color = o.color || RED;
    var name = String(o.name == null ? '' : o.name).trim();
    var value = o.value || payload(o.me || {});
    var q = makeQR(value, hasHangul(value));
    var n = q.getModuleCount();
    var G = geom(shape, S);
    var W = G.W, H = G.H;

    ctx.save();
    ctx.clearRect(0, 0, W, H);

    /* 1) 도장 바탕 — 흰색(종이) · 스캔 여백 확보 */
    ctx.fillStyle = '#ffffff';
    shapePath(ctx, shape, W, H, 0); ctx.fill();

    /* 2) 테두리 두 줄 */
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, S * 0.016);
    shapePath(ctx, shape, W, H, S * 0.012); ctx.stroke();
    ctx.lineWidth = Math.max(1, S * 0.006);
    shapePath(ctx, shape, W, H, S * 0.045); ctx.stroke();

    /* 3) QR — 흰 여백 4모듈 포함해 가운데 */
    var qr = G.qr;
    var m = qr / (n + QZ * 2);                 /* 1모듈 크기 */
    /* 모듈을 픽셀에 맞춰 또렷하게 (스캔률) */
    /* 작은 크기에서도 모서리가 뭉개지지 않게 모듈을 픽셀에 맞춘다 */
    var mR = m >= 4 ? Math.floor(m) : Math.max(1, Math.floor(m * 2) / 2);
    var span = mR * (n + QZ * 2);
    var qx = Math.round(G.cx - span / 2);
    var qy = Math.round(G.cy - span / 2);
    var x0 = qx + mR * QZ, y0 = qy + mR * QZ;
    var dot = shape === 'oval';
    var gap = dot ? 0 : Math.max(0, mR * 0.04);

    function px(c) { return x0 + c * mR; }

    ctx.fillStyle = color;
    /* 기둥무늬(7×7 파인더)는 따로 그린다 */
    function isFinder(r, c) {
      return (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
    }
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (!q.isDark(r, c) || isFinder(r, c)) continue;
        var mx = px(c), my = px(r);
        if (dot) {
          ctx.beginPath();
          ctx.arc(mx + mR / 2, my + mR / 2, mR * 0.47, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(mx + gap, my + gap, mR - gap * 2, mR - gap * 2);
        }
      }
    }
    /* 파인더 3곳 — 테두리 1모듈 · 흰칸 1모듈 · 가운데 3모듈 */
    function finder(cx0, cy0) {
      var rad = dot ? mR * 0.9 : mR * 0.12;
      ctx.fillStyle = color;
      roundRect(ctx, px(cx0), px(cy0), mR * 7, mR * 7, rad); ctx.fill();
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, px(cx0) + mR, px(cy0) + mR, mR * 5, mR * 5, rad * 0.75); ctx.fill();
      ctx.fillStyle = color;
      roundRect(ctx, px(cx0) + mR * 2, px(cy0) + mR * 2, mR * 3, mR * 3, rad * 0.55); ctx.fill();
    }
    finder(0, 0); finder(n - 7, 0); finder(0, n - 7);

    /* 4) 가운데 이름 — 오류정정 H(30%)로 덮어도 읽히는 크기 */
    if (name) {
      var plateW = Math.min(span * 0.46, mR * 11);
      var plateH = Math.max(mR * 3.1, span * 0.15);
      var plateX = G.cx - plateW / 2, plateY = G.cy - plateH / 2;
      ctx.fillStyle = color;
      roundRect(ctx, plateX, plateY, plateW, plateH, Math.min(plateH * 0.26, mR * 1.1));
      ctx.fill();
      /* 이름 글자 — 흰색 · 판 안에 꽉 차게 */
      var fs = plateH * 0.66;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      var font = function (s) {
        return '900 ' + s + 'px "Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR","Noto Sans CJK KR",sans-serif';
      };
      ctx.font = font(fs);
      var tw = ctx.measureText(name).width;
      var maxW = plateW * 0.88;
      if (tw > maxW) { fs = fs * maxW / tw; ctx.font = font(fs); }
      ctx.fillText(name, G.cx, plateY + plateH * 0.53);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }

    /* 5) 타원 도장 위·아래 글귀 — 테두리 안쪽으로 넣어 겹치지 않게 */
    if (shape === 'oval') {
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      var fs2 = S * 0.05;
      var maxW2 = S * 0.56;
      var top = o.top || '원클릭 · 교환급매물';
      var bot = o.bottom || '부동산 교환 전문가';
      function tag(str, yy) {
        ctx.font = '800 ' + fs2 + 'px "Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif';
        var w2 = ctx.measureText(str).width;
        if (w2 > maxW2) { ctx.font = '800 ' + (fs2 * maxW2 / w2) + 'px "Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif'; }
        ctx.fillText(str, G.cx, yy);
      }
      tag(top, S * 0.19);
      tag(bot, H - S * 0.175);
      ctx.textAlign = 'left';
    }
    ctx.restore();
    return G;
  }

  /* ---------------- 공개 API ---------------- */
  function paint(canvas, size, o) {
    var shape = (o && o.shape) || 'circle';
    var G = geom(shape, size);
    var dpr = Math.min(3, Math.max(1, (g.devicePixelRatio || 1)));
    canvas.width = Math.round(G.W * dpr);
    canvas.height = Math.round(G.H * dpr);
    canvas.style.width = G.W + 'px';
    canvas.style.height = G.H + 'px';
    var ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.save();
    ctx.scale(dpr, dpr);
    var r = draw(ctx, size, o);
    ctx.restore();
    return r;
  }

  function offscreen(size, o) {
    var shape = (o && o.shape) || 'circle';
    var G = geom(shape, size);
    var c = document.createElement('canvas');
    c.width = G.W; c.height = G.H;
    var ctx = c.getContext('2d');
    draw(ctx, size, o);
    return c;
  }

  function onCtx(ctx, x, y, size, o) {
    var c = offscreen(size, o);
    ctx.drawImage(c, x, y, c.width, c.height);
    return c;
  }

  function dataUrl(size, o) {
    try { return offscreen(size, o).toDataURL('image/png'); } catch (e) { return ''; }
  }

  KTS.Seal = { draw: draw, paint: paint, onCtx: onCtx, dataUrl: dataUrl,
               payload: payload, cardUrl: cardUrl, geom: geom, RED: RED };
})(window);
