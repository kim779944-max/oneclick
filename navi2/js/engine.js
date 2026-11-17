/* ============================================================
   독심술 v4.0 — 엔진 (32유형 채점 · 갈래 판정 · 3단 조립 · 공유)
   ① 4문항의 모든 선택을 같은 무게로 합산한다(1문항 독식 금지).
   ② 1위 결 + 갈래(확실·팽팽·반전·확장)로 8결 × 4갈래 = 32유형.
   ③ 서버 호출 0건. 답은 기기 밖으로 나가지 않습니다.
   ============================================================ */
(function(root){
  var C = root.CARDS, Q = root.Q, M = root.MODES, LINT = root.LINT, S = root.SUBS;

  var OPP = { SPEED:'PUTOFF', PUTOFF:'SPEED', EYE:'FACE', FACE:'EYE',
              CALC:'LOYAL', LOYAL:'CALC', PERFECT:'FREE', FREE:'PERFECT' };

  var FLAVOR_NM = { JEONG:'확실', HAP:'팽팽', BAN:'반전', HWAK:'확장' };

  /* 상대를 볼 때 — 같은 8결이라도 갈래가 다르면 첫 문장이 달라지게 하는 머리말 */
  var REL_LEAD = {
    JEONG: {},
    HAP:   { deal:'조건과 정을 반반으로 보는 사람입니다. ', love:'마음과 표현이 반씩인 사람입니다. ',
             senior:'앞뒤를 다 보는 분입니다. ', junior:'겉과 속이 반반인 사람입니다. ' },
    BAN:   { deal:'평소와 결정적인 자리에서 판단이 달라집니다. ', love:'평소와 다를 때가 진심인 사람입니다. ',
             senior:'평소와 결정적인 자리에서 달라지는 분입니다. ', junior:'평소와 결정적인 자리에서 달라집니다. ' },
    HWAK:  { deal:'혼자 정하기보다 여럿을 보는 사람입니다. ', love:'둘의 자리를 같이 보는 사람입니다. ',
             senior:'여럿을 함께 보는 분입니다. ', junior:'혼자보다 같이 가려는 사람입니다. ' }
  };

  var SAFE = {
    line:    '당신은 겉으로 다 말하지 않는 사람입니다.',
    inner:   '겉으로는 아무렇지 않은데, 속으로는 그 자리가 오래 남아 있으시죠.',
    strength:'맡은 자리에서 끝까지 해내는 힘이 있습니다.',
    softness:'그 마음이 커서 가끔 혼자 다 짊어집니다.',
    rx:      '오늘 할 일 하나를 정해서 끝까지 해 보세요.',
    good:    '미뤄 둔 일 하나가 생각보다 쉽게 풀립니다.',
    risk:    '말이 먼저 나가 한 번 되돌릴 자리가 생깁니다.',
    hedge:   '보내기 전 30초만 멈추는 규칙 하나로 충분합니다.',
    keep:    '이 사람의 강점을 먼저 말해 주세요.',
    avoid:   '단점을 직접 짚는 말은 피하세요.',
    script:  '이 한 가지만 정해 주시면 나머진 제가 하겠습니다'
  };

  function pad2(n){ return (n < 10 ? '0' : '') + n; }

  /* ── 날짜·시간·요일·나이대 ── */
  function context(now, birth){
    now = now || new Date();
    var y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate(), h = now.getHours();
    var bucket = (h >= 5 && h < 12) ? 'am' : (h >= 12 && h < 19) ? 'day' : 'night';
    var timeNoun = { am:'아침', day:'낮', night:'밤' }[bucket];
    var timeLead = { am:'오늘 아침엔', day:'오늘 낮엔', night:'오늘 밤엔' }[bucket];
    var dow = now.getDay();
    var dowNm = ['일','월','화','수','목','금','토'][dow] + '요일';
    var dayLead = (dow === 1 || dow === 2) ? '이번 주 초반엔' :
                  (dow === 3 || dow === 4) ? '주중엔' :
                  (dow === 5) ? '금요일엔' : '이번 주말엔';

    var age = null, band = 'unknown';
    if (birth && /^[0-9]{8}$/.test(String(birth))){
      var by = +String(birth).slice(0, 4), bm = +String(birth).slice(4, 6), bd = +String(birth).slice(6, 8);
      if (by > 1900 && bm >= 1 && bm <= 12 && bd >= 1 && bd <= 31){
        age = y - by - ((m < bm || (m === bm && d < bd)) ? 1 : 0);
        band = age >= 60 ? 'senior' : age >= 40 ? 'mid' : 'young';
      }
    }
    return {
      date: y + '-' + pad2(m) + '-' + pad2(d),
      dateKo: m + '월 ' + d + '일 ' + dowNm,
      brief: m + '월 ' + dowNm + ' ' + timeNoun,
      month: m, weekday: dowNm, bucket: bucket, timeNoun: timeNoun,
      timeLead: timeLead, dayLead: dayLead,
      age: age, band: band,
      bandLabel: { young:'20·30대', mid:'40·50대', senior:'60대 이상', unknown:'나이 미입력' }[band]
    };
  }

  /* ── 채점: 네 문항을 같은 무게로 합산(1순위 3 · 2순위 1) ── */
  function score(picks){
    var s = {}, first = {}, order = [];
    picks.forEach(function(p){
      var t = p.opt.t;
      if (!(t in s)){ s[t] = 0; first[t] = 0; order.push(t); }
      s[t] += (p.rank === 1 ? 3 : 1);
      if (p.rank === 1) first[t] += 1;
    });
    var arr = order.map(function(t, i){ return { t:t, v:s[t], f:first[t], i:i }; });
    arr.sort(function(a, b){ return (b.v - a.v) || (b.f - a.f) || (a.i - b.i); });
    var top = arr[0] ? arr[0].v : 0, second = arr[1] ? arr[1].v : 0;
    return {
      primary: arr[0] ? arr[0].t : null,
      secondary: arr[1] ? arr[1].t : null,
      gap: top - second,
      rank: arr,
      scores: s
    };
  }

  /* ── 갈래: 1위 결이 위기(L3)·보상(L4)에서도 같은가 ──
     JEONG 확실 — 위기와 보상에서도 같은 결
     HAP   팽팽 — 1·2위가 동점
     BAN   반전 — 위기나 보상에서 반대 결이 나옴
     HWAK  확장 — 위기·보상에서 옆 결이 나옴                        */
  function flavorOf(sc, picks){
    var base = sc.primary;
    if (sc.gap === 0) return 'HAP';
    var l3 = picks[2] && picks[2].opt ? picks[2].opt.t : null;
    var l4 = picks[3] && picks[3].opt ? picks[3].opt.t : null;
    var opp = OPP[base];
    if (l3 === opp || l4 === opp) return 'BAN';
    if (l3 === base && l4 === base) return 'JEONG';
    return 'HWAK';
  }

  function hash(str){
    var h = 0;
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 999983;
    return h;
  }

  /* ── 3단 조립 ── */
  function compose(mode, picks, birth, now){
    var ctx = context(now, birth);
    var sc = score(picks);
    var primary = sc.primary, secondary = sc.secondary;
    var flavor = flavorOf(sc, picks);
    var card = C[primary];
    var sub = (S[primary] && S[primary][flavor]) || null;
    if (!sub){ /* 자료가 없을 때만 기본 문장으로 */ flavor = 'JEONG'; sub = S[primary][flavor]; }
    var band = ctx.band === 'unknown' ? 'mid' : ctx.band;
    var labels = picks.map(function(p){ return p.opt.label; });
    var code = picks.filter(function(p){ return p.rank === 1; }).map(function(p){ return p.idx; }).join('');
    var seed = hash(primary + '|' + flavor + '|' + band + '|' + ctx.date + '|' + ctx.bucket + '|' + code);
    var fixed = [];

    function put(text, kind, safeKey){
      var errs = LINT ? LINT.lintCell(text, labels, kind) : [];
      if (!errs.length) return text;
      var fb = SAFE[safeKey || kind];
      if (fb && !LINT.lintCell(fb, labels, kind).length){ fixed.push({ key:safeKey || kind, errs:errs, from:text, to:fb }); return fb; }
      fixed.push({ key:safeKey || kind, errs:errs, from:text, to:text });
      return text;
    }
    function join(text, extra, kind){
      if (!extra) return text;
      var merged = text + ' ' + extra;
      if (LINT && LINT.lintCell(merged, labels, kind).length) return text;
      return merged;
    }

    var view = {};
    view.ex = sub.ex || '';   /* 생활 속 예시 — v4.1 신규(쉬운 말 개편) */
    if (mode === 'self'){
      view.line = put(sub.line[band] || sub.line.mid, 'summary', 'line');
      view.inner = put(sub.inner, 'inner', 'inner');
      view.strength = put(sub.strength, 'body', 'strength');
      view.softness = put(sub.softness, 'body', 'softness');
      view.rx = put(sub.rx, 'body', 'rx');
      view.good = put(ctx.timeLead + ' ' + card.good[band], 'body', 'good');
      view.risk = put(ctx.dayLead + ' ' + card.risk[band], 'body', 'risk');
      view.hedge = put(card.hedge[band], 'body', 'hedge');
    } else {
      var r = card.rel[mode];
      view.line = put((REL_LEAD[flavor] && REL_LEAD[flavor][mode] ? REL_LEAD[flavor][mode] : '') + r.line, 'summary', 'line');
      view.inner = put(sub.inner, 'inner', 'inner');
      view.keep = put(r.keep, 'body', 'keep');
      view.avoid = put(r.avoid, 'body', 'avoid');
      view.script = put((sub.script && sub.script[mode]) || r.script, 'body', 'script');
    }

    return {
      mode: mode, modeNm: M[mode].nm, ctx: ctx, code: code, ex: sub.ex || '',
      card: primary + '-' + flavor, base: primary,
      cardName: sub.nm, cardNo: sub.no, cardSub: sub.sub, img: card.img,
      flavor: flavor, flavorNm: FLAVOR_NM[flavor],
      primary: primary, secondary: sc.gap === 0 ? secondary : null,
      tie: sc.gap === 0, band: band,
      next: (sc.rank[1] ? { nm: (S[sc.rank[1].t] && S[sc.rank[1].t][flavorOf(sc, picks)] ? S[sc.rank[1].t][flavorOf(sc, picks)].nm : C[sc.rank[1].t].name) } : null),
      view: view, fixed: fixed,
      picks: picks.map(function(p){ return { lv:p.lv, idx:p.idx, rank:p.rank, label:p.opt.label, t:p.opt.t }; })
    };
  }

  /* ── 공유 ── */
  function b64enc(str){
    try { return btoa(unescape(encodeURIComponent(str))).replace(/=+$/, ''); } catch (e) { return ''; }
  }
  function b64dec(str){
    try { return decodeURIComponent(escape(atob(str))); } catch (e) { return ''; }
  }
  function shareLink(mode, res){
    var payload = { m:mode, c:res.card, n:res.cardName, s:res.view.line, j:res.view.inner };
    return '#r=' + b64enc(JSON.stringify(payload));
  }
  function readShare(hashStr){
    var m = /#r=([A-Za-z0-9+/_-]+)/.exec(hashStr || '');
    if (!m) return null;
    try {
      var o = JSON.parse(b64dec(m[1]));
      if (!o || !o.s) return null;
      return o;
    } catch (e) { return null; }
  }

  /* ── 최근 결과 (기기에만) ── */
  var HKEY = 'doksim_v4_history';
  function loadHistory(){
    try { var v = JSON.parse(localStorage.getItem(HKEY) || '[]'); return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  }
  function saveHistory(entry){
    var list = loadHistory();
    list.unshift(entry);
    list = list.slice(0, 20);
    try { localStorage.setItem(HKEY, JSON.stringify(list)); } catch (e) {}
    return list;
  }

  function questionAt(mode, lv, variant){
    var table = Q[mode][lv] || {};
    return table[variant] || table['*'] || null;
  }

  function typeCount(){
    var n = 0;
    for (var k in S) n += Object.keys(S[k]).length;
    return n;
  }

  var APP = {
    context: context, score: score, compose: compose, questionAt: questionAt, flavorOf: flavorOf,
    shareLink: shareLink, readShare: readShare, loadHistory: loadHistory, saveHistory: saveHistory,
    typeCount: typeCount, OPP: OPP, SAFE: SAFE, CARDS: C, Q: Q, MODES: M, SUBS: S, FLAVOR_NM: FLAVOR_NM
  };
  root.APP = APP;
  if (typeof module !== 'undefined' && module.exports) module.exports = APP;
})(typeof window !== 'undefined' ? window : globalThis);
