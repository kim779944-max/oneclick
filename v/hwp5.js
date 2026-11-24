/*!
 * KTS 더뷰 — 구형 한글(.hwp / HWP 5.0 바이너리) 브라우저 자체 파서  v1.0 (2026-11-25)
 *
 *  · 사무실 PC·변환 서버 없이, 폰 브라우저 안에서 그대로 연다.
 *  · CFB(OLE2) 컨테이너 → DocInfo·BodyText/SectionN 스트림 → zlib raw 해제 →
 *    레코드(PARA_HEADER / PARA_TEXT / CTRL_HEADER / TABLE / LIST_HEADER) 해석 →
 *    본문 문단 + 표를 더뷰 종이(.ppsheet/.hw/table.xl) 모양의 HTML로 세운다.
 *  · 외부 라이브러리·CDN 없음. 파일은 기기 밖으로 나가지 않는다.
 *
 *  사용:
 *    const doc  = await KTS_HWP5.parse(arrayBuffer);
 *    const html = KTS_HWP5.toHtml(doc);      // <div class="hw">…</div>
 */
(function (g) {
  'use strict';

  var VERSION = '1.0.20261125';

  /* ───────── 레코드 태그 (HWP 5.0 spec) ───────── */
  var T = {
    DOC_PROPS: 0x10, ID_MAPPINGS: 0x11, BIN_DATA: 0x12, FACE_NAME: 0x13, BORDER_FILL: 0x14,
    CHAR_SHAPE: 0x15, TAB_DEF: 0x16, NUMBERING: 0x17, BULLET: 0x18, PARA_SHAPE: 0x19, STYLE: 0x1A,
    PARA_HEADER: 0x42, PARA_TEXT: 0x43, PARA_CHAR_SHAPE: 0x44, PARA_LINE_SEG: 0x45, PARA_RANGE_TAG: 0x46,
    CTRL_HEADER: 0x47, LIST_HEADER: 0x48, PAGE_DEF: 0x49, FOOTNOTE_SHAPE: 0x4A, PAGE_BORDER_FILL: 0x4B,
    SHAPE_COMPONENT: 0x4C, TABLE: 0x4D, PICTURE: 0x55
  };

  /* 제어 문자 종류 — 'char' 는 글자 하나, 'ctl' 은 뒤에 12바이트 정보 + 반복코드(총 16바이트)가 붙는다 */
  var CTL = { 1:'ctl', 2:'ctl', 3:'ctl', 4:'ctl', 5:'ctl', 6:'ctl', 7:'ctl', 8:'ctl', 9:'ctl',
              10:'char', 11:'ctl', 12:'ctl', 13:'char', 14:'ctl', 15:'ctl', 16:'ctl', 17:'ctl', 18:'ctl',
              19:'ctl', 20:'ctl', 21:'ctl', 22:'ctl', 23:'ctl', 24:'char', 25:'char', 26:'char', 27:'char',
              28:'char', 29:'char', 30:'char', 31:'char' };

  function err(msg, code) { var e = new Error(msg); e.code = code || 'hwp'; return e; }

  /* ══════════════════════════ 1. CFB (OLE2) 컨테이너 ══════════════════════════ */
  function cfb(input) {
    var u8 = input instanceof Uint8Array ? input : new Uint8Array(input);
    var dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    if (u8.length < 512) throw err('파일이 너무 작습니다', 'cfb');
    if (!(u8[0] === 0xD0 && u8[1] === 0xCF && u8[2] === 0x11 && u8[3] === 0xE0)) {
      if (u8[0] === 0x50 && u8[1] === 0x4B) throw err('이 파일은 새 한글(.hwpx) 형식입니다', 'hwpx');
      throw err('한글 문서(OLE2) 구조가 아닙니다', 'cfb');
    }
    var ssz = 1 << dv.getUint16(30, true);
    var mssz = 1 << dv.getUint16(32, true);
    if (ssz < 128 || ssz > 65536 || mssz < 8 || mssz > ssz) throw err('한글 문서 구조가 손상되었습니다', 'cfb');
    var nFat = dv.getUint32(44, true), dirStart = dv.getUint32(48, true);
    var cutoff = dv.getUint32(56, true), miniStart = dv.getUint32(60, true);
    var difatStart = dv.getUint32(68, true), nDifat = dv.getUint32(72, true);
    var END = 0xFFFFFFFA;
    function secOff(s) { return (s + 1) * ssz; }
    function secSlice(s) { var o = secOff(s); return u8.subarray(o, Math.min(o + ssz, u8.length)); }

    /* DIFAT — FAT 섹터 목록 */
    var difat = [];
    for (var i = 0; i < 109; i++) difat.push(dv.getUint32(76 + i * 4, true));
    var s = difatStart, guard = 0;
    while (s < END && guard++ < nDifat + 8) {
      var off = secOff(s);
      if (off + ssz > u8.length) break;
      var per = ssz / 4 - 1;
      for (var k = 0; k < per; k++) difat.push(dv.getUint32(off + k * 4, true));
      s = dv.getUint32(off + ssz - 4, true);
    }
    /* FAT */
    var fat = [];
    for (var f = 0; f < Math.min(nFat, difat.length); f++) {
      var fs = difat[f];
      if (fs >= END) continue;
      var fo = secOff(fs);
      if (fo + ssz > u8.length) continue;
      for (var j = 0; j < ssz / 4; j++) fat.push(dv.getUint32(fo + j * 4, true));
    }
    function chain(start, table) {
      var out = [], cur = start, seen = {};
      table = table || fat;
      while (cur < END && !seen[cur]) { seen[cur] = 1; out.push(cur); cur = table[cur]; if (cur === undefined) break; }
      return out;
    }
    function readChain(start, size) {
      var parts = chain(start), total = 0, i;
      for (i = 0; i < parts.length; i++) total += ssz;
      var out = new Uint8Array(size != null ? Math.min(size, total) : total), p = 0;
      for (i = 0; i < parts.length && p < out.length; i++) {
        var o = secOff(parts[i]);
        var n = Math.min(ssz, out.length - p, Math.max(0, u8.length - o));
        out.set(u8.subarray(o, o + n), p); p += n;
      }
      return out.subarray(0, p);
    }

    /* 디렉터리 — 이름 트리(좌·우·자식) */
    var dirData = readChain(dirStart);
    var entries = [];
    for (var e = 0; e + 128 <= dirData.length; e += 128) {
      var nameLen = dirData[e + 64] | (dirData[e + 65] << 8);
      if (nameLen < 2 || nameLen > 64) nameLen = 0;
      var nm = '';
      for (var c = 0; c < nameLen - 2; c += 2) nm += String.fromCharCode(dirData[e + c] | (dirData[e + c + 1] << 8));
      entries.push({
        name: nm, type: dirData[e + 66],
        left: dirData[e + 68] | (dirData[e + 69] << 8) | (dirData[e + 70] << 16) | (dirData[e + 71] << 24),
        right: dirData[e + 72] | (dirData[e + 73] << 8) | (dirData[e + 74] << 16) | (dirData[e + 75] << 24),
        child: dirData[e + 76] | (dirData[e + 77] << 8) | (dirData[e + 78] << 16) | (dirData[e + 79] << 24),
        start: dirData[e + 116] | (dirData[e + 117] << 8) | (dirData[e + 118] << 16) | (dirData[e + 119] << 24),
        size: (dirData[e + 120] | (dirData[e + 121] << 8) | (dirData[e + 122] << 16) | (dirData[e + 123] << 24)) >>> 0
      });
    }
    var root = null;
    for (var r = 0; r < entries.length; r++) if (entries[r].type === 5) { root = entries[r]; break; }
    if (!root) throw err('한글 문서 구조를 읽지 못했습니다', 'cfb');
    var mini = readChain(root.start, root.size);
    var miniFat = [];
    if (miniStart < END) {
      var mf = readChain(miniStart);
      for (var m = 0; m + 4 <= mf.length; m += 4) miniFat.push(mf[m] | (mf[m + 1] << 8) | (mf[m + 2] << 16) | (mf[m + 3] << 24));
    }
    function readMini(start, size) {
      var out = new Uint8Array(size), p = 0, cur = start, seen = {};
      while (cur < END && !seen[cur] && p < size) {
        seen[cur] = 1;
        var o = cur * mssz;
        var n = Math.min(mssz, size - p, Math.max(0, mini.length - o));
        out.set(mini.subarray(o, o + n), p); p += n; cur = miniFat[cur];
      }
      return out.subarray(0, p);
    }
    var streams = {}, names = [];
    (function walk(idx, prefix, depth) {
      if (idx < 0 || idx >= entries.length || depth > 44) return;
      var ent = entries[idx];
      if (ent.left) walk(ent.left, prefix, depth + 1);
      if (ent.name) {
        var path = prefix + ent.name;
        if (ent.type === 2) { streams[path] = ent; names.push(path); }
        else if (ent.type === 1) { if (ent.child) walk(ent.child, path + '/', depth + 1); }
      }
      if (ent.right) walk(ent.right, prefix, depth + 1);
    })(root.child, '', 0);

    return {
      names: names,
      has: function (n) { return !!streams[n]; },
      get: function (n) {
        var ent = streams[n]; if (!ent) return null;
        if (!ent.size) return new Uint8Array(0);
        return ent.size < cutoff ? readMini(ent.start, ent.size) : readChain(ent.start, ent.size);
      }
    };
  }

  /* ══════════════════════════ 2. 압축 해제 (zlib raw) ══════════════════════════ */
  function inflateRaw(src) {
    var pos = 0, bitbuf = 0, bitcnt = 0, out = new Uint8Array(Math.max(1024, src.length * 4)), olen = 0;
    function need(n) { while (bitcnt < n) { if (pos >= src.length) throw err('압축 데이터가 중간에 끊겼습니다', 'inflate'); bitbuf |= src[pos++] << bitcnt; bitcnt += 8; } }
    function bits(n) { need(n); var v = bitbuf & ((1 << n) - 1); bitbuf >>>= n; bitcnt -= n; return v; }
    function put(b) {
      if (olen >= out.length) { var nx = new Uint8Array(out.length * 2); nx.set(out); out = nx; }
      out[olen++] = b;
    }
    function build(lengths) {
      var maxb = 0, i;
      for (i = 0; i < lengths.length; i++) if (lengths[i] > maxb) maxb = lengths[i];
      var counts = new Array(maxb + 1).fill(0), offs = new Array(maxb + 2).fill(0);
      for (i = 0; i < lengths.length; i++) if (lengths[i]) counts[lengths[i]]++;
      for (i = 1; i <= maxb; i++) offs[i + 1] = offs[i] + counts[i];
      var syms = new Array(offs[maxb + 1]);
      for (i = 0; i < lengths.length; i++) if (lengths[i]) syms[offs[lengths[i]]++] = i;
      return { counts: counts, syms: syms, maxb: maxb };
    }
    function decode(t) {
      var code = 0, first = 0, index = 0;
      for (var len = 1; len <= t.maxb; len++) {
        code |= bits(1);
        var count = t.counts[len];
        if (code - first < count) return t.syms[index + code - first];
        index += count; first = (first + count) << 1; code <<= 1;
      }
      throw err('압축 데이터를 풀지 못했습니다', 'inflate');
    }
    var LBASE = [3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258];
    var LEXT = [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
    var DBASE = [1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577];
    var DEXT = [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];
    var fixL = null, fixD = null;
    for (;;) {
      var last = bits(1), type = bits(2), lt, dt;
      if (type === 0) {                       /* stored */
        bitbuf = 0; bitcnt = 0;
        var len = src[pos] | (src[pos + 1] << 8); pos += 4;
        for (var q = 0; q < len; q++) put(src[pos++]);
        if (last) break;
        continue;
      } else if (type === 1) {                /* fixed */
        if (!fixL) {
          var l1 = new Array(288);
          for (var a = 0; a < 288; a++) l1[a] = a < 144 ? 8 : a < 256 ? 9 : a < 280 ? 7 : 8;
          fixL = build(l1);
          fixD = build(new Array(30).fill(5));
        }
        lt = fixL; dt = fixD;
      } else if (type === 2) {                /* dynamic */
        var hlit = bits(5) + 257, hdist = bits(5) + 1, hclen = bits(4) + 4;
        var order = [16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];
        var clen = new Array(19).fill(0);
        for (var y = 0; y < hclen; y++) clen[order[y]] = bits(3);
        var ct = build(clen), lens = [];
        while (lens.length < hlit + hdist) {
          var sym = decode(ct);
          if (sym < 16) lens.push(sym);
          else if (sym === 16) { var rep = 3 + bits(2), prev = lens[lens.length - 1]; while (rep-- > 0) lens.push(prev); }
          else if (sym === 17) { var r2 = 3 + bits(3); while (r2-- > 0) lens.push(0); }
          else { var r3 = 11 + bits(7); while (r3-- > 0) lens.push(0); }
        }
        lt = build(lens.slice(0, hlit));
        dt = build(lens.slice(hlit));
      } else throw err('압축 데이터가 손상되었습니다', 'inflate');
      for (;;) {
        var code = decode(lt);
        if (code < 256) put(code);
        else if (code === 256) break;
        else {
          var li = code - 257;
          if (li >= LBASE.length) throw err('압축 데이터가 손상되었습니다', 'inflate');
          var l2 = LBASE[li] + bits(LEXT[li]);
          var di = decode(dt);
          var dist = DBASE[di] + bits(DEXT[di]);
          if (dist > olen) throw err('압축 데이터가 손상되었습니다', 'inflate');
          for (var z = 0; z < l2; z++, olen++) {
            if (olen >= out.length) { var nx2 = new Uint8Array(out.length * 2); nx2.set(out); out = nx2; }
            out[olen] = out[olen - dist];
          }
        }
      }
      if (last) break;
    }
    return out.subarray(0, olen);
  }

  function hasDS() { return typeof DecompressionStream === 'function' && typeof Response === 'function' && typeof Blob === 'function'; }

  function inflateRawAsync(u8) {
    if (!u8 || !u8.length) return Promise.resolve(u8 || new Uint8Array(0));
    if (!hasDS()) { return Promise.resolve().then(function () { return inflateRaw(u8); }); }
    var ds = new DecompressionStream('deflate-raw');
    var stream = new Blob([u8]).stream().pipeThrough(ds);
    return new Response(stream).arrayBuffer().then(function (ab) { return new Uint8Array(ab); },
      function () { return inflateRaw(u8); });            /* 브라우저가 raw 를 못 풀면 자체 해제 */
  }

  /* ══════════════════════════ 3. 레코드 트리 ══════════════════════════ */
  function u16(d, o) { return d[o] | (d[o + 1] << 8); }
  function u32(d, o) { return (d[o] | (d[o + 1] << 8) | (d[o + 2] << 16) | (d[o + 3] << 24)) >>> 0; }

  function buildTree(data) {
    var root = { tag: -1, level: -1, data: null, children: [] }, stack = [root], off = 0, n = data.length, guard = 0;
    while (off + 4 <= n && guard++ < 4e6) {
      var h = u32(data, off); off += 4;
      var tag = h & 0x3FF, level = (h >>> 10) & 0x3FF, size = (h >>> 20) & 0xFFF;
      if (size === 0xFFF) { if (off + 4 > n) break; size = u32(data, off); off += 4; }
      if (size < 0 || off + size > n) size = Math.max(0, n - off);
      var node = { tag: tag, level: level, data: data.subarray(off, off + size), children: [] };
      off += size;
      while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop();
      stack[stack.length - 1].children.push(node);
      stack.push(node);
    }
    return root.children;
  }

  /* ══════════════════════════ 4. DocInfo — 글자 모양·문단 모양·용지 ══════════════════════════ */
  var DEFAULT_SHAPE = { size: 1000, bold: false, italic: false, color: '' };

  function parseCharShape(d) {
    /* HWP 5.0 글자 모양: 0~13 글꼴ID · 14 장평 · 21 자간 · 28 상대크기 · 35 글자위치
       · 42 기준크기(1/100 pt) · 46 속성(bit0 기울임, bit1 진하게) · 52 글자색(BGR) */
    var size = d.length >= 46 ? u32(d, 42) : 1000;
    if (!size || size < 100 || size > 20000) size = 1000;
    var prop = d.length >= 50 ? u32(d, 46) : 0;
    var color = '';
    if (d.length >= 56) {
      var c = u32(d, 52) & 0xFFFFFF;
      if (c && c !== 0xFFFFFF) color = 'rgb(' + (c & 0xFF) + ',' + ((c >>> 8) & 0xFF) + ',' + ((c >>> 16) & 0xFF) + ')';
    }
    return { size: size, bold: !!(prop & 0x02), italic: !!(prop & 0x01), color: color };
  }

  function parseDocInfo(data) {
    var shapes = [], paras = [], page = null;
    if (!data || !data.length) return { charShapes: shapes, paraShapes: paras, page: null };
    var nodes = buildTree(data);
    (function walk(list) {
      for (var i = 0; i < list.length; i++) {
        var nd = list[i], tag = nd.tag;
        if (tag === T.CHAR_SHAPE) { shapes.push(parseCharShape(nd.data)); continue; }
        if (tag === T.PARA_SHAPE) { paras.push(nd.data.length >= 4 ? { raw: u32(nd.data, 0) } : {}); continue; }
        if (tag === T.PAGE_DEF) { if (!page) page = readPageDef(nd.data); continue; }
        if (nd.children.length) walk(nd.children);
      }
    })(nodes);
    return { charShapes: shapes, paraShapes: paras, page: page };
  }

  function readPageDef(d) {
    if (!d || d.length < 20) return null;
    var w = u32(d, 4), h = u32(d, 8);
    if (!w || !h) return null;
    return { w: w, h: h, ml: u32(d, 12), mr: u32(d, 16) };
  }

  /* ══════════════════════════ 5. 본문 — 문단·표 ══════════════════════════ */
  function ctrlId(d) {
    /* 컨트롤 ID 4글자는 역순으로 저장된다: 'dces' → 'secd', ' lbt' → 'tbl ' */
    var s = '';
    for (var i = 0; i < 4 && i + 1 < d.length; i++) s += String.fromCharCode(d[i]);
    return s.split('').reverse().join('').replace(/\s+$/, '').replace(/^\s+/, '');
  }

  function decodeSegments(d) {
    var segs = [], buf = '', i = 0, n = d.length;
    function flush() { if (buf) { segs.push({ t: 'text', s: buf }); buf = ''; } }
    while (i + 1 < n) {
      var c = d[i] | (d[i + 1] << 8);
      if (c >= 32) {                                  /* 일반 글자 */
        buf += String.fromCharCode(c); i += 2; continue;
      }
      if (CTL[c] === 'char') {
        if (c === 10) buf += '\n';
        else if (c === 9) buf += '\t';
        else if (c === 24) buf += '-';
        else if (c === 30 || c === 31) buf += ' ';
        /* 13(문단 끝)·0 은 버린다 */
        i += 2; continue;
      }
      /* 인라인·확장 컨트롤: 코드(2) + 정보(12) + 반복코드(2) = 16바이트 */
      var skip = (i + 15 < n && (d[i + 14] | (d[i + 15] << 8)) === c) ? 16 : 14;
      flush();
      segs.push({ t: 'ctl', code: c, id: ctrlId(d.subarray(i + 2, Math.min(i + 8, n))) });
      i += skip;
    }
    flush();
    return segs;
  }

  function charShapeOf(group, doc) {
    var cs = null;
    for (var i = 0; i < group.length; i++) if (group[i].tag === T.PARA_CHAR_SHAPE) { cs = group[i].data; break; }
    if (!cs || cs.length < 8) return DEFAULT_SHAPE;
    var id = u32(cs, 4);                              /* (startPos, charShapeId) 쌍의 첫 항목 */
    return doc.charShapes[id] || DEFAULT_SHAPE;
  }

  function paraShapeId(hdr) {
    return hdr && hdr.length >= 10 ? u16(hdr, 8) : 0;
  }

  function escHtml(s) {
    return String(s).replace(/[&<>"]/g, function (ch) {
      return ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : '&quot;';
    });
  }

  function textToHtml(s) {
    return escHtml(s).replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;').replace(/\n/g, '<br>');
  }

  /* 한 문단(PARA_HEADER + 자식들) → 블록 배열 */
  function paraBlocks(ph, doc, stats) {
    var blocks = [], textNode = null, ctrls = [], i;
    for (i = 0; i < ph.children.length; i++) {
      var ch = ph.children[i];
      if (ch.tag === T.PARA_TEXT) textNode = ch;
      else if (ch.tag === T.CTRL_HEADER) ctrls.push(ch);
    }
    var shape = charShapeOf([ph].concat(ph.children), doc);
    var segs = textNode ? decodeSegments(textNode.data) : [];
    var html = '';

    /* 컨트롤은 글자 안의 표시 순서대로 짝을 맞춘다 — 표시가 없는 컨트롤은 마지막에 따로 */
    function takeCtrl(id) {
      for (var k = 0; k < ctrls.length; k++) {
        if (!id || ctrlId(ctrls[k].data) === id) return ctrls.splice(k, 1)[0];
      }
      return ctrls.length ? ctrls.shift() : null;
    }

    function push() {
      if (!html) return;
      if (!html.replace(/<br>|&nbsp;|\s/g, '')) { html = ''; return; }   /* 빈 문단은 버린다 */
      if (stats) stats.paras++;
      blocks.push({ type: 'para', html: html, shape: shape });
      html = '';
    }
    for (i = 0; i < segs.length; i++) {
      var sg = segs[i];
      if (sg.t === 'text') { html += textToHtml(sg.s); continue; }
      push();                                   /* 글자 사이에 낀 개체도 문단을 끊고 제자리에 놀인다 */
      var obj = controlBlock(sg.id, takeCtrl(sg.id), doc, stats);
      if (obj) blocks.push(obj);
    }
    push();
    while (ctrls.length) {                      /* 글자에 표시가 없던 컨트롤 */
      var nxt = ctrls.shift();
      var extra = controlBlock(ctrlId(nxt.data), nxt, doc, stats);
      if (extra) blocks.push(extra);
    }
    return blocks;
  }

  function controlBlock(id, ctrl, doc, stats) {
    if (!ctrl) return null;
    if (id === 'tbl') { stats.tables++; return tableBlock(ctrl, doc, stats); }
    if (id === 'gso') {
      var pic = findTag(ctrl, T.PICTURE);
      if (pic) { stats.images++; return { type: 'image' }; }
      return null;
    }
    return null;                                          /* 각주·머리말·구역 정의 등은 건너뛴다 */
  }

  function findTag(node, tag) {
    for (var i = 0; i < node.children.length; i++) {
      if (node.children[i].tag === tag) return node.children[i];
      var deep = findTag(node.children[i], tag);
      if (deep) return deep;
    }
    return null;
  }

  function tableBlock(ctrl, doc, stats) {
    var tbl = null, cells = [], cur = null, i, j;
    for (i = 0; i < ctrl.children.length; i++) {
      var ch = ctrl.children[i];
      if (ch.tag === T.TABLE && !tbl) { tbl = ch; continue; }
      if (ch.tag === T.LIST_HEADER) {
        var d = ch.data;
        cur = {
          col: d.length >= 12 ? u16(d, 8) : 0,
          row: d.length >= 12 ? u16(d, 10) : 0,
          cs: d.length >= 14 ? Math.max(1, u16(d, 12)) : 1,
          rs: d.length >= 16 ? Math.max(1, u16(d, 14)) : 1,
          w: d.length >= 20 ? u32(d, 16) : 0,
          blocks: []
        };
        cells.push(cur);
      } else if (ch.tag === T.PARA_HEADER && cur) {
        var bs = paraBlocks(ch, doc, stats);
        for (j = 0; j < bs.length; j++) cur.blocks.push(bs[j]);
      }
    }
    if (!cells.length) return null;
    var rows = tbl && tbl.data.length >= 6 ? u16(tbl.data, 4) : 0;
    var cols = tbl && tbl.data.length >= 8 ? u16(tbl.data, 6) : 0;
    for (i = 0; i < cells.length; i++) {
      if (!rows) rows = Math.max(rows, cells[i].row + cells[i].rs);
      if (!cols) cols = Math.max(cols, cells[i].col + cells[i].cs);
    }
    rows = Math.max(rows, 1); cols = Math.max(cols, 1);
    return { type: 'table', rows: rows, cols: cols, cells: cells };
  }

  function blocksFrom(nodes, doc, stats) {
    var out = [];
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].tag !== T.PARA_HEADER) continue;
      var bs = paraBlocks(nodes[i], doc, stats);
      for (var k = 0; k < bs.length; k++) out.push(bs[k]);
    }
    return out;
  }

  /* ══════════════════════════ 6. HTML — 더뷰 종이(.ppsheet) 모양 ══════════════════════════ */
  function px(size) { return Math.round(size * 0.0134 * 10) / 10; }

  function paraHtml(b, inCell) {
    var st = [], sh = b.shape || DEFAULT_SHAPE;
    if (sh.size && Math.abs(sh.size - 1000) > 60) st.push('font-size:' + px(sh.size) + 'px');
    if (sh.bold) st.push('font-weight:900');
    if (sh.italic) st.push('font-style:italic');
    if (sh.color) st.push('color:' + sh.color);
    if (inCell) st.push('margin:0');
    return '<p' + (st.length ? ' style="' + st.join(';') + '"' : '') + '>' + b.html + '</p>';
  }

  function cellInner(cell) {
    if (!cell.blocks.length) return '';
    var parts = [];
    for (var i = 0; i < cell.blocks.length; i++) {
      var b = cell.blocks[i];
      if (b.type === 'para') parts.push(paraHtml(b, true));
      else if (b.type === 'table') parts.push(tableHtml(b, true));
      else if (b.type === 'image') parts.push('<span style="color:#555">[그림]</span>');
    }
    return '<div class="hw">' + parts.join('') + '</div>';
  }

  function tableHtml(b, inCell) {
    var cols = b.cols, i, j, colW = new Array(cols).fill(0);
    for (i = 0; i < b.cells.length; i++) {
      var c = b.cells[i];
      if (!c.w || !c.cs) continue;
      var one = c.w / c.cs;
      for (j = 0; j < c.cs && c.col + j < cols; j++) colW[c.col + j] = Math.max(colW[c.col + j], one);
    }
    var any = 0, sum = 0;
    for (i = 0; i < cols; i++) { if (colW[i]) any++; sum += colW[i] || 0; }
    if (!any) { for (i = 0; i < cols; i++) colW[i] = 1; sum = cols; }
    else { for (i = 0; i < cols; i++) if (!colW[i]) colW[i] = sum / any; }
    sum = colW.reduce(function (a, v) { return a + v; }, 0) || 1;

    var html = '<table class="xl fixed"><colgroup>' +
      colW.map(function (w) { return '<col style="width:' + (Math.round(w / sum * 1000) / 10) + '%">'; }).join('') +
      '</colgroup>';
    var used = {};
    for (var r = 0; r < b.rows; r++) {
      html += '<tr>';
      for (var cc = 0; cc < cols; cc++) {
        if (used[r + ',' + cc]) continue;
        var cell = null;
        for (i = 0; i < b.cells.length; i++) {
          var t = b.cells[i];
          if (t.row === r && t.col === cc) { cell = t; break; }
        }
        if (!cell) { html += '<td></td>'; continue; }
        for (j = 0; j < cell.rs; j++) for (var k = 0; k < cell.cs; k++) used[(r + j) + ',' + (cc + k)] = 1;
        html += '<td' + (cell.cs > 1 ? ' colspan="' + cell.cs + '"' : '') + (cell.rs > 1 ? ' rowspan="' + cell.rs + '"' : '') + '>' +
          cellInner(cell) + '</td>';
      }
      html += '</tr>';
    }
    return html + '</table>';
  }

  function toHtml(doc) {
    var out = [];
    for (var s = 0; s < doc.sections.length; s++) {
      var blocks = doc.sections[s].blocks;
      for (var i = 0; i < blocks.length; i++) {
        var b = blocks[i];
        if (b.type === 'para') out.push(paraHtml(b, false));
        else if (b.type === 'table') out.push(tableHtml(b, false));
        else if (b.type === 'image') out.push('<p style="color:#555">[그림]</p>');
      }
      if (s < doc.sections.length - 1 && out.length) out.push('<div style="height:10px"></div>');
    }
    return '<div class="hw">' + out.join('') + '</div>';
  }

  function toText(doc) {
    var lines = [];
    function walk(blocks, depth) {
      for (var i = 0; i < blocks.length; i++) {
        var b = blocks[i];
        if (b.type === 'para') {
          var t = b.html.replace(/<br>/g, ' ').replace(/&nbsp;/g, ' ')
            .replace(/&#(\d+);/g, function (m, d) { return String.fromCharCode(+d); })
            .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
          if (t.trim()) lines.push(t);
        } else if (b.type === 'table') {
          for (var c = 0; c < b.cells.length; c++) walk(b.cells[c].blocks, depth + 1);
        }
      }
    }
    for (var s = 0; s < doc.sections.length; s++) walk(doc.sections[s].blocks, 0);
    return lines.join('\n');
  }

  /* ══════════════════════════ 7. 진입점 ══════════════════════════ */
  async function parse(input) {
    var bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    var c = cfb(bytes);
    var fh = c.get('FileHeader');
    if (!fh || fh.length < 40) throw err('한글 문서 헤더(FileHeader)를 찾지 못했습니다', 'header');
    var magic = '';
    for (var i = 0; i < 17 && fh[i]; i++) magic += String.fromCharCode(fh[i]);
    if (magic.indexOf('HWP Document File') !== 0) throw err('한글 5.0 문서가 아닙니다(구형 한글 3.0 이하)', 'magic');
    var ver = u32(fh, 32), props = u32(fh, 36);
    var verStr = [ver >>> 24, (ver >>> 16) & 0xFF, (ver >>> 8) & 0xFF, ver & 0xFF].join('.');
    if (props & 2) throw err('암호가 걸린 한글 문서입니다 — 한글에서 암호를 풀고 저장한 뒤 다시 열어 주세요', 'password');
    if (props & 4) throw err('배포용(DRM) 한글 문서는 열 수 없습니다 — 한글에서 [다른 이름으로 저장]한 뒤 다시 열어 주세요', 'drm');
    var compressed = !!(props & 1);

    var dinfo = c.get('DocInfo');
    if (dinfo && compressed) dinfo = await inflateRawAsync(dinfo);
    var doc = parseDocInfo(dinfo);

    var secNames = c.names.filter(function (n) { return /^BodyText\/Section\d+$/.test(n); })
      .sort(function (a, b) { return (+a.replace(/\D+/g, '')) - (+b.replace(/\D+/g, '')); });
    if (!secNames.length) throw err('본문(BodyText)을 찾지 못했습니다', 'body');

    var stats = { paras: 0, tables: 0, images: 0, bytes: bytes.length };
    var sections = [];
    for (var s = 0; s < secNames.length; s++) {
      var raw = c.get(secNames[s]);
      if (!raw || !raw.length) continue;
      if (compressed) raw = await inflateRawAsync(raw);
      if (!raw || !raw.length) continue;
      var nodes = buildTree(raw);
      var blocks = blocksFrom(nodes, doc, stats);
      if (!doc.page) {
        var pd = findTag({ children: nodes }, T.PAGE_DEF);
        if (pd) doc.page = readPageDef(pd.data);
      }
      sections.push({ blocks: blocks });
    }
    if (!sections.length) throw err('본문 내용이 비어 있습니다', 'empty');
    var hasContent = sections.some(function (x) { return x.blocks.length > 0; });
    if (!hasContent) throw err('본문 텍스트를 찾지 못했습니다', 'empty');

    return { version: verStr, sections: sections, stats: stats, page: doc.page, charShapes: doc.charShapes };
  }

  g.KTS_HWP5 = { version: VERSION, parse: parse, toHtml: toHtml, toText: toText, inflateRaw: inflateRaw, cfb: cfb };
})(typeof window !== 'undefined' ? window : this);
