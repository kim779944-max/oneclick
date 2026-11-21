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
    '.kux-morebar{margin:7px 0 0;text-align:center}' +
    '.kux-morebar button{border:1px solid #2E4370;background:#12203C;color:#DCE6F2;border-radius:8px;padding:6px 11px;' +
    'font-family:inherit;font-size:10.5px;font-weight:900;cursor:pointer}' +
    '.kux-hid{display:none!important}' +
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
  function watch() {
    var t = 0;
    var run = function () { watermark(); };
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
    watch();
    /* 마스터를 켜고 끄면 파란 글씨도 바로 따라옵니다 */
    d.addEventListener('kts:master', function () { watermark(); });
  });

  w.KTS_UX = { seal: seal, watermark: watermark, homeLinks: homeLinks, master: master };
})(window, document);
