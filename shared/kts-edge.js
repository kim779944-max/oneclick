/* ==========================================================================
   케이티에스 원클릭 — 내 메뉴 편집 (엣지 패널식 · 173)
   · 오른쪽에서 320px 패널: 지금 쓰는 도구(⠿ 끌기 · ▲▼ · [빼기]) / [+ 추가하기] / 처음 상태로 되돌리기
   · 저장: localStorage['kts_my_menu_v1'] = [{k:'listing',on:1}, …]  (배열 순서 = 손님 순서, on:0 = 뺀 것)
     이 기기에만 저장 — 서버로 보내지 않는다. 저장값이 없으면 기본 목록 그대로(아무것도 사라지지 않음).
   · 상품 목록은 인자로 받는다 → 다른 화면에서도 그대로 재사용
   · [?] 안내 시트(.edge-sheet)도 같은 모듈: KTSEdge.sheet(title, html)
   window.KTSEdge = { open(list, opts), close(), get(), set(arr), reset(), apply(list), sheet(title, html) }
     list = [{k:'listing', nm:'매물장', sub:'부동산·중개'}, …]  (기본 순서)
     opts = { key?, title?, onChange?(menu) }
   스타일은 shared/kts-ui.css 의 .edge-* (색은 --k-* 토큰 → 색깔 1·2 둘 다 따라감)
   ========================================================================== */
