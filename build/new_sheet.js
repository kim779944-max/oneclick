function roleName(r){ return r.im || r.os || ''; }
function baseNote(r){
  return r.__tab==='seoul'?'서울 26.6 (정보몽땅은 수시 갱신)':r.__tab==='gyeonggi'?'경기 25.9 — 원본이 2025-09-30 기준이라 최근 1년 변경분이 빠져 있습니다':'전국 26.5 — 연 1회 갱신';
}
function srcLinksHTML(r){
  var out='';
  if(r.__tab==='seoul'){
    out += r.cu
      ? '<a href="https://cleanup.seoul.go.kr/cafe/mainIndx.do?cafeUrl='+encodeURIComponent(r.cu)+'" target="_blank" rel="noopener"><i>📄</i>정보몽땅 사업장 원문<em>사업개요·공개자료</em></a>'
      : '<a href="https://cleanup.seoul.go.kr/cleanup/bsnsstus/lscrMainIndx.do" target="_blank" rel="noopener"><i>🔎</i>정보몽땅에서 「'+esc(String(r.n).slice(0,14))+'」 검색<em>원문</em></a>';
  }else if(r.__tab==='gyeonggi'){
    out += '<a href="https://data.gg.go.kr/" target="_blank" rel="noopener"><i>📄</i>경기데이터드림 원문 확인<em>25.9 기준</em></a>';
  }else{
    out += '<a href="https://www.data.go.kr/data/15160169/fileData.do" target="_blank" rel="noopener"><i>📄</i>국토부 전국 데이터 원문<em>26.5 기준</em></a>';
  }
  out += '<a href="https://www.eum.go.kr/web/ar/lu/luLandDetailPop.jsp" target="_blank" rel="noopener"><i>🗺</i>토지이음 — 용도지역·공부 확인<em>국가 공식</em></a>';
  return out;
}
function newsLinksHTML(r){
  var z = zoneName(r), q = encodeURIComponent(z);
  return '<a href="https://search.naver.com/search.naver?where=news&amp;sort=1&amp;query=' + q + '" target="_blank" rel="noopener"><i>📰</i>「' + esc(z.slice(0, 16)) + '」 관련 기사<em>네이버 뉴스 실시간</em></a>' +
    '<a href="https://search.naver.com/search.naver?where=article&amp;query=' + encodeURIComponent(z + ' 조합 추진위') + '" target="_blank" rel="noopener"><i>💬</i>카페·블로그 — 조합·추진위 소식<em>검색</em></a>' +
    '<a href="https://search.naver.com/search.naver?where=news&amp;query=' + encodeURIComponent(z + ' 구청 고시') + '" target="_blank" rel="noopener"><i>🏗</i>구청 고시·공고 검색<em>검색</em></a>';
}
function civicLinks(r){   /* 옛 호출명 유지 */
  return '<div class="note"><b>지금 단계 주체</b> ' + (roleName(r) ? esc(roleName(r)) : '공개 자료에 미기재') + '</div>' + newsLinksHTML(r) + srcLinksHTML(r);
}

/* ---------- 258 (2026-11-27) 상세 3단 스위치 ---------- */
var DTAB='1';
function dswHTML(){
  function b(n,nm){
    var on = DTAB===n;
    return '<button type="button" role="tab" data-dt="'+n+'" aria-selected="'+(on?'true':'false')+'"'+(on?' class="on"':'')+'>'+nm+'</button>';
  }
  return '<div class="dsw" role="tablist" aria-label="구역 확인 항목 — 단계·일정 / 조합·원문 / 뉴스·소식">'+b('1','① 단계·일정')+b('2','② 조합·원문')+b('3','③ 뉴스·소식')+'</div>';
}
function dpAttrs(n){ return DTAB===n ? '' : ' hidden'; }
function paintDTab(n){
  if(n) DTAB=String(n);
  var sheet=$('sheet'); if(!sheet) return;
  Array.prototype.forEach.call(sheet.querySelectorAll('[data-dp]'), function(p){ p.hidden = p.getAttribute('data-dp')!==DTAB; });
  Array.prototype.forEach.call(sheet.querySelectorAll('.dsw button'), function(b){
    var on = b.getAttribute('data-dt')===DTAB; b.classList.toggle('on',on); b.setAttribute('aria-selected', on?'true':'false');
  });
  if(sheet.scrollTop>8) sheet.scrollTo({top:0,behavior:'smooth'});
}

