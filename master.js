/* =============================================================================
   KTS 원클릭 — 대표님 전용 마스터 모드 (PIN 2899)
   -----------------------------------------------------------------------------
   · 일반 손님: 이 파일이 있어도 아무 일도 일어나지 않습니다.
     (플래그가 꺼져 있으면 기존 무료/유료 한도·이용권 창이 그대로 동작)
   · PIN을 넣은 기기에서만 localStorage['kts_master']='2899' 로 저장되어,
     전 상품이 횟수 제한·이용권 창 없이 열립니다.
   · 이 파일은 화면 틀을 바꾸지 않습니다. 마스터일 때 이용권 코드 입력창(.unlock)과
     PRO 잠금 표시(.lk)만 감춥니다.
   ============================================================================= */
(function (w, d) {
  var KEY = 'kts_master', PIN = '2899';

  function read() {
    try { return w.localStorage.getItem(KEY) === PIN; } catch (e) { return false; }
  }
  function write(v) {
    try { v ? w.localStorage.setItem(KEY, PIN) : w.localStorage.removeItem(KEY); } catch (e) {}
  }

  w.KTS_MASTER = read();
  w.KTS = w.KTS || {};
  w.KTS.masterPin = PIN;
  w.KTS.isMaster = function () { return !!w.KTS_MASTER; };
  /* 코드가 맞으면 이 기기에만 저장하고 true */
  w.KTS.setMaster = function (code) {
    if (String(code == null ? '' : code).replace(/\D/g, '') !== PIN) return false;
    write(true);
    w.KTS_MASTER = true;
    paint(document, w.KTS_MASTER);
    try { d.dispatchEvent(new w.CustomEvent('kts:master', { detail: { on: true } })); } catch (e) {}
    return true;
  };
  w.KTS.clearMaster = function () {
    write(false);
    w.KTS_MASTER = false;
    paint(document, false);
    try { d.dispatchEvent(new w.CustomEvent('kts:master', { detail: { on: false } })); } catch (e) {}
  };

  var CSS = '.unlock,.lk{display:none!important}' +
            'html[data-master] .kts-master-hide{display:none!important}';

  function paint(doc, on) {
    var el = doc.documentElement;
    if (!el) return;
    if (on) el.setAttribute('data-master', '1'); else el.removeAttribute('data-master');
  }

  function boot() {
    if (w.KTS_MASTER) {
      try {
        var st = d.createElement('style');
        st.id = 'kts-master-style';
        st.textContent = CSS;
        (d.head || d.documentElement).appendChild(st);
      } catch (e) {}
      paint(d, true);
    }
  }

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window, document);
