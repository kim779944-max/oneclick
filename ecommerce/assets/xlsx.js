/* 최소 XLSX 조립 (외부 라이브러리 0, 무압축 ZIP) — zipStore · sheetXml · xlsxBlob · crc32
   seller 도구가 쓰는 방식 그대로 새로 작성. 숫자 칸은 #,##0, 글자 칸은 inlineStr(한글 그대로). */
(function(){
  var CRC_TABLE = (function(){ var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++){ var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; }
    return t; })();
  function crc32(u8){ var c = 0xFFFFFFFF; for (var i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zipStore(files, mime){
    var enc = new TextEncoder(), parts = [], central = [], offset = 0;
    files.forEach(function(f){
      var name = enc.encode(f.name), data = (f.data instanceof Uint8Array) ? f.data : enc.encode(f.data), crc = crc32(data);
      var lh = new Uint8Array(30 + name.length), dv = new DataView(lh.buffer);
      dv.setUint32(0, 0x04034b50, true); dv.setUint16(4, 20, true); dv.setUint16(6, 0x0800, true); dv.setUint16(8, 0, true);
      dv.setUint16(10, 0, true); dv.setUint16(12, 0x2100, true); dv.setUint32(14, crc, true);
      dv.setUint32(18, data.length, true); dv.setUint32(22, data.length, true); dv.setUint16(26, name.length, true);
      lh.set(name, 30); parts.push(lh, data);
      var ch = new Uint8Array(46 + name.length), cv = new DataView(ch.buffer);
      cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x0800, true); cv.setUint16(10, 0, true);
      cv.setUint16(14, 0x2100, true); cv.setUint32(16, crc, true); cv.setUint32(20, data.length, true);
      cv.setUint32(24, data.length, true); cv.setUint16(28, name.length, true); cv.setUint32(42, offset, true);
      ch.set(name, 46); central.push(ch); offset += lh.length + data.length;
    });
    var cs = central.reduce(function(a, b){ return a + b.length; }, 0);
    var eo = new Uint8Array(22), ev = new DataView(eo.buffer);
    ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true);
    ev.setUint32(12, cs, true); ev.setUint32(16, offset, true);
    return new Blob(parts.concat(central, [eo]), { type: mime || 'application/zip' });
  }
  function xEsc(s){ return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''); }
  function colName(c){ var s = '', n = c + 1; while (n > 0){ var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
  function sheetXml(head, rows){
    function cell(ref, v, s){
      if (typeof v === 'number' && isFinite(v)) return '<c r="' + ref + '" s="' + s + '"><v>' + v + '</v></c>';
      if (v === '' || v == null) return '';
      return '<c r="' + ref + '" s="' + s + '" t="inlineStr"><is><t xml:space="preserve">' + xEsc(v) + '</t></is></c>';
    }
    var x = '<sheetData><row r="1">' + head.map(function(h, i){ return cell(colName(i) + '1', h, 1); }).join('') + '</row>';
    rows.forEach(function(r, ri){
      x += '<row r="' + (ri + 2) + '">' + r.map(function(v, ci){ return cell(colName(ci) + (ri + 2), v, 2); }).join('') + '</row>';
    });
    x += '</sheetData>';
    var widths = '<cols>' + head.map(function(h, i){ return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + Math.min(42, Math.max(10, String(h).length * 2.2)) + '" customWidth="1"/>'; }).join('') + '</cols>';
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<dimension ref="A1:' + colName(head.length - 1) + (rows.length + 1) + '"/>' + widths + x +
      '<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/></worksheet>';
  }
  function xlsxBlob(sheetName, head, rows){
    var X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    var ct = X + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>';
    var rels = X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
    var wb = X + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheets><sheet name="' + xEsc(sheetName).slice(0, 30) + '" sheetId="1" r:id="rId1"/></sheets></workbook>';
    var wbrels = X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
    var styles = X + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<fonts count="2"><font><sz val="10"/><name val="맑은 고딕"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="맑은 고딕"/></font></fonts>' +
      '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFFF6B00"/><bgColor indexed="64"/></patternFill></fill></fills>' +
      '<borders count="2"><border><left/><right/><top/><bottom/></border>' +
      '<border><left style="thin"><color rgb="FF333333"/></left><right style="thin"><color rgb="FF333333"/></right><top style="thin"><color rgb="FF333333"/></top><bottom style="thin"><color rgb="FF333333"/></bottom></border></borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
      '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>' +
      '<xf numFmtId="3" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyNumberFormat="1"/></cellXfs></styleSheet>';
    return zipStore([
      { name: '[Content_Types].xml', data: ct },
      { name: '_rels/.rels', data: rels },
      { name: 'xl/workbook.xml', data: wb },
      { name: 'xl/_rels/workbook.xml.rels', data: wbrels },
      { name: 'xl/styles.xml', data: styles },
      { name: 'xl/worksheets/sheet1.xml', data: sheetXml(head, rows) }
    ], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }
  window.KTS_XLSX = { crc32: crc32, zipStore: zipStore, sheetXml: sheetXml, xlsxBlob: xlsxBlob, colName: colName };
})();
