/* ============================================================
   독심술 v2.0 — 엔진 (그림 16 시작 · 교차/분기 스무고개 10층 · 4방향 결과)
   ① 시작 그림 16장의 선택을 1차 가중치로 먹고, 10층 질문으로 점점 좁힌다.
   ② 층마다 선두 결의 갈래(A/B/C/D)에 따라 질문과 보기가 통째로 바뀐다.
   ③ 결과: 비밀 발췌(본인 고른 말 → 다른 말 풀이) → 강점 → 4방향(소름·예언·경고·예방).
   ④ 서버 호출 0건. 답은 기기 밖으로 나가지 않습니다.
   ============================================================ */
(function(root){
  var NAVI = root.NAVI || {};
  var C = root.CARDS, S = root.SUBS, M = root.MODES, LINT = root.LINT;
  var AXES = ['SPEED','PUTOFF','EYE','FACE','CALC','LOYAL','PERFECT','FREE'];

  var OPP = { SPEED:'PUTOFF', PUTOFF:'SPEED', EYE:'FACE', FACE:'EYE',
              CALC:'LOYAL', LOYAL:'CALC', PERFECT:'FREE', FREE:'PERFECT' };
  var FLAVOR_NM = { JEONG:'확실', HAP:'팽팽', BAN:'반전', HWAK:'확장' };
  var FLAV = ['JEONG','HAP','BAN','HWAK'];

  /* 갈래 묶음 — 다음 층의 보기를 고르는 단위 */
  var GROUPS = {
    A:['SPEED','PERFECT'],   /* 밀어붙임·완성 */
    B:['CALC','FACE'],       /* 실속·인정 */
    C:['LOYAL','EYE'],       /* 사람·관찰 */
    D:['FREE','PUTOFF']      /* 자유·여유 */
  };
  var GROUP_NM = { A:'밀어붙임·완성', B:'실속·인정', C:'사람·관찰', D:'자유·여유' };

  var TOTAL = 10;

  var REL_LEAD = {
    JEONG: {},
    HAP:   { deal:'조건과 정을 반반으로 보는 사람입니다. ', love:'마음과 표현이 반씩인 사람입니다. ',
             senior:'앞뒤를 다 보는 분입니다. ', junior:'겉과 속이 반반인 사람입니다. ' },
    BAN:   { deal:'평소와 결정적인 자리에서 판단이 달라집니다. ', love:'평소와 다를 때가 진심인 사람입니다. ',
             senior:'평소와 결정적인 자리에서 달라지는 분입니다. ', junior:'평소와 결정적인 자리에서 달라집니다. ' },
    HWAK:  { deal:'혼자 정하기보다 여럿을 보는 사람입니다. ', love:'둘의 자리를 같이 보는 사람입니다. ',
             senior:'여럿을 함께 보는 분입니다. ', junior:'혼자보다 같이 가려는 사람입니다. ' }
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

  function groupOf(axis){
    for (var g in GROUPS) if (GROUPS[g].indexOf(axis) !== -1) return g;
    return 'A';
  }

  /* ── 채점: 그림(1차) + 문항(1차) + 망설임(보정)을 한 그릇에 합산 ── */
  function score(state){
    var s = {}, total = 0;
    AXES.forEach(function(a){ s[a] = 0; });
    function add(t, w){ if (!t || !(t in s)) return; s[t] += w; total += w; }

    (state.pics || []).forEach(function(p){ add(p.t, 1.8); add(p.t2, 0.6); });
    (state.picks || []).forEach(function(k){ add(k.t, 1.0); add(k.t2, 0.32); });
    /* 망설임: 다시 고름 = 한 번 더 확인하는 사람(EYE), 오래 고름 = 벼리는 사람(PERFECT) */
    (state.hesit || []).forEach(function(h){
      if (h.repick) add('EYE', 0.32);
      if (h.slow)   add('PERFECT', 0.32);
    });

    var arr = AXES.map(function(a, i){ return { t:a, v:s[a] || 0, i:i }; });
    arr.sort(function(a, b){ return (b.v - a.v) || (a.i - b.i); });
    var top = arr[0].v, second = arr[1] ? arr[1].v : 0;
    var picks = state.picks || [];
    var lead = 0;
    picks.forEach(function(k){ if (k.t === arr[0].t) lead++; });
    return {
      primary: arr[0].t, secondary: arr[1] ? arr[1].t : null,
      gap: top - second, rank: arr, scores: s,
      total: total || 1, share: top / (total || 1),
      lead: lead, answers: picks.length
    };
  }

  /* ── 갈래(확실·팽팽·반전·확장) ── */
  function flavorOf(sc){
    if (sc.gap < 0.55) return 'HAP';
    if (sc.rank[1] && sc.rank[1].t === OPP[sc.primary]) return 'BAN';
    if (sc.rank[1] && sc.rank[1].v >= sc.rank[0].v * 0.62) return 'HWAK';
    return 'JEONG';
  }

  /* ── 다음 층 보기 고르기: 선두 갈래의 벌 → (없으면) 기본 벌 ── */
  function setFor(lv, state){
    var table = (root.NAVI.Q || {})[lv];
    if (!table) return null;
    var keys = Object.keys(table);
    if (!state) return table['*'] || table[keys[0]];
    var g = groupOf(score(state).primary);
    return table[g] || table['*'] || table[keys[0]];
  }

  function hash(str){
    var h = 0;
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 999983;
    return h;
  }

  /* ── 결과 조립 ── */
  function compose(mode, state, birth, now){
    var NAV = root.NAVI, FATE = NAV.FATE;
    var ctx = context(now, birth);
    var sc = score(state);
    var primary = sc.primary;
    var flavor = flavorOf(sc);
    var sub = (S[primary] && S[primary][flavor]) ? S[primary][flavor] : S[primary].JEONG;
    var card = C[primary];
    var band = ctx.band === 'unknown' ? 'mid' : ctx.band;
    var isSelf = mode === 'self';

    /* 64유형: 8결 × 4갈래 × 강/약 */
    var pol = (sc.answers > 0 && sc.lead * 2 >= sc.answers) ? '강' : '약';
    var lvl = Math.max(1, Math.min(6, 1 + Math.floor((sc.share - 0.16) / 0.05)));
    var idx32 = AXES.indexOf(primary) * 4 + FLAV.indexOf(flavor);
    if (idx32 < 0) idx32 = 0;
    var tno = idx32 * 2 + (pol === '강' ? 0 : 1) + 1;

    /* ① 시작 그림 → 지금 마음의 방향 */
    var pics = state.pics || [];
    var cw = {};
    pics.forEach(function(p){
      var c1 = FATE.CLUSTER_OF[p.t], c2 = FATE.CLUSTER_OF[p.t2];
      if (c1) cw[c1] = (cw[c1] || 0) + 1;
      if (c2) cw[c2] = (cw[c2] || 0) + 0.35;
    });
    var cList = Object.keys(cw).sort(function(a, b){ return cw[b] - cw[a]; });
    var ck = cList[0] || null;
    var interest = ck ? {
      key: ck, nm: FATE.CLUSTER[ck].nm, line: FATE.CLUSTER[ck].line, why: FATE.CLUSTER[ck].why,
      second: cList[1] ? FATE.CLUSTER[cList[1]].nm : null,
      count: pics.length, pics: pics.slice(0, 6),
      note: pics.length <= 1 ? FATE.PIC_NOTE.one : pics.length <= 3 ? FATE.PIC_NOTE.few : FATE.PIC_NOTE.many
    } : null;

    /* ② 비밀 발췌 — 본인이 고른 말 중 '선두 결'을 받쳐 주는 셋을 가져와 다른 말로 푼다 */
    var picks = state.picks || [];
    var want = [];
    function push(k){ if (!k) return; if (want.indexOf(k) === -1) want.push(k); }
    picks.filter(function(k){ return k.t === primary; }).forEach(function(k){ if (want.length < 3) push(k); });
    picks.filter(function(k){ return k.t !== primary && k.t2 === primary; }).forEach(function(k){ if (want.length < 3) push(k); });
    if (want.length < 3) push(picks[0]);
    if (want.length < 3) push(picks[picks.length - 1]);
    picks.forEach(function(k){ if (want.length < 3) push(k); });
    var allSame = want.slice(0, 3).every(function(k){ return k.t === primary; });
    var excerpt = want.slice(0, 3).sort(function(a, b){ return a.lv - b.lv; }).map(function(k){
      return { lv:k.lv, l:k.l, p:k.p || '', t:k.t };
    });

    var view = {
      teaser: isSelf ? (sub.line[band] || sub.line.mid)
                     : (REL_LEAD[flavor] && REL_LEAD[flavor][mode] ? REL_LEAD[flavor][mode] : '') + card.rel[mode].line,
      interest: interest,
      secretCap: isSelf ? FATE.COPY.secret : FATE.COPY.secretOther,
      excerpt: excerpt,
      bridge: allSame ? FATE.COPY.bridge : FATE.COPY.bridgeMixed,
      bridgeMixed: !allSame,
      read: FATE.READ[primary],
      strengthCap: FATE.COPY.strengthCap,
      strength: sub.strength,
      softness: sub.softness,
      ex: sub.ex,
      rx: sub.rx,
      past: FATE.PAST[primary][band],
      soon: ctx.timeLead + ' ' + card.good[band],
      risk: ctx.dayLead + ' ' + card.risk[band],
      hedge: card.hedge[band],
      fourCap: FATE.COPY.fourCap,
      keep: card.rel[isSelf ? 'love' : mode] ? card.rel[isSelf ? 'love' : mode].keep : card.rel.deal.keep,
      avoid: card.rel[isSelf ? 'love' : mode] ? card.rel[isSelf ? 'love' : mode].avoid : card.rel.deal.avoid,
      script: (sub.script && sub.script[isSelf ? 'love' : mode]) || card.rel[isSelf ? 'love' : mode].script
    };
    if (!isSelf){
      view.teaser = (REL_LEAD[flavor] && REL_LEAD[flavor][mode] ? REL_LEAD[flavor][mode] : '') + card.rel[mode].line;
      view.keep = card.rel[mode].keep;
      view.avoid = card.rel[mode].avoid;
      view.script = (sub.script && sub.script[mode]) || card.rel[mode].script;
    }

    /* 증거 칩: 몇 문항에서 같은 결이 나왔는지 · 망설임 */
    var hesit = state.hesit || [];
    var repicks = hesit.filter(function(h){ return h.repick; }).length;
    var slow = hesit.filter(function(h){ return h.slow; }).length;

    return {
      mode: mode, modeNm: M[mode].nm, ctx: ctx,
      card: primary + '-' + flavor, base: primary,
      cardName: sub.nm, cardNo: sub.no, cardSub: sub.sub, img: card.img,
      flavor: flavor, flavorNm: FLAVOR_NM[flavor],
      tno: tno, pol: pol, lvl: lvl, share: sc.share, typeTotal: 64,
      primary: primary, secondary: sc.gap === 0 ? sc.secondary : null,
      tie: sc.gap === 0, band: band,
      lead: sc.lead, answers: sc.answers, repicks: repicks, slow: slow,
      group: groupOf(primary), groupNm: GROUP_NM[groupOf(primary)],
      scores: sc.scores,
      next: (sc.rank[1] ? { nm: (S[sc.rank[1].t] && S[sc.rank[1].t][flavor] ? S[sc.rank[1].t][flavor].nm : C[sc.rank[1].t].name) } : null),
      view: view,
      picks: picks.map(function(k){ return { lv:k.lv, l:k.l, t:k.t, t2:k.t2 }; })
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
    var payload = { m:mode, c:res.card, n:res.cardName, s:res.view.teaser, j:res.view.read };
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
  var HKEY = 'doksim_v6_history';
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

  /* ── 보기 풀 통계(실측·검증용) ── */
  function poolStats(){
    var QS = root.NAVI.Q, sets = 0, opts = 0, bad = [], byAxis = {}, lvSets = {};
    for (var lv in QS){
      lvSets[lv] = Object.keys(QS[lv]);
      for (var k in QS[lv]){
        sets++;
        var o = QS[lv][k].opts || [];
        opts += o.length;
        var seen = {};
        o.forEach(function(x){
          byAxis[x.t] = (byAxis[x.t] || 0) + 1;
          if (seen[x.t]) bad.push(lv + k + ' 축 중복:' + x.t);
          seen[x.t] = 1;
          if (o.length === 4 && Object.keys(seen).length === 4 && false) {}
        });
        if (o.length !== 4) bad.push(lv + k + ' 보기 4개 아님');
        if (!QS[lv][k].q) bad.push(lv + k + ' 질문 없음');
      }
    }
    return { pics: root.NAVI.START.length, sets: sets, options: opts, pool: opts + root.NAVI.START.length,
             axes: byAxis, levels: Object.keys(QS).length, lvSets: lvSets, bad: bad };
  }

  var APP = {
    context: context, score: score, compose: compose, setFor: setFor, flavorOf: flavorOf, groupOf: groupOf,
    GROUPS: GROUPS, GROUP_NM: GROUP_NM, AXES: AXES, OPP: OPP, FLAVOR_NM: FLAVOR_NM,
    shareLink: shareLink, readShare: readShare, loadHistory: loadHistory, saveHistory: saveHistory,
    typeCount: function(){ return 64; }, TOTAL: TOTAL, poolStats: poolStats,
    CARDS: C, MODES: M, SUBS: S
  };
  root.APP = APP;
  if (typeof module !== 'undefined' && module.exports) module.exports = APP;
})(typeof window !== 'undefined' ? window : globalThis);
