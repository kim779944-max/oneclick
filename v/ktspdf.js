/*!
 * KTS 더뷰 — 브라우저 안에서 바로 만드는 PDF 파일  v1.0 (2026-11-25)
 *
 *  · window.print() 를 부르지 않는다(안드로이드 크롬의 "어디에 저장할까요" 창 없음).
 *  · 문서에서 뽑은 그림(JPEG)을 A4 한 장씩 담아 곧바로 내려받는 .pdf 를 만든다.
 *  · 외부 라이브러리 없음. 파일은 기기 밖으로 나가지 않는다.
 *
 *  사용:
 *    const blob = KTS_PDF.build([{bytes: jpegUint8, w: 1588, h: 2246}, …]);
 */
(function (g) {
  'use strict';
  var VERSION = '1.0.20261125';
  var A4W = 595.28, A4H = 841.89, MARGIN = 21.6;      /* 21.6pt ≈ 7.6mm */

  function strBytes(s) {
    var out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xFF;
    return out;
  }

  function build(pages, opt) {
    opt = opt || {};
    pages = (pages || []).filter(function (p) { return p && p.bytes && p.bytes.length && p.w && p.h; });
    if (!pages.length) throw new Error('PDF로 담을 장이 없습니다');

    var parts = [], total = 0;
    function w(bytes) { parts.push(bytes); total += bytes.length; }
    function s(text) { w(strBytes(text)); }

    s('%PDF-1.4\n%\u00E2\u00E3\u00CF\u00D3\n');
    var objects = [];                        /* {num, offset} */
    var cursorObj = 0;
    function beginObj() {
      cursorObj += 1;
      objects.push({ num: cursorObj, offset: total });
      s(cursorObj + ' 0 obj\n');
    }
    function endObj() { s('endobj\n'); }

    /* 1: 카탈로그, 2: 페이지 트리 */
    beginObj(); s('<< /Type /Catalog /Pages 2 0 R >>\n'); endObj();
    var kids = [];
    var firstPageObj = 3;
    for (var i = 0; i < pages.length; i++) kids.push((firstPageObj + i * 3) + ' 0 R');
    beginObj(); s('<< /Type /Pages /Count ' + pages.length + ' /Kids [ ' + kids.join(' ') + ' ] >>\n'); endObj();

    for (var p = 0; p < pages.length; p++) {
      var pg = pages[p];
      var pw = pg.ptW || A4W, ph = pg.ptH || A4H;
      var boxW = pw - MARGIN * 2, boxH = ph - MARGIN * 2;
      var iw = pg.w, ih = pg.h;
      var sc = Math.min(boxW / iw, boxH / ih);
      var dw = iw * sc, dh = ih * sc;
      var dx = (pw - dw) / 2, dy = (ph - dh) / 2;
      var pageNum = firstPageObj + p * 3, contNum = pageNum + 1, imgNum = pageNum + 2;
      var content = 'q\n' + r2(dw) + ' 0 0 ' + r2(dh) + ' ' + r2(dx) + ' ' + r2(dy) + ' cm\n/Im0 Do\nQ\n';

      beginObj();
      s('<< /Type /Page /Parent 2 0 R /MediaBox [ 0 0 ' + r2(pw) + ' ' + r2(ph) + ' ] ' +
        '/Resources << /XObject << /Im0 ' + imgNum + ' 0 R >> /ProcSet [/PDF /ImageC] >> ' +
        '/Contents ' + contNum + ' 0 R >>\n');
      endObj();

      beginObj();
      s('<< /Length ' + content.length + ' >>\nstream\n' + content + 'endstream\n');
      endObj();

      beginObj();
      s('<< /Type /XObject /Subtype /Image /Width ' + iw + ' /Height ' + ih +
        ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + pg.bytes.length + ' >>\nstream\n');
      w(pg.bytes);
      s('\nendstream\n');
      endObj();
    }

    /* xref */
    var xrefAt = total;
    var count = objects.length + 1;
    s('xref\n0 ' + count + '\n');
    s('0000000000 65535 f \n');
    for (var o = 0; o < objects.length; o++) s(('0000000000' + objects[o].offset).slice(-10) + ' 00000 n \n');
    s('trailer\n<< /Size ' + count + ' /Root 1 0 R >>\nstartxref\n' + xrefAt + '\n%%EOF\n');

    var out = new Uint8Array(total), at = 0;
    for (var k = 0; k < parts.length; k++) { out.set(parts[k], at); at += parts[k].length; }
    return new Blob([out], { type: 'application/pdf' });
  }

  function r2(v) { return Math.round(v * 100) / 100; }

  g.KTS_PDF = { version: VERSION, build: build, A4W: A4W, A4H: A4H };
})(typeof window !== 'undefined' ? window : this);
