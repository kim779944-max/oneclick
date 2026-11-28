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

  /* ---------- 상가·건물 물건 문자 (302수리C · 2026-11-28) ----------------------
     「대205 건266(5층)융자9억3천 /보)1억2천/월800. =매23억」처럼 기호로 붙여 쓴
     상가·건물 매물에서 대지·건물·층수·융자·보증금·월세·매매가를 라벨 단위로 갈라 낸다.
     라벨이 있는 값만 만든다 — 없는 것을 만들지 않는다. */
  var UNIT_FROM_PY = 3.305785;
  function moneyChunk(s) {
    var m = String(s || '').match(/((?:[\d,]+(?:\.\d+)?\s*(?:억|천만|백만|만|천)\s*)+)/);
    if (!m) { m = String(s || '').match(/^\s*([\d,]{1,9})/); if (!m) return null; }
    return parseMoney(m[1]);
  }
  function areaChunk(num, unit) {
    var v = parseFloat(cleanNum(num));
    if (!isFinite(v) || v <= 0) return null;
    if (unit === '평') return Math.round(v * UNIT_FROM_PY * 10) / 10;
    return Math.round(v * 10) / 10;
  }
  function marked(text) {
    var s = ' ' + String(text || '').replace(/[\u00a0]/g, ' ').replace(/[\r\n]+/g, ' ') + ' ';
    var out = {};
    var m;
    /* 대지 — 「대205」·「대지 205㎡」·「대 205평」 (임대·지대 같은 낱말 속의 대는 뺀다) */
    m = s.match(/(?:^|[\s\/,.()\[\]{}（）【】])(?:대지|대)\s*(?:면적)?\s*[:：]?\s*([\d,]+(?:\.\d+)?)\s*(㎡|m2|m²|제곱미터|평)?/);
    if (m) { var lm = areaChunk(m[1], m[2]); if (lm) { out.landM2 = lm; } }
    /* 건물 — 「건266」·「건물 266㎡」·「건평 80평」 */
    m = s.match(/(?:^|[\s\/,.()\[\]{}（）【】])(?:건물|건평|건축면적|건)\s*[:：]?\s*([\d,]+(?:\.\d+)?)\s*(㎡|m2|m²|제곱미터|평)?/);
    if (m) { var bm = areaChunk(m[1], m[2]); if (bm) out.buildM2 = bm; }
    /* 층수 — 「(5층)」·「지상 5층」 — 20층을 넘는 숫자는 연도·금액으로 본다 */
    m = s.match(/(?:지상|지층)?\s*\(?\s*(\d{1,2})\s*층/);
    if (m) { var fl = parseInt(m[1], 10); if (fl > 0 && fl < 100) out.floor = fl; }
    /* 융자 — 「융자9억3천」·「융자 9억 3천만」 */
    m = s.match(/(?:융자금|융자|근저당|저당|대출)\s*(?:승계|금액|잔액)?\s*[:：]?\s*((?:[\d,]+(?:\.\d+)?\s*(?:억|천만|백만|만|천)\s*)+)/);
    if (m) { var ln = moneyChunk(m[1]); if (ln) out.loan = ln; }
    /* 보증금 — 「/보)1억2천」·「보증금 3,000만」 */
    m = s.match(/(?:보증금|보증|보)\s*[)\]）]?\s*[:：]?\s*((?:[\d,]+(?:\.\d+)?\s*(?:억|천만|백만|만|천)\s*)+)/);
    if (m) { var dp = moneyChunk(m[1]); if (dp) out.deposit = dp; }
    /* 월세 — 「/월800.」= 800만 · 「월세 500만」 */
    m = s.match(/(?:월세|월)\s*[:：]?\s*([\d,]+(?:\.\d+)?)\s*(억|천만|백만|만|천)?/);
    if (m) {
      var mv = parseFloat(cleanNum(m[1])), u2 = m[2];
      if (isFinite(mv) && mv > 0) {
        if (u2 === '억') out.monthly = mv * 1e8;
        else if (u2 === '천만') out.monthly = mv * 1e7;
        else if (u2 === '만') out.monthly = mv * 1e4;
        else if (u2 === '천') out.monthly = mv * 1e3;
        else if (mv < 100000) out.monthly = mv * 1e4;      /* 단위 없이 「월800」 = 800만 */
      }
    }
    /* 매매가 — 「=매23억」·「매매 23억」 (매년·매입 같은 낱말은 뺀다) */
    m = s.match(/(?:^|[\s=\/,])(?:매매가|매매|매가|매)\s*[:：]?\s*((?:[\d,]+(?:\.\d+)?\s*(?:억|천만|백만|만|천)\s*)+)/);
    if (m) { var sl = moneyChunk(m[1]); if (sl) out.sale = sl; }
    return out;
  }

  /* ---------- 주소 ---------- */
  function isSido(tok) {
    for (var i = 0; i < SIDO.length; i++) if (tok === SIDO[i]) return true;
    return false;
  }

  function cleanToken(t) {
    var s = String(t || '');
    /* 266번 — ● ○ ★ ◆ ◇ ※ ◎ ☎ ✓ ✔ ▸ ▹ ♣ ♠ ♥ ♦ 같은 장식 기호는 통째로 지운다.
       (기호가 글자에 붙어 와도 「●가평군」→「가평군」처럼 남는다) */
    try {
      s = s.replace(/[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{20E3}]/gu, '');
    } catch (e) {
      s = s.replace(/[\u2600-\u27BF]/g, '');
    }
    s = s.replace(/[●○◎◯◉★☆✦✧✩✪◆◇◈※☎☏☜☞✓✔✕✖×▸▹▶▷►▻■□▪▫◼◾◻◽♣♠♥♦♤♡♧§¶†‡•‥…「」『』【】〔〕《》〈〉“”‘’"'`^*_=+|\\!?#%&$@]/g, '');
    /* 앞뒤에 남은 괄호·쉼표·마침표만 정리(주소 안의 - 와 번지는 살린다) */
    return s.replace(/^[[(<{（]+/, '').replace(/[\](){}）》,.;:!?]+$/, '').trim();
  }

  /* 266번 — 「삼회리599」·「가평군청평면삼회리599」처럼 붙여 쓴 주소를 낱말로 나눈다 */
  function splitGlued(t, depth) {
    depth = depth || 0;
    if (depth > 4 || !t) return [t];
    var m = t.match(/^([\uAC00-\uD7A3]{1,10}?(?:읍|면|동|리))(\d{1,5}(?:-\d{1,5})?)$/);
    if (m) return [m[1]].concat(splitGlued(m[2], depth + 1));
    var m2 = t.match(/^([\uAC00-\uD7A3]{2,8}?(?:시|군))(.+)$/);
    if (m2 && /(읍|면|동|리|\d)/.test(m2[2])) return [m2[1]].concat(splitGlued(m2[2], depth + 1));
    var m3 = t.match(/^([\uAC00-\uD7A3]{1,8}?(?:읍|면))([\uAC00-\uD7A3].*)$/);
    if (m3) return [m3[1]].concat(splitGlued(m3[2], depth + 1));
    return [t];
  }

  /* U-4 — [카톡]·open.kakao.com·www.… 처럼 적어도 열리게 보정 */
  function normUrl(v) {
    var s = String(v == null ? '' : v).trim();
    if (!s) return '';
    s = s.replace(/^[\[【(（]?\s*(카톡|카카오톡|카카오|kakao)\s*[\]】)）]?\s*[:：]?\s*/i, '').trim();
    if (/^https?:\/\//i.test(s)) return s;
    if (/^(open\.kakao\.com|pf\.kakao\.com|talk\.open\.kakao\.com|kakao\.com|www\.)/i.test(s)) return 'https://' + s;
    if (/^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(s)) return 'https://' + s;
    return s;   /* 아이디만 적은 경우는 그대로 */
  }

  /* 머리말 [발신자] · [한빛부동산] — 통째로 괄호에 싸인 맨 앞 토막은 이름표다.
     소재지 부품으로 쓰면 「발신자명 조종면 신하리」처럼 엉뚱한 곳이 주소가 된다.
     단, 문장 중간의 [가평] 같은 지역 표기는 살려 둔다. */
  function isLabelTok(raw) {
    return /^[\[【〔(（][^\]】〕)）]*[\]】〕)）]$/.test(String(raw || ''));
  }

  function tokenize(text) {
    var out = [];
    String(text).split(/[\s\n\r\t,]+/).forEach(function (raw, i) {
      if (!raw) return;
      var t = cleanToken(raw);
      if (!t) return;
      if (isLabelTok(raw) && (i === 0 || NAME_STOP.test(t))) return;
      splitGlued(t).forEach(function (p) { if (p) out.push(p) });
    });
    return out;
  }

  function addrFromTokens(text) {
    var tokens = tokenize(text);
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
    /* 시도를 빼고 보내는 문자(“가평 북면 목동리 271”) 대비 — 읍면동리 줄기를 찾아 앞의 시군구를 붙인다 */
    var loose = addrLoose(tokens);
    if (loose) return loose;
    /* 띄어쓰기 없이 붙은 주소 대비 */
    var re = /((?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)[가-힣]{1,6}(?:시|군|구)[가-힣0-9]*?(?:\d{1,5}(?:-\d{1,5})?)?)/;
    var m = String(text).match(re);
    return m ? m[1] : '';
  }

  var ADDR_STOP = /^(매매|급매|급처|시급|임야|대지|전답|답|논|밭|농지|상가|주택|빌라|공장|창고|보증금|월세|전세|문의|연락|가격|특가|토지)$/;
  /* 상호·발신자 이름은 소재지 앞머리가 아니다 (부동산·중개사·직함·인사말) */
  var NAME_STOP = /부동산|공인중개|중개|대표|사장|팀장|실장|과장|부장|이사|님$|입니다|드림|문의|연락/;

  function addrLoose(tokens) {
    var bare = '';                    /* 번지 없는 후보 — 번지 붙은 후보가 나오면 그것을 쓴다 */
    for (var i = 0; i < tokens.length; i++) {
      if (!/^[가-힣]{1,7}(읍|면|동|리)$/.test(tokens[i])) continue;
      if (/^[가-힣]{0,3}가$/.test(tokens[i]) && !/\d가$/.test(tokens[i])) continue;
      if (ADDR_STOP.test(tokens[i])) continue;
      var back = [], k = i - 1;
      while (k >= 0 && back.length < 2 && /^[가-힣]{1,7}(시|군|구)$/.test(tokens[k])) { back.unshift(tokens[k]); k--; }
      if (!back.length && k >= 0 && /^[가-힣]{2,6}$/.test(tokens[k])
        && !ADDR_STOP.test(tokens[k]) && !NAME_STOP.test(tokens[k])) {
        back.unshift(tokens[k]);
      }
      if (!back.length) continue;
      var parts = back.slice(), j = i, guard = 0, hasNo = false;
      while (j < tokens.length && guard++ < 4) {
        var t = tokens[j];
        if (/^\d{1,5}(-\d{1,5})?$/.test(t)) { parts.push(t); hasNo = true; break; }
        if (/^[가-힣0-9]{1,7}(읍|면|동|리|\d가)$/.test(t)) { parts.push(t); j++; continue; }
        if (/^[가-힣]{1,8}\d{1,5}(-\d{1,5})?$/.test(t)) { parts.push(t); hasNo = true; break; }
        break;
      }
      if (parts.length >= 2) {
        if (hasNo) return parts.join(' ');
        if (!bare) bare = parts.join(' ');
      }
    }
    return bare;
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
    var mk = marked(text);

    var addrRaw = addrFromTokens(text);
    var addr = normAddr(addrRaw);

    /* 면적·가격에 쓰인 숫자가 서로 섞이지 않게 면적 표현을 먼저 지운다 */
    var noArea = text.replace(/[\d,]+(?:\.\d+)?\s*(?:㎡|m2|m²|제곱미터|평)/gi, ' ');
    var area = parseArea(text);

    /* 면적 — 「대205 건266」처럼 단위 없이 붙여 쓴 상가·건물 문자 */
    if (mk.landM2) { area.m2 = mk.landM2; area.p = Math.round(mk.landM2 / UNIT_FROM_PY); }

    /* 보증금 / 월세 */
    var dep = null, mon = null;
    var dm = noArea.match(/보증금?\s*([\d,]+(?:\.\d+)?)\s*(?:만)?\s*\/?\s*(?:월세?|월)\s*([\d,]+(?:\.\d+)?)/);
    if (dm) {
      dep = parseMoney(dm[1] + '만'); mon = parseMoney(dm[2] + '만');
    }
    if (mk.deposit) dep = mk.deposit;
    if (mk.monthly) mon = mk.monthly;

    /* 매매가 — 가격 문맥이 있는 줄을 우선 본다. 「=매23억」처럼 매매 표시가 있으면 그것이 매가 */
    var deal = (mk.sale || /매매|매가/.test(noArea)) ? '매매'
      : ((mk.deposit || mk.monthly || /월세/.test(noArea)) ? '월세' : (/전세/.test(noArea) ? '전세' : '매매'));
    var price = null;
    if (mk.sale) price = mk.sale;
    if (deal === '매매' && !price) {
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
      landM2: mk.landM2 || null, buildM2: mk.buildM2 || null, floor: mk.floor || null, loan: mk.loan || null,
      tags: tags, phone: phone, title: title, region: region,
      raw: text, missing: missing
    };
  }

  g.KTS_PARSE = { parse: parse, parseMoney: parseMoney, parseArea: parseArea, normAddr: normAddr, normUrl: normUrl, cleanToken: cleanToken };
})(window);
