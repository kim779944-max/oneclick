/* KTS 이커머스 원클릭 — AI 설정 (oneclick/ai.js와 같은 구조, 새로 작성)
   · 손님이 자기 열쇠를 넣으면 그 열쇠를 먼저 씁니다(localStorage 'kts_ai_key', 이 기기에만 저장).
   · 없으면 freekey.js의 무료 체험 열쇠(비어 있음). 둘 다 없으면 규칙 엔진만으로 끝까지 만듭니다. */
window.KTS_AI = {
  key: (function(){ var k=''; try{ k=localStorage.getItem('kts_ai_key')||''; }catch(e){}
    if(k && !/^__/.test(k)) return k;
    try{ if(window.KTS_FREE && window.KTS_FREE.p && window.KTS_FREE.p.length) return window.KTS_FREE.p.join(''); }catch(e){}
    return ''; })(),
  models: ['gemini-flash-lite-latest','gemini-3.1-flash-lite','gemini-3.5-flash','gemini-3.6-flash'],
  endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/',
  maxSide: 1600,
  dailyPerDevice: 12
};
