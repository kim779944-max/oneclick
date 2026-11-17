/* KTS 원클릭 — AI 설정 (배포용)
   · 손님이 자기 열쇠를 넣으면 그 열쇠를 먼저 씁니다(localStorage 'kts_ai_key').
   · 없으면 freekey.js의 무료 체험 열쇠를 씁니다(있을 때만).
   · 둘 다 없으면 AI 변환 버튼은 안내만 하고, 기기 안 인식·붙여넣기로 그대로 쓸 수 있습니다. */
window.KTS_AI = {
  key: (function(){
    var k = '';
    try { k = localStorage.getItem('kts_ai_key') || localStorage.getItem('kts_gemini_key') || ''; } catch(e){}
    if (k && !/^__/.test(k)) return k;
    try {
      if (window.KTS_FREE && window.KTS_FREE.p && window.KTS_FREE.p.length) return window.KTS_FREE.p.join('');
    } catch(e){}
    return '';
  })(),
  models: ['gemini-flash-lite-latest', 'gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-3.6-flash'],
  endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/',
  maxSide: 1800,          // 사진 긴 변 축소(전송량↓, 속도↑)
  dailyPerDevice: 12      // 기기당 1일 체험 횟수
};
