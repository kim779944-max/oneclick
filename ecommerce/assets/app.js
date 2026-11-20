/* KTS 이커머스 원클릭 — 공통 함수
   토스트·복사·다운로드·숫자·금액·금지어검사·사진·탭·데이터·AI호출(myKey/aiJson/aiErr)·SHA-256/HMAC
   외부 라이브러리 0. 외부 요청은 AI 열쇠가 있을 때 generativelanguage.googleapis.com 하나뿐. */
(function(){
  var K = window.KTS = {};
  K.$ = function(s, r){ return (r || document).querySelector(s); };
  K.$$ = function(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  K.qs = function(n){ try { return new URLSearchParams(location.search).get(n); } catch(e){ return null; } };
  K.esc = function(s){ return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  K.stamp = function(d){ d = d || new Date(); function p(n){ return (n < 10 ? '0' : '') + n; } return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()); };

  /* ---------- 토스트 ---------- */
  var tt = null;
  K.toast = function(msg){
    var t = K.$('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('on'); clearTimeout(tt);
    tt = setTimeout(function(){ t.classList.remove('on'); }, 2200);
  };

  /* ---------- 숫자·금액 ---------- */
  K.num = function(v){ var s = String(v == null ? '' : v).replace(/[^0-9.\-]/g, ''); var n = parseFloat(s); return isFinite(n) ? n : 0; };
  K.won = function(n){ return Math.round(n).toLocaleString('ko-KR') + '원'; };
  K.fmt = function(n, d){ return Number(n).toLocaleString('ko-KR', { maximumFractionDigits: d == null ? 0 : d }); };
  K.pct = function(r){ return (Math.round(r * 1000) / 10).toFixed(1) + '%'; };

  /* ---------- 금지어 ---------- */
  K.BAN = ['최고', '1위', '완벽', '100%', '무조건', '정품보장', '최저가', '보장', '최상', '넘버원', 'No.1', '특가', '대박'];
  K.CUSTOMER_BAN = ['원가', '도매가', '매입가', '마진', '수수료'];
  K.banFind = function(text, list){
    list = list || K.BAN; var t = String(text || ''), hit = [];
    list.forEach(function(w){ if (w && t.toLowerCase().indexOf(String(w).toLowerCase()) >= 0) hit.push(w); });
    return hit;
  };
  K.PHONE = /(01[016789][-. ]?\d{3,4}[-. ]?\d{4})|(0\d{1,2}[-. ]\d{3,4}[-. ]\d{4})/;
  K.customerCheck = function(text){ return { ban: K.banFind(text, K.CUSTOMER_BAN), phone: K.PHONE.test(String(text || '')) ? 1 : 0 }; };

  /* ---------- 데이터(assets/data/*.json) ---------- */
  K.D = {};
  K.loadData = async function(names){
    var src = window.KTS_DATA || {};
    for (var i = 0; i < names.length; i++){
      var n = names[i], v = null;
      if (/^https?:$/.test(location.protocol)){
        try { var r = await fetch('assets/data/' + n + '.json', { cache: 'no-cache' }); if (r.ok) v = await r.json(); } catch(e){}
      }
      K.D[n] = v || src[n] || {};
    }
    return K.D;
  };

  /* ---------- 복사·다운로드 ---------- */
  window.__copies = []; window.__dl = [];
  K.copy = async function(text, html){
    var ok = false;
    window.__copies.push({ len: String(text || '').length, html: html ? String(html).length : 0, text: String(text || '') });
    if (html){
      try {
        var box = document.createElement('div'); box.contentEditable = 'true'; box.innerHTML = html;
        box.style.cssText = 'position:fixed;left:-9999px;top:0;width:500px;white-space:normal';
        document.body.appendChild(box);
        var rg = document.createRange(); rg.selectNodeContents(box);
        var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(rg);
        ok = document.execCommand('copy'); sel.removeAllRanges(); box.remove();
      } catch(e){ ok = false; }
    }
    if (!ok){
      try { if (navigator.clipboard && window.isSecureContext){ await navigator.clipboard.writeText(text); ok = true; } } catch(e){ ok = false; }
    }
    if (!ok){
      try {
        var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;left:-9999px;top:0'; document.body.appendChild(ta); ta.select();
        ok = document.execCommand('copy'); ta.remove();
      } catch(e){ ok = false; }
    }
    K.toast(ok ? '복사했습니다 (' + String(text || '').length + '자)' : '복사가 막혔습니다 — 길게 눌러 직접 복사해 주세요');
    return ok;
  };
  K.download = function(blob, name){
    window.__dl.push({ name: name, size: blob.size, type: blob.type });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    K.toast(name + ' 받기 (' + K.fmt(blob.size) + '바이트)');
  };
  K.csvBlob = function(head, rows){
    function c(v){ var s = String(v == null ? '' : v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
    var body = [head].concat(rows).map(function(r){ return r.map(c).join(','); }).join('\r\n');
    return new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8' });
  };
  K.safeName = function(s){ return String(s || '상품').replace(/[\\\/:*?"<>|\s]+/g, '_').slice(0, 30); };

  /* ---------- 사진 ---------- */
  K.readPhotos = function(files, max){
    max = max || 6;
    var side = (window.KTS_AI && KTS_AI.maxSide) || 1600;
    var list = Array.prototype.slice.call(files || [], 0, max);
    return Promise.all(list.map(function(f){
      return new Promise(function(res){
        var fr = new FileReader();
        fr.onload = function(){
          var im = new Image();
          im.onload = function(){
            var s = Math.min(1, side / Math.max(im.width, im.height));
            var cv = document.createElement('canvas'); cv.width = Math.round(im.width * s); cv.height = Math.round(im.height * s);
            cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
            res({ name: f.name, url: cv.toDataURL('image/jpeg', 0.85), w: cv.width, h: cv.height });
          };
          im.onerror = function(){ res(null); };
          im.src = fr.result;
        };
        fr.onerror = function(){ res(null); };
        fr.readAsDataURL(f);
      });
    })).then(function(a){ return a.filter(Boolean); });
  };
  /* 검수용 샘플 사진(그림으로 그린 가상 상품) — ?sample=1 전용 */
  K.samplePhoto = function(label, hue){
    var cv = document.createElement('canvas'); cv.width = 800; cv.height = 800;
    var g = cv.getContext('2d'); hue = hue == null ? 28 : hue;
    var gr = g.createLinearGradient(0, 0, 0, 800); gr.addColorStop(0, 'hsl(' + hue + ',60%,94%)'); gr.addColorStop(1, 'hsl(' + hue + ',45%,80%)');
    g.fillStyle = gr; g.fillRect(0, 0, 800, 800);
    g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.ellipse(400, 610, 230, 40, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'hsl(' + hue + ',70%,50%)'; g.beginPath(); g.arc(400, 380, 210, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'hsl(' + hue + ',40%,92%)'; g.beginPath(); g.arc(400, 380, 90, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1b2333'; g.font = 'bold 44px "Malgun Gothic", sans-serif'; g.textAlign = 'center';
    g.fillText(label, 400, 720);
    return { name: 'sample_' + label.replace(/\s+/g, '') + '.jpg', url: cv.toDataURL('image/jpeg', 0.85), w: 800, h: 800, sample: true };
  };
  K.loadImg = function(url){ return new Promise(function(res){ var im = new Image(); im.onload = function(){ res(im); }; im.onerror = function(){ res(null); }; im.src = url; }); };

  /* ---------- 탭 ---------- */
  K.tabs = function(sel, onChange){
    var box = K.$(sel); if (!box) return;
    function go(id){
      K.$$('button', box).forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-tab') === id); });
      K.$$('.panel').forEach(function(p){ p.classList.toggle('on', p.id === id); });
      K.activeTab = id; if (onChange) onChange(id);
    }
    K.$$('button', box).forEach(function(b){ b.addEventListener('click', function(){ go(b.getAttribute('data-tab')); }); });
    K.goTab = go;
    var first = K.$('button', box); if (first) go(first.getAttribute('data-tab'));
  };

  /* ---------- [1방 생성] 잠금 + 빠진 것 1줄 ---------- */
  K.gate = function(btnSel, needSel, check){
    var b = K.$(btnSel), n = K.$(needSel);
    function upd(){ var miss = check(); b.disabled = !!miss; n.textContent = miss ? '빠진 것: ' + miss : '준비 완료 — [1방 생성]을 누르세요'; return !miss; }
    document.addEventListener('input', upd); document.addEventListener('change', upd);
    K.regate = upd; upd(); return upd;
  };

  /* ---------- 글자 도우미 ---------- */
  K.fill = function(tpl, map){ return String(tpl).replace(/\{(\w+)\}/g, function(m, k){ return map[k] != null ? map[k] : ''; }).replace(/\s{2,}/g, ' ').trim(); };
  K.words = function(s){ return String(s || '').split(/\s+/).filter(Boolean); };
  K.dupWords = function(s){ var seen = {}, d = []; K.words(s).forEach(function(w){ if (seen[w]) d.push(w); seen[w] = 1; }); return d; };
  K.uniq = function(a){ var s = {}, o = []; a.forEach(function(x){ if (x && !s[x]){ s[x] = 1; o.push(x); } }); return o; };
  K.bytes = function(s){ return new TextEncoder().encode(String(s || '')).length; };
  /* 결정론 의사난수(같은 입력 → 같은 결과) */
  K.seed = function(str){ var h = 2166136261; String(str).split('').forEach(function(c){ h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }); return h >>> 0; };
  K.pick = function(arr, s, i){ return arr[(s + (i || 0) * 7) % arr.length]; };

  /* ---------- SHA-256 / HMAC-SHA256 (순수 JS, 브라우저 보안 문맥과 무관하게 동작) ---------- */
  var SK = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  function rotr(x, n){ return (x >>> n) | (x << (32 - n)); }
  K.sha256 = function(msg){
    var l = msg.length, bl = ((l + 9 + 63) >> 6) << 6, buf = new Uint8Array(bl); buf.set(msg); buf[l] = 0x80;
    var dv = new DataView(buf.buffer), bits = l * 8;
    dv.setUint32(bl - 4, bits >>> 0); dv.setUint32(bl - 8, Math.floor(bits / 4294967296));
    var H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19], W = new Uint32Array(64);
    for (var o = 0; o < bl; o += 64){
      var i;
      for (i = 0; i < 16; i++) W[i] = dv.getUint32(o + i * 4);
      for (i = 16; i < 64; i++){
        var x = W[i - 15], y = W[i - 2];
        var s0 = rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3), s1 = rotr(y, 17) ^ rotr(y, 19) ^ (y >>> 10);
        W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (i = 0; i < 64; i++){
        var S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25), ch = (e & f) ^ (~e & g);
        var t1 = (h + S1 + ch + SK[i] + W[i]) >>> 0;
        var S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22), mj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + mj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    var out = new Uint8Array(32), ov = new DataView(out.buffer);
    for (var j = 0; j < 8; j++) ov.setUint32(j * 4, H[j]);
    return out;
  };
  K.hmacSha256 = function(key, msg){
    var enc = new TextEncoder();
    if (typeof key === 'string') key = enc.encode(key);
    if (typeof msg === 'string') msg = enc.encode(msg);
    if (key.length > 64) key = K.sha256(key);
    var k = new Uint8Array(64); k.set(key);
    var ip = new Uint8Array(64 + msg.length), op = new Uint8Array(64 + 32);
    for (var i = 0; i < 64; i++){ ip[i] = k[i] ^ 0x36; op[i] = k[i] ^ 0x5c; }
    ip.set(msg, 64); op.set(K.sha256(ip), 64);
    return K.sha256(op);
  };
  K.hex = function(u8){ var s = ''; for (var i = 0; i < u8.length; i++) s += (u8[i] < 16 ? '0' : '') + u8[i].toString(16); return s; };

  /* ---------- AI 열쇠: 기기당 1일 12회 ---------- */
  K.aiDayKey = function(){ return 'kts_ai_day_' + K.stamp(); };
  K.aiUsed = function(){ try { return parseInt(localStorage.getItem(K.aiDayKey()) || '0', 10) || 0; } catch(e){ return 0; } };
  K.aiLeft = function(){ var lim = (window.KTS_AI && KTS_AI.dailyPerDevice) || 12; return Math.max(0, lim - K.aiUsed()); };
  K.aiUse = function(){ try { localStorage.setItem(K.aiDayKey(), String(K.aiUsed() + 1)); } catch(e){} K.aiBadge(); };
  K.aiBadge = function(){
    var lim = (window.KTS_AI && KTS_AI.dailyPerDevice) || 12;
    var el = K.$('#aiLeft'); if (el) el.textContent = myKey() ? 'AI ' + K.aiLeft() + '/' + lim : '없음';
    K.$$('[data-ai]').forEach(function(b){ b.classList.toggle('lock', !myKey()); b.title = myKey() ? '' : '열쇠 없음 — 규칙 엔진 결과를 그대로 쓰셔도 됩니다'; });
  };
  K.shell = function(){
    var sh = K.$('#keySheet'), btn = K.$('#btnKey');
    if (btn && sh) btn.addEventListener('click', function(){ sh.classList.add('on'); var i = K.$('#keyIn'); if (i) i.value = ''; });
    K.$$('[data-close]').forEach(function(b){ b.addEventListener('click', function(){ var s = b.closest('.sheet'); if (s) s.classList.remove('on'); }); });
    if (sh) sh.addEventListener('click', function(e){ if (e.target === sh) sh.classList.remove('on'); });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') K.$$('.sheet.on').forEach(function(s){ s.classList.remove('on'); }); });
    var sv = K.$('#keySave'); if (sv) sv.addEventListener('click', function(){
      var v = (K.$('#keyIn').value || '').trim();
      if (!v){ K.toast('열쇠를 붙여넣어 주세요'); return; }
      try { localStorage.setItem('kts_ai_key', v); } catch(e){}
      KTS_AI.key = v; sh.classList.remove('on'); K.aiBadge(); K.toast('이 기기에만 저장했습니다');
    });
    var dl = K.$('#keyDel'); if (dl) dl.addEventListener('click', function(){
      try { localStorage.removeItem('kts_ai_key'); } catch(e){}
      KTS_AI.key = ''; K.aiBadge(); K.toast('열쇠를 지웠습니다');
    });
    K.aiBadge();
  };
})();

/* ===== AI 공통 함수 3개 (이 이름 고정) ===== */
function myKey(){
  var k = '';
  try { k = localStorage.getItem('kts_ai_key') || ''; } catch(e){}
  if (k && !/^__/.test(k)) return k;
  return (window.KTS_AI && KTS_AI.key) || '';
}
async function aiJson(prompt, b64){
  var key = myKey();
  if (!key) throw new Error('NO_KEY');
  if (KTS.aiLeft() <= 0) throw new Error('QUOTA');
  KTS.aiUse();
  var parts = [{ text: prompt }];
  if (b64) parts.push({ inline_data: { mime_type: 'image/jpeg', data: String(b64).replace(/^data:[^,]+,/, '') } });
  var last = null;
  for (var i = 0; i < KTS_AI.models.length; i++){
    var m = KTS_AI.models[i];
    try {
      var r = await fetch(KTS_AI.endpoint + m + ':generateContent', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ contents: [{ parts: parts }], generationConfig: { responseMimeType: 'application/json', temperature: 0 } })
      });
      if (r.status === 429){ last = new Error('QUOTA'); continue; }
      if (!r.ok){ last = new Error('HTTP_' + r.status); continue; }
      var j = await r.json();
      var t = ((((j.candidates || [])[0] || {}).content || {}).parts || []).map(function(p){ return p.text || ''; }).join('');
      var o = JSON.parse(t.replace(/^\s*```(?:json)?/, '').replace(/```\s*$/, ''));
      window.__aiModel = m;
      return o;
    } catch(e){ last = e; }
  }
  throw last || new Error('AI_FAIL');
}
function aiErr(e){
  var c = (e && e.message) || String(e);
  if (c === 'NO_KEY') return '오른쪽 위 [AI 열쇠]에 내 제미나이 무료 열쇠를 넣어 주세요';
  if (c === 'QUOTA') return '오늘 무료 사용량을 다 썼습니다. 내일 다시 해 주세요';
  return 'AI가 응답하지 않았습니다 — 규칙 엔진 결과를 그대로 쓰셔도 됩니다 (' + c + ')';
}
