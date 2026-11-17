/* ============================================================
   독심술 v3.0 — 앵무새 린터 (R1~R9)
   목적: 결과 칸이 '고른 보기'를 되풀이하면 그 칸을 대체문장으로 교체한다.
   v3 변경: 대표님 확정 문체(~입니다 · 당신)를 허용하고, 판단 기준을
            '앵무새 0%'와 '진단·낙인 금지'로 좁혔다.
   ============================================================ */
(function(root){
  var STOP = ['그리고','하지만','그래서','정도','생각','마음','사람','때문','경우','부분','이런','저런','쪽','때문에','오늘','아침','낮','밤'];
  /* 진단·낙인·거리 호칭만 금지. '당신'은 대표님 모범 예시에 있으므로 허용한다. */
  var TABOO = ['성격장애','정신질환','우울증','불안장애','치료가 필요','진단','심리검사','장애','귀하','본인은'];
  var MARK = ['아니라','겉으','속으','때만','는데','지만','막상','정작'];
  var PARROT_TAIL = ['하는 쪽','하는 편','좋아하','선호','즐기','스타일'];
  var SPLIT = /[\s·,.!?~"'()\-—]+/;

  function toks(s){
    return String(s || '').split(SPLIT).filter(function(w){ return w.length >= 2; });
  }
  function inList(list, w){ return list.indexOf(w) !== -1; }

  function lintCell(cell, optLabels, kind){
    var errs = [];
    var S = String(cell || '').replace(/\s+/g, ' ').trim();
    var optSet = {};
    (optLabels || []).forEach(function(lb){ toks(lb).forEach(function(w){ optSet[w] = 1; }); });

    /* R1 고른 보기의 어절을 3개 이상 그대로 쓰면 앵무새 (2개는 생활 어휘 겹침으로 본다) */
    var hits = toks(S).filter(function(w){ return optSet[w] && !inList(STOP, w); });
    if (hits.length >= 3) errs.push('R1 보기 어절 3개 이상 재사용: ' + hits.join(','));

    /* R2 어절 1개 + 환언 꼬리 = 되풀이 */
    var parrot = PARROT_TAIL.some(function(k){ return S.indexOf(k) !== -1; });
    if (hits.length >= 1 && parrot) errs.push('R2 환언 꼬리');

    /* R3 보기 3어절 연속 인용 금지 */
    (optLabels || []).forEach(function(lb){
      var w = toks(lb);
      for (var i = 0; i + 2 < w.length; i++){
        if (S.indexOf(w.slice(i, i + 3).join(' ')) !== -1){ errs.push('R3 3어절 인용'); break; }
      }
    });

    /* R4 진단·낙인 금지 */
    if (TABOO.some(function(t){ return S.indexOf(t) !== -1; })) errs.push('R4 낙인·진단 표현');

    /* R5 '한 꺼풀 안쪽' 칸은 겉/속 대비가 있어야 한다 */
    if (kind === 'inner' && !MARK.some(function(m){ return S.indexOf(m) !== -1; }))
      errs.push('R5 안쪽 마커 없음');

    /* R6 한 문장 45자 초과 금지(큰 글씨 화면) */
    var sents = S.split(/(?<=[.!?])\s/).filter(function(x){ return x; });
    if (sents.some(function(x){ return x.length > 45; })) errs.push('R6 문장 45자 초과');

    /* R7 한 칸 3문장 초과 금지 */
    if (sents.length > 3) errs.push('R7 한 칸 3문장 초과');

    /* R8 한 칸에 '쪽' 2회(이어붙이기) 금지 */
    if ((S.split('쪽').length - 1) >= 2) errs.push('R8 이어붙이기');

    /* R9 빈 칸 금지 */
    if (!S) errs.push('R9 빈 칸');

    return errs;
  }

  var API = { lintCell: lintCell, toks: toks, RULES:{ STOP:STOP, TABOO:TABOO, MARK:MARK } };
  root.LINT = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
