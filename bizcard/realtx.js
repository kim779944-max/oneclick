/* ==========================================================================
   주변 실거래가 자동 채우기 (280번)
   --------------------------------------------------------------------------
   · 국토교통부 실거래가 공개 OpenAPI(data.go.kr)를 브라우저에서 바로 부른다.
     - 토지: RTMSDataSvcLandTrade · 아파트: RTMSDataSvcAptTrade
     - 단독·다가구: RTMSDataSvcSHTrade · 연립·다세대: RTMSDataSvcRHTrade
     - 상업·업무용: RTMSDataSvcNrgTrade
   · 해당 지번을 먼저 찾고, 없으면 같은 읍·면·동의 최근 5건을 채운다.
   · 인증키는 이 기기에만 저장한다(localStorage). 키가 없거나 서비스가 열려 있지
     않으면 '못 받았다'고 그대로 알린다 — 없는 거래를 만들어 넣지 않는다.
   ========================================================================== */
(function (g) {
  'use strict';

  var BASE = 'https://apis.data.go.kr/1613000/';
  var KEYNAME = 'kts_bc_txkey';

  function key() { try { return localStorage.getItem(KEYNAME) || '' } catch (e) { return '' } }
  function setKey(k) { try { localStorage.setItem(KEYNAME, String(k || '').trim()) } catch (e) { } }

  function svc(kind) {
    if (kind === '아파트') return 'RTMSDataSvcAptTrade';
    if (kind === '빌라' || kind === '오피스텔') return 'RTMSDataSvcRHTrade';
    if (kind === '상가' || kind === '공장' || kind === '창고') return 'RTMSDataSvcNrgTrade';
    if (kind === '주택') return 'RTMSDataSvcSHTrade';
    return 'RTMSDataSvcLandTrade';
  }

  function months(n) {
    var out = [], d = new Date();
    for (var i = 0; i < n; i++) {
      var y = d.getFullYear(), m = d.getMonth() + 1 - i;
      while (m <= 0) { m += 12; y -= 1; }
      out.push('' + y + (m < 10 ? '0' : '') + m);
    }
    return out;
  }

  function call(url, tries) {
    tries = tries || 3;
    return fetch(url, { cache: 'no-store' }).then(function (r) { return r.text() }).then(function (t) {
      var j = null;
      try { j = JSON.parse(t) } catch (e) { }
      if (!j) throw new Error('응답 형식 오류');
      if (j.OpenAPI_ServiceResponse) {
        var h = j.OpenAPI_ServiceResponse.cmmMsgHeader || {};
        var e = new Error(h.returnAuthMsg || h.errMsg || 'API 오류');
        e.code = h.returnReasonCode; throw e;
      }
      var body = (j.response && j.response.body) || {};
      var it = (body.items && body.items.item) || [];
      if (!Array.isArray(it)) it = it ? [it] : [];
      return it;
    }).catch(function (e) {
      if (tries > 1) return new Promise(function (res) { setTimeout(res, 260) }).then(function () { return call(url, tries - 1) });
      throw e;
    });
  }

  function money(s) {
    var v = String(s == null ? '' : s).replace(/[^\d]/g, '');
    return v ? parseInt(v, 10) * 10000 : null;
  }
  function dnum(s) { return String(s == null ? '' : s).replace(/[^\d]/g, '') }

  function norm(kind, r) {
    var meta = {
      ym: (r.dealYear || '') + '.' + (('' + (r.dealMonth || '')).padStart(2, '0')),
      jibun: (r.umdNm || '') + (r.jibun ? ' ' + r.jibun + ((r.ji && String(r.ji) !== '0') ? '-' + r.ji : '') : ''),
      area: r.dealArea ? (+r.dealArea).toFixed(0) + '㎡' : (r.excluUseAr ? (+r.excluUseAr).toFixed(1) + '㎡' : ''),
      amount: money(r.dealAmount),
      name: r.aptNm || r.buildingUse || r.landUse || r.houseType || '',
      floor: r.floor || '',
      room: r.umdNm || ''
    };
    return meta;
  }

  /* pnu: 19자리 · addr: 전체 주소(읍면동 뽑기) */
  function nearby(opt, cb) {
    var k = key();
    if (!k) return cb({ ok: false, why: 'nokey' });
    var pnu = String(opt.pnu || '');
    var lawd = pnu.slice(0, 5);
    if (!/^\d{5}$/.test(lawd)) return cb({ ok: false, why: 'nopnu' });
    var kind = opt.kind || '토지';
    var s = svc(kind);
    var umd = (function () {
      var p = String(opt.addr || '').split(/\s+/).filter(Boolean);
      for (var i = p.length - 1; i >= 0; i--) if (/(읍|면)$/.test(p[i])) return p[i];
      for (var j = p.length - 1; j >= 0; j--) if (/(동|리|가)$/.test(p[j]) && !/^\d/.test(p[j])) return p[j];
      return '';
    })();
    var bunji = String(opt.jibun || '').trim();
    var list = [], seen = {}, i = 0;
    var ymList = months(8);

    function step() {
      if (i >= ymList.length) return done();
      var ym = ymList[i++];
      var url = BASE + s + '/get' + s + '?serviceKey=' + encodeURIComponent(k)
        + '&LAWD_CD=' + lawd + '&DEAL_YMD=' + ym + '&numOfRows=200&pageNo=1&_type=json';
      call(url).then(function (items) {
        items.forEach(function (r) {
          var n = norm(kind, r);
          if (!n.amount) return;
          if (umd && String(r.umdNm || '').indexOf(umd.replace(/(읍|면|동|리)$/, '')) < 0) return;
          var id = n.ym + '|' + n.jibun + '|' + n.amount + '|' + n.area;
          if (seen[id]) return;
          seen[id] = 1;
          var same = bunji && dnum(String(r.jibun || '')).indexOf(dnum(bunji.split('-')[0])) === 0;
          list.push({ ym: n.ym, jibun: n.jibun, area: n.area, amount: n.amount, name: n.name, floor: n.floor, same: !!same, src: s });
        });
        if (count(list.filter(function (x) { return x.same })) >= 1 && list.length >= 6) return done();
        if (list.length >= 12) return done();
        step();
      }).catch(function (e) {
        if (e.code === '30' || /등록되지 않은|SERVICE_KEY/.test(e.message || '')) return cb({ ok: false, why: 'badkey', msg: e.message });
        step();
      });
    }
    function count(arr) { return arr.length }
    function done() {
      list.sort(function (a, b) {
        if (a.same !== b.same) return a.same ? -1 : 1;
        return String(b.ym).localeCompare(String(a.ym));
      });
      cb({ ok: list.length > 0, items: list.slice(0, 5), key: k, svc: s, umd: umd });
    }
    step();
  }

  g.KTS_TX = { key: key, setKey: setKey, nearby: nearby, svc: svc };
})(window);
