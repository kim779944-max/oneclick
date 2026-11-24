/* =============================================================================
   KTS 원클릭 — 수익 구조 안내 (결제 단계) · 2026-11-24
   -----------------------------------------------------------------------------
   대표님 확정 원칙 그대로만 담았습니다.
   · 가격은 부가세 별도가 원칙이되, 화면 가격표에는 '부가세 별도'를 쓰지 않고
     이 결제 단계(이 시트)에서 공급가·부가세·입금액으로 자연스럽게 보여 줍니다.
   · 결제수단은 ① 크몽·스마트스토어(플랫폼 결제) ② 계좌이체 ③ 이용권 코드.
     카드 PG 직접 결제는 없습니다 — 없는 결제수단을 만들지 않습니다.
   · 이용권 코드는 문자로 받은 KS+YYMM-4자리, 그 달에만 열립니다(이 기기에서 확인).
   · 돈 이야기는 여기(결제 단계) 안에서만. 도구 화면에는 [그 이상 쓰기] 버튼만.
   · 계좌 정보는 아래 ACCOUNT 에만 있습니다. 비어 있으면 화면은 '문자로 안내'로
     바뀝니다 — 계좌번호를 지어내지 않습니다.
   ============================================================================= */
(function (w, d) {
  'use strict';

  /* ---------- 대표님이 채우실 자리 ----------
     bank: 은행 이름 / no: 계좌번호 / holder: 예금주
     셋 다 채우면 시트에 그대로 인쇄됩니다. 하나라도 비면 '문자로 안내'로 표시. */
  var ACCOUNT = {
    bank: '',
    no: '',
    holder: ''
  };
  var SMS = '01020022899';
  var ST = 'kts_pay_v1';

  function full() { return !!(ACCOUNT.bank && ACCOUNT.no && ACCOUNT.holder); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ls(k, v) { try { if (v === undefined) return w.localStorage.getItem(k); w.localStorage.setItem(k, v); return true; } catch (e) { return null; } }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function now() { return new Date(); }
  function yymm(t) { t = t || now(); return String(t.getFullYear()).slice(2) + pad(t.getMonth() + 1); }
  function ym(t) { t = t || now(); return t.getFullYear() + '-' + pad(t.getMonth() + 1); }
  function money(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  /* 부가세 — 공급가의 10%. 만원 미만 단수는 원 단위에서 반올림 */
  function vat(n) { n = Math.round(n); var v = Math.round(n * 0.1); return { supply: n, vat: v, total: n + v }; }

  /* 더싸인·칸 추가와 같은 계산식: KS + YYMM + '-' + fnv('kts-sign-' + YYMM) 앞 4자리 */
  function fnv(s) { var h = 0x811c9dc5; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h; }
  function codeOf(t) { return 'KS' + yymm(t) + '-' + fnv('kts-sign-' + yymm(t)).toString(16).toUpperCase().padStart(8, '0').slice(0, 4); }
  function codeOk(c) {
    var m = String(c || '').trim().toUpperCase().match(/^KS(\d{4})-([0-9A-F]{4})$/);
    if (!m || m[1] !== yymm()) return false;
    return codeOf().slice(-4) === m[2];
  }
  function master() { return w.KTS_MASTER === true; }

  function load() { var s = null; try { s = JSON.parse(ls(ST) || 'null'); } catch (e) { s = null; } if (!s || typeof s !== 'object') s = {}; if (!Array.isArray(s.codes)) s.codes = []; return s; }
  function save(s) { ls(ST, JSON.stringify(s)); return s; }

  /* ---------- 화면 ---------- */
  var cssDone = false;
  function css() {
    if (cssDone) return; cssDone = true;
    var s = d.createElement('style'); s.id = 'ktspay-style';
    s.textContent =
      '.kpay-dim{position:fixed;inset:0;z-index:520;background:rgba(5,9,22,.74);display:flex;align-items:flex-end;justify-content:center}' +
      '.kpay-box{width:100%;max-width:460px;box-sizing:border-box;max-height:90vh;overflow:auto;background:linear-gradient(180deg,#12203C,#0F1B33);border:1px solid #2E4370;border-bottom:0;border-radius:18px 18px 0 0;padding:16px 15px 20px;color:#F3F6FA;font-family:inherit;-webkit-overflow-scrolling:touch}' +
      '.kpay-hd{display:flex;align-items:center;gap:8px;margin-bottom:6px}' +
      '.kpay-hd b{font-size:15px;font-weight:900;letter-spacing:-.4px;flex:1}.kpay-hd b i{font-style:normal;color:#FFA24D}' +
      '.kpay-hd .x{border:0;background:transparent;color:#8FA1B8;font-size:17px;font-weight:900;cursor:pointer;padding:0 2px;font-family:inherit}' +
      '.kpay-lead{margin:0 0 10px;font-size:12px;color:#AFBDD0;line-height:1.55;word-break:keep-all}' +
      '.kpay-amt{border:1px solid rgba(255,162,77,.45);background:rgba(255,107,0,.08);border-radius:12px;padding:9px 11px;margin-bottom:10px}' +
      '.kpay-amt .r{display:flex;align-items:baseline;gap:8px;font-size:11.5px;color:#C7D3E3;padding:2px 0}' +
      '.kpay-amt .r span{flex:1}.kpay-amt .r b{font-size:13px;font-weight:900;color:#F3F6FA}' +
      '.kpay-amt .r.tot{border-top:1px dashed rgba(255,162,77,.35);margin-top:5px;padding-top:6px}' +
      '.kpay-amt .r.tot b{font-size:15px;color:#FFC98F}' +
      '.kpay-sec{border:1px solid #26375F;border-radius:12px;padding:10px;margin-top:9px;background:#0E1A33}' +
      '.kpay-sec>b.t{display:block;font-size:12px;font-weight:900;margin-bottom:4px}.kpay-sec>b.t em{font-style:normal;color:#FFA24D;margin-right:4px}' +
      '.kpay-sec .ln{font-size:11px;color:#AFBDD0;line-height:1.6;word-break:keep-all}' +
      '.kpay-sec .ln+.ln{margin-top:3px}' +
      '.kpay-sec .ln b{color:#FFD9A6}' +
      '.kpay-sec .acct{margin:6px 0 4px;border:1px dashed #2E4370;border-radius:9px;padding:7px 9px;font-size:11px;color:#DCE6F2;line-height:1.75}' +
      '.kpay-sec .acct .k{color:#8FA1B8;display:inline-block;min-width:52px}' +
      '.kpay-sec .acct .v{font-weight:900;color:#FFC98F;word-break:break-all}' +
      '.kpay-row{display:flex;gap:6px;margin-top:7px}' +
      '.kpay-row input{flex:1;min-width:0;box-sizing:border-box;background:#0B1729;border:1px solid #26375F;border-radius:10px;color:#F3F6FA;font-size:13px;padding:10px;font-family:inherit;text-transform:uppercase}' +
      '.kpay-b{display:flex;align-items:center;justify-content:center;border:0;border-radius:11px;padding:11px 12px;font-size:13px;font-weight:900;cursor:pointer;text-decoration:none;font-family:inherit;box-sizing:border-box;width:100%}' +
      '.kpay-b.p{background:linear-gradient(135deg,#FF6B00,#FFA24D);color:#0A1224}' +
      '.kpay-b.g{background:#12203C;color:#DCE6F2;border:1px solid #2E4370}' +
      '.kpay-b.s{width:auto;padding:9px 12px;font-size:12px}' +
      '.kpay-b[disabled]{opacity:.45;cursor:default}' +
      '.kpay-note{font-size:10.5px;color:#7C8DA6;margin-top:10px;line-height:1.6;word-break:keep-all}' +
      '.kpay-toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:530;background:rgba(10,17,40,.97);border:1px solid rgba(255,107,0,.5);color:#fff;font-size:12px;font-weight:800;padding:9px 14px;border-radius:999px;max-width:90%;text-align:center;opacity:0;transition:.25s;pointer-events:none}' +
      '.kpay-toast.on{opacity:1}' +
      '.kpay-line{margin:9px 12px 0;border:1px solid rgba(77,163,255,.4);border-radius:12px;padding:9px 11px;background:rgba(77,163,255,.07);font-family:inherit}' +
      '.kpay-line .t{font-size:10.5px;color:#AFBDD0;line-height:1.5}' +
      '.kpay-line button{margin-top:6px;border:1px solid rgba(255,162,77,.5);background:rgba(255,107,0,.12);color:#FFC98F;border-radius:8px;padding:5px 9px;font-family:inherit;font-size:10.5px;font-weight:900;cursor:pointer}';
    (d.head || d.documentElement).appendChild(s);
  }
  var toastT = 0;
  function toast(m) {
    css(); var t = d.querySelector('.kpay-toast');
    if (!t) { t = d.createElement('div'); t.className = 'kpay-toast'; d.body.appendChild(t); }
    t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 2800);
  }
  function sheet(html, bind) {
    css();
    var old = d.querySelectorAll('.kpay-dim');
    for (var i = 0; i < old.length; i++) if (old[i].parentNode) old[i].parentNode.removeChild(old[i]);
    var dim = d.createElement('div'); dim.className = 'kpay-dim';
    dim.innerHTML = '<div class="kpay-box" role="dialog" aria-modal="true" aria-label="결제 안내">' + html + '</div>';
    d.body.appendChild(dim);
    function close() { if (dim.parentNode) dim.parentNode.removeChild(dim); }
    dim.addEventListener('click', function (e) { if (e.target === dim) close(); });
    var x = dim.querySelector('.kpay-hd .x'); if (x) x.onclick = close;
    if (bind) bind(dim, close);
    return close;
  }

  function smsHref(body) { return 'sms:' + SMS + '?body=' + encodeURIComponent(body); }

  /* 계좌이체 안내 HTML — slots.js(내 박스·열쇠)에서도 같은 글을 씁니다 */
  function accountHtml(opt) {
    opt = opt || {};
    css();
    var who = full() ? '' :
      '<div class="ln">계좌는 <b>문자로 바로</b> 보내 드립니다. 아래 [문자로 계좌 받기]를 누르시면 답장으로 은행·계좌번호·예금주를 보내 드립니다.</div>' +
      '<a class="kpay-b g" style="margin-top:7px" href="' + smsHref('[KTS 원클릭] ' + (opt.label || '이용권') + ' 계좌 안내 부탁드립니다. 이름: ') + '">문자로 계좌 받기</a>';
    var acct = full() ?
      '<div class="acct"><div><span class="k">은행</span> <span class="v">' + esc(ACCOUNT.bank) + '</span></div>' +
      '<div><span class="k">계좌번호</span> <span class="v">' + esc(ACCOUNT.no) + '</span></div>' +
      '<div><span class="k">예금주</span> <span class="v">' + esc(ACCOUNT.holder) + '</span></div></div>' : '';
    return '<div class="kpay-sec"><b class="t"><em>②</em>계좌이체</b>' + acct + who +
      '<div class="ln" style="margin-top:6px"><b>입금자명</b>은 신청하신 성함 그대로 넣어 주세요. 다른 이름으로 넣으시면 확인이 늦어집니다.</div>' +
      '<div class="ln">입금하신 뒤 <b>[입금 알림]</b> 문자를 보내 주시면, 그 달 <b>이용권 코드</b>(KS+연월-4자리)를 문자로 보내 드립니다.</div>' +
      '<a class="kpay-b g" style="margin-top:7px" href="' + smsHref('[KTS 원클릭] ' + (opt.label || '이용권') + ' 입금했습니다. 입금자명: / 금액: ') + '">입금 알림 문자 보내기</a></div>';
  }

  /* 전체 결제 안내 시트 */
  function open(opt) {
    opt = opt || {};
    var label = opt.label || opt.tool || '이용권';
    var amtHtml = '';
    if (opt.amount && !isNaN(+opt.amount)) {
      var v = vat(+opt.amount);
      amtHtml = '<div class="kpay-amt">' +
        '<div class="r"><span>' + esc(label) + ' 이용 금액</span><b>' + money(v.supply) + '원</b></div>' +
        '<div class="r"><span>부가세</span><b>' + money(v.vat) + '원</b></div>' +
        '<div class="r tot"><span>입금하실 금액</span><b>' + money(v.total) + '원</b></div></div>';
    }
    var html =
      '<div class="kpay-hd"><b>결제 안내 · <i>' + esc(label) + '</i></b><button type="button" class="x" aria-label="닫기">✕</button></div>' +
      '<p class="kpay-lead">이 화면에서는 카드 결제를 받지 않습니다. 아래 셋 중 편한 방법으로 쓰시면 됩니다.</p>' +
      amtHtml +
      '<div class="kpay-sec"><b class="t"><em>①</em>크몽 · 스마트스토어에서 결제</b>' +
      '<div class="ln">같은 상품이 <b>크몽</b>·<b>스마트스토어</b>에 올라와 있습니다. 그쪽에서 결제하시면 카드영수증·현금영수증이 그 자리에서 남습니다.</div>' +
      '<div class="ln">결제 뒤 받으신 <b>이용권 코드</b>를 아래 ③에 넣으시면 이 화면에서 바로 열립니다.</div></div>' +
      accountHtml({ label: label }) +
      '<div class="kpay-sec"><b class="t"><em>③</em>이용권 코드 넣기</b>' +
      '<div class="ln">문자로 받은 코드(KS+연월-4자리)를 넣으면 이번 달 이용권이 열립니다. 지난달 코드는 열리지 않습니다.</div>' +
      '<div class="kpay-row"><input data-a="code" placeholder="예: KS2611-XXXX" autocomplete="off" aria-label="이용권 코드"><button type="button" class="kpay-b p" style="width:auto;padding:10px 14px" data-a="go">확인</button></div>' +
      '<div class="ln" data-a="ok" hidden style="margin-top:6px;color:#9BE7A8"></div></div>' +
      '<p class="kpay-note">이용권 코드는 그 달에만 열립니다. 이 사이트는 카드번호·계좌번호를 저장하지 않고, 결제도 이 화면에서 하지 않습니다.</p>' +
      (master() ? '<p class="kpay-note" style="color:#FFA24D">마스터 · 계좌 칸: ' + (full() ? '입력됨' : '비어 있음(pay.js ACCOUNT)') + ' · 이번 달 코드 ' + codeOf() + '</p>' : '');

    sheet(html, function (el, close) {
      var inp = el.querySelector('[data-a="code"]');
      var out = el.querySelector('[data-a="ok"]');
      el.querySelector('[data-a="go"]').onclick = function () {
        var r = redeem(inp.value, label);
        if (r === 'ok') {
          out.hidden = false; out.textContent = '이용권 확인 — 이번 달 이용권이 열렸습니다.';
          toast('이용권 확인 · 이번 달 열렸습니다');
        } else if (r === 'used') {
          toast('이미 쓴 코드입니다');
        } else {
          toast('코드가 맞지 않거나 지난달 코드입니다');
        }
      };
      if (inp) { try { inp.focus(); } catch (e) {} }
    });
  }

  /* 코드 확인 — 이 기기에 기록하고, 쇼룸 열쇠(KTS_KEYS)에도 1개 넣습니다 */
  function redeem(code, label) {
    var c = String(code || '').trim().toUpperCase();
    if (!codeOk(c)) return 'bad';
    var s = load();
    if (s.codes.indexOf(c) >= 0) return 'used';
    s.codes.push(c);
    (s.by || (s.by = {}))[c] = { label: label || '', at: ym() };
    save(s);
    /* 열쇠로도 쓸 수 있게 — 쇼룸이 열려 있으면 열쇠 1개 지급(중복 코드는 무시) */
    try {
      if (w.KTS_KEYS && typeof w.KTS_KEYS.useCode === 'function') w.KTS_KEYS.useCode(c);
      else if (w.KTSSlots && w.KTSSlots.codeOk && w.KTSSlots.codeOk(c) && w.KTS_KEYS) { /* 없으면 기록만 */ }
      /* 더싸인은 그 화면의 열쇠 이름(kts_sign_code)으로 바로 엽니다 */
      if (w.location && /\/sign\//.test(w.location.pathname)) w.localStorage.setItem('kts_sign_code', c);
    } catch (e) {}
    return 'ok';
  }
  function redeemed(code) { var s = load(); return s.codes.indexOf(String(code || '').trim().toUpperCase()) >= 0; }
  function hasThisMonth() { var s = load(); return s.codes.some(function (c) { return codeOk(c); }); }

  /* 페이지 안에 한 줄 안내를 붙일 때 (도구 화면 [그 이상 쓰기] 옆) */
  function line(el) {
    if (!el || el.querySelector('.kpay-line')) return;
    css();
    var box = d.createElement('div'); box.className = 'kpay-line';
    box.innerHTML = '<div class="t">결제는 ① 크몽·스마트스토어 ② 계좌이체 ③ 이용권 코드 — 셋 중 하나입니다.</div>' +
      '<button type="button">계좌이체 · 이용권 코드 안내</button>';
    box.querySelector('button').onclick = function () { open({}); };
    el.appendChild(box);
  }

  w.KTSPay = {
    ACCOUNT: ACCOUNT, open: open, accountHtml: accountHtml, codeOk: codeOk, codeOf: codeOf,
    redeem: redeem, redeemed: redeemed, hasThisMonth: hasThisMonth, vat: vat, toast: toast, line: line,
    sms: SMS, ready: function () { return full(); }
  };
})(window, document);