/* 공개 데이터 표 — 추진단계·인가일·구역면적·세대수·소유자·조합원·연락처 (없으면 숨기지 않고 '공개자료 없음') */
function latestDate(r){
  var d=r.dt||{}, best='', lab='';
  DATE_KEYS.forEach(function(k,i){ if(d[k] && (!best || String(d[k])>best)){ best=String(d[k]); lab=DATE_LABELS[i]; } });
  return best ? {val:best, lab:lab} : null;
}
function specHTML(r){
  var ld=latestDate(r), rows=[];
  function put(lab,val){ rows.push([lab, val==null||val==='' ? '공개자료 없음' : String(val)]); }
  put('추진단계', stageLabel(r)==='단계 미기재' ? '' : stageLabel(r));
  put('최근 인가일', ld ? (ld.val+' · '+ld.lab) : '');
  put('구역면적', r.ar ? won(Math.round(r.ar))+'㎡' : '');
  var hv='';
  if(r.hs && r.hn) hv='기존 '+won(r.hs)+' → 건립 '+won(r.hn)+'세대';
  else if(r.hn) hv='건립 '+won(r.hn)+'세대';
  else if(r.hs) hv='기존 '+won(r.hs)+'세대';
  put('세대수', hv);
  put('토지등소유자', r.own ? won(r.own)+'명' : '');
  put('조합원', r.un ? won(r.un)+'명' : '');
  put('조합 연락처', r.tel ? r.tel : (r.__tab==='gyeonggi' ? '' : '경기 자료에만 있음'));
  var body = rows.map(function(x){
    var none = (x[1]==='공개자료 없음' || x[1]==='경기 자료에만 있음');
    return '<div><span>'+x[0]+'</span><b'+(none?' class="nv"':'')+'>'+esc(x[1])+'</b></div>';
  }).join('');
  return '<div class="spec">'+body+'</div>';
}
function consentHTML(r){
  var href = (r.__tab==='seoul' && r.cu)
    ? 'https://cleanup.seoul.go.kr/cafe/mainIndx.do?cafeUrl='+encodeURIComponent(r.cu)
    : r.__tab==='seoul' ? 'https://cleanup.seoul.go.kr/cleanup/bsnsstus/lscrMainIndx.do'
    : r.__tab==='gyeonggi' ? 'https://data.gg.go.kr/'
    : 'https://www.data.go.kr/data/15160169/fileData.do';
  return '<div class="nonebox"><div class="nh">동의율 <b>공개자료 없음</b></div>'+
    '<p>추진위원회·조합 <b>동의율</b>은 공개 데이터에 들어 있지 않습니다. <b>정보몽땅 사업개요 원문</b>에서 확인하세요.</p>'+
    '<a href="'+href+'" target="_blank" rel="noopener">정보몽땅 원문 바로가기 →</a></div>';
}
function priceHTML(r){
  var addr=addrOf(r), priceQ=encodeURIComponent(addr);
  return '<div class="lnklist">'+
      '<a href="https://map.naver.com/p/search/'+priceQ+'" target="_blank" rel="noopener"><i>🏠</i>네이버 지도로 이 자리 보기<em>주변</em></a>'+
      '<a href="https://rt.molit.go.kr/" target="_blank" rel="noopener"><i>📊</i>국토부 실거래가 공개시스템<em>실거래</em></a>'+
      '<a href="https://www.realtyprice.kr/" target="_blank" rel="noopener"><i>📋</i>부동산공시가격 알리미<em>공시지가</em></a>'+
    '</div>'+
    '<div class="note">위 세 곳은 주소를 직접 넣어 확인하는 곳입니다(이 화면은 금액을 계산·표시하지 않습니다).</div>'+
    '<div class="warn"><b>감정평가액·비례율은 관리처분 전 비공개입니다.</b> 공식 감정평가액·비례율·분담금은 관리처분계획 인가 때 공개됩니다. 위 링크의 시세·공시지가는 <b>참고 값</b>이고, 이 화면은 어떤 금액도 계산해 드리지 않습니다.</div>';
}
function navCardHTML(r){
  return '<div class="card"><h2><i>→</i>현장 내비 <small>바로 열기</small></h2>'+navHTML(r)+
    '<div class="note">티맵은 앱이 설치된 폰에서 바로 열립니다. 앱이 없으면 주소를 복사해 쓰세요.</div></div>';
}
function priceCardHTML(r){
  return '<div class="card"><h2><i>₩</i>참고 시세·공시지가 <small>참고용</small></h2>'+priceHTML(r)+'</div>';
}

