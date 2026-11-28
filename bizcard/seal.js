/* ==========================================================================
   KTS 명함 QR — 세 가지 격(格)  (250 · 295 · 297번)
   --------------------------------------------------------------------------
   ① 직인 도장 QR   style:'seal'  — 원형·사각·타원 도장 안에 QR (기본)
   ② 관공서 문서형   style:'gov'   — 굵은 정사각 틀 + 가운데 심볼 + 짧은 코드
   ③ 내 사진 QR     style:'photo' — 사진 가운데 초점, 바깥은 점점 흐려짐(radial fade)
   --------------------------------------------------------------------------
   화면·명함 PNG·물건표 어디에 찍어도 스캔이 되도록
     ① 오류정정 H(30%) ② QR 둘레 흰 여백 ③ 기둥(파인더) 또렷 ④ 바탕 흰색 고정.

   쓰는 법
     KTS.Seal.paint(canvas, size, {style, shape, name, value, photo, code, onload})
     KTS.Seal.onCtx(ctx, x, y, size, opts)      // 이미 그려진 캔버스 위에 찍기
     KTS.Seal.dataUrl(size, opts)               // PNG data URL
     KTS.Seal.payload(me)                       // QR에 담을 글자
     KTS.Seal.primePhoto(src)                   // 사진 미리 읽기(Promise)
   ========================================================================== */
