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
    var old = d.querySelectorAll('.kk-dim');
    for (var oi = 0; oi < old.length; oi++) { if (old[oi].parentNode) old[oi].parentNode.removeChild(old[oi]); }
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
        '<p class="ksl-note">금액은 문자로 안내드립니다 · 이 사이트에서는 결제하지 않습니다.</p>' +
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

/* =============================================================================
   KTS 원클릭 — 🔑 열쇠 4개 · 자물쇠 인벤토리 (2026-11-21 대표님 확정안)
   -----------------------------------------------------------------------------
   · 쇼룸에서 도구를 누르면 도구마다 1회 무료 시연. 그 뒤로는 '내 박스'에 담아야 계속 씁니다.
   · 본인 간편인증을 하면 🔑 열쇠 4개와 4칸 박스를 드립니다(4칸은 자유롭게 담기).
   · 칸을 바꾸면(교체) 빠진 도구는 자동으로 잠깁니다. 열쇠 1개로 되살립니다.
   · 4칸이 차면 5칸째 자물쇠가 보입니다. 열기 전에 사용설명서·미리보기를 보여 주고
     "열까요?"를 물은 뒤 열쇠 1개를 씁니다. 5칸을 열면 6칸째 자물쇠가 나타납니다.
   · 열쇠는 ① 친구 5명 초대 ② 열쇠 구입(문자 신청·이용권 코드)로 얻습니다.
   · 박스에 담긴 도구는 계속 쓰되 하루 무료 횟수만 지킵니다. 돈 이야기는 도구 안
     [그 이상 쓰기] 안쪽에만 있습니다.
   · 지금은 서버가 없습니다. 인증·초대·투표는 이 기기(localStorage)에서만 세고,
     잠금 해제용 이용권 코드는 문자로 받은 코드로 확인합니다. 기기를 바꾸면 새로 시작합니다.
   · 마스터(PIN 2899)는 열쇠·잠금 없이 전부 열립니다.
   ============================================================================= */
