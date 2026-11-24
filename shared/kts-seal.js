/* ==========================================================================
   KTS 원클릭 — 사인·도장·간인 공통 모듈 (2026-11-24 · 167·188번)
   ---------------------------------------------------------------------------
   · 도장함: 한 번 만든 사인·도장을 이 브라우저(localStorage['kts_seal_box_v1'])에 담아
     더싸인 · 계약서 · 더양식 어디서나 같은 것을 꺼내 찍는다.
   · 간인(契印): 쪽과 쪽이 맞닿는 가장자리에 도장을 정확히 반씩 걸쳐 찍는다
     (앞장 오른쪽 끝 절반 + 뒷장 왼쪽 끝 절반). 2부·3부는 같은 자리에 되풀이해 찍는다.
   · PDF 저장: 그림(JPEG)들을 그대로 담아 PDF 1.4 파일로 만든다 — 서버·외부 라이브러리 0.
   window.KTSSeal = { box, save, remove, fromPhoto, fromName, load, draw, ganinHalf, pdf, MM }
   ========================================================================== */
(function (w) {
  'use strict';
  var KEY = 'kts_seal_box_v1';
  var MM = 3.7795275591;   /* 96dpi 기준 1mm(px) — 화면·인쇄 공통 비율 */

  function lsGet(k, d) { try { var v = w.localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function lsSet(k, v) { try { w.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }

  function box() { var a = lsGet(KEY, []); return Array.isArray(a) ? a.filter(function (x) { return x && x.src; }) : []; }
  function save(item) {
    if (!item || !item.src) return box();
    var a = box().filter(function (x) { return x.id !== item.id; });
    a.unshift({ id: item.id || ('s' + Date.now().toString(36)), nm: String(item.nm || '도장').slice(0, 20), src: item.src, at: Date.now() });
    a = a.slice(0, 8);
    lsSet(KEY, a);
    return a;
  }
  function remove(id) { var a = box().filter(function (x) { return x.id !== id; }); lsSet(KEY, a); return a; }

  function load(src) {
    return new Promise(function (res) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = src; });
  }
  function fileToDataUrl(file) {
    return new Promise(function (res, rej) {
      var u = URL.createObjectURL(file), i = new Image();
      i.onload = function () { URL.revokeObjectURL(u); res(i); };
      i.onerror = function () { URL.revokeObjectURL(u); rej(new Error('사진을 열지 못했습니다')); };
      i.src = u;
    });
  }

  /* 종이에 찍은 도장 사진 → 바탕(흰 종이)을 지운 투명 PNG */
  function cleanStamp(im, opt) {
    opt = opt || {};
    var mx = 700, s = Math.min(1, mx / Math.max(im.naturalWidth || im.width, im.naturalHeight || im.height));
    var W = Math.max(1, Math.round((im.naturalWidth || im.width) * s)), H = Math.max(1, Math.round((im.naturalHeight || im.height) * s));
    var cv = w.document.createElement('canvas'); cv.width = W; cv.height = H;
    var g = cv.getContext('2d'); g.drawImage(im, 0, 0, W, H);
    var id = g.getImageData(0, 0, W, H), d = id.data;
    var keep = [], sum = 0, n = 0;
    for (var i = 0; i < d.length; i += 4) { var l = (d[i] * .299 + d[i + 1] * .587 + d[i + 2] * .114); sum += l; n++; }
    var avg = sum / Math.max(1, n), th = opt.th || Math.max(120, Math.min(225, avg - 34));
    for (var j = 0; j < d.length; j += 4) {
      var lum = d[j] * .299 + d[j + 1] * .587 + d[j + 2] * .114;
      var a = lum >= th ? 0 : Math.min(255, Math.round((th - lum) * (255 / Math.max(30, th - 40))));
      d[j + 3] = a;
      /* 먹·인주를 진하게: 어두운 픽셀은 색을 살짝 진하게 */
      if (a > 24) { d[j] = Math.min(255, d[j] * 1.05); d[j + 1] = Math.min(255, d[j + 1] * 0.98); d[j + 2] = Math.min(255, d[j + 2] * 0.98); }
    }
    g.putImageData(id, 0, 0);
    return cropAlpha(cv);
  }
  /* 여백 잘라내기 — 도장이 작게 찍힌 사진도 크게 쓸 수 있게 */
  function cropAlpha(cv) {
    var g = cv.getContext('2d'), W = cv.width, H = cv.height, d = g.getImageData(0, 0, W, H).data;
    var x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return cv.toDataURL('image/png');
    var m = Math.round(Math.max(x1 - x0, y1 - y0) * .04) + 2;
    x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(W - 1, x1 + m); y1 = Math.min(H - 1, y1 + m);
    var o = w.document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1;
    o.getContext('2d').drawImage(cv, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
    return o.toDataURL('image/png');
  }

  /* 이름 → 인감 스타일 도장(붉은 테두리 + 한글 이름) */
  function fromName(name, shape) {
    var nm = String(name || '').replace(/\s+/g, '').slice(0, 5) || '도장';
    var S = 420, cv = w.document.createElement('canvas'); cv.width = S; cv.height = S;
    var g = cv.getContext('2d'); g.clearRect(0, 0, S, S);
    var red = '#C1272D', FONT = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';
    g.strokeStyle = red; g.fillStyle = red; g.lineJoin = 'round';
    var pad = S * .055, lw = Math.max(6, S * .045);
    g.lineWidth = lw;
    if (shape === 'square') { g.strokeRect(pad, pad, S - pad * 2, S - pad * 2); }
    else if (shape === 'oval') { g.beginPath(); g.ellipse(S / 2, S / 2, S / 2 - pad, S / 2 - pad * .82, 0, 0, Math.PI * 2); g.stroke(); }
    else { g.beginPath(); g.arc(S / 2, S / 2, S / 2 - pad, 0, Math.PI * 2); g.stroke(); }
    var chars = nm.split(''), cols = chars.length <= 3 ? 1 : 2, rows = Math.ceil(chars.length / cols);
    var fs = Math.min(S * 0.72 / rows, S * 0.62 / cols);
    g.font = '900 ' + Math.round(fs) + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
    chars.forEach(function (ch, i) {
      var r = Math.floor(i / cols), c = i - r * cols, inRow = Math.min(cols, chars.length - r * cols);
      var x = S / 2 + (c - (inRow - 1) / 2) * (fs * 1.04), y = S / 2 + (r - (rows - 1) / 2) * (fs * 1.06);
      g.fillText(ch, x, y);
    });
    /* 도장 느낌 — 살짝 거친 테두리 */
    var id = g.getImageData(0, 0, S, S), d = id.data, seed = 12345;
    for (var i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
      var k = 0.86 + (seed / 4294967296) * 0.24;
      d[i] = Math.min(255, d[i] * k); d[i + 3] = Math.round(d[i + 3] * (0.9 + (seed % 100) / 900));
    }
    g.putImageData(id, 0, 0);
    return cv.toDataURL('image/png');
  }

  async function fromPhoto(file, opt) { var im = await fileToDataUrl(file); return cleanStamp(im, opt); }

  /* 그림을 칸에 맞춰 그리기(비율 유지·가운데) */
  function draw(g, im, x, y, w, h) {
    if (!im) return;
    var iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
    var r = Math.min(w / iw, h / ih);
    g.drawImage(im, x + (w - iw * r) / 2, y + (h - ih * r) / 2, iw * r, ih * r);
  }

  /* 간인 — 쪽 경계에 반씩. side:'r' = 이 쪽 오른쪽 끝, 'l' = 이 쪽 왼쪽 끝. size=PX(도장 지름) */
  function ganinHalf(g, im, W, H, size, side, yRatio) {
    if (!im) return;
    var cx = (side === 'r') ? W : 0, cy = H * (yRatio == null ? 0.5 : yRatio);
    g.save();
    g.beginPath(); g.rect(0, 0, W, H); g.clip();
    g.drawImage(im, cx - size / 2, cy - size / 2, size, size);
    g.restore();
  }

  /* ------------------------------------------------------------------
     PDF 만들기 — JPEG 그림들을 A4(또는 지정) 쪽으로 담는다.
     pages = [{dataUrl:'data:image/jpeg;base64,…'}]  → Promise<Blob>
     ------------------------------------------------------------------ */
  function b64ToBytes(b64) {
    var bin = w.atob(b64), n = bin.length, u = new Uint8Array(n);
    for (var i = 0; i < n; i++) u[i] = bin.charCodeAt(i) & 0xff;
    return u;
  }
  function strBytes(s) { var u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 0xff; return u; }
  function jpegSize(u) {
    /* SOF 마커에서 가로·세로 픽셀 읽기 */
    var i = 2;
    while (i < u.length - 9) {
      if (u[i] !== 0xFF) { i++; continue; }
      var m = u[i + 1];
      if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) {
        return { h: (u[i + 5] << 8) | u[i + 6], w: (u[i + 7] << 8) | u[i + 8] };
      }
      var len = (u[i + 2] << 8) | u[i + 3];
      i += 2 + (len > 0 ? len : 0);
    }
    return { w: 0, h: 0 };
  }
  function pdf(pages, opt) {
    opt = opt || {};
    var PW = opt.w || 595.28, PH = opt.h || 841.89;     /* A4 pt */
    var list = (pages || []).map(function (p) {
      var d = String(p && p.dataUrl || p || '');
      var b64 = d.indexOf(',') >= 0 ? d.slice(d.indexOf(',') + 1) : d;
      var u = b64ToBytes(b64), sz = jpegSize(u);
      return { bytes: u, w: sz.w, h: sz.h };
    }).filter(function (x) { return x.bytes.length > 100; });
    if (!list.length) return Promise.reject(new Error('그림이 없습니다'));

    var objs = [], n = list.length;
    /* 1 catalog · 2 pages · 3+n*i … */
    objs.push({ num: 1, parts: [strBytes('<< /Type /Catalog /Pages 2 0 R >>')] });
    var kids = [];
    for (var i = 0; i < n; i++) kids.push((3 + i * 3) + ' 0 R');
    objs.push({ num: 2, parts: [strBytes('<< /Type /Pages /Count ' + n + ' /Kids [' + kids.join(' ') + '] >>')] });
    for (var k = 0; k < n; k++) {
      var imNum = 5 + k * 3, ctNum = 4 + k * 3, pgNum = 3 + k * 3, it = list[k];
      var wpt = PW, hpt = it.w && it.h ? (PW * it.h / it.w) : PH;
      if (hpt > PH + 0.5) { hpt = PH; wpt = PH * it.w / it.h; }
      var x = (PW - wpt) / 2, y = (PH - hpt) / 2;
      objs.push({ num: pgNum, parts: [strBytes('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PW.toFixed(2) + ' ' + PH.toFixed(2) +
        '] /Resources << /XObject << /Im0 ' + imNum + ' 0 R >> >> /Contents ' + ctNum + ' 0 R >>')] });
      var content = 'q ' + wpt.toFixed(2) + ' 0 0 ' + hpt.toFixed(2) + ' ' + x.toFixed(2) + ' ' + y.toFixed(2) + ' cm /Im0 Do Q';
      objs.push({ num: ctNum, parts: [strBytes('<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream')] });
      objs.push({ num: imNum, parts: [strBytes('<< /Type /XObject /Subtype /Image /Width ' + (it.w || 1000) + ' /Height ' + (it.h || 1414) +
        ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + it.bytes.length + ' >>\nstream\n'), it.bytes, strBytes('\nendstream')] });
    }
    objs.sort(function (a, b) { return a.num - b.num; });

    var chunks = [], len = 0, offs = [];
    function put(u) { chunks.push(u); len += u.length; }
    put(strBytes('%PDF-1.4\n%\u00E2\u00E3\u00CF\u00D3\n'));
    objs.forEach(function (o) {
      offs[o.num] = len;
      put(strBytes(o.num + ' 0 obj\n'));
      o.parts.forEach(function (p) { if (typeof p === 'string') put(strBytes(p)); else put(p); });
      put(strBytes('\nendobj\n'));
    });
    var xrefPos = len, maxNum = objs[objs.length - 1].num + 1;
    var xr = 'xref\n0 ' + maxNum + '\n0000000000 65535 f \n';
    for (var q = 1; q < maxNum; q++) {
      var off = offs[q] || 0;
      xr += ('0000000000' + off).slice(-10) + ' 00000 n \n';
    }
    put(strBytes(xr));
    put(strBytes('trailer\n<< /Size ' + maxNum + ' /Root 1 0 R >>\nstartxref\n' + xrefPos + '\n%%EOF\n'));
    var out = new Uint8Array(len), p0 = 0;
    chunks.forEach(function (c) { out.set(c, p0); p0 += c.length; });
    return Promise.resolve(new w.Blob([out], { type: 'application/pdf' }));
  }

  w.KTSSeal = { KEY: KEY, MM: MM, box: box, save: save, remove: remove, load: load,
    fromPhoto: fromPhoto, fromName: fromName, cleanStamp: cleanStamp, draw: draw, ganinHalf: ganinHalf, pdf: pdf };
})(window);
