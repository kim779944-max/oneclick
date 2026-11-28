/* ==========================================================================
   주변 실거래가 자동 채우기 (280 · 2026-11-28 트랙3)
   --------------------------------------------------------------------------
   · 국토교통부 실거래가 공개 OpenAPI(data.go.kr)를 브라우저에서 바로 부른다.
     - 아파트      : RTMSDataSvcAptTradeDev → RTMSDataSvcAptTrade
     - 연립·다세대 : RTMSDataSvcRHTrade2   (2026-11 개편 엔드포인트) → RTMSDataSvcRHTrade
     - 오피스텔    : RTMSDataSvcOffiTrade
     - 단독·다가구 : RTMSDataSvcSHTrade
     - 상업·업무용 : RTMSDataSvcNrgTrade
     - 토지        : RTMSDataSvcLandTrade
   · 승인된 공공데이터 일반인증키를 기본값으로 넣어 두었다(대표님 키, 2026-11-25 승인).
     기기에서 다른 키를 넣으면 그 키를 먼저 쓴다(localStorage).
   · 해당 지번을 먼저 찾고, 없으면 같은 읍·면·동의 최근 5건을 채운다.
   · 받지 못하면 '못 받았다'고 그대로 알린다 — 없는 거래를 만들어 넣지 않는다.
   ========================================================================== */