(function (w, d) {
  'use strict';
  var ST = 'kts_keys_v1', SMS = '01020022899', FREE_SLOTS = 4;

  /* 도구별 하루 무료 횟수(0 = 제한 없음). 실제 사용 제한은 각 도구 안에서도 따릅니다. */
  /* 도구별 '하루 몇 번까지 무료' — 실제 도구 화면에서 확인한 것만 적습니다(추측 금지).
     photo2doc: 목록·변환기 화면 '3장 무료' · ad_magnet: 화면 '하루 3건' */
  var LIMIT = { photo2doc: 3, ad_magnet: 3 };
  /* 횟수가 아닌 무료 기준(양식 수·한 장 등) — 화면에 그대로 보이는 문구만 */
  var FREE = { sign: '한 장 무료', theform: '기본 양식 5종 무료', contract: '서식 3종 무료',
               viewer: '평생 무료', sale: '평생 무료', saycap: '무료', organizer: '무료',
               tongyeok: '번역 무료', realty: '무료', exchange: '열람 무료' };
  var LIMIT_UNIT = { photo2doc: '장', ad_magnet: '건' };
  /* products.js(catalog.json)에 없는 도구 — 쇼룸·박스에서 같이 씁니다 */
  var EXTRA = {
    thescan:   { nm: '더스캔',     ico: '▣', link: 'thescan/' },
    theeraser: { nm: '더지우개',   ico: '⌫', link: 'theeraser/' },
    ad_magnet: { nm: '광고유입기', ico: '✦', link: 'ad_magnet/' },
    seller:    { nm: '원클릭 셀러', ico: '▦', link: 'seller/' },
    ops:       { nm: '군단 상황판', ico: '□', link: 'ops/' }
  };

  function master() { return w.KTS_MASTER === true; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ls(k) { try { return w.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { w.localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function today(t) { t = t || new Date(); return t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate()); }

  function blank() { return { v: 1, verified: 0, name: '', keys: 0, slots: FREE_SLOTS, box: [], locked: [], trial: [], invites: 0, inviteKeys: 0, codes: [], daily: {}, at: today() }; }
  function load() {
    var s = null; try { s = JSON.parse(ls(ST) || 'null'); } catch (e) { s = null; }
    if (!s || s.v !== 1 || !Array.isArray(s.box)) {
      s = blank();
      /* 예전 ★ 내 단축바(kts_favs)를 4칸까지 그대로 옮긴다 — 옛 값은 지우지 않는다 */
      try {
        var old = JSON.parse(ls('kts_favs') || '[]');
        if (Array.isArray(old) && old.length) { s.box = old.slice(0, FREE_SLOTS).map(String); s.migrated = 1; }
      } catch (e) {}
      save(s);
    }
    if (!Array.isArray(s.locked)) s.locked = [];
    if (!Array.isArray(s.trial)) s.trial = [];
    if (!Array.isArray(s.codes)) s.codes = [];
    if (!s.daily) s.daily = {};
    if (!s.slots || s.slots < FREE_SLOTS) s.slots = FREE_SLOTS;
    return s;
  }
  function save(s) { lsSet(ST, JSON.stringify(s)); return s; }

  /* ---------- 도구 정보 ---------- */
  function catalog() { return (w.PRODUCTS || []).slice(); }
  function info(k) {
    var p = catalog().filter(function (x) { return x.k === k; })[0];
    if (p) return { k: k, nm: String(p.nm).split(' — ')[0], icon: p.icon || '', link: p.link || ('detail.html?k=' + k), sub: p.sub || '' };
    var e = EXTRA[k];
    if (e) return { k: k, nm: e.nm, icon: '', ico: e.ico, link: e.link, sub: '' };
    return { k: k, nm: k, icon: '', ico: '·', link: '', sub: '' };
  }
  function allTools() {
    var out = [], seen = {};
    catalog().forEach(function (p) { if (p.status === 'live' && p.link && !seen[p.k]) { seen[p.k] = 1; out.push(info(p.k)); } });
    Object.keys(EXTRA).forEach(function (k) { if (!seen[k]) { seen[k] = 1; out.push(info(k)); } });
    return out;
  }
  function limitOf(k) { return LIMIT[k] || 0; }
  function freeText(k) {
    var L = LIMIT[k];
    if (L) return '하루 ' + L + (LIMIT_UNIT[k] || '회') + ' 무료';
    return FREE[k] || '';
  }
  function usedToday(k) {
    var r = load().daily[k];
    return (r && r.d === today()) ? (r.n || 0) : 0;
  }
  function dayLeft(k) { var L = limitOf(k); return L ? Math.max(0, L - usedToday(k)) : Infinity; }
  function markUse(k) {
    var s = load(), r = s.daily[k], L = limitOf(k);
    if (r && r.d !== today()) r = null;
    if (!L) return;                        /* 제한 없는 도구는 세지 않는다 */
    s.daily[k] = { d: today(), n: (r ? r.n : 0) + 1 };
    save(s); changed();
  }

  /* ---------- 화면 조각 ---------- */
  var cssDone = false;
  function css() {
    if (cssDone) return; cssDone = true;
    var st = d.createElement('style'); st.id = 'kts-keys-style';
    st.textContent =
      '.kk-dim{position:fixed;inset:0;z-index:300;background:rgba(4,8,20,.74);display:flex;align-items:flex-end;justify-content:center}' +
      '.kk-box{width:100%;max-width:460px;max-height:92vh;overflow:auto;-webkit-overflow-scrolling:touch;background:linear-gradient(180deg,#12203C,#0F1B33);border:1px solid #2E4370;border-bottom:0;border-radius:18px 18px 0 0;padding:15px 15px 22px;color:#F3F6FA;font-family:inherit;box-sizing:border-box}' +
      '.kk-hd{display:flex;align-items:center;gap:8px}.kk-hd>b{font-size:15.5px;font-weight:900;letter-spacing:-.4px}' +
      '.kk-hd>.k{font-size:11px;font-weight:900;color:#0A1224;background:linear-gradient(90deg,#FF8A2B,#FFA24D);border-radius:999px;padding:3px 8px;white-space:nowrap}' +
      '.kk-hd>.x{margin-left:auto;width:28px;height:28px;border:1px solid #2E4370;background:#12203C;color:#C7D3E3;border-radius:8px;font-size:12px;font-weight:900;cursor:pointer;font-family:inherit;line-height:1}' +
      '.kk-lead{margin:7px 0 0;font-size:11.5px;line-height:1.6;color:#AFBDD0;word-break:keep-all}' +
      '.kk-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:11px}' +
      '.kk-cell{border:1px solid #26375F;border-radius:12px;background:#0E1A33;padding:9px;display:flex;flex-direction:column;gap:5px;min-height:96px;box-sizing:border-box}' +
      '.kk-cell.full{border-color:#FF6B00;background:linear-gradient(180deg,rgba(255,107,0,.13),rgba(255,255,255,.02))}' +
      '.kk-cell .t{display:flex;align-items:center;gap:6px;min-width:0}' +
      '.kk-cell .t img{width:24px;height:24px;border-radius:7px;object-fit:cover;flex:0 0 auto}' +
      '.kk-cell .t .e{width:24px;height:24px;border-radius:7px;display:grid;place-items:center;background:rgba(255,107,0,.14);border:1px solid rgba(255,107,0,.4);color:#FFA24D;font-size:13px;flex:0 0 auto}' +
      '.kk-cell .t b{font-size:11.5px;font-weight:900;letter-spacing:-.3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.kk-cell .u{font-size:9.5px;color:#8FA1B8;font-weight:700;line-height:1.4}' +
      '.kk-cell .u b{color:#FFC98F}' +
      '.kk-cell .b{display:flex;gap:5px;margin-top:auto}' +
      '.kk-cell .b a,.kk-cell .b button{flex:1;text-align:center;font-family:inherit;font-size:10.5px;font-weight:900;border-radius:8px;padding:6px 4px;cursor:pointer;text-decoration:none;line-height:1.1}' +
      '.kk-cell .b .go{background:linear-gradient(180deg,#FF8A2B,#FF6B00);border:1px solid #FF6B00;color:#0A1224}' +
      '.kk-cell .b .sw{background:#12203C;border:1px solid #2E4370;color:#DCE6F2}' +
      '.kk-add{border:1px dashed #2E4370;border-radius:12px;background:transparent;color:#8FA1B8;font-family:inherit;font-size:11.5px;font-weight:900;min-height:96px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px}' +
      '.kk-add b{font-size:17px;color:#FFA24D}' +
      '.kk-lock{border:1px solid #3A2E58;border-radius:12px;background:linear-gradient(180deg,rgba(120,90,200,.14),rgba(255,255,255,.02));min-height:96px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:8px;text-align:center}' +
      '.kk-lock .lk{font-size:18px;line-height:1}.kk-lock b{font-size:11px;font-weight:900;color:#CFC4F0}.kk-lock small{font-size:9px;color:#8F86B0;font-weight:700}' +
      '.kk-lock button{margin-top:3px;font-family:inherit;font-size:10px;font-weight:900;border-radius:8px;padding:5px 8px;border:1px solid #6B57A8;background:#2A2350;color:#E4DCFF;cursor:pointer}' +
      '.kk-sec{border:1px solid #26375F;border-radius:12px;padding:10px;margin-top:10px;background:#0E1A33}' +
      '.kk-sec>b.t{display:block;font-size:12px;font-weight:900;margin-bottom:5px}.kk-sec .ln{font-size:10.5px;color:#AFBDD0;line-height:1.55;word-break:keep-all}' +
      '.kk-b{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;border:0;border-radius:10px;padding:11px 10px;font-family:inherit;font-size:12.5px;font-weight:900;cursor:pointer;text-decoration:none;box-sizing:border-box;margin-top:7px}' +
      '.kk-b.p{background:linear-gradient(135deg,#FF6B00,#FFA24D);color:#0A1224}.kk-b.g{background:#12203C;border:1px solid #2E4370;color:#DCE6F2}' +
      '.kk-b.w{width:auto;margin:0;padding:8px 11px;font-size:11.5px}.kk-b[disabled]{opacity:.45;cursor:default}' +
      '.kk-row{display:flex;gap:6px;margin-top:7px;align-items:center}' +
      '.kk-row input{flex:1;min-width:0;background:#0B1729;border:1px solid #26375F;border-radius:10px;color:#F3F6FA;font-size:13px;padding:10px;font-family:inherit;box-sizing:border-box}' +
      '.kk-row input.c{text-align:center;letter-spacing:.3em;font-weight:900}' +
      '.kk-note{font-size:10px;color:#7C8DA6;line-height:1.6;margin:10px 0 0;word-break:keep-all}' +
      '.kk-note b{color:#C7D3E3}' +
      '.kk-keys{display:flex;align-items:center;gap:10px;margin-top:11px;border:1px solid rgba(255,107,0,.45);border-radius:13px;padding:11px 12px;background:linear-gradient(100deg,rgba(255,107,0,.16),rgba(255,255,255,.02) 70%)}' +
      '.kk-keys .n{font-size:24px;font-weight:900;color:#FFA24D;line-height:1}' +
      '.kk-keys .t{flex:1;font-size:10.5px;color:#AFBDD0;line-height:1.5}' +
      '.kk-prog{height:7px;border-radius:99px;background:#0B1729;border:1px solid #26375F;overflow:hidden;margin-top:7px}' +
      '.kk-prog i{display:block;height:100%;background:linear-gradient(90deg,#FF6B00,#FFA24D)}' +
      '.kk-lkrow{display:flex;align-items:center;gap:7px;padding:7px 0;border-top:1px solid #22314F;font-size:11px;font-weight:800;color:#DCE6F2}' +
      '.kk-lkrow:first-of-type{border-top:0}.kk-lkrow .sp{flex:1}' +
      '.kk-prev{border:1px solid rgba(255,107,0,.4);border-radius:12px;background:rgba(255,107,0,.07);padding:10px;margin-top:9px}' +
      '.kk-mock{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin-bottom:8px}' +
      '.kk-mock i{height:28px;border-radius:7px;border:1px dashed #2E4370;display:grid;place-items:center;font-size:11px;font-style:normal;color:#7C8DA6}' +
      '.kk-mock i.on{border-style:solid;border-color:#FF6B00;background:rgba(255,107,0,.16);color:#FFA24D}' +
      '.kk-mock i.nw{border:1px solid #FFA24D;background:linear-gradient(180deg,#FF8A2B,#FF6B00);color:#0A1224;font-weight:900}' +
      '.kk-list{list-style:none;margin:6px 0 0;padding:0;display:grid;gap:5px}' +
      '.kk-list li{position:relative;padding-left:11px;font-size:11px;line-height:1.55;color:#DCE6F2;font-weight:700;word-break:keep-all}' +
      '.kk-list li:before{content:"";position:absolute;left:0;top:6px;width:4px;height:4px;border-radius:50%;background:#FF6B00}' +
      '.kk-toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:310;background:rgba(10,17,40,.97);border:1px solid rgba(255,107,0,.5);color:#fff;font-size:12px;font-weight:800;padding:9px 14px;border-radius:999px;max-width:90%;text-align:center;opacity:0;transition:.25s;pointer-events:none}' +
      '.kk-toast.on{opacity:1}' +
      /* 쇼룸 안의 압축 박스 줄 */
      '.ks-strip{border:1px solid #26375F;border-radius:14px;background:#0F1B33;padding:10px 11px}' +
      '.ks-strip .h{display:flex;align-items:center;gap:6px;font-size:11.5px;font-weight:900;color:#fff}' +
      '.ks-strip .h em{font-style:normal;font-size:9.5px;font-weight:900;color:#0A1224;background:linear-gradient(90deg,#FF8A2B,#FFA24D);border-radius:999px;padding:2px 7px}' +
      '.ks-strip .h .sp{flex:1}' +
      '.ks-strip .h button{font-family:inherit;font-size:10px;font-weight:900;border-radius:8px;padding:5px 8px;border:1px solid #2E4370;background:#12203C;color:#DCE6F2;cursor:pointer}' +
      '.ks-strip .h .keys{color:#FFA24D;font-size:10.5px;font-weight:900;white-space:nowrap}' +
      '.ks-strip .g{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-top:8px}' +
      '.ks-strip .c{border:1px solid #26375F;border-radius:9px;background:#0B1729;min-height:46px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:4px 2px;cursor:pointer;font-family:inherit;color:#DCE6F2;overflow:hidden}' +
      '.ks-strip .c.full{border-color:rgba(255,107,0,.6);background:rgba(255,107,0,.1)}' +
      '.ks-strip .c.lk{border-style:dashed;border-color:#3A2E58;color:#8F86B0}' +
      '.ks-strip .c img{width:20px;height:20px;border-radius:5px;object-fit:cover}' +
      '.ks-strip .c .e{font-size:13px;line-height:1;color:#FFA24D}' +
      '.ks-strip .c b{font-size:8.5px;font-weight:900;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.ks-strip .c small{font-size:8px;color:#7C8DA6;font-weight:700}';
    (d.head || d.documentElement).appendChild(st);
  }
  var toastT = 0;
  function toast(m) {
    css(); var t = d.querySelector('.kk-toast');
    if (!t) { t = d.createElement('div'); t.className = 'kk-toast'; d.body.appendChild(t); }
    t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 2600);
  }
  var listeners = [];
  function changed() { try { listeners.forEach(function (f) { f(); }); } catch (e) {} }
  function onChange(f) { if (typeof f === 'function') listeners.push(f); }

  /* ---------- 상태 ---------- */
  function state() { var s = load(); return JSON.parse(JSON.stringify(s)); }
  function inBox(k) { return load().box.indexOf(String(k)) >= 0; }
  function isLocked(k) { return load().locked.some(function (x) { return x.id === String(k); }); }

  /* 열쇠 주기 */
  function addKeys(n, why) {
    var s = load(); s.keys = Math.max(0, (s.keys || 0) + n); save(s); changed();
    if (n > 0) toast('🔑 열쇠 ' + n + '개를 받았습니다' + (why ? ' · ' + why : ''));
    return s.keys;
  }
  /* 사용권 코드: KS + YYMM + '-' + 4자리 (이번 달 코드만) */
  function codeOk(c) { try { return !!(w.KTSSlots && w.KTSSlots.codeOk && w.KTSSlots.codeOk(c)); } catch (e) { return false; } }
  function useCode(c) {
    var code = String(c || '').trim().toUpperCase(), s = load();
    if (!codeOk(code)) return 'bad';
    if (s.codes.indexOf(code) >= 0) return 'used';
    s.codes.push(code); s.keys = (s.keys || 0) + 1; save(s); changed();
    return 'ok';
  }

  /* ---------- 인증 ---------- */
  function verifyOpen() { openPanel('verify'); }
  var pendingCode = '';
  function sendVerifyCode(form) {
    var nm = (form.querySelector('[data-a="nm"]').value || '').trim();
    var tel = (form.querySelector('[data-a="tel"]').value || '').replace(/[^0-9]/g, '');
    if (nm.length < 2) { toast('이름을 적어 주세요'); return; }
    if (tel.length < 9) { toast('전화번호를 정확히 적어 주세요'); return; }
    pendingCode = String(Math.floor(100000 + Math.random() * 900000));
    var box = form.querySelector('[data-a="codeBox"]');
    box.hidden = false;
    box.querySelector('[data-a="shown"]').textContent = pendingCode;
    toast('인증번호를 화면에 띄웠습니다 (모의 인증)');
  }
  function doVerify(form) {
    var code = (form.querySelector('[data-a="code"]').value || '').replace(/[^0-9]/g, '');
    if (code !== pendingCode) { toast('인증번호가 다릅니다'); return; }
    var nm = (form.querySelector('[data-a="nm"]').value || '').trim();
    var tel = (form.querySelector('[data-a="tel"]').value || '').replace(/[^0-9]/g, '');
    commitVerify(nm, tel);
    pendingCode = '';
    toast('본인 확인 완료 · 🔑 열쇠 4개와 4칸 박스를 드렸습니다');
    openPanel('box');
  }
  /* 인증 완료 처리(모의) — 이름·번호를 받아 열쇠 4개와 4칸을 연다 */
  function commitVerify(nm, tel) {
    var s = load();
    if (!s.verified) {
      s.verified = 1; s.name = nm || '손님';
      s.masked = tel && tel.length >= 7 ? tel.slice(0, 3) + '-****-' + tel.slice(-2) : (tel || '');
      s.keys = (s.keys || 0) + FREE_SLOTS; s.at = today(); save(s);
    }
    changed(); return s;
  }

  /* ---------- 박스 담기·교체·열기·부활 ---------- */
  function put(k, idx) {
    var s = load(); k = String(k);
    if (!s.verified) { openPanel('verify', { k: k }); return false; }
    if (s.box.indexOf(k) >= 0) { toast('이미 박스에 있습니다'); return false; }
    if (idx == null || idx === '') {
      if (s.box.length >= s.slots) { openPanel('lock'); return false; }
      s.box.push(k);
    } else {
      idx = +idx;
      if (idx < 0 || idx >= s.slots) return false;
      var old = s.box[idx];
      s.box[idx] = k;
      if (old && old !== k && !s.locked.some(function (x) { return x.id === old; })) {
        s.locked.push({ id: old, at: today() });
        toast('칸을 바꿨습니다 · ' + info(old).nm + '은(는) 잠겼습니다(열쇠 1개로 부활)');
      } else { toast('칸을 바꿨습니다'); }
    }
    if (s.box.length > s.slots) s.box = s.box.slice(0, s.slots);
    save(s); changed(); return true;
  }
  function swap(idx) { openPanel('pick', { idx: idx }); }
  function unput(idx) {                     /* 빼기 = 잠금(열쇠로 부활) */
    var s = load(), k = s.box[+idx];
    if (!k) return;
    s.box.splice(+idx, 1);
    if (!s.locked.some(function (x) { return x.id === k; })) s.locked.push({ id: k, at: today() });
    save(s); changed(); toast(info(k).nm + '을(를) 뺐습니다 · 잠김(열쇠 1개로 부활)');
  }
  function revive(id) {
    var s = load();
    if (!s.keys) { openPanel('key'); toast('열쇠가 없습니다 · 5인 초대 또는 열쇠 구입'); return false; }
    if (s.box.length >= s.slots) { toast('빈칸이 없습니다 · 칸을 바꾸거나 5칸째를 여세요'); return false; }
    s.keys--; s.locked = s.locked.filter(function (x) { return x.id !== String(id); });
    if (s.box.indexOf(String(id)) < 0) s.box.push(String(id));
    save(s); changed(); toast('🔑 열쇠 1개를 써서 ' + info(id).nm + '을(를) 되살렸습니다');
    return true;
  }
  /* 5칸째 열기 — 설명서·미리보기 → "열까요?" → 열쇠 1개 */
  function openSlot() {
    var s = load();
    if (!s.verified) { openPanel('verify'); return false; }
    if (!s.keys) { openPanel('key'); toast('열쇠가 없습니다 · 5인 초대 또는 열쇠 구입'); return false; }
    var n = s.slots + 1;
    confirmSlot(n, function () {
      var t = load(); t.keys--; t.slots = n; save(t); changed();
      toast('🔑 열쇠 1개를 써서 ' + n + '칸째를 열었습니다');
      openPanel('box');
    });
  }

  /* ---------- 쇼룸 관문 ---------- */
  function request(k) {
    k = String(k || '');
    if (master()) { markUse(k); return { ok: true, why: 'master' }; }
    var s = load();
    if (s.box.indexOf(k) >= 0) { markUse(k); return { ok: true, why: 'box' }; }
    if (s.trial.indexOf(k) < 0) {
      s.trial.push(k); save(s); changed();
      toast('1회 무료 시연입니다 · 계속 쓰시려면 내 박스에 담아 주세요');
      return { ok: true, why: 'trial' };
    }
    openPanel(s.verified ? 'box' : 'verify', { k: k });
    return { ok: false, why: 'gate' };
  }

  /* ---------- 모달 ---------- */
  function sheet(html, bind) {
    css();
    var old = d.querySelectorAll('.kk-dim');
    for (var oi = 0; oi < old.length; oi++) { if (old[oi].parentNode) old[oi].parentNode.removeChild(old[oi]); }
    var dim = d.createElement('div'); dim.className = 'kk-dim';
    dim.innerHTML = '<div class="kk-box" role="dialog" aria-modal="true" aria-label="내 박스">' + html + '</div>';
    d.body.appendChild(dim);
    function close() { if (dim.parentNode) dim.parentNode.removeChild(dim); }
    dim.addEventListener('click', function (e) { if (e.target === dim) close(); });
    var x = dim.querySelector('[data-a="close"]'); if (x) x.onclick = close;
    if (bind) bind(dim, close);
    return close;
  }
  function confirmSlot(n, onOk) {
    var s = load();
    sheet('<div class="kk-hd"><b>' + n + '칸째를 열까요?</b><span class="k">🔑 열쇠 1개</span><button class="x" data-a="close" aria-label="닫기">✕</button></div>' +
      '<p class="kk-lead">열기 전에 무엇이 달라지는지 먼저 보세요. 열면 이 기기의 박스가 ' + (n - 1) + '칸에서 ' + n + '칸으로 늘어납니다.</p>' +
      '<div class="kk-prev"><div class="kk-mock">' +
      (function () { var o = ''; for (var i = 0; i < 5; i++) o += '<i class="' + (i < n - 1 ? 'on' : (i === n - 1 ? 'nw' : '')) + '">' + (i < n - 1 ? '✓' : (i === n - 1 ? '+' : '🔒')) + '</i>'; return o; })() +
      '</div><div class="ln" style="font-size:10.5px;color:#DCE6F2;font-weight:800">그림 · 열면 이렇게 됩니다</div></div>' +
      '<div class="kk-sec"><b class="t">사용설명서</b><ul class="kk-list">' +
      '<li>도구를 한 개 더 담아 둘 수 있습니다. 담은 도구는 계속 열립니다.</li>' +
      '<li>하루 무료 횟수는 도구마다 그대로입니다(칸을 열어도 늘지 않습니다).</li>' +
      '<li>칸을 바꾸면 빠진 도구는 잠기고, 열쇠 1개로 되살립니다.</li>' +
      '<li>' + (n + 1) + '칸째는 이 칸을 다 채우면 자물쇠로 다시 나타납니다.</li></ul></div>' +
      '<div class="kk-keys"><div class="n">' + s.keys + '</div><div class="t">지금 열쇠 <b style="color:#FFC98F">' + s.keys + '개</b> → 여는 데 1개를 씁니다<br>남는 열쇠 ' + Math.max(0, s.keys - 1) + '개</div></div>' +
      '<button class="kk-b p" data-a="ok">열까요? · 열기</button>' +
      '<button class="kk-b g" data-a="no">그만두기</button>' +
      '<p class="kk-note">열쇠는 ① 친구 5명 초대 ② 열쇠 구입으로 얻습니다. 결제는 이 사이트가 아니라 문자 안내로만 합니다.</p>',
      function (el, close) {
        el.querySelector('[data-a="ok"]').onclick = function () { close(); onOk(); };
        el.querySelector('[data-a="no"]').onclick = close;
      });
  }

  function picker(k, idx) {
    var tools = allTools(), s = load();
    sheet('<div class="kk-hd"><b>' + (idx == null ? '내 박스에 담기' : '칸 바꾸기') + '</b><button class="x" data-a="close" aria-label="닫기">✕</button></div>' +
      '<p class="kk-lead">' + (idx == null ? '박스에 담은 도구는 계속 열립니다. 하루 무료 횟수는 도구마다 다릅니다.' : '새로 담으면 빠지는 도구는 잠깁니다(열쇠 1개로 부활).') + '</p>' +
      '<div class="kk-grid" style="grid-template-columns:1fr">' +
      tools.map(function (t) {
        var on = s.box.indexOf(t.k) >= 0, L = limitOf(t.k);
        return '<div class="kk-cell' + (on ? ' full' : '') + '" style="min-height:0;flex-direction:row;align-items:center;gap:8px;padding:8px 9px">' +
          '<div class="t" style="flex:1">' + (t.icon ? '<img src="' + esc(t.icon) + '" alt="">' : '<span class="e">' + esc(t.ico || '·') + '</span>') +
          '<b>' + esc(t.nm) + '</b></div>' +
          '<span class="u" style="flex:0 0 auto">' + (L ? '하루 ' + L + '회' : '제한 없음') + '</span>' +
          '<button class="kk-b g w" data-a="pick" data-k="' + esc(t.k) + '"' + (on ? ' disabled' : '') + '>' + (on ? '담김' : '담기') + '</button></div>';
      }).join('') + '</div>',
      function (el, close) {
        Array.prototype.forEach.call(el.querySelectorAll('[data-a="pick"]'), function (b) {
          b.onclick = function () { if (put(b.getAttribute('data-k'), idx)) close(); };
        });
      });
  }

  function lockList(s) {
    if (!s.locked.length) return '';
    return '<div class="kk-sec"><b class="t">잠긴 도구 ' + s.locked.length + '개</b><div class="ln">칸을 바꾸거나 빼서 잠긴 도구입니다. 열쇠 1개로 되살립니다.</div>' +
      s.locked.map(function (x) {
        var t = info(x.id);
        return '<div class="kk-lkrow">🔒 <span>' + esc(t.nm) + '</span><span class="sp"></span>' +
          '<button class="kk-b g w" data-a="revive" data-k="' + esc(x.id) + '"' + (s.keys ? '' : ' disabled') + '>열쇠 1개로 부활</button></div>';
      }).join('') + '</div>';
  }

  function panelBox(s, hint) {
    var cells = '';
    for (var i = 0; i < s.slots; i++) {
      var k = s.box[i];
      if (k) {
        var t = info(k), L = limitOf(k), u = usedToday(k), ft = freeText(k);
        cells += '<div class="kk-cell full"><div class="t">' + (t.icon ? '<img src="' + esc(t.icon) + '" alt="">' : '<span class="e">' + esc(t.ico || '·') + '</span>') + '<b>' + esc(t.nm) + '</b></div>' +
          '<div class="u">' + (L ? '오늘 <b>' + u + '/' + L + '회</b> 씀' : (ft || '무료 횟수 안내 없음')) + '</div>' +
          '<div class="b"><a class="go" href="' + esc(t.link || '#') + '" data-a="use" data-k="' + esc(k) + '">쓰기</a><button class="sw" data-a="swap" data-i="' + i + '">교체</button></div></div>';
      } else {
        cells += '<button class="kk-add" data-a="pick" data-i="' + i + '"><b>+</b>' + (i + 1) + '칸 담기</button>';
      }
    }
    /* 열린 칸 뒤에 항상 자물쇠 한 칸 */
    cells += '<div class="kk-lock"><span class="lk">🔒</span><b>' + (s.slots + 1) + '칸째</b><small>설명서 보고 열기</small>' +
      '<button data-a="openslot">열기 · 🔑1</button></div>';

    return '<div class="kk-hd"><b>🔑 내 박스</b><span class="k">' + (s.verified ? esc(s.masked || '인증됨') : '인증 전') + '</span>' +
      '<span class="keys" style="margin-left:auto;font-size:11px;font-weight:900;color:#FFA24D">열쇠 ' + s.keys + '개</span>' +
      '<button class="x" data-a="close" aria-label="닫기">✕</button></div>' +
      '<p class="kk-lead">' + (s.verified
        ? esc(s.name || '') + '님 · ' + s.slots + '칸 중 ' + s.box.length + '칸 사용 · 담은 도구는 계속 열립니다. 하루 무료 횟수만 지킵니다.'
        : '아직 본인 확인 전입니다. 박스에 담으려면 아래 [본인 간편인증]을 먼저 해 주세요.') + '</p>' +
      (hint ? '<div class="kk-prev"><div class="ln" style="font-size:11px;color:#FFD9A6;font-weight:800">' + esc(info(hint).nm) + '은(는) 아직 박스에 없습니다.</div>' +
        '<div class="ln" style="font-size:10.5px;color:#AFBDD0;margin-top:3px">박스에 담으면 다음부터 바로 열립니다. 지금은 1회 무료 시연까지 됩니다.</div></div>' : '') +
      '<div class="kk-grid">' + cells + '</div>' +
      (s.verified ? '' : '<button class="kk-b p" data-a="verify">본인 간편인증 · 🔑 열쇠 4개 받기</button>') +
      lockList(s) +
      '<div class="kk-sec"><b class="t">열린 칸은 계속 씁니다</b><div class="ln">담긴 도구는 하루 무료 횟수 안에서 계속 열립니다. 더 쓸 때의 결제 안내는 도구 안 [그 이상 쓰기] 버튼 안쪽에만 있습니다.</div></div>' +
      '<button class="kk-b g" data-a="tab" data-t="key">🔑 열쇠 더 얻기 · 5인 초대</button>' +
      '<p class="kk-note">담기·잠금은 이 기기 브라우저에만 저장됩니다. 기기를 바꾸면 처음부터 다시 담습니다.</p>';
  }

  function panelKey(s) {
    var need = 5, n = (s.invites || 0) % need, pct = Math.round(n / need * 100);
    return '<div class="kk-hd"><b>🔑 열쇠</b><span class="k">' + (s.verified ? '인증됨' : '인증 전') + '</span><button class="x" data-a="close" aria-label="닫기">✕</button></div>' +
      '<div class="kk-keys"><div class="n">' + s.keys + '</div><div class="t">열쇠 <b style="color:#FFC98F">' + s.keys + '개</b> 있습니다<br>칸 열기 · 잠긴 도구 되살리기 = 1개</div></div>' +
      '<div class="kk-sec"><b class="t">① 친구 5명 초대 · 열쇠 1개</b>' +
      '<div class="ln">초대 링크를 보낸 수로 셉니다(보낸 1번 = 1명). 5명이 되면 열쇠 1개가 들어옵니다. 지금 ' + n + '/5.</div>' +
      '<div class="kk-prog"><i style="width:' + pct + '%"></i></div>' +
      '<button class="kk-b g" data-a="invite">초대 링크 보내기 (카톡·문자)</button>' +
      '<div class="ln" style="margin-top:6px;color:#7C8DA6">친구가 실제로 들어왔는지는 서버가 없어 자동으로 확인하지 못합니다. 지금은 "보낸 횟수"로 세고, 확인이 필요하면 대표님이 문자로 확인합니다.</div></div>' +
      '<div class="kk-sec"><b class="t">② 열쇠 구입 · 문자 신청</b>' +
      '<div class="ln">사이트에서는 결제하지 않습니다. 문자로 신청하시면 금액과 입금 안내를 보내 드리고, 이용권 코드(KS+연월-4자리)를 문자로 받습니다.</div>' +
      '<a class="kk-b g" data-a="sms" href="sms:' + SMS + '?body=' + encodeURIComponent('[KTS 원클릭] 열쇠 구입 신청합니다.') + '">열쇠 구입 · 문자 신청</a>' +
      '<div class="kk-row"><input data-a="code" placeholder="이용권 코드  예: KS2611-XXXX" autocomplete="off"><button class="kk-b p w" data-a="usecode">열쇠 받기</button></div></div>' +
      '<button class="kk-b g" data-a="tab" data-t="box">← 내 박스로</button>' +
      '<p class="kk-note">열쇠 코드는 그 달에만 열립니다. 금액은 부가세 별도이며 문자로만 안내합니다.</p>';
  }

  function panelVerify(s) {
    return '<div class="kk-hd"><b>본인 간편인증</b><span class="k">🔑 4개 지급</span><button class="x" data-a="close" aria-label="닫기">✕</button></div>' +
      '<p class="kk-lead">인증하면 <b style="color:#FFC98F">🔑 열쇠 4개</b>와 <b style="color:#FFC98F">4칸 박스</b>를 드립니다. 4칸은 자유롭게 담고 바꿀 수 있습니다.</p>' +
      '<div class="kk-sec" data-a="form"><b class="t">이름 · 전화번호</b>' +
      '<div class="kk-row"><input data-a="nm" placeholder="이름" autocomplete="name"></div>' +
      '<div class="kk-row"><input data-a="tel" placeholder="010-0000-0000" inputmode="tel" autocomplete="tel"></div>' +
      '<button class="kk-b g" data-a="send">인증번호 받기</button>' +
      '<div data-a="codeBox" hidden style="margin-top:8px"><div class="ln">화면에 뜬 6자리를 넣어 주세요: <b data-a="shown" style="color:#FFC98F;font-size:14px;letter-spacing:.12em"></b></div>' +
      '<div class="kk-row"><input data-a="code" class="c" maxlength="6" inputmode="numeric" placeholder="••••••"><button class="kk-b p w" data-a="ok">확인</button></div></div></div>' +
      '<p class="kk-note">지금은 <b>서버 없이 이 기기에서만 확인하는 모의 인증</b>입니다. 번호는 저장하지 않고 마지막 두 자리만 보여 드립니다. 실제 본인확인(통신사 간편인증) 연동은 다음 단계입니다.</p>' +
      '<button class="kk-b g" data-a="tab" data-t="box">← 내 박스로</button>';
  }

  function openPanel(tab, opt) {
    opt = opt || {};
    css();
    var s = load();
    if (tab === 'box' && !s.verified) tab = 'verify';
    var html = tab === 'key' ? panelKey(s) : (tab === 'verify' ? panelVerify(s) : panelBox(s, opt.k));
    sheet(html, function (el, close) {
      function on(sel, fn) { var b = el.querySelector(sel); if (b) b.onclick = fn; }
      on('[data-a="tab"]', function (e) { var t = e.currentTarget.getAttribute('data-t'); close(); openPanel(t, opt); });
      on('[data-a="verify"]', function () { close(); openPanel('verify', opt); });
      on('[data-a="pick"]', function (e) { var i = e.currentTarget.getAttribute('data-i'); close(); picker(opt.k, i); });
      Array.prototype.forEach.call(el.querySelectorAll('[data-a="swap"]'), function (b) {
        b.onclick = function () { close(); picker(null, b.getAttribute('data-i')); };
      });
      on('[data-a="openslot"]', function () { close(); openSlot(); });
      Array.prototype.forEach.call(el.querySelectorAll('[data-a="revive"]'), function (b) {
        b.onclick = function () { if (revive(b.getAttribute('data-k'))) { close(); openPanel('box', opt); } };
      });
      on('[data-a="invite"]', function () { inviteShare(); });
      on('[data-a="usecode"]', function () {
        var v = el.querySelector('[data-a="code"]').value, r = useCode(v);
        if (r === 'ok') { close(); toast('이용권 확인 · 🔑 열쇠 1개를 받았습니다'); openPanel('key'); }
        else toast(r === 'used' ? '이미 쓴 코드입니다' : '코드가 맞지 않거나 지난달 코드입니다');
      });
      on('[data-a="send"]', function () { sendVerifyCode(el); });
      on('[data-a="ok"]', function () { doVerify(el); });
      /* 쓰기 — 하루 횟수 확인 후 이동 */
      Array.prototype.forEach.call(el.querySelectorAll('[data-a="use"]'), function (a) {
        a.onclick = function (ev) {
          ev.preventDefault();
          var k = a.getAttribute('data-k'), L = limitOf(k), u = usedToday(k);
          markUse(k);
          if (L && u + 1 >= L) toast('오늘 무료 ' + L + '회 중 마지막입니다 · 더 쓰기는 도구 안 [그 이상 쓰기]');
          location.href = a.getAttribute('href');
        };
      });
      if (el.querySelector('[data-a="nm"]') && s.verified === 0) { try { el.querySelector('[data-a="nm"]').focus(); } catch (e) {} }
    });
  }

  /* ---------- 초대 ---------- */
  function inviteLink() {
    var code = (w.KTSSlots && w.KTSSlots.ref && w.KTSSlots.ref.me) ? w.KTSSlots.ref.me() : 'KTS00000';
    return 'https://autooneclick.com/?invite=' + code;
  }
  function copyText(t) {
    return new Promise(function (res) {
      function fb() { try { var ta = d.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; d.body.appendChild(ta); ta.select(); var ok = d.execCommand('copy'); ta.remove(); res(ok); } catch (e) { res(false); } }
      if (w.navigator.clipboard && w.navigator.clipboard.writeText) w.navigator.clipboard.writeText(t).then(function () { res(true); }, fb); else fb();
    });
  }
  function addInvite() {
    var s = load(), day = today();
    if (s.inviteDay !== day) { s.inviteDay = day; s.inviteDayN = 0; }
    if ((s.inviteDayN || 0) >= 5) {          /* 하루 5번까지 센다 */
      toast('오늘 센 초대는 5명까지입니다 · 내일 또 보내실 수 있습니다'); return;
    }
    s.inviteDayN = (s.inviteDayN || 0) + 1;
    s.invites = (s.invites || 0) + 1;
    var got = false;
    if (s.invites >= 5 && (s.inviteKeys || 0) < Math.floor(s.invites / 5)) {
      s.inviteKeys = Math.floor(s.invites / 5); s.keys = (s.keys || 0) + 1; got = true;
    }
    save(s); changed();
    if (got) toast('5명 초대 달성 · 🔑 열쇠 1개를 받았습니다');
    else toast('초대 ' + (s.invites % 5) + '/5 · 5명이 되면 열쇠 1개');
  }
  function inviteShare() {
    var url = inviteLink(), text = 'KTS 원클릭 — 폰으로 바로 쓰는 업무 도구 모음 (열쇠 4개 무료)';
    var done = function () { addInvite(); };
    if (w.navigator.share) {
      return w.navigator.share({ title: 'KTS 원클릭', text: text, url: url }).then(done, function () {
        copyText(url).then(function (ok) { done(); toast(ok ? '초대 링크를 복사했습니다 · 카톡에 붙여 넣으세요' : url); });
      });
    }
    return copyText(url).then(function (ok) { done(); toast(ok ? '초대 링크를 복사했습니다 · 카톡에 붙여 넣으세요' : url); });
  }

  /* ---------- 쇼룸 압축 줄 ---------- */
  function strip(el) {
    el = typeof el === 'string' ? d.querySelector(el) : el;
    if (!el) return;
    css();
    var s = load(), g = '';
    for (var i = 0; i < s.slots; i++) {
      var k = s.box[i];
      if (k) {
        var t = info(k);
        g += '<button class="c full" data-a="use" data-k="' + esc(k) + '" data-href="' + esc(t.link) + '">' +
          (t.icon ? '<img src="' + esc(t.icon) + '" alt="">' : '<span class="e">' + esc(t.ico || '·') + '</span>') +
          '<b>' + esc(t.nm) + '</b></button>';
      } else {
        g += '<button class="c" data-a="add" data-i="' + i + '"><span class="e">+</span><b>' + (i + 1) + '칸</b></button>';
      }
    }
    g += '<button class="c lk" data-a="openslot"><span class="e">🔒</span><b>' + (s.slots + 1) + '칸</b></button>';
    el.innerHTML = '<div class="ks-strip"><div class="h"><em>🔑 ' + (s.verified ? '내 박스' : '내 박스 4칸') + '</em>' +
      '<span class="keys">' + (s.verified ? ('열쇠 ' + s.keys + '개') : '인증하면 열쇠 4개') + '</span><span class="sp"></span>' +
      '<button data-a="open">' + (s.verified ? '박스 관리' : '인증하고 받기') + '</button></div>' +
      '<div class="g" style="grid-template-columns:repeat(' + Math.min(5, s.slots + 1) + ',1fr)">' + g + '</div></div>';
    el.onclick = function (e) {
      var b = e.target.closest ? e.target.closest('[data-a]') : null;
      if (!b) return;
      var a = b.getAttribute('data-a');
      if (a === 'open') openPanel(s.verified ? 'box' : 'verify');
      else if (a === 'openslot') openSlot();
      else if (a === 'add') { var i = b.getAttribute('data-i'); if (s.verified) picker(null, i); else openPanel('verify'); }
      else if (a === 'use') {
        var href = b.getAttribute('data-href'); markUse(b.getAttribute('data-k'));
        if (href) location.href = href; else toast('이 도구는 아직 주소가 없습니다');
      }
    };
  }
  function badge() {
    var s = load();
    Array.prototype.forEach.call(d.querySelectorAll('[data-kk-badge]'), function (el) {
      el.textContent = '🔑 ' + s.keys;
      el.setAttribute('data-v', s.verified ? '1' : '0');
    });
  }

  w.KTS_KEYS = {
    state: state, verified: function () { return !!load().verified; }, keys: function () { return load().keys || 0; },
    slots: function () { return load().slots; }, box: function () { return load().box.slice(); }, locked: function () { return load().locked.slice(); },
    inBox: inBox, isLocked: isLocked, limitOf: limitOf, freeText: freeText, usedToday: usedToday, dayLeft: dayLeft,
    request: request, put: put, unput: unput, revive: revive, openSlot: openSlot, addKeys: addKeys, useCode: useCode,
    verifyNow: commitVerify,
    openPanel: openPanel, picker: picker, strip: strip, badge: badge, toast: toast, onChange: onChange, changed: changed,
    info: info, allTools: allTools, invite: inviteShare, inviteLink: inviteLink, markUse: markUse,
    reset: function () { lsSet(ST, ''); changed(); toast('박스를 처음 상태로 되돌렸습니다'); }
  };
})(window, document);
