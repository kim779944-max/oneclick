/* ==========================================================================
   AI 영업 비서 (능동형) — 매물 상세에서 손님과 이야기한다
   ① 관심 상세 조사 : 예산·면적·용도를 물어 조건을 정리
   ② 비슷한 물건 제의 : 사장님 매물장 안에서 조건이 가까운 매물을 즉시 추천
   ③ 요구 전달 : 가격·답사·서류 요구를 정리해 사장님께 문자/저장으로 넘긴다
   · 서버·외부 AI 호출 없이 화면 안에서 도는 대화 엔진이다(문구는 정해진 틀).
   ========================================================================== */
(function (g) {
  'use strict';

  var C = null;                 /* {item, items, me, saveInquiry, openItem} */
  var cond = { budget: '', area: '', purpose: '' };
  var logEl = null, chipEl = null, inputWrap = null;

  var BUDGETS = [
    { k: '1억 이하', min: 0, max: 1e8 },
    { k: '1~3억', min: 1e8, max: 3e8 },
    { k: '3~5억', min: 3e8, max: 5e8 },
    { k: '5억 이상', min: 5e8, max: 1e12 }
  ];
  var AREAS = [
    { k: '300평 이하', min: 0, max: 300 },
    { k: '300~1,000평', min: 300, max: 1000 },
    { k: '1,000평 이상', min: 1000, max: 1e9 },
    { k: '상관없어요', min: 0, max: 1e9 }
  ];
  var PURPOSES = ['전원주택', '투자', '농사·영농', '공장·창고', '상가·사업'];

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function scroll() { if (logEl) logEl.scrollTop = logEl.scrollHeight; }

  function bot(text, delay) {
    return new Promise(function (res) {
      var t = el('div', 'msg bot typing', '···');
      logEl.appendChild(t); scroll();
      setTimeout(function () {
        t.className = 'msg bot'; t.textContent = text; scroll(); res();
      }, delay == null ? 420 : delay);
    });
  }

  function guest(text) {
    var t = el('div', 'msg me', text);
    logEl.appendChild(t); scroll();
  }

  function chips(list, keep) {
    chipEl.innerHTML = '';
    list.forEach(function (c) {
      var b = el('button', 'chip', c.label);
      b.type = 'button';
      b.addEventListener('click', function () {
        if (!keep) chipEl.innerHTML = '';
        c.act();
      });
      chipEl.appendChild(b);
    });
  }

  function card(x) {
    var w = el('button', 'ai-item');
    w.type = 'button';
    var th = el('div', 'ai-th');
    var m = x.map || (x.lat && x.lon && window.KTS_GB ? window.KTS_GB.mapUrl(x.lat, x.lon, 280, 220, 15) : '');
    if (m) { var im = el('img'); im.src = m; im.alt = ''; im.loading = 'lazy'; th.appendChild(im); }
    else th.textContent = (x.kind || '매물').slice(0, 2);
    var body = el('div', 'ai-bd');
    body.appendChild(el('b', null, x.title || '매물'));
    body.appendChild(el('span', null, money(x.price) + (x.areaP ? ' · ' + x.areaP.toLocaleString('ko-KR') + '평' : '')));
    w.appendChild(th); w.appendChild(body);
    w.addEventListener('click', function () { C.openItem(x.id); });
    logEl.appendChild(w); scroll();
  }

  function money(v) {
    if (!v) return '가격 미정';
    var eok = Math.floor(v / 1e8), man = Math.round((v % 1e8) / 1e4);
    if (eok && man) return eok + '억 ' + man.toLocaleString('ko-KR') + '만';
    if (eok) return eok + '억';
    return Math.round(v / 1e4).toLocaleString('ko-KR') + '만';
  }

  function band(b, v) { return v != null && v >= b.min && v < b.max; }

  function similarList(item, items) {
    return items.filter(function (x) { return x.id !== item.id; }).map(function (x) {
      var s = 0;
      if (item.kind && x.kind && item.kind === x.kind) s += 3;
      if (item.areaP && x.areaP) {
        var d = Math.abs(x.areaP - item.areaP) / item.areaP;
        s += d < 0.3 ? 3 : (d < 0.6 ? 2 : (d < 1 ? 1 : 0));
      }
      if (item.price && x.price) {
        var p = Math.abs(x.price - item.price) / item.price;
        s += p < 0.3 ? 3 : (p < 0.6 ? 2 : (p < 1 ? 1 : 0));
      }
      return { x: x, s: s };
    }).sort(function (a, b) { return b.s - a.s; }).filter(function (o) { return o.s > 0; })
      .slice(0, 2).map(function (o) { return o.x; });
  }

  function matching() {
    var b = null, a = null;
    BUDGETS.forEach(function (x) { if (x.k === cond.budget) b = x });
    AREAS.forEach(function (x) { if (x.k === cond.area) a = x });
    return (C.items || []).filter(function (x) {
      if (x.id === C.item.id) return false;
      if (b && x.price && !band(b, x.price)) return false;
      if (a && x.areaP && !band(a, x.areaP)) return false;
      return true;
    }).slice(0, 3);
  }

  function condText() {
    var p = [];
    if (cond.budget) p.push('예산 ' + cond.budget);
    if (cond.area) p.push('면적 ' + cond.area);
    if (cond.purpose) p.push('용도 ' + cond.purpose);
    return p.join(' · ');
  }

  /* ---------- 대화 단계 ---------- */
  function menu() {
    chips([
      { label: '관심 매물 자세히 조사', act: startSurvey },
      { label: '비슷한 물건 더 보기', act: showSimilar },
      { label: '사장님께 요구 전달', act: startRequest }
    ], true);
  }

  function startSurvey() {
    guest('관심 매물 자세히 조사');
    cond = { budget: '', area: '', purpose: '' };
    bot('찾으시는 조건 세 가지만 여쭐게요. 지금 보시는 매물과 맞춰 드릴게요.').then(function () {
      bot('① 예산은 어느 정도로 보세요?', 260).then(function () {
        chips(BUDGETS.map(function (b) {
          return { label: b.k, act: function () { cond.budget = b.k; guest(b.k); askArea(); } };
        }), true);
      });
    });
  }

  function askArea() {
    bot('② 필요하신 면적은요?', 260).then(function () {
      chips(AREAS.map(function (a) {
        return { label: a.k, act: function () { cond.area = a.k; guest(a.k); askPurpose(); } };
      }), true);
    });
  }

  function askPurpose() {
    bot('③ 어떤 용도로 보시나요?', 260).then(function () {
      chips(PURPOSES.map(function (p) {
        return { label: p, act: function () { cond.purpose = p; guest(p); finishSurvey(); } };
      }).concat([{ label: '아직 못 정했어요', act: function () { cond.purpose = '미정'; guest('아직 못 정했어요'); finishSurvey(); } }]), true);
    });
  }

  function finishSurvey() {
    var list = matching();
    chipEl.innerHTML = '';
    bot('정리했습니다 — ' + condText() + '.').then(function () {
      if (list.length) {
        bot('이 조건에 가까운 매물 ' + list.length + '건이 사장님 매물장에 있습니다.', 320).then(function () {
          list.forEach(card);
          afterList();
          menu();
        });
      } else {
        bot('지금 매물장에는 딱 맞는 물건이 없습니다. 조건을 사장님께 그대로 전해 두면 새로 들어오는 물건을 먼저 보내 드립니다.', 320).then(function () {
          actionRow();
          menu();
        });
      }
    });
  }

  function afterList() {
    var row = el('div', 'msg actionrow');
    var b1 = el('button', 'btn sm', '이 조건 사장님께 전달');
    b1.addEventListener('click', function () {
      C.saveInquiry({
        itemId: C.item.id, itemTitle: C.item.title,
        text: '관심 조건: ' + condText()
      }, 'cond');
      bot('전달했습니다. 사장님께서 조건에 맞는 물건을 먼저 챙겨 보내 드릴 겁니다.').then(menu);
    });
    row.appendChild(b1);
    logEl.appendChild(row); scroll();
  }

  function showSimilar() {
    guest('비슷한 물건 더 보기');
    var list = similarList(C.item, C.items || []);
    if (!list.length) {
      bot('지금 매물장에는 비슷한 물건이 아직 없습니다. 새로 들어오면 알려 드릴까요?').then(function () {
        chips([{ label: '새 물건 나오면 알려 주세요', act: function () {
          guest('새 물건 나오면 알려 주세요');
          C.saveInquiry({ itemId: C.item.id, itemTitle: C.item.title, text: '비슷한 물건 알림 요청' }, 'alert');
          bot('신청했습니다. 조건에 맞는 새 매물이 올라오면 사장님이 먼저 연락 드립니다.').then(menu);
        } }], true);
      });
      return;
    }
    bot('이 매물과 조건이 비슷한 ' + list.length + '건입니다.', 300).then(function () {
      list.forEach(card);
      menu();
    });
  }

  function startRequest() {
    guest('사장님께 요구 전달');
    bot('무엇을 전달할까요? 하나만 골라 주세요.').then(function () {
      chips([
        { label: '가격 조정 요청', act: function () { guest('가격 조정 요청'); freeText('가격', '희망하시는 금액을 적어 주세요. 예) 3억 4천까지 가능한지'); } },
        { label: '답사 신청', act: function () { guest('답사 신청'); freeText('답사', '가능한 날짜·시간을 적어 주세요. 예) 토요일 오전'); } },
        { label: '서류 요청', act: function () { guest('서류 요청'); freeText('서류', '필요한 서류를 적어 주세요. 예) 등기부등본, 토지대장'); } },
        { label: '그 밖의 질문', act: function () { guest('그 밖의 질문'); freeText('질문', '궁금한 점을 적어 주세요.'); } }
      ], false);
    });
  }

  function freeText(kind, hint) {
    inputWrap.hidden = false;
    var input = inputWrap.querySelector('input');
    var send = inputWrap.querySelector('button');
    input.value = ''; input.placeholder = hint;
    input.focus();
    function submit() {
      var v = input.value.trim();
      if (!v) { input.focus(); return; }
      inputWrap.hidden = true;
      chipEl.innerHTML = '';
      guest(v);
      var summary = '[' + kind + '] ' + v + (condText() ? ' / 관심 조건: ' + condText() : '');
      bot('이렇게 전달할게요 —\n' + summary).then(function () { actionRow(kind, v); });
    }
    send.onclick = submit;
    input.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); submit(); } };
  }

  function actionRow(kind, text) {
    var row = el('div', 'msg actionrow');
    var b1 = el('button', 'btn sm main', '사장님께 문자로 보내기');
    b1.type = 'button';
    b1.addEventListener('click', function () {
      if (!C.me || !C.me.phone) { bot('사장님 전화번호가 명함에 없습니다.').then(menu); return; }
      var body = composeBody(kind, text);
      C.saveInquiry({ itemId: C.item.id, itemTitle: C.item.title, text: body }, 'msg');
      location.href = 'sms:' + C.me.phone.replace(/[^0-9]/g, '') + '?body=' + encodeURIComponent(body);
      bot('문자 앱을 열었습니다. 보내기를 누르면 사장님께 바로 갑니다.');
    });
    var b2 = el('button', 'btn sm', '여기 저장');
    b2.type = 'button';
    b2.addEventListener('click', function () {
      C.saveInquiry({ itemId: C.item.id, itemTitle: C.item.title, text: composeBody(kind, text) }, 'save');
      bot('저장했습니다. 요구사항은 사장님 매물장의 문의함에 쌓입니다.');
    });
    var b3 = el('button', 'btn sm', '복사');
    b3.type = 'button';
    b3.addEventListener('click', function () {
      var body = composeBody(kind, text);
      if (navigator.clipboard) navigator.clipboard.writeText(body).then(function () { bot('복사했습니다. 카톡에 붙여넣으세요.'); });
      else bot('복사할 내용: ' + body);
    });
    row.appendChild(b1); row.appendChild(b2); row.appendChild(b3);
    logEl.appendChild(row); scroll();
  }

  function composeBody(kind, text) {
    var L = [];
    L.push('[전자명함 문의]');
    L.push('매물: ' + (C.item.title || '') + (C.item.addr ? ' / ' + C.item.addr : ''));
    if (kind) L.push('요청: ' + kind + ' — ' + text);
    if (condText()) L.push('관심 조건: ' + condText());
    return L.join('\n');
  }

  /* ---------- 열기 ---------- */
  function open(ctx) {
    C = ctx;
    cond = { budget: '', area: '', purpose: '' };
    logEl = document.getElementById('aiLog');
    chipEl = document.getElementById('aiChips');
    inputWrap = document.getElementById('aiInput');
    logEl.innerHTML = ''; chipEl.innerHTML = '';
    inputWrap.hidden = true;
    var owner = (C.me && C.me.name) ? C.me.name + ' 사장님' : '사장님';
    bot(owner + ' 명함의 AI 비서입니다.\n' + (C.item.title || '이 매물') + ' — 무엇이 궁금하세요?', 120).then(menu);
  }

  g.KTS_AI = { open: open, money: money };
})(window);