(function (w, d) {
  'use strict';
  var DEF_KEY = 'kts_my_menu_v1';
  var dim, pn, sh, cur = null;   /* cur = {list, key, menu, opts, addOpen} */

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function get(key) {
    try {
      var a = JSON.parse(w.localStorage.getItem(key || DEF_KEY) || 'null');
      if (Array.isArray(a)) return a.filter(function (x) { return x && typeof x.k === 'string'; }).map(function (x) { return { k: x.k, on: x.on ? 1 : 0 }; });
    } catch (e) { }
    return null;
  }
  function set(arr, key) {
    try { w.localStorage.setItem(key || DEF_KEY, JSON.stringify((arr || []).map(function (x) { return { k: x.k, on: x.on ? 1 : 0 }; }))); } catch (e) { }
  }
  function reset(key) { try { w.localStorage.removeItem(key || DEF_KEY); } catch (e) { } }
  /* 저장값 + 지금 목록 → 화면에 쓸 메뉴. 목록에 없는 키는 버리고, 저장값에 없는 새 도구는 맨 끝에 on:1 */
  function apply(list, key) {
    var keys = (list || []).map(function (x) { return x.k; }), saved = get(key);
    if (!saved) return keys.map(function (k) { return { k: k, on: 1 }; });
    var seen = {}, out = [];
    saved.forEach(function (x) { if (keys.indexOf(x.k) >= 0 && !seen[x.k]) { seen[x.k] = 1; out.push(x); } });
    keys.forEach(function (k) { if (!seen[k]) out.push({ k: k, on: 1 }); });
    return out;
  }

  function build() {
    if (dim) return;
    dim = d.createElement('div'); dim.className = 'edge-dim';
    pn = d.createElement('aside'); pn.className = 'edge-pn'; pn.setAttribute('role', 'dialog'); pn.setAttribute('aria-modal', 'true');
    pn.setAttribute('aria-hidden', 'true');
    sh = d.createElement('div'); sh.className = 'edge-sheet'; sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-modal', 'true');
    sh.setAttribute('aria-hidden', 'true');
    d.body.appendChild(dim); d.body.appendChild(pn); d.body.appendChild(sh);
    dim.addEventListener('click', function () { close(); closeSheet(); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') { close(); closeSheet(); } });
    pn.addEventListener('click', onClick);
    sh.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-edge="close"]')) closeSheet(); });
    bindDrag();
  }
  function nmOf(k) { var x = cur.list.filter(function (t) { return t.k === k; })[0]; return x || { k: k, nm: k, sub: '' }; }
  function paint() {
    var on = cur.menu.filter(function (x) { return x.on; }), off = cur.menu.filter(function (x) { return !x.on; });
    var lis = on.map(function (x, i) {
      var t = nmOf(x.k);
      return '<li class="edge-li" data-k="' + esc(x.k) + '"><span class="gr" aria-hidden="true" title="끌어서 순서 바꾸기">⠿</span>' +
        '<span class="edge-nm">' + esc(t.nm) + (t.sub ? '<small>' + esc(t.sub) + '</small>' : '') + '</span>' +
        '<button type="button" data-edge="up" aria-label="' + esc(t.nm) + ' 위로"' + (i === 0 ? ' disabled' : '') + '>▲</button>' +
        '<button type="button" data-edge="down" aria-label="' + esc(t.nm) + ' 아래로"' + (i === on.length - 1 ? ' disabled' : '') + '>▼</button>' +
        '<button type="button" class="out" data-edge="out">빼기</button></li>';
    }).join('');
    var adds = off.map(function (x) {
      var t = nmOf(x.k);
      return '<button type="button" data-edge="in" data-k="' + esc(x.k) + '"><b>+</b>' + esc(t.nm) + '</button>';
    }).join('');
    pn.innerHTML =
      '<div class="edge-hd"><b>' + esc(cur.opts.title || '내 메뉴 편집') + '</b><button type="button" class="edge-x" data-edge="done">완료</button></div>' +
      '<div class="edge-bd">' +
        '<div class="edge-lbl">지금 쓰는 도구 <i>(' + on.length + ')</i></div>' +
        (on.length ? '<ul class="edge-ul" id="edgeUl">' + lis + '</ul>' : '<p class="edge-none">모두 뺐습니다. 아래 [+ 추가하기]로 되살리세요.</p>') +
        '<button type="button" class="edge-plus" data-edge="plus" aria-expanded="' + (cur.addOpen ? 'true' : 'false') + '">+ 추가하기' + (off.length ? ' (' + off.length + ')' : '') + '</button>' +
        '<div class="edge-add"' + (cur.addOpen ? '' : ' hidden') + '>' + (adds || '<p class="edge-none">뺀 도구가 없습니다.</p>') + '</div>' +
        '<button type="button" class="edge-reset" data-edge="reset">처음 상태로 되돌리기</button>' +
      '</div>';
  }
  function save() { set(cur.menu, cur.key); cur.dirty = true; }
  function move(k, dir) {
    var on = cur.menu.filter(function (x) { return x.on; });
    var i = on.map(function (x) { return x.k; }).indexOf(k), j = i + dir;
    if (i < 0 || j < 0 || j >= on.length) return;
    var a = on[i], b = on[j], ia = cur.menu.indexOf(a), ib = cur.menu.indexOf(b);
    cur.menu[ia] = b; cur.menu[ib] = a;
  }
  function onClick(e) {
    var b = e.target.closest ? e.target.closest('[data-edge]') : null;
    if (!b || !cur) return;
    var a = b.getAttribute('data-edge'), li = b.closest('.edge-li'), k = li ? li.getAttribute('data-k') : b.getAttribute('data-k');
    if (a === 'done') { close(); return; }
    if (a === 'plus') { cur.addOpen = !cur.addOpen; paint(); return; }
    if (a === 'reset') {
      reset(cur.key); cur.menu = apply(cur.list, cur.key); cur.addOpen = false; cur.dirty = true; paint(); return;
    }
    if (a === 'up' || a === 'down') { move(k, a === 'up' ? -1 : 1); save(); paint(); focusBtn(k, a); return; }
    if (a === 'out') {
      var x = cur.menu.filter(function (m) { return m.k === k; })[0]; if (!x) return;
      cur.menu.splice(cur.menu.indexOf(x), 1); x.on = 0; cur.menu.push(x); save(); paint(); return;
    }
    if (a === 'in') {   /* 되살리기 = 지금 쓰는 목록 맨 끝 */
      var y = cur.menu.filter(function (m) { return m.k === k; })[0]; if (!y) return;
      cur.menu.splice(cur.menu.indexOf(y), 1); y.on = 1;
      var lastOn = -1; cur.menu.forEach(function (m, i) { if (m.on) lastOn = i; });
      cur.menu.splice(lastOn + 1, 0, y); save(); paint(); return;
    }
  }
  function focusBtn(k, a) {
    var b = pn.querySelector('.edge-li[data-k="' + k + '"] [data-edge="' + a + '"]');
    if (b && !b.disabled) b.focus(); else { b = pn.querySelector('.edge-li[data-k="' + k + '"] .out'); if (b) b.focus(); }
  }

  /* ⠿ 끌어서 순서 바꾸기 — 포인터 이벤트(손가락·마우스 같은 길) */
  function bindDrag() {
    var dr = null;
    pn.addEventListener('pointerdown', function (e) {
      var g = e.target.closest ? e.target.closest('.edge-li .gr') : null;
      if (!g || !cur) return;
      var li = g.parentNode, r = li.getBoundingClientRect();
      dr = { id: e.pointerId, li: li, k: li.getAttribute('data-k'), y0: e.clientY, h: r.height + 6 };
      li.classList.add('drag');
      try { g.setPointerCapture(e.pointerId); } catch (x) { }
      e.preventDefault();
    });
    pn.addEventListener('pointermove', function (e) {
      if (!dr || e.pointerId !== dr.id) return;
      var dy = e.clientY - dr.y0;
      dr.li.style.transform = 'translateY(' + dy + 'px)';
      var steps = Math.trunc(dy / dr.h);
      if (steps) {
        var n = Math.abs(steps), dir = steps > 0 ? 1 : -1, moved = 0;
        for (var i = 0; i < n; i++) { var before = idxOn(dr.k); move(dr.k, dir); if (idxOn(dr.k) !== before) moved += dir; }
        if (moved) {
          dr.y0 += moved * dr.h; save(); paint();
          dr.li = pn.querySelector('.edge-li[data-k="' + dr.k + '"]'); dr.li.classList.add('drag');
          dr.li.style.transform = 'translateY(' + (e.clientY - dr.y0) + 'px)';
          var g2 = dr.li.querySelector('.gr'); try { g2.setPointerCapture(e.pointerId); } catch (x) { }
        }
      }
    });
    function end(e) {
      if (!dr || e.pointerId !== dr.id) return;
      if (dr.li) { dr.li.classList.remove('drag'); dr.li.style.transform = ''; }
      dr = null;
    }
    pn.addEventListener('pointerup', end); pn.addEventListener('pointercancel', end);
    /* 포인터 캡처가 다시 그린 노드로 옮겨 가지 못하는 브라우저 대비 */
    w.addEventListener('pointerup', end); w.addEventListener('pointercancel', end);
  }
  function idxOn(k) { return cur.menu.filter(function (x) { return x.on; }).map(function (x) { return x.k; }).indexOf(k); }

  function open(list, opts) {
    build();
    opts = opts || {};
    cur = { list: list || [], key: opts.key || DEF_KEY, opts: opts, addOpen: false, dirty: false };
    cur.menu = apply(cur.list, cur.key);
    paint();
    dim.classList.add('on'); pn.classList.add('on'); pn.setAttribute('aria-hidden', 'false');
    pn.setAttribute('aria-label', opts.title || '내 메뉴 편집');
    setTimeout(function () { var x = pn.querySelector('.edge-x'); if (x) x.focus(); }, 30);
  }
  function close() {
    if (!pn || !cur) return;
    pn.classList.remove('on'); pn.setAttribute('aria-hidden', 'true');
    if (!sh.classList.contains('on')) dim.classList.remove('on');
    var c = cur; cur = null;
    if (c.dirty && typeof c.opts.onChange === 'function') { try { c.opts.onChange(apply(c.list, c.key)); } catch (e) { } }
  }
  /* [?] 안내 시트 — 아래에서 올라오는 시트 하나 */
  function sheet(title, html) {
    build();
    sh.innerHTML = '<div class="edge-hd"><b>' + esc(title) + '</b><button type="button" class="edge-x" data-edge="close">닫기</button></div>' +
      '<div class="edge-bd">' + html + '</div>';
    sh.setAttribute('aria-label', title);
    dim.classList.add('on'); sh.classList.add('on'); sh.setAttribute('aria-hidden', 'false');
    setTimeout(function () { var x = sh.querySelector('.edge-x'); if (x) x.focus(); }, 30);
  }
  function closeSheet() {
    if (!sh || !sh.classList.contains('on')) return;
    sh.classList.remove('on'); sh.setAttribute('aria-hidden', 'true');
    if (!pn.classList.contains('on')) dim.classList.remove('on');
  }

  w.KTSEdge = {
    open: open, close: close, get: function (key) { return get(key); }, set: function (arr, key) { set(arr, key); },
    reset: function (key) { reset(key); }, apply: apply, sheet: sheet, closeSheet: closeSheet, KEY: DEF_KEY
  };
})(window, document);
