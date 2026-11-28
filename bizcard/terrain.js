/* ==========================================================================
   지형 보기 — 경사도 · 3D 입체 (280번)
   --------------------------------------------------------------------------
   · 공개 수치표고(terrarium DEM) 타일을 브라우저에서 직접 받아 계산한다. 키가 필요 없다.
   · 30m 표고는 잔톱니가 많아, 3×3 로 한 번 묶은 격자(약 23m)에서 기울기를 낸다.
     → 도심·잡목 잡음으로 경사가 과장되는 것을 막는다.
   · 경사도: 10단계 색(면적그리기·경사도 앱과 같은 기준)으로 칠하고 평균 경사를 낸다.
   · 3D   : 같은 표고를 비스듬히 내려다본 입체 그림.
   · 타일을 못 받으면 조용히 실패를 알리고 원래 지도로 되돌린다.
   ========================================================================== */
(function (g) {
  'use strict';

  var TILE = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
  var cache = {}, cv2, ctx2;

  function tileUrl(z, x, y) { return TILE.replace('{z}', z).replace('{x}', x).replace('{y}', y); }
  function lon2x(lon, z) { return (lon + 180) / 360 * Math.pow(2, z); }
  function lat2y(lat, z) {
    var r = lat * Math.PI / 180;
    return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * Math.pow(2, z);
  }
  function mppAt(lat, z) { return 156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, z); }

  function demTile(z, x, y) {
    var k = z + '/' + x + '/' + y;
    if (cache[k]) return cache[k];
    cache[k] = new Promise(function (res, rej) {
      var im = new Image();
      im.crossOrigin = 'anonymous';
      im.onload = function () {
        try {
          if (!cv2) {
            cv2 = document.createElement('canvas'); cv2.width = 256; cv2.height = 256;
            try { ctx2 = cv2.getContext('2d', { willReadFrequently: true }) } catch (e) { ctx2 = cv2.getContext('2d') }
          }
          ctx2.clearRect(0, 0, 256, 256);
          ctx2.drawImage(im, 0, 0, 256, 256);
          var d = ctx2.getImageData(0, 0, 256, 256).data, f = new Float32Array(65536);
          for (var i = 0, j = 0; i < 65536; i++, j += 4) f[i] = d[j] * 256 + d[j + 1] + d[j + 2] / 256 - 32768;
          res(f);
        } catch (e) { rej(e) }
      };
      im.onerror = function () { rej(new Error('dem')) };
      im.src = tileUrl(z, x, y);
    });
    return cache[k];
  }

  var SLOPE10 = [
    { lo: 0, hi: 5, hex: '#FFFFFF', nm: '0~5°' }, { lo: 5, hi: 10, hex: '#FFF59D', nm: '5~10°' },
    { lo: 10, hi: 15, hex: '#FFEB3B', nm: '10~15°' }, { lo: 15, hi: 20, hex: '#FFC107', nm: '15~20°' },
    { lo: 20, hi: 25, hex: '#FF9800', nm: '20~25°' }, { lo: 25, hi: 30, hex: '#F57C00', nm: '25~30°' },
    { lo: 30, hi: 35, hex: '#F44336', nm: '30~35°' }, { lo: 35, hi: 40, hex: '#D32F2F', nm: '35~40°' },
    { lo: 40, hi: 45, hex: '#B71C1C', nm: '40~45°' }, { lo: 45, hi: 1e9, hex: '#7F0000', nm: '45°~' }
  ];
  function band(s) { var i = Math.floor(s / 5); return i < 0 ? 0 : (i > 9 ? 9 : i) }
  function hex(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)] }

  /* ---------- 3×3 타일 → 256×256 표고판 ---------- */
  function load(lat, lon, cb) {
    var z = 14, n = Math.pow(2, z);
    var fx = lon2x(lon, z), fy = lat2y(lat, z);
    var tx = Math.floor(fx), ty = Math.floor(fy);
    var jobs = [], block = new Float32Array(768 * 768), fails = 0;
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        (function (dx, dy) {
          var gx = ((tx + dx) % n + n) % n, gy = ty + dy;
          jobs.push(demTile(z, gx, gy).then(function (f) {
            for (var r = 0; r < 256; r++) {
              block.set(f.subarray(r * 256, r * 256 + 256), ((dy + 1) * 256 + r) * 768 + (dx + 1) * 256);
            }
          }).catch(function () { fails++ }));
        })(dx, dy);
      }
    }
    Promise.all(jobs).then(function () {
      if (fails > 4) return cb({ ok: false, msg: '지형 자료를 받지 못했습니다' });
      var size = 256;
      var ox = Math.round((fx - (tx - 1)) * 256 - size / 2);
      var oy = Math.round((fy - (ty - 1)) * 256 - size / 2);
      ox = Math.max(0, Math.min(768 - size, ox));
      oy = Math.max(0, Math.min(768 - size, oy));
      var mpp = mppAt(lat, z);
      var grid = new Float32Array(size * size);
      for (var y = 0; y < size; y++) {
        for (var x = 0; x < size; x++) grid[y * size + x] = block[(oy + y) * 768 + (ox + x)];
      }
      /* 3×3 로 묶어 잡음을 누른다(23m 격자) */
      var K = 3, n2 = Math.floor(size / K);
      var g2 = new Float32Array(n2 * n2);
      for (var j2 = 0; j2 < n2; j2++) {
        for (var i2 = 0; i2 < n2; i2++) {
          var acc = 0;
          for (var ky = 0; ky < K; ky++) for (var kx = 0; kx < K; kx++) acc += grid[(j2 * K + ky) * size + (i2 * K + kx)];
          g2[j2 * n2 + i2] = acc / (K * K);
        }
      }
      var mpp2 = mpp * K;
      var slope = new Float32Array(n2 * n2);
      var mn = 1e9, mx = -1e9, sum = 0, cnt = 0;
      var half = Math.round(n2 * 0.13);
      for (var yy = 0; yy < n2; yy++) {
        var ya = Math.max(0, yy - 1), yb = Math.min(n2 - 1, yy + 1);
        for (var xx = 0; xx < n2; xx++) {
          var xa = Math.max(0, xx - 1), xb = Math.min(n2 - 1, xx + 1);
          var dx2 = (g2[yy * n2 + xb] - g2[yy * n2 + xa]) / (2 * mpp2);
          var dz2 = (g2[yb * n2 + xx] - g2[ya * n2 + xx]) / (2 * mpp2);
          var sl = Math.atan(Math.sqrt(dx2 * dx2 + dz2 * dz2)) * 57.2957795;
          slope[yy * n2 + xx] = sl;
          var e = g2[yy * n2 + xx];
          if (e < mn) mn = e; if (e > mx) mx = e;
          if (Math.abs(xx - n2 / 2) < half && Math.abs(yy - n2 / 2) < half) { sum += sl; cnt++; }
        }
      }
      cb({
        ok: true, size: n2, grid: g2, slope: slope, mpp: mpp2,
        min: mn, max: mx, mean: cnt ? sum / cnt : 0,
        centerSlope: slope[Math.round(n2 / 2) * n2 + Math.round(n2 / 2)]
      });
    });
  }

  /* ---------- 경사도 그림 ---------- */
  function slopeView(cv, D) {
    var N = D.size;
    var tmp = document.createElement('canvas'); tmp.width = N; tmp.height = N;
    var tx = tmp.getContext('2d');
    var img = tx.createImageData(N, N), d = img.data;
    for (var i = 0; i < N * N; i++) {
      var b = SLOPE10[band(D.slope[i])], c = hex(b.hex);
      d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2];
      d[i * 4 + 3] = D.slope[i] < 2.5 ? 55 : 225;
    }
    tx.putImageData(img, 0, 0);
    var w = cv.width, h = cv.height;
    var x = cv.getContext('2d');
    x.clearRect(0, 0, w, h);
    x.fillStyle = '#0b1526'; x.fillRect(0, 0, w, h);
    x.imageSmoothingEnabled = true;
    x.drawImage(tmp, 0, 0, w, h);
    var cxp = w / 2, cyp = h / 2, r = Math.min(w, h) * 0.16;
    x.strokeStyle = 'rgba(255,255,255,.95)'; x.lineWidth = 5; x.strokeRect(cxp - r, cyp - r * 0.8, r * 2, r * 1.6);
    x.strokeStyle = '#e11d2e'; x.lineWidth = 2.5; x.strokeRect(cxp - r, cyp - r * 0.8, r * 2, r * 1.6);
  }

  /* ---------- 3D 입체 그림 ---------- */
  function threeView(cv, D, opts) {
    opts = opts || {};
    var w = cv.width, h = cv.height, x = cv.getContext('2d');
    var N = Math.min(80, D.size);
    var step = D.size / N;
    var el = new Float32Array(N * N), mn = 1e9, mx = -1e9;
    for (var j = 0; j < N; j++) {
      for (var i = 0; i < N; i++) {
        var v = D.grid[Math.round(j * step) * D.size + Math.round(i * step)];
        el[j * N + i] = v;
        if (v < mn) mn = v; if (v > mx) mx = v;
      }
    }
    var span = Math.max(20, mx - mn);
    var exag = Math.min(2.2, 170 / span);
    var worldW = 1800, zNear = 600, zFar = 2400;
    var camH = span * exag * 0.5 + 180;
    var camY = camH;
    var focal = h * 1.15, horizon = h * 0.30;
    function project(i, j, e) {
      var gx = (i / (N - 1) - 0.5) * worldW;
      var gz = zNear + (j / (N - 1)) * (zFar - zNear);
      var gy = (e - mn) * exag;
      return [w / 2 + gx * focal / gz, horizon + (camY - gy) * focal / gz];
    }
    var sky = x.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#0d1c31'); sky.addColorStop(.55, '#2b4a70'); sky.addColorStop(1, '#93a9bf');
    x.fillStyle = sky; x.fillRect(0, 0, w, h);
    for (var jj = N - 2; jj >= 0; jj--) {
      var rowA = [], rowB = [];
      for (var ii = 0; ii < N; ii++) {
        rowA.push(project(ii, jj, el[jj * N + ii]));
        rowB.push(project(ii, jj + 1, el[(jj + 1) * N + ii]));
      }
      for (var ii3 = 0; ii3 < N - 1; ii3++) {
        var p1 = rowA[ii3], p2 = rowA[ii3 + 1], p3 = rowB[ii3 + 1], p4 = rowB[ii3];
        var e0 = el[jj * N + ii3];
        var t = Math.max(0, Math.min(1, (e0 - mn) / span));
        var dW = e0 - el[jj * N + Math.max(0, ii3 - 1)];
        var dN = e0 - el[Math.min(N - 1, jj + 1) * N + ii3];
        var light = 1 + Math.max(-0.30, Math.min(0.30, (dW * 0.7 + dN * 0.5) / Math.max(3, span * 0.06)));
        var rc = Math.round((22 + 40 * t) * light), gc = Math.round((46 + 58 * t) * light), bc = Math.round((36 + 46 * t) * light);
        x.fillStyle = 'rgb(' + Math.max(6, Math.min(255, rc)) + ',' + Math.max(8, Math.min(255, gc)) + ',' + Math.max(6, Math.min(255, bc)) + ')';
        x.beginPath();
        x.moveTo(p1[0], p1[1]); x.lineTo(p2[0], p2[1]); x.lineTo(p3[0], p3[1]); x.lineTo(p4[0], p4[1]);
        x.closePath(); x.fill();
      }
    }
    var pc = project(N / 2, N / 2, el[Math.round(N / 2) * N + Math.round(N / 2)]);
    x.beginPath(); x.arc(pc[0], pc[1], Math.max(5, w * 0.016), 0, Math.PI * 2);
    x.fillStyle = 'rgba(225,29,46,.95)'; x.fill();
    x.strokeStyle = '#fff'; x.lineWidth = 2.5; x.stroke();
    x.beginPath(); x.moveTo(pc[0], pc[1] - 8); x.lineTo(pc[0], pc[1] - h * 0.16);
    x.strokeStyle = 'rgba(225,29,46,.9)'; x.lineWidth = 3; x.stroke();
    x.fillStyle = 'rgba(11,21,38,.72)'; x.fillRect(0, 0, w, 34);
    x.fillStyle = '#dbe6f4'; x.font = '700 14px sans-serif';
    x.fillText('3D 입체 지형 · 표고 ' + Math.round(mn) + '~' + Math.round(mx) + 'm · ×' + exag.toFixed(1) + ' 과장', 10, 22);
    x.fillStyle = 'rgba(255,255,255,.62)'; x.font = '600 11px sans-serif';
    x.fillText('공개 수치표고(30m)를 묶어 그린 참고 그림입니다', 10, h - 10);
  }

  g.KTS_TERRAIN = { load: load, slopeView: slopeView, threeView: threeView, SLOPE10: SLOPE10 };
})(window);
