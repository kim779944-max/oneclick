/* ==========================================================================
   KTS 프리미엄 1장 물건표 (285번) — 가로 16:9 · 세로 9:16
   --------------------------------------------------------------------------
   · 같은 배치도(plan)로 화면 미리보기(DOM)와 저장(PNG/PDF) 캔버스를 함께 그린다.
     → 화면에서 고친 글자가 저장본에도 어긋남 없이 그대로 나온다.
   · 글줄은 미리 계산한 lines[] 를 그대로 찍는다(DOM 도 한 줄씩). 브라우저마다
     줄바꿈이 달라지는 일이 없다.
   · 사진·지도는 crossOrigin 을 걸어 불러오고, 실패하면 그 칸만 비운다
     (남의 서버 그림이 섞여 캔버스가 오염되면 저장 자체가 막히기 때문).
   ========================================================================== */
(function (g) {
  'use strict';

  var FONT = '"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR","Noto Sans CJK KR","Nanum Gothic",sans-serif';
  var C = {
    navy: '#0B1526', navy2: '#132239', navy3: '#1d3050',
    ink: '#0f1c2e', ink2: '#3f5169', ink3: '#6b7c93', line: '#dbe2ec',
    soft: '#f4f7fb', org: '#FF7A00', org2: '#ff9b3d', gold: '#e2ba7a', white: '#ffffff'
  };
  var LAND = { W: 1920, H: 1080 }, PORT = { W: 1080, H: 1920 };

  /* ============================ 지적도 직접 그리기 ============================
     302수리C — 브이월드 지도 그림(req/image)은 CORS 머리를 주지 않아 저장용 캔버스를
     오염시키므로(실측: crossOrigin 로드는 실패, 그냥 로드하면 SecurityError)
     저장 이미지에는 지적도를 연속지적도 데이터(JSONP)로 직접 그린다.
     화면(DOM)에서는 지도 그림을 그대로 쓰고, 캔버스 미리보기·저장에서 그림을 못 받으면
     이 그림(지적도)으로 채운다 — 빈 칸을 남기지 않는다. */
  var VW_KEY = '0C4AD93D-75D2-447B-B533-C5ADDD4A5B2F', VW_DOMAIN = 'autooneclick.com';
  function jsonpVW(url, ms) {
    return new Promise(function (res) {
      if (typeof document === 'undefined') return res(null);
      var cb = '__ktspt' + Math.floor(Math.random() * 1e7);
      var s = document.createElement('script'), done = false;
      function fin(v) { if (done) return; done = true; try { delete window[cb] } catch (e) { window[cb] = null } if (s.parentNode) s.parentNode.removeChild(s); res(v); }
      var tm = setTimeout(function () { fin(null) }, ms || 12000);
      window[cb] = function (d) { clearTimeout(tm); fin(d) };
      s.onerror = function () { clearTimeout(tm); fin(null) };
      s.src = url + (url.indexOf('?') < 0 ? '?' : '&') + 'callback=' + cb;
      document.head.appendChild(s);
    });
  }
  function merc(lat, lon, z) {
    var S = 256 * Math.pow(2, z);
    var s = Math.sin(lat * Math.PI / 180);
    return { x: (lon + 180) / 360 * S, y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * S };
  }
  function invMerc(x, y, z) {
    var S = 256 * Math.pow(2, z);
    var n = Math.PI - 2 * Math.PI * y / S;
    return { lon: x / S * 360 - 180, lat: 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))) };
  }
  function ringsOf(gm) {
    if (!gm) return [];
    if (gm.type === 'Polygon') return gm.coordinates || [];
    if (gm.type === 'MultiPolygon') {
      var out = [];
      (gm.coordinates || []).forEach(function (p) { (p || []).forEach(function (r) { out.push(r) }) });
      return out;
    }
    return [];
  }
  function inRing(ring, lon, lat) {
    var inside = false;
    for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      var xi = +ring[i][0], yi = +ring[i][1], xj = +ring[j][0], yj = +ring[j][1];
      if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }
  /* 지적도 캔버스 — lat/lon 주변 필지를 받아 선·지번을 그린다. 실패하면 null */
  function cadVector(lat, lon, W, H, z) {
    return new Promise(function (res) {
      lat = +lat; lon = +lon; z = z || 17;
      if (!isFinite(lat) || !isFinite(lon)) return res(null);
      var c = merc(lat, lon, z);
      var a = invMerc(c.x - W / 2, c.y - H / 2, z), b = invMerc(c.x + W / 2, c.y + H / 2, z);
      var box = [a.lon.toFixed(6), b.lat.toFixed(6), b.lon.toFixed(6), a.lat.toFixed(6)].join(',');
      var url = 'https://api.vworld.kr/req/data?service=data&request=GetFeature&version=2.0&data=LP_PA_CBND_BUBUN'
        + '&key=' + encodeURIComponent(VW_KEY) + '&domain=' + VW_DOMAIN
        + '&format=json&size=200&page=1&geometry=true&attribute=true&crs=EPSG:4326'
        + '&geomFilter=' + encodeURIComponent('BOX(' + box + ')');
      jsonpVW(url, 12000).then(function (r) {
        var fs = [];
        try { fs = r.response.result.featureCollection.features || []; } catch (e) { fs = []; }
        if (!fs.length) return res(null);
        try {
          var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
          var x = cv.getContext('2d');
          x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H);
          function px(p) { var q = merc(+p[1], +p[0], z); return [q.x - c.x + W / 2, q.y - c.y + H / 2]; }
          var labels = [], mine = null;
          fs.forEach(function (f) {
            var rings = ringsOf(f.geometry);
            if (!rings.length) return;
            if (!mine && rings[0] && inRing(rings[0], lon, lat)) mine = f;
          });
          fs.forEach(function (f) {
            var pr = f.properties || {}, rings = ringsOf(f.geometry);
            var hot = (f === mine);
            rings.forEach(function (ring) {
              if (!ring || ring.length < 3) return;
              x.beginPath();
              ring.forEach(function (p, i) { var q = px(p); if (i) x.lineTo(q[0], q[1]); else x.moveTo(q[0], q[1]); });
              x.closePath();
              if (hot) { x.fillStyle = 'rgba(255,122,0,.10)'; x.fill(); }
              x.strokeStyle = hot ? '#e11d2e' : '#e0a03a';
              x.lineWidth = hot ? 3 : 2;
              x.lineJoin = 'round'; x.stroke();
            });
            var b0 = rings[0];
            if (!b0) return;
            var mnx = 1e9, mny = 1e9, mxx = -1e9, mxy = -1e9, sx = 0, sy = 0;
            b0.forEach(function (p) {
              var q = px(p);
              if (q[0] < mnx) mnx = q[0]; if (q[0] > mxx) mxx = q[0];
              if (q[1] < mny) mny = q[1]; if (q[1] > mxy) mxy = q[1];
              sx += q[0]; sy += q[1];
            });
            var pw = mxx - mnx, ph = mxy - mny;
            var jb = String(pr.jibun || '').replace(/\s+/g, '');
            /* 302수리C — 칸이 좁은 필지는 지번을 적지 않는다(글자 겹침 방지) */
            var fs2 = Math.max(11, Math.min(16, Math.min(pw, ph) / 2.6));
            if (jb && pw > 34 && ph > 20) {
              labels.push({ t: jb, x: sx / b0.length, y: sy / b0.length, s: fs2, w: pw });
            }
          });
          var boxes = [], nearCenter = false;
          labels.sort(function (a, b) { return b.w - a.w; });
          labels.forEach(function (l) {
            l.y = Math.round(l.y); l.x = Math.round(l.x);
            if (l.x < 14 || l.x > W - 14 || l.y < 14 || l.y > H - 14) return;
            /* 중심점(주황 점)이 지번 글자를 덮지 않게 — 중심에 붙은 지번은 조금 위로 */
            if (Math.abs(l.x - W / 2) < 30 && Math.abs(l.y - H / 2) < 26) { l.y -= 24; nearCenter = true; }
            x.font = '600 ' + Math.round(l.s) + 'px ' + FONT;
            var tw = x.measureText(l.t).width + 6, th = l.s + 6;
            var bb = { x: l.x - tw / 2, y: l.y - th / 2, w: tw, h: th }, hit = false;
            for (var i = 0; i < boxes.length; i++) {
              var o2 = boxes[i];
              if (bb.x < o2.x + o2.w && bb.x + bb.w > o2.x && bb.y < o2.y + o2.h && bb.y + bb.h > o2.y) { hit = true; break; }
            }
            if (hit) return;
            boxes.push(bb);
            x.textAlign = 'center'; x.textBaseline = 'middle';
            x.fillStyle = 'rgba(255,255,255,.85)';
            x.fillRect(bb.x, bb.y, bb.w, bb.h);
            x.fillStyle = '#2b62c9'; x.fillText(l.t, l.x, l.y);
          });
          /* 중심점 표시 — 지번 글자가 그 자리에 있으면 점을 찍지 않는다 */
          if (!nearCenter) {
            x.fillStyle = '#FF7A00'; x.beginPath(); x.arc(W / 2, H / 2, 7, 0, Math.PI * 2); x.fill();
            x.strokeStyle = '#fff'; x.lineWidth = 2.5; x.stroke();
          }
          x.textAlign = 'left'; x.textBaseline = 'alphabetic';
          res(cv);
        } catch (e) { res(null); }
      }).catch(function () { res(null); });
    });
  }

  function f(px, w) { return (w || 400) + ' ' + Math.round(px) + 'px ' + FONT; }

  /* ---------------- 글자 재기 ---------------- */
  var MC = null;
  function mctx() {
    if (!MC) { MC = document.createElement('canvas'); MC.width = 8; MC.height = 8; }
    return MC.getContext('2d');
  }
  function measure(str, font) {
    var x = mctx(); x.font = font; return x.measureText(String(str == null ? '' : str)).width;
  }
  function wrap(str, font, maxW, maxLines) {
    var words = String(str == null ? '' : str).replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    if (!words.length) return [];
    var x = mctx(); x.font = font;
    var out = [], line = '';
    for (var i = 0; i < words.length; i++) {
      var cand = line ? line + ' ' + words[i] : words[i];
      if (x.measureText(cand).width > maxW && line) { out.push(line); line = words[i]; }
      else line = cand;
    }
    if (line) out.push(line);
    if (maxLines && out.length > maxLines) {
      out = out.slice(0, maxLines);
      var last = out[maxLines - 1];
      while (last.length > 2 && x.measureText(last + '…').width > maxW) last = last.slice(0, -1);
      out[maxLines - 1] = last + '…';
    }
    return out;
  }
  function clip(str, font, maxW) {
    var s = String(str == null ? '' : str);
    if (measure(s, font) <= maxW) return s;
    var x = mctx(); x.font = font;
    while (s.length > 2 && x.measureText(s + '…').width > maxW) s = s.slice(0, -1);
    return s + '…';
  }

  /* ---------------- 돈 표기 ---------------- */
  function eok(n) {
    n = Number(n);
    if (!isFinite(n) || n <= 0) return '';
    if (n >= 1e8) {
      var v = Math.round(n / 1e7) / 10;
      return (v % 1 ? v.toFixed(1) : String(v)) + '억';
    }
    var m = Math.round(n / 1e4);
    return m.toLocaleString('ko-KR') + '만';
  }
  function won(n) {
    var s = eok(n);
    if (!s) return '—';
    return /억$/.test(s) ? s + ' 원' : s.replace(/만$/, '만 원');
  }
  function num(n, d) {
    if (n == null || n === '' || !isFinite(+n)) return '';
    return (+n).toLocaleString('ko-KR', { maximumFractionDigits: d == null ? 0 : d });
  }
  function pyPrice(it) {
    if (!it || !it.price || !it.areaP) return null;
    return Math.round(it.price / it.areaP);
  }

  /* ---------------- 주소 ---------------- */
  function regionOf(addr) {
    var p = String(addr || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    return p.slice(0, 2).concat(p.length > 3 ? [p[3]] : []).join(' ');
  }

  /* ============================ 모델 ============================ */
  var ZONE = {
    '제1종전용주거지역': [50, 100], '제2종전용주거지역': [50, 150], '제1종일반주거지역': [60, 150],
    '제2종일반주거지역': [60, 200], '제3종일반주거지역': [50, 300], '준주거지역': [70, 400],
    '중심상업지역': [90, 1000], '일반상업지역': [80, 800], '근린상업지역': [70, 600], '유통상업지역': [80, 700],
    '전용공업지역': [70, 300], '일반공업지역': [70, 350], '준공업지역': [70, 400],
    '보전녹지지역': [20, 80], '생산녹지지역': [20, 100], '자연녹지지역': [20, 100],
    '보전관리지역': [20, 80], '생산관리지역': [20, 80], '계획관리지역': [40, 100],
    '농림지역': [20, 80], '자연환경보전지역': [20, 80]
  };
  function zoneOf(gb) {
    var list = ((gb && gb.use) || []).map(function (u) { return u.nm }).filter(Boolean);
    for (var i = 0; i < list.length; i++) if (/지역$/.test(list[i]) && ZONE[list[i]]) return list[i];
    for (var j = 0; j < list.length; j++) if (/지역$/.test(list[j])) return list[j];
    return (gb && gb.char && gb.char.prposArea1Nm) || '';
  }
  function jigaOf(gb) {
    if (!gb) return null;
    if (gb.price && +gb.price.pblntfPclnd) return +gb.price.pblntfPclnd;
    if (gb.char && +gb.char.pblntfPclnd) return +gb.char.pblntfPclnd;
    if (gb.jiga) return +gb.jiga;
    return null;
  }

  /* 제원 — 값이 있는 것만, 빠짐없이(285번 6항) */
  function specsOf(it, gb) {
    gb = gb || (it && it.gb) || {};
    it = it || {};
    var ch = gb.char || {}, toji = gb.toji || {}, b = gb.bld || {};
    var out = [];
    var addr = it.addr || gb.addr || '';
    if (addr) out.push(['소 재 지', addr + (it.jibun && addr.indexOf(it.jibun) < 0 ? ' (' + it.jibun + ')' : '')]);
    var areaM2 = it.areaM2 || (ch.lndpclAr ? +ch.lndpclAr : null) || (toji.lndpclAr ? +toji.lndpclAr : null);
    if (areaM2) out.push(['대지면적', num(areaM2, 1) + '㎡ / ' + num(Math.round(areaM2 / 3.305785)) + '평']);
    var jimok = ch.lndcgrCodeNm || toji.lndcgrCodeNm;
    if (jimok) out.push(['지 목', jimok]);
    else if (it.kind) out.push(['종 류', it.kind]);
    var zone = zoneOf(gb);
    if (zone) out.push(['용도지역', zone + (ZONE[zone] ? ' (건폐 ' + ZONE[zone][0] + '%·용적 ' + ZONE[zone][1] + '%)' : '')]);
    var jiga = jigaOf(gb);
    if (jiga) out.push(['공시지가', num(jiga) + '원/㎡' + (areaM2 ? ' · ' + won(Math.round(jiga * areaM2)) : '')]);
    if (b && b.st === 'OK' && b.items && b.items.length) {
      var b0 = b.items[0];
      var bits = [b0.mainPurpsCdNm || '', b0.strctCdNm || '', (b0.grndFlrCnt ? '지상 ' + b0.grndFlrCnt + '층' : ''), (b0.ugrndFlrCnt ? '지하 ' + b0.ugrndFlrCnt + '층' : '')].filter(Boolean);
      if (bits.length) out.push(['건 축 물', bits.join(' · ')]);
      if (b0.totArea) out.push(['연 면 적', num(b0.totArea, 1) + '㎡']);
    } else if (b.st === 'EMPTY' && /^(대지|임야|답|전|전답|농지|과수원|토지|야적장|잡종지)$/.test(String(it.kind || ''))) {
      /* 건축물대장이 비었다고 무조건 「나대지」라 적지 않는다 — 땅인 물건일 때만 (302수리C) */
      out.push(['건 축 물', '없음 (나대지)']);
    } else if (b.st === 'EMPTY' && it.kind) {
      out.push(['건 축 물', it.kind + ' — 건축물대장 확인 전']);
    }
    if (ch.roadSideCodeNm) out.push(['도 로', ch.roadSideCodeNm + (ch.tpgrphHgCodeNm ? ' · ' + ch.tpgrphHgCodeNm : '')]);
    var py = pyPrice(it);
    if (py) out.push(['평 당', won(py) + ' (매가 기준)']);
    if (it.loan) out.push(['융 자(승계)', won(it.loan)]);
    if (it.deposit) out.push(['보 증 금', won(it.deposit) + (it.monthly ? ' / 월 ' + won(it.monthly) : '')]);
    return out;
  }

  /* 감동의 글 — 조회값만으로 쓴다(없는 사실을 만들지 않는다)
     · 맹지인데 「차량 진입이 되며」 같은 모순 문구를 쓰지 않는다
     · 명함 인삿말(me.intro)은 물건표에 섞지 않는다 (299번) */
  function isBlind(it) {
    var gb = (it && it.gb) || {}, ch = gb.char || {};
    var road = String(ch.roadSideCodeNm || '');
    var txt = String(road + ' ' + ((it && it.tags) || []).join(' '));
    return /맹지/.test(txt) || (!road && /맹지/.test(String((it && it.tags) || '')));
  }
  function storyOf(it, specs, me) {
    if (!it) return '';
    if (it.story) return it.story;
    var gb = it.gb || {}, ch = gb.char || {};
    var zone = zoneOf(gb), jiga = jigaOf(gb);
    var areaM2 = it.areaM2 || (ch.lndpclAr ? +ch.lndpclAr : null);
    var p = areaM2 ? Math.round(areaM2 / 3.305785) : null;
    var where = regionOf(it.addr) || '';
    var blind = isBlind(it);
    var s = [];
    s.push((where + ' ' + (p ? num(p) + '평' : '') + (it.kind ? ' ' + it.kind : '') + '입니다.').replace(/\s+/g, ' ').trim());
    var core = [];
    if (zone) core.push(zone + '이라 건축과 토목 인허가의 폭이 넓고');
    if (blind) core.push('도로가 닿지 않는 자리라 진입로 확보를 먼저 확인하셔야 하고');
    else if (ch.roadSideCodeNm) core.push('도로접면이 ' + ch.roadSideCodeNm + '이라 차량 진입이 수월하고');
    if (jiga) core.push('공시지가는 ㎡당 ' + num(jiga) + '원으로 공적 기준이 분명합니다');
    if (core.length) s.push(core.join(' ') + '.');
    var tags = (it.tags || []).filter(function (t) { return !(blind && /도로접/.test(t)) }).slice(0, 2);
    if (tags.length) s.push(tags.join('·') + ' 조건을 갖추고 있어, 지금의 쓰임과 먼 훗날의 처분을 함께 그려 볼 수 있는 자리입니다.');
    s.push('숫자만 보여 드리지 않겠습니다. 계약 전 등기부와 토지대장 원본으로 권리관계를 다시 확인하고, 현장까지 함께 걸어 보겠습니다.');
    return s.join(' ');
  }

  function todayDot() {
    var d = new Date();
    return d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate());
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function build(it, me, opt) {
    opt = opt || {};
    it = it || {};
    me = me || {};
    var gb = it.gb || {};
    var specs = it.specs || opt.specs || specsOf(it, gb);
    var jiga = jigaOf(gb), zone = zoneOf(gb);
    var sale = it.price || null;
    var loan = it.loan || null;
    var dep = it.deposit || null;
    var residual = it.residual != null ? it.residual : (sale ? Math.max(0, sale - (loan || 0) - (dep || 0)) : null);
    var exchange = it.exchange != null ? it.exchange : null;

    var points = (it.points || []).slice(0, 3);
    if (!points.length) {
      var blind0 = isBlind(it);
      (it.tags || []).slice(0, 3).forEach(function (t) {
        var s2 = '';
        if (t === '도로접') s2 = blind0 ? '' : '도로에 바로 접해 차량 진입이 편합니다';
        else if (t === '평지') s2 = '평탄한 지형이라 성토·절토 부담이 적습니다';
        else if (t === '계곡') s2 = '계곡과 가까워 물과 바람이 좋습니다';
        else if (/관리$/.test(t)) s2 = t + ' — 개발행위 허가 검토가 가능합니다';
        else if (t === '급매') s2 = '급매 조건 — 협상 여지가 남아 있습니다';
        else s2 = t + ' 조건을 갖췄습니다';
        if (s2) points.push(s2);
      });
    }
    if (!points.length) {
      if (zone) points.push(zone + ' — 용도에 맞는 활용 폭이 넓습니다');
      if (jiga) points.push('공시지가 ㎡당 ' + num(jiga) + '원, 기준이 분명합니다');
      if (it.areaM2) points.push(num(Math.round(it.areaM2 / 3.305785)) + '평 한 필지로 규모가 명확합니다');
    }

    var mode = it.priceMode || 'residual';
    var money = {
      mode: mode, sale: sale, residual: residual, exchange: exchange, loan: loan, deposit: dep,
      label: mode === 'sale' ? '매 매 가' : (mode === 'exchange' ? '교 환 가' : '실인수 잔가'),
      value: mode === 'sale' ? won(sale) : (mode === 'exchange' ? (exchange ? won(exchange) : '협의') : won(residual)),
      note: mode === 'sale' ? '(부가세·취득세 별도)' : (mode === 'exchange' ? '(교환 조건 협의)' : '(보증금·대출 승계 제외)'),
      sub: [
        sale ? '매매 ' + eok(sale) : '',
        residual && mode !== 'residual' ? '잔가 ' + eok(residual) : '',
        exchange ? '교환 ' + eok(exchange) : ''
      ].filter(Boolean).join(' · ')
    };

    var show = it.sections || opt.sections || {};
    var extras = [];
    if (show.right === 1) {
      extras.push({ t: '권리분석', lines: ['등기부 갑구·을구 확인', '토지·건축물대장 원본 확인', '국세·지방세 완납 확인'] });
    }
    if (show.tx !== 0 && it.tx && it.tx.length) {
      extras.push({ t: '주변 실거래', lines: it.tx.slice(0, 3).map(function (r) {
        return [r.ym || r.date || '', r.jibun || r.addr || '', r.area || '', r.amount ? won(r.amount) : (r.amt || '')].filter(Boolean).join(' · ');
      }) });
    }
    if (show.appraisal === 1 && it.appraisal) {
      extras.push({ t: '감정가', lines: ['감정가 ' + won(it.appraisal) + (sale ? ' · 매매가 ' + won(sale) : '')] });
    }

    return {
      no: it.no || ('#' + (it.id ? String(it.id).slice(-4) : '')),
      date: it.date || todayDot(),
      title: it.title || [regionOf(it.addr), it.kind].filter(Boolean).join(' ') || '물건 브리핑',
      titleAccent: it.titleAccent || '',
      point: it.point || (it.tags || []).slice(0, 2).join(' · ') || (zone || '핵심 조건 자동 정리'),
      addr: it.addr || '',
      photos: (it.photos || []).filter(Boolean).slice(0, 4),
      map: it.map || '',
      cad: it.cad || '',
      polygon: it.polygon || null,
      specs: specs,
      points: points.slice(0, 3),
      story: it.story || storyOf(it, specs, me),
      money: money,
      extras: it.showExtras === 0 ? [] : extras,
      sections: it.sections || null,
      tx: it.tx || null,
      appraisal: it.appraisal || null,
      use: it.use || (it.tags || []).slice(0, 3).join(' · ') || '용도 협의',
      broker: {
        org: me.org || 'KTS 원클릭',
        title: me.title || '',
        name: me.name || '',
        phone: me.phone || '',
        fax: me.fax || '',
        email: me.email || '',
        addr: me.bizAddr || me.addr || '',
        stamp: me.stamp || 'circle'
      },
      tagline: '교환급매물.com · KTS 원클릭',
      edit: opt.edit !== false
    };
  }

  /* ============================ 배치도 ============================ */
  /* 카드 3장의 세로 배분 — 남는 자리에 맞춰 제원 줄·포인트 줄·감동의 글을 차례로 조인다 */
  function fit(m, avail, cw, land) {
    var mh = land ? 206 : 226;                     /* 03 투자조건 고정 높이 */
    /* 302수리C — 줄 높이를 글씨 크기에서 뽑는다. 예전에는 글씨는 그대로 두고 줄만 줄여
       01카드 줄이 서로 겹치는 일이 있었다. */
    var plays = [
      { sf: 20, pf: 24, ss: 21 },
      { sf: 19, pf: 23, ss: 20 },
      { sf: 18, pf: 22, ss: 19 },
      { sf: 17, pf: 21, ss: 18 },
      { sf: 16, pf: 20, ss: 17 },
      { sf: 15, pf: 19, ss: 16 }
    ];
    /* 감동의 글은 끝을 잘라 「…」를 붙이지 않는다 — 글이 다 들어가는 크기를 찾는다 */
    function comp(k) {
      var r = k.sf + 15, pt = k.pf + 10, sl = k.ss + 6;
      var lines = wrap(m.story, f(k.ss, 500), cw - 76, 0);
      var ex = m.extras.length ? 32 : 0;
      var h1 = 58 + m.specs.length * r + 14;
      var h2 = 58 + m.points.length * pt + ex + 6 + (lines.length * sl + 20) + 16;
      var h3 = 58 + mh + 14;
      return { rowH: r, ptH: pt, specSize: k.sf, pointSize: k.pf, storySize: k.ss, storyLH: sl,
               storyLines: lines, moneyH: mh, c1: h1, c2: h2, c3: h3 };
    }
    var pick = null;
    for (var i = 0; i < plays.length; i++) {
      var t = comp(plays[i]);
      pick = t;
      if (t.c1 + t.c2 + t.c3 + 20 <= avail) { t.gap = Math.min(56, (avail - t.c1 - t.c2 - t.c3) / 2); return t; }
    }
    /* 가장 작은 크기로도 넘치면 글씨·줄을 함께 더 줄여 종이 안에 다 넣는다 */
    var q = comp(plays[plays.length - 1]);
    var k0 = plays[plays.length - 1];
    for (var step = 1; step <= 3; step++) {
      var k2 = { sf: k0.sf - step, pf: k0.pf - step, ss: Math.max(11, k0.ss - step) };
      if (k2.sf < 12) break;
      var t2 = comp(k2);
      q = t2;
      if (t2.c1 + t2.c2 + t2.c3 + 12 <= avail) break;
    }
    q.gap = Math.max(6, (avail - q.c1 - q.c2 - q.c3) / 2);
    return q;
  }

  function headOf(m, land) {
    return land ? { title: 46, ty: 68, pointY: 56, addrY: 88 } : { title: 52, ty: 104, pointY: 0, addrY: 0 };
  }

  /* ---------- 미디어 배치 (사진 · 위성 · 지적도) — 302수리C 2026-11-28 ----------
     대표님 확정 시안(final_poster_landscape·portrait) 기준:
       · 사진 0장 — 위성 1장 크게. 위성·지적도가 둘 다 있으면 나란히 두 칸(라벨로 구분)
       · 사진 1장 — 썸네일 줄 없이 한 장 꽉
       · 사진 2장 이상 — 큰 사진 + 밑에 썸네일 줄,
         가로는 썸네일 줄 아래 지적도 큰 칸, 세로는 썸네일 줄 마지막 칸에 지적도 */
  function mediaPlan(m, box, o) {
    o = o || {};
    var gap = 12, thH = o.thH || 112;
    var nPh = (m.photos || []).length;
    var hasSat = !!m.map && !o.noSat, hasCad = !!m.cad;
    var out = { photo: null, thumbs: null, blocks: [] };
    function place(k, x, y, w, h) { return { k: k, x: x, y: y, w: w, h: h }; }
    if (!nPh) {
      var kinds = [];
      if (hasSat) kinds.push('sat');
      if (hasCad) kinds.push('cad');
      if (!kinds.length) return out;
      var n = kinds.length, w1 = (box.w - gap * (n - 1)) / n;
      for (var i = 0; i < n; i++) out.blocks.push(place(kinds[i], box.x + i * (w1 + gap), box.y, w1, box.h));
      return out;
    }
    if (nPh === 1) { out.photo = { x: box.x, y: box.y, w: box.w, h: box.h, idx: 0 }; return out; }
    var cells = [];
    for (var j = 1; j < nPh && cells.length < 3; j++) cells.push({ k: 'photo', idx: j });
    if (o.cadInRow && hasCad && cells.length < 4) cells.push({ k: 'cad', idx: -1 });
    var blockH = 0;
    if (!o.cadInRow && hasCad && box.h > 520) blockH = Math.max(210, Math.round(box.h * 0.30));
    var bigH = box.h - (cells.length ? thH + gap : 0) - (blockH ? blockH + gap : 0);
    out.photo = { x: box.x, y: box.y, w: box.w, h: bigH, idx: 0 };
    var yy = box.y + bigH + gap;
    if (cells.length) {
      out.thumbs = { x: box.x, y: yy, w: box.w, h: thH, gap: 10, cells: cells };
      yy += thH + gap;
    }
    if (blockH) out.blocks.push(place('cad', box.x, yy, box.w, blockH));
    return out;
  }

  /* 가로 16:9 — 왼쪽: 큰 그림 + 썸네일 줄 + 지적도 / 오른쪽: 01·02·03 */
  function planLand(m, o) {
    o = o || {};
    var W = LAND.W, H = LAND.H, PAD = 44;
    var headH = 104, footH = 100;
    var top = headH, bottom = H - footH;
    var LW = 884, LX = PAD, RX = PAD + LW + 20, RW = W - PAD - RX;
    var MP = mediaPlan(m, { x: LX, y: top, w: LW, h: bottom - top }, { thH: 112, cadInRow: false, noSat: o.noSat });
    var cardsX = RX, cardsW = RW;
    if (!MP.photo && !MP.blocks.length) {
      /* 사진도 위치도도 없을 때 — 빈 네이비 박스를 두지 않고 3단이 종이를 꽉 채운다 */
      cardsX = PAD; cardsW = W - PAD * 2;
    }
    var F = fit(m, bottom - top, cardsW, true);
    var usedL = F.c1 + F.c2 + F.c3 + F.gap * 2, exL = Math.max(0, (bottom - top) - usedL);
    F.c1 += exL * 0.18; F.c2 += exL * 0.64; F.c3 += exL * 0.18;
    var y = top, cards = [];
    cards.push({ k: 'c1', num: '01', t: '물건 개요', x: cardsX, y: y, w: cardsW, h: F.c1 });
    y += F.c1 + F.gap;
    cards.push({ k: 'c2', num: '02', t: '핵심 포인트', x: cardsX, y: y, w: cardsW, h: F.c2 });
    y += F.c2 + F.gap;
    cards.push({ k: 'c3', num: '03', t: '투자 조건', x: cardsX, y: y, w: cardsW, h: F.c3 });
    return {
      W: W, H: H, orient: 'land', pad: PAD,
      head: { x: 0, y: 0, w: W, h: headH },
      foot: { x: 0, y: bottom, w: W, h: footH },
      photo: MP.photo,
      thumbs: MP.thumbs || { x: LX, y: 0, w: LW, h: 0, gap: 10, cells: [] },
      blocks: MP.blocks,
      map: MP.blocks.length ? MP.blocks[0] : null,
      cards: cards,
      rowH: F.rowH, ptH: F.ptH, specSize: F.specSize, pointSize: F.pointSize,
      storySize: F.storySize, storyLH: F.storyLH,
      storyLines: F.storyLines, moneyH: F.moneyH
    };
  }

  /* 세로 9:16 — 위에서부터 큰 그림 · 썸네일 줄(지적도 포함) · 01·02·03 */
  function planPort(m, o) {
    o = o || {};
    var W = PORT.W, H = PORT.H, PAD = 40;
    var headH = 236, footH = 176;
    var top = headH, bottom = H - footH;
    var cw = W - PAD * 2;
    var nPh = (m.photos || []).length;
    var hasLoc = !!(m.map || m.cad);
    var availAll = bottom - top;
    /* 미디어는 목표 비율만큼, 단 카드(01·02·03)가 다 들어갈 자리를 먼저 뺀다 — 종이 밖으로 넘치지 않게 */
    var mediaMax = nPh >= 2 ? 700 : (nPh === 1 ? 660 : (hasLoc ? 680 : 0));
    var mediaMin = nPh >= 2 ? 540 : (nPh === 1 ? 420 : (hasLoc ? 460 : 0));
    var mediaH = mediaMax ? Math.min(mediaMax, Math.round(availAll * 0.46)) : 0;
    if (mediaH && mediaH < mediaMin) mediaH = Math.min(mediaMax, mediaMin);
    var F = null, guard = 0;
    while (true) {
      var cardsAvail = availAll - (mediaH ? mediaH + 18 : 6);
      F = fit(m, cardsAvail, cw, false);
      var need = F.c1 + F.c2 + F.c3 + F.gap * 2;
      var slack = cardsAvail - need;
      if (guard++ > 8) break;
      if (need > cardsAvail + 0.5) {
        if (mediaH <= mediaMin) break;
        mediaH = Math.max(mediaMin, mediaH - Math.ceil(need - cardsAvail) - 8);
        continue;
      }
      if (F.specSize < 15 || F.storySize < 16) {
        if (mediaH <= mediaMin) break;
        mediaH = Math.max(mediaMin, mediaH - 40);
        continue;
      }
      /* 글·카드가 다 들어가고도 자리가 남으면 그림이 그 자리를 먹는다 — 카드 안에 빈 구멍을 두지 않는다 */
      if (slack > 24 && mediaH < mediaMax) {
        mediaH = Math.min(mediaMax, mediaH + Math.ceil(slack) - 8);
        continue;
      }
      break;
    }
    var MP = mediaH
      ? mediaPlan(m, { x: PAD, y: top, w: cw, h: mediaH }, { thH: 148, cadInRow: true, noSat: o.noSat })
      : { photo: null, thumbs: null, blocks: [] };
    var cardsTop = top + (mediaH ? mediaH + 18 : 6);
    if (!MP.photo && !MP.blocks.length) cardsTop = top + 6;

    F = fit(m, bottom - cardsTop, cw, false);
    var usedP = F.c1 + F.c2 + F.c3 + F.gap * 2, exP = Math.max(0, (bottom - cardsTop) - usedP);
    F.c1 += exP * 0.18; F.c2 += exP * 0.64; F.c3 += exP * 0.18;
    var y = cardsTop, cards = [];
    cards.push({ k: 'c1', num: '01', t: '물건 개요', x: PAD, y: y, w: cw, h: F.c1 });
    y += F.c1 + F.gap;
    cards.push({ k: 'c2', num: '02', t: '핵심 포인트', x: PAD, y: y, w: cw, h: F.c2 });
    y += F.c2 + F.gap;
    cards.push({ k: 'c3', num: '03', t: '투자 조건', x: PAD, y: y, w: cw, h: F.c3 });
    return {
      W: W, H: H, orient: 'port', pad: PAD,
      head: { x: 0, y: 0, w: W, h: headH },
      foot: { x: 0, y: bottom, w: W, h: footH },
      photo: MP.photo,
      thumbs: MP.thumbs || { x: PAD, y: 0, w: cw, h: 0, gap: 10, cells: [] },
      blocks: MP.blocks,
      map: MP.blocks.length ? MP.blocks[0] : null,
      cards: cards,
      rowH: F.rowH, ptH: F.ptH, specSize: F.specSize, pointSize: F.pointSize,
      storySize: F.storySize, storyLH: F.storyLH,
      storyLines: F.storyLines, moneyH: F.moneyH
    };
  }
  function plan(m, orient, o) { return orient === 'port' ? planPort(m, o) : planLand(m, o); }

  /* ============================ 그림 도구 ============================ */
  function rr(x, px, py, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    x.beginPath();
    x.moveTo(px + r, py);
    x.lineTo(px + w - r, py); x.quadraticCurveTo(px + w, py, px + w, py + r);
    x.lineTo(px + w, py + h - r); x.quadraticCurveTo(px + w, py + h, px + w - r, py + h);
    x.lineTo(px + r, py + h); x.quadraticCurveTo(px, py + h, px, py + h - r);
    x.lineTo(px, py + r); x.quadraticCurveTo(px, py, px + r, py);
    x.closePath();
  }
  function cover(x, img, dx, dy, dw, dh, radius) {
    if (!img || !img.width) return false;
    x.save();
    if (radius) { rr(x, dx, dy, dw, dh, radius); x.clip(); } else { x.beginPath(); x.rect(dx, dy, dw, dh); x.clip(); }
    var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    var s = Math.max(dw / iw, dh / ih);
    var w = iw * s, h = ih * s;
    x.drawImage(img, dx + (dw - w) / 2, dy + (dh - h) / 2, w, h);
    x.restore();
    return true;
  }
  /* 빨간 테두리선(271번) — 찍은 꼭짓점을 잇는 닫힌 다각형 */
  function polygon(x, pts, dx, dy, w, h) {
    if (!pts || pts.length < 3) return;
    x.save();
    x.lineJoin = 'round'; x.lineCap = 'round';
    x.beginPath();
    pts.forEach(function (p, i) {
      var px = dx + p[0] * w, py = dy + p[1] * h;
      if (i) x.lineTo(px, py); else x.moveTo(px, py);
    });
    x.closePath();
    x.strokeStyle = 'rgba(255,255,255,.92)'; x.lineWidth = Math.max(6, w * 0.008);
    x.stroke();
    x.strokeStyle = '#e11d2e'; x.lineWidth = Math.max(3, w * 0.0045);
    x.stroke();
    x.fillStyle = 'rgba(225,29,46,.12)'; x.fill();
    x.restore();
  }

  /* ============================ 캔버스 ============================ */
  function draw(ctx, m, orient, imgs, opts) {
    opts = opts || {};
    var P = plan(m, orient, opts);
    var land = orient !== 'port';
    var x = ctx;
    x.save();
    x.textBaseline = 'alphabetic';
    x.textAlign = 'left';

    x.fillStyle = C.navy; x.fillRect(0, 0, P.W, P.H);

    /* ---------- 머리 ---------- */
    var headTitleSize = land ? 46 : 52;
    var tw = P.head.w - P.pad * 2 - (land ? 520 : 0);
    var tFont = f(headTitleSize, 900);
    var title = clip(m.title, tFont, m.titleAccent ? tw * 0.72 : tw);
    var ty = land ? 66 : 100;
    x.fillStyle = C.white; x.font = tFont;
    x.fillText(title, P.pad, ty);
    if (m.titleAccent) {
      var tW = measure(title, tFont);
      x.fillStyle = C.org;
      x.fillText(clip(' ' + m.titleAccent, tFont, tw - tW), P.pad + tW, ty);
    }
    if (land) {
      x.textAlign = 'right';
      x.fillStyle = '#ffcf9e'; x.font = f(23, 800);
      x.fillText(clip(m.point, f(22, 800), 500), P.head.w - P.pad, 52);
      x.fillStyle = '#9fb2ca'; x.font = f(18, 600);
      x.fillText(clip(m.addr, f(17, 600), 500), P.head.w - P.pad, 82);
      x.textAlign = 'left';
      x.fillStyle = 'rgba(255,255,255,.16)'; x.fillRect(P.head.w - P.pad - 508, 26, 1.5, 56);
      x.fillStyle = C.org; x.fillRect(P.pad, P.head.h - 5, P.W - P.pad * 2, 5);
    } else {
      x.fillStyle = '#b9c8dc'; x.font = f(24, 600);
      x.fillText(clip('📍 ' + m.addr, f(24, 600), P.W - P.pad * 2), P.pad, ty + 54);
      var pw = Math.min(P.W - P.pad * 2, measure(m.point, f(24, 800)) + 44);
      x.fillStyle = 'rgba(255,122,0,.18)'; rr(x, P.pad, ty + 76, pw, 48, 24); x.fill();
      x.fillStyle = '#ffcf9e'; x.font = f(24, 800);
      x.fillText(clip(m.point, f(24, 800), pw - 44), P.pad + 22, ty + 109);
      x.fillStyle = C.org; x.fillRect(0, P.head.h - 5, P.W, 5);
    }

    /* ---------- 대표 사진 (사진이 있을 때만) ---------- */
    if (P.photo) {
      var ph = P.photo;
      x.fillStyle = C.navy2; rr(x, ph.x, ph.y, ph.w, ph.h, 10); x.fill();
      var drew = cover(x, imgs.main, ph.x, ph.y, ph.w, ph.h, 10);
      if (!drew) {
        x.fillStyle = 'rgba(255,255,255,.06)'; rr(x, ph.x, ph.y, ph.w, ph.h, 10); x.fill();
        x.fillStyle = '#7d90aa'; x.font = f(land ? 26 : 30, 800); x.textAlign = 'center';
        x.fillText('현장 사진 준비 중', ph.x + ph.w / 2, ph.y + ph.h / 2);
        x.textAlign = 'left';
      }
      if (m.polygon && m.polygon.photo === 0) polygon(x, m.polygon.points, ph.x, ph.y, ph.w, ph.h);
    }

    /* ---------- 큰 위치 칸 (사진이 없을 때는 위성·지적도가 이 자리를 쓴다) ---------- */
    function locLabel(b) { return b.k === 'cad' ? '지적도' : '위성사진'; }
    function locImg(b) { return b.k === 'cad' ? imgs.cad : imgs.map; }
    function drawLoc(b) {
      x.save();
      x.fillStyle = '#fff'; rr(x, b.x, b.y, b.w, b.h, 10); x.fill();
      rr(x, b.x, b.y, b.w, b.h, 10); x.clip();
      x.fillStyle = '#eef3f9'; x.fillRect(b.x, b.y, b.w, b.h);
      var im = locImg(b);
      if (im) cover(x, im, b.x, b.y, b.w, b.h, 0);
      else {
        x.strokeStyle = '#d7e0ec'; x.lineWidth = 2;
        for (var gx2 = 0; gx2 < b.w; gx2 += 46) { x.beginPath(); x.moveTo(b.x + gx2, b.y); x.lineTo(b.x + gx2, b.y + b.h); x.stroke(); }
        for (var gy2 = 0; gy2 < b.h; gy2 += 46) { x.beginPath(); x.moveTo(b.x, b.y + gy2); x.lineTo(b.x + b.w, b.y + gy2); x.stroke(); }
        var ccx = b.x + b.w / 2, ccy = b.y + b.h / 2 - 18;
        x.fillStyle = 'rgba(255,122,0,.14)'; x.beginPath(); x.arc(ccx, ccy, 34, 0, Math.PI * 2); x.fill();
        x.fillStyle = C.org; x.beginPath(); x.arc(ccx, ccy - 4, 9, 0, Math.PI * 2); x.fill();
        x.beginPath(); x.moveTo(ccx - 9, ccy + 4); x.lineTo(ccx, ccy + 24); x.lineTo(ccx + 9, ccy + 4); x.closePath(); x.fill();
        x.fillStyle = '#5d7189'; x.font = f(21, 800); x.textAlign = 'center';
        x.fillText('주소를 넣으면 ' + (b.k === 'cad' ? '지적도' : '위성사진') + '가 자동으로 붙습니다', ccx, ccy + 62);
        x.textAlign = 'left';
      }
      if (m.polygon && m.polygon.photo === -1 && b.k === 'cad') polygon(x, m.polygon.points, b.x, b.y, b.w, b.h);
      x.restore();
      /* 라벨 — 위성이냐 지적도냐를 분명히. 왼쪽 아래에 두면 브이월드 워터마크도 가려진다 */
      var lbl = locLabel(b), lbW = measure(lbl, f(18, 800)) + 26;
      x.fillStyle = b.k === 'cad' ? 'rgba(11,21,38,.84)' : 'rgba(11,21,38,.78)';
      rr(x, b.x + 12, b.y + b.h - 46, lbW, 34, 8); x.fill();
      x.fillStyle = '#ffd9b3'; x.font = f(18, 900);
      x.fillText(lbl, b.x + 25, b.y + b.h - 23);
    }
    (P.blocks || []).forEach(drawLoc);

    /* ---------- 썸네일 줄(보조 사진 + 지적도) ---------- */
    var subs = imgs.subs || [];
    var T = P.thumbs, cellsT = (T && T.cells) || [], nCell = cellsT.length;
    var cellW = nCell ? (T.w - T.gap * (nCell - 1)) / nCell : 0;
    for (var k = 0; k < nCell; k++) {
      var cx = T.x + k * (cellW + T.gap), cy = T.y, cell = cellsT[k];
      x.save();
      x.fillStyle = '#fff'; rr(x, cx, cy, cellW, T.h, 8); x.fill();
      rr(x, cx, cy, cellW, T.h, 8); x.clip();
      if (cell.k === 'photo') {
        var sub = null;
        for (var s2 = 0; s2 < subs.length; s2++) if (subs[s2].idx === cell.idx) sub = subs[s2];
        x.fillStyle = C.navy2; x.fillRect(cx, cy, cellW, T.h);
        if (sub && sub.img) {
          cover(x, sub.img, cx, cy, cellW, T.h, 0);
          if (m.polygon && m.polygon.photo === sub.idx) polygon(x, m.polygon.points, cx, cy, cellW, T.h);
        }
      } else {
        var imT = cell.k === 'cad' ? imgs.cad : imgs.map;
        x.fillStyle = '#eef3f9'; x.fillRect(cx, cy, cellW, T.h);
        if (imT) cover(x, imT, cx, cy, cellW, T.h, 0);
      }
      x.restore();
      if (cell.k !== 'photo') {
        var cl = cell.k === 'cad' ? '지적도' : '위성사진';
        x.fillStyle = 'rgba(11,21,38,.82)'; rr(x, cx + 8, cy + T.h - 34, measure(cl, f(16, 800)) + 20, 26, 6); x.fill();
        x.fillStyle = '#ffd9b3'; x.font = f(16, 900); x.fillText(cl, cx + 18, cy + T.h - 15);
      }
    }

    P.cards.forEach(function (cd) { drawCard(x, m, P, cd, land); });
    drawFoot(x, m, P, imgs, land);
    x.restore();
    return P;
  }

  function drawCard(x, m, P, cd, land) {
    var pad = 20;
    x.fillStyle = '#fff'; rr(x, cd.x, cd.y, cd.w, cd.h, 10); x.fill();
    x.save();
    rr(x, cd.x, cd.y, cd.w, cd.h, 10); x.clip();
    x.fillStyle = C.navy; rr(x, cd.x + pad, cd.y + 16, land ? 52 : 54, land ? 40 : 42, 7); x.fill();
    x.fillStyle = '#fff'; x.font = f(land ? 26 : 27, 900); x.textAlign = 'center';
    x.fillText(cd.num, cd.x + pad + (land ? 26 : 27), cd.y + 45);
    x.textAlign = 'left';
    x.fillStyle = C.navy; x.font = f(land ? 30 : 31, 900);
    x.fillText(cd.t, cd.x + pad + (land ? 66 : 68), cd.y + 46);
    var tW = measure(cd.t, f(land ? 30 : 31, 900));
    x.strokeStyle = '#d7dfea'; x.lineWidth = 1.5;
    x.beginPath(); x.moveTo(cd.x + pad + (land ? 78 : 80) + tW, cd.y + 36);
    x.lineTo(cd.x + cd.w - pad, cd.y + 36); x.stroke();

    var pfs = P.pointSize || (land ? 24 : 25);
    if (cd.k === 'c1') {
      var lx = cd.x + pad + 8, labW = 0;
      var sfs = P.specSize || (land ? 20 : 21);
      m.specs.forEach(function (s) { labW = Math.max(labW, measure(s[0], f(sfs, 800))); });
      var vx = cd.x + pad + 8 + Math.min(land ? 116 : 122, labW + 16);
      var top0 = cd.y + 58 + Math.max(0, (cd.h - 58 - m.specs.length * P.rowH - 8) / 2);
      m.specs.forEach(function (sp, i) {
        var ry = top0 + i * P.rowH;
        if (ry + P.rowH > cd.y + cd.h - 4) return;
        if (i) { x.strokeStyle = '#eef2f7'; x.lineWidth = 1; x.beginPath(); x.moveTo(cd.x + pad, ry); x.lineTo(cd.x + cd.w - pad, ry); x.stroke(); }
        x.fillStyle = C.ink3; x.font = f(sfs, 800);
        x.fillText(sp[0], lx, ry + P.rowH - 11);
        x.fillStyle = C.ink; x.font = f(sfs + 2, 700);
        x.fillText(clip(sp[1], f(sfs + 2, 700), cd.x + cd.w - pad - vx), vx, ry + P.rowH - 10);
      });
    } else if (cd.k === 'c2') {
      /* 302수리C — 포인트와 감동의 글을 한 덩어리로 보고 카드 안에서 세로 가운데에 둔다(가운데 빈 구멍 방지) */
      var exH = m.extras.length ? 32 : 0;
      var sh0 = P.storyLines.length * P.storyLH + 20;
      var groupH = m.points.length * P.ptH + exH + 14 + sh0;
      var iy = cd.y + 58 + Math.max(0, (cd.h - 58 - groupH - 8) / 2);
      m.points.forEach(function (p) {
        x.fillStyle = C.org; x.beginPath(); x.arc(cd.x + pad + 12, iy + 12, 12, 0, Math.PI * 2); x.fill();
        x.strokeStyle = '#fff'; x.lineWidth = 2.6; x.lineCap = 'round';
        x.beginPath(); x.moveTo(cd.x + pad + 6, iy + 12); x.lineTo(cd.x + pad + 10.5, iy + 17); x.lineTo(cd.x + pad + 18.5, iy + 7); x.stroke();
        x.fillStyle = C.ink; x.font = f(pfs, 700);
        x.fillText(clip(p, f(pfs, 700), cd.w - pad * 2 - 46), cd.x + pad + 36, iy + Math.min(20, pfs));
        iy += P.ptH;
      });
      if (m.extras.length) {
        x.fillStyle = '#eef2f8'; rr(x, cd.x + pad, iy + 2, cd.w - pad * 2, 26, 6); x.fill();
        x.fillStyle = C.ink2; x.font = f(land ? 17 : 18, 800);
        var ex0 = m.extras.map(function (e) { return e.t + ' ' + (e.lines[0] || ''); }).join('  ·  ');
        x.fillText(clip(ex0, f(land ? 17 : 18, 800), cd.w - pad * 2 - 16), cd.x + pad + 8, iy + 20);
        iy += 32;
      }
      var sy = iy + 10;
      var sLines = P.storyLines;
      var sh = sLines.length * P.storyLH + 20;
      x.fillStyle = '#f2f6fc'; rr(x, cd.x + pad, sy, cd.w - pad * 2, sh, 8); x.fill();
      x.fillStyle = C.org; x.fillRect(cd.x + pad, sy + 5, 3, sh - 10);
      x.fillStyle = C.ink2; x.font = f(P.storySize, 500);
      sLines.forEach(function (ln, i) {
        x.fillText(ln, cd.x + pad + 16, sy + 24 + i * P.storyLH);
      });
    } else if (cd.k === 'c3') {
      x.fillStyle = C.ink3; x.font = f(land ? 24 : 26, 800);
      x.fillText(m.money.label, cd.x + pad + 4, cd.y + 88);
      x.fillStyle = C.ink3; x.font = f(land ? 18 : 19, 700);
      x.fillText(clip(m.money.note, f(land ? 18 : 19, 700), cd.w - pad * 2 - 40), cd.x + pad + 12 + measure(m.money.label, f(land ? 24 : 26, 800)) + 8, cd.y + 87);
      var bigS = land ? 84 : 92;
      var big = m.money.value || '—';
      var maxW = cd.w - pad * 2 - 8;
      while (measure(big, f(bigS, 900)) > maxW && bigS > 40) bigS -= 4;
      x.fillStyle = C.org; x.font = f(bigS, 900);
      x.fillText(big, cd.x + pad + 4, cd.y + 92 + bigS * 0.80);
      if (m.money.sub) {
        x.fillStyle = C.ink3; x.font = f(land ? 17 : 18, 700);
        x.fillText(clip(m.money.sub, f(land ? 17 : 18, 700), cd.w - pad * 2), cd.x + pad + 6, cd.y + 92 + bigS * 1.10 + 16);
      }
      var by = cd.y + 92 + Math.round(bigS * 1.10) + 34;
      if (by + (land ? 36 : 40) > cd.y + cd.h - 8) by = cd.y + cd.h - (land ? 46 : 52);
      x.fillStyle = C.org; rr(x, cd.x + pad, by, land ? 92 : 100, land ? 36 : 40, 5); x.fill();
      x.fillStyle = '#fff'; x.font = f(land ? 17 : 18, 900); x.textAlign = 'center';
      x.fillText('추천 용도', cd.x + pad + (land ? 46 : 50), by + (land ? 24 : 27));
      x.textAlign = 'left';
      x.fillStyle = 'rgba(255,122,0,.10)'; rr(x, cd.x + pad + (land ? 100 : 108), by, cd.w - pad * 2 - (land ? 100 : 108), land ? 36 : 40, 5); x.fill();
      x.fillStyle = '#7a3b00'; x.font = f(land ? 19 : 20, 900);
      x.fillText(clip(m.use, f(land ? 19 : 20, 900), cd.w - pad * 2 - (land ? 120 : 128)), cd.x + pad + (land ? 114 : 122), by + (land ? 24 : 27));
    }
    x.restore();
  }

  function drawFoot(x, m, P, imgs, land) {
    var F = P.foot, b = m.broker, pad = P.pad;
    x.fillStyle = C.navy; x.fillRect(F.x, F.y, F.w, F.h);
    x.fillStyle = C.org; x.fillRect(F.x, F.y, F.w, 3);
    var sealS = land ? 86 : 104;
    var sealX = F.x + F.w - pad - sealS, sealY = F.y + (F.h - sealS) / 2;
    if (imgs.seal) {
      x.fillStyle = '#fff'; x.beginPath(); x.arc(sealX + sealS / 2, sealY + sealS / 2 - 4, sealS / 2 + 4, 0, Math.PI * 2); x.fill();
      x.drawImage(imgs.seal, sealX, F.y + (F.h - sealS) / 2 - 4, sealS, sealS);
    }
    var tx = F.x + pad;
    if (land) {
      x.fillStyle = C.gold; x.font = f(27, 900);
      var org = clip(b.org, f(27, 900), 300);
      x.fillText(org, tx, F.y + 42);
      x.fillStyle = '#c9d6e8'; x.font = f(25, 800);
      x.fillText('· ' + clip(((b.title ? b.title + ' ' : '') + b.name), f(25, 800), 210), tx + measure(org, f(27, 900)) + 12, F.y + 42);
      x.fillStyle = C.org; x.font = f(17, 900);
      x.fillText('☎', tx, F.y + 78);
      x.fillStyle = '#fff'; x.font = f(32, 900);
      x.fillText(b.phone || '', tx + 27, F.y + 80);
      x.textAlign = 'right';
      x.fillStyle = '#8fa2bb'; x.font = f(16, 600);
      x.fillText(m.tagline, sealX - 20, F.y + 56);
      var extra = [b.fax ? 'FAX ' + b.fax : '', b.email || ''].filter(Boolean).join('  ·  ');
      if (extra) x.fillText(clip(extra, f(16, 600), 430), sealX - 20, F.y + 80);
      x.textAlign = 'left';
    } else {
      x.fillStyle = C.gold; x.font = f(26, 900);
      x.fillText(clip(b.org, f(26, 900), 600), tx, F.y + 46);
      x.fillStyle = '#dbe6f4'; x.font = f(25, 800);
      x.fillText(clip(((b.title ? b.title + ' ' : '') + b.name), f(25, 800), 600), tx, F.y + 82);
      x.fillStyle = '#fff'; x.font = f(34, 900);
      x.fillText(b.phone || '', tx, F.y + 128);
      x.fillStyle = '#8fa2bb'; x.font = f(16, 600);
      x.fillText(clip([m.tagline, b.email].filter(Boolean).join('  ·  '), f(16, 600), 560), tx, F.y + 156);
    }
  }

  /* ============================ 화면(DOM) ============================ */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function polySvg(pts) {
    if (!pts || pts.length < 3) return '';
    var s = pts.map(function (p) { return (p[0] * 100).toFixed(2) + ',' + (p[1] * 100).toFixed(2); }).join(' ');
    return '<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none">'
      + '<polygon points="' + s + '" fill="rgba(225,29,46,.12)" stroke="rgba(255,255,255,.9)" stroke-width="3" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>'
      + '<polygon points="' + s + '" fill="none" stroke="#e11d2e" stroke-width="1.8" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>';
  }
  function abs(l, t, w, h) {
    return 'position:absolute;left:' + l + 'px;top:' + t + 'px;width:' + w + 'px;height:' + h + 'px;';
  }
  function ed(key) { return ' data-edit="' + key + '"'; }

  function dom(m, orient) {
    var P = plan(m, orient), land = orient !== 'port';
    var h = '';
    h += '<div class="pb-page" style="width:' + P.W + 'px;height:' + P.H + 'px;background:' + C.navy + '">';
    var headTitleSize = land ? 46 : 52;
    h += '<div style="' + abs(P.pad, land ? 24 : 40, P.W - P.pad * 2, P.head.h - 30) + '">';
    h += '<div style="font-size:' + headTitleSize + 'px;line-height:' + Math.round(headTitleSize * 1.12) + 'px;font-weight:900;color:#fff;white-space:nowrap;overflow:hidden">'
      + '<span class="edt"' + ed('title') + '>' + esc(m.title) + '</span>'
      + (m.titleAccent ? '<span class="edt" style="color:' + C.org + '"' + ed('titleAccent') + '> ' + esc(m.titleAccent) + '</span>' : '')
      + '</div>';
    if (land) {
      h += '<div style="position:absolute;right:0;top:0;width:490px;text-align:right;border-left:1.5px solid rgba(255,255,255,.16);padding-left:18px">'
        + '<div class="edt" style="font-size:22px;line-height:52px;font-weight:800;color:#ffcf9e;white-space:nowrap;overflow:hidden"' + ed('point') + '>' + esc(m.point) + '</div>'
        + '<div class="edt" style="font-size:17px;line-height:28px;font-weight:600;color:#9fb2ca;white-space:nowrap;overflow:hidden"' + ed('addr') + '>' + esc(m.addr) + '</div>'
        + '</div>';
    } else {
      h += '<div class="edt" style="margin-top:10px;font-size:24px;line-height:34px;font-weight:600;color:#b9c8dc;white-space:nowrap;overflow:hidden"' + ed('addr') + '>📍 ' + esc(m.addr) + '</div>'
        + '<div class="edt" style="display:inline-block;margin-top:8px;padding:6px 20px;border-radius:24px;background:rgba(255,122,0,.18);color:#ffcf9e;font-size:24px;line-height:36px;font-weight:800;max-width:100%;overflow:hidden;white-space:nowrap"' + ed('point') + '>' + esc(m.point) + '</div>';
    }
    h += '</div>';
    h += '<div style="' + abs(land ? P.pad : 0, P.head.h - 5, land ? P.W - P.pad * 2 : P.W, 5) + 'background:' + C.org + '"></div>';

    /* 사진 (사진이 있을 때만 — 없으면 빈 네이비 박스를 두지 않는다) */
    if (P.photo) {
      h += '<div class="pb-slot" data-slot="photo:0" style="' + abs(P.photo.x, P.photo.y, P.photo.w, P.photo.h) + 'border-radius:10px;overflow:hidden;background:' + C.navy2 + '">';
      if (m.photos[0]) h += '<img src="' + esc(m.photos[0]) + '" alt="" style="width:100%;height:100%;object-fit:cover;display:block">';
      else h += '<div style="display:grid;place-items:center;height:100%;color:#7d90aa;font-size:26px;font-weight:800">현장 사진 준비 중</div>';
      if (m.polygon && m.polygon.photo === 0) h += polySvg(m.polygon.points);
      h += '</div>';
    }

    /* 큰 위치 칸 — 위성사진 / 지적도 (사진 0장일 때는 이 칸이 대표) */
    (P.blocks || []).forEach(function (b) {
      var lbl = b.k === 'cad' ? '지적도' : '위성사진';
      var src = b.k === 'cad' ? (m.cad || '') : (m.map || '');
      h += '<div class="pb-slot" data-slot="' + b.k + '" style="' + abs(b.x, b.y, b.w, b.h) + 'border-radius:10px;overflow:hidden;background:#eef3f9">';
      if (src) h += '<img src="' + esc(src) + '" alt="' + lbl + '" style="width:100%;height:100%;object-fit:cover;display:block">';
      else {
        h += '<div style="position:absolute;inset:0;display:grid;place-items:center;background:#eef3f9;color:#8296ad;font-size:24px;font-weight:800;text-align:center;line-height:1.5">'
          + '주소를 넣으면<br>' + lbl + '가 자동으로 붙습니다</div>';
      }
      if (m.polygon && m.polygon.photo === -1 && b.k === 'cad') h += polySvg(m.polygon.points);
      h += '<span style="position:absolute;left:12px;bottom:12px;font-size:18px;font-weight:900;color:#ffd9b3;background:rgba(11,21,38,.84);padding:4px 12px;border-radius:8px">' + lbl + '</span>';
      h += '</div>';
    });

    /* 썸네일 줄 — 보조 사진 + (세로는) 지적도 */
    var subs = [];
    for (var s = 1; s < m.photos.length && subs.length < 3; s++) subs.push({ src: m.photos[s], idx: s });
    var T = P.thumbs, cellsT = (T && T.cells) || [], nCell = cellsT.length;
    var cellW = nCell ? (T.w - T.gap * (nCell - 1)) / nCell : 0;
    for (var k = 0; k < nCell; k++) {
      var cell = cellsT[k];
      h += '<div class="pb-slot" data-slot="' + (cell.k === 'photo' ? ('photo:' + cell.idx) : cell.k) + '" style="' + abs(T.x + k * (cellW + T.gap), T.y, cellW, T.h) + 'border-radius:8px;overflow:hidden;background:' + (cell.k === 'photo' ? C.navy2 : '#eef3f9') + '">';
      if (cell.k === 'photo') {
        var srcP = m.photos[cell.idx] || '';
        if (srcP) h += '<img src="' + esc(srcP) + '" alt="" style="width:100%;height:100%;object-fit:cover;display:block">';
        if (m.polygon && m.polygon.photo === cell.idx) h += polySvg(m.polygon.points);
      } else {
        var srcL = cell.k === 'cad' ? (m.cad || '') : (m.map || '');
        var lblL = cell.k === 'cad' ? '지적도' : '위성사진';
        if (srcL) h += '<img src="' + esc(srcL) + '" alt="' + lblL + '" style="width:100%;height:100%;object-fit:cover;display:block">';
        h += '<span style="position:absolute;left:8px;bottom:6px;font-size:16px;font-weight:900;color:#ffd9b3;background:rgba(11,21,38,.82);padding:3px 9px;border-radius:6px">' + lblL + '</span>';
      }
      h += '</div>';
    }

    P.cards.forEach(function (cd) { h += domCard(m, P, cd, land); });

    /* 발 */
    var F = P.foot, b = m.broker, sealS = land ? 86 : 104;
    h += '<div style="' + abs(0, F.y, P.W, F.h) + 'background:' + C.navy + ';border-top:3px solid ' + C.org + '">';
    if (land) {
      h += '<div style="position:absolute;left:' + P.pad + 'px;top:18px;display:flex;align-items:baseline;gap:12px">'
        + '<span class="edt" style="font-size:27px;line-height:32px;font-weight:900;color:' + C.gold + '"' + ed('org') + '>' + esc(b.org) + '</span>'
        + '<span style="font-size:25px;line-height:32px;font-weight:800;color:#c9d6e8">· <span class="edt"' + ed('who') + '>' + esc(((b.title ? b.title + ' ' : '') + b.name)) + '</span></span></div>'
        + '<div style="position:absolute;left:' + P.pad + 'px;top:56px;display:flex;align-items:center;gap:6px">'
        + '<span style="color:' + C.org + ';font-size:18px;font-weight:900">☎</span>'
        + '<span class="edt" style="font-size:32px;line-height:38px;font-weight:900;color:#fff;letter-spacing:.5px"' + ed('phone') + '>' + esc(b.phone) + '</span></div>';
    } else {
      h += '<div style="position:absolute;left:' + P.pad + 'px;top:20px;width:' + (P.W - P.pad * 2 - sealS - 20) + 'px">'
        + '<div class="edt" style="font-size:26px;line-height:32px;font-weight:900;color:' + C.gold + '"' + ed('org') + '>' + esc(b.org) + '</div>'
        + '<div class="edt" style="margin-top:8px;font-size:25px;line-height:32px;font-weight:800;color:#dbe6f4"' + ed('who') + '>' + esc(((b.title ? b.title + ' ' : '') + b.name)) + '</div>'
        + '<div class="edt" style="margin-top:4px;font-size:34px;line-height:40px;font-weight:900;color:#fff"' + ed('phone') + '>' + esc(b.phone) + '</div>'
        + '<div style="margin-top:2px;font-size:16px;line-height:22px;font-weight:600;color:#8fa2bb;white-space:nowrap;overflow:hidden">' + esc([m.tagline, b.email].filter(Boolean).join('  ·  ')) + '</div>'
        + '</div>';
    }
    h += '<div class="pb-seal" style="' + abs(P.W - P.pad - sealS, (F.h - sealS) / 2 - 4, sealS, sealS) + 'border-radius:50%;background:#fff;display:grid;place-items:center;overflow:hidden"></div>';
    h += '</div>';

    h += '</div>';
    return h;
  }

  function domCard(m, P, cd, land) {
    var pad = 20, h = '';
    h += '<div style="' + abs(cd.x, cd.y, cd.w, cd.h) + 'background:#fff;border-radius:10px;overflow:hidden">';
    h += '<div style="' + abs(pad, 16, land ? 52 : 54, land ? 40 : 42) + 'border-radius:7px;background:' + C.navy + ';color:#fff;font-size:' + (land ? 26 : 27) + 'px;line-height:' + (land ? 40 : 42) + 'px;font-weight:900;text-align:center">' + cd.num + '</div>';
    h += '<div style="' + abs(pad + (land ? 66 : 68), 20, cd.w - pad * 2 - 70, 38) + 'font-size:' + (land ? 30 : 31) + 'px;line-height:38px;font-weight:900;color:' + C.navy + '">' + cd.t + '</div>';
    var ruleLeft = pad + (land ? 78 : 80) + measure(cd.t, f(land ? 30 : 31, 900));
    h += '<div style="' + abs(ruleLeft, 36, cd.w - pad - ruleLeft, 2) + 'background:#d7dfea"></div>';

    if (cd.k === 'c1') {
      var pfsD = P.pointSize || (land ? 24 : 25);
      var sfsD = P.specSize || (land ? 20 : 21);
      var lx = pad + 8, labW = 0;
      m.specs.forEach(function (s) { labW = Math.max(labW, measure(s[0], f(sfsD, 800))); });
      var vx = pad + 8 + Math.min(land ? 116 : 122, labW + 16);
      var top0 = 58 + Math.max(0, (cd.h - 58 - m.specs.length * P.rowH - 8) / 2);
      m.specs.forEach(function (sp, i) {
        var ry = top0 + i * P.rowH;
        if (ry + P.rowH > cd.h - 4) return;
        if (i) h += '<div style="' + abs(pad, ry, cd.w - pad * 2, 1) + 'background:#eef2f7"></div>';
        h += '<div style="' + abs(lx, ry + P.rowH - 11 - sfsD, 110, sfsD) + 'font-size:' + sfsD + 'px;line-height:' + sfsD + 'px;font-weight:800;color:' + C.ink3 + ';white-space:nowrap">' + esc(sp[0]) + '</div>';
        h += '<div class="edt" style="' + abs(vx, ry + P.rowH - 10 - (sfsD + 2), cd.w - pad - vx, sfsD + 2) + 'font-size:' + (sfsD + 2) + 'px;line-height:' + (sfsD + 2) + 'px;font-weight:700;color:' + C.ink + ';white-space:nowrap;overflow:hidden"' + ed('spec:' + i) + '>' + esc(sp[1]) + '</div>';
      });
    } else if (cd.k === 'c2') {
      var exH2 = m.extras.length ? 32 : 0;
      var sh02 = P.storyLines.length * P.storyLH + 20;
      var grp2 = m.points.length * P.ptH + exH2 + 14 + sh02;
      var iy = 58 + Math.max(0, (cd.h - 58 - grp2 - 8) / 2);
      m.points.forEach(function (p, i) {
        h += '<div style="' + abs(pad, iy, 24, 24) + 'border-radius:50%;background:' + C.org + ';color:#fff;font-size:14px;line-height:24px;font-weight:900;text-align:center">✓</div>';
        h += '<div class="edt" style="' + abs(pad + 36, iy - 2, cd.w - pad * 2 - 46, pfsD + 2) + 'font-size:' + pfsD + 'px;line-height:' + (pfsD + 2) + 'px;font-weight:700;color:' + C.ink + ';white-space:nowrap;overflow:hidden"' + ed('point:' + i) + '>' + esc(p) + '</div>';
        iy += P.ptH;
      });
      if (m.extras.length) {
        h += '<div style="' + abs(pad, iy + 2, cd.w - pad * 2, 26) + 'background:#eef2f8;border-radius:6px;font-size:' + (land ? 17 : 18) + 'px;line-height:26px;font-weight:800;color:' + C.ink2 + ';padding:0 8px;white-space:nowrap;overflow:hidden">' + esc(m.extras.map(function (e) { return e.t + ' ' + (e.lines[0] || ''); }).join('  ·  ')) + '</div>';
        iy += 32;
      }
      var sy = iy + 10;
      var sLines = P.storyLines;
      var sh = sLines.length * P.storyLH + 20;
      h += '<div style="' + abs(pad, sy, cd.w - pad * 2, sh) + 'background:#f2f6fc;border-radius:8px">';
      h += '<div style="' + abs(0, 5, 3, sh - 10) + 'background:' + C.org + '"></div>';
      sLines.forEach(function (ln, i) {
        h += '<div style="' + abs(16, 24 + i * P.storyLH - P.storySize, cd.w - pad * 2 - 26, P.storySize) + 'font-size:' + P.storySize + 'px;line-height:' + P.storySize + 'px;font-weight:500;color:' + C.ink2 + ';white-space:nowrap">' + esc(ln) + '</div>';
      });
      h += '</div>';
    } else if (cd.k === 'c3') {
      h += '<div style="' + abs(pad + 4, 88 - (land ? 24 : 26), 300, land ? 24 : 26) + 'font-size:' + (land ? 24 : 26) + 'px;line-height:' + (land ? 24 : 26) + 'px;font-weight:800;color:' + C.ink3 + ';white-space:nowrap">' + esc(m.money.label) + '</div>';
      h += '<div style="' + abs(pad + 12 + measure(m.money.label, f(land ? 24 : 26, 800)) + 8, 87 - (land ? 18 : 19), 320, land ? 18 : 19) + 'font-size:' + (land ? 18 : 19) + 'px;line-height:' + (land ? 18 : 19) + 'px;font-weight:700;color:' + C.ink3 + ';white-space:nowrap">' + esc(m.money.note) + '</div>';
      var bigS = land ? 84 : 92, maxW = cd.w - pad * 2 - 8;
      while (measure(m.money.value || '—', f(bigS, 900)) > maxW && bigS > 40) bigS -= 4;
      h += '<div class="edt" style="' + abs(pad + 4, 92, cd.w - pad * 2 - 8, bigS) + 'font-size:' + bigS + 'px;line-height:' + bigS + 'px;font-weight:900;color:' + C.org + ';white-space:nowrap"' + ed('price') + '>' + esc(m.money.value || '—') + '</div>';
      if (m.money.sub) h += '<div style="' + abs(pad + 6, 92 + Math.round(bigS * 1.10) + 6, cd.w - pad * 2, land ? 18 : 19) + 'font-size:' + (land ? 17 : 18) + 'px;line-height:' + (land ? 18 : 19) + 'px;font-weight:700;color:' + C.ink3 + ';white-space:nowrap">' + esc(m.money.sub) + '</div>';
      var by = 92 + Math.round(bigS * 1.10) + 34;
      if (by + (land ? 36 : 40) > cd.h - 8) by = cd.h - (land ? 46 : 52);
      h += '<div style="' + abs(pad, by, land ? 92 : 100, land ? 36 : 40) + 'border-radius:5px;background:' + C.org + ';color:#fff;font-size:' + (land ? 17 : 18) + 'px;line-height:' + (land ? 36 : 40) + 'px;font-weight:900;text-align:center">추천 용도</div>';
      h += '<div class="edt" style="' + abs(pad + (land ? 100 : 108), by, cd.w - pad * 2 - (land ? 100 : 108), land ? 36 : 40) + 'border-radius:5px;background:rgba(255,122,0,.10);font-size:' + (land ? 19 : 20) + 'px;line-height:' + (land ? 36 : 40) + 'px;font-weight:900;color:#7a3b00;padding:0 14px;white-space:nowrap;overflow:hidden"' + ed('use') + '>' + esc(m.use) + '</div>';
    }
    h += '</div>';
    return h;
  }

  /* ============================ 캔버스 만들기 ============================ */
  function loadImg(src, cors) {
    return new Promise(function (res) {
      if (!src) return res(null);
      var im = new Image(), done = false;
      function fin(v) { if (done) return; done = true; res(v); }
      if (cors) im.crossOrigin = 'anonymous';
      im.onload = function () { fin((im.naturalWidth || im.width) ? im : null) };
      im.onerror = function () { fin(null) };
      im.src = src;
      setTimeout(function () { fin(null) }, 9000);
    });
  }

  function sealCanvas(m, size) {
    try {
      if (!g.KTS || !KTS.Seal) return null;
      var cv = document.createElement('canvas');
      KTS.Seal.paint(cv, size, {
        shape: (m.broker && m.broker.stamp) || 'circle',
        name: (m.broker && m.broker.name) || '',
        value: KTS.Seal.payload({ name: m.broker.name, phone: m.broker.phone, org: m.broker.org, qrKind: 'url' })
      });
      return cv;
    } catch (e) { return null; }
  }

  function toCanvas(m, orient, scale, done) {
    var k = scale || 1;
    var photoSrc = m.photos.slice(0, 4);
    var jobs = photoSrc.map(function (s) { return loadImg(s, true) })
      .concat([loadImg(m.map || '', true), loadImg(m.cad || '', true)]);
    Promise.all(jobs).then(function (imgs) {
      var sat = imgs[imgs.length - 2];
      var cad = imgs[imgs.length - 1];
      var ph = imgs.slice(0, -2);
      /* 브이월드 그림은 CORS가 없어 캔버스에 못 들어온다 → 지적도를 데이터로 직접 그려 채운다 */
      var needVec = !cad && m.lat && m.lon;
      var job = needVec ? cadVector(m.lat, m.lon, orient === 'port' ? 620 : 1100, orient === 'port' ? 560 : 620, 17) : Promise.resolve(null);
      job.then(function (vcv) {
        if (vcv) cad = vcv;
        var opt = { noSat: !sat };
        var P0 = plan(m, orient, opt);
        var cv = document.createElement('canvas');
        cv.width = Math.round(P0.W * k);
        cv.height = Math.round(P0.H * k);
        var ctx = cv.getContext('2d');
        ctx.scale(k, k);
        var subs = [];
        for (var i = 1; i < ph.length; i++) if (ph[i]) subs.push({ img: ph[i], idx: i });
        draw(ctx, m, orient, {
          main: ph[0] || null, subs: subs, map: sat, cad: cad,
          seal: sealCanvas(m, orient === 'port' ? 200 : 150)
        }, opt);
        done(cv);
      });
    });
  }

  /* ============================ 손님 링크 코드 ============================ */
  function enc(o) {
    try {
      return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch (e) { return '' }
  }
  function dec(str) {
    try {
      var s = String(str || '').replace(/-/g, '+').replace(/_/g, '/');
      while (s.length % 4) s += '=';
      return JSON.parse(decodeURIComponent(escape(atob(s))));
    } catch (e) { return null }
  }

  g.KTS_BRIEF = {
    build: build, plan: plan, draw: draw, dom: dom, toCanvas: toCanvas,
    specsOf: specsOf, storyOf: storyOf, enc: enc, dec: dec, eok: eok, won: won,
    zoneOf: zoneOf, jigaOf: jigaOf, C: C, FONT: FONT, clip: clip, measure: measure,
    sealCanvas: sealCanvas, loadImg: loadImg, wrap: wrap, cadVector: cadVector, merc: merc
  };
})(window);
