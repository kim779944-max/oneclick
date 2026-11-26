/* ==========================================================================
   문자 → 물건표 파서 (5초 매물장)
   · 붙여넣은 매물 문자에서 종류·소재지·면적·가격·특징·연락처를 뽑는다.
   · 서버 없이 브라우저에서만 동작한다. 못 뽑은 칸은 비워 두고 사람이 고친다.
   ========================================================================== */
(function (g) {
  'use strict';

  var SIDO = ['서울특별시', '서울시', '서울', '부산광역시', '부산시', '부산', '대구광역시', '대구시', '대구',
    '인천광역시', '인천시', '인천', '광주광역시', '광주시', '광주', '대전광역시', '대전시', '대전',
    '울산광역시', '울산시', '울산', '세종특별자치시', '세종시', '세종', '경기도', '경기', '강원특별자치도',
    '강원도', '강원', '충청북도', '충북', '충청남도', '충남', '전북특별자치도', '전라북도', '전북',
    '전라남도', '전남', '경상북도', '경북', '경상남도', '경남', '제주특별자치도', '제주도', '제주'];

  var SIDO_FULL = {
    '서울': '서울특별시', '서울시': '서울특별시', '부산': '부산광역시', '부산시': '부산광역시',
    '대구': '대구광역시', '대구시': '대구광역시', '인천': '인천광역시', '인천시': '인천광역시',
    '광주': '광주광역시', '광주시': '광주광역시', '대전': '대전광역시', '대전시': '대전광역시',
    '울산': '울산광역시', '울산시': '울산광역시', '세종': '세종특별자치시', '세종시': '세종특별자치시',
    '경기': '경기도', '강원': '강원특별자치도', '강원도': '강원특별자치도', '충북': '충청북도',
    '충남': '충청남도', '전북': '전북특별자치도', '전라북도': '전북특별자치도', '전남': '전라남도',
    '경북': '경상북도', '경남': '경상남도', '제주': '제주특별자치도', '제주도': '제주특별자치도'
  };

  /* 지목·종류 — 위에서부터 먼저 맞는 것 하나 */
  var KINDS = [
    [/임야|산지|산림|林地/, '임야'],
    [/전원주택지|전원주택부지/, '대지'],
    [/과수원/, '과수원'],
    [/답\s*[0-9]|전답|논\b|답지/, '답'],
    [/농지|농림지/, '농지'],
    [/대지|택지|주택지|집터/, '대지'],
    [/공장용지|공장부지|공장/, '공장'],
    [/창고|물류창고/, '창고'],
    [/상가|근린상가|근생|상업용/, '상가'],
    [/오피스텔/, '오피스텔'],
    [/아파트/, '아파트'],
    [/빌라|다세대|연립/, '빌라'],
    [/단독주택|주택/, '주택'],
    [/야적장|적치장/, '야적장'],
    [/토지|땅/, '토지']
  ];

  /* 특징 사전 — 문자에 나온 것만 표시한다(없는 것을 만들지 않는다) */
  var TAGS = [
    ['도로접', /도로\s*접|도로접|접도|도로변|대로변|국도|지방도|접면/],
    ['맹지', /맹지|도로\s*없|진입\s*불가/],
    ['전원주택지', /전원주택/],
    ['계획관리', /계획관리/],
    ['보전관리', /보전관리/],
    ['생산관리', /생산관리/],
    ['자연녹지', /자연녹지/],
    ['농림지역', /농림지역/],
    ['형질변경', /형질\s*변경/],
    ['개발행위', /개발행위|개발허가/],
    ['분할', /분할/],
    ['합필', /합필|합병/],
    ['태양광', /태양광|발전소/],
    ['급매', /급매|급처|시급|특가/],
    ['실입주', /실입주|입주/],
    ['리모델링', /리모델링|리모델/],
    ['역세권', /역세권|역\s*근처/],
    ['평지', /평지|완경사|평탄/],
    ['경사지', /경사|급경사|산비탈/],
    ['계곡', /계곡|냇가|하천/],
    ['직접거래', /직접거래|주인직접|소유자/]
  ];

  /* ---------- 숫자 뽑기 ---------- */
  function cleanNum(s) {
    return String(s == null ? '' : s).replace(/(\d),(?=\d{3})/g, '$1').replace(/[^\d.]/g, '');
  }

  function parseMoney(s) {
    s = String(s || '').replace(/(\d),(?=\d{3})/g, '$1').replace(/\s+/g, ' ');
    var total = 0, hit = false, lastUnit = 0, lastIdx = 0;
    var re = /(\d+(?:\.\d+)?)\s*(억|천만|백만|만|천)/g, m;
    while ((m = re.exec(s))) {
      var v = parseFloat(m[1]), u = m[2];
      if (u === '억') { total += v * 1e8; lastUnit = 1e8; }
      else if (u === '천만') { total += v * 1e7; lastUnit = 1e7; }
      else if (u === '백만') { total += v * 1e6; lastUnit = 1e6; }
      else if (u === '만') { total += v * 1e4; lastUnit = 1e4; }
      else if (u === '천') {
        var unit = lastUnit >= 1e8 ? 1e7 : 1e3;   /* '3억8천' = 3억 8천만 */
        total += v * unit; lastUnit = unit;
      }
      hit = true; lastIdx = re.lastIndex;
    }
    if (!hit) {
      var bare = s.match(/(\d{7,})\s*원?/);
      return bare ? parseInt(bare[1], 10) : null;
    }
    /* '3억5' 처럼 억 뒤 숫자만 붙은 경우 → 5천만 */
    var tail = s.slice(lastIdx).match(/^\s*(\d{1,2})(?=\s|$|원|,)/);
    if (tail && lastUnit === 1e8) total += parseInt(tail[1], 10) * 1e7;
    return total || null;
  }

  function parseArea(text) {
    var out = { m2: null, p: null };
    var a1 = text.match(/([\d,]+(?:\.\d+)?)\s*(?:㎡|m2|m²|제곱미터)/i);
    var a2 = text.match(/([\d,]+(?:\.\d+)?)\s*평/);
    if (a1) { var v = parseFloat(cleanNum(a1[1])); if (isFinite(v) && v > 0) out.m2 = Math.round(v * 10) / 10; }
    if (a2) { var q = parseFloat(cleanNum(a2[1])); if (isFinite(q) && q > 0) out.p = Math.round(q); }
    if (out.m2 == null && out.p != null) out.m2 = Math.round(out.p * 3.305785 * 10) / 10;
    if (out.p == null && out.m2 != null) out.p = Math.round(out.m2 / 3.305785);
    return out;
  }

  /* ---------- 주소 ---------- */
  function isSido(tok) {
    for (var i = 0; i < SIDO.length; i++) if (tok === SIDO[i]) return true;
    return false;
  }

  function cleanToken(t) {
    return String(t || '').replace(/^[[(<{（「『"'·•▲▶■□\-–—*]+/, '').replace(/[\[\](){}（）「」『"'·•▲▶■□~,.;:!?]+$/, '');
  }

  function addrFromTokens(text) {
    var tokens = String(text).split(/[\s\n\r\t,]+/).map(cleanToken).filter(Boolean);
    for (var i = 0; i < tokens.length; i++) {
      if (!isSido(tokens[i])) continue;
      var parts = [SIDO_FULL[tokens[i]] || tokens[i]];
      var j = i + 1, guard = 0;
      var seen = 0;                                  /* 읍면/동리 단계 수 */
      while (j < tokens.length && guard++ < 6) {
        var t = tokens[j];
        if (/^\d{1,5}(-\d{1,5})?$/.test(t)) { parts.push(t); break; }      /* 번지 */
        if (/^[가-힣]{1,7}(시|군)$/.test(t) && seen === 0) { parts.push(t); j++; seen = 1; continue; }
        if (/^[가-힣]{1,7}구$/.test(t) && seen <= 1) { parts.push(t); j++; seen = 2; continue; }
        if (/^[가-힣]{1,7}(읍|면)$/.test(t) && seen <= 2) { parts.push(t); j++; seen = 3; continue; }
        if (/^[가-힣]{1,7}(동|리|가)$/.test(t) && seen <= 3) { parts.push(t); j++; seen = 4; continue; }
        if (/^[가-힣]{1,7}(동|리|가)?\d{1,5}(-\d{1,5})?$/.test(t) && seen >= 3) { parts.push(t); break; }
        if (seen >= 2 && /^[가-힣]{1,8}\d{1,5}(-\d{1,5})?$/.test(t)) { parts.push(t); break; }
        break;
      }
      if (parts.length >= 2) return parts.join(' ');
    }
    /* 띄어쓰기 없이 붙은 주소 대비 */
    var re = /((?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)[가-힣]{1,6}(?:시|군|구)[가-힣0-9]*?(?:\d{1,5}(?:-\d{1,5})?)?)/;
    var m = String(text).match(re);
    return m ? m[1] : '';
  }

  function normAddr(a) {
    if (!a) return '';
    var first = a.split(' ')[0];
    if (SIDO_FULL[first]) a = a.replace(first, SIDO_FULL[first]);
    return a.replace(/\s+/g, ' ').trim();
  }

  /* ---------- 종류·특징·연락처 ---------- */
  function kindOf(text) {
    for (var i = 0; i < KINDS.length; i++) if (KINDS[i][1] && KINDS[i][0].test(text)) return KINDS[i][1];
    return '';
  }

  function tagsOf(text) {
    var out = [];
    for (var i = 0; i < TAGS.length; i++) if (TAGS[i][1].test(text) && out.indexOf(TAGS[i][0]) < 0) out.push(TAGS[i][0]);
    return out;
  }

  function phoneOf(text) {
    var m = String(text).match(/(0\d{1,2})[-\s.]?(\d{3,4})[-\s.]?(\d{4})/);
    if (!m) return '';
    return m[1] + '-' + m[2] + '-' + m[3];
  }

  /* ---------- 전체 ---------- */
  function parse(raw) {
    var text = String(raw || '');
    var lines = text.split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean);

    var addrRaw = addrFromTokens(text);
    var addr = normAddr(addrRaw);

    /* 면적·가격에 쓰인 숫자가 서로 섞이지 않게 면적 표현을 먼저 지운다 */
    var noArea = text.replace(/[\d,]+(?:\.\d+)?\s*(?:㎡|m2|m²|제곱미터|평)/gi, ' ');
    var area = parseArea(text);

    /* 보증금 / 월세 */
    var dep = null, mon = null;
    var dm = noArea.match(/보증금?\s*([\d,]+(?:\.\d+)?)\s*(?:만)?\s*\/?\s*(?:월세?|월)\s*([\d,]+(?:\.\d+)?)/);
    if (dm) {
      dep = parseMoney(dm[1] + '만'); mon = parseMoney(dm[2] + '만');
    }

    /* 매매가 — 가격 문맥이 있는 줄을 우선 본다 */
    var deal = /월세/.test(noArea) ? '월세' : (/전세/.test(noArea) ? '전세' : '매매');
    var price = null;
    if (deal === '매매') {
      var cand = lines.filter(function (l) { return /매매|매가|급매|분양|가격|매도/.test(l); });
      if (!cand.length) cand = lines.filter(function (l) { return /억|만원|천만/.test(l) && !/㎡|평/.test(l); });
      if (!cand.length) cand = [noArea];
      for (var i = 0; i < cand.length && !price; i++) price = parseMoney(cand[i].replace(/[\d,]+(?:\.\d+)?\s*(?:㎡|m2|m²|평)/gi, ' '));
      if (!price) price = parseMoney(noArea);
    }
    if (deal !== '매매' && dep != null) price = dep;

    var kind = kindOf(text);
    var tags = tagsOf(text);
    var phone = phoneOf(text);

    /* 지역 이름 — 제목에 쓸 짧은 표기 */
    var region = '';
    if (addr) {
      var parts = addr.split(' ');
      for (var k = parts.length - 1; k >= 0; k--) {
        if (/(읍|면|동|리)$/.test(parts[k])) { region = parts[k]; break; }
      }
      if (!region && parts.length > 1) region = parts[1];
    }

    var titleBits = [];
    if (kind) titleBits.push(kind);
    if (area.p) titleBits.push(area.p.toLocaleString('ko-KR') + '평');
    var title = titleBits.join(' ');
    if (region) title = (title ? title + ' · ' : '') + region;
    if (!title) title = lines[0] ? lines[0].slice(0, 26) : '새 매물';

    var missing = [];
    if (!addr) missing.push('소재지');
    if (!area.m2) missing.push('면적');
    if (!price) missing.push('가격');

    return {
      kind: kind, addr: addr, addrRaw: addrRaw, areaM2: area.m2, areaP: area.p,
      price: price, dealType: deal, deposit: dep, monthly: mon,
      tags: tags, phone: phone, title: title, region: region,
      raw: text, missing: missing
    };
  }

  g.KTS_PARSE = { parse: parse, parseMoney: parseMoney, parseArea: parseArea, normAddr: normAddr };
})(window);
