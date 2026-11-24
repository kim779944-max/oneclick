/* ==========================================================================
   KTS 원클릭 — 도구 사이 문서 넘기기 (2026-11-24 · 188번)
   더뷰 → 양식만들기 : 열람 중인 문서를 그림(JPEG)으로 넘겨 그 자리에서 양식으로 고친다.
   · 저장 위치: 이 브라우저 안 IndexedDB('kts_handoff') — 서버로 보내지 않는다.
   · 쓰는 쪽: window.KTSHandoff.put({name, pages:[dataURL,…], from}) → take() 로 꺼내면 지운다.
   · 큰 그림(여러 장)도 담기도록 localStorage 가 아니라 IndexedDB 를 쓴다.
   ========================================================================== */
(function (w) {
  'use strict';
  var DB = 'kts_handoff', STORE = 'pages', KEY = 'last';

  function open() {
    return new Promise(function (res, rej) {
      var q = w.indexedDB.open(DB, 1);
      q.onupgradeneeded = function () { try { q.result.createObjectStore(STORE); } catch (e) { } };
      q.onsuccess = function () { res(q.result); };
      q.onerror = function () { rej(q.error); };
    });
  }
  function tx(mode, fn) {
    return open().then(function (db) {
      return new Promise(function (res, rej) {
        var t = db.transaction(STORE, mode), st = t.objectStore(STORE);
        var r = fn(st);
        t.oncomplete = function () { res(r && r.result !== undefined ? r.result : r); };
        t.onerror = function () { rej(t.error); };
        t.onabort = function () { rej(t.error || new Error('handoff abort')); };
      });
    });
  }

  var API = {
    /* {name, pages:[dataURL], from:'viewer'} */
    put: function (obj) {
      var rec = { name: String((obj && obj.name) || '문서'), pages: (obj && obj.pages) || [], from: (obj && obj.from) || '', at: Date.now() };
      return tx('readwrite', function (st) { st.put(rec, KEY); return true; });
    },
    peek: function () {
      return tx('readonly', function (st) { return st.get(KEY); }).then(function (v) { return v || null; });
    },
    take: function () {
      return new Promise(function (res, rej) {
        open().then(function (db) {
          var t = db.transaction(STORE, 'readwrite'), st = t.objectStore(STORE), got = null;
          var g = st.get(KEY);
          g.onsuccess = function () { got = g.result || null; };
          st.delete(KEY);
          t.oncomplete = function () { res(got); };
          t.onerror = function () { rej(t.error); };
        }, rej);
      });
    },
    clear: function () { return tx('readwrite', function (st) { st.delete(KEY); return true; }); }
  };

  w.KTSHandoff = API;
})(window);
