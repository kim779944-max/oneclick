/* KTS 원클릭 — AI 키 없이 표 사진 → 표 구조
   · 표의 선(격자)을 먼저 찾아 행·열·병합·칸 배경을 정하고(규칙 엔진, 네트워크 0),
     칸 안의 글자는 기기 안에서 도는 무료 OCR로 읽습니다. 서버 전송 0건.
   · 사진은 이 브라우저 안에서만 처리되고, 어디에도 저장·업로드하지 않습니다. */
(function () {
  'use strict';

  /* ---------- 0. 설정 ---------- */
  var OCR = {
    /* 무료 공개 배포 CDN (키 없음). 첫 1회만 내려받고 이후는 브라우저가 기억합니다. */
    scripts: [
      'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js',
      'https://unpkg.com/tesseract.js@5.1.1/dist/tesseract.min.js'
    ],
    workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js',
    corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.0',
    langPath: 'https://tessdata.projectnaptha.com/4.0.0_fast',
    lang: 'kor'
  };

  /* ---------- 1. 사진 준비 ---------- */
  function loadImage(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () { URL.revokeObjectURL(url); res(im); };
      im.onerror = function () { URL.revokeObjectURL(url); rej(new Error('사진을 열지 못했습니다')); };
      im.src = url;
    });
  }
  function drawTo(img, w, h) {
    var cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var g = cv.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    g.drawImage(img, 0, 0, w, h);
    return cv;
  }
  /* 기울어진 사진을 바로 세운다 — 살짝 기울어도 표의 선이 또렷해진다 */
  function straighten(cv, deg) {
    var rad = deg * Math.PI / 180;
    var w = cv.width, h = cv.height;
    var out = document.createElement('canvas');
    out.width = Math.ceil(w * Math.cos(Math.abs(rad)) + h * Math.sin(Math.abs(rad))) + 4;
    out.height = Math.ceil(h * Math.cos(Math.abs(rad)) + w * Math.sin(Math.abs(rad))) + 4;
    var g = out.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, out.width, out.height);
    g.translate(out.width / 2, out.height / 2);
    g.rotate(rad);
    g.drawImage(cv, -w / 2, -h / 2);
    return out;
  }

  /* ---------- 2. 사진 분석(밝기·기울기) ---------- */
  function grayOf(cv) {
    var W = cv.width, H = cv.height;
    var d = cv.getContext('2d').getImageData(0, 0, W, H).data;
    var gray = new Uint8Array(W * H);
    for (var i = 0, p = 0; i < gray.length; i++, p += 4) {
      gray[i] = (d[p] * 77 + d[p + 1] * 151 + d[p + 2] * 28) >> 8;
    }
    return { gray: gray, W: W, H: H, rgba: d };
  }

  /* 종이(가장 밝은 쪽)를 기준으로 '선'의 어두운 정도를 정한다 */
  function darkLimit(gray) {
    var hist = new Uint32Array(256), i;
    for (i = 0; i < gray.length; i++) hist[gray[i]]++;
    var acc = 0, paper = 235, target = gray.length * 0.6;
    for (i = 255; i >= 0; i--) { acc += hist[i]; if (acc >= target) { paper = i; break; } }
    var lim = paper - 55;
    if (lim < 110) lim = 110;
    if (lim > 185) lim = 185;
    return lim;
  }

  /* 기울기 — 선을 가장 또렷하게 모으는 각도를 찾는다(투영 프로파일의 뾰족함) */
  function projSharp(gray, W, H, lim, deg, step) {
    var rad = deg * Math.PI / 180, s = Math.sin(rad), c = Math.cos(rad);
    var off = Math.ceil(W * Math.abs(s)) + 2;
    var bins = new Int32Array(H + off * 2 + 2), i, j;
    step = step || 2;
    for (var y = 0; y < H; y += step) {
      var row = y * W;
      for (var x = 0; x < W; x += step) {
        if (gray[row + x] >= lim) continue;
        var yy = Math.round(y * c - x * s) + off;
        if (yy >= 0 && yy < bins.length) bins[yy]++;
      }
    }
    var sc = 0;
    for (i = 0; i < bins.length; i++) if (bins[i]) sc += bins[i] * bins[i];
    return { score: sc, bins: bins, off: off };
  }
  function skewAngle(gray, W, H, lim) {
    var best = 0, bestScore = -1, a;
    for (a = -8; a <= 8; a += 1) {
      var r = projSharp(gray, W, H, lim, a, 3);
      if (r.score > bestScore) { bestScore = r.score; best = a; }
    }
    for (a = best - 0.9; a <= best + 0.9 + 1e-9; a += 0.2) {
      var r2 = projSharp(gray, W, H, lim, a, 2);
      if (r2.score > bestScore) { bestScore = r2.score; best = a; }
    }
    return Math.round(best * 10) / 10;
  }

  /* ---------- 3. 표 선(격자) 검출 ---------- */
  function bands(proj, need, minGap) {
    var out = [], start = -1, i;
    for (i = 0; i < proj.length; i++) {
      var on = proj[i] > need;
      if (on && start < 0) start = i;
      if (start >= 0 && (!on || i === proj.length - 1)) {
        var end = on ? i : i - 1;
        out.push({ s: start, e: end, c: (start + end) / 2, h: end - start + 1 });
        start = -1;
      }
    }
    if (!minGap) return out;
    var pick = [];
    for (i = 0; i < out.length; i++) {
      if (!pick.length || out[i].c - pick[pick.length - 1].c >= minGap) pick.push(out[i]);
      else if (out[i].h > pick[pick.length - 1].h && out[i].h <= 10) pick[pick.length - 1] = out[i];
    }
    return pick;
  }

  function detectGrid(cv, G) {
    G = G || grayOf(cv);
    var gray = G.gray, W = G.W, H = G.H, i, x, y;
    var lim = G.lim || darkLimit(gray);
    var hc = new Int32Array(H), vc = new Int32Array(W);
    for (y = 0; y < H; y++) {
      var row = y * W, c = 0;
      for (x = 0; x < W; x++) if (gray[row + x] < lim) c++;
      hc[y] = c;
    }
    for (x = 0; x < W; x++) {
      var c2 = 0;
      for (y = 0; y < H; y++) if (gray[y * W + x] < lim) c2++;
      vc[x] = c2;
    }
    var maxH = 0, maxV = 0;
    for (i = 0; i < H; i++) if (hc[i] > maxH) maxH = hc[i];
    for (i = 0; i < W; i++) if (vc[i] > maxV) maxV = vc[i];
    if (maxH < W * 0.30 || maxV < H * 0.30) return null;   /* 표로 보이지 않음 */

    var hl = bands(hc, maxH * 0.55, Math.max(6, Math.round(H * 0.012)));
    var vl = bands(vc, maxV * 0.50, Math.max(6, Math.round(W * 0.012)));
    /* 두꺼운 띠(색이 꽉 찬 줄)는 선이 아니다 */
    var thinH = Math.max(6, Math.round(H * 0.014)), thinV = Math.max(6, Math.round(W * 0.010));
    hl = hl.filter(function (b) { return b.h <= thinH; });
    vl = vl.filter(function (b) { return b.h <= thinV; });
    if (hl.length < 3 || vl.length < 3) return null;

    return {
      gray: gray, rgba: G.rgba, W: W, H: H, lim: lim,
      hy: hl.map(function (b) { return Math.round(b.c); }),
      vx: vl.map(function (b) { return Math.round(b.c); })
    };
  }

  /* 구간 안에 '선'이 있는지 — 선 두께를 감안해 ±2px 확인 */
  function darkRun(gray, W, H, lim, x0, x1, y0, y1, horiz) {
    var hit = 0, tot = 0, k, a, b;
    if (horiz) {
      if (x1 <= x0) return 0;
      for (a = x0; a <= x1; a++) {
        tot++;
        for (k = -2; k <= 2; k++) {
          b = y0 + k;
          if (b >= 0 && b < H && gray[b * W + a] < lim) { hit++; break; }
        }
      }
    } else {
      if (y1 <= y0) return 0;
      for (b = y0; b <= y1; b++) {
        tot++;
        for (k = -2; k <= 2; k++) {
          a = x0 + k;
          if (a >= 0 && a < W && gray[b * W + a] < lim) { hit++; break; }
        }
      }
    }
    return tot ? hit / tot : 0;
  }

  function buildCells(grid) {
    var hy = grid.hy, vx = grid.vx, gray = grid.gray, W = grid.W, H = grid.H, lim = grid.lim;
    var nR = hy.length - 1, nC = vx.length - 1;
    if (nR < 1 || nC < 1) return null;
    var PAD = 5;
    function hSep(i, c0, c1) {
      return darkRun(gray, W, H, lim, Math.ceil(vx[c0]) + PAD, Math.floor(vx[c1 + 1]) - PAD, hy[i], hy[i], true) > 0.55;
    }
    function vSep(j, r0, r1) {
      return darkRun(gray, W, H, lim, vx[j], vx[j], Math.ceil(hy[r0]) + PAD, Math.floor(hy[r1 + 1]) - PAD, false) > 0.55;
    }
    var used = [], r, c, k;
    for (r = 0; r < nR; r++) { used.push([]); for (c = 0; c < nC; c++) used[r].push(false); }
    var cells = [];
    for (r = 0; r < nR; r++) {
      for (c = 0; c < nC; c++) {
        if (used[r][c]) continue;
        var cs = 1;
        while (c + cs < nC && !used[r][c + cs] && !vSep(c + cs, r, r)) cs++;
        var rs = 1, grow = true;
        while (grow && r + rs < nR) {
          if (hSep(r + rs, c, c + cs - 1)) break;
          for (k = 0; k < cs; k++) if (used[r + rs][c + k]) { grow = false; break; }
          if (!grow) break;
          rs++;
        }
        for (var rr = r; rr < r + rs; rr++) for (k = c; k < c + cs; k++) used[rr][k] = true;
        cells.push({ r: r, c: c, rs: rs, cs: cs, text: '', bold: false, align: 'C', bg: '', color: '', num: false });
      }
    }
    return { cells: cells, nR: nR, nC: nC };
  }

  /* 칸 배경색 — 글자를 뺀 바탕색만 골라 대표색을 낸다(흰 종이는 빈칸 처리) */
  function cellBg(grid, x0, y0, x1, y1) {
    var gray = grid.gray, rgba = grid.rgba, W = grid.W, lim = grid.lim + 25;
    var r = 0, g = 0, b = 0, n = 0;
    var stepX = Math.max(1, Math.floor((x1 - x0) / 40)), stepY = Math.max(1, Math.floor((y1 - y0) / 40));
    for (var y = y0 + 3; y < y1 - 2; y += stepY) {
      for (var x = x0 + 3; x < x1 - 2; x += stepX) {
        var p = (y * W + x) * 4;
        if (gray[y * W + x] < lim) continue;
        r += rgba[p]; g += rgba[p + 1]; b += rgba[p + 2]; n++;
      }
    }
    if (n < 12) return '';
    r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n);
    var lum = (r * 77 + g * 151 + b * 28) >> 8;
    if (lum >= 246) return '';
    if (Math.abs(r - g) < 6 && Math.abs(g - b) < 6 && lum > 236) return '';
    return '#' + [r, g, b].map(function (v) { return ('0' + Math.min(255, Math.max(0, v)).toString(16)).slice(-2); }).join('').toUpperCase();
  }

  /* ---------- 4. 기기 내 무료 OCR ---------- */
  var _worker = null, _loading = null;

  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = function () { res(); };
      s.onerror = function () { rej(new Error('OCR_LOAD')); };
      document.head.appendChild(s);
    });
  }

  function ensureWorker(onStep) {
    if (_worker) return Promise.resolve(_worker);
    if (_loading) return _loading;
    _loading = (function () {
      var idx = 0;
      function next() {
        if (window.Tesseract) return Promise.resolve();
        if (idx >= OCR.scripts.length) return Promise.reject(new Error('OCR_LOAD'));
        return loadScript(OCR.scripts[idx++]).catch(next);
      }
      return next().then(function () {
        return window.Tesseract.createWorker(OCR.lang, 1, {
          workerPath: OCR.workerPath,
          corePath: OCR.corePath,
          langPath: OCR.langPath,
          logger: function (m) {
            if (!onStep || !m) return;
            if (m.status === 'loading language traineddata' || m.status === 'initializing api' || m.status === 'loading tesseract core') {
              onStep('글자 인식 준비 중… ' + Math.round((m.progress || 0) * 100) + '%', 8 + Math.round((m.progress || 0) * 12));
            }
          },
          errorHandler: function () {}
        });
      }).then(function (w) {
        _worker = w;
        return w.setParameters({ tessedit_pageseg_mode: '7', preserve_interword_spaces: '1' }).then(function () { return w; });
      }).catch(function (e) { _loading = null; throw e; });
    })();
    return _loading;
  }

  function wordList(data) {
    var out = [], seen = {};
    function push(w) {
      if (!w || !w.text || !w.bbox) return;
      var t = String(w.text).replace(/\s+/g, ' ').trim();
      if (!t) return;
      var k = [w.bbox.x0, w.bbox.y0, w.bbox.x1, w.bbox.y1, t].join('_');
      if (seen[k]) return;
      seen[k] = 1;
      out.push({ t: t, x0: w.bbox.x0, x1: w.bbox.x1, y0: w.bbox.y0, y1: w.bbox.y1, conf: w.confidence || 0 });
    }
    (data.words || []).forEach(push);
    if (out.length) return out;              /* 낱말 목록이 있으면 그것만 쓴다(중복 방지) */
    (data.blocks || []).forEach(function (b) {
      (b.paragraphs || []).forEach(function (p) {
        (p.lines || []).forEach(function (l) { (l.words || []).forEach(push); });
      });
    });
    return out;
  }

  function cropRow(cv, x0, x1, y0, y1) {
    var w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0);
    var s = Math.min(3, Math.max(1, 1500 / w));
    var cc = document.createElement('canvas');
    cc.width = Math.round(w * s); cc.height = Math.round(h * s);
    var g = cc.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, cc.width, cc.height);
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(cv, x0, y0, w, h, 0, 0, cc.width, cc.height);
    return { url: cc.toDataURL('image/png'), s: s };
  }

  /* 글자 다듬기 — 낱자 사이 공백 접기, 칸 테두리 기호(｜) 제거 */
  function tidy(t) {
    var s1 = String(t || '');
    s1 = s1.replace(/[\u2502\uFF5C|]/g, ' ');
    s1 = s1.replace(/([\uAC00-\uD7A3])\s+(?=[\uAC00-\uD7A3])/g, '$1');
    return s1.replace(/\s+/g, ' ').trim();
  }

  function numLike(t) {
    var s = String(t || '').replace(/\s/g, '');
    return /^[₩$]?[\d,]+(\.\d+)?$/.test(s) && /\d/.test(s);
  }

  /* ---------- 5. 전체 흐름 ---------- */
  function analyze(cv, onStep) {
    var G = grayOf(cv);
    G.lim = darkLimit(G.gray);
    var deg = skewAngle(G.gray, G.W, G.H, G.lim);
    var fixed = cv;
    if (Math.abs(deg) >= 0.25) {
      /* 부호가 반대면 더 나빠진다 — 두 방향 중 또렷한 쪽을 쓴다 */
      var a = straighten(cv, -deg), b = straighten(cv, deg);
      var sa = projSharp(grayOf(a).gray, a.width, a.height, G.lim, 0, 3).score;
      var sb = projSharp(grayOf(b).gray, b.width, b.height, G.lim, 0, 3).score;
      fixed = sa >= sb ? a : b;
      G = grayOf(fixed);
      G.lim = darkLimit(G.gray);
      onStep && onStep('표를 바로 세우는 중…', 18);
    }
    var grid = detectGrid(fixed, G);
    if (!grid) return null;
    var built = buildCells(grid);
    if (!built) return null;
    return { cv: fixed, grid: grid, built: built };
  }

  function struct(file, onStep) {
    onStep = onStep || function () {};
    return loadImage(file).then(function (im) {
      var maxSide = 1700;
      var sc = Math.min(1, maxSide / Math.max(im.width, im.height));
      var cv0 = drawTo(im, Math.max(1, Math.round(im.width * sc)), Math.max(1, Math.round(im.height * sc)));
      onStep('표의 선을 찾는 중…', 12);
      var an = analyze(cv0, onStep);
      if (!an) { throw new Error('NO_TABLE'); }

      var cv = an.cv, grid = an.grid, built = an.built;
      var hy = grid.hy, vx = grid.vx, cells = built.cells;
      var totalW = vx[vx.length - 1] - vx[0];
      var colW = [], c;
      for (c = 0; c < built.nC; c++) colW.push(+(100 * (vx[c + 1] - vx[c]) / totalW).toFixed(1));

      var bgLum = function (hex) {
        if (!hex) return 255;
        var r = parseInt(hex.substr(1, 2), 16), g = parseInt(hex.substr(3, 2), 16), b = parseInt(hex.substr(5, 2), 16);
        return (r * 77 + g * 151 + b * 28) >> 8;
      };
      var bgTop = 0;
      cells.forEach(function (cl) {
        cl.bg = cellBg(grid, vx[cl.c], hy[cl.r], vx[cl.c + cl.cs], hy[cl.r + cl.rs]);
        if (bgLum(cl.bg) > bgTop) bgTop = bgLum(cl.bg);
      });
      /* 표 전체 바탕(가장 밝은 칸)보다 확실히 어두운 칸만 색으로 인정 — 그림자·얼룩은 버린다 */
      cells.forEach(function (cl) {
        if (cl.bg && bgTop - bgLum(cl.bg) < 5) cl.bg = '';
      });

      var fill = 0, totalRows = built.nR;

      /* 1단계: 격자·병합·배경·열 너비는 네트워크 없이 바로 나온다(저장은 여기서 이미 가능) */
      cells.sort(function (a, b) { return a.r - b.r || a.c - b.c; });
      var st = {
        title: '',
        nRows: built.nR,
        nCols: built.nC,
        colWidths: colW,
        cells: cells,
        preview: cv.toDataURL('image/jpeg', 0.72),
        lockWidths: true,
        _fill: 0,
        _cells: cells.length,
        _ocrFailed: false,
        _textPending: true,
        _engine: 'device'
      };

      function settle() {
        fill = 0;
        cells.forEach(function (cl) {
          cl.text = tidy(cl.text);
          if (cl.text) fill++;
          cl.num = numLike(cl.text);
          if (cl.num) { cl.align = 'C'; delete cl._l; delete cl._r; }
          if (cl._l != null) {
            var bx0 = vx[cl.c], bx1 = vx[cl.c + cl.cs];
            var leftPad = cl._l - bx0, rightPad = bx1 - cl._r;
            if (rightPad > leftPad * 2.2) cl.align = 'L';
            else if (leftPad > rightPad * 2.2) cl.align = 'R';
            else cl.align = 'C';
          } else if (cl.c === 0) {
            cl.align = 'L';
          }
          delete cl._l; delete cl._r;
        });
        st._fill = fill;
        st._textPending = false;
      }

      /* 2단계: 글자는 기기 안 무료 OCR로 뒤에서 채운다 — 다운로드가 느려도 저장을 막지 않는다 */
      st._textTask = ensureWorker(onStep).catch(function () { return null; }).then(function (w) {
        if (!w) { settle(); st._ocrFailed = true; return false; }
        var chain = Promise.resolve();
        for (var r = 0; r < totalRows; r++) {
          (function (r) {
            chain = chain.then(function () {
              var x0 = vx[0] + 2, x1 = vx[vx.length - 1] - 2;
              var y0 = hy[r] + 2, y1 = hy[r + 1] - 2;
              if (y1 - y0 < 6) return;
              var crop = cropRow(cv, x0, x1, y0, y1);
              onStep('글자를 읽는 중… (' + (r + 1) + '/' + totalRows + ')', 20 + Math.round(70 * (r + 1) / totalRows));
              function read(p) {
                return w.setParameters({ tessedit_pageseg_mode: p }).then(function () {
                  return w.recognize(crop.url, {}, { text: true, blocks: true });
                }).then(function (out) { return wordList((out && out.data) || {}); });
              }
              return read('7').then(function (words) {
                /* 한 줄로 못 읽으면 '글자 덩어리' 모드로 한 번 더 */
                if (words.length) return words;
                return read('6').then(function (w2) { return w2; });
              }).then(function (words) {
                w.setParameters({ tessedit_pageseg_mode: '7' });
                words.forEach(function (wd) {
                  var ax = x0 + wd.x0 / crop.s;
                  var axEnd = x0 + wd.x1 / crop.s;
                  var mid = (ax + axEnd) / 2, ci;
                  for (ci = 0; ci < built.nC; ci++) if (mid >= vx[ci] && mid < vx[ci + 1]) break;
                  if (ci >= built.nC) ci = built.nC - 1;
                  var target = null;
                  for (var k = 0; k < cells.length; k++) {
                    var cl = cells[k];
                    if (cl.r <= r && r < cl.r + cl.rs && cl.c <= ci && ci < cl.c + cl.cs) { target = cl; break; }
                  }
                  if (!target) return;
                  target.text = target.text ? target.text + ' ' + wd.t : wd.t;
                  if (target._l == null || ax < target._l) target._l = ax;
                  if (target._r == null || axEnd > target._r) target._r = axEnd;
                });
              }).catch(function () {});
            });
          })(r);
        }
        return chain.then(function () {
          settle();
          st._ocrFailed = fill === 0;
          return true;
        });
      });

      return st;
    });
  }

  window.KTSPHOTO = {
    struct: struct,
    analyze: analyze,
    detectGrid: detectGrid,
    buildCells: buildCells,
    skewAngle: skewAngle,
    ready: function () { return ensureWorker().then(function () { return true; }); }
  };
})();
