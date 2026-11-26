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
    API = VW + '/req/address', IMG = VW + '/req/image',
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
      if (i >= variants.length) return Promise.resolve(null);
      var v = variants[i++];
      return geocodeOne(v, 'parcel').then(function (r) { return r || geocodeOne(v, 'road') }).then(function (r) {
        return r || step();
      });
    }
    return step();
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
  function bld(pnu) {
    if (!pnu) return Promise.resolve({ st: 'NOPNU' });
    var k = dgk();
    if (!k) return Promise.resolve({ st: 'NOKEY' });
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
  function lookup(addr, cached) {
    var t0 = Date.now();
    var first = (cached && cached.lat && cached.lon) ? Promise.resolve(cached) : geocode(addr);
    return first.then(function (pt) {
      if (!pt) return { st: 'NOT_FOUND', ms: Date.now() - t0 };
      return parcelAt(pt.lat, pt.lon).then(function (pc) {
        var pnu = pc && pc.pnu || '';
        var base = {
          st: 'OK', ms: Date.now() - t0, lat: pt.lat, lon: pt.lon,
          addr: (pc && pc.addr) || pt.text, pnu: pnu, jibun: pc && pc.jibun || '',
          jiga: pc && pc.jiga || null,
          map: mapUrl(pt.lat, pt.lon)
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

  g.KTS_GB = { lookup: lookup, geo: geo, mapUrl: mapUrl, geocode: geocode, bld: bld, char: nedChar, use: nedUse };
})(window);
