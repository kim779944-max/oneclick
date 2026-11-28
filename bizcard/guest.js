/* ==========================================================================
   KTS 손님 명함 — 주소 하나로 열리는 손님 화면 (265 · 281 · 298번)
   --------------------------------------------------------------------------
   주인 화면(bizcard)과 404.html(짧은 주소 /1)이 **같은 그림**을 쓰도록 한 곳에 모음.
   · 명함 — 상호 · 직책·이름 · 사진 · 전화/팩스/메일/주소 · QR
   · 별표(★) 매물 전체를 사진 썸네일 카드로 나란히 (누르면 그 물건표가 바로 열림)
   · 화면 아래 버튼 순서 고정 — [전화] → [문자] → [카톡] → [저장]
   --------------------------------------------------------------------------
     KTS_GUEST.card(p)            → 손님 화면 HTML
     KTS_GUEST.bind(root, p, o)   → 동작(QR·카톡·저장·문자) 연결
     KTS_GUEST.price(it)          → 가격 글자
   p = { v, n, me:{...}, items:[{id,title,addr,kind,areaP,price,residual,dealType,deposit,monthly,photos,lat,lon}], at }
   ========================================================================== */
(function (g) {
  'use strict';
  var K = g.KTS_GUEST = {};

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function num(n, d) {
    if (n == null || n === '' || !isFinite(+n)) return '';
    return (+n).toLocaleString('ko-KR', { maximumFractionDigits: d == null ? 0 : d });
  }
  function money(v) {
    if (!v) return '가격 미정';
    var eok = Math.floor(v / 1e8), man = Math.round((v % 1e8) / 1e4);
    if (eok && man) return eok + '억 ' + man.toLocaleString('ko-KR') + '만';
    if (eok) return eok + '억';
    if (man >= 1) return man.toLocaleString('ko-KR') + '만';
    return num(v) + '원';
  }
  function price(it) {
    if (it.dealType && it.dealType !== '매매' && it.deposit) {
      return '보증 ' + money(it.deposit) + (it.monthly ? ' / 월 ' + money(it.monthly) : '');
    }
    if (it.residual) return money(it.residual);
    return money(it.price);
  }
  function regionOf(it) {
    var parts = String(it.addr || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    for (var i = parts.length - 1; i >= 0; i--) {
      if (/[읍면동]$/.test(parts[i]) && !/^\d/.test(parts[i])) return parts[i];
    }
    for (var j = 0; j < parts.length; j++) {
      if (/[시군구]$/.test(parts[j]) && parts[j].length > 1) return parts[j];
    }
    return it.kind || '지역';
  }
  function splitOrg(me) {
    var org = String(me.org || '').trim();
    var title = String(me.title || '').trim();
    if (!title && org.indexOf(' · ') > 0) {
      var p = org.split(' · ');
      title = p.pop(); org = p.join(' · ');
    }
    return { org: org, title: title };
  }
  function tel(me) { return String(me.phone || '').replace(/[^0-9+]/g, ''); }
  function mapUrl(it) {
    if (!it.lat || !it.lon) return '';
    return 'https://api.vworld.kr/req/image?service=image&request=getmap&key=0C4AD93D-75D2-447B-B533-C5ADDD4A5B2F'
      + '&domain=autooneclick.com&format=png&basemap=PHOTO_HYBRID&center=' + (+it.lon).toFixed(6) + ',' + (+it.lat).toFixed(6)
      + '&zoom=16&size=420,300&crs=EPSG:4326';
  }
  function thumb(it) {
    var ph = (it.photos || it.ph || []).filter(Boolean);
    if (ph.length) return '<img src="' + esc(ph[0]) + '" alt="">';
    var m = mapUrl(it);
    if (m) return '<img src="' + esc(m) + '" alt="위치도" loading="lazy">';
    return '<span class="ph">' + esc((it.kind || '매물').slice(0, 2)) + '</span>';
  }

  /* 별표 매물 — 사진 썸네일 카드 나란히 (누르면 그 물건표) */
  function strip(p, opts) {
    var items = (p.items || []);
    if (!items.length) return '';
    var base = (opts && opts.posterBase) || '';
    var h = '<div class="sec-h starred"><b>보내 드리는 물건</b><span>★ ' + items.length + '건</span></div>';
    h += '<div class="gstrip' + (items.length > 2 ? ' scroll' : '') + '" id="gstrip">';
    items.forEach(function (it, i) {
      var line1 = regionOf(it) + (it.areaP ? ' ' + num(it.areaP) + '평' : (it.areaM2 ? ' ' + num(it.areaM2) + '㎡' : ''));
      var href = base ? (base + (base.indexOf('?') >= 0 ? '&' : '?') + 'i=' + i) : '#';
      h += '<a class="gcard" href="' + esc(href) + '" data-i="' + i + '">'
        + '<div class="gth">' + thumb(it) + (it.demo ? '<i class="dm">예시</i>' : '') + '</div>'
        + '<b class="gc1">' + esc(line1) + '</b>'
        + '<span class="gc2">' + esc(price(it)) + '</span>'
        + '</a>';
    });
    h += '</div>';
    return h;
  }

  function card(p, opts) {
    opts = opts || {};
    p = p || {};
    var me = p.me || {};
    var o = splitOrg(me);
    var hasPhoto = !!me.photo;
    /* 304번 — 그림(사진)을 명함의 주인공으로 크게. 도장은 빼고 QR만 코너 맨 구석에 */
    var h = '<div class="biz guest hasphoto' + (hasPhoto ? '' : ' nophoto') + '">';
    h += '<button class="biz-qr" id="btnSeal" type="button" aria-label="QR 크게 보기"><canvas id="sealCv"></canvas></button>';
    h += '<div class="biz-hero">';
    if (hasPhoto) h += '<img class="hero-img" src="' + esc(me.photo) + '" alt="' + esc(me.name || '') + ' 사진">';
    else h += '<b class="hero-mono" aria-hidden="true">' + esc(String(me.name || '?').slice(0, 1)) + '</b>';
    h += '<div class="hero-cap">';
    h += '<div class="co">' + esc(o.org || '전자명함') + '</div>';
    h += '<div class="nm">' + (o.title ? '<em>' + esc(o.title) + '</em> ' : '') + '<b>' + esc(me.name || '이름') + '</b></div>';
    if (me.field) h += '<span class="role">' + esc(me.field) + '</span>';
    h += '</div></div>';

    h += '<div class="biz-body">';
    h += '<div class="clines">';
    h += '<a class="cline tel" href="tel:' + esc(tel(me)) + '">' + ICON.phone + '<b>' + (me.phone ? esc(me.phone) : '전화번호') + '</b></a>';
    if (me.fax) h += '<div class="cline">' + ICON.fax + '<span>' + esc(me.fax) + '</span><i>FAX</i></div>';
    if (me.email) h += '<a class="cline" href="mailto:' + esc(me.email) + '">' + ICON.mail + '<span>' + esc(me.email) + '</span></a>';
    if (me.bizAddr) h += '<div class="cline">' + ICON.home + '<span>' + esc(me.bizAddr) + '</span></div>';
    h += '</div>';

    if (me.strength) h += '<div class="edge-line">' + ICON.spark + '<span>' + esc(me.strength) + '</span></div>';
    if (me.intro) h += '<p class="intro"><em>“</em>' + esc(me.intro) + '</p>';
    h += '</div>';
    h += '</div>';

    h += strip(p, opts);

    h += '<p class="tiny">KTS 원클릭 전자명함 · 문의는 전화·문자·카톡으로</p>';
    h += '<div class="gbar" role="group" aria-label="연락">'
      + '<a class="pact tel" href="tel:' + esc(tel(me)) + '">' + ICON.phone + '<span>전화</span></a>'
      + '<a class="pact sms" id="btnSms" href="sms:' + esc(tel(me)) + '">' + ICON.sms + '<span>문자</span></a>'
      + '<a class="pact kakao" id="btnKakao" href="#">' + ICON.chat + '<span>카톡</span></a>'
      + '<button class="pact save" id="btnSaveCard" type="button">' + ICON.down + '<span>저장</span></button>'
      + '</div>';
    return h;
  }

  var ICON = {
    phone: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.6 3h2.5c.5 0 .9.33 1 .82l.8 3.1c.08.35-.03.72-.3.97l-1.6 1.5a11.8 11.8 0 0 0 5.6 5.6l1.5-1.6c.25-.27.62-.38.97-.3l3.1.8c.49.11.82.5.82 1v2.5A2.6 2.6 0 0 1 18.4 20C10.6 19.5 4.5 13.4 4 5.6A2.6 2.6 0 0 1 6.6 3z"/></svg>',
    sms: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.5 4h15A1.5 1.5 0 0 1 21 5.5v10A1.5 1.5 0 0 1 19.5 17H9.6l-4.3 3.3c-.5.4-1.3 0-1.3-.64V5.5A1.5 1.5 0 0 1 4.5 4z"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.2A8.3 8.3 0 0 0 3.7 11.5c0 1.6.45 3.1 1.25 4.4L3.6 20.3l4.5-1.3a8.3 8.3 0 0 0 3.9.9 8.3 8.3 0 0 0 0-16.6z"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 3h2v9.2l3.1-3.1 1.4 1.4L12 16.6 6.5 10.5l1.4-1.4L11 12.2z"/><path d="M5 18.5h14V20H5z"/></svg>',
    fax: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="9" width="17" height="10.5" rx="2"/><path d="M7 9V4.5h10V9"/><path d="M7 15.5h5"/><circle cx="17" cy="12.6" r=".8" fill="currentColor"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m3.6 6.6 8.4 6.6 8.4-6.6"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10.5 12 4l8 6.5V20h-5v-6H9v6H4z"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3.2l1.9 4.6 4.6 1.9-4.6 1.9L12 16.2l-1.9-4.6L5.5 9.7l4.6-1.9z"/></svg>'
  };

  /* 동작 연결 */
  function bind(root, p, opts) {
    opts = opts || {};
    var me = (p && p.me) || {};
    var cv = root.querySelector('#sealCv');
    if (cv && g.KTS && KTS.Seal) {
      var paint = function () {
        try {
          /* 304번 — 명함 위 QR은 테두리·도장 없이 깔끔하게(plain) */
          KTS.Seal.paint(cv, opts.sealSize || 76, {
            style: 'plain',
            name: me.name || '',
            photo: me.photo || '', code: me.code || (p && p.n ? String(p.n) : ''),
            value: KTS.Seal.payload(me), onload: function () { paint(); }
          });
          cv.style.width = '100%';
          cv.style.height = '100%';
        } catch (e) { }
      };
      paint();
    }
    var bs = root.querySelector('#btnSaveCard');
    if (bs) bs.addEventListener('click', function () { saveContact(me); });
    var sms = root.querySelector('#btnSms');
    if (sms) {
      var body = (me.name || 'KTS') + ' 전자명함' + (p && p.n ? ' https://autooneclick.com/' + p.n : '');
      sms.href = 'sms:' + tel(me) + (/(iPhone|iPad|iPod)/i.test(navigator.userAgent || '') ? '&' : '?') + 'body=' + encodeURIComponent(body);
    }
    var bk = root.querySelector('#btnKakao');
    if (bk) bk.addEventListener('click', function (e) {
      e.preventDefault();
      var k = String(me.kakao || '').trim();
      if (/^https?:/.test(k)) { g.open(k, '_blank'); return; }
      if (k) { copy(k, '카톡 ID 「' + k + '」 복사 — 카톡에서 붙여넣으세요'); return; }
      toast('카톡 ID나 오픈채팅 주소가 아직 없습니다');
    });
  }

  function tel(me) { return String((me && me.phone) || '').replace(/[^0-9+]/g, ''); }

  function copy(text, msg) {
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { toast(msg); }).catch(function () { toast(text) });
    else toast(text);
  }
  var toastT = null;
  function toast(msg, ms) {
    var t = document.getElementById('toast');
    if (!t) { try { alert(msg) } catch (e) { } return; }
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove('on') }, ms || 2800);
  }

  function saveContact(me) {
    var o = splitOrg(me);
    var v = function (s) { return String(s || '').replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\r?\n/g, '\\n'); };
    var lines = ['BEGIN:VCARD', 'VERSION:3.0', 'N:' + v(me.name) + ';;;;', 'FN:' + v(o.title ? o.title + ' ' + me.name : me.name),
      'ORG:' + v(o.org), 'TITLE:' + v(o.title), 'TEL;TYPE=CELL:' + v(me.phone)];
    if (me.fax) lines.push('TEL;TYPE=FAX:' + v(me.fax));
    if (me.email) lines.push('EMAIL:' + v(me.email));
    if (me.bizAddr) lines.push('ADR;TYPE=WORK:;;' + v(me.bizAddr) + ';;;;');
    lines.push('NOTE:' + v([me.field, me.strength].filter(Boolean).join(' · ')), 'END:VCARD');
    try {
      var blob = new Blob([lines.join('\r\n')], { type: 'text/vcard;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = (me.name || 'KTS') + '.vcf';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { try { URL.revokeObjectURL(url) } catch (e) { } }, 4000);
      toast('연락처를 저장했습니다 — 폰 주소록에 「' + (me.name || 'KTS') + '」이 생깁니다', 3400);
    } catch (e) { toast('이 기기에서는 저장이 어렵습니다 — 번호를 길게 눌러 저장해 주세요'); }
  }

  K.card = card;
  K.bind = bind;
  K.strip = strip;
  K.price = price;
  K.money = money;
  K.saveContact = saveContact;
  K.toast = toast;
})(window);
