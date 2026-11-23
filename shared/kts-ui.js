/* ==========================================================================
   케이티에스 원클릭 — 공통 테마·인쇄 스크립트
   ① 테마: localStorage['kts_theme'] = 'dark' | 'light' (없으면 dark) — 서버로 보내지 않음
   ② 인쇄: beforeprint → html.kts-printing / afterprint → 해제
   ③ window.KTSUI = { theme(), setTheme(t), toggle() }
   토글 버튼: [data-kts-theme-toggle] 또는 .k-theme 를 자동으로 연결
   ========================================================================== */
(function (w, d) {
  'use strict';
  var KEY = 'kts_theme', root = d.documentElement;

  function read() {
    var v = null;
    try { v = w.localStorage.getItem(KEY); } catch (e) {}
    return v === 'light' ? 'light' : 'dark';
  }
  function cur() { return root.getAttribute('data-kts-theme') === 'light' ? 'light' : 'dark'; }
  function paint() {
    var t = cur(), light = t === 'light';
    Array.prototype.forEach.call(d.querySelectorAll('[data-kts-theme-toggle],.k-theme'), function (b) {
      b.textContent = light ? '☀' : '☾';          /* ☀ / ☾ */
      b.setAttribute('aria-pressed', light ? 'true' : 'false');
      b.setAttribute('aria-label', light ? '어둡게 보기' : '밝게 보기');
      b.setAttribute('title', light ? '어둡게 보기' : '밝게 보기');
    });
    var m = d.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', light ? '#ffffff' : '#0b132b');
  }
  function setTheme(t) {
    t = t === 'light' ? 'light' : 'dark';
    root.setAttribute('data-kts-theme', t);
    try { w.localStorage.setItem(KEY, t); } catch (e) {}
    paint();
    try { d.dispatchEvent(new CustomEvent('kts:theme', { detail: t })); } catch (e) {}
    return t;
  }
  function toggle() { return setTheme(cur() === 'light' ? 'dark' : 'light'); }

  /* 저장값 적용(값 없으면 마크업의 dark 그대로) */
  root.setAttribute('data-kts-theme', read());

  w.addEventListener('beforeprint', function () { root.classList.add('kts-printing'); });
  w.addEventListener('afterprint', function () { root.classList.remove('kts-printing'); });

  function bind() {
    paint();
    d.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('[data-kts-theme-toggle],.k-theme') : null;
      if (!b) return;
      e.preventDefault();
      toggle();
    });
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', bind); else bind();

  w.KTSUI = { theme: cur, setTheme: setTheme, toggle: toggle };
})(window, document);
