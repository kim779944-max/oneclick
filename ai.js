/* KTS 원클릭 — AI 설정 (배포용)
   · 저장소에는 키를 두지 않습니다. 기기에서 localStorage 'kts_ai_key' 에 넣은 키만 사용합니다.
   · 키가 없으면 AI 변환을 눌렀을 때 안내 문구만 뜨고, 붙여넣기 변환으로 그대로 쓸 수 있습니다. */
window.KTS_AI = {
  key: (function(){ try {
    return localStorage.getItem('kts_ai_key') || localStorage.getItem('kts_gemini_key') || '';
  } catch(e){ return ''; } })(),
  models: ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.1-flash-lite'],
  endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/',
  maxSide: 1800,          // 사진 긴 변 축소(전송량↓, 속도↑)
  dailyPerDevice: 12      // 기기당 1일 체험 횟수
};
