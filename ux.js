/* =============================================================================
   KTS 원클릭 — 공통 UX (2026-11-21 · 1트랙)
   -----------------------------------------------------------------------------
   이 파일 하나로 모든 도구에 같은 규칙을 겁니다. 도구 페이지에는 아래 두 줄만 넣습니다.

     <script>window.KTS_UX_CFG={tool:'converter', free:'하루 3장 무료', more:'...'};</script>
     <script src="../ux.js"></script>

   ① 쇼룸 홈 버튼은 새 창(target="_blank")으로 엽니다.
   ② 유료 허들이 있는 도구는 맨 위에 "하루 N회 무료"를 크게 띄우고,
      돈 이야기는 [그 이상 쓰기] 버튼 안쪽에만 둡니다.
      (페이지 안의 요금표에는 data-kts-money 를 붙이면 같은 버튼으로 접힙니다)
   ③ 결과물 맨 밑에 파란 글씨 autooneclick.com — 마스터(대표님)면 지웁니다.
   ④ 결과물 순서 안내: [확인하기] → 전체뷰 → [저장] / [공유하기]
   · 저장은 이 파일이 하지 않습니다. 각 도구의 기존 저장·복사 기능을 그대로 씁니다.
   ============================================================================= */
(function (w, d) {
  'use strict';
  var CFG = w.KTS_UX_CFG || {};
  if (CFG.off) return;
  var SITE = 'autooneclick.com';
  var WM_SEL = CFG.wm || ['#printArea', '#out', '#result', '#preview', '#outBox'];

  function master() { try { return !!(w.KTS && w.KTS.isMaster && w.KTS.isMaster()); } catch (e) { return false; } }
  function ready(fn) { if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', fn); else fn(); }

  var CSS =
    '.kux-free{margin:9px 12px 0;border:1px solid rgba(255,107,0,.5);border-radius:13px;padding:11px 12px;' +
    'background:linear-gradient(105deg,rgba(255,107,0,.16),rgba(255,255,255,.02) 72%);font-family:inherit}' +
    '.kux-free>b{display:block;font-size:15px;font-weight:900;letter-spacing:-.5px;color:#fff;line-height:1.3}' +
    '.kux-free>b em{font-style:normal;color:#FFA24D}' +
    '.kux-free>span{display:block;font-size:10.5px;color:#AFBDD0;margin-top:3px;line-height:1.5}' +
    '.kux-free .m{border:1px solid #2E4370;background:#12203C;color:#DCE6F2;border-radius:8px;padding:5px 9px;' +
    'font-family:inherit;font-size:10.5px;font-weight:900;cursor:pointer;margin-top:7px}' +
    '.kux-more-in{margin-top:8px;border:1px dashed rgba(255,162,77,.45);border-radius:10px;padding:9px 10px;' +
    'font-size:10.5px;line-height:1.6;color:#C7D3E3;word-break:keep-all}' +
    '.kux-more-in b{color:#FFD9A6}.kux-more-in a{color:#FFA24D;font-weight:900;text-decoration:none;border-bottom:1px solid rgba(255,162,77,.45)}' +
    '.kuxguide{margin:8px 12px 0;font-size:10px;line-height:1.55;color:#7C8DA6;word-break:keep-all}' +
    '.kuxguide b{color:#C7D3E3}' +
    '.kuxwm{display:block;width:100%;margin-top:9px;text-align:right;font-family:inherit;font-size:10.5px;font-weight:900;' +
    'letter-spacing:.02em;color:#4DA3FF;text-decoration:none;line-height:1.4}' +
    '.kuxwm a{color:#4DA3FF;text-decoration:none}' +
    '.kux-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:410;background:rgba(10,17,40,.97);border:1px solid rgba(255,107,0,.5);color:#fff;font-size:12px;font-weight:800;padding:9px 14px;border-radius:999px;max-width:90%;text-align:center;opacity:0;transition:.2s;pointer-events:none}.kux-toast.on{opacity:1}' +
    '.kux-morebar{margin:7px 0 0;text-align:center}' +
    '.kux-morebar button{border:1px solid #2E4370;background:#12203C;color:#DCE6F2;border-radius:8px;padding:6px 11px;' +
    'font-family:inherit;font-size:10.5px;font-weight:900;cursor:pointer}' +
    '.kux-hid{display:none!important}' +
    '.kux-flow{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:9px 0 0}' +
    '.kux-flow button{font-family:inherit;font-size:11px;font-weight:900;border-radius:9px;padding:9px 4px;cursor:pointer;' +
    'border:1px solid #2E4370;background:#12203C;color:#DCE6F2}' +
    '.kux-flow button.p{background:linear-gradient(180deg,#FF8A2B,#FF6B00);border-color:#FF6B00;color:#0A1224}' +
    '.kux-full{position:fixed;inset:0;z-index:400;background:#070D1C;overflow:auto;font-family:inherit}' +
    '.kux-full .bar{position:sticky;top:0;display:flex;align-items:center;gap:7px;padding:11px 14px;background:rgba(7,13,28,.96);border-bottom:1px solid #1B2946}' +
    '.kux-full .bar b{font-size:12px;font-weight:900;color:#F3F6FA;flex:1}' +
    '.kux-full .bar button{font-family:inherit;font-size:11.5px;font-weight:900;border-radius:9px;padding:7px 10px;border:1px solid #2E4370;background:#12203C;color:#DCE6F2;cursor:pointer}' +
    '.kux-full .body{padding:14px;max-width:560px;margin:0 auto;color:#F3F6FA;font-size:13px;line-height:1.7}' +
    '@media print{.kux-free,.kux-morebar,.kuxguide{display:none!important}' +
    '.kuxwm{display:block;text-align:center;color:#1a73e8;font-size:9pt}}';

  function style() {
    if (d.getElementById('kux-style')) return;
    var s = d.createElement('style'); s.id = 'kux-style'; s.textContent = CSS;
    (d.head || d.documentElement).appendChild(s);
  }

  /* ① 쇼룸 홈 버튼 — 새 창 */
  function homeLinks() {
    var as = d.querySelectorAll('a[href]');
    for (var i = 0; i < as.length; i++) {
      var a = as[i], h = a.getAttribute('href') || '';
      if (!/autooneclick\.com/i.test(h)) continue;
      if (a.getAttribute('target') !== '_blank') { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener'); }
    }
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ⑤ 결제 단계 안내 — pay.js(계좌이체·이용권 코드). [그 이상 쓰기] 안쪽에서만 엽니다.
     도구 페이지는 ux.js 한 줄만 넣으므로, pay.js 는 이 파일과 같은 폴더에서 스스로 불러옵니다. */
  var PAY_BASE = '';
  try { var self = d.currentScript; if (self && self.src) PAY_BASE = self.src.replace(/ux\.js(\?.*)?$/, ''); } catch (e) {}
  function priceOf(html) {
    var m = String(html || '').match(/([\d,]{3,})\s*원/);
    return m ? +m[1].replace(/,/g, '') : 0;
  }
  function payOpen(opt) {
    if (w.KTSPay) { w.KTSPay.open(opt); return; }
    if (!PAY_BASE) { toastMsg('결제 안내를 열지 못했습니다 — 문자로 문의해 주세요'); return; }
    var s = d.createElement('script');
    s.src = PAY_BASE + 'pay.js?v=20261124a';
    s.onload = function () { if (w.KTSPay) w.KTSPay.open(opt); else toastMsg('결제 안내를 열지 못했습니다 — 문자로 문의해 주세요'); };
    s.onerror = function () { toastMsg('결제 안내를 열지 못했습니다 — 문자로 문의해 주세요'); };
    (d.head || d.documentElement).appendChild(s);
  }

  /* ② 하루 무료 횟수 크게 + [그 이상 쓰기] 안쪽에 돈 이야기 */
  function hurdle() {
    if (!CFG.free) return;
    var bar = d.createElement('div');
    bar.className = 'kux-free';
    var txt = String(CFG.free).trim();
    var i = txt.lastIndexOf('무료');
    var big = i > 0 ? txt.slice(0, i).trim() : txt;
    var tail = i > 0 ? txt.slice(i) : '';
    bar.innerHTML = '<b><em>' + esc(big) + '</em>' + (tail ? ' ' + esc(tail) : '') + '</b>' +
      '<span>' + esc(CFG.freeSub || '오늘 무료로 쓰고, 더 쓸 때만 [그 이상 쓰기]를 누르세요. 결제는 이 화면에서 하지 않습니다.') + '</span>' +
      (CFG.more ? '<button class="m" type="button">그 이상 쓰기 ▾</button>' +
        '<div class="kux-more-in" hidden>' + CFG.more + '</div>' : '');
    var anchor = CFG.after ? d.querySelector(CFG.after) : null;
    if (!anchor) anchor = d.querySelector('header') || d.body.firstElementChild;
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(bar, anchor.nextSibling);
    else d.body.insertBefore(bar, d.body.firstChild);
    var b = bar.querySelector('.m');
    if (b) b.onclick = function () {
      var box = bar.querySelector('.kux-more-in');
      box.hidden = !box.hidden;
      b.textContent = box.hidden ? '그 이상 쓰기 ▾' : '접기 ▴';
    };
    /* 결제 단계 — ① 크몽·스마트스토어 ② 계좌이체 ③ 이용권 코드 */
    var mbox = bar.querySelector('.kux-more-in');
    if (mbox && !mbox.querySelector('[data-paygo]')) {
      var pb = d.createElement('button');
      pb.type = 'button'; pb.className = 'm'; pb.style.marginTop = '8px';
      pb.setAttribute('data-paygo', '1');
      pb.textContent = '계좌이체 · 이용권 코드 안내 ▾';
      pb.onclick = function () {
        var nm = '';
        try { nm = String(d.title || '').split(/[—|·]/)[0].replace(/^KTS\s*/, '').trim(); } catch (e) { nm = ''; }
        payOpen({ label: CFG.toolTitle || nm || CFG.tool || '이용권', amount: CFG.amount || priceOf(CFG.more) });
      };
      mbox.appendChild(pb);
    }
  }

  /* ②-b 페이지 안 요금표 접기 — data-kts-money */
  function moneyBlocks() {
    var list = d.querySelectorAll('[data-kts-money]');
    for (var i = 0; i < list.length; i++) {
      (function (block) {
        if (block.getAttribute('data-kts-done') === '1') return;
        block.setAttribute('data-kts-done', '1');
        block.classList.add('kux-hid');
        var bar = d.createElement('div');
        bar.className = 'kux-morebar';
        var btn = d.createElement('button');
        btn.type = 'button';
        btn.textContent = (block.getAttribute('data-kts-money') || '그 이상 쓰기') + ' ▾';
        bar.appendChild(btn);
        block.parentNode.insertBefore(bar, block);
        btn.onclick = function () {
          var hid = block.classList.toggle('kux-hid');
          btn.textContent = (block.getAttribute('data-kts-money') || '그 이상 쓰기') + (hid ? ' ▾' : ' ▴');
          if (!hid) { try { block.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {} }
        };
      })(list[i]);
    }
  }

  /* ③ 결과물 맨 밑 파란 글씨 */
  function seal(el) {
    if (!el || el.querySelector('.kuxwm')) return;
    var tagName = (el.tagName || '').toUpperCase();
    if (tagName === 'CANVAS' || tagName === 'IMG') return;
    var a = d.createElement('a');
    a.className = 'kuxwm'; a.href = 'https://' + SITE + '/'; a.target = '_blank'; a.rel = 'noopener';
    a.textContent = SITE;
    el.appendChild(a);
  }
  function watermark() {
    if (master()) {                     /* 대표님 화면 — 표시 안 함 */
      var old = d.querySelectorAll('.kuxwm');
      for (var j = 0; j < old.length; j++) old[j].parentNode.removeChild(old[j]);
      return;
    }
    for (var i = 0; i < WM_SEL.length; i++) {
      var el = d.querySelector(WM_SEL[i]);
      if (!el) continue;
      if (!el.textContent && !el.querySelector('*')) continue;   /* 빈 결과에는 붙이지 않음 */
      seal(el);
    }
  }
  /* ④-b 결과물 4버튼 — 확인하기 · 전체뷰 · 저장 · 공유하기 (결과가 생기면 그 위에 붙습니다) */
  var INIT_TXT = {};
  function firstResult() {
    for (var i = 0; i < WM_SEL.length; i++) {
      var sel = WM_SEL[i], el = d.querySelector(sel);
      if (!el) continue;
      var now = (el.textContent || '').replace(/\s/g, '');
      if (INIT_TXT[sel] === undefined) INIT_TXT[sel] = now;       /* 처음 화면(빈 상태)은 건너뜀 */
      if (now.length > 12 && now !== INIT_TXT[sel]) return el;
    }
    return null;
  }
  function flowBar() {
    if (!CFG.flow) return;
    var host = firstResult();
    if (!host || host.getAttribute('data-kux-flow') === '1') return;
    host.setAttribute('data-kux-flow', '1');
    var bar = d.createElement('div');
    bar.className = 'kux-flow';
    bar.innerHTML = '<button type="button" class="p" data-f="check">확인하기</button>' +
      '<button type="button" data-f="full">전체뷰</button>' +
      '<button type="button" data-f="save">저장</button>' +
      '<button type="button" data-f="share">공유하기</button>';
    host.parentNode.insertBefore(bar, host);
    bar.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-f]') : null;
      if (!b) return;
      var f = b.getAttribute('data-f');
      if (f === 'check') {
        try { host.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (x) {}
      } else if (f === 'full') {
        var ov = d.createElement('div'); ov.className = 'kux-full';
        ov.innerHTML = '<div class="bar"><b>' + (CFG.toolTitle || '결과 전체뷰') + '</b>' +
          '<button type="button" data-x="print">저장(인쇄)</button>' +
          '<button type="button" data-x="close">닫기 ✕</button></div>' +
          '<div class="body">' + host.innerHTML + '</div>';
        d.body.appendChild(ov);
        ov.addEventListener('click', function (ev) {
          var t = ev.target.closest ? ev.target.closest('[data-x]') : null;
          if (!t) return;
          if (t.getAttribute('data-x') === 'close') ov.remove();
          else { try { w.print(); } catch (x) {} }
        });
        if (!master()) seal(ov.querySelector('.body'));
      } else if (f === 'save') {
        try { w.print(); } catch (x) { toastMsg('인쇄로 저장해 주세요'); }
      } else if (f === 'share') {
        var txt = (host.innerText || host.textContent || '').trim().slice(0, 400);
        if (w.navigator && w.navigator.share) {
          w.navigator.share({ title: CFG.toolTitle || 'KTS 원클릭', text: txt, url: w.location.href }).catch(function () {});
        } else if (w.navigator && w.navigator.clipboard) {
          w.navigator.clipboard.writeText(txt).then(function () { toastMsg('복사했습니다 — 카톡에 붙여 넣으세요'); }, function () {});
        }
      }
    });
  }
  function toastMsg(m) {
    var t = d.querySelector('.kux-toast');
    if (!t) { t = d.createElement('div'); t.className = 'kux-toast'; d.body.appendChild(t); }
    t.textContent = m; t.classList.add('on');
    clearTimeout(toastMsg._t); toastMsg._t = setTimeout(function () { t.classList.remove('on'); }, 2400);
  }

  function watch() {
    var t = 0;
    var run = function () { watermark(); flowBar(); };
    try {
      var mo = new MutationObserver(function () { clearTimeout(t); t = setTimeout(run, 350); });
      mo.observe(d.body, { childList: true, subtree: true });
    } catch (e) {}
  }

  /* ④ 결과물 순서 — [확인하기] → 전체뷰 → [저장]/[공유하기] */
  function guide() {
    if (!CFG.flow) return;
    var p = d.createElement('p');
    p.className = 'kuxguide';
    p.innerHTML = '결과물은 <b>[확인하기] → 전체뷰 → [저장] · [공유하기]</b> 순서로 받으세요.' +
      (master() ? ' (대표님 화면 — 아래 파란 글씨 표시 없음)' : '');
    var anchor = d.querySelector('.kux-free') || d.querySelector('header');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(p, anchor.nextSibling);
  }

  ready(function () {
    style();
    homeLinks();
    moneyBlocks();
    hurdle();
    guide();
    watermark();
    flowBar();
    watch();
    /* 마스터를 켜고 끄면 파란 글씨도 바로 따라옵니다 */
    d.addEventListener('kts:master', function () { watermark(); });
  });

  w.KTS_UX = { seal: seal, watermark: watermark, homeLinks: homeLinks, master: master };
})(window, document);
