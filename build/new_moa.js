function moaSheetHTML(r){
  var flags=(r.fl||[]).map(function(f){return '<span class="hot">'+esc(f)+'</span>'}).join('');
  var kvs='';
  function kv(lab,val,unit){ if(val==null||val==='') return; kvs+='<div><span>'+lab+'</span><b>'+val+(unit?'<small>'+unit+'</small>':'')+'</b></div>' }
  kv('승인·고시일', r.up?r.up.replace(/-/g,'.'):'미기재');
  kv('관리지역 면적', r.ar?won(Math.round(r.ar)):'미기재','㎡');
  kv('계획 세대수', r.hh?won(r.hh):'미기재','세대');
  kv('모아주택 구역', r.bl?r.bl+'개':'미기재');
  if(r.fa) kv('용적률', r.fa, '%');
  if(r.flr) kv('최고층', r.flr, '층');
  var deals=sameDongDeals(r);
  var dealHtml=deals.length
    ? deals.map(function(x){
        return '<div class="rowr" style="display:flex;gap:6px;font-size:11px;color:#C9D6E6;padding:4px 0;border-bottom:1px solid #16233D"><b style="flex:1;font-weight:900;color:#fff">'+esc(x.n.slice(0,26))+'</b><span style="color:#9FB0C8">'+esc(x.t)+'</span><span style="color:#FFC98F;font-weight:800">'+esc(x.st||'—')+'</span></div>';
      }).join('')
    : '<div class="note" style="margin:0">같은 동에 가로주택·소규모 사업장이 공개 목록에 없습니다. 관리지역 안 개별 사업은 서울 탭에서 동 이름으로 찾아보세요.</div>';
  var z=String(r.n||''), q=encodeURIComponent(z);
  var newsLinks=
    '<a href="https://search.naver.com/search.naver?where=news&amp;sort=1&amp;query='+q+'" target="_blank" rel="noopener"><i>📰</i>「'+esc(z.slice(0,16))+'」 관련 기사<em>네이버 뉴스 실시간</em></a>'+
    '<a href="https://search.naver.com/search.naver?where=article&amp;query='+encodeURIComponent(z+' 모아타운')+'" target="_blank" rel="noopener"><i>💬</i>카페·블로그 소식<em>검색</em></a>'+
    '<a href="https://search.naver.com/search.naver?where=news&amp;query='+encodeURIComponent((r.g||'')+' 모아타운 구청 고시')+'" target="_blank" rel="noopener"><i>🏗</i>구청 고시·공고 검색<em>검색</em></a>';
  return '<div class="shd"><div class="r1"><button data-act="close">← 목록</button><span>모아타운 · 확인 결과</span></div>'+dswHTML()+'</div>'+
  '<div class="sbody">'+
    '<div class="dt"><h3>'+esc(r.n)+'</h3><div class="lo">'+esc(addrOf(r))+'</div>'+
      '<div class="tags"><span class="hot">'+esc(stageLabel(r))+'</span>'+flags+
        '<span>모아타운 · '+esc(r.rg||'서울')+'</span>'+(r.bl?'<span>모아주택 '+r.bl+'개 구역</span>':'')+'</div></div>'+
    /* ① 승인·규모 */
    '<div class="dp" data-dp="1"'+dpAttrs('1')+'>'+
      '<div class="lad"><div class="mlad">'+
        '<div class="on"><b>1</b>대상지 선정</div><div class="on"><b>2</b>관리계획 수립</div>'+
        '<div class="on now"><b>3</b>승인·고시</div><div><b>4</b>모아주택 착공</div></div>'+
        '<div class="mst"><i class="on"></i><i class="on"></i><i class="on"></i><i></i></div>'+
        '<div class="note" style="margin-top:6px">승인·고시까지 확인된 상태입니다. 4단계(모아주택 착공)는 관리지역 안 개별 사업장마다 달라서, 아래 같은 동 사업장과 구청 공고로 확인하세요.</div></div>'+
      '<div class="kv">'+kvs+'</div>'+
      (r.scale?'<div class="note"><b>규모(원문)</b> '+esc(r.scale)+'</div>':'')+
    '</div>'+
    /* ② 같은 동·원문 */
    '<div class="dp" data-dp="2"'+dpAttrs('2')+'>'+
      '<div class="card"><h2><i>▤</i>같은 동 모아주택 후보 <small>가로주택·소규모</small></h2>'+dealHtml+
        '<div class="note">대표지번이 같은 동인 사업장을 보여 드리는 <b>참고 목록</b>입니다. 관리지역 경계 안 필지 전체를 가리키지는 않습니다.</div></div>'+
      '<div class="card"><h2><i>🔗</i>원문·출처 <small>확인은 원문으로</small></h2><div class="lnklist">'+
        (r.lk?'<a href="'+esc(r.lk)+'" target="_blank" rel="noopener"><i>📄</i>서울시 모아타운 아카이브 원문<em>변경 전·후 도면</em></a>':'')+
        '<a href="https://news.seoul.go.kr/citybuild/moa-housing-town/archive" target="_blank" rel="noopener"><i>📚</i>모아주택·모아타운 아카이브 전체<em>권역별</em></a>'+
        '<a href="https://housing.seoul.go.kr/site/main/content/sh_080003" target="_blank" rel="noopener"><i>🏠</i>서울주거포털 모아주택·모아타운<em>정책·현황</em></a>'+
        '<a href="https://www.eum.go.kr/web/ar/lu/luLandDetailPop.jsp" target="_blank" rel="noopener"><i>🗺</i>토지이음 — 용도지역·공부 확인<em>국가 공식</em></a></div>'+
        '<div class="note"><b>기준일</b> 서울시 온라인 아카이브(관리계획 승인·고시분) · 26.11 수집<br>아카이브에 없는 대상지(선정·계획 수립 중)는 이 화면에 없습니다. 공개 자료를 모은 <b>참고용</b>이고 법적 효력은 없습니다.</div></div>'+
    '</div>'+
    /* ③ 뉴스·소식 */
    '<div class="dp" data-dp="3"'+dpAttrs('3')+'>'+
      '<div class="card"><h2><i>📰</i>뉴스·소식 <small>실시간 검색</small></h2>'+
        '<div class="lnklist">'+newsLinks+'</div>'+
        '<div class="note">기사·블로그는 검색 결과로 바로 연결합니다. 이 화면은 기사 내용을 저장하거나 요약하지 않습니다.</div></div>'+
      alertHTML(r)+
    '</div>'+
    '<details class="xmore"><summary>현장 내비 <small>펼치기</small></summary>'+navCardHTML(r)+'</details>'+
    '<p class="foot">KTS 원클릭 · 재개발 진행조회기<br><a href="tel:01020022899">010-2002-2899</a></p>'+
  '</div>';
}
