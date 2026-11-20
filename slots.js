/* =============================================================================
   KTS 원클릭 — 무료 4칸 슬롯 (적립메모 120번)
   -----------------------------------------------------------------------------
   window.KTSSlots({key, free:4, label, el, ...}) 하나로 단축바·도장함에 같은 규칙.
   · 무료 4칸 고정 — 담기 직전 확인창, 담긴 칸에는 삭제·교체 버튼이 없다
   · 월 1회 무료 초기화 — 그 달에 이미 썼으면 비활성 + 다음 무료 초기화 날짜
   · 5칸째부터 [+ 칸 추가] — ① 이용권 코드(KS+YYMM-4자리, 그 달만) ② 문자 신청
   · 마스터(PIN 2899)는 전부 해금
   · 기존 데이터는 지우지 않는다(유예) — 이미 4개를 넘게 담아 둔 것은 그대로 보이고
     새로 담는 것부터 4칸 상한. 옛 키는 그대로 남긴다.
   · 저장은 이 기기 localStorage 에만. 서버 전송 없음.
   · 친구 초대 해금은 서버가 없어 자동으로 세지 않는다 — 대표님 확인 후 해금.
   ============================================================================= */
(function (w, d) {
  'use strict';
  var PRE = 'kts_slots_v1_', SMS = '01020022899', ADD_N = 4;
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function now() { return w.__KTS_SLOTS_NOW ? new Date(w.__KTS_SLOTS_NOW) : new Date(); } /* 검수용 날짜 바꾸기 */
  function ymd(t) { t = t || now(); return t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate()); }
  function mon(t) { return ymd(t).slice(0, 7); }
  function yymm(t) { return ymd(t).slice(2, 4) + ymd(t).slice(5, 7); }
  function nextMonth1() { var t = now(); var n = new Date(t.getFullYear(), t.getMonth() + 1, 1); return ymd(n); }
  function fnv(s) { var h = 0x811c9dc5; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h; }
  /* 더싸인 이용권 코드와 같은 계산식: KS + YYMM + '-' + fnv('kts-sign-'+YYMM) 앞 4자리. 그 달에만 유효 */
  function codeOk(c) {
    var m = String(c || '').trim().toUpperCase().match(/^KS(\d{4})-([0-9A-F]{4})$/);
    if (!m || m[1] !== yymm()) return false;
    return fnv('kts-sign-' + m[1]).toString(16).toUpperCase().padStart(8, '0').slice(0, 4) === m[2];
  }
  function master() { return w.KTS_MASTER === true; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function lsGet(k) { try { return w.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { w.localStorage.setItem(k, v); return true; } catch (e) { return false; } }

  /* ---------- 화면 조각(모달·토스트) ---------- */
  var cssDone = false;
  function css() {
    if (cssDone) return; cssDone = true;
    var s = d.createElement('style');
    s.textContent =
      '.ksl-dim{position:fixed;inset:0;z-index:200;background:rgba(5,9,22,.72);display:flex;align-items:flex-end;justify-content:center}' +
      '.ksl-box{width:100%;max-width:460px;background:linear-gradient(180deg,#12203C,#0F1B33);border:1px solid #2E4370;border-bottom:0;border-radius:18px 18px 0 0;padding:16px 15px 20px;color:#F3F6FA;font-family:inherit;max-height:88vh;overflow:auto;box-sizing:border-box}' +
      '.ksl-box h3{margin:0 0 6px;font-size:15px;font-weight:900;letter-spacing:-.4px}.ksl-box h3 b{color:#FFA24D}' +
      '.ksl-box p{margin:0 0 9px;font-size:12px;color:#AFBDD0;line-height:1.55}' +
      '.ksl-row{display:flex;gap:6px;margin-top:8px}.ksl-row input{flex:1;min-width:0;background:#0B1729;border:1px solid #26375F;border-radius:10px;color:#F3F6FA;font-size:13px;padding:10px;font-family:inherit;text-transform:uppercase;box-sizing:border-box}' +
      '.ksl-b{display:flex;align-items:center;justify-content:center;border:0;border-radius:11px;padding:11px 12px;font-size:13px;font-weight:900;cursor:pointer;text-decoration:none;font-family:inherit;box-sizing:border-box}' +
      '.ksl-b.p{background:linear-gradient(135deg,#FF6B00,#FFA24D);color:#0A1224}.ksl-b.g{background:#12203C;color:#DCE6F2;border:1px solid #2E4370}' +
      '.ksl-b[disabled]{opacity:.45;cursor:default}' +
      '.ksl-two{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px}' +
      '.ksl-sec{border:1px solid #26375F;border-radius:12px;padding:10px;margin-top:9px;background:#0E1A33}.ksl-sec b.t{display:block;font-size:12px;font-weight:900;margin-bottom:4px}' +
      '.ksl-sec .ln{font-size:11px;color:#AFBDD0;word-break:break-all}.ksl-sec .ln code{color:#FFC98F;font-size:11px}' +
      '.ksl-note{font-size:10.5px;color:#7C8DA6;margin-top:10px;line-height:1.6}' +
      '.ksl-toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:210;background:rgba(10,17,40,.97);border:1px solid rgba(255,107,0,.5);color:#fff;font-size:12px;font-weight:800;padding:9px 14px;border-radius:999px;max-width:90%;text-align:center;opacity:0;transition:.25s;pointer-events:none}.ksl-toast.on{opacity:1}' +
      '.ksl-pan{border:1px solid #26375F;border-radius:12px;padding:9px 10px;background:#0E1A33;margin-top:9px;color:#F3F6FA}' +
      '.ksl-pan .hd{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:11.5px;font-weight:900}.ksl-pan .hd .sp{flex:1}' +
      '.ksl-pan .hd em{font-style:normal;font-size:10px;font-weight:900;color:#0A1224;background:#FFA24D;border-radius:6px;padding:1px 6px}' +
      '.ksl-pan .mini{border:1px solid #2E4370;background:#12203C;color:#DCE6F2;border-radius:8px;padding:5px 8px;font-size:11px;font-weight:900;cursor:pointer;font-family:inherit}' +
      '.ksl-pan .mini.add{border-color:#FF6B00;color:#FFA24D;background:rgba(255,107,0,.12)}.ksl-pan .mini[disabled]{opacity:.45;cursor:default}' +
      '.ksl-pan .sub{font-size:10px;color:#8FA1B8;margin-top:4px;line-height:1.5}' +
      '.ksl-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:8px}' +
      '.ksl-cell{border:1px dashed #2E4370;border-radius:10px;min-height:66px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:5px;font-size:9.5px;color:#6D7E97;font-weight:800;text-align:center;min-width:0}' +
      '.ksl-cell.on{border-style:solid;border-color:#FF6B00;background:#fff;color:#0A1128}' +
      '.ksl-cell img{max-width:100%;max-height:40px;display:block}' +
      '.ksl-cell button{border:0;border-radius:6px;background:#FF6B00;color:#0A1224;font-size:9.5px;font-weight:900;padding:3px 5px;cursor:pointer;font-family:inherit;white-space:nowrap}' +
      '.ksl-ref{font-size:10.5px;font-weight:800;color:#FFD9A6;border:1px solid rgba(255,107,0,.45);background:rgba(255,107,0,.08);border-radius:10px;padding:7px 10px;margin:8px 0 0}';
    d.head.appendChild(s);
  }
  var toastT = 0;
  function toast(m) {
    css(); var t = d.querySelector('.ksl-toast');
    if (!t) { t = d.createElement('div'); t.className = 'ksl-toast'; d.body.appendChild(t); }
    t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 2600);
  }
  function sheet(html, bind) {
    css();
    var dim = d.createElement('div'); dim.className = 'ksl-dim';
    dim.innerHTML = '<div class="ksl-box" role="dialog" aria-modal="true">' + html + '</div>';
    d.body.appendChild(dim);
    function close() { if (dim.parentNode) dim.parentNode.removeChild(dim); }
    dim.addEventListener('click', function (e) { if (e.target === dim) close(); });
    if (bind) bind(dim, close);
    return close;
  }
  function ask(title, msg, okTxt) {
    return new Promise(function (res) {
      sheet('<h3>' + title + '</h3><p>' + msg + '</p><div class="ksl-two"><button type="button" class="ksl-b g" data-a="no">취소</button><button type="button" class="ksl-b p" data-a="ok">' + esc(okTxt || '확정') + '</button></div>',
        function (el, close) {
          el.querySelector('[data-a="no"]').onclick = function () { close(); res(false); };
          el.querySelector('[data-a="ok"]').onclick = function () { close(); res(true); };
          el.addEventListener('click', function (e) { if (e.target === el) res(false); });
        });
    });
  }

  /* ---------- 카톡 초대 링크(자동 해금 없음) ---------- */
  var REF_ME = 'kts_ref_me', REF_FROM = 'kts_ref_from';
  function refMe() {
    var v = lsGet(REF_ME);
    if (!v || !/^[A-Z0-9]{8}$/.test(v)) {
      var A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = '', r = new Uint32Array(8);
      try { w.crypto.getRandomValues(r); } catch (e) { for (var i = 0; i < 8; i++) r[i] = Math.floor(Math.random() * 4294967296); }
      for (var j = 0; j < 8; j++) s += A[r[j] % A.length];
      v = s; lsSet(REF_ME, v);
    }
    return v;
  }
  function refLink() { return 'https://autooneclick.com/?ref=' + refMe(); }
  function copyText(t) {
    return new Promise(function (res) {
      function fb() { try { var ta = d.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; d.body.appendChild(ta); ta.select(); var ok = d.execCommand('copy'); ta.remove(); res(ok); } catch (e) { res(false); } }
      if (w.navigator.clipboard && w.navigator.clipboard.writeText) w.navigator.clipboard.writeText(t).then(function () { res(true); }, fb); else fb();
    });
  }
  function refShare() {
    var url = refLink(), text = 'KTS 원클릭 — 폰으로 바로 쓰는 업무 도구 모음';
    if (w.navigator.share) {
      return w.navigator.share({ title: 'KTS 원클릭', text: text, url: url }).then(function () { return 'shared'; }, function () { return copyText(url).then(function (ok) { toast(ok ? '초대 링크를 복사했습니다' : url); return ok ? 'copied' : 'shown'; }); });
    }
    return copyText(url).then(function (ok) { toast(ok ? '초대 링크를 복사했습니다 · 카톡에 붙여 넣으세요' : url); return ok ? 'copied' : 'shown'; });
  }
  /* ?ref= 로 들어온 기기 — 안내 1줄만. 이 값으로 아무것도 해금하지 않는다. */
  function refIncoming() {
    var m = String(w.location.search || '').match(/[?&]ref=([A-Za-z0-9]{8})(?:&|$)/);
    if (!m) return null;
    var code = m[1].toUpperCase();
    if (code !== lsGet(REF_ME)) lsSet(REF_FROM, JSON.stringify({ ref: code, at: ymd() }));
    return code;
  }
  function refNotice(el) {
    if (!el || !refIncoming()) return false;
    css();
    var p = d.createElement('p'); p.className = 'ksl-ref'; p.textContent = '초대 링크로 들어오셨습니다 · 친구 확인은 대표님 확인 후 해금';
    el.appendChild(p); return true;
  }

  /* ---------- 슬롯 ---------- */
  function KTSSlots(opt) {
    opt = opt || {};
    var key = String(opt.key || 'default'), FREE = opt.free || 4, LABEL = opt.label || '내 칸', SK = PRE + key;
    function blank() { return { v: 1, month: mon(), items: [], added: { ym: '', n: 0 }, lastReset: '' }; }
    function load() {
      var st = null; try { st = JSON.parse(lsGet(SK) || 'null'); } catch (e) { st = null; }
      if (!st || st.v !== 1 || !Array.isArray(st.items)) {
        st = blank();
        /* 옛 저장값 옮기기(유예) — 옛 키는 지우지 않는다 */
        if (typeof opt.migrate === 'function') {
          var old = []; try { old = opt.migrate() || []; } catch (e) { old = []; }
          if (old.length) { st.items = old.map(function (it) { return { id: String(it.id), kind: it.kind || key, data: it.data == null ? null : it.data, at: ymd(), legacy: 1 }; }); st.migratedFrom = opt.migrateKey || 'legacy'; }
          save(st);
        }
      }
      if (!st.added) st.added = { ym: '', n: 0 };
      return st;
    }
    function save(st) { st.month = mon(); var ok = lsSet(SK, JSON.stringify(st)); if (!ok) toast('기기 저장 공간이 부족해 담지 못했습니다'); return ok; }
    var S = load();
    function added() { return S.added && S.added.ym === yymm() ? (S.added.n || 0) : 0; }
    function cap() { return master() ? Infinity : FREE + added(); }
    function items() { return S.items.slice(); }
    function has(id) { return S.items.some(function (i) { return i.id === String(id); }); }
    function full() { return S.items.length >= cap(); }
    function canReset() { return master() || String(S.lastReset || '').slice(0, 7) !== mon(); }
    function nextReset() { return canReset() ? ymd() : nextMonth1(); }
    function grace() { return master() ? 0 : Math.max(0, S.items.length - cap()); }
    function changed() { paint(); if (typeof opt.onChange === 'function') { try { opt.onChange(api); } catch (e) {} } }
    function add(item) {
      S = load();
      if (has(item.id)) { toast('이미 ' + LABEL + '에 담겨 있습니다'); return Promise.resolve('dup'); }
      if (full()) { openAdd(); return Promise.resolve('full'); }
      return ask(LABEL + '에 담기', '<b style="color:#FFC98F">확정하면 이번 달에는 바꿀 수 없습니다.</b><br>무료 ' + FREE + '칸 중 ' + (S.items.length + 1) + '번째 칸에 담습니다. 다음 무료 초기화는 ' + (canReset() ? '이번 달에 1회 쓸 수 있습니다' : nextMonth1()) + '.', '확정하고 담기')
        .then(function (ok) {
          if (!ok) return 'cancel';
          S = load();
          if (full()) { openAdd(); return 'full'; }
          S.items.push({ id: String(item.id), kind: item.kind || key, data: item.data == null ? null : item.data, at: ymd() });
          if (!save(S)) { S.items.pop(); return 'nospace'; }
          changed(); toast(LABEL + '에 담았습니다 · 이번 달 고정');
          return 'ok';
        });
    }
    function reset() {
      S = load();
      if (!canReset()) { toast('이번 달 무료 초기화를 이미 쓰셨습니다 · 다음 무료 초기화: ' + nextMonth1()); return Promise.resolve(false); }
      return ask(LABEL + ' 초기화', '담긴 칸을 모두 비웁니다. <b style="color:#FFC98F">이번 달 무료 초기화 1회</b>를 씁니다(다음 무료 초기화: ' + nextMonth1() + ').', '초기화').then(function (ok) {
        if (!ok) return false;
        S = load(); S.items = []; S.lastReset = ymd(); save(S); changed(); toast(LABEL + '을 비웠습니다');
        return true;
      });
    }
    /* 빼기는 마스터만(손님 화면에는 삭제·교체 버튼이 없다) */
    function remove(id) {
      if (!master()) { toast('이번 달 고정 칸입니다 · ' + (canReset() ? '바꾸려면 이번 달 무료 초기화 1회로 비울 수 있습니다' : '다음 무료 초기화: ' + nextMonth1())); return false; }
      S = load(); S.items = S.items.filter(function (i) { return i.id !== String(id); }); save(S); changed(); return true;
    }
    function unlock(code) {
      if (!codeOk(code)) return false;
      S = load(); S.added = { ym: yymm(), n: ADD_N, code: String(code).trim().toUpperCase() }; save(S); changed();
      return true;
    }
    function openAdd() {
      var body = '[KTS 원클릭] ' + LABEL + ' 칸 추가 신청합니다.';
      sheet('<h3><b>+ 칸 추가</b> · ' + esc(LABEL) + '</h3>' +
        '<p>무료 ' + FREE + '칸이 다 찼습니다(지금 ' + S.items.length + '칸). 5칸째부터는 칸 추가로 엽니다.</p>' +
        '<div class="ksl-sec"><b class="t">① 이용권 코드 넣기</b><span class="ln">문자로 받은 코드(KS+연월-4자리)를 넣으면 이번 달 ' + ADD_N + '칸이 더 열립니다. 지난달 코드는 열리지 않습니다.</span>' +
        '<div class="ksl-row"><input data-a="code" placeholder="예: KS2611-XXXX" autocomplete="off"><button type="button" class="ksl-b p" data-a="go">확인</button></div></div>' +
        '<div class="ksl-sec"><b class="t">② 문자로 신청</b><a class="ksl-b g" style="margin-top:4px" data-a="sms" href="sms:' + SMS + '?body=' + encodeURIComponent(body) + '">칸 추가 (문자 신청)</a></div>' +
        '<div class="ksl-sec"><b class="t">③ 카톡 친구 초대</b><span class="ln">1칸 추가 = 친구 3명 · 2칸 추가 = 친구 5명 <b style="color:#FFC98F">(확인 후 해금)</b><br>내 초대 링크 <code data-a="link">' + esc(refLink()) + '</code></span>' +
        '<button type="button" class="ksl-b g" style="margin-top:6px;width:100%" data-a="share">초대 링크 보내기</button>' +
        '<span class="ln" style="display:block;margin-top:5px;color:#7C8DA6">친구가 들어온 숫자는 자동으로 세지 않습니다. 대표님이 확인한 뒤 코드로 열어 드립니다.</span></div>' +
        '<p class="ksl-note">모든 금액은 부가세 별도 · 금액은 문자로 안내드립니다. 이 사이트에서는 결제하지 않습니다.</p>' +
        '<button type="button" class="ksl-b g" style="width:100%;margin-top:8px" data-a="close">닫기</button>',
        function (el, close) {
          el.querySelector('[data-a="go"]').onclick = function () {
            var c = el.querySelector('[data-a="code"]').value;
            if (unlock(c)) { close(); toast('이용권 확인 — 이번 달 ' + ADD_N + '칸이 더 열렸습니다'); }
            else toast('코드가 맞지 않거나 지난달 코드입니다');
          };
          el.querySelector('[data-a="share"]').onclick = function () { refShare(); };
          el.querySelector('[data-a="close"]').onclick = close;
        });
    }
    /* 상태 줄(+ 칸 그림) — 담긴 칸에는 삭제·교체 버튼이 없다 */
    function paint() {
      var el = typeof opt.el === 'string' ? d.querySelector(opt.el) : opt.el;
      if (!el) return;
      css(); S = load();
      var c = cap(), n = S.items.length, g = grace(), cr = canReset();
      var capTxt = master() ? '마스터 · 제한 없음' : (n + '/' + c + '칸');
      var html = '<div class="ksl-pan"><div class="hd"><span>' + esc(LABEL) + '</span><em>' + (added() ? '무료 ' + FREE + ' + 추가 ' + added() : '무료 ' + FREE + '칸') + '</em><span>' + capTxt + '</span><span class="sp"></span>' +
        '<button type="button" class="mini" data-a="reset"' + (cr && n ? '' : ' disabled') + '>초기화</button>' +
        (!master() && n >= c ? '<button type="button" class="mini add" data-a="add">+ 칸 추가</button>' : '') + '</div>' +
        '<div class="sub">담기 전에 확인하고, 담은 칸은 이번 달 고정입니다 · ' + (cr ? '이번 달 무료 초기화 1회 남음' : '다음 무료 초기화: ' + nextMonth1()) +
        (g ? ' · <b style="color:#FFC98F">유예 ' + g + '칸</b>(전에 담아 두신 것은 그대로, 새로 담기는 ' + FREE + '칸 기준)' : '') + '</div>';
      if (typeof opt.cellHtml === 'function') {
        var cells = '', show = Math.max(master() ? n : c, n);
        for (var i = 0; i < show; i++) {
          var it = S.items[i];
          cells += it ? '<div class="ksl-cell on" data-i="' + i + '">' + opt.cellHtml(it, i) + '</div>' : '<div class="ksl-cell">빈 칸 ' + (i + 1) + '</div>';
        }
        html += '<div class="ksl-grid">' + cells + '</div>';
      }
      html += '</div>';
      el.innerHTML = html;
      var rb = el.querySelector('[data-a="reset"]'); if (rb) rb.onclick = function () { reset(); };
      var ab = el.querySelector('[data-a="add"]'); if (ab) ab.onclick = function () { openAdd(); };
      if (typeof opt.onUse === 'function') {
        Array.prototype.forEach.call(el.querySelectorAll('.ksl-cell.on [data-use]'), function (b) {
          b.onclick = function () { var it = S.items[+b.closest('.ksl-cell').getAttribute('data-i')]; if (it) opt.onUse(it); };
        });
      }
    }
    var api = { key: key, items: items, has: has, full: full, cap: cap, add: add, remove: remove, reset: reset, unlock: unlock, openAdd: openAdd,
      canReset: canReset, nextReset: nextReset, grace: grace, paint: paint, state: function () { S = load(); return JSON.parse(JSON.stringify(S)); } };
    paint();
    return api;
  }
  KTSSlots.codeOk = codeOk;
  KTSSlots.ref = { me: refMe, link: refLink, share: refShare, incoming: refIncoming, notice: refNotice };
  KTSSlots.toast = toast;
  w.KTSSlots = KTSSlots;
})(window, document);
