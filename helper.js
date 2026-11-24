/* =====================================================================
   KTS_HELPER — 전 상품 [? 도우미] (사용법 1→2→3 · 자주 묻는 질문 · 불편 신고 · 60초 문의)
   v20261125a
   · 작성 모드(양식만들기 · 표준계약서 등): 도우미가 지금 넣을 칸을 가리키고(👆),
     그 칸을 누르면 마이크(🎤)로 바뀌어 음성으로 넣고, 다음 칸을 다시 가리킨다.
     작성이 끝나면(또는 작성 모드가 아니면) [?]를 누를 때 바로 [60초 문의]가 열린다.
     페이지는 KTS_HELPER.writing(fn) 한 줄로 붙인다 — fn 은 {active, mode, label, pos, el, tap} 를 돌려준다.
   · 인터넷 요청 0건: 이 파일은 서버·외부 주소로 아무것도 보내거나 받지 않습니다.
     답은 전부 이 파일 안의 사전 + 이 기기 안 규칙으로만 만듭니다(API 비용 0원).
   · 본문 글자는 바꾸지 않습니다 — 버튼 1개 + 시트 1개를 덧붙이기만 합니다.
   · z-index: 버튼 240 / 시트 250 / 자체 토스트 260 (slots 200·210·300·310, ux 400·410 과 겹치지 않음)
   ===================================================================== */
