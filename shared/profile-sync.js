/* ==========================================================================
   KTS 공용 프로필 — 명함 정보 하나로 전 앱 동기화 (295 · 297번)
   --------------------------------------------------------------------------
   전자명함에서 상호·직책·이름·전화·팩스·메일·주소·이미지·QR 격을 고치면
   이 키(localStorage['kts_profile_v1'])에 그대로 적히고,
   매물장·물건표 포스터·계약서가 같은 키를 읽어 **저절로 따라 바뀐다**.
   · 서버로 보내지 않는다(이 기기 안에서만).
   · 값이 없으면 빈 객체 → 각 앱은 지금 쓰던 기본값을 그대로 쓴다(아무것도 사라지지 않음).
   --------------------------------------------------------------------------
     KTSProfile.get()        → {org,title,name,phone,…,photo,style,stamp,shortNo,shortUrl,updatedAt}
     KTSProfile.set(obj)     → 저장(전체 교체)
     KTSProfile.patch(obj)   → 일부만 바꿔 저장
     KTSProfile.on(fn)       → 다른 탭/앱에서 바뀌면 fn(profile)
     KTSProfile.me()         → 전자명함이 쓰는 모양으로(없으면 null)
     KTSProfile.broker()     → 매물장·포스터가 쓰는 모양으로(없으면 null)
   ========================================================================== */
(function (g) {
  'use strict';
  var KEY = 'kts_profile_v1';
  var LEGACY = 'kts_bc_me';
  var EV = 'kts-profile-change';

  function read(k) {
    try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  }
  function get() {
    var p = read(KEY);
    if (p && typeof p === 'object') return p;
    var old = read(LEGACY);            /* 예전에 저장한 명함이 있으면 그대로 이어받는다 */
    if (old && typeof old === 'object') return migrate(old);
    return {};
  }
  function migrate(old) {
    var p = {};
    ['org', 'title', 'name', 'phone', 'fax', 'email', 'bizAddr', 'kakao', 'field', 'strength', 'intro', 'photo', 'stamp', 'qrKind', 'shortNo', 'shortUrl', 'style'].forEach(function (k) {
      if (old[k] != null) p[k] = old[k];
    });
    p.updatedAt = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { }
    return p;
  }
  function set(obj) {
    var p = obj || {};
    p.updatedAt = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { }
    /* 전자명함이 쓰는 옛 키도 같이 맞춰 둔다(한쪽만 고쳐도 어긋나지 않게) */
    try {
      localStorage.setItem(LEGACY, JSON.stringify({
        org: p.org || '', title: p.title || '', name: p.name || '', phone: p.phone || '',
        fax: p.fax || '', email: p.email || '', bizAddr: p.bizAddr || '', kakao: p.kakao || '',
        field: p.field || '', strength: p.strength || '', intro: p.intro || '',
        photo: p.photo || '', stamp: p.stamp || 'circle', qrKind: p.qrKind || 'url',
        style: p.style || 'seal', shortNo: p.shortNo || 0, shortUrl: p.shortUrl || ''
      }));
    } catch (e) { }
    try { g.dispatchEvent(new CustomEvent(EV, { detail: p })); } catch (e) { }
    return p;
  }
  function patch(obj) {
    var p = get();
    for (var k in (obj || {})) p[k] = obj[k];
    return set(p);
  }
  function on(fn) {
    if (typeof fn !== 'function') return;
    g.addEventListener('storage', function (e) { if (e && e.key === KEY) fn(get()); });
    g.addEventListener(EV, function (e) { fn(e.detail || get()); });
  }
  function me() {
    var p = get();
    return p && p.name ? p : null;
  }
  function broker() {
    var p = get();
    if (!p || !p.name) return null;
    return {
      name: p.name, title: p.title || '', org: p.org || '',
      office: p.org || '', company: p.org || '',
      phone: p.phone || '', fax: p.fax || '', email: p.email || '',
      address: p.bizAddr || '', bizAddr: p.bizAddr || '',
      photo: p.photo || '', stamp: p.stamp || 'circle', style: p.style || 'seal',
      shortNo: p.shortNo || 0, shortUrl: p.shortUrl || ''
    };
  }

  g.KTSProfile = { KEY: KEY, get: get, set: set, patch: patch, on: on, me: me, broker: broker };
})(window);