function sheetHTML(r){
  if(r.__tab==='moa') return moaSheetHTML(r);
  var tags='';
  function tag(v,cls){ if(!v) return ''; tags+='<span class="'+(cls||'')+'">'+esc(v)+'</span>'; }
  tag(stageLabel(r),'hot');
  if(r.o==='일시중단') tag('일시중단','stop');
  tag(r.t);
  tag(r.__tab==='nation'?'전국 통합':'공개자료');
  var addr=addrOf(r), role=roleName(r);
  var srcHead=(r.__tab==='seoul'?'서울':r.__tab==='gyeonggi'?'경기':'전국');

  return '<div class="shd"><div class="r1"><button data-act="close">← 목록</button><span>'+srcHead+' · '+esc(stageLabel(r))+'</span></div>'+dswHTML()+'</div>'+
  '<div class="sbody">'+
    '<div class="dt"><h3>'+esc(r.n)+'</h3><div class="lo">'+esc(addr)+'</div><div class="tags">'+tags+'</div></div>'+
    /* ① 단계·일정 */
    '<div class="dp" data-dp="1"'+dpAttrs('1')+'>'+
      ladderHTML(r)+
      datesHTML(r)+
      specHTML(r)+
      consentHTML(r)+
    '</div>'+
    /* ② 조합·원문 */
    '<div class="dp" data-dp="2"'+dpAttrs('2')+'>'+
      '<div class="card"><h2><i>👥</i>지금 단계 주체 <small>공개자료</small></h2>'+
        '<div class="kv1"><div><span>단계 주체</span><b'+(role?'':' class="nv"')+'>'+(role?esc(role):'공개자료 없음')+'</b></div>'+
        '<div><span>조합·추진위 연락처</span><b'+(r.tel?'':' class="nv"')+'>'+(r.tel?esc(r.tel):(r.__tab==='gyeonggi'?'공개자료 없음':'경기 자료에만 있음'))+'</b></div></div>'+
        '<div class="note">조합·추진위 <b>이름·연락처</b>는 공개 자료에 있는 것만 적습니다. 비어 있으면 아래 원문에서 확인하세요.</div></div>'+
      '<div class="card"><h2><i>🔗</i>원문·공식 자료 <small>확인은 원문으로</small></h2>'+
        '<div class="lnklist">'+srcLinksHTML(r)+'</div>'+
        '<div class="note"><b>도면</b> 정비구역 도면·고시문은 정보몽땅 원문의 공개자료에서 내려받습니다. (공개자료가 없는 구역은 구청 도시정비과로 문의)<br><b>기준일</b> '+baseNote(r)+'<br>공개 데이터를 그대로 모은 참고 자료이며 <b>법적 효력이 없습니다.</b></div></div>'+
      dealHTML(r)+
    '</div>'+
    /* ③ 뉴스·소식 */
    '<div class="dp" data-dp="3"'+dpAttrs('3')+'>'+
      '<div class="card"><h2><i>📰</i>뉴스·소식 <small>실시간 검색</small></h2>'+
        '<div class="lnklist">'+newsLinksHTML(r)+'</div>'+
        '<div class="note">기사·블로그는 검색 결과로 바로 연결합니다. 이 화면은 기사 내용을 저장하거나 요약하지 않습니다.</div></div>'+
      alertHTML(r)+
    '</div>'+
    /* 공통 — 현장·시세 접어 둠 */
    '<details class="xmore"><summary>현장 내비 · 참고 시세 <small>펼치기</small></summary>'+
      navCardHTML(r)+priceCardHTML(r)+
    '</details>'+
    '<p class="foot">KTS 원클릭 · 재개발 진행조회기<br><a href="tel:01020022899">010-2002-2899</a></p>'+
  '</div>';
}