(function (w, d) {
  'use strict';
  if (w.KTS_HELPER) return;
  var path = (location.pathname || '/');
  if (/\/ops(\/|$)/.test(path)) return;                  /* 대표님 상황판에는 넣지 않는다 */

  var TEL = '01020022899', TEL_SHOW = '010-2002-2899';
  var REPORT_KEY = 'kts_helper_report_v1';

  /* ---------- 도구 이름 사전 (경로 → 이름 · slots.js 키) ---------- */
  var TOOLS = {
    index: { nm: '쇼룸' },
    detail: { nm: '도구 소개' },
    redev: { nm: '재개발 진행조회기' },
    sign: { nm: '더싸인', k: 'sign' },
    gagebu: { nm: '가계부' },
    slope: { nm: '지번·경사도 지도', free: '하루 3건 무료' },
    hogang: { nm: '호갱탈출' },
    thescan: { nm: '더스캔', k: 'thescan' },
    theeraser: { nm: '더지우개', k: 'theeraser' },
    thedetail: { nm: '설명서 제작기', k: 'thedetail' },
    theform: { nm: '양식만들기 (양식 채우기 · 표 변환 탭)', k: 'theform' },
    contract: { nm: '표준계약서', k: 'contract' },
    sale: { nm: '오늘의 특가', k: 'sale' },
    viewer: { nm: '만능 뷰어', k: 'viewer' },
    ad_magnet: { nm: '답글생성기', k: 'ad_magnet' },
    seller: { nm: '원클릭 셀러', k: 'seller' },
    exchange: { nm: '교환·급매 전문관' },
    realty: { nm: '매물수집기', k: 'realty' },
    golf: { nm: '골프' },
    petmind: { nm: '반려동물' },
    navi2: { nm: '독심술' },
    organizer: { nm: '폰정리', k: 'organizer' },
    ytsummary: { nm: '유튜브 요약' },
    ecommerce: { nm: '이커머스 도구' },
    bungee: { nm: '번개알바 도구' },
    saycap: { nm: '세이캡' },
    thetongyeok: { nm: '더통역' },
    loan: { nm: '사업자 대출 · 기업 대출', k: 'loan' },
    tax: { nm: '사업자 대출 · 창업·세무', k: 'tax' },
    longtail: { nm: '롱테일 키워드' },
    interior: { nm: '인테리어 견적기' }
  };

  /* ---------- 1→2→3 단계 사전 (있으면 사전이 이긴다) ---------- */
  /* sel: [여기로] 를 눌렀을 때 갈 곳(앞에서부터 화면에 보이는 첫 요소) */
  var STEPS = {
    index: [
      { t: '카테고리 칩 → 01~04 쓰는 순서대로 고르기', d: '부동산·중개(01) · 사업자·매장(02) · 서류·계약(03) · 생활·기록(04) — 칩을 누르면 그 묶음만 보입니다. 준비 중은 보기만 됩니다.', sel: ['#catChips', '#sections'] },
      { t: '위에서부터 4개를 박스에 담기', d: '내 박스에 담은 도구는 매일 바로 열립니다. 열쇠로 칸을 더 엽니다.', sel: ['#boxStripWrap'] },
      { t: '없는 도구는 [해주세요]', d: '필요한 도구를 적어 주시면 10표가 모일 때 만듭니다.', sel: ['#askOpen'] }
    ],
    redev: [
      { t: '지번·구역명 넣기', d: '「동 이름 + 번지」(예: 개포동 138)나 구역명을 넣으면 서울·경기·전국·모아타운을 한꺼번에 찾습니다.', sel: ['#q'] },
      { t: '결과에서 고르기', d: '카드마다 자료 배지(서울·경기·전국·모아타운)가 붙습니다. 지역 탭·모아타운 버튼으로 한 자료만 볼 수도 있습니다.', sel: ['#list'] },
      { t: '[확인하기] → 상세', d: '진행 사다리·인가일(모아타운은 승인·고시일)을 보고 아래 [저장]·[공유하기]로 받습니다.', sel: ['#list'] }
    ],
    sign: [
      { t: '사인·도장 만들기', d: '직접 사인 · 사인도장 · 도장 사진 중 하나로 투명 PNG를 만듭니다.', sel: ['#mk'] },
      { t: '문서에 도장 찍기', d: '사진·PDF를 올리고 찍을 자리를 누릅니다. 날인본 이미지·PDF로 저장합니다.', sel: ['#docDrop'] },
      { t: '간인 찍기', d: '여러 쪽 문서에서 쪽 사이에 도장을 반씩 걸쳐 찍습니다(PRO 미리보기).', sel: ['#ganin'] }
    ],
    gagebu: [
      { t: '결제 문자·알림 붙여넣기', d: '카드 결제 문자를 복사해 붙여넣습니다. 앱 내용을 자동으로 읽어오지는 않습니다.', sel: ['#inBuy'] },
      { t: '[정리하기]', d: '가맹점·금액·카드사로 정리돼 오늘 산 것에 들어갑니다. 잔액·누적 줄은 빼고 기록합니다.', sel: ['#btnAdd'] },
      { t: '다른 곳 값 적어 두기', d: '본 값을 적어 두면 더 싼 곳을 비교해 드립니다.', sel: ['#inPrice'] }
    ],
    slope: [
      { t: '지번·주소로 찾기', d: '지번이나 주소를 넣고 찾습니다.', sel: ['#q'] },
      { t: '필지 경사도 지도 보기', d: '그 자리 경사도가 색으로 보입니다.', sel: ['#mapCard'] },
      { t: '지어도 될까 확인', d: '경사도 판정과 단면을 보고, 정밀 확인은 공공 지도 원문으로 합니다.', sel: ['#arch', '#mapCard'] }
    ],
    hogang: [
      { t: '맨 위 최저가 한 줄 보기', d: '지금 조건에서 월 납부액이 가장 낮은 길을 한 줄로 보여 줍니다.', sel: ['#top1'] },
      { t: '내 조건 바꾸기', d: '기종·요금제·약정을 바꾸면 바로 다시 계산합니다.', sel: ['#inBox'] },
      { t: '나머지 후보 비교', d: '월 납부액 낮은 순으로 다른 길과 비교합니다.', sel: ['#cands'] }
    ],
    thescan: [
      { t: '[찍기]', d: '종이에 폰을 대고 찍으면 경계를 찾아 자동 보정합니다. 사진첩에서 골라도 됩니다.', sel: ['#btnShoot'] },
      { t: '내 스캔 확인', d: '찍은 장이 아래 목록에 쌓입니다. [전체 저장]으로 한 번에 받습니다.', sel: ['#grid', '#btnAll'] },
      { t: '연결하기·분리하기', d: '여러 장을 한 파일로 잇거나 나눕니다.', sel: ['#btnJoin'] }
    ],
    thedetail: [
      { t: '상품 / 부동산 고르기', d: '맨 위에서 상세페이지 종류를 고릅니다.', sel: ['#swP'] },
      { t: '내용·사진 채우기', d: '이름·키워드·사진을 넣습니다. [예시로 채워보기]로 먼저 볼 수 있습니다.', sel: ['#formProduct', '#formEstate'] },
      { t: '[1초 만에 상세페이지 만들기] → 저장', d: '만든 뒤 PNG·PDF·JPG로 저장하거나 HTML 을 복사합니다.', sel: ['#screenInput .go'] }
    ],
    theform: [
      { t: '양식 고르기·등록', d: '표준 양식을 바로 쓰거나, 내 종이 양식 사진을 등록합니다. 표 사진을 한글·엑셀로 바꾸려면 위쪽 [② 표 사진 → 한글·엑셀] 탭.', sel: ['#s1'] },
      { t: '채울 자리 찍기', d: '값이 들어갈 칸을 양식 위에 찍어 둡니다(한 번만).', sel: ['#s2'] },
      { t: '값 입력 → 미리보기·내보내기', d: '값만 채우면 미리보기를 거쳐 출력·저장합니다.', sel: ['#s3'] }
    ],
    contract: [
      { t: '표준계약서 고르기', d: '원본 양식 그대로 쓸 계약서를 고릅니다.', sel: ['#s0'] },
      { t: '당사자·물건·특약 채우기', d: '빈칸만 순서대로 채웁니다.', sel: ['#s1'] },
      { t: '서명 → 미리보기·출력', d: '(인) 자리에 손가락으로 서명하고 출력·저장합니다.', sel: ['#s4'] }
    ],
    sale: [
      { t: '탭·필터로 특가 고르기', d: '편의점·마트별로 할인만 모아 봅니다.', sel: ['#tabs'] },
      { t: '살 것 담기', d: '목록에서 필요한 것을 담습니다.', sel: ['#list'] },
      { t: '[발주서 1초]', d: '담은 것을 발주서로 만들어 복사·공유·문자로 보냅니다.', sel: ['#btnSheet'] }
    ]
  };

  /* ---------- 지금 도구 판별 ---------- */
  function toolKey() {
    var parts = path.split('/').filter(Boolean);
    var last = parts[parts.length - 1] || '';
    var file = /\.html?$/i.test(last) ? last : '';
    var dir = parts[parts.length - (file ? 2 : 1)] || '';
    var base = file.replace(/\.html?$/i, '');
    try { base = decodeURIComponent(base); } catch (e) {}
    if (!file && !dir) return 'index';
    if ((!file || base === 'index') && TOOLS[dir]) return dir;
    if (base && TOOLS[base] && base !== 'index') return base;
    if (TOOLS[dir]) return dir;
    if (!dir || base === 'index') return 'index';
    return base || dir;
  }
  var KEY = toolKey();
  function toolName() {
    if (KEY === 'detail') {
      var m = location.search.match(/[?&]k=([^&]+)/);
      if (m && w.KTS_KEYS && w.KTS_KEYS.info) { try { var nm = w.KTS_KEYS.info(decodeURIComponent(m[1])).nm; if (nm) return nm + ' 소개'; } catch (e) {} }
    }
    if (TOOLS[KEY]) return TOOLS[KEY].nm;
    var t = String(d.title || '').split(/\s[—|-]\s|\s·\s/)[0].replace(/^KTS\s+/, '').trim();
    return t || '원클릭';
  }
  function kOf() { return (TOOLS[KEY] && TOOLS[KEY].k) || KEY; }

  /* ---------- 작은 도구들 ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function visible(el) { return !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length)); }
  function pick(sel) {
    for (var i = 0; i < (sel || []).length; i++) { var el = d.querySelector(sel[i]); if (visible(el)) return el; }
    return null;
  }
  function textOnly(h) {                                   /* h2 의 화면 글자만 — 번호 배지·small 은 따로 */
    var c = h.cloneNode(true), sub = '';
    [].slice.call(c.querySelectorAll('small,em')).forEach(function (x) { sub = sub || x.textContent.trim(); x.parentNode.removeChild(x); });
    [].slice.call(c.querySelectorAll('i,span.n')).forEach(function (x) { if (/^\s*[\d①-⑨★✎+?→₩]*\s*$/.test(x.textContent)) x.parentNode.removeChild(x); });
    return { t: c.textContent.replace(/\s+/g, ' ').trim(), d: sub };
  }
  function autoSteps() {
    var hs = [].slice.call(d.querySelectorAll('main h2, .card h2')).filter(function (h) {
      return visible(h) && !h.closest('#kts-helper') && h.textContent.trim().length > 1;
    });
    var seen = [], out = [];
    hs.forEach(function (h) { if (out.length < 3 && seen.indexOf(h) < 0) { seen.push(h); var x = textOnly(h); if (x.t) out.push({ t: x.t, d: x.d, el: h }); } });
    return out;
  }
  function steps() {
    var s = STEPS[KEY];
    if (s) return s.map(function (x) { return { t: x.t, d: x.d, el: null, sel: x.sel }; });
    return autoSteps();
  }

  /* ---------- 자주 묻는 질문 (전부 이 기기 안에서 만든 답) ---------- */
  var UNKNOWN = '정확히 확인하지 못했습니다. ④ 1:1 문의로 문자 주시면 바로 답해 드립니다.';
  function freeAnswer() {
    var k = kOf(), t = '';
    try { if (w.KTS_KEYS && w.KTS_KEYS.freeText) t = w.KTS_KEYS.freeText(k) || ''; } catch (e) {}
    if (!t && TOOLS[KEY] && TOOLS[KEY].free) t = TOOLS[KEY].free;
    if (!t && w.KTS_UX_CFG && w.KTS_UX_CFG.free) t = String(w.KTS_UX_CFG.free);
    if (t) return t + '입니다.' + boxLine();
    var paidHint = d.querySelector('[data-kts-money]') || /이용권|PRO\b/.test((d.body && d.body.innerText) || '');
    return (paidHint
      ? '이 화면은 무료로 열어 쓸 수 있습니다. 더 쓸 때의 안내는 화면 안 [그 이상 쓰기]·이용권 안내에 적혀 있습니다.'
      : '이 도구는 무료입니다.') + boxLine();
  }
  function boxLine() {
    try { if (w.KTS_KEYS && w.KTS_KEYS.inBox && w.KTS_KEYS.inBox(kOf())) return ' (내 박스에 담겨 있습니다)'; } catch (e) {}
    return '';
  }
  var FAQ = [
    { q: '무료로 몇 번 쓸 수 있나요?', a: freeAnswer, kw: ['무료', '몇 번', '몇번', '횟수', '공짜', '하루'] },
    { q: '돈은 어떻게 내나요?', a: '사이트에서는 결제를 받지 않습니다. 열쇠·이용권은 ' + TEL_SHOW + ' 문자로 신청하면 그 달 코드(KS+연월-4자리)를 보내 드립니다.', kw: ['돈', '결제', '요금', '가격', '이용권', '코드', '카드', '계좌', '얼마', '유료'] },
    { q: '열쇠가 뭔가요?', a: '내 박스 4칸을 열거나 잠긴 도구를 되살릴 때 쓰는 1회권입니다. 친구 5명 초대 또는 문자 신청으로 받습니다.', kw: ['열쇠', '박스', '칸', '잠김', '잠긴', '초대'] },
    { q: '저장이 안 돼요', a: '[저장]이 안 되면 인쇄(PDF 저장)나 화면 캡처를 쓰세요. 파일은 서버로 보내지 않고 이 기기 안에서만 만들어집니다.', kw: ['저장', '다운', '내려받', 'pdf', '인쇄', '출력'] },
    { q: '사진·파일이 안 열려요', a: 'JPG·PNG·PDF 만 됩니다. 아이폰 HEIC 는 사진 앱에서 JPG 로 바꿔 주세요.', kw: ['사진', '파일', '안 열', '안열', 'heic', '업로드', '올리'] },
    { q: '아무 반응이 없어요', a: '새로고침 한 번 해 주세요. 그래도 같으면 아래 [불편 신고]에 화면 이름을 적어 주세요.', kw: ['반응', '멈', '안 돼', '안돼', '먹통', '오류', '에러', '고장', '안 눌'] },
    { q: '인터넷 없이도 되나요?', a: '한 번 열어 둔 화면은 됩니다. 지도·자료 갱신은 인터넷이 필요합니다.', kw: ['인터넷', '오프라인', '와이파이', '데이터'] },
    { q: '내 사진·기록이 서버로 가나요?', a: '아니요. 이 기기 브라우저 안에서만 처리·저장합니다(도구별로 안내 문구가 있습니다).', kw: ['서버', '개인정보', '유출', '기록', '보안', '전송'] }
  ];
  function ansOf(f) { return typeof f.a === 'function' ? f.a() : f.a; }
  function answer(q) {
    var s = String(q || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (!s) return '';
    var best = null, score = 0;
    FAQ.forEach(function (f) {
      var n = 0; f.kw.forEach(function (k) { if (s.indexOf(k) >= 0) n++; });
      if (n > score) { score = n; best = f; }
    });
    return best ? ansOf(best) : UNKNOWN;
  }

  /* ---------- 신고 저장 (이 기기 localStorage 에만) ---------- */
  function saveReport(text) {
    var list = [];
    try { list = JSON.parse(localStorage.getItem(REPORT_KEY) || '[]') || []; } catch (e) { list = []; }
    list.push({ at: new Date().toISOString(), path: path + (location.search || ''), tool: toolName(), text: String(text).slice(0, 1000) });
    if (list.length > 50) list = list.slice(-50);
    try { localStorage.setItem(REPORT_KEY, JSON.stringify(list)); return true; } catch (e) { return false; }
  }
  function smsHref(body) { return 'sms:' + TEL + '?body=' + encodeURIComponent(body); }

  /* ---------- 화면 ---------- */
  var CSS =
    '#kts-helper-btn{position:fixed;z-index:240;right:max(12px,calc(50% - 274px));bottom:14px;width:38px;height:38px;border:0;border-radius:12px;' +
    'background:linear-gradient(160deg,#FF8A2B,#FF6B00);color:#0A1224;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;opacity:.86;' +
    'box-shadow:0 4px 12px rgba(255,107,0,.32),0 1px 4px rgba(0,0,0,.35);cursor:grab;font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif;' +
    'padding:0;margin:0;line-height:1;-webkit-tap-highlight-color:transparent;transition:bottom .15s,left .15s,right .15s,opacity .15s;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}' +
    /* 159번: 38px 아이콘 · 누르거나 끌 때만 불투명 · 끌어서 아무 데나(좌/우 가장자리 스냅) */
    '#kts-helper-btn:active,#kts-helper-btn.kh-drag{opacity:1;cursor:grabbing}#kts-helper-btn.kh-drag{transition:none;box-shadow:0 8px 22px rgba(255,107,0,.45),0 2px 8px rgba(0,0,0,.4)}' +
    /* 159 보완(11-24): 왼쪽 아래는 가격표·[저장]·표 마지막 행을 덮음 → 기본 자리 = 오른쪽 가장자리 · 세로 38% (하단 고정 바와 안 겹침) */
    '@media (max-width:719px){#kts-helper-btn{left:auto;right:8px;top:38%;bottom:auto;width:38px;height:38px}}' +
    '@media (min-width:720px){#kts-helper-btn{left:auto;right:max(12px,calc(50% - 300px));top:38%;bottom:auto}}' +
    /* 스크롤 0.8초 이상 · 입력 중이면 흐리게(.35) — 손대면 1 */
    '#kts-helper-btn.kh-dim{opacity:.35}' +
    /* 2026-11-25: 본문 글자 위에 걸칠 때는 더 흐리게(0.25) — 손대면 바로 1 */
    '#kts-helper-btn.kh-faint{opacity:.25}' +
    '#kts-helper-btn.kh-faint:hover,#kts-helper-btn.kh-faint:focus-visible,#kts-helper-btn.kh-faint:active{opacity:1}' +
    '#kts-helper-btn b{font-size:16px;font-weight:900;line-height:1;pointer-events:none}' +
    '#kts-helper-btn span{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}' +
    '#kts-helper{position:fixed;inset:0;z-index:250;display:none;align-items:flex-end;justify-content:center;background:rgba(4,8,18,.66);' +
    'font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif;letter-spacing:-.2px;word-break:keep-all;line-height:1.5}' +
    '#kts-helper.on{display:flex}' +
    '#kts-helper .kh-sh{width:100%;max-width:460px;max-height:88vh;display:flex;flex-direction:column;background:#0F1B33;color:#F3F6FA;border:1px solid #2E4370;border-bottom:0;border-radius:18px 18px 0 0;box-shadow:0 -10px 30px rgba(0,0,0,.45);box-sizing:border-box}' +
    '#kts-helper *{box-sizing:border-box}' +
    '#kts-helper .kh-hd{display:flex;align-items:center;gap:8px;padding:13px 14px 8px}' +
    '#kts-helper .kh-hd b{font-size:15px;font-weight:900;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#kts-helper .kh-hd b i{font-style:normal;color:#FFA24D}' +
    '#kts-helper .kh-x{flex:0 0 auto;width:32px;height:32px;border-radius:10px;border:1px solid #2E4370;background:#0B1729;color:#CBD8E8;font-size:15px;font-weight:900;cursor:pointer}' +
    '#kts-helper .kh-tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;padding:0 12px 9px;border-bottom:1px solid #26375F}' +
    '#kts-helper .kh-tabs button{border:1px solid #2E4370;background:#0E1A33;color:#9FB0C8;border-radius:10px;padding:7px 2px;font-size:11px;font-weight:900;cursor:pointer;white-space:nowrap;font-family:inherit}' +
    '#kts-helper .kh-tabs button.on{border-color:#FF6B00;color:#0A1224;background:linear-gradient(135deg,#FF6B00,#FFA24D)}' +
    '#kts-helper .kh-bd{overflow-y:auto;-webkit-overflow-scrolling:touch;padding:12px 14px calc(18px + env(safe-area-inset-bottom,0px))}' +
    '#kts-helper .kh-pn{display:none}#kts-helper .kh-pn.on{display:block}' +
    '#kts-helper .kh-st{display:flex;gap:10px;align-items:flex-start;border:1px solid #26375F;background:#0B1729;border-radius:12px;padding:10px;margin-bottom:8px}' +
    '#kts-helper .kh-no{flex:0 0 auto;width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#FF6B00,#FFA24D);color:#0A1224;font-weight:900;font-size:14px;display:grid;place-items:center}' +
    '#kts-helper .kh-st div{flex:1;min-width:0}#kts-helper .kh-st b{display:block;font-size:13.5px;font-weight:900}#kts-helper .kh-st p{margin:2px 0 0;font-size:11.5px;color:#AFBDD0}' +
    '#kts-helper .kh-go{flex:0 0 auto;align-self:center;border:1px solid rgba(255,162,77,.6);background:rgba(255,107,0,.1);color:#FFC98F;border-radius:9px;padding:6px 9px;font-size:11px;font-weight:900;cursor:pointer;font-family:inherit;white-space:nowrap}' +
    '#kts-helper .kh-note{font-size:11px;color:#8FA1B8;margin:6px 2px 0}' +
    '#kts-helper details{border:1px solid #26375F;background:#0B1729;border-radius:11px;margin-bottom:6px}' +
    '#kts-helper summary{padding:10px 11px;font-size:12.5px;font-weight:900;cursor:pointer;list-style:none}#kts-helper summary::-webkit-details-marker{display:none}' +
    '#kts-helper summary::before{content:"Q ";color:#FFA24D}#kts-helper details p{margin:0;padding:0 11px 10px;font-size:12px;color:#C9D6E6}' +
    '#kts-helper .kh-ask{display:flex;gap:6px;margin-top:10px}#kts-helper .kh-ask input{flex:1;min-width:0;border:1px solid #2E4370;background:#0B1729;color:#F3F6FA;border-radius:10px;padding:10px;font-size:14px;font-family:inherit;outline:0}' +
    '#kts-helper .kh-b{border:0;border-radius:10px;padding:10px 12px;font-size:12.5px;font-weight:900;cursor:pointer;background:linear-gradient(135deg,#FF6B00,#FFA24D);color:#0A1224;font-family:inherit;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:5px}' +
    '#kts-helper .kh-b.gh{background:#12203C;color:#DCE6F2;border:1px solid #2E4370}' +
    '#kts-helper .kh-log{margin-top:8px}#kts-helper .kh-log div{font-size:12px;border-radius:10px;padding:8px 10px;margin-top:6px}' +
    '#kts-helper .kh-log .me{background:#16274A;color:#DCE6F2;margin-left:30px}#kts-helper .kh-log .bot{background:#0B1729;border:1px solid #26375F;color:#E6EDF7;margin-right:30px}' +
    '#kts-helper textarea{width:100%;min-height:96px;border:1px solid #2E4370;background:#0B1729;color:#F3F6FA;border-radius:10px;padding:10px;font-size:14px;font-family:inherit;resize:vertical;outline:0;display:block}' +
    '#kts-helper .kh-row{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}#kts-helper .kh-row .kh-b{width:100%}' +
    '#kts-helper .kh-ok{margin-top:9px;border:1px solid rgba(46,212,122,.4);background:rgba(46,212,122,.1);color:#8DE7B8;border-radius:10px;padding:9px 10px;font-size:12px}' +
    '#kts-helper .kh-ok b{color:#fff}' +
    '#kts-helper .kh-lbl{font-size:12px;font-weight:900;color:#C9D6E6;margin:0 0 6px}' +
    /* ---- 2026-11-25 작성 모드 안내(커서 → 마이크) ---- */
    '#kts-helper-btn.kh-guide{opacity:1;background:linear-gradient(160deg,#FFB067,#FF6B00);box-shadow:0 0 0 4px rgba(255,107,0,.20),0 6px 18px rgba(255,107,0,.45);animation:khpulse 1.9s ease-in-out infinite}' +
    '#kts-helper-btn.kh-guide.kh-mic{background:linear-gradient(160deg,#FF8A2B,#E24800);animation:khpulse 1.1s ease-in-out infinite}' +
    '#kts-helper-btn.kh-guide b{font-size:19px;line-height:1}' +
    '@keyframes khpulse{0%,100%{box-shadow:0 0 0 3px rgba(255,107,0,.16),0 6px 16px rgba(255,107,0,.34)}50%{box-shadow:0 0 0 9px rgba(255,107,0,.04),0 8px 22px rgba(255,107,0,.5)}}' +
    '#kts-helper-btn .kh-tip{position:absolute;right:calc(100% + 7px);top:50%;transform:translateY(-50%);width:auto;height:auto;max-width:190px;clip:auto;background:rgba(10,17,40,.97);border:1px solid rgba(255,162,77,.6);color:#FFD9A6;border-radius:10px;padding:5px 9px;font-size:11px;font-weight:900;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;display:none}' +
    '#kts-helper-btn[data-pos="left"] .kh-tip{right:auto;left:calc(100% + 7px)}' +
    '#kts-helper-btn.kh-guide .kh-tip{display:block}' +
    '#kts-helper-btn .kh-tip small{display:block;font-size:9.5px;font-weight:800;color:#9FB0C8}' +
    '.kts-guidefld{outline:2px solid #FF8A2B!important;outline-offset:2px!important;box-shadow:0 0 0 5px rgba(255,107,0,.16)!important;border-radius:10px!important;transition:outline-color .15s}' +
    /* ---- 2026-11-25 60초 문의 시트 ---- */
    '#kts-q60{position:fixed;inset:0;z-index:250;display:none;align-items:flex-end;justify-content:center;background:rgba(4,8,18,.6)}' +
    '#kts-q60.on{display:flex}' +
    '#kts-q60 .q6-sh{width:100%;max-width:460px;background:#0F1B33;color:#F3F6FA;border:1px solid #2E4370;border-bottom:0;border-radius:18px 18px 0 0;padding:14px 14px calc(16px + env(safe-area-inset-bottom,0px));box-shadow:0 -12px 30px rgba(0,0,0,.5);box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif;letter-spacing:-.2px}' +
    '#kts-q60 .q6-hd{display:flex;align-items:center;gap:8px;margin-bottom:4px}' +
    '#kts-q60 .q6-hd b{flex:1;min-width:0;font-size:15px;font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '#kts-q60 .q6-hd b i{font-style:normal;color:#FFA24D}' +
    '#kts-q60 .q6-x{flex:0 0 auto;width:32px;height:32px;border-radius:10px;border:1px solid #2E4370;background:#0B1729;color:#CBD8E8;font-size:15px;font-weight:900;cursor:pointer;font-family:inherit}' +
    '#kts-q60 .q6-sub{font-size:11.5px;color:#AFBDD0;line-height:1.5;margin:0 0 8px}' +
    '#kts-q60 .q6-lb{display:block;font-size:11.5px;font-weight:800;color:#C9D6E6;margin:8px 0 4px}' +
    '#kts-q60 input,#kts-q60 textarea{width:100%;box-sizing:border-box;border:1px solid #2E4370;background:#0B1729;color:#F3F6FA;border-radius:10px;padding:10px;font-size:14px;font-family:inherit;outline:0}' +
    '#kts-q60 .q6-row{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:9px}' +
    '#kts-q60 .q6-b{border:0;border-radius:10px;padding:11px 8px;font-size:13px;font-weight:900;cursor:pointer;background:linear-gradient(135deg,#FF6B00,#FFA24D);color:#0A1224;font-family:inherit;text-align:center;text-decoration:none;display:flex;align-items:center;justify-content:center}' +
    '#kts-q60 .q6-b.gh{background:#12203C;color:#DCE6F2;border:1px solid #2E4370}' +
    '#kts-q60 .q6-note{font-size:10.5px;color:#8FA1B8;line-height:1.5;margin:8px 0 0}' +
    '#kts-q60 .q6-more{width:100%;margin-top:9px;border:0;background:none;color:#FFA24D;font-family:inherit;font-size:11.5px;font-weight:900;cursor:pointer;padding:4px}' +
    '#kts-helper-toast{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);z-index:260;background:rgba(10,17,40,.97);border:1px solid rgba(255,107,0,.55);color:#FFD9A6;font-size:12px;font-weight:800;border-radius:999px;padding:8px 14px;max-width:88%;text-align:center;opacity:0;transition:opacity .2s;pointer-events:none;font-family:-apple-system,"Malgun Gothic",sans-serif}' +
    '#kts-helper-toast.on{opacity:1}' +
    '@media print{#kts-helper-btn,#kts-helper,#kts-q60,#kts-helper-toast{display:none!important}}';

  var btn, root, toastEl, built = false, curTab = 0;

  function toast(m) {
    if (!toastEl) { toastEl = d.createElement('div'); toastEl.id = 'kts-helper-toast'; d.body.appendChild(toastEl); }
    toastEl.textContent = m; toastEl.classList.add('on');
    clearTimeout(toastEl._t); toastEl._t = setTimeout(function () { toastEl.classList.remove('on'); }, 2200);
  }

  function build() {
    var st = d.createElement('style'); st.id = 'kts-helper-css'; st.textContent = CSS; d.head.appendChild(st);
    btn = d.createElement('button');
    btn.type = 'button'; btn.id = 'kts-helper-btn'; btn.setAttribute('aria-label', '도우미 — 60초 문의');
    btn.innerHTML = '<b>?</b><span class="kh-tip"></span><span class="sr">도우미</span>';
    btn.onclick = function (e) {
      if (Date.now() < drag.noClick) { e.preventDefault(); e.stopPropagation(); return; }   /* 6px 넘게 끌었으면 창 안 열림 */
      if (G.st) { guideTap(); return; }        /* 작성 중 — 커서/마이크 안내 */
      openAsk();                              /* 작성 전·작성 끝 — 바로 60초 문의 */
    };
    d.body.appendChild(btn);
    bindDrag();
    bindDim();
    bindGuide();
    autoTop.until = Date.now() + 4000;                     /* 늦게 그려지는 본문(소개 접힘 3초 등)까지 보고 고정 */
    place();
    setTimeout(place, 3700);
    var lastW = w.innerWidth;                              /* 주소창이 접히는 세로 리사이즈에는 다시 고르지 않음(회전·폭 변화만) */
    w.addEventListener('resize', function () { if (w.innerWidth !== lastW) { lastW = w.innerWidth; autoTop.v = null; } place(); });
    w.addEventListener('scroll', function () { if (!place._r) { place._r = 1; requestAnimationFrame(function () { place._r = 0; place(); }); } }, { passive: true });
    setInterval(place, 2000);                              /* 늦게 붙는 하단 바(ux.js·slots.js) 대응 — 계산만, 요청 없음 */
  }

  /* 하단 고정 바를 찾아 그 위로 — 하드코딩하지 않는다 */
  var BAR_SEL = '.sitebar,.dock,.cta,.sact,.bar,#pbar,.sharebar,.kux-flow,.ksl-bar';
  function barCandidates() {
    var list = [].slice.call(d.querySelectorAll(BAR_SEL));
    [].slice.call(d.body.children).forEach(function (el) { list.push(el); [].slice.call(el.children).forEach(function (c) { list.push(c); }); });
    var app = d.getElementById('app'); if (app) [].slice.call(app.children).forEach(function (c) { list.push(c); });
    return list;
  }
  function bottomBarHeight() {
    var H = w.innerHeight, W = w.innerWidth, best = 0;
    barCandidates().forEach(function (el) {
      if (!el || el === btn || el === root || el === toastEl || (root && root.contains(el))) return;
      var cs = w.getComputedStyle(el);
      if (cs.position !== 'fixed' || cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return;
      var r = el.getBoundingClientRect();
      if (r.height <= 0 || r.bottom < H - 1 || r.top < H * 0.5 || r.width < W * 0.5) return;   /* 바닥에 붙은 넓은 바만 */
      best = Math.max(best, H - r.top);
    });
    return Math.round(best);
  }
  function totopTop(base) {                                 /* .totop(↑ 위로) — 보이지 않을 때도 자리는 비워 둔다 */
    var t = d.querySelector('.totop,#toTop'); if (!t) return 0;
    var cs = w.getComputedStyle(t); if (cs.position !== 'fixed' || cs.display === 'none') return 0;
    /* 133번: 같은 세로줄(가로로 겹침)에 있고, 도우미 버튼 자리보다 아래에서 시작할 때만 피한다 */
    var tr = t.getBoundingClientRect(), br = btn.getBoundingClientRect();
    if (tr.right <= br.left || tr.left >= br.right) return 0;
    var b = parseFloat(cs.bottom) || 0, h = t.offsetHeight || 0;
    if (b >= base + (btn.offsetHeight || 0) + 4) return 0;   /* 이미 도우미 위에 있음 */
    return Math.round(b + h);
  }
  /* ---------- 159번: 손가락으로 끌어 이동 · 가장자리 스냅 · 위치 저장 ---------- */
  var POS_KEY = 'kts_helper_pos_v1', EDGE = 10, VPAD = 8, SLOP = 6;
  var drag = { id: null, on: false, sx: 0, sy: 0, ox: 0, oy: 0, noClick: 0 };
  function loadPos() {
    try {
      var p = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
      if (p && (p.side === 'left' || p.side === 'right')) return p;
    } catch (e) { }
    return null;
  }
  function clampY(y) {
    var h = btn.offsetHeight || 38, H = w.innerHeight;
    return Math.round(Math.max(VPAD, Math.min(H - h - VPAD, y)));
  }
  function applyPos(p) {
    var y = p.y;
    if (typeof p.r === 'number' && isFinite(p.r)) y = p.r * w.innerHeight;   /* 회전·리사이즈: 비율로 다시 계산 */
    var s = btn.style;
    if (p.side === 'right') { s.left = 'auto'; s.right = EDGE + 'px'; } else { s.left = EDGE + 'px'; s.right = 'auto'; }
    if (y === null || y === undefined || !isFinite(y)) { s.top = ''; return; }   /* 높이 미지정 = CSS 기본 bottom */
    s.top = clampY(y) + 'px'; s.bottom = 'auto';
    btn.setAttribute('data-pos', p.side);
  }
  function bindDrag() {
    btn.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button > 0) return;
      var r = btn.getBoundingClientRect();
      drag.id = e.pointerId; drag.on = false; drag.sx = e.clientX; drag.sy = e.clientY; drag.ox = e.clientX - r.left; drag.oy = e.clientY - r.top;
      try { btn.setPointerCapture(e.pointerId); } catch (x) { }
    });
    btn.addEventListener('pointermove', function (e) {
      if (drag.id !== e.pointerId) return;
      var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (!drag.on) {
        if (Math.sqrt(dx * dx + dy * dy) < SLOP) return;   /* 6px 미만 = 탭 */
        drag.on = true; btn.classList.add('kh-drag');
      }
      e.preventDefault();
      var W = w.innerWidth, H = w.innerHeight, bw = btn.offsetWidth || 38, bh = btn.offsetHeight || 38;
      var x = Math.max(0, Math.min(W - bw, e.clientX - drag.ox)), y = Math.max(0, Math.min(H - bh, e.clientY - drag.oy));
      var s = btn.style; s.right = 'auto'; s.bottom = 'auto'; s.left = Math.round(x) + 'px'; s.top = Math.round(y) + 'px';
    });
    function end(e) {
      if (drag.id !== e.pointerId) return;
      drag.id = null;
      try { btn.releasePointerCapture(e.pointerId); } catch (x) { }
      if (!drag.on) return;                                  /* 탭 → click 이 open(0) */
      drag.on = false; btn.classList.remove('kh-drag');
      drag.noClick = Date.now() + 450;                       /* 끌기 뒤 따라오는 click 억제 */
      var r = btn.getBoundingClientRect(), side = (r.left + r.width / 2) < w.innerWidth / 2 ? 'left' : 'right';
      var y = clampY(r.top), p = { side: side, y: y, r: Math.round(y / w.innerHeight * 10000) / 10000 };
      try { localStorage.setItem(POS_KEY, JSON.stringify(p)); } catch (x) { }
      applyPos(p);
    }
    btn.addEventListener('pointerup', end);
    btn.addEventListener('pointercancel', end);
  }

  /* 본문 글자·사진 위에 걸치면 더 흐리게 — 글자와 사진을 가리지 않는다 */
  var TEXT_RE = /^(P|LI|TD|TH|H1|H2|H3|H4|H5|H6|SPAN|B|STRONG|EM|I|SMALL|LABEL|DT|DD|BLOCKQUOTE|PRE|CODE)$/;
  var PHOTO_TAG = /^(IMG|CANVAS|VIDEO|PICTURE)$/;
  function overText() {
    if (!btn || btn.classList.contains('kh-guide')) return false;
    var r = btn.getBoundingClientRect(), bh = btn.offsetHeight || 38;
    var xs = [r.left + 7, r.left + r.width / 2, r.right - 7];
    var ys = [r.top + 6, r.top + bh / 2, r.bottom - 6];
    for (var i = 0; i < xs.length; i++) {
      for (var k = 0; k < ys.length; k++) {
        var x = Math.min(w.innerWidth - 2, Math.max(2, xs[i])), y = Math.min(w.innerHeight - 2, Math.max(2, ys[k]));
        if (pointPenalty(x, y) > 0) return true;      /* 글자·사진·버튼에 걸치면 흐리게 */
      }
    }
    return false;
  }
  function paintFaint() {
    if (!btn) return;
    var on = overText();
    btn.classList.toggle('kh-faint', on);
    btn.setAttribute('data-faint', on ? '1' : '0');
  }
  function place() {
    if (!btn) return;
    if (drag.on) return;
    paintFaint();
    var saved = loadPos();
    if (saved) { applyPos(saved); btn.setAttribute('data-bar', 'user'); return; }   /* 사용자가 정한 자리 — 자동 회피 중지 */
    /* 159 보완(11-24): 기본 자리 = 오른쪽 가장자리. 세로는 38%를 먼저 보되, 첫 화면의 버튼·입력·표를 가장 덜 가리는
       높이(30~75%)를 화면이 뜰 때 한 번 골라 고정한다(스크롤 중에는 움직이지 않음 · 하단 고정 바 위로만) */
    var s = btn.style; s.left = ''; s.right = ''; s.bottom = '';
    btn.removeAttribute('data-pos');
    if (autoTop.v === null || (Date.now() < autoTop.until && (w.scrollY || 0) < 4)) { autoTop.v = pickTop(); autoTop.cur = autoTop.v; }
    var t = autoTop.cur === null ? autoTop.v : autoTop.cur;
    s.top = t === null ? '' : t + 'px';
    btn.setAttribute('data-bar', 'mid');
  }
  var autoTop = { v: null, cur: null, until: 0 }, TOP_PREF = [38, 30, 45, 55, 65, 75];
  var HIT_SEL = 'button,input,textarea,select,table,a[href],[role="button"],.acts';
  var KEY_RE = /저장|인쇄|결제|PDF|내보내기|보내기|구매/;
  function hitRects(onlyKey) {
    var H = w.innerHeight, br = btn.getBoundingClientRect(), rects = [];
    [].slice.call(d.querySelectorAll(HIT_SEL)).forEach(function (e) {
      if (e === btn || (root && root.contains(e))) return;
      var r = e.getBoundingClientRect();
      if (!r.width || !r.height || r.bottom < 0 || r.top > H || r.right <= br.left || r.left >= br.right) return;
      var cs = w.getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') return;
      if (onlyKey && !KEY_RE.test((e.textContent || e.value || '') + ' ' + (e.getAttribute('aria-label') || ''))) return;
      rects.push(r);
    });
    return rects;
  }
  function areaAt(t, rects) {
    var bh = btn.offsetHeight || 38, br = btn.getBoundingClientRect(), a = 0;
    rects.forEach(function (r) {
      var x = Math.min(br.right, r.right) - Math.max(br.left, r.left), y = Math.min(t + bh, r.bottom) - Math.max(t, r.top);
      if (x > 0 && y > 0) a += x * y;
    });
    return a;
  }
  /* 211: 그 높이에 실제로 깔린 것 — 사진 3 · 제목/글자/버튼 2 · 카드 바탕 0 (위에서 아래로 3점을 본다) */
  function elPenalty(el) {
    if (!el || el.nodeType !== 1) return 0;
    var tg = (el.tagName || '').toUpperCase();
    if (PHOTO_TAG.test(tg)) return 3;
    var cs;
    try { cs = w.getComputedStyle(el); } catch (e) { cs = null; }
    if (cs && /url\(/i.test(cs.backgroundImage || '')) return 3;
    if (/^(BUTTON|INPUT|SELECT|TEXTAREA|A)$/.test(tg)) return 2;
    var t = (el.textContent || '').replace(/\s+/g, '');
    if (TEXT_RE.test(tg) && t.length > 0 && t.length <= 120) return 2;
    /* 라벨·배지: class 가 tg·tag·badge 류이거나, 자식 없이 자기 글자만 가진 짧은 상자 */
    var cl = (typeof el.className === 'string' ? el.className : '');
    if (/(^|\s)(tg|tag|badge|chip|pill|tbd|tbox)(\s|$)/.test(cl)) return 2;
    var own = '';
    for (var n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3) own += n.nodeValue;
    own = own.replace(/\s+/g, '');
    if (own.length > 0 && own.length <= 20 && !el.querySelector('img,canvas,button,input,table,svg')) return 2;
    return 0;
  }
  /* 211: 그 점에 가장 위로 깔린 것 하나만 본다 — 사진 3 · 제목/글자/버튼 2 · 카드 바탕 0 */
  function pointPenalty(x, y) {
    var list = [];
    try { list = (d.elementsFromPoint ? d.elementsFromPoint(x, y) : []) || []; } catch (e) { list = []; }
    for (var j = 0; j < list.length; j++) {
      var el = list[j];
      if (!el || el === btn || btn.contains(el) || el === root || (root && root.contains(el)) || el === q60 || (q60 && q60.contains(el))) continue;
      if (el === d.body || el === d.documentElement) return 0;      /* 바탕까지 내려왔으면 깔린 것이 없다 */
      return elPenalty(el);
    }
    return 0;
  }
  function coverScore(top) {
    if (!btn) return 0;
    var r = btn.getBoundingClientRect(), bh = btn.offsetHeight || 38;
    var xs = [r.left + 7, r.left + r.width / 2, r.right - 7];
    var ys = [top + 6, top + bh / 2, top + bh - 6], sum = 0;
    for (var i = 0; i < xs.length; i++) {
      for (var k = 0; k < ys.length; k++) {
        var x = Math.min(w.innerWidth - 2, Math.max(2, xs[i])), y = Math.min(w.innerHeight - 2, Math.max(2, ys[k]));
        sum += pointPenalty(x, y);
      }
    }
    return sum;
  }
  function pickTop(avoidKey) {
    var H = w.innerHeight, bh = btn.offsetHeight || 38, floor = H - bottomBarHeight() - bh - 8;
    var rects = hitRects(false), keys = avoidKey ? hitRects(true) : [], keyW = avoidKey ? 5000 : 0;
    function costOf(t) {
      var cv = coverScore(t), ar = areaAt(t, rects);
      return { c: cv * 2000 + ar + areaAt(t, keys) * keyW, cv: cv, ar: ar };
    }
    var best = null, bestC = Infinity, bestCv = 0, bestA = 0;
    TOP_PREF.forEach(function (p) {                  /* 38%를 먼저 — 같은 점수면 이 순서를 지킨다 */
      var t = Math.round(H * p / 100); if (t > floor) return;
      var q = costOf(t);
      if (q.c < bestC - 0.5) { bestC = q.c; best = t; bestCv = q.cv; bestA = q.ar; }
    });
    if (bestCv > 0) {         /* 기본 후보가 모두 제목·사진·버튼을 가리면 — 8px 단위로 빈 높이까지 훑는다 */
      var mid = Math.round(H * 0.38), lo = Math.round(Math.max(12, H * 0.20)), hi = Math.min(floor, Math.round(H * 0.80));
      var cand = [], t2;
      for (t2 = lo; t2 <= hi; t2 += 8) if (t2 !== best) cand.push(t2);
      cand.sort(function (a, b) { return Math.abs(a - mid) - Math.abs(b - mid); });   /* 38%에 가까운 자리부터 */
      for (var i = 0; i < cand.length; i++) {
        var q2 = costOf(cand[i]);
        if (q2.c < bestC - 0.5) { bestC = q2.c; best = cand[i]; bestCv = q2.cv; bestA = q2.ar; }
        if (bestCv === 0 && bestA === 0) break;        /* 완전히 빈 자리를 찾았으면 거기서 멈춘다 */
      }
    }
    btn.setAttribute('data-hit', String(Math.round(bestA)));
    btn.setAttribute('data-cover', String(bestCv));
    return best;
  }
  /* 스크롤이 멈췄을 때 [저장]·[인쇄]·결제류 버튼 위에 있으면 비어 있는 높이로 잠깐 비켜 섬(그 외에는 원래 자리) */
  function dodge() {
    if (!btn || drag.on || loadPos() || autoTop.v === null) return;
    var keys = hitRects(true), t = autoTop.v;
    if (areaAt(t, keys) > 0) { var alt = pickTop(true); if (alt !== null) t = alt; }
    autoTop.cur = t; btn.style.top = t + 'px';
    btn.setAttribute('data-dodge', t === autoTop.v ? '0' : '1');
  }
  /* 159 보완: 스크롤이 0.8초 넘게 이어지거나 입력칸에 포커스가 있으면 흐리게 — 버튼에 손대면 바로 1 */
  var dimS = { t0: 0, end: 0, focus: false };
  function setDim() {
    if (!btn) return;
    var on = dimS.focus || (dimS.t0 && Date.now() - dimS.t0 >= 800);
    btn.classList.toggle('kh-dim', !!on && !drag.on);
  }
  function bindDim() {
    w.addEventListener('scroll', function () {
      if (!dimS.t0) dimS.t0 = Date.now();
      clearTimeout(dimS.end);
      dimS.end = setTimeout(function () { dimS.t0 = 0; setDim(); dodge(); }, 600);
      setDim();
    }, { passive: true });
    d.addEventListener('focusin', function (e) {
      var t = e.target; if (!t || (root && root.contains(t))) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) { dimS.focus = true; setDim(); }
    });
    d.addEventListener('focusout', function () { dimS.focus = false; setTimeout(setDim, 0); });
    btn.addEventListener('pointerdown', function () { dimS.t0 = 0; dimS.focus = false; btn.classList.remove('kh-dim'); btn.classList.remove('kh-faint'); });
  }

  function buildPanel() {
    if (built) return; built = true;
    root = d.createElement('div'); root.id = 'kts-helper'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true');
    var nm = toolName();
    root.innerHTML =
      '<div class="kh-sh">' +
        '<div class="kh-hd"><b><i>?</i> 도우미 · ' + esc(nm) + '</b><button type="button" class="kh-x" data-kh="close" aria-label="닫기">✕</button></div>' +
        '<div class="kh-tabs">' +
          '<button type="button" data-kh-t="0">① 사용법</button><button type="button" data-kh-t="1">② 자주 묻는 질문</button>' +
          '<button type="button" data-kh-t="2">③ 불편 신고</button><button type="button" data-kh-t="3">④ 60초 문의</button>' +
        '</div>' +
        '<div class="kh-bd">' +
          '<div class="kh-pn" data-kh-p="0"></div>' +
          '<div class="kh-pn" data-kh-p="1"></div>' +
          '<div class="kh-pn" data-kh-p="2"></div>' +
          '<div class="kh-pn" data-kh-p="3"></div>' +
        '</div>' +
      '</div>';
    d.body.appendChild(root);
    paintFaq(); paintReport(); paintContact();
    root.addEventListener('click', function (e) {
      if (e.target === root) { close(); return; }
      var t = e.target.closest('[data-kh-t]'); if (t) { tab(+t.getAttribute('data-kh-t')); return; }
      var a = e.target.closest('[data-kh]'); if (!a) return;
      var act = a.getAttribute('data-kh');
      if (act === 'close') close();
      if (act === 'go') go(+a.getAttribute('data-i'));
      if (act === 'ask') ask();
      if (act === 'send') send();
    });
    root.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target && e.target.id === 'kh-q') { e.preventDefault(); ask(); } });
  }

  var STEP_CACHE = [];
  function paintSteps() {
    var p = root.querySelector('[data-kh-p="0"]');
    STEP_CACHE = steps();
    var nums = ['①', '②', '③'];
    if (!STEP_CACHE.length) {
      p.innerHTML = '<div class="kh-note">이 화면은 위에서 아래로 차례대로 쓰면 됩니다. 막히는 곳은 ② 자주 묻는 질문이나 ④ 1:1 문의로 알려 주세요.</div>';
      return;
    }
    p.innerHTML = STEP_CACHE.map(function (s, i) {
      return '<div class="kh-st"><span class="kh-no">' + nums[i] + '</span><div><b>' + esc(s.t) + '</b>' + (s.d ? '<p>' + esc(s.d) + '</p>' : '') + '</div>' +
        '<button type="button" class="kh-go" data-kh="go" data-i="' + i + '">여기로</button></div>';
    }).join('') +
      '<div class="kh-note">' + (STEPS[KEY] ? '이 화면의 쓰는 순서입니다.' : '이 화면의 제목 순서대로 보여 드립니다.') + ' [여기로]를 누르면 그 자리로 갑니다.</div>';
  }
  function go(i) {
    var s = STEP_CACHE[i]; if (!s) return;
    var el = s.el && visible(s.el) ? s.el : pick(s.sel);
    close();
    if (!el) { toast('그 단계는 앞 단계를 마치면 나타납니다'); return; }
    try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { el.scrollIntoView(); }
  }

  function paintFaq() {
    var p = root.querySelector('[data-kh-p="1"]');
    p.innerHTML = FAQ.map(function (f, i) {
      return '<details data-i="' + i + '"><summary>' + esc(f.q) + '</summary><p></p></details>';
    }).join('') +
      '<div class="kh-ask"><input id="kh-q" type="text" autocomplete="off" placeholder="궁금한 것을 적어 보세요 (예: 저장이 안 돼요)"><button type="button" class="kh-b" data-kh="ask">묻기</button></div>' +
      '<div class="kh-log" id="kh-log"></div>' +
      '<div class="kh-note">답은 이 기기 안에서 바로 만듭니다(인터넷으로 묻지 않습니다). 모르는 것은 지어내지 않고 1:1 문의로 안내합니다.</div>';
    [].slice.call(p.querySelectorAll('details')).forEach(function (dt) {
      dt.addEventListener('toggle', function () { if (dt.open) dt.querySelector('p').textContent = ansOf(FAQ[+dt.getAttribute('data-i')]); });
    });
  }
  function ask() {
    var inp = root.querySelector('#kh-q'), q = inp.value.trim(); if (!q) return;
    var log = root.querySelector('#kh-log');
    var me = d.createElement('div'); me.className = 'me'; me.textContent = q;
    var bot = d.createElement('div'); bot.className = 'bot'; bot.textContent = answer(q);
    log.appendChild(me); log.appendChild(bot); inp.value = '';
    try { bot.scrollIntoView({ block: 'nearest' }); } catch (e) {}
  }

  function paintReport() {
    var p = root.querySelector('[data-kh-p="2"]');
    p.innerHTML = '<p class="kh-lbl">어느 화면에서 무엇이 불편한지 적어 주세요</p>' +
      '<textarea id="kh-rep" placeholder="예: 저장 버튼을 눌러도 아무 일이 없어요"></textarea>' +
      '<div class="kh-row"><button type="button" class="kh-b" data-kh="send">보내기</button>' +
      '<a class="kh-b gh" href="https://autooneclick.com/" target="_blank" rel="noopener">쇼룸 \'해주세요\' 창</a></div>' +
      '<div id="kh-done"></div>' +
      '<div class="kh-note">[보내기]는 이 기기에 먼저 적어 둡니다. 저희에게 바로 닿게 하려면 이어서 [문자로 보내기]를 눌러 주세요. 새 도구 의뢰는 쇼룸 맨 아래 [해주세요 · Q&amp;A] 창에 적어 주세요.</div>';
  }
  function send() {
    var ta = root.querySelector('#kh-rep'), t = ta.value.trim();
    if (!t) { toast('불편한 점을 한 줄이라도 적어 주세요'); ta.focus(); return; }
    var ok = saveReport(t);
    var body = '[KTS 도우미] 화면:' + path + ' / ' + t;
    root.querySelector('#kh-done').innerHTML = '<div class="kh-ok"><b>' + (ok ? '이 기기에 적어 두었습니다.' : '이 브라우저는 저장을 막아 두었습니다.') + '</b> 저희에게 바로 보내려면 아래를 눌러 주세요.</div>' +
      '<div class="kh-row"><a class="kh-b" id="kh-sms" href="' + esc(smsHref(body)) + '">문자로 보내기</a>' +
      '<a class="kh-b gh" href="https://autooneclick.com/" target="_blank" rel="noopener">쇼룸 \'해주세요\' 창</a></div>';
    ta.value = '';
  }

  function paintContact() {
    var p = root.querySelector('[data-kh-p="3"]');
    p.innerHTML = '<div class="kh-row" style="margin-top:0"><a class="kh-b" href="tel:' + TEL + '">전화 ' + TEL_SHOW + '</a>' +
      '<a class="kh-b gh" href="' + esc(smsHref('[KTS] ' + toolName() + ' 문의')) + '">문자 보내기</a></div>' +
      '<div class="kh-note" style="margin-top:9px">평일·주말 관계없이 문자 남겨 주시면 순서대로 답합니다.</div>';
  }

  function tab(i) {
    curTab = i;
    [].slice.call(root.querySelectorAll('[data-kh-t]')).forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-kh-t') === i); });
    [].slice.call(root.querySelectorAll('[data-kh-p]')).forEach(function (p) { p.classList.toggle('on', +p.getAttribute('data-kh-p') === i); });
  }
  function open(i) {
    buildPanel(); paintSteps(); tab(i || 0);
    root.classList.add('on');
  }
  function close() { if (root) root.classList.remove('on'); }
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && root && root.classList.contains('on')) close(); });

  /* ---------- 작성 중 안내 — 페이지가 KTS_HELPER.writing(fn) 으로 붙인다 ---------- */
  var G = { api: null, st: null, el: null, t: 0 };
  function guideState() {
    var st = null;
    try { st = G.api ? G.api() : null; } catch (e) { st = null; }
    return (st && st.active) ? st : null;
  }
  function guidePaint() {
    if (!btn) return;
    var st = G.st, on = !!st, mic = !!(on && st.mode === 'mic');
    btn.classList.toggle('kh-guide', on);
    btn.classList.toggle('kh-mic', mic);
    var b = btn.querySelector('b'), tip = btn.querySelector('.kh-tip');
    if (b) b.textContent = on ? (mic ? '🎤' : '👆') : '?';
    if (tip) tip.innerHTML = on
      ? esc(st.label || '이 칸') + (st.pos ? '<small>' + esc(st.pos) + (mic ? ' · 말해서 넣기' : ' · 눌러서 쓰기') + '</small>' : '')
      : '';
    btn.setAttribute('aria-label', on
      ? ('도우미 — ' + (mic ? '말해서 넣기' : ((st.label || '이 칸') + ' 가리키기')))
      : '도우미 — 60초 문의');
    if (G.el && G.el !== (st && st.el)) { try { G.el.classList.remove('kts-guidefld'); } catch (e) { } G.el = null; }
    if (st && st.el && st.el.nodeType === 1) { try { st.el.classList.add('kts-guidefld'); G.el = st.el; } catch (e) { } }
  }
  function guideSync() { G.st = guideState(); guidePaint(); }
  function guideSoon() { clearTimeout(G.t); G.t = setTimeout(guideSync, 40); }
  function bindGuide() {
    ['focusin', 'focusout', 'input', 'change'].forEach(function (k) {
      d.addEventListener(k, function (e) { if (root && root.contains(e.target)) return; guideSoon(); }, true);
    });
    d.addEventListener('click', function (e) { if ((btn && e.target === btn) || (root && root.contains(e.target)) || (q60 && q60.contains(e.target))) return; guideSoon(); }, true);
    setInterval(guideSync, 1200);   /* 단계 이동·자동 채움처럼 이벤트가 없는 변화까지 따라간다 */
  }
  function guideTap() {
    var st = G.st;
    if (!st) { openAsk(); return; }
    try { st.tap && st.tap(); } catch (e) { }
    setTimeout(guideSync, 140);
  }

  /* ---------- 60초 문의 — [?] 한 번에 바로 열린다 ---------- */
  var q60 = null;
  function q60Mem(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k) || '';
      if (v) localStorage.setItem(k, v);
    } catch (e) { }
    return '';
  }
  function buildAsk() {
    if (q60) return;
    q60 = d.createElement('div'); q60.id = 'kts-q60'; q60.setAttribute('role', 'dialog'); q60.setAttribute('aria-modal', 'true');
    q60.innerHTML =
      '<div class="q6-sh">' +
        '<div class="q6-hd"><b>60초 문의 · <i>' + esc(toolName()) + '</i></b><button type="button" class="q6-x" data-q6="close" aria-label="닫기">✕</button></div>' +
        '<p class="q6-sub">필요한 양식·기능을 한 줄로 적어 주세요. 되는 것은 다음 판에 넣고, 남기신 연락처로 순서대로 답해 드립니다.</p>' +
        '<label class="q6-lb" for="q6n">이름</label><input id="q6n" maxlength="20" autocomplete="name">' +
        '<label class="q6-lb" for="q6t">연락처</label><input id="q6t" maxlength="20" inputmode="tel" autocomplete="tel" placeholder="010-0000-0000">' +
        '<label class="q6-lb" for="q6m">문의 내용</label><textarea id="q6m" rows="3" maxlength="400" placeholder="예: 우리 업종 납품확인서 양식도 넣어 주세요"></textarea>' +
        '<div class="q6-row"><a class="q6-b" id="q6sms" href="' + esc(smsHref('[KTS] ' + toolName() + ' 문의')) + '">문자로 보내기</a>' +
        '<button type="button" class="q6-b gh" data-q6="save">기기에 담기</button></div>' +
        '<p class="q6-note" id="q6note">문자 앱이 열리고, 보내기는 손님이 직접 누릅니다. 이 화면에서 자동으로 보내지 않습니다.</p>' +
        '<button type="button" class="q6-more" data-q6="more">사용법 · 자주 묻는 질문 보기 →</button>' +
      '</div>';
    d.body.appendChild(q60);
    var n = q60.querySelector('#q6n'), t = q60.querySelector('#q6t'), m = q60.querySelector('#q6m');
    n.value = q60Mem('kts_q60_name'); t.value = q60Mem('kts_q60_tel');
    function body() {
      return '[KTS 60초 문의] ' + toolName() + '\n' +
        (n.value.trim() ? '이름: ' + n.value.trim() + '\n' : '') +
        (t.value.trim() ? '연락처: ' + t.value.trim() + '\n' : '') +
        '화면: ' + path + '\n' + (m.value.trim() || '(내용 없음)');
    }
    q60.addEventListener('input', function () {
      var a = q60.querySelector('#q6sms'); if (a) a.setAttribute('href', smsHref(body()));
    });
    q60.addEventListener('click', function (e) {
      if (e.target === q60) { closeAsk(); return; }
      var sms = e.target.closest('#q6sms');
      if (sms) {
        if (!m.value.trim()) { e.preventDefault(); toast('문의 내용을 한 줄이라도 적어 주세요'); m.focus(); return; }
        q60Mem('kts_q60_name', n.value.trim()); q60Mem('kts_q60_tel', t.value.trim());
        return;
      }
      var a = e.target.closest('[data-q6]'); if (!a) return;
      var act = a.getAttribute('data-q6');
      if (act === 'close') closeAsk();
      if (act === 'more') { closeAsk(); open(0); }
      if (act === 'save') {
        if (!m.value.trim()) { toast('문의 내용을 한 줄이라도 적어 주세요'); m.focus(); return; }
        q60Mem('kts_q60_name', n.value.trim()); q60Mem('kts_q60_tel', t.value.trim());
        var ok = saveReport('60초 문의 · ' + body());
        q60.querySelector('#q6note').textContent = ok
          ? '이 기기에 담았습니다. 바로 닿게 하려면 [문자로 보내기]를 눌러 주세요.'
          : '이 브라우저는 저장을 막아 두었습니다. [문자로 보내기]를 눌러 주세요.';
      }
    });
  }
  function openAsk() {
    buildAsk();
    if (root) root.classList.remove('on');
    q60.classList.add('on');
    var m = q60.querySelector('#q6m');
    if (m) setTimeout(function () { try { m.focus(); } catch (e) { } }, 120);
  }
  function closeAsk() { if (q60) q60.classList.remove('on'); }
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && q60 && q60.classList.contains('on')) closeAsk(); });

  w.KTS_HELPER = { v: '20261125a', key: KEY, tool: toolName, open: open, close: close, steps: steps, answer: answer, faq: FAQ, place: place, reportKey: REPORT_KEY,
    ask: openAsk, closeAsk: closeAsk,
    writing: function (fn) { G.api = (typeof fn === 'function') ? fn : null; guideSync(); },
    guideRefresh: guideSync };

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', build); else build();
})(window, document);

