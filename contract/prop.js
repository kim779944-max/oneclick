/* ==========================================================================
   4대 공부 자동 첨부 (브이월드 + 건축HUB) — contract/ 전용 사본
   (bizcard/gongbu.js 2026-11-26 사본 · 계약서 화면은 다른 폴더를 건드리지 않는다)
   4대 공부 자동 첨부 (브이월드 + 건축HUB)
   · 주소 → 좌표 → 필지(PNU) → 토지대장·토지특성·공시지가·이용계획·건축물대장
   · 사진이 없을 때 쓰는 지적항공도(항공사진 + 지적) 정지영상 주소도 여기서 만든다.
   · 서버 없이 브라우저에서 직접 호출한다. (브이월드는 JSONP, 건축HUB는 CORS 허용)
   ========================================================================== */
(function (g) {
  'use strict';

  var VW = 'https://api.vworld.kr', DATA = VW + '/req/data', NED = VW + '/ned/data',
    API = VW + '/req/address', SRCH = VW + '/req/search', IMG = VW + '/req/image',
    DG = 'https://apis.data.go.kr/1613000/BldRgstHubService';

  var VW_DEF = '0C4AD93D-75D2-447B-B533-C5ADDD4A5B2F';                       /* 대표님 발급 키(autooneclick.com) */
  var DG_DEF = '0d89734b150bc7aa2fea54bfb25c64a1e5119fc2345dab1f047c39b84b810a3c'; /* 건축HUB 일반 인증키 */
  var DOMAIN = 'autooneclick.com';

  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v } catch (e) { return d } },
    set: function (k, v) { try { localStorage.setItem(k, v) } catch (e) { } }
  };
  function key() { var v = LS.get('kts_bc_vk', null); return (v == null || v === '') ? VW_DEF : v }
  function dgk() { var v = LS.get('kts_bc_dg', null); return (v == null || v === '') ? DG_DEF : v }

  function arr(x) { return Array.isArray(x) ? x : (x && typeof x === 'object' ? [x] : []) }

  /* 브이월드는 CORS 헤더를 주지 않는다 → JSONP. 다만 같은 키로 동시에 여러 건을 보내면
     응답이 밀린다(실측: 3건 동시요청 중 2건 타임아웃) → 한 번에 한 건씩 줄을 세운다. */
  var Q = [], BUSY = false;
  function enqueue(fn) {
    return new Promise(function (res, rej) {
      Q.push({ fn: fn, res: res, rej: rej }); drain();
    });
  }
  function drain() {
    if (BUSY || !Q.length) return;
    BUSY = true;
    var job = Q.shift();
    Promise.resolve().then(job.fn).then(function (v) { BUSY = false; job.res(v); drain(); },
      function (e) { BUSY = false; job.rej(e); drain(); });
  }

  function jsonp(url, ms) {
    return new Promise(function (res) {
      var cb = '__ktsbc' + Math.floor(Math.random() * 1e7),
        s = document.createElement('script'), done = false;
      function fin(v) {
        if (done) return; done = true;
        try { delete window[cb] } catch (e) { window[cb] = null }
        if (s.parentNode) s.parentNode.removeChild(s);
        res(v);
      }
      var tm = setTimeout(function () { fin({ __err: 'timeout' }) }, ms || 12000);
      window[cb] = function (d) { clearTimeout(tm); fin(d) };
      s.onerror = function () { clearTimeout(tm); fin({ __err: 'network' }) };
      s.src = url + (url.indexOf('?') < 0 ? '?' : '&') + 'callback=' + cb;
      document.head.appendChild(s);
    });
  }

  /* 한 건씩 — 타임아웃이면 한 번 다시 */
  function http(url, ms, tries) {
    tries = (tries == null) ? 2 : tries;
    return enqueue(function () { return jsonp(url, ms) }).then(function (r) {
      if (r && r.__err && tries > 1) return http(url, ms, tries - 1);
      return r;
    });
  }

  /* ---------- 1) 주소 → 좌표 ---------- */
  function geocodeOne(q, type) {
    var url = API + '?service=address&request=getcoord&version=2.0&crs=EPSG:4326&format=json&type=' + type
      + '&key=' + encodeURIComponent(key()) + '&domain=' + DOMAIN + '&address=' + encodeURIComponent(q);
    return http(url, 9000).then(function (r) {
      if (r && r.response && r.response.status === 'OK' && r.response.result && r.response.result.point) {
        var p = r.response.result.point;
        return {
          lat: +p.y, lon: +p.x,
          text: (r.response.result.refined && r.response.result.refined.text) || q
        };
      }
      return null;
    }).catch(function () { return null });
  }

  function geocode(addr) {
    var q = String(addr || '').trim();
    if (!q) return Promise.resolve(null);
    var bare = q.replace(/\s*\d{1,5}(-\d{1,5})?\s*$/, '').trim();
    var variants = [q];
    if (bare && bare !== q) variants.push(bare);
    var i = 0;
    function step() {
      if (i >= variants.length) return bySearch(q);   /* 304 — 동·리+지번만 있는 주소도 찾는다 */
      var v = variants[i++];
      return geocodeOne(v, 'parcel').then(function (r) { return r || geocodeOne(v, 'road') }).then(function (r) {
        return r || step();
      });
    }
    return step();
  }

  /* ---------- 1-2) 304 — 시·군이 빠진 '동·지번'·'리·지번' 주소 찾기 ----------
     브이월드 주소검색(search)은 '호평동 24-35'·'신하리 162-9' 같은 낱개 주소도 찾아 준다.
     번지가 꼭 맞는 것만 쓴다(다른 필지를 계약서에 넣지 않기 위해). */
  var LAST_NEAR = [];
  function jibunTail(s){ var m = String(s || '').match(/(산?\s*\d+(?:-\d+)?)\s*(?:번지|필지)?\s*$/); return m ? m[1].replace(/\s+/g, '') : ''; }
  function jibunOfItem(it){
    var a = (it && it.address) || {};
    var p = String(a.parcel || it.title || '');
    return jibunTail(p);
  }
  function searchAddr(q){
    var url = SRCH + '?service=search&request=search&version=2.0&crs=EPSG:4326&size=10&page=1'
      + '&type=address&category=parcel&format=json&errorformat=json&key=' + encodeURIComponent(key())
      + '&domain=' + DOMAIN + '&query=' + encodeURIComponent(q);
    return http(url, 9000).then(function (r) {
      if (!r || r.__err || !r.response || r.response.status !== 'OK') return null;
      var it = (r.response.result && r.response.result.items) || [];
      return it.length ? it : null;
    }).catch(function () { return null });
  }
  function bySearch(q) {
    var s0 = String(q || '').replace(/\s+/g, ' ').trim();
    if (!s0) return Promise.resolve(null);
    var want = jibunTail(s0);
    var m = s0.match(/^(.*?)\s*(산?\s*\d+(?:-\d+)?)\s*(?:번지|필지)?$/);
    var body = m ? String(m[1] || '').trim() : s0;
    var num = m ? String(m[2] || '').replace(/\s+/g, '') : '';
    var tries = [s0];
    if (body && num && (body + ' ' + num) !== s0) tries.push(body + ' ' + num);
    if (body && body.indexOf(' ') > 0 && !/(시|군|구|도|동|리|읍|면|가)\s*$/.test(body)){
      var tok = body.split(' ').filter(Boolean);
      if (tok.length > 1 && num) tries.push(tok[tok.length - 1] + ' ' + num);   /* 마지막 '동·리' + 번지 */
    }
    var i = 0;
    function next() {
      if (i >= tries.length) return Promise.resolve(null);
      var t = tries[i++];
      return searchAddr(t).then(function (items) {
        if (!items) return next();
        var cands = items.map(function (x) {
          return { addr: ((x.address && x.address.parcel) || x.title || ''), jibun: jibunOfItem(x),
            lat: x.point ? +x.point.y : null, lon: x.point ? +x.point.x : null };
        });
        var exact = want ? cands.filter(function (x) { return x.jibun === want; }) : [];
        var pick = exact[0] || (cands.length === 1 ? cands[0] : null);
        if (!pick){
          if (cands.length) LAST_NEAR = cands.slice(0, 5).map(function (x) { return x.addr; });
          return next();
        }
        if (!pick.addr || !isFinite(pick.lat) || !isFinite(pick.lon)) return next();
        return { lat: pick.lat, lon: pick.lon, text: pick.addr };
      });
    }
    return next();
  }

  /* ---------- 2) 좌표 → 필지 ---------- */
  function parcelAt(lat, lon) {
    var url = DATA + '?service=data&request=GetFeature&version=2.0&data=LP_PA_CBND_BUBUN'
      + '&key=' + encodeURIComponent(key()) + '&domain=' + DOMAIN
      + '&format=json&size=1&page=1&geometry=true&attribute=true&crs=EPSG:4326'
      + '&geomFilter=' + encodeURIComponent('POINT(' + lon.toFixed(7) + ' ' + lat.toFixed(7) + ')');
    return http(url, 12000).then(function (r) {
      if (!r || r.__err || !r.response || r.response.status !== 'OK') return null;
      var fc = r.response.result && r.response.result.featureCollection;
      var ft = fc && fc.features && fc.features[0];
      if (!ft) return null;
      var pr = ft.properties || {};
      return { pnu: pr.pnu || '', jibun: pr.jibun || '', addr: pr.addr || '', jiga: pr.jiga ? +pr.jiga : null };
    }).catch(function () { return null });
  }

  /* ---------- 3) 토지대장 · 토지특성 · 공시지가 · 이용계획 ---------- */
  function nedToji(pnu) {
    return http(NED + '/ladfrlList?key=' + encodeURIComponent(key()) + '&domain=' + DOMAIN
      + '&format=json&pnu=' + pnu + '&numOfRows=3&pageNo=1')
      .then(function (r) {
        if (!r || r.__err || !r.ladfrlVOList) return null;
        return arr(r.ladfrlVOList.ladfrlVOList)[0] || null;
      }).catch(function () { return null });
  }

  function nedChar(pnu) {
    var y = new Date().getFullYear(), i = 0;
    function step() {
      if (i > 2) return Promise.resolve(null);
      var yr = y - i; i++;
      return http(NED + '/getLandCharacteristics?key=' + encodeURIComponent(key()) + '&domain=' + DOMAIN
        + '&format=json&pnu=' + pnu + '&numOfRows=30&pageNo=1&stdrYear=' + yr)
        .then(function (r) {
          var f = arr(r && r.landCharacteristicss && r.landCharacteristicss.field);
          if (!f.length) return step();
          f.sort(function (a, b) { return String(b.lastUpdtDt || '').localeCompare(String(a.lastUpdtDt || '')) });
          return f[0];
        }).catch(function () { return step() });
    }
    return step();
  }

  function nedPrice(pnu) {
    return http(NED + '/getIndvdLandPriceAttr?key=' + encodeURIComponent(key()) + '&domain=' + DOMAIN
      + '&format=json&pnu=' + pnu + '&numOfRows=40&pageNo=1')
      .then(function (r) {
        var f = arr(r && r.indvdLandPrices && r.indvdLandPrices.field);
        if (!f.length) return null;
        f.sort(function (a, b) {
          var da = String(b.stdrYear || ''), db = String(a.stdrYear || '');
          if (da !== db) return da.localeCompare(db);
          return String(b.pblntfDe || '').localeCompare(String(a.pblntfDe || ''));
        });
        return f[0];
      }).catch(function () { return null });
  }

  function nedUse(pnu) {
    return http(NED + '/getLandUseAttr?key=' + encodeURIComponent(key()) + '&domain=' + DOMAIN
      + '&format=json&pnu=' + pnu + '&numOfRows=200&pageNo=1')
      .then(function (r) {
        var f = arr(r && r.landUses && r.landUses.field);
        var seen = {}, out = [];
        f.forEach(function (x) {
          var k = (x.cnflcAtNm || '') + '|' + (x.prposAreaDstrcCodeNm || '') + '|' + (x.prposAreaDstrcCode || '');
          if (seen[k]) return;
          seen[k] = 1;
          out.push({ cnflc: x.cnflcAtNm || '', nm: x.prposAreaDstrcCodeNm || '', code: x.prposAreaDstrcCode || '' });
        });
        return out;
      }).catch(function () { return [] });
  }

  /* ---------- 4) 건축물대장 ---------- */
  function bldOnce(pnu, k){
    var sg = pnu.slice(0, 5), bd = pnu.slice(5, 10), pg = (pnu.charAt(10) === '2' ? '1' : '0'),
      bun = pnu.slice(11, 15), ji = pnu.slice(15, 19);
    var q = '?serviceKey=' + ((k.indexOf('%') >= 0) ? k : encodeURIComponent(k))
      + '&sigunguCd=' + sg + '&bjdongCd=' + bd + '&platGbCd=' + pg + '&bun=' + bun + '&ji=' + ji;
    var url = DG + '/getBrTitleInfo' + q + '&_type=json&numOfRows=10&pageNo=1';
    return fetch(url, { headers: { Accept: 'application/json' } }).then(function (r) { return r.text() }).then(function (t) {
      var j = null; try { j = JSON.parse(t) } catch (e) { }
      if (!j) return { st: 'BADJSON' };
      if (j.OpenAPI_ServiceResponse) {
        var m = (j.OpenAPI_ServiceResponse.cmmMsgHeader || {}) || {};
        return { st: 'KEYERR', msg: m.returnAuthMsg || m.errMsg || 'API 오류' };
      }
      var code = ((j.response && j.response.header) || {}).resultCode;
      if (code && code !== '00' && code !== '0') return { st: 'ERR', msg: (j.response.header || {}).resultMsg || '' };
      var body = (j.response && j.response.body) || {};
      var it = (body.items && body.items.item) || [];
      if (!Array.isArray(it)) it = it ? [it] : [];
      return { st: it.length ? 'OK' : 'EMPTY', items: it };
    }).catch(function (e) { return { st: 'NET', msg: String(e && e.message || e).slice(0, 80) } });
  }
  /* 275 — 건축HUB는 종종 한 번에 안 온다 → 3번까지 다시 부른다 */
  function bld(pnu) {
    if (!pnu) return Promise.resolve({ st: 'NOPNU' });
    var k = dgk();
    if (!k) return Promise.resolve({ st: 'NOKEY' });
    var n = 0;
    function run() {
      n++;
      return bldOnce(pnu, k).then(function (r) {
        var bad = !r || r.st === 'NET' || r.st === 'BADJSON' || r.st === 'ERR';
        if (bad && n < 3) return new Promise(function (res) { setTimeout(res, 400 * n); }).then(run);
        return r;
      });
    }
    return run();
  }

  /* ---------- 5) 좌표만 빠르게 (목록 썸네일용) ---------- */
  function geo(addr) {
    var t0 = Date.now();
    return geocode(addr).then(function (pt) {
      if (!pt) return { st: 'NOT_FOUND', ms: Date.now() - t0 };
      return parcelAt(pt.lat, pt.lon).then(function (pc) {
        return {
          st: 'OK', ms: Date.now() - t0, lat: pt.lat, lon: pt.lon,
          addr: (pc && pc.addr) || pt.text, pnu: (pc && pc.pnu) || '',
          jibun: (pc && pc.jibun) || '', jiga: (pc && pc.jiga) || null,
          map: mapUrl(pt.lat, pt.lon)
        };
      });
    }).catch(function (e) { return { st: 'ERR', msg: String(e && e.message || e).slice(0, 80) } });
  }

  /* ---------- 6) 지적항공도(사진 없을 때 대표사진) ---------- */
  function mapUrl(lat, lon, w, h, zoom) {
    if (!isFinite(lat) || !isFinite(lon)) return '';
    return IMG + '?service=image&request=getmap&key=' + encodeURIComponent(key())
      + '&domain=' + DOMAIN + '&format=png&basemap=PHOTO_HYBRID'
      + '&center=' + (+lon).toFixed(6) + ',' + (+lat).toFixed(6)
      + '&zoom=' + (zoom || 16) + '&size=' + (w || 800) + ',' + (h || 520) + '&crs=EPSG:4326';
  }

  /* ---------- 전체 묶음 ---------- */
  /* 275 — 주소의 지번과 좌표가 떨어 놓은 필지가 다르면, 확정 주소로 한 번 더 짚는다 */
  function wantJibun(q) {
    var m = String(q || '').match(/(\d{1,5}(?:-\d{1,5})?)\s*(?:\uBC88\uC9C0|\uD544\uC9C0)?\s*$/);
    return m ? m[1] : '';
  }
  function jibunOfPc(pc) { return String((pc && pc.jibun) || '').replace(/[^0-9-]/g, ''); }
  function lookupParcel(q, pt) {
    return parcelAt(pt.lat, pt.lon).then(function (pc) {
      var want = wantJibun(q);
      if (!want || !pc) return { pt: pt, pc: pc };
      var got = jibunOfPc(pc);
      if (got === want || got.indexOf(want) === 0) return { pt: pt, pc: pc };
      var ref = pc.addr || '';
      if (!ref) return { pt: pt, pc: pc };
      return geocodeOne(ref, 'parcel').then(function (p2) {
        if (!p2) return { pt: pt, pc: pc };
        return parcelAt(p2.lat, p2.lon).then(function (pc2) {
          var ok = pc2 && jibunOfPc(pc2) === want;
          return ok ? { pt: p2, pc: pc2 } : { pt: pt, pc: pc };
        });
      }).catch(function () { return { pt: pt, pc: pc } });
    });
  }
  function lookup(addr, cached) {
    var t0 = Date.now();
    var first = (cached && cached.lat && cached.lon) ? Promise.resolve(cached) : geocode(addr);
    return first.then(function (pt) {
      if (!pt) return { st: 'NOT_FOUND', near: LAST_NEAR.slice(0, 5), ms: Date.now() - t0 };
      return lookupParcel(addr, pt).then(function (lp) {
        var pc = lp.pc, ptn = lp.pt || pt;
        var pnu = pc && pc.pnu || '';
        var base = {
          st: 'OK', ms: Date.now() - t0, lat: ptn.lat, lon: ptn.lon,
          addr: (pc && pc.addr) || pt.text, pnu: pnu, jibun: pc && pc.jibun || '',
          jiga: pc && pc.jiga || null,
          map: mapUrl(ptn.lat, ptn.lon)
        };
        if (!pnu) return base;
        return Promise.all([nedChar(pnu), nedPrice(pnu), nedUse(pnu), nedToji(pnu), bld(pnu)]).then(function (r) {
          base.char = r[0]; base.price = r[1]; base.use = r[2]; base.toji = r[3]; base.bld = r[4];
          base.ms = Date.now() - t0;
          return base;
        });
      });
    }).catch(function (e) {
      return { st: 'ERR', msg: String(e && e.message || e).slice(0, 80), ms: Date.now() - t0 };
    });
  }

  g.KTS_GB = { lookup: lookup, geo: geo, mapUrl: mapUrl, geocode: geocode, bld: bld, char: nedChar, use: nedUse,
    /* 304 — 매물 글·낱개 주소 한 줄로 4대 공부까지 (양식만들기·계약서 공통) */
    addrOf: addrOf, combo: comboText, fill: fillAddr };

  /* 매물 문자·카톡에서 주소만 골라낸다 */
  function addrOf(t) {
    var s = String(t || '').replace(/\s+/g, ' ').trim();
    var pats = [
      /((?:[가-힣]{2,}(?:특별시|광역시|시|도))\s+[가-힣]{1,}(?:시|군|구)\s+(?:[가-힣]{1,}(?:읍|면)\s+)?[가-힣0-9]{1,}(?:동|리|가)\s+산?\s*\d+(?:-\d+)?)/,
      /((?:[가-힣]{1,}(?:시|군|구))\s+(?:[가-힣]{1,}(?:읍|면)\s+)?[가-힣0-9]{1,}(?:동|리|가)\s+산?\s*\d+(?:-\d+)?)/,
      /([가-힣]{1,}(?:읍|면)\s+[가-힣0-9]{1,}(?:리)\s+산?\s*\d+(?:-\d+)?)/,
      /([가-힣0-9]{1,}(?:동|리|가)\s+산?\s*\d+(?:-\d+)?)/
    ];
    for (var i = 0; i < pats.length; i++){ var m = s.match(pats[i]); if (m && m[1]) return m[1].trim(); }
    return '';
  }
  function fx(n){ return Math.round(n * 100) / 100; }
  function cm(n){ return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  /* 4대 공부를 계약서 '내 용' 칸에 넣을 한 덩어리 글로 */
  function comboText(d) {
    d = d || {}; var parts = [];
    if (d.addr) parts.push(String(d.addr).trim());
    var landTxt = d.land ? (fx(d.land) + '㎡ (' + fx(d.land / 3.305785) + '평)') : '';
    if (d.jimok && landTxt) parts.push(d.jimok + ' ' + landTxt);
    else if (landTxt) parts.push('토지 ' + landTxt);
    else if (d.jimok) parts.push(String(d.jimok));
    var bd = [];
    if (d.struct) bd.push(String(d.struct));
    if (d.bldg) bd.push('연면적 ' + fx(d.bldg) + '㎡');
    if (bd.length) parts.push('건물 ' + bd.join(' '));
    if (d.use && d.use.length) parts.push(d.use.slice(0, 3).join('/'));
    if (d.jiga) parts.push('공시지가 ' + cm(d.jiga) + '원/㎡' + (d.jigaYr ? ' (' + d.jigaYr + '년)' : ''));
    return parts.filter(Boolean).join(' · ');
  }
  /* 주소(또는 매물 글) → {st, addr, text, data, near} */
  function fillAddr(q) {
    var addr = String(q || '').trim();
    if (addr && !/\d/.test(addr)) addr = addr;               /* 번지 없으면 그대로 시도 */
    return lookup(addr).then(function (r) {
      if (!r || r.st !== 'OK') return r || { st: 'ERR' };
      var toji = r.toji || {}, ch = r.char || {};
      var b = (r.bld && r.bld.st === 'OK' && r.bld.items && r.bld.items[0]) || null;
      var d = {
        addr: r.addr || addr,
        jimok: ch.lndcgrCodeNm || toji.lndcgrCodeNm || '',
        land: toji.lndpclAr ? +toji.lndpclAr : (ch.lndpclAr ? +ch.lndpclAr : 0),
        bldg: b && b.totArea ? +b.totArea : 0,
        struct: b ? [b.strctCdNm, b.mainPurpsCdNm].filter(Boolean).join(' ') : '',
        use: (r.use || []).filter(function (u) { return /포함|접함/.test(u.cnflc || '') }).map(function (u) { return u.nm }).filter(Boolean),
        jiga: (r.price && r.price.pblntfPclnd) ? +r.price.pblntfPclnd : (ch.pblntfPclnd ? +ch.pblntfPclnd : 0),
        jigaYr: (r.price && r.price.stdrYear) ? String(r.price.stdrYear) : (ch.lastUpdtDt ? String(ch.lastUpdtDt).slice(0, 4) : '')
      };
      r.data = d; r.text = comboText(d);
      return r;
    });
  }
})(window);