(function (g) {
  'use strict';

  var BASE = 'https://apis.data.go.kr/1613000/';
  var KEYNAME = 'kts_bc_txkey';
  var KEYDEF = '0d89734b150bc7aa2fea54bfb25c64a1e5119fc2345dab1f047c39b84b810a3c'; /* 233번 일반 인증키 */

  function key() {
    try { return localStorage.getItem(KEYNAME) || KEYDEF; } catch (e) { return KEYDEF; }
  }
  function setKey(k) { try { localStorage.setItem(KEYNAME, String(k || '').trim()) } catch (e) { } }

  /* 종목별 서비스 — 앞의 것부터 시도, '등록되지 않은 서비스'면 다음 것으로 */
  function svcList(kind) {
    if (kind === '아파트') return ['RTMSDataSvcAptTradeDev', 'RTMSDataSvcAptTrade'];
    if (kind === '빌라' || kind === '연립' || kind === '다세대' || kind === '연립다세대') return ['RTMSDataSvcRHTrade2', 'RTMSDataSvcRHTrade'];
    if (kind === '오피스텔') return ['RTMSDataSvcOffiTrade', 'RTMSDataSvcNrgTrade'];
    if (kind === '상가' || kind === '공장' || kind === '창고') return ['RTMSDataSvcNrgTrade'];
    if (kind === '주택' || kind === '단독' || kind === '다가구') return ['RTMSDataSvcSHTrade'];
    return ['RTMSDataSvcLandTrade'];
  }
  function svc(kind) { return svcList(kind)[0]; }

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
    return {
      ym: (r.dealYear || '') + '.' + (('' + (r.dealMonth || '')).padStart(2, '0')),
      jibun: (r.umdNm || '') + (r.jibun ? ' ' + r.jibun + ((r.ji && String(r.ji) !== '0') ? '-' + r.ji : '') : ''),
      area: r.dealArea ? (+r.dealArea).toFixed(0) + '㎡' : (r.excluUseAr ? (+r.excluUseAr).toFixed(1) + '㎡' : (r.totalFloorAr ? (+r.totalFloorAr).toFixed(0) + '㎡' : '')),
      amount: money(r.dealAmount),
      name: r.aptNm || r.buildingUse || r.landUse || r.houseType || r.offiNm || '',
      floor: r.floor || '',
      room: r.umdNm || ''
    };
  }

  /* pnu: 19자리 · addr: 전체 주소(읍면동 뽑기) · kind: 종목 */
  function nearby(opt, cb) {
    var k = key();
    if (!k) return cb({ ok: false, why: 'nokey' });
    var pnu = String(opt.pnu || '');
    var lawd = pnu.slice(0, 5);
    if (!/^\d{5}$/.test(lawd)) return cb({ ok: false, why: 'nopnu' });
    var kind = opt.kind || '토지';
    var services = svcList(kind);
    /* 읍·면 아래 리까지 — 「조종면 신하리」면 실거래 자료의 umdNm 은 「신하리」다.
       주소에서 읍/면/동/리 이름을 모두 뽑아 어느 하나라도 맞으면 받는다. */
    var umds = (function () {
      var p = String(opt.addr || '').split(/\s+/).filter(Boolean), out = [];
      for (var i = p.length - 1; i >= 0 && out.length < 3; i--) {
        if (/(읍|면|동|리|가)$/.test(p[i]) && !/^\d/.test(p[i])) out.push(p[i]);
      }
      return out;
    })();
    function umdHit(name) {
      if (!umds.length) return true;
      var nm = String(name || '');
      for (var i = 0; i < umds.length; i++) {
        var key2 = umds[i].replace(/(읍|면|동|리|가)$/, '');
        if (key2 && nm.indexOf(key2) === 0) return true;
      }
      return false;
    }
    var bunji = String(opt.jibun || '').trim();
    var list = [], seen = {};
    var ymList = months(8);

    function attempt(si) {
      if (si >= services.length) return cb({ ok: false, why: 'none', umd: umds[0] || '', key: k, svc: services[0] });
      var s = services[si], i = 0;
      function step() {
        if (i >= ymList.length) return done(si);
        var ym = ymList[i++];
        var url = BASE + s + '/get' + s + '?serviceKey=' + encodeURIComponent(k)
          + '&LAWD_CD=' + lawd + '&DEAL_YMD=' + ym + '&numOfRows=200&pageNo=1&_type=json';
        call(url).then(function (items) {
          items.forEach(function (r) {
            var n = norm(kind, r);
            if (!n.amount) return;
            if (!umdHit(r.umdNm)) return;
            var id = n.ym + '|' + n.jibun + '|' + n.amount + '|' + n.area;
            if (seen[id]) return;
            seen[id] = 1;
            var same = bunji && dnum(String(r.jibun || '')).indexOf(dnum(bunji.split('-')[0])) === 0;
            list.push({ ym: n.ym, jibun: n.jibun, area: n.area, amount: n.amount, name: n.name, floor: n.floor, same: !!same, src: s });
          });
          if (list.filter(function (x) { return x.same }).length >= 1 && list.length >= 6) return done(si);
          if (list.length >= 12) return done(si);
          step();
        }).catch(function (e) {
          var code = e && e.code;
          /* 이 서비스가 이 키에 열려 있지 않으면 다음 서비스로 (연립다세대 RHTrade2 개편 대응) */
          if (code === '30' || code === '31' || /등록되지 않은|SERVICE_KEY/.test(e.message || '')) return attempt(si + 1);
          if (code === '04') return cb({ ok: false, why: 'http', msg: '실거래가 서버가 응답하지 않습니다(HTTP_ERROR) — 잠시 뒤 다시' });
          if (code === '22' || /LIMIT|일일/.test(e.message || '')) return cb({ ok: false, why: 'limit', msg: '오늘 조회 한도를 넘었습니다' });
          step();
        });
      }
      function done(siDone) {
        if (!list.length && siDone + 1 < services.length) return attempt(siDone + 1);
        list.sort(function (a, b) {
          if (a.same !== b.same) return a.same ? -1 : 1;
          return String(b.ym).localeCompare(String(a.ym));
        });
        cb({ ok: list.length > 0, items: list.slice(0, 5), key: k, svc: services[siDone], umd: umds.join('·') });
      }
      step();
    }
    attempt(0);
  }

  g.KTS_TX = { key: key, setKey: setKey, nearby: nearby, svc: svc, svcList: svcList, KEYDEF: KEYDEF };
})(window);