/* ==========================================================================
   171보강 ② 도구 상단 이름·소개 — 처음 1회만 펼침 (2026-11-24)
   대상: [data-kts-intro="<tool>"] 가 붙은 기존 제목 블록 하나(새 버튼 자리를 만들지 않는다 · 178-4)
   · 저장값 localStorage['kts_tool_intro_seen_<tool>'] 없음 → 펼친 채 시작, 3초 뒤 또는 첫 스크롤에 접힘 + 저장
   · 저장값 있음 → 접힌 채 시작(제목 1줄 + [?], 높이 44px 이하) · 누르면 다시 펼침/접힘(저장값은 그대로)
   ========================================================================== */
(function (w, d) {
  'use strict';
  function init() {
    var el = d.querySelector('[data-kts-intro]'); if (!el || el.getAttribute('data-kts-intro-on')) return;
    el.setAttribute('data-kts-intro-on', '1');
    var tool = el.getAttribute('data-kts-intro') || 'tool', KEY = 'kts_tool_intro_seen_' + tool;
    var st = d.createElement('style');
    st.textContent =
      '[data-kts-intro] .kts-intro-bar{display:none}' +
      '[data-kts-intro].kts-intro-c{padding-top:0!important;padding-bottom:0!important;cursor:pointer}' +
      '[data-kts-intro].kts-intro-c>*:not(.kts-intro-bar){display:none!important}' +
      '[data-kts-intro].kts-intro-c .kts-intro-bar{display:flex;align-items:center;gap:8px;height:42px;max-height:42px}' +
      '.kts-intro-bar span{flex:1;min-width:0;font-size:14px;font-weight:900;letter-spacing:-.4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.kts-intro-bar button{flex:0 0 auto;width:32px;height:32px;border-radius:9px;border:1px solid rgba(255,162,77,.6);background:rgba(255,107,0,.12);color:#FFA24D;font-family:inherit;font-size:14px;font-weight:900;line-height:1;cursor:pointer}' +
      '@media print{[data-kts-intro]{display:none!important}}';
    d.head.appendChild(st);
    var h = el.querySelector('h1,h2'), t = h ? (h.innerText || h.textContent || '').replace(/\s*\n\s*/g, ' ').trim() : '';
    var bar = d.createElement('div'); bar.className = 'kts-intro-bar';
    bar.innerHTML = '<span></span><button type="button" aria-label="소개 펼치기">?</button>';
    bar.firstChild.textContent = t;
    el.appendChild(bar);
    function set(c) { el.classList.toggle('kts-intro-c', c); el.setAttribute('aria-expanded', c ? 'false' : 'true'); }
    el.addEventListener('click', function (e) {
      if (el.classList.contains('kts-intro-c')) { set(false); return; }
      if (e.target.closest && e.target.closest('a,button,input,select,textarea,label')) return;   /* 펼친 상태의 원래 버튼·링크는 그대로 */
      set(true);
    });
    var seen = false; try { seen = !!w.localStorage.getItem(KEY); } catch (e) { }
    if (seen) { set(true); return; }
    set(false);
    var done = false;
    function fold() {
      if (done) return; done = true;
      try { w.localStorage.setItem(KEY, '1'); } catch (e) { }
      w.removeEventListener('scroll', fold);
      set(true);
    }
    setTimeout(fold, 3000);
    w.addEventListener('scroll', fold, { passive: true });
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init); else init();
})(window, document);