(function (g) {
  'use strict';
  var KTS = g.KTS = g.KTS || {};
  var RED = '#B01B22';          /* 진한 인주 빨강 — 흰 바탕과 명암비 8.6:1 */
  var NAVY = '#10203a';
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

  /* QR에 담을 내용 — 기본은 전자명함 주소(짧은 주소가 있으면 그것), 고르면 연락처(MECARD) */
  function payload(me) {
    me = me || {};
    if (me.qrKind === 'contact') {
      var parts = ['MECARD:N:' + (me.name || '')];
      if (me.org) parts.push('ORG:' + String(me.org).replace(/·/g, '/'));
      if (me.phone) parts.push('TEL:' + String(me.phone).replace(/[^0-9+]/g, ''));
      parts.push('URL:' + cardUrl(me));
      return parts.join(';') + ';;';
    }
    return cardUrl(me);
  }
  function cardUrl(me) {
    me = me || {};
    var host = (g.location && g.location.origin) || 'https://autooneclick.com';
    if (!/^https?:/.test(host)) host = 'https://autooneclick.com';
    host = host.replace(/\/$/, '');
    /* 302수리C — 이름 주소(autooneclick.com/김중개)는 QR에 인코딩해 담는다 */
    if (me.slug) return host + '/' + encodeURIComponent(me.slug);
    if (me.shortUrl && /^https?:\/\/[^\s]+$/.test(me.shortUrl)) return me.shortUrl;
    if (me.shortNo) return host + '/' + me.shortNo;
    return host + '/bizcard/';
  }

  /* ---------------- 모양별 판(版) 계산 ---------------- */
  function geom(shape, S) {
    var H = shape === 'oval' ? Math.round(S * 1.3) : S;
    var box = shape === 'oval' ? 0.64 : (shape === 'square' ? 0.66 : 0.60);
    var qr = Math.round(S * box);
    return { W: S, H: H, qr: qr, cx: S / 2, cy: H / 2, shape: shape };
  }
  function geomOf(style, shape, S) {
    if (style === 'gov') return { W: S, H: S, qr: Math.round(S * 0.60), cx: S / 2, cy: S / 2, style: style };
    if (style === 'photo') return { W: S, H: S, qr: Math.round(S * 0.46), cx: S / 2, cy: S / 2, style: style };
    return geom(shape, S);
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

  function fontOf(px, w) {
    return (w || 900) + ' ' + Math.max(6, Math.round(px)) + 'px "Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR","Noto Sans CJK KR",sans-serif';
  }

  /* ---------------- QR 한 벌 그리기 ---------------- */
  /* x0,y0 = QR(흰 여백 제외) 첫 모듈의 왼쪽·위, m = 1모듈 크기 */
  function paintQR(ctx, q, x0, y0, m, color, dot) {
    var n = q.getModuleCount();
    var gap = dot ? 0 : Math.max(0, m * 0.04);
    function isFinder(r, c) {
      return (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
    }
    ctx.fillStyle = color;
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (!q.isDark(r, c) || isFinder(r, c)) continue;
        var mx = x0 + c * m, my = y0 + r * m;
        if (dot) {
          ctx.beginPath();
          ctx.arc(mx + m / 2, my + m / 2, m * 0.47, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(mx + gap, my + gap, m - gap * 2, m - gap * 2);
        }
      }
    }
    function finder(cx0, cy0) {
      var rad = dot ? m * 0.9 : m * 0.12;
      ctx.fillStyle = color;
      roundRect(ctx, x0 + cx0 * m, y0 + cy0 * m, m * 7, m * 7, rad); ctx.fill();
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, x0 + cx0 * m + m, y0 + cy0 * m + m, m * 5, m * 5, rad * 0.75); ctx.fill();
      ctx.fillStyle = color;
      roundRect(ctx, x0 + cx0 * m + m * 2, y0 + cy0 * m + m * 2, m * 3, m * 3, rad * 0.55); ctx.fill();
    }
    finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
  }
  /* 판(흰 사각) 안에 QR을 모듈 픽셀에 맞춰 또렷하게 */
  function qrIn(ctx, q, cx, cy, box, color, dot) {
    var n = q.getModuleCount();
    var m = box / (n + QZ * 2);
    var mR = m >= 4 ? Math.floor(m) : Math.max(1, Math.floor(m * 2) / 2);
    var span = mR * (n + QZ * 2);
    var qx = Math.round(cx - span / 2), qy = Math.round(cy - span / 2);
    paintQR(ctx, q, qx + mR * QZ, qy + mR * QZ, mR, color, dot);
    return { m: mR, x: qx + mR * QZ, y: qy + mR * QZ, span: span };
  }

  /* ---------------- ① 직인 도장 ---------------- */
  function drawSeal(ctx, S, o) {
    var shape = (o.shape === 'square' || o.shape === 'oval') ? o.shape : 'circle';
    var color = o.color || RED;
    var name = String(o.name == null ? '' : o.name).trim();
    var value = o.value || payload(o.me || {});
    var q = makeQR(value, hasHangul(value));
    var n = q.getModuleCount();
    var G = geom(shape, S);
    var W = G.W, H = G.H;

    /* 1) 도장 바탕 — 흰색(종이) · 스캔 여백 */
    ctx.fillStyle = '#ffffff';
    shapePath(ctx, shape, W, H, 0); ctx.fill();

    /* 2) 테두리 두 줄 */
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, S * 0.016);
    shapePath(ctx, shape, W, H, S * 0.012); ctx.stroke();
    ctx.lineWidth = Math.max(1, S * 0.006);
    shapePath(ctx, shape, W, H, S * 0.045); ctx.stroke();

    /* 3) QR — 흰 여백 4모듈 포함해 가운데 */
    var qr = G.qr, dot = shape === 'oval';
    var mm = qr / (n + QZ * 2);
    var mR = mm >= 4 ? Math.floor(mm) : Math.max(1, Math.floor(mm * 2) / 2);
    var span = mR * (n + QZ * 2);
    var qx = Math.round(G.cx - span / 2), qy = Math.round(G.cy - span / 2);
    paintQR(ctx, q, qx + mR * QZ, qy + mR * QZ, mR, color, dot);

    /* 4) 가운데 이름 — 오류정정 H(30%)로 덮어도 읽히는 크기 */
    if (name) {
      var plateW = Math.min(span * 0.46, mR * 11);
      var plateH = Math.max(mR * 3.1, span * 0.15);
      var plateX = G.cx - plateW / 2, plateY = G.cy - plateH / 2;
      ctx.fillStyle = color;
      roundRect(ctx, plateX, plateY, plateW, plateH, Math.min(plateH * 0.26, mR * 1.1));
      ctx.fill();
      var fs = plateH * 0.66;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = fontOf(fs);
      var tw = ctx.measureText(name).width;
      var maxW = plateW * 0.88;
      if (tw > maxW) { fs = fs * maxW / tw; ctx.font = fontOf(fs); }
      ctx.fillText(name, G.cx, plateY + plateH * 0.53);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }

    /* 5) 타원 도장 위·아래 글귀 */
    if (shape === 'oval') {
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      var fs2 = S * 0.05;
      var maxW2 = S * 0.56;
      var top = o.top || '원클릭 · 교환급매물';
      var bot = o.bottom || '부동산 교환 전문가';
      function tag(str, yy) {
        ctx.font = fontOf(fs2, 800);
        var w2 = ctx.measureText(str).width;
        if (w2 > maxW2) ctx.font = fontOf(fs2 * maxW2 / w2, 800);
        ctx.fillText(str, G.cx, yy);
      }
      tag(top, S * 0.19);
      tag(bot, H - S * 0.175);
      ctx.textAlign = 'left';
    }
    return G;
  }

  /* ---------------- ② 관공서 문서형 — 굵은 정사각 틀 + 가운데 심볼 + 짧은 코드 ---------------- */
  function drawGov(ctx, S, o) {
    var color = o.color || NAVY;
    var value = o.value || payload(o.me || {});
    var q = makeQR(value, hasHangul(value));
    var W = S, H = S;
    var pad = Math.max(2, Math.round(S * 0.035));         /* 바깥 여백 */
    var frame = Math.max(3, Math.round(S * 0.052));       /* 굵은 틀 */
    var G = geomOf('gov', 'square', S);

    /* 틀 — 흰 종이 위에 굵은 남색 정사각 + 안쪽 가는 금선 */
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, pad, pad, W - pad * 2, H - pad * 2, Math.max(3, S * 0.03)); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = frame;
    roundRect(ctx, pad + frame / 2, pad + frame / 2, W - pad * 2 - frame, H - pad * 2 - frame, Math.max(3, S * 0.03)); ctx.stroke();
    ctx.strokeStyle = 'rgba(201,160,99,.85)'; ctx.lineWidth = Math.max(1, S * 0.007);
    var inset = pad + frame + Math.max(2, S * 0.016);
    roundRect(ctx, inset, inset, W - inset * 2, H - inset * 2, Math.max(2, S * 0.02)); ctx.stroke();

    /* QR — 틀 안쪽 가득 */
    var room = W - inset * 2 - Math.max(4, S * 0.03) * 2;
    var box = Math.min(room, S * 0.60);
    var qcy = H * 0.435;
    qrIn(ctx, q, W / 2, qcy, box, color, false);

    /* 가운데 심볼 — 오류정정 H 여유 안에서 작게 */
    var sym = Math.max(10, Math.round(box * 0.19));
    var sx = W / 2 - sym / 2, sy = qcy - sym / 2;
    ctx.fillStyle = color;
    roundRect(ctx, sx, sy, sym, sym, sym * 0.24); ctx.fill();
    ctx.fillStyle = '#e2ba7a';
    roundRect(ctx, sx + sym * 0.14, sy + sym * 0.14, sym * 0.72, sym * 0.72, sym * 0.16); ctx.fill();
    ctx.fillStyle = color;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = fontOf(sym * 0.42, 900);
    ctx.fillText('KTS', W / 2, sy + sym * 0.54);

    /* 짧은 코드 — 발급 번호(없으면 주소 끝 4자) */
    var code = String(o.code || codeOf(value));
    ctx.fillStyle = color;
    ctx.font = fontOf(S * 0.062, 900);
    ctx.fillText('NO. ' + code, W / 2, H - inset - S * 0.098);
    ctx.fillStyle = 'rgba(16,32,58,.62)';
    ctx.font = fontOf(S * 0.034, 700);
    ctx.fillText('전자명함 · 휴대폰 카메라로 확인', W / 2, H - inset - S * 0.048);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    return G;
  }
  function codeOf(v) {
    var s = String(v || ''), h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1679616; /* 36^4 */
    return ('0000' + h.toString(36).toUpperCase()).slice(-4);
  }

  /* ---------------- ③ 내 사진 — 가운데 초점, 바깥 점점 흐려짐 ---------------- */
  var IMG = {};
  function primePhoto(src) {
    if (!src) return Promise.resolve(null);
    if (IMG[src] && IMG[src].ok) return Promise.resolve(IMG[src].img);
    if (IMG[src] && IMG[src].wait) return IMG[src].wait;
    var rec = IMG[src] = { ok: false };
    rec.wait = new Promise(function (res) {
      var im = new Image();
      im.onload = function () { rec.ok = true; rec.img = im; res(im); };
      im.onerror = function () { rec.ok = false; res(null); };
      im.src = src;
    });
    return rec.wait;
  }
  function photoReady(src) { return !!(src && IMG[src] && IMG[src].ok); }
  function photoOf(src) { return (src && IMG[src] && IMG[src].ok) ? IMG[src].img : null; }

  function drawPhoto(ctx, S, o) {
    var W = S, H = S, r = S / 2;
    var value = o.value || payload(o.me || {});
    var q = makeQR(value, hasHangul(value));
    var img = photoOf(o.photo);
    var G = geomOf('photo', 'square', S);

    ctx.clearRect(0, 0, W, H);
    /* 바탕 — 짙은 남색 원(사진이 없어도 격이 유지된다) */
    ctx.fillStyle = NAVY;
    ctx.beginPath(); ctx.arc(r, r, r - 1, 0, Math.PI * 2); ctx.fill();

    if (img) {
      /* 가운데 초점 + 바깥 radial fade — 원 밖으로 갈수록 투명해진다 */
      var cv = document.createElement('canvas');
      cv.width = S; cv.height = S;
      var cx2 = cv.getContext('2d');
      var s = Math.max(S / img.width, S / img.height);
      var dw = img.width * s, dh = img.height * s;
      cx2.drawImage(img, (S - dw) / 2, (S - dh) / 2, dw, dh);
      var fade = cx2.createRadialGradient(r, r, r * 0.30, r, r, r * 0.98);
      fade.addColorStop(0, 'rgba(0,0,0,1)');
      fade.addColorStop(0.62, 'rgba(0,0,0,.92)');
      fade.addColorStop(1, 'rgba(0,0,0,0)');
      cx2.globalCompositeOperation = 'destination-in';
      cx2.fillStyle = fade;
      cx2.beginPath(); cx2.arc(r, r, r, 0, Math.PI * 2); cx2.fill();
      cx2.globalCompositeOperation = 'source-over';
      ctx.drawImage(cv, 0, 0);
      /* 바깥 금테 — 사진이 흐려지는 자리를 잡아 준다 */
      ctx.strokeStyle = 'rgba(226,186,122,.9)'; ctx.lineWidth = Math.max(1.5, S * 0.012);
      ctx.beginPath(); ctx.arc(r, r, r - ctx.lineWidth, 0, Math.PI * 2); ctx.stroke();
    }

    /* QR — 오른쪽 아래 흰 판 위(얼굴을 가리지 않는다) */
    var box = G.qr, platePad = box * 0.09;
    var px = W - box - S * 0.055, py = H - box - S * 0.055;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = S * 0.03;
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, px - platePad, py - platePad, box + platePad * 2, box + platePad * 2, S * 0.035); ctx.fill();
    ctx.restore();
    qrIn(ctx, q, px + box / 2, py + box / 2, box, NAVY, false);

    /* 이름 띠 — 사진 아래쪽에 얇게 */
    if (o.name) {
      var nm = String(o.name).slice(0, 8);
      ctx.font = fontOf(S * 0.072, 900);
      var tw = ctx.measureText(nm).width + S * 0.08;
      var bw = Math.min(S * 0.72, tw), bh = S * 0.115;
      ctx.fillStyle = 'rgba(11,21,38,.82)';
      roundRect(ctx, S * 0.055, H - bh - S * 0.06, bw, bh, bh / 2); ctx.fill();
      ctx.fillStyle = '#ffe3b0';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(nm, S * 0.055 + bw / 2, H - bh / 2 - S * 0.06 + S * 0.004);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }
    return G;
  }

  /* ---------------- 그리기 입구 ---------------- */
  function draw(ctx, S, o) {
    o = o || {};
    var style = (o.style === 'gov' || o.style === 'photo') ? o.style : 'seal';
    ctx.save();
    if (style === 'gov') drawGov(ctx, S, o);
    else if (style === 'photo') drawPhoto(ctx, S, o);
    else drawSeal(ctx, S, o);
    ctx.restore();
    return geomOf(style, o.shape, S);
  }

  /* ---------------- 공개 API ---------------- */
  function styleOf(o) { return (o && (o.style === 'gov' || o.style === 'photo')) ? o.style : 'seal'; }

  function paint(canvas, size, o) {
    var G = geomOf(styleOf(o), (o && o.shape) || 'circle', size);
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
    /* 사진형은 사진을 먼저 읽어야 그려진다 — 다 읽으면 한 번 더 그려 달라고 알린다 */
    if (styleOf(o) === 'photo' && o && o.photo && !photoReady(o.photo)) {
      primePhoto(o.photo).then(function (im) {
        if (im && typeof o.onload === 'function') { try { o.onload() } catch (e) { } }
      });
    }
    return r;
  }

  function offscreen(size, o) {
    var G = geomOf(styleOf(o), (o && o.shape) || 'circle', size);
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
               payload: payload, cardUrl: cardUrl, geom: geom, geomOf: geomOf,
               primePhoto: primePhoto, photoReady: photoReady, codeOf: codeOf,
               styleOf: styleOf, RED: RED, NAVY: NAVY };
})(window);
