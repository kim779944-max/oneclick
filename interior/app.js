(function(){
'use strict';
var $=function(s,r){return (r||document).querySelector(s);}, $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));};
var SMS='01020022899';
var RATE_KEY='kts_interior_rates_v1', TRIAL_KEY='kts_interior_trial_v1', PASS_KEY='kts_interior_pass_v1', SEL_KEY='kts_interior_v1';
function won(n){return Math.round(n).toLocaleString('ko-KR');}
function ls(k){try{return localStorage.getItem(k);}catch(e){return null;}}
function lsSet(k,v){try{localStorage.setItem(k,v);}catch(e){}}
var toastT;
function toast(m){var t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(function(){t.classList.remove('on');},2600);}
function smsHref(body){return 'sms:'+SMS+'?body='+encodeURIComponent(body);}
$('#smsKit').href=smsHref('[KTS] 인테리어 견적 · 벽키트 문의');
$('#smsPass').href=smsHref('[KTS] 인테리어 사진 변환 이용권 신청');

/* ---------------- 단가표 (계산식·단가 숫자 불변) ---------------- */
var DEF={
  wall:{l:20100,m:32600,h:120000},
  light:{l:{set:0,unit:11000},m:{set:0,unit:45000},h:{set:0,unit:55000}},
  furn:{l:250000,m:600000,h:1200000},
  daily:250000, margin:35
};
var NAMES={
  wall:{l:'템바보드',m:'표준 포인트월·패널',h:'대리석(아트월)'},
  light:{l:'벽 간접조명',m:'천장 간접조명',h:'등기구(사각 벽등)'},
  furn:{l:'가성비 세트',m:'원목·우드 세트',h:'세라믹·스틸 세트'}
};
var DESC={
  light:{l:'벽 상단에 숨은 선조명. 빛이 벽 위아래로 번집니다.',
         m:'천장 코브에서 벽으로 빛이 떨어집니다.',
         h:'기구가 보이는 사각 벽등. 위아래로 간접광을 줍니다.'}
};
var KIND={'wall.l':'ok','wall.m':'ok'};
var SRC={'wall.l':'490×2,440mm 1장 24,000원(오늘의집 표시가, 2026-11-22) ÷ 1.196㎡',
         'wall.m':'500×2,440mm 1장 39,800원(10x10 표시가, 2026-11-22) ÷ 1.22㎡',
         'wall.h':'인조대리석 패널 + 부착·보강 인건 포함 추정 (뮤럴 벽지도 이 기준)',
         'light.l':'4인치 LED 매립 8,000~15,000원 범위의 중앙값 — 벽 간접조명에 그대로 사용',
         'light.m':'1m 기준 추정 — 천장 간접조명에 그대로 사용',
         'light.h':'천장 골조 + LED T5 포함 추정 — 사각 벽등에 그대로 사용',
         'furn.l':'배치 변경 중심','furn.m':'','furn.h':'',
         'daily':'숨고·일당 시세는 지역·시기별 차이','margin':'일괄 위임 비교용 가정값'};
function clone(o){return JSON.parse(JSON.stringify(o));}
var R=clone(DEF);
(function(){try{var s=JSON.parse(ls(RATE_KEY)||'null');if(s&&s.wall&&s.light&&s.furn){
  ['l','m','h'].forEach(function(g){
    if(s.wall[g]>=0)R.wall[g]=+s.wall[g];
    if(s.furn[g]>=0)R.furn[g]=+s.furn[g];
    if(s.light[g]){if(s.light[g].set>=0)R.light[g].set=+s.light[g].set;if(s.light[g].unit>=0)R.light[g].unit=+s.light[g].unit;}
  });
  if(s.daily>=0)R.daily=+s.daily; if(s.margin>=0)R.margin=+s.margin;
}}catch(e){}})();
function getP(path){return path.split('.').reduce(function(o,k){return o[k];},R);}
function getD(path){return path.split('.').reduce(function(o,k){return o[k];},DEF);}
function setP(path,v){var a=path.split('.'),o=R;for(var i=0;i<a.length-1;i++)o=o[a[i]];o[a[a.length-1]]=v;}
function tagOf(path){
  if(getP(path)!==getD(path)) return '<span class="tg me">직접 입력</span>';
  var key=path.replace(/\.(set|unit)$/,'');
  return KIND[key]==='ok'?'<span class="tg ok">확인</span>':'<span class="tg es">추정</span>';
}
function buildRates(){
  var rows=[
    ['wall.l','벽 하 · 템바보드','원/㎡'],['wall.m','벽 중 · 포인트월·패널','원/㎡'],['wall.h','벽 상 · 대리석(아트월)','원/㎡'],
    ['light.l.unit','조명 1 · 벽 간접조명(개당)','원/개'],['light.l.set','조명 1 · 고정 세트가','원'],
    ['light.m.unit','조명 2 · 천장 간접조명','원/m'],['light.m.set','조명 2 · 고정 세트가','원'],
    ['light.h.unit','조명 3 · 등기구(사각 벽등)','원/m'],['light.h.set','조명 3 · 고정 세트가','원'],
    ['furn.l','가구 하 · 가성비 세트','원'],['furn.m','가구 중 · 원목·우드 세트','원'],['furn.h','가구 상 · 세라믹·스틸 세트','원'],
    ['daily','인건비 일당(목공)','원/인·일'],['margin','업체 이윤율','%']
  ];
  $('#ratesTbl').innerHTML=rows.map(function(r){
    var key=r[0].replace(/\.(set|unit)$/,'');
    return '<div class="r"><div class="nm">'+r[1]+' <span data-tg="'+r[0]+'">'+tagOf(r[0])+'</span>'+(SRC[key]?'<small>'+SRC[key]+'</small>':'')+'</div>'+
      '<input type="number" inputmode="numeric" min="0" step="'+(r[0]==='margin'?1:100)+'" data-p="'+r[0]+'" value="'+getP(r[0])+'" aria-label="'+r[1]+'"><span class="u">'+r[2]+'</span></div>';
  }).join('')+'<div class="r" style="justify-content:flex-end"><button class="mini" type="button" id="rateReset">기본값으로</button></div>';
  $$('#ratesTbl input').forEach(function(inp){
    inp.addEventListener('input',function(){
      var v=Math.round(parseFloat(inp.value));
      if(!(v>=0)) return;
      setP(inp.dataset.p,v); lsSet(RATE_KEY,JSON.stringify(R));
      var tg=$('[data-tg="'+inp.dataset.p+'"]'); if(tg) tg.innerHTML=tagOf(inp.dataset.p);
      calc();
    });
  });
  $('#rateReset').addEventListener('click',function(){R=clone(DEF);try{localStorage.removeItem(RATE_KEY);}catch(e){}buildRates();calc();toast('기본 단가로 되돌렸습니다');});
}

/* ---------------- 자료(regions.json) ---------------- */
var REG=null, SCENES=[], MATS=[], READY=false;
var S={space:'living',part:'wall',matWall:'denbar',styleWall:'oak',matFloor:'floor',styleFloor:'oak',light:'',furn:''};
function scById(id){for(var i=0;i<SCENES.length;i++)if(SCENES[i].id===id)return SCENES[i];return SCENES[0];}
function matById(id){for(var i=0;i<MATS.length;i++)if(MATS[i].id===id)return MATS[i];return null;}
function matsOf(zone){return MATS.filter(function(m){return m.zone===zone;});}
function stylesOf(m){return (m&&m.styles&&m.styles.length)?m.styles:[];}
function styleById(m,sid){var a=stylesOf(m);for(var i=0;i<a.length;i++)if(a[i].id===sid)return a[i];return a[0]||null;}
function curScene(){return scById(S.space);}
function wallMat(){return matById(S.matWall);}
function wallStyle(){return styleById(wallMat(),S.styleWall);}
function floorMat(){return matById(S.matFloor);}
function floorStyle(){return styleById(floorMat(),S.styleFloor);}
function wallMult(){var st=wallStyle();return (st&&+st.mult>0)?+st.mult:1;}
function wallLabel(short){
  var m=wallMat(), st=wallStyle(), nm=m?m.nm:'벽';
  if(!st) return nm;
  return short?(nm+' · '+st.nm):(nm+' '+st.nm);
}

/* ---------------- 저장/복원 ---------------- */
function saveSel(){
  lsSet(SEL_KEY,JSON.stringify({v:2,space:S.space,part:S.part,matWall:S.matWall,styleWall:S.styleWall,
    matFloor:S.matFloor,styleFloor:S.styleFloor,light:S.light,furn:S.furn}));
}
function normSel(){
  if(!matById(S.matWall)) S.matWall=(matsOf('wall')[0]||{}).id||'denbar';
  if(!matById(S.matFloor)) S.matFloor=(matsOf('floor')[0]||{}).id||'floor';
  var lw=stylesOf(wallMat()), lf=stylesOf(floorMat());
  if(lw.length&&!lw.some(function(x){return x.id===S.styleWall;})) S.styleWall=lw[0].id;
  if(lf.length&&!lf.some(function(x){return x.id===S.styleFloor;})) S.styleFloor=lf[0].id;
  if(['','l','m','h'].indexOf(S.light)<0) S.light='';
  if(['','l','m','h'].indexOf(S.furn)<0) S.furn='';
  if(!scById(S.space)) S.space=(SCENES[0]||{}).id||'living';
  if(['wall','floor','light','furn'].indexOf(S.part)<0) S.part='wall';
  if(S.part==='furn'&&curScene().furnished) S.part='wall';
}
function loadSel(){
  try{
    var o=JSON.parse(ls(SEL_KEY)||'null'); if(!o) return;
    if(o.space&&scById(o.space)) S.space=o.space;
    ['part','matWall','styleWall','matFloor','styleFloor','light','furn'].forEach(function(k){if(o[k]!==undefined)S[k]=o[k];});
  }catch(e){}
}

/* ---------------- 이미지 로딩 ---------------- */
var imgCache={};
function loadImg(src,cb){
  if(!src){cb(null);return;}
  var c=imgCache[src];
  if(c&&c.img){cb(c.img);return;}
  if(c&&c.wait){c.wait.push(cb);return;}
  c=imgCache[src]={img:null,wait:[cb],bad:false};
  var p=new Image();
  p.onload=function(){c.img=p;var w=c.wait;c.wait=null;(w||[]).forEach(function(f){f(p);});};
  p.onerror=function(){c.bad=true;var w=c.wait;c.wait=null;(w||[]).forEach(function(f){f(null);});};
  p.src=src;
}

/* ---------------- 색 변형(톤·칠·무늬) ---------------- */
var styCache={};
function styleCanvas(img,st,flatColor){
  if(!st) return img;
  var key=(img&&img.src||'flat')+'|'+st.id+'|'+(st.bright||1)+'|'+(st.sat==null?1:st.sat)+'|'+(st.sepia||0)+'|'+(st.contrast||1)+'|'+(st.tint?st.tint.join(','):'-')+'|'+(flatColor||'');
  if(styCache[key]) return styCache[key];
  var c=document.createElement('canvas');
  c.width=img?((img.naturalWidth||img.width)||600):240; c.height=img?((img.naturalHeight||img.height)||600):240;
  var g=c.getContext('2d');
  if(flatColor){ g.fillStyle=flatColor; g.fillRect(0,0,c.width,c.height); }
  else g.drawImage(img,0,0);
  var br=+st.bright||1, sa=(st.sat==null?1:+st.sat), sp=+st.sepia||0, ct=+st.contrast||1;
  var tn=(st.tint&&st.tint.length===3)?st.tint.map(Number):null;
  if(br!==1||sa!==1||sp||ct!==1||(tn&&!flatColor)){
    try{
      var d=g.getImageData(0,0,c.width,c.height), p=d.data, i, r, gg, b, l, sr, sg, sb;
      for(i=0;i<p.length;i+=4){
        r=(p[i]-128)*ct+128; gg=(p[i+1]-128)*ct+128; b=(p[i+2]-128)*ct+128;
        l=0.299*r+0.587*gg+0.114*b;
        r=l+(r-l)*sa; gg=l+(gg-l)*sa; b=l+(b-l)*sa;
        if(sp){ sr=r*0.393+gg*0.769+b*0.189; sg=r*0.349+gg*0.686+b*0.168; sb=r*0.272+gg*0.534+b*0.131;
          r=r+(sr-r)*sp; gg=gg+(sg-gg)*sp; b=b+(sb-b)*sp; }
        r*=br; gg*=br; b*=br;
        if(tn){ r*=tn[0]; gg*=tn[1]; b*=tn[2]; }
        p[i]=r<0?0:r>255?255:r; p[i+1]=gg<0?0:gg>255?255:gg; p[i+2]=b<0?0:b>255?255:b;
      }
      g.putImageData(d,0,0);
    }catch(e){}
  }
  return (styCache[key]=c);
}

/* ---------------- 도형 도우미 ---------------- */
function polyPath(ctx,pts){ctx.beginPath();pts.forEach(function(p,i){if(i)ctx.lineTo(p[0],p[1]);else ctx.moveTo(p[0],p[1]);});ctx.closePath();}
function bbox(pts){var x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;pts.forEach(function(p){x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1]);});return {x0:x0,y0:y0,w:x1-x0,h:y1-y0};}
function lerp(a,b,t){return a+(b-a)*t;}
function rr(ctx,x,y,w,h,r){
  r=Math.min(r,Math.abs(w)/2,Math.abs(h)/2);
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}
function vgrad(ctx,x,y,w,h,c1,c2){
  var g=ctx.createLinearGradient(0,y,0,y+h); g.addColorStop(0,c1); g.addColorStop(1,c2);
  ctx.fillStyle=g; ctx.fillRect(x,y,w,h);
}
function softShadow(ctx,cx,cy,rx,ry,a){
  var g=ctx.createRadialGradient(cx,cy,0,cx,cy,Math.max(rx,ry));
  g.addColorStop(0,'rgba(14,12,10,'+(a*1.5)+')'); g.addColorStop(0.7,'rgba(14,12,10,'+(a*0.7)+')'); g.addColorStop(1,'rgba(14,12,10,0)');
  ctx.save(); ctx.translate(cx,cy); ctx.scale(1,ry/Math.max(rx,ry)); ctx.translate(-cx,-cy);
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,Math.max(rx,ry),0,Math.PI*2); ctx.fill(); ctx.restore();
}

/* ---------------- 벽 자재 채우기 ---------------- */
var TEX={};
function texOf(src){ return src?TEX[src]||null:null; }
function preload(list,cb){
  var n=0, total=list.length;
  if(!total){cb();return;}
  list.forEach(function(src){
    if(!src){n++;if(n>=total)cb();return;}
    loadImg(src,function(im){ if(im) TEX[src]=im; else TEX[src]=null; n++; if(n>=total) cb(); });
  });
}
/* 원본 휘도를 흐리게(작은 캔버스로 축소) 써서 슬랫 홈·조인트 자국이 새 자재에 남지 않게 한다 */
function softLum(src,pts,amount){
  var b=bbox(pts), x0=Math.max(0,Math.floor(b.x0)), y0=Math.max(0,Math.floor(b.y0));
  var x1=Math.min(src.width||1200,Math.ceil(b.x0+b.w)), y1=Math.min(src.height||800,Math.ceil(b.y0+b.h));
  var w=x1-x0, h=y1-y0; if(w<=0||h<=0) return null;
  var f=Math.max(2,Math.round(8*amount));
  var sw=Math.max(2,Math.round(w/f)), sh=Math.max(2,Math.round(h/f));
  var c=document.createElement('canvas'); c.width=sw; c.height=sh;
  var g=c.getContext('2d'); g.drawImage(src,x0,y0,w,h,0,0,sw,sh);
  var d; try{d=g.getImageData(0,0,sw,sh).data;}catch(e){return null;}
  var L=new Float32Array(sw*sh);
  for(var i=0,j=0;i<d.length;i+=4,j++) L[j]=(d[i]*0.299+d[i+1]*0.587+d[i+2]*0.114);
  var hist=new Uint32Array(256),n=0;
  for(var k=0;k<L.length;k++){hist[Math.min(255,Math.max(0,L[k]|0))]++;n++;}
  var acc=0,ref=255; for(var v=0;v<256;v++){acc+=hist[v];if(acc>=n*0.9){ref=Math.max(1,v);break;}}
  return {x0:x0,y0:y0,w:w,h:h,sw:sw,sh:sh,L:L,ref:ref,HP:boxHP(L,sw,sh,2),kx:sw/w,ky:sh/h};
}
function relightSoft(ctx,lum,pts,K){
  if(!lum||K<=0||!lum.HP) return;
  var cur=ctx.getImageData(lum.x0,lum.y0,lum.w,lum.h), C=cur.data;
  var scx=lum.sw/lum.w, scy=lum.sh/lum.h, HP=lum.HP;
  for(var y=0;y<lum.h;y++){
    var fy=y*scy-0.5; if(fy<0)fy=0; else if(fy>lum.sh-1)fy=lum.sh-1;
    var iy=fy|0, iy2=iy+1<lum.sh?iy+1:iy, ty=fy-iy;
    for(var x=0;x<lum.w;x++){
      var fx=x*scx-0.5; if(fx<0)fx=0; else if(fx>lum.sw-1)fx=lum.sw-1;
      var ix=fx|0, ix2=ix+1<lum.sw?ix+1:ix, tx=fx-ix;
      var hp=HP[iy*lum.sw+ix]*(1-tx)*(1-ty)+HP[iy*lum.sw+ix2]*tx*(1-ty)+HP[iy2*lum.sw+ix]*(1-tx)*ty+HP[iy2*lum.sw+ix2]*tx*ty;
      var f=1+K*(HPCLIP?hpClip(hp):hp)/110; if(f<0.5) f=0.5; else if(f>1.5) f=1.5;
      var i=(y*lum.w+x)*4;
      C[i]*=f; C[i+1]*=f; C[i+2]*=f;
      if(C[i]<0)C[i]=0; else if(C[i]>255)C[i]=255;
      if(C[i+1]<0)C[i+1]=0; else if(C[i+1]>255)C[i+1]=255;
      if(C[i+2]<0)C[i+2]=0; else if(C[i+2]>255)C[i+2]=255;
    }
  }
  ctx.putImageData(cur,lum.x0,lum.y0);
}
/* 작은 판의 결(HP)을 부드럽게 표본한다 — 8px 블록 자국 제거 */
function hpAt(lm,x,y){
  if(!lm||!lm.HP) return 0;
  var fx=x*lm.kx-0.5, fy=y*lm.ky-0.5;
  if(fx<0)fx=0; else if(fx>lm.sw-1)fx=lm.sw-1;
  if(fy<0)fy=0; else if(fy>lm.sh-1)fy=lm.sh-1;
  var ix=fx|0, iy=fy|0, ix2=ix+1<lm.sw?ix+1:ix, iy2=iy+1<lm.sh?iy+1:iy, tx=fx-ix, ty=fy-iy;
  var HP=lm.HP;
  var v=HP[iy*lm.sw+ix]*(1-tx)*(1-ty)+HP[iy*lm.sw+ix2]*tx*(1-ty)+HP[iy2*lm.sw+ix]*(1-tx)*ty+HP[iy2*lm.sw+ix2]*tx*ty;
  return HPCLIP?hpClip(v):v;
}
/* ================= 벽: 한 면을 통째로 원근 합성 =================
   벽면을 정면(직사각) 좌표계에 먼저 그린다 — 자재 + 벽에 붙는 조명(코브 띠·벽등·빛 콘).
   그 판을 벽 네 꼭짓점이 만드는 사다리꼴로 한 번에 투시 변환해 얹는다.
   → 벽지·덴바보드·대리석·간접조명·등기구가 같은 기울기와 원근을 따라간다. */
var GEOM={}, WLAYER={}, LUMS={}, BLURS={};
function d2(a,b){var dx=b[0]-a[0],dy=b[1]-a[1];return Math.sqrt(dx*dx+dy*dy);}
function sqH(q){
  var x0=q[0][0],y0=q[0][1],x1=q[1][0],y1=q[1][1],x2=q[2][0],y2=q[2][1],x3=q[3][0],y3=q[3][1];
  var sx=x0-x1+x2-x3, sy=y0-y1+y2-y3, a,b,c,d,e,f,g,h;
  if(Math.abs(sx)<1e-6&&Math.abs(sy)<1e-6){
    a=x1-x0; b=x3-x0; c=x0; d=y1-y0; e=y3-y0; f=y0; g=0; h=0;
  }else{
    var dx1=x1-x2, dx2=x3-x2, dy1=y1-y2, dy2=y3-y2, det=dx1*dy2-dx2*dy1;
    if(!det) det=1e-6;
    g=(sx*dy2-dx2*sy)/det; h=(dx1*sy-sx*dy1)/det;
    a=x1-x0+g*x1; b=x3-x0+h*x3; c=x0;
    d=y1-y0+g*y1; e=y3-y0+h*y3; f=y0;
  }
  return [a,b,c,d,e,f,g,h,1];
}
function inv3(M){
  var a=M[0],b=M[1],c=M[2],d=M[3],e=M[4],f=M[5],g=M[6],h=M[7],i=M[8];
  var c00=e*i-f*h, c01=-(d*i-f*g), c02=d*h-e*g;
  var c10=-(b*i-c*h), c11=a*i-c*g, c12=-(a*h-b*g);
  var c20=b*f-c*e, c21=-(a*f-c*d), c22=a*e-b*d;
  var det=a*c00+b*c01+c*c02; if(!det) return null;
  return [c00/det, c10/det, c20/det, c01/det, c11/det, c21/det, c02/det, c12/det, c22/det];
}
function mapH(M,x,y){
  var d=M[6]*x+M[7]*y+M[8]; if(!d) d=1e-6;
  return [(M[0]*x+M[1]*y+M[2])/d,(M[3]*x+M[4]*y+M[5])/d];
}
/* 벽면 기하 — 원근이면 4점 사다리꼴, 정면이면 외곽 사각형 */
function wallGeom(sc){
  var w=sc.wall, key=sc.id+'|'+JSON.stringify(w);
  if(GEOM[key]) return GEOM[key];
  var bb=bbox(w), quad;
  if(w.length===4&&(Math.abs(w[0][1]-w[1][1])>2||Math.abs(w[2][1]-w[3][1])>2||Math.abs(w[0][0]-w[3][0])>2)){
    quad=[w[0],w[1],w[2],w[3]];
  }else{
    quad=[[bb.x0,bb.y0],[bb.x0+bb.w,bb.y0],[bb.x0+bb.w,bb.y0+bb.h],[bb.x0,bb.y0+bb.h]];
  }
  var RW=Math.max(16,Math.round(Math.max(d2(quad[0],quad[1]),d2(quad[3],quad[2]))));
  var RH=Math.max(16,Math.round(Math.max(d2(quad[0],quad[3]),d2(quad[1],quad[2]))));
  var PADV=Math.round(Math.min(110,Math.max(22,RH*0.15)));
  var t=PADV/RH;
  var tl=[quad[0][0]+(quad[0][0]-quad[3][0])*t, quad[0][1]+(quad[0][1]-quad[3][1])*t];
  var tr=[quad[1][0]+(quad[1][0]-quad[2][0])*t, quad[1][1]+(quad[1][1]-quad[2][1])*t];
  var ext=[tl,tr,quad[2],quad[3]];
  var H0=sqH(quad), Hi0=inv3(H0), He=sqH(ext), Hie=inv3(He);
  var bbw=Math.round(bb.w), bbh=Math.round(bb.h);
  var g={quad:quad,ext:ext,RW:RW,RH:RH,PADV:PADV,H0:H0,Hi0:Hi0,He:He,Hie:Hie,bb:bbox(ext),
    flat:(Math.abs(quad[0][1]-quad[1][1])<0.5&&Math.abs(quad[3][0]-quad[0][0])<0.5&&RW===bbw&&RH===bbh),
    toRect:function(x,y){var uv=mapH(Hi0,x,y);return [uv[0]*RW, PADV+uv[1]*RH];}};
  GEOM[key]=g; return g;
}
/* 원본 사진의 밝기 결(창빛·그림자) — 8분의 1 축소본 */
/* 국소 대비(하이패스) — 큰 밝기 차(창빛·그림자)는 따라가지 않고 결만 남긴다.
   사진 위에 자재를 얹을 때 원래 벽의 그림자가 유령처럼 비치지 않게 하는 핵심. */
function boxHP(L,sw,sh,r){
  r=Math.max(1,r|0);
  var tmp=new Float32Array(sw*sh), HP=new Float32Array(sw*sh), x,y,i,sum,cnt;
  for(y=0;y<sh;y++){
    for(x=0;x<sw;x++){
      sum=0;cnt=0;
      for(i=-r;i<=r;i++){ var xx=x+i; if(xx<0||xx>=sw) continue; sum+=L[y*sw+xx]; cnt++; }
      tmp[y*sw+x]=sum/cnt;
    }
  }
  for(y=0;y<sh;y++){
    for(x=0;x<sw;x++){
      sum=0;cnt=0;
      for(i=-r;i<=r;i++){ var yy=y+i; if(yy<0||yy>=sh) continue; sum+=tmp[yy*sw+x]; cnt++; }
      HP[y*sw+x]=L[y*sw+x]-sum/cnt;
    }
  }
  /* 결을 살짝 흐려 물체 윤곽이 자재 위에 비치는 것을 줄인다 */
  var sm=new Float32Array(sw*sh);
  for(y=0;y<sh;y++){
    for(x=0;x<sw;x++){
      sum=0;cnt=0;
      for(var dy=-1;dy<=1;dy++){ var y2=y+dy; if(y2<0||y2>=sh) continue;
        for(var dx=-1;dx<=1;dx++){ var x2=x+dx; if(x2<0||x2>=sw) continue; sum+=HP[y2*sw+x2]; cnt++; } }
      sm[y*sw+x]=sum/cnt;
    }
  }
  return sm;
}
/* 큰 윤곽(물체 테두리)은 눌러 두고 부드러운 음영만 전한다 */
function hpClip(v){ var L=14; return v>L?L:(v<-L?-L:v); }
/* 내 사진일 때만 윤곽을 눌러 둔다(예시 사진은 원래 결을 그대로 쓴다) */
var HPCLIP=false;
function lumSmall(base){
  var key=base.src||('w'+base.width);
  if(LUMS[key]) return LUMS[key];
  var f=8, sw=Math.max(8,Math.round(base.width/f)), sh=Math.max(8,Math.round(base.height/f));
  var c=document.createElement('canvas'); c.width=sw; c.height=sh;
  var g=c.getContext('2d'); g.drawImage(base,0,0,sw,sh);
  var dat; try{ dat=g.getImageData(0,0,sw,sh).data; }catch(e){ return null; }
  var L=new Uint8Array(sw*sh), hist=new Uint32Array(256), n=0;
  for(var i=0,j=0;i<dat.length;i+=4,j++){
    var v=(dat[i]*0.299+dat[i+1]*0.587+dat[i+2]*0.114)|0;
    L[j]=v; hist[v]++; n++;
  }
  var acc=0, ref=255;
  for(var v2=0;v2<256;v2++){ acc+=hist[v2]; if(acc>=n*0.9){ ref=Math.max(1,v2); break; } }
  var o={sw:sw,sh:sh,L:L,ref:ref,kx:sw/base.width,ky:sh/base.height,HP:boxHP(L,sw,sh,3)};
  LUMS[key]=o; return o;
}
/* 벽 폴리곤으로 알파를 깎는다(가장자리 페더) */
function maskPolyRect(ctx,sc,G,blur){
  var RW=G.RW, SH=G.PADV+G.RH;
  var mk=document.createElement('canvas'); mk.width=RW; mk.height=SH;
  var mg=mk.getContext('2d'); mg.fillStyle='#fff'; mg.beginPath();
  sc.wall.forEach(function(p,i){ var q=G.toRect(p[0],p[1]); if(i) mg.lineTo(q[0],q[1]); else mg.moveTo(q[0],q[1]); });
  mg.closePath(); mg.fill();
  var m2=document.createElement('canvas'); m2.width=RW; m2.height=SH;
  var g2=m2.getContext('2d');
  try{ if(typeof g2.filter==='string') g2.filter='blur('+(blur||1.4)+'px)'; }catch(e){}
  g2.drawImage(mk,0,0);
  ctx.save(); ctx.globalCompositeOperation='destination-in'; ctx.drawImage(m2,0,0); ctx.restore();
}
/* 자재를 벽면 정면 좌표계에 그린다 */
function paintWallRect(ctx,sc,m,st,G){
  var RW=G.RW, RH=G.RH, T=G.PADV;
  var flat=m.flat?st.css:'', tex=null;
  if(!flat){
    var im=texOf((st&&st.img)?st.img:m.img);
    if(!im) return false;
    tex=styleCanvas(im,st,flat);
    if(!tex) return false;
  }
  ctx.save();
  ctx.beginPath(); ctx.rect(0,T,RW,RH); ctx.clip();
  if(flat){ ctx.fillStyle=flat; ctx.fillRect(0,T,RW,RH); }
  else if(m.fit==='cover'){
    var s2=Math.max(RW/tex.width,RH/tex.height), dw=tex.width*s2, dh=tex.height*s2;
    ctx.drawImage(tex,(RW-dw)/2,T+(RH-dh)/2,dw,dh);
  }else{
    var ps=+m.pScale||1, pat=ctx.createPattern(tex,'repeat');
    if(pat){
      ctx.save(); ctx.translate(0,T); if(ps!==1) ctx.scale(ps,ps);
      ctx.fillStyle=pat; ctx.fillRect(0,0,RW/ps+2,RH/ps+2); ctx.restore();
    }
    if(m.joint){
      ctx.strokeStyle='rgba(128,124,118,'+m.joint+')'; ctx.lineWidth=1.6;
      for(var j=1;j<3;j++){ ctx.beginPath(); ctx.moveTo(RW*j/3,T); ctx.lineTo(RW*j/3,T+RH); ctx.stroke(); }
    }
  }
  if(m.gloss){
    var gg=ctx.createLinearGradient(0,T,RW*0.6,T+RH);
    gg.addColorStop(0,'rgba(255,255,255,'+(m.gloss*1.5)+')');
    gg.addColorStop(0.45,'rgba(255,255,255,'+(m.gloss*0.5)+')');
    gg.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=gg; ctx.fillRect(0,T,RW,RH);
  }
  ctx.restore();
  maskPolyRect(ctx,sc,G,1.4);
  return true;
}
/* 벽에 붙는 조명 — 자재와 같은 정면 좌표계에서 그려 함께 투시된다 */
function drawWallLights(ctx,sc,sel,G){
  if(!sel) return;
  var W=G.RW, H=G.RH, T=G.PADV, L=sc.light||{};
  var sp=(L.sconce||[]).map(function(p){ return G.toRect(p[0],p[1]); });
  ctx.save();
  if(sel==='l'){
    var d1=Math.min(260,H*0.62);
    var gd=ctx.createLinearGradient(0,T-8,0,T+d1);
    gd.addColorStop(0,'rgba(255,236,198,0)');
    gd.addColorStop(0.12,'rgba(255,238,205,.42)');
    gd.addColorStop(0.55,'rgba(255,238,205,.12)');
    gd.addColorStop(1,'rgba(255,238,205,0)');
    ctx.fillStyle=gd; ctx.fillRect(0,T-8,W,d1+8);
    var gu=ctx.createLinearGradient(0,T+6,0,T-70);
    gu.addColorStop(0,'rgba(255,240,210,.34)');
    gu.addColorStop(1,'rgba(255,240,210,0)');
    ctx.fillStyle=gu; ctx.fillRect(0,Math.max(0,T-70),W,78);
    ctx.fillStyle='#E9E7E2'; ctx.fillRect(6,Math.max(0,T-9),W-12,7);
    ctx.fillStyle='rgba(255,250,238,.98)'; ctx.fillRect(8,Math.max(0,T-4),W-16,3);
    ctx.fillStyle='rgba(120,112,100,.35)'; ctx.fillRect(6,Math.max(0,T-10),W-12,1.5);
    ctx.strokeStyle='rgba(255,248,232,.95)'; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.moveTo(6,T-3); ctx.lineTo(W-6,T-3); ctx.stroke();
    sp.forEach(function(p){ lampGlow(ctx,p[0],T+20,Math.max(110,H*0.33),.22,1); });
  }else if(sel==='m'){
    var gm=ctx.createLinearGradient(0,T-4,0,T+H*0.95);
    gm.addColorStop(0,'rgba(255,240,212,.55)');
    gm.addColorStop(0.35,'rgba(255,238,206,.26)');
    gm.addColorStop(1,'rgba(255,236,200,0)');
    ctx.fillStyle=gm; ctx.fillRect(0,T-4,W,H*0.95+4);
    var gc=ctx.createLinearGradient(0,T-90,0,T+10);
    gc.addColorStop(0,'rgba(255,244,220,0)');
    gc.addColorStop(0.7,'rgba(255,244,220,.5)');
    gc.addColorStop(1,'rgba(255,248,232,.75)');
    ctx.fillStyle=gc; ctx.fillRect(0,Math.max(0,T-90),W,Math.min(100,T+10-Math.max(0,T-90)));
    var yb=Math.max(0,T-16);
    ctx.fillStyle='#F0EDE6'; ctx.fillRect(2,yb,W-4,12);
    ctx.fillStyle='rgba(255,252,242,.99)'; ctx.fillRect(4,Math.max(0,T-6),W-8,4);
    ctx.fillStyle='rgba(90,84,74,.30)'; ctx.fillRect(2,yb,W-4,1.5);
    ctx.strokeStyle='rgba(255,250,236,.95)'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(3,T-2); ctx.lineTo(W-3,T-2); ctx.stroke();
    lampGlow(ctx,W*0.30,T-30,Math.max(150,W*0.33),.20,1);
    lampGlow(ctx,W*0.72,T-30,Math.max(150,W*0.33),.20,1);
  }else{
    var pts=sp.length?sp:[[W*0.28,T+H*0.16],[W*0.72,T+H*0.16]];
    var cw=Math.max(20,W*0.032), ch=cw*1.5;
    pts.forEach(function(p){
      var x=p[0], y=p[1];
      var up=ctx.createLinearGradient(0,y-ch,0,y-ch*4.6);
      up.addColorStop(0,'rgba(255,236,196,.42)'); up.addColorStop(1,'rgba(255,236,196,0)');
      ctx.fillStyle=up; ctx.beginPath();
      ctx.moveTo(x-cw*0.5,y-ch*0.5); ctx.lineTo(x+cw*0.5,y-ch*0.5);
      ctx.lineTo(x+cw*1.5,y-ch*4.6); ctx.lineTo(x-cw*1.5,y-ch*4.6); ctx.closePath(); ctx.fill();
      var dn=ctx.createLinearGradient(0,y+ch*0.5,0,y+ch*4.8);
      dn.addColorStop(0,'rgba(255,236,196,.38)'); dn.addColorStop(1,'rgba(255,236,196,0)');
      ctx.fillStyle=dn; ctx.beginPath();
      ctx.moveTo(x-cw*0.5,y+ch*0.5); ctx.lineTo(x+cw*0.5,y+ch*0.5);
      ctx.lineTo(x+cw*1.4,y+ch*4.8); ctx.lineTo(x-cw*1.4,y+ch*4.8); ctx.closePath(); ctx.fill();
      lampGlow(ctx,x,y-ch*1.6,cw*3.2,.20,1); lampGlow(ctx,x,y+ch*1.8,cw*3.4,.18,1);
      ctx.fillStyle='#232427'; rr(ctx,x-cw/2,y-ch/2,cw,ch,3); ctx.fill();
      ctx.fillStyle='#3A3B3E'; rr(ctx,x-cw/2+2,y-ch/2+2,cw-4,ch-4,2); ctx.fill();
    });
  }
  ctx.restore();
}
/* 정면 좌표계 판을 사다리꼴로 투시 변환해 화면에 얹는다(원본 밝기 결 반영) */
function warpWall(ctx,layer,G,base,K){
  var bb=G.bb, W=ctx.canvas.width, H=ctx.canvas.height;
  var x0=Math.max(0,Math.floor(bb.x0)), y0=Math.max(0,Math.floor(bb.y0));
  var x1=Math.min(W,Math.ceil(bb.x0+bb.w)), y1=Math.min(H,Math.ceil(bb.y0+bb.h));
  var w=x1-x0, h=y1-y0; if(w<=0||h<=0) return;
  var lm0=lumSmall(base);
  /* 정면 벽(사각형)은 그대로 얹고 밝기 결만 입힌다 — 큰 사진에서도 메모리를 아낀다 */
  if(G.flat){
    var dx0=Math.floor(bb.x0), dy0=Math.floor(bb.y0), topY=dy0+G.PADV;
    ctx.drawImage(layer,dx0,dy0);
    var rx=Math.max(0,dx0), ry=Math.max(0,topY);
    var rw2=Math.min(W-rx,G.RW-(rx-dx0)), rh2=Math.min(H-ry,G.RH-(ry-topY));
    if(lm0&&rw2>2&&rh2>2){
      try{
        var dd=ctx.getImageData(rx,ry,rw2,rh2), pp=dd.data;
        var kk0=(K==null?0.45:K);
        for(var yy0=0; yy0<rh2; yy0++){
          for(var xx0=0; xx0<rw2; xx0++){
            var i0=(yy0*rw2+xx0)*4; if(pp[i0+3]<2) continue;
            var f0=1+kk0*hpAt(lm0,rx+xx0,ry+yy0)/110; if(f0<0.3) f0=0.3; else if(f0>1.8) f0=1.8;
            pp[i0]*=f0; pp[i0+1]*=f0; pp[i0+2]*=f0;
          }
        }
        ctx.putImageData(dd,rx,ry);
      }catch(e){}
    }
    return;
  }
  var out=document.createElement('canvas'); out.width=w; out.height=h;
  var og=out.getContext('2d');
  var img; try{ img=og.createImageData(w,h); }catch(e){ return; }
  var SW=layer.width, SH=layer.height;
  /* 축소되는(먼 쪽) 구간은 반씩 줄인 판에서 표본해 계단·무아레를 막는다 */
  var lv=[{cv:layer,sw:SW,sh:SH}];
  [2,4].forEach(function(f){
    var cw=Math.max(2,Math.round(SW/f)), ch=Math.max(2,Math.round(SH/f));
    var c=document.createElement('canvas'); c.width=cw; c.height=ch;
    c.getContext('2d').drawImage(layer,0,0,cw,ch);
    lv.push({cv:c,sw:cw,sh:ch});
  });
  var ld=[]; lv.forEach(function(L){ ld.push(L.cv.getContext('2d').getImageData(0,0,L.sw,L.sh).data); });
  var od=img.data, Hi=G.Hie;
  var lm=lumSmall(base);
  var kk=(K==null?0.45:K);
  function uvAt(dx,dy){
    var den=Hi[6]*dx+Hi[7]*dy+Hi[8]; if(!den) den=1e-6;
    return [(Hi[0]*dx+Hi[1]*dy+Hi[2])/den,(Hi[3]*dx+Hi[4]*dy+Hi[5])/den];
  }
  for(var yy=0; yy<h; yy++){
    var dy=y0+yy+0.5, row=yy*w*4;
    /* 이 줄에서 자재가 얼마나 줄어드는지 보고 축소 단계(밉맵)를 고른다 */
    var uA=uvAt(x0+0.5,dy), uB=uvAt(x0+1.5,dy), vB=uvAt(x0+0.5,dy+1);
    var step=Math.max(Math.abs(uB[0]-uA[0])*SW, Math.abs(vB[1]-uA[1])*SH, Math.abs(uB[1]-uA[1])*SH);
    var li=step>=2.6?2:(step>=1.35?1:0);
    var lv0=lv[li], sp=ld[li], SWL=lv0.sw, SHL=lv0.sh;
    for(var xx=0; xx<w; xx++){
      var dx=x0+xx+0.5, ii=row+xx*4;
      var uv=uvAt(dx,dy), u=uv[0], v=uv[1];
      if(u<0||u>1||v<0||v>1) continue;
      var fx=u*SWL-0.5, fy=v*SHL-0.5;
      if(fx<0) fx=0; else if(fx>SWL-1) fx=SWL-1;
      if(fy<0) fy=0; else if(fy>SHL-1) fy=SHL-1;
      var ix=fx|0, iy=fy|0, ix2=ix+1<SWL?ix+1:ix, iy2=iy+1<SHL?iy+1:iy;
      var tx=fx-ix, ty=fy-iy, w00=(1-tx)*(1-ty), w10=tx*(1-ty), w01=(1-tx)*ty, w11=tx*ty;
      var p00=(iy*SWL+ix)*4, p10=(iy*SWL+ix2)*4, p01=(iy2*SWL+ix)*4, p11=(iy2*SWL+ix2)*4;
      var al=sp[p00+3]*w00+sp[p10+3]*w10+sp[p01+3]*w01+sp[p11+3]*w11;
      if(al<2) continue;
      var r=sp[p00]*w00+sp[p10]*w10+sp[p01]*w01+sp[p11]*w11;
      var gg=sp[p00+1]*w00+sp[p10+1]*w10+sp[p01+1]*w01+sp[p11+1]*w11;
      var bl=sp[p00+2]*w00+sp[p10+2]*w10+sp[p01+2]*w01+sp[p11+2]*w11;
      if(lm){
        var ff=1+kk*hpAt(lm,dx,dy)/110;
        if(ff<0.3) ff=0.3; else if(ff>1.8) ff=1.8;
        r*=ff; gg*=ff; bl*=ff;
      }
      od[ii]=r<0?0:r>255?255:r;
      od[ii+1]=gg<0?0:gg>255?255:gg;
      od[ii+2]=bl<0?0:bl>255?255:bl;
      od[ii+3]=al;
    }
  }
  og.putImageData(img,0,0);
  ctx.drawImage(out,x0,y0);
}
/* 벽 한 면 = 자재 + 조명을 정면 좌표계에 그린 뒤 투시 변환한 결과(캐시) */
function wallLayer(sc,base,m,st){
  if(!m) return null;
  var key=[sc.id,base.src||('p'+sc.w),m.id,st?st.id:'',S.light||'-',JSON.stringify(sc.wall),sc.w,sc.h].join('|');
  if(WLAYER[key]) return WLAYER[key];
  var G=wallGeom(sc);
  var lay=document.createElement('canvas'); lay.width=G.RW; lay.height=G.PADV+G.RH;
  var lc=lay.getContext('2d');
  if(!paintWallRect(lc,sc,m,st,G)) return null;
  drawWallLights(lc,sc,S.light,G);
  var full=document.createElement('canvas'); full.width=sc.w; full.height=sc.h;
  var K0=(m.relight==null?0.85:m.relight);
  HPCLIP=(sc.id==='photo');
  if(sc.id==='photo') K0=Math.min(K0,0.5);   /* 내 사진은 원본 음영을 약하게만 전한다 */
  warpWall(full.getContext('2d'),lay,G,base,K0);
  HPCLIP=false;
  var ks=Object.keys(WLAYER); if(ks.length>1) delete WLAYER[ks[0]];
  WLAYER[key]=full; return full;
}
/* 앞쪽 물체 한 덩이를 원본에서 되살린다(경계 페더) */
function restorePoly(ctx,base,poly,W,H,blur){
  var b=bbox(poly);
  var x0=Math.max(0,Math.floor(b.x0)), y0=Math.max(0,Math.floor(b.y0));
  var x1=Math.min(W,Math.ceil(b.x0+b.w)), y1=Math.min(H,Math.ceil(b.y0+b.h));
  var w=x1-x0, h=y1-y0; if(w<=0||h<=0) return;
  var t=document.createElement('canvas'); t.width=w; t.height=h;
  var g=t.getContext('2d'); g.drawImage(base,x0,y0,w,h,0,0,w,h);
  var mk=document.createElement('canvas'); mk.width=w; mk.height=h;
  var mg=mk.getContext('2d'); mg.fillStyle='#fff'; mg.beginPath();
  poly.forEach(function(p,i){ if(i) mg.lineTo(p[0]-x0,p[1]-y0); else mg.moveTo(p[0]-x0,p[1]-y0); });
  mg.closePath(); mg.fill();
  var m2=document.createElement('canvas'); m2.width=w; m2.height=h;
  var g2=m2.getContext('2d');
  try{ if(typeof g2.filter==='string') g2.filter='blur('+(blur||1.6)+'px)'; }catch(e){}
  g2.drawImage(mk,0,0);
  g.save(); g.globalCompositeOperation='destination-in'; g.drawImage(m2,0,0); g.restore();
  ctx.drawImage(t,x0,y0);
}
/* 원본을 흐린 판과 비교해 '튀어나온 물체'만 되살린다 — 뮤럴·칠을 덮어도 펜던트 줄·선반·스탠드가 남는다 */
function blurOf(base){
  var key=base.src||('w'+base.width);
  if(BLURS[key]) return BLURS[key];
  var c=document.createElement('canvas'); c.width=base.width; c.height=base.height;
  var g=c.getContext('2d');
  try{ if(typeof g.filter==='string') g.filter='blur(7px)'; }catch(e){}
  g.drawImage(base,0,0);
  var ks=Object.keys(BLURS);
  if(ks.length>2) delete BLURS[ks[0]];
  BLURS[key]=c; return c;
}
function restoreDetail(ctx,base,k,W,H){
  var x0=Math.max(0,Math.floor(k[0])), y0=Math.max(0,Math.floor(k[1]));
  var w=Math.min(W-x0,Math.round(k[2])), h=Math.min(H-y0,Math.round(k[3]));
  if(w<=0||h<=0) return;
  var t0=(k[4]==null?14:k[4]), t1=(k[5]==null?34:k[5]);
  var bl=blurOf(base);
  var bimg;
  try{ bimg=bl.getContext('2d').getImageData(x0,y0,w,h); }catch(e){ return; }
  var c=document.createElement('canvas'); c.width=w; c.height=h;
  var cg=c.getContext('2d'); cg.drawImage(base,x0,y0,w,h,0,0,w,h);
  var simg;
  try{ simg=cg.getImageData(0,0,w,h); }catch(e){ return; }
  var bd=bimg.data, d=simg.data;
  for(var i=0;i<d.length;i+=4){
    var dr=d[i]-bd[i], dg=d[i+1]-bd[i+1], db=d[i+2]-bd[i+2];
    if(dr<0) dr=-dr; if(dg<0) dg=-dg; if(db<0) db=-db;
    var m=dr>dg?(dr>db?dr:db):(dg>db?dg:db);
    d[i+3]=m<=t0?0:(m>=t1?255:Math.round((m-t0)/(t1-t0)*255));
  }
  cg.putImageData(simg,0,0);
  ctx.drawImage(c,x0,y0);
}
/* 바닥 원근 채우기 */
function fillFloorPersp(ctx,tex,b,pts,vp){
  var TW=tex.width||1, TH=tex.height||1, dmax=Math.max(40,(pts.bottom||900)-vp[1]), A=dmax*dmax/0.62;
  for(var y=Math.floor(b.y0); y<b.y0+b.h; y++){
    var d=y+0.5-vp[1]; if(d<=1) continue;
    var sx=d/dmax, v=Math.floor(((A/d)%TH+TH)%TH), tw=TW*sx, xs=vp[0]-TW/2*sx;
    for(var k=Math.floor(-xs/tw)-1;k<=Math.ceil((1200-xs)/tw)+1;k++) ctx.drawImage(tex,0,v,TW,1,xs+k*tw,y,tw+0.6,1);
  }
}
/* 바닥 자재 */
function paintFloor(ctx,src,sc,m,st,lum){
  if(!m||!sc.floor) return;
  var useImg=texOf((st&&st.img)?st.img:m.img);
  if(!useImg) return;
  var tex=styleCanvas(useImg,st,''); if(!tex) return;
  var pts=sc.floor, b=bbox(pts);
  ctx.save(); polyPath(ctx,pts); ctx.clip();
  if(m.grout){
    var p=ctx.createPattern(tex,'repeat');
    if(p){ctx.fillStyle=p;ctx.fillRect(b.x0,b.y0,b.w,b.h);}
    ctx.fillStyle='rgba(150,152,156,.85)';
    for(var x=b.x0;x<=b.x0+b.w;x+=m.grout) ctx.fillRect(x-1,b.y0,2,b.h);
    for(var y=b.y0;y<=b.y0+b.h;y+=m.grout) ctx.fillRect(b.x0,y-1,b.w,2);
  }else{
    var vp=sc.vp||[(sc.w||1200)*0.55,(sc.h||800)*0.55];
    fillFloorPersp(ctx,tex,b,{bottom:(sc.h||800)},vp);
  }
  ctx.restore();
  var K1=(m.relight==null?0.9:m.relight);
  HPCLIP=(sc.id==='photo');
  if(sc.id==='photo') K1=Math.min(K1,0.45);
  relightSoft(ctx,lum,pts,K1);
  HPCLIP=false;
}

/* ---------------- 걸레받이·몰딩 ---------------- */
function bandBase(ctx,sc,pts){
  var b=bbox(pts);
  ctx.save(); polyPath(ctx,pts); ctx.clip();
  var g=ctx.createLinearGradient(0,b.y0,0,b.y0+b.h);
  g.addColorStop(0,'#FBFAF7'); g.addColorStop(0.55,'#ECE8E1'); g.addColorStop(1,'#D9D3C9');
  ctx.fillStyle=g; ctx.fillRect(b.x0,b.y0,b.w,b.h);
  ctx.fillStyle='rgba(255,255,255,.95)'; ctx.fillRect(b.x0,b.y0,b.w,2);
  ctx.fillStyle='rgba(60,50,40,.3)'; ctx.fillRect(b.x0,b.y0+b.h-2,b.w,2);
  ctx.restore();
}

/* ---------------- 조명 3형태 (192) ---------------- */
function lampGlow(ctx,x,y,r,alpha,warm){
  var g=ctx.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,(warm?'rgba(255,238,208,':'rgba(240,244,255,')+alpha+')');
  g.addColorStop(0.45,(warm?'rgba(255,232,196,':'rgba(238,242,252,')+(alpha*0.42)+')');
  g.addColorStop(1,'rgba(255,236,200,0)');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
}
/* ---------------- 가구 (196·197) ---------------- */
var FC={fabric:['#E4DACA','#CBBFA9'],fabric2:['#D8CFC0','#BEB4A2'],wood:['#CBAA84','#A9865F'],
        wood2:['#8E6B49','#6A4E33'],dark:['#43464A','#2A2C2F'],black:['#2A2B2E','#191A1C'],
        white:['#F6F4EF','#E2DED5'],stone:['#3E3F42','#2B2C2E']};
function edge(ctx){ctx.strokeStyle='rgba(0,0,0,.12)';ctx.lineWidth=1.2;ctx.stroke();}
function sofa(ctx,x,y,w,h,pal){
  var seatH=h*0.40, backH=h*0.60, armW=Math.min(w*0.11,42);
  softShadow(ctx,x+w/2,y+4,w*0.60,h*0.11,.30);
  /* 팔걸이(뒤) */
  ctx.fillStyle=pal[1]; rr(ctx,x,y-backH-armW*0.2,armW,backH*0.92,10); ctx.fill(); edge(ctx);
  rr(ctx,x+w-armW,y-backH-armW*0.2,armW,backH*0.92,10); ctx.fill(); edge(ctx);
  /* 등판 */
  vgrad(ctx,x+armW*0.7,y-backH,w-armW*1.4,backH*0.9,pal[0],pal[1]);
  rr(ctx,x+armW*0.7,y-backH,w-armW*1.4,backH*0.9,9); ctx.fill(); edge(ctx);
  ctx.strokeStyle='rgba(0,0,0,.07)';
  var n=Math.max(2,Math.round(w/170));
  for(var i=1;i<n;i++){ctx.beginPath();ctx.moveTo(x+armW*0.7+(w-armW*1.4)*i/n,y-backH+8);ctx.lineTo(x+armW*0.7+(w-armW*1.4)*i/n,y-seatH*0.55);ctx.stroke();}
  /* 좌방석 */
  vgrad(ctx,x+armW*0.5,y-seatH,w-armW,seatH*0.92,pal[0],pal[1]);
  rr(ctx,x+armW*0.5,y-seatH,w-armW,seatH*0.92,7); ctx.fill(); edge(ctx);
  ctx.fillStyle='rgba(255,255,255,.22)'; ctx.fillRect(x+armW*0.6,y-seatH+3,w-armW*1.2,2);
  /* 다리 */
  ctx.fillStyle=FC.dark[1];
  ctx.fillRect(x+armW*0.5,y-7,7,7); ctx.fillRect(x+w-armW*0.5-7,y-7,7,7);
}
function chair(ctx,x,y,w,h,pal,back){
  var seatH=h*0.50, lw=Math.max(4,w*0.07);
  softShadow(ctx,x+w/2,y+3,w*0.55,h*0.07,.26);
  ctx.fillStyle=FC.wood2[1];
  ctx.fillRect(x+w*0.16,y-seatH,lw,seatH);
  ctx.fillRect(x+w*0.84-lw,y-seatH,lw,seatH);
  ctx.fillStyle=pal[1]; rr(ctx,x+w*0.06,y-seatH,w*0.88,seatH*0.20,4); ctx.fill(); edge(ctx);
  if(back!==false){
    vgrad(ctx,x+w*0.10,y-h,w*0.80,h-seatH*0.72,pal[0],pal[1]);
    rr(ctx,x+w*0.10,y-h,w*0.80,h-seatH*0.72,6); ctx.fill(); edge(ctx);
    ctx.fillStyle='rgba(255,255,255,.16)'; ctx.fillRect(x+w*0.14,y-h+3,w*0.72,2);
  }
}
function stool(ctx,x,y,w,h,pal){
  softShadow(ctx,x+w/2,y+3,w*0.5,h*0.06,.22);
  ctx.strokeStyle=FC.wood2[1]; ctx.lineWidth=Math.max(3,w*0.055);
  ctx.beginPath(); ctx.moveTo(x+w*0.2,y-h*0.26); ctx.lineTo(x+w*0.14,y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x+w*0.8,y-h*0.26); ctx.lineTo(x+w*0.86,y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x+w*0.14,y); ctx.lineTo(x+w*0.86,y); ctx.stroke();
  ctx.fillStyle=pal[0]; rr(ctx,x+w*0.04,y-h,w*0.92,h*0.24,7); ctx.fill(); edge(ctx);
}
function table(ctx,x,y,w,h,pal){
  var top=h*0.14, lw=Math.max(6,w*0.05);
  softShadow(ctx,x+w/2,y+4,w*0.56,h*0.08,.26);
  ctx.fillStyle=FC.wood[1];
  ctx.fillRect(x+w*0.07,y-top,lw,top); ctx.fillRect(x+w*0.93-lw,y-top,lw,top);
  ctx.fillStyle='rgba(0,0,0,.10)'; ctx.fillRect(x+w*0.07,y-top*0.35,lw,top*0.35);
  ctx.fillRect(x+w*0.93-lw,y-top*0.35,lw,top*0.35);
  vgrad(ctx,x,y-h-top,w,top,pal[0],pal[1]); ctx.fillRect(x,y-h-top,w,top);
  ctx.fillStyle='rgba(255,255,255,.30)'; ctx.fillRect(x,y-h-top,w,1.6);
  ctx.fillStyle='rgba(0,0,0,.10)'; ctx.fillRect(x,y-h-top+top-1.6,w,1.6);
}
function bench(ctx,x,y,w,h,pal){
  softShadow(ctx,x+w/2,y+5,w*0.58,h*0.11,.28);
  vgrad(ctx,x,y-h*0.92,w,h*0.92,pal[0],pal[1]); rr(ctx,x,y-h*0.92,w,h*0.92,8); ctx.fill(); edge(ctx);
  ctx.strokeStyle='rgba(0,0,0,.07)';
  var n=Math.max(3,Math.round(w/120));
  for(var i=1;i<n;i++){ctx.beginPath();ctx.moveTo(x+w*i/n,y-h*0.9+3);ctx.lineTo(x+w*i/n,y-4);ctx.stroke();}
  ctx.fillStyle=FC.wood2[1]; ctx.fillRect(x+6,y-h*0.09,w-12,h*0.09);
}
function counter(ctx,x,y,w,h){
  softShadow(ctx,x+w/2,y+6,w*0.6,h*0.09,.3);
  vgrad(ctx,x,y-h*0.84,w,h*0.80,FC.wood[0],FC.wood[1]); ctx.fillRect(x,y-h*0.84,w,h*0.80);
  ctx.strokeStyle='rgba(0,0,0,.10)';
  for(var i=1;i<Math.max(2,Math.round(w/130));i++){ctx.beginPath();ctx.moveTo(x+w*i/Math.max(2,Math.round(w/130)),y-h*0.82);ctx.lineTo(x+w*i/Math.max(2,Math.round(w/130)),y-4);ctx.stroke();}
  ctx.fillStyle='rgba(0,0,0,.22)'; ctx.fillRect(x,y-5,w,5);
  vgrad(ctx,x-5,y-h,w+10,h*0.17,FC.stone[0],FC.stone[1]); ctx.fillRect(x-5,y-h,w+10,h*0.17);
  ctx.fillStyle='rgba(255,255,255,.18)'; ctx.fillRect(x-5,y-h,w+10,2.2);
}
function bed(ctx,x,y,w,h,pal){
  var matH=h*0.30;
  softShadow(ctx,x+w/2,y+5,w*0.58,h*0.1,.3);
  ctx.fillStyle=FC.wood[1]; ctx.fillRect(x,y-h*0.30,w,h*0.30);
  ctx.fillStyle='rgba(0,0,0,.14)'; ctx.fillRect(x,y-4,w,4);
  vgrad(ctx,x+4,y-h*0.30-matH,w-8,matH,pal[0],pal[1]); rr(ctx,x+4,y-h*0.30-matH,w-8,matH,9); ctx.fill(); edge(ctx);
  ctx.fillStyle='rgba(255,255,255,.55)'; ctx.fillRect(x+12,y-h*0.30-matH+5,w*0.28,h*0.06);
  ctx.fillStyle='rgba(255,255,255,.42)'; ctx.fillRect(x+w*0.56,y-h*0.30-matH+5,w*0.28,h*0.06);
  vgrad(ctx,x,y-h*0.30-matH-h*0.24,w,h*0.24,FC.wood[0],FC.wood[1]); ctx.fillRect(x,y-h*0.30-matH-h*0.24,w,h*0.24);
  ctx.fillStyle='rgba(0,0,0,.10)'; ctx.fillRect(x,y-h*0.30-matH-2,w,2);
}
function rug(ctx,x,y,w,h,pal){
  ctx.save(); ctx.globalAlpha=.92;
  ctx.fillStyle=pal[0]; rr(ctx,x,y-h,w,h,7); ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.55)'; ctx.lineWidth=1.6; rr(ctx,x+6,y-h+6,w-12,h-12,5); ctx.stroke();
  ctx.restore();
}
/* 공간·단계별 배치 — 큰 가구는 벽에 붙이고, 작은 가구는 가운데로 */
function drawFurn(ctx,sc,lvl){
  if(!lvl||sc.furnished||!sc.furn) return;   /* 사진에 이미 가구가 있는 공간은 그대로 둔다 */
  var F=sc.furn, W=sc.w||1200, H=sc.h||800;
  var c=F.center||[W*0.3,700,W*0.7,880], wl=F.wall||[W*0.3,600,W*0.8,860];
  var gY=Math.min(H-6,(F.anchorY||c[3]));    /* 바닥에 닿는 선 — 화면 밖으로 잘리지 않게 */
  c=[c[0],c[1],c[2],Math.min(c[3],gY)]; wl=[wl[0],wl[1],wl[2],Math.min(wl[3],gY)];
  var cw=c[2]-c[0], ch=gY-c[1], ww=wl[2]-wl[0];
  /* 가구 전체를 받치는 바닥 그림자 */
  softShadow(ctx,(c[0]+c[2])/2,c[3]-ch*0.06,cw*0.62,ch*0.12,.22);
  var id=sc.id;
  if(id==='living'){
    if(lvl==='l'){
      table(ctx,c[0]+cw*0.22,c[3]-10,cw*0.26,ch*0.40,FC.wood);
      chair(ctx,c[0]+cw*0.56,c[3]-6,cw*0.15,ch*0.62,FC.fabric2);
    }else if(lvl==='m'){
      chair(ctx,c[0]+cw*0.06,c[3]-4,cw*0.15,ch*0.64,FC.fabric2);
      table(ctx,c[0]+cw*0.28,c[3]-8,cw*0.24,ch*0.36,FC.wood);
      chair(ctx,c[0]+cw*0.60,c[3]-4,cw*0.15,ch*0.64,FC.fabric2);
    }else{
      bench(ctx,wl[0]+ww*0.04,wl[3]-6,ww*0.56,ch*0.34,FC.dark);
      table(ctx,wl[0]+ww*0.24,wl[3]+ch*0.30,ww*0.28,ch*0.26,FC.wood2);
      chair(ctx,wl[0]+ww*0.62,wl[3]+ch*0.24,ww*0.11,ch*0.52,FC.fabric2);
    }
  }else if(id==='room'){
    if(lvl==='l'){                        /* 작은 침대는 가운데 */
      bed(ctx,c[0]+cw*0.26,c[3]-8,cw*0.40,ch*0.62,FC.fabric);
    }else if(lvl==='m'){
      bed(ctx,wl[0]+ww*0.16,wl[3]-4,ww*0.56,ch*0.66,FC.fabric);
      table(ctx,wl[0]+ww*0.02,wl[3]+ch*0.02,ww*0.16,ch*0.24,FC.wood);
    }else{
      bed(ctx,wl[0]+ww*0.10,wl[3]-2,ww*0.60,ch*0.70,FC.fabric);
      chair(ctx,wl[0]+ww*0.76,wl[3]+ch*0.02,ww*0.11,ch*0.46,FC.fabric2);
      table(ctx,wl[0]+ww*0.70,wl[3]+ch*0.16,ww*0.16,ch*0.22,FC.wood);
    }
  }else if(id==='shop'){
    if(lvl==='l'){
      table(ctx,c[0]+cw*0.16,c[3]-8,cw*0.24,ch*0.26,FC.wood);
      table(ctx,c[0]+cw*0.50,c[3]-8,cw*0.24,ch*0.26,FC.wood);
    }else if(lvl==='m'){
      counter(ctx,wl[0]+ww*0.04,wl[3]-4,ww*0.44,ch*0.52);
      table(ctx,c[0]+cw*0.52,c[3]-6,cw*0.26,ch*0.26,FC.wood);
      chair(ctx,c[0]+cw*0.46,c[3]-2,cw*0.10,ch*0.46,FC.fabric2);
    }else{
      counter(ctx,wl[0]+ww*0.04,wl[3]-2,ww*0.48,ch*0.56);
      bed(ctx,wl[0]+ww*0.58,wl[3]+ch*0.02,ww*0.32,ch*0.40,FC.white);
      chair(ctx,c[0]+cw*0.12,c[3]-4,cw*0.10,ch*0.48,FC.fabric2);
      chair(ctx,c[0]+cw*0.34,c[3]-4,cw*0.10,ch*0.48,FC.fabric2);
    }
  }else if(id==='dining'){
    if(lvl==='l'){
      table(ctx,c[0]+cw*0.26,c[3]-10,cw*0.30,ch*0.32,FC.wood);
      chair(ctx,c[0]+cw*0.22,c[3]-4,cw*0.11,ch*0.54,FC.dark);
      chair(ctx,c[0]+cw*0.50,c[3]-4,cw*0.11,ch*0.54,FC.dark);
    }else if(lvl==='m'){
      [[0.10,0.34],[0.48,0.72]].forEach(function(p){
        table(ctx,c[0]+cw*p[0],c[3]-8,cw*(p[1]-p[0]),ch*0.30,FC.wood);
        chair(ctx,c[0]+cw*p[0]+cw*0.02,c[3]-2,cw*0.10,ch*0.52,FC.dark);
      });
    }else{
      bench(ctx,wl[0]+ww*0.04,wl[3]-2,ww*0.62,ch*0.28,FC.dark);
      table(ctx,wl[0]+ww*0.10,wl[3]+ch*0.14,ww*0.34,ch*0.26,FC.wood2);
    }
  }
}

/* ---------------- 장면 그리기 ---------------- */
var SCENE_CACHE={};
function paintScene(ctx,sc,base){
  var W=sc.w, H=sc.h;
  ctx.clearRect(0,0,W,H); ctx.drawImage(base,0,0,W,H);
  var lum=paintWallLum(sc,base);
  var m=wallMat(), st=wallStyle();
  /* 벽 — 자재 + 벽 조명을 한 판에 그려 사다리꼴로 투시 변환해 얹는다 */
  var wl=wallLayer(sc,base,m,st);
  if(wl){ ctx.drawImage(wl,0,0); }
  else if(m){ restorePoly(ctx,base,sc.wall,W,H,0); }
  /* 몰딩/걸레받이 */
  if(sc.mold) bandBase(ctx,sc,sc.mold);
  if(sc.base) bandBase(ctx,sc,sc.base);
  /* 바닥 */
  if(sc.floor&&floorMat()) paintFloor(ctx,base,sc,floorMat(),floorStyle(),lum.floor);
  /* 앞쪽 물체 되돌리기 — 새 자재에 가려지면 안 되는 것(경계는 부드럽게) */
  (sc.fg||[]).forEach(function(poly){ restorePoly(ctx,base,poly,W,H,1.0); });
  (sc.fgDet||[]).forEach(function(k){ restoreDetail(ctx,base,k,W,H); });
  (sc.keep||[]).forEach(function(q){ctx.drawImage(base,q[0],q[1],q[2],q[3],q[0],q[1],q[2],q[3]);});
  /* 가구 — 실사 가구가 이미 있는 공간에는 도형을 얹지 않는다 */
  drawFurn(ctx,sc,S.furn);
}
function paintWallLum(sc,base){
  var k=sc.id+'|'+base.src;
  if(SCENE_CACHE[k]) return SCENE_CACHE[k];
  var o={floor:null};
  if(sc.floor) o.floor=softLum(base,sc.floor,1.6);
  SCENE_CACHE[k]=o; return o;
}

/* ---------------- 전환(입혀지는 느낌) ---------------- */
var curKind='';
function reveal(kind){
  /* 무대가 둘(예시 사진 / 내 사진) — 지금 보이는 쪽에만 입힌다 */
  var _s=$('#stage');
  if(_s&&_s.hidden) _s=$('#stage2');
  var wrap=$('.afw',_s||document); if(!wrap) return;
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  if(reduce){ wrap.style.transition='none'; wrap.style.clipPath='inset(0 0 0 0)'; wrap.style.filter='brightness(1)'; return; }
  wrap.style.transition='none';
  if(kind==='light'){                     /* 빛이 먼저 켜지고 → 자재가 따라 밝아짐 */
    wrap.style.clipPath='inset(0 0 0 0)';
    wrap.style.filter='brightness(.92)';
    wrap.style.opacity='0';
    void wrap.offsetWidth;
    wrap.style.transition='opacity 300ms ease-out, filter 620ms cubic-bezier(.22,.61,.36,1)';
    wrap.style.opacity='1'; wrap.style.filter='brightness(1)';
  }else if(kind==='style'){               /* 색·무늬 — 왼쪽에서 차오름 */
    wrap.style.clipPath='inset(0 100% 0 0)';
    wrap.style.filter='brightness(.9)';
    wrap.style.opacity='1';
    void wrap.offsetWidth;
    wrap.style.transition='clip-path 420ms cubic-bezier(.22,.61,.36,1), filter 520ms ease-out';
    wrap.style.clipPath='inset(0 0 0 0)'; wrap.style.filter='brightness(1)';
  }else{                                  /* 자재 — 바닥에서 위로 입혀지고 밝아짐 */
    wrap.style.clipPath='inset(100% 0 0 0)';
    wrap.style.filter='brightness(.86)';
    wrap.style.opacity='1';
    void wrap.offsetWidth;
    wrap.style.transition='clip-path 560ms cubic-bezier(.22,.61,.36,1), filter 660ms ease-out';
    wrap.style.clipPath='inset(0 0 0 0)'; wrap.style.filter='brightness(1)';
  }
  curKind=kind;
}

/* ---------------- 그리기 실행(순서 지켜 한 번에) ---------------- */
var drawSeq=0, sampleOk=false, CUR=null;
function redraw(kind){
  var sc=curScene(); if(!sc||!READY) return;
  var seq=++drawSeq;
  var wm0=wallMat(), ws0=wallStyle(), fm0=floorMat(), fs0=floorStyle();
  var need=[];
  if(wm0&&!(wm0.flat)) need.push((ws0&&ws0.img)?ws0.img:wm0.img);
  if(fm0&&sc.floor) need.push((fs0&&fs0.img)?fs0.img:fm0.img);
  preload(need,function(){
  loadImg(sc.file,function(base){
    if(seq!==drawSeq) return;
    sampleOk=!!base; $('#sampleErr').hidden=!!base;
    if(!base) return;
    CUR=base;
    var stage=$('#stage'), bf=$('canvas.bf',stage), af=$('canvas.af',stage);
    if(bf.width!==sc.w||bf.height!==sc.h){bf.width=af.width=sc.w; bf.height=af.height=sc.h;}
    var b=bf.getContext('2d'); b.clearRect(0,0,sc.w,sc.h); b.drawImage(base,0,0,sc.w,sc.h);
    var a=af.getContext('2d');
    paintScene(a,sc,base);
    if(kind) reveal(kind);
    placeSpots(sc);
    if(PH.img) drawPhoto();
  });
  });
}
/* 부위 손잡이(사진 위) */
function placeSpots(sc){
  var host=$('#spots'); if(!host) return;
  var W=sc.w, H=sc.h;
  function at(sel,pt){ return {left:(sel[0]/W*100)+'%',top:(sel[1]/H*100)+'%'}; }
  var defs=[
    ['wall','벽',at([ (bbox(sc.wall).x0+bbox(sc.wall).w*0.5), bbox(sc.wall).y0+bbox(sc.wall).h*0.28 ])],
    ['floor','바닥',sc.floor?at([(bbox(sc.floor).x0+bbox(sc.floor).w*0.5), bbox(sc.floor).y1-((bbox(sc.floor).h)*0.28)]):null],
    ['light','조명',at([(sc.light&&sc.light.sconce&&sc.light.sconce[0])?sc.light.sconce[0][0]:W*0.5, (sc.light&&sc.light.sconce&&sc.light.sconce[0])?sc.light.sconce[0][1]-40:H*0.12])],
    ['furn','가구',(sc.furn&&!sc.furnished)?at([sc.furn.center[0]+(sc.furn.center[2]-sc.furn.center[0])*0.5, sc.furn.center[3]-20]):null]
  ];
  host.innerHTML=defs.map(function(d){
    if(!d[2]) return '';
    return '<button type="button" class="spot'+(S.part===d[0]?' on':'')+'" data-part="'+d[0]+'" style="left:'+d[2].left+';top:'+d[2].top+';transform:translate(-50%,-50%)">'+d[1]+'</button>';
  }).join('');
}


/* =========================================================================
   트랙2 고도화 (2026-11-26) — 5단계 한 화면 동선
   1 사진 → 2 영역 → 3 마감 → 4 견적(3방식) → 5 A4·PNG
   기존 기능(자재·면적·단가·비포/애프터·업로드·저장·A4·이용권) 유지
   ========================================================================= */

/* ---------------- 단계(마법사) ---------------- */
var WZ={step:1,src:'sample'};
var STEPS=[
  {t:'어디를 바꾸나',s:'사진으로 고르기',nx:'영역 맞추기'},
  {t:'바꿀 곳 잡기',s:'벽·바닥 영역',nx:'마감 고르기'},
  {t:'마감 고르기',s:'자재 → 색',nx:'견적 보기'},
  {t:'얼마인가',s:'3가지 방식 비교',nx:'견적서 저장'},
  {t:'견적서 저장',s:'A4 · PNG',nx:''}
];
function go(n){
  n=Math.max(1,Math.min(5,n));
  if(n>1&&WZ.src==='photo'&&!PH.img) n=1;
  WZ.step=n;
  for(var i=1;i<=5;i++){ var p=$('#p'+i); if(p) p.hidden=(i!==n); }
  var st=$('#stageBox'); if(st) st.hidden=!(n===2||n===3);
  var s0=STEPS[n-1];
  $('#tNo').textContent=n; $('#tTitle').textContent=s0.t; $('#tSub').textContent=s0.s;
  $('#barIn').style.width=(n*20)+'%';
  $('#navPrev').disabled=(n===1);
  var nx=$('#navNext');
  nx.textContent=s0.nx?(s0.nx+' →'):'처음으로';
  $('#pips').innerHTML='';
  for(var k=1;k<=5;k++){ var d=document.createElement('i'); if(k===n)d.className='on'; $('#pips').appendChild(d); }
  if(n===2||n===3){ syncStage(); }
  if(n===3){ renderStep(); }
  if(n===4){ calc(); }
  if(n===5){ calc(); renderSheetPrev(); paintCnt(); }
  window.scrollTo(0,0);
}
$('#navPrev').addEventListener('click',function(){ go(WZ.step-1); });
$('#navNext').addEventListener('click',function(){ go(WZ.step===5?1:WZ.step+1); });

/* ---------------- ① 공간 카드 ---------------- */
function renderSpaces(){
  $('#spaceRow').innerHTML=SCENES.map(function(s){
    return '<button type="button" data-space="'+s.id+'" class="'+(WZ.src==='sample'&&S.space===s.id?'on':'')+'" aria-pressed="'+(WZ.src==='sample'&&S.space===s.id?'true':'false')+'">'+
      (s.example?'<i class="ex">예시</i>':'')+
      '<img src="'+s.file+'" alt="'+s.nm+'" loading="lazy"><span>'+s.nm+'</span></button>';
  }).join('');
}
$('#spaceRow').addEventListener('click',function(e){
  var b=e.target.closest('button[data-space]'); if(!b) return;
  WZ.src='sample'; S.space=b.dataset.space; if(S.part===''||S.part==='furn'&&curScene().furnished) S.part='wall';
  renderSpaces(); saveSel();
  redraw('mat');
  go(2);
});

/* ---------------- ② 부위 선택 ---------------- */
$('#partTabs').addEventListener('click',function(e){
  var b=e.target.closest('button[data-part]'); if(!b) return;
  S.part=b.dataset.part;
  if(S.part==='floor'){ PH.floorOn=true; if(WZ.src==='photo'&&PH.img) drawPhoto(); }
  saveSel(); syncStage(); renderStep(); placeSpots(curScene());
});
function syncStage(){
  var photo=(WZ.src==='photo'&&!!PH.img);
  $('#stage').hidden=photo;
  $('#stage2').hidden=!photo;
  $('#maskCtrl').hidden=!photo;
  $$('#partTabs button').forEach(function(b){
    var p=b.dataset.part;
    b.hidden=photo&&(p==='light'||p==='furn');
    b.classList.toggle('on',S.part===p);
  });
  if(photo&&S.part!=='wall'&&S.part!=='floor') S.part='wall';
  placeHandles();
  hintStats();
}
function hintStats(){
  var photo=(WZ.src==='photo'&&!!PH.img);
  if(photo){
    $('#p2hint').innerHTML=(PH.wm?'지금은 <b>워터마크 미리보기</b>입니다 · 5단계에서 이용권 코드를 넣으면 지워집니다.':'영역을 맞추면 <b>그 자리만</b> 자재가 입혀집니다.');
    $('#hintLine').innerHTML='동그라미 4개를 <b>'+(S.part==='floor'?'바닥':'벽')+' 모서리</b>에 맞추세요 · ◀▶ 를 끌면 전후 비교';
  }else{
    $('#p2hint').innerHTML='사진 속 <b>벽·바닥</b>을 눌러도 그 부위로 바뀝니다.';
    $('#hintLine').innerHTML='사진을 눌러 부위를 고르세요 · ◀▶ 를 끌면 전후 비교';
  }
}

/* ---------------- ③ 단계별 단추(지금 단계 것만) ---------------- */
var TIERLAB={l:'하',m:'중',h:'상'};
function stepHTML(){
  var part=S.part, html='';
  if(part==='wall'||part==='floor'){
    var list=matsOf(part), cur=(part==='wall')?S.matWall:S.matFloor;
    html+='<p class="lbl"><b>'+(part==='wall'?'벽':'바닥')+' 마감</b> 고르면 '+(part==='wall'?'색까지 이어집니다':'그 자리에서 바뀝니다')+'</p>';
    html+='<div class="chips '+(list.length<=2?'g2':(list.length===3?'g3':'row'))+'">'+list.map(function(m){
      var thumb=m.thumb||m.img;
      return '<button type="button" data-mat="'+m.id+'" class="'+(m.id===cur?'on':'')+'">'+
        '<i class="sw" style="background-image:url('+thumb+')"></i>'+m.nm+(m.sub?'<span>'+m.sub+'</span>':'')+'</button>';
    }).join('')+'</div>';
  }else if(part==='light'){
    html+='<p class="lbl"><b>조명</b>은 빛의 형태까지 바뀝니다</p><div class="chips g3">';
    html+='<button type="button" data-tier="0" class="'+(!S.light?'on':'')+'">그대로</button>';
    [['l','벽 간접'],['m','천장 간접'],['h','등기구']].forEach(function(t){
      html+='<button type="button" data-tier="'+t[0]+'" class="'+(S.light===t[0]?'on':'')+'">'+t[1]+'</button>';
    });
    html+='</div>';
  }else if(curScene().furnished){
    html+='<p class="lbl"><b>가구</b> — 이 공간은 사진의 가구를 그대로 씁니다</p><div class="chips g2">';
    html+='<button type="button" data-tier="0" class="'+(!S.furn?'on':'')+'">사진 가구 그대로</button>';
    html+='</div>';
  }else{
    html+='<p class="lbl"><b>가구</b>는 크기에 따라 놓는 자리가 달라집니다</p><div class="chips row">';
    html+='<button type="button" data-tier="0" class="'+(!S.furn?'on':'')+'">그대로</button>';
    [['l','작은 가구'],['m','중간 가구'],['h','큰 가구']].forEach(function(t){
      html+='<button type="button" data-tier="'+t[0]+'" class="'+(S.furn===t[0]?'on':'')+'">'+t[1]+'</button>';
    });
    html+='</div>';
  }
  if((part==='wall'||part==='floor')){
    var m2=(part==='wall')?wallMat():floorMat(), st=(part==='wall')?wallStyle():floorStyle();
    var list2=stylesOf(m2);
    if(list2.length){
      html+='<p class="lbl" style="margin-top:11px"><b>'+(m2.id==='mural'?'무늬':'색')+'</b>'+
        (m2.id==='paint'?'를 고르면 벽이 그 색으로 바뀝니다':(m2.id==='mural'?'를 고르면 실사 무늬가 벽에 덮입니다':' — 톤을 누르면 바로 바뀝니다'))+'</p>';
      html+='<div class="chips row">'+list2.map(function(s2){
        var sw=s2.css?'background-color:'+s2.css:'background-image:url('+(s2.img||m2.thumb||m2.img)+')';
        return '<button type="button" data-style="'+s2.id+'" class="'+(s2.id===(st||{}).id?'on':'')+'" aria-pressed="'+(s2.id===(st||{}).id?'true':'false')+'">'+
          '<i class="sw" style="'+sw+'"></i>'+s2.nm+'</button>';
      }).join('')+'</div>';
    }
  }
  var note='';
  if(part==='wall'&&wallMat()) note=(wallMat().note||'');
  if(note) html+='<p class="hint">'+note+'</p>';
  return html;
}
function renderStep(){
  var box=$('#stepBar'); if(!box) return;
  if(!READY){box.innerHTML='<p class="hint">자재 목록을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.</p>';return;}
  box.innerHTML=stepHTML();
  $$('#stepBar button').forEach(function(b){ b.setAttribute('aria-pressed',b.classList.contains('on')?'true':'false'); });
  $('#realBox').hidden=!(WZ.src==='photo'&&PH.img);
}
$('#stepBar').addEventListener('click',function(e){
  var b=e.target.closest('button'); if(!b) return;
  if(b.dataset.mat){
    var id=b.dataset.mat, m=matById(id); if(!m) return;
    var zone=m.zone, curId=(zone==='wall')?S.matWall:S.matFloor, haveId=(zone==='wall')?S.styleWall:S.styleFloor;
    if(zone==='wall') S.matWall=id; else S.matFloor=id;
    if(zone==='floor'&&WZ.src==='photo') PH.floorOn=true;
    var list=stylesOf(m), keep=(curId===id&&list.some(function(x){return x.id===haveId;}))?haveId:((list[0]||{}).id||'');
    if(zone==='wall') S.styleWall=keep; else S.styleFloor=keep;
    S.part=zone;
    SCENE_CACHE={};
    renderStep(); saveSel();
    if(WZ.src==='photo'){ drawPhoto(); reveal('mat'); } else redraw('mat');
    calc(); return;
  }
  if(b.dataset.style){
    if(S.part==='wall') S.styleWall=b.dataset.style; else S.styleFloor=b.dataset.style;
    renderStep(); saveSel();
    if(WZ.src==='photo'){ drawPhoto(); reveal('style'); } else redraw('style');
    return;
  }
  if(b.dataset.tier!==undefined){
    var tv=b.dataset.tier, g=(tv==='l'||tv==='m'||tv==='h')?tv:(['','l','m','h'][+tv]||'');
    if(S.part==='light') S.light=g; else if(S.part==='furn') S.furn=g;
    renderStep(); saveSel(); redraw('light'); calc(); return;
  }
});

/* 부위 손잡이(예시 사진) */
$('#spots').addEventListener('click',function(e){
  var b=e.target.closest('button[data-part]'); if(!b) return;
  S.part=b.dataset.part; syncStage(); renderStep(); saveSel();
});
$('#sampleRetry').addEventListener('click',function(){ redraw('mat'); });

/* ---------------- 비교 슬라이더(게이지) ---------------- */
function Gauge(el,rng){
  var dv=$('.dv',el), kn=$('.kn',el), af=$('canvas.af',el), pos=50, drag=false, pend=null;
  function set(p){p=parseFloat(p);if(!isFinite(p))p=50;pos=Math.max(0,Math.min(100,Math.round(p*10)/10));
    af.style.clipPath='inset(0 0 0 '+pos+'%)'; af.style.webkitClipPath='inset(0 0 0 '+pos+'%)';
    dv.style.left=pos+'%'; kn.style.left='clamp(22px,'+pos+'%,calc(100% - 22px))'; if(rng) rng.value=pos; el.setAttribute('aria-valuenow',Math.round(pos));}
  function fromX(cx){var r=el.getBoundingClientRect();set((cx-r.left)/r.width*100);}
  function cap(e){try{el.setPointerCapture(e.pointerId);}catch(x){}}
  el.addEventListener('pointerdown',function(e){
    if(e.target.closest('.err')||e.target.closest('.spot')||e.target.closest('.h')) return;
    if(e.pointerType==='mouse'||e.target.closest('.kn')){drag=true;pend=null;cap(e);fromX(e.clientX);e.preventDefault();return;}
    pend={x:e.clientX,y:e.clientY};
  });
  el.addEventListener('pointermove',function(e){
    if(!drag&&pend){var dx=e.clientX-pend.x, dy=e.clientY-pend.y;
      if(Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)){drag=true;cap(e);} else if(Math.abs(dy)>8) pend=null;}
    if(drag){fromX(e.clientX);e.preventDefault();}
  });
  function end(e){
    if(!drag&&pend&&el.id==='stage') tapZone(e.clientX,e.clientY);
    drag=false;pend=null;try{el.releasePointerCapture(e.pointerId);}catch(x){}
  }
  el.addEventListener('pointerup',end); el.addEventListener('pointercancel',function(){drag=false;pend=null;});
  el.addEventListener('keydown',function(e){
    if(e.key==='ArrowLeft'){set(pos-5);e.preventDefault();} else if(e.key==='ArrowRight'){set(pos+5);e.preventDefault();}
    else if(e.key==='Home'){set(0);e.preventDefault();} else if(e.key==='End'){set(100);e.preventDefault();}
  });
  if(rng) rng.addEventListener('input',function(){set(rng.value);});
  this.set=set; this.pos=function(){return pos;};
  set(50);
}
/* 사진을 그냥 눌렀을 때 — 그 자리에 해당하는 부위를 고른다(단추보다 직접 누르기) */
function tapZone(cx,cy){
  var sc=curScene(); if(!sc) return;
  var el=$('#stage'), r=el.getBoundingClientRect();
  var x=(cx-r.left)/r.width*sc.w, y=(cy-r.top)/r.height*sc.h;
  function inside(poly){var c=false;for(var i=0,j=poly.length-1;i<poly.length;j=i++){var xi=poly[i][0],yi=poly[i][1],xj=poly[j][0],yj=poly[j][1];if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))c=!c;}return c;}
  var pick='';
  var lw=sc.light&&sc.light.sconce;
  if(lw&&lw.some(function(p){return Math.hypot(p[0]-x,p[1]-y)<Math.max(90,sc.w*0.09);})) pick='light';
  if(!pick&&sc.wall&&inside(sc.wall)) pick='wall';
  if(!pick&&sc.floor&&inside(sc.floor)) pick=(y>(bbox(sc.floor).y1-bbox(sc.floor).h*0.42))?'furn':'floor';
  if(!pick) pick='wall';
  if(pick==='furn'&&(!sc.furn||sc.furnished)) pick='floor';
  if(S.part!==pick){S.part=pick; saveSel();}
  syncStage(); renderStep(); placeSpots(sc);
}
var gS=new Gauge($('#stage'),null), gP=null;

/* ---------------- 견적(계산식·단가 불변) ---------------- */
var PY=3.3058, mode='m', LAST=null;
function num(id){var v=parseFloat($(id).value);return (isFinite(v)&&v>0)?v:0;}
function gradeOf(){var m=wallMat();return (m&&m.grade)||'l';}
function calc(){
  var area,len;
  if(mode==='m'){var w=num('#inW'),h=num('#inH');area=w*h;len=w;}
  else{area=num('#inPy')*PY;len=Math.sqrt(area);}
  area=Math.round(area*100)/100; len=Math.round(len*10)/10;
  $('#areaTxt').textContent=area>0?('( = '+area.toLocaleString('ko-KR')+'㎡ · 약 '+(Math.round(area/PY*10)/10).toLocaleString('ko-KR')+'평 )'):'';
  var out=$('#calcOut');
  if(!(area>0)){out.innerHTML='<div class="warn">가로·세로(또는 평수)를 0보다 크게 넣어 주세요. 면적이 0이면 계산하지 않습니다.</div>';LAST=null;renderSheetPrev();return null;}
  var items=[],mat=0,md=0,mdTxt=[],GR=gradeOf();
  var mult=wallMult(), wr=Math.round(R.wall[GR]*mult), wm=Math.round(wr*area);
  mat+=wm;
  var mw0=wallMat(), btxt=(mw0&&mw0.basis)?mw0.basis:((mw0&&NAMES.wall[GR]&&mw0.nm!==NAMES.wall[GR])?('단가 기준: 벽 '+({l:'하',m:'중',h:'상'}[GR])+' '+NAMES.wall[GR]):'');
  items.push({k:'재료비',nm:wallLabel()+(mult!==1?' ×'+mult:''),spec:won(wr)+'원/㎡ × '+area.toLocaleString('ko-KR')+'㎡',amt:wm,tag:tagOf('wall.'+GR),basis:btxt});
  var wd=Math.ceil(area/10); md+=wd; mdTxt.push('벽 '+wd+'인·일');
  if(S.light){
    var L=R.light[S.light], q, qu;
    if(S.light==='l'){q=Math.ceil(area/4);qu='개';}else if(S.light==='m'){q=len;qu='m';}else{q=Math.round(len*2*10)/10;qu='m';}
    var lm=Math.round(L.set+q*L.unit); mat+=lm;
    items.push({k:'조명',nm:NAMES.light[S.light],spec:(L.set?won(L.set)+'원 + ':'')+q.toLocaleString('ko-KR')+qu+' × '+won(L.unit)+'원',amt:lm,tag:tagOf('light.'+S.light+'.unit')});
    md+=0.5; mdTxt.push('조명 0.5인·일');
  }
  if(S.furn){
    var fm=R.furn[S.furn]; mat+=fm;
    items.push({k:'가구',nm:NAMES.furn[S.furn]+' 참고가',spec:'세트',amt:fm,tag:tagOf('furn.'+S.furn)});
    md+=0.5; mdTxt.push('철거·이동 0.5인·일');
  }
  var labor=Math.round(md*R.daily), days=Math.ceil(md);
  items.push({k:'인건비',nm:md.toLocaleString('ko-KR')+'인·일',spec:mdTxt.join(' + ')+' × '+won(R.daily)+'원',amt:labor,tag:tagOf('daily')});
  var c1=mat, c2=mat+labor, c3=Math.round(c2*(1+R.margin/100)/1000)*1000;
  var d32=c3-c2, d31=c3-c1;
  LAST={area:area,items:items,c1:c1,c2:c2,c3:c3,d32:d32,d31:d31,mat:mat,labor:labor,days:days,
        space:(curScene()||{}).nm||(WZ.src==='photo'?'내 사진':''),spaceId:WZ.src==='photo'?'photo':S.space,
        wall:wallLabel(),light:S.light?NAMES.light[S.light]:'',furn:S.furn?NAMES.furn[S.furn]:'',
        floor:S.part==='floor'?((floorMat()||{}).nm||''):'',src:WZ.src};
  var lines='<div class="lines">'+
    items.map(function(it){
      return '<div class="ln"><span class="k">'+it.k+'</span><span class="v">'+it.nm+(it.basis?' <small>'+it.basis+'</small>':'')+
        ' <b>'+won(it.amt)+'원</b> '+it.tag+'<small>'+it.spec+'</small></span></div>';
    }).join('')+
    '<div class="ln"><span class="k">공사기간</span><span class="v">'+days+'일 (1인 기준 · 벽 10㎡/인·일 기준)</span></div></div>';
  var cmp='<table class="cmp"><thead><tr><th>구분</th>'+
      '<th>① 직접 시공<small>셀프</small></th><th>② 기술자 하청<small>시공만</small></th><th class="on">③ 업체 의뢰<small>일괄</small></th></tr></thead><tbody>'+
    '<tr><th>예상 총액</th>'+
      '<td class="c1"><b>'+won(c1)+'</b><small>재료비만</small></td>'+
      '<td><b>'+won(c2)+'</b><small>재료+인건비</small></td>'+
      '<td class="c3"><b>'+won(c3)+'</b><small>이윤 '+R.margin+'%</small></td></tr>'+
    '<tr><th>절감액</th>'+
      '<td class="c1"><b>-'+won(d31)+'</b><small>업체 대비</small></td>'+
      '<td><b>-'+won(d32)+'</b><small>업체 대비</small></td>'+
      '<td><small>기준</small></td></tr>'+
    '<tr><th>내가 하는 일</th><td>자재 주문·시공 전부</td><td>자재 주문만</td><td>일정만 잡기</td></tr>'+
    '<tr><th>기간</th><td>'+Math.round(days*1.6)+'일<small>초보 기준</small></td><td>'+days+'일</td><td>'+days+'일<small>+ 대기</small></td></tr>'+
    '<tr><th>보증</th><td>없음</td><td>기사 재량</td><td>업체 A/S</td></tr></tbody></table>';
  var save='<div class="save big">③ 업체 의뢰 <b>'+won(c3)+'원</b> → ① 직접 시공하면 <b>'+won(d31)+'원</b> 아낍니다 · ② 기술자 하청은 <b>'+won(d32)+'원</b> 절감</div>';
  out.innerHTML=lines+cmp+save;
  renderSheetPrev();
  return LAST;
}
function strip(h){return String(h).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();}
function estText(){
  if(!LAST) return '';
  var t=['[KTS 인테리어 견적 · 참고 계산]','공간: '+LAST.space+' · 벽 '+LAST.wall+' · 조명 '+(S.light?LAST.light:'안 함')+' · 가구 '+(S.furn?LAST.furn:'안 함'),
    '면적 '+LAST.area.toLocaleString('ko-KR')+'㎡'];
  LAST.items.forEach(function(it){ t.push(it.k+': '+it.nm+' / '+it.spec+' = '+won(it.amt)+'원'); });
  t.push('공사기간 '+LAST.days+'일(1인 기준)',
    '① 직접 시공(셀프) '+won(LAST.c1)+'원','② 기술자 하청 '+won(LAST.c2)+'원','③ 인테리어 업체 의뢰 '+won(LAST.c3)+'원',
    '→ 업체 의뢰 대비 ① '+won(LAST.d31)+'원 · ② '+won(LAST.d32)+'원 절감','※ 참고 계산입니다. 실제 견적은 현장·업체에 따라 다릅니다.');
  return t.join('\n');
}
function copy(txt){
  if(!txt){toast('계산된 견적이 없습니다');return;}
  function fb(){var ta=document.createElement('textarea');ta.value=txt;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');toast('견적을 복사했습니다');}catch(e){toast('복사하지 못했습니다');}document.body.removeChild(ta);}
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(function(){toast('견적을 복사했습니다');},fb);}else fb();
}
function share(){var txt=estText();if(!txt){toast('계산된 견적이 없습니다');return;}
  if(navigator.share){navigator.share({title:'인테리어 견적(참고)',text:txt}).catch(function(){});}else copy(txt);
}
$('#modeBtn').addEventListener('click',function(){
  if(mode==='m'){var a=num('#inW')*num('#inH');if(a>0)$('#inPy').value=(Math.round(a/PY*10)/10);mode='p';}
  else mode='m';
  $('#inM').hidden=mode!=='m';$('#inP').hidden=mode!=='p';
  $('#modeBtn').textContent=mode==='m'?'평수로 넣기':'가로·세로로 넣기';
  calc();
});
['#inW','#inH','#inPy'].forEach(function(id){$(id).addEventListener('input',calc);});

/* ---------------- 내 사진: 영역 잡기 + 합성 ---------------- */
var PH={img:null,wm:false,w:0,h:0,quad:null,opacity:1,warm:0,floorOn:false,floorTouched:false};
var PH_KEY='kts_interior_photo_v1';
(function(){try{var o=JSON.parse(ls(PH_KEY)||'null');if(o){if(o.opacity)PH.opacity=o.opacity;if(o.warm)PH.warm=o.warm;}}catch(e){}})();
function yymm(){var t=new Date();return String(t.getFullYear()).slice(2)+('0'+(t.getMonth()+1)).slice(-2);}
function unlocked(){return window.KTS_MASTER===true||ls(PASS_KEY)===yymm();}
function localUsed(){try{var o=JSON.parse(ls(TRIAL_KEY)||'null');return (o&&o.n)||0;}catch(e){return 0;}}
function used(){
  if(window.KTS_KEYS&&typeof KTS_KEYS.usedToday==='function'&&KTS_KEYS.limitOf&&KTS_KEYS.limitOf('interior')>0) return KTS_KEYS.usedToday('interior');
  return localUsed();
}
function markUsed(){
  lsSet(TRIAL_KEY,JSON.stringify({n:localUsed()+1,at:new Date().toISOString().slice(0,10)}));
  if(window.KTS_KEYS&&typeof KTS_KEYS.markUse==='function'){try{KTS_KEYS.markUse('interior');}catch(e){}}
}
function codeOk(c){
  c=String(c||'').trim().toUpperCase();
  if(window.KTSSlots&&KTSSlots.codeOk) return !!KTSSlots.codeOk(c);
  var m=c.match(/^KS(\d{4})-([0-9A-F]{4})$/); if(!m||m[1]!==yymm()) return false;
  var h=0x811c9dc5,s='kts-sign-'+m[1];for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}
  return ('00000000'+h.toString(16).toUpperCase()).slice(-8).slice(0,4)===m[2];
}
function paintCnt(){
  var u=used(); var el=$('#photoCnt'); if(!el) return;
  el.innerHTML=unlocked()?'이용권이 열려 있습니다 · 이번 달 사진 제한 없음':('무료 맛보기 <b>'+Math.max(0,1-u)+'장</b> 남음'+(window.KTS_KEYS?' (이 기기 · 하루 1장)':' (이 기기 기준)'));
}
function defaultQuad(W,H){
  var wall=[[W*0.16,H*0.13],[W*0.84,H*0.13],[W*0.94,H*0.62],[W*0.06,H*0.62]].map(function(p){return [Math.round(p[0]),Math.round(p[1])];});
  var fy=Math.max(wall[2][1],Math.round(H*0.74));
  return {
    wall:wall,
    floor:[[Math.round(W*0.02),fy],[Math.round(W*0.98),fy],[Math.round(W*0.999),Math.round(H*0.998)],[Math.round(W*0.001),Math.round(H*0.998)]]
  };
}
function centerQuad(){
  var W=PH.w,H=PH.h,part=(S.part==='floor')?'floor':'wall';
  var q=defaultQuad(W,H)[part];
  PH.quad[part]=q.map(function(p){return [Math.round(p[0]),Math.round(p[1])];});
  placeHandles(); drawPhoto();
}
function photoScene(){
  var W=PH.w,H=PH.h,q=PH.quad;
  return {id:'photo',w:W,h:H,wall:q.wall,floor:(PH.floorOn?q.floor:null),base:null,mold:null,
    light:{sconce:[[W*0.34,H*0.20],[W*0.66,H*0.20]]},
    furn:{center:[W*0.28,H*0.74,W*0.78,H*0.96],wall:[W*0.24,H*0.68,W*0.84,H*0.94]},
    fg:[],keep:[],vp:[W*0.5,H*0.62]};
}
var photoSeq=0;
function drawPhoto(){
  if(!PH.img||!PH.quad) return;
  var wm1=wallMat(), ws1=wallStyle(), fm1=floorMat(), fs1=floorStyle(), nd=[];
  if(wm1&&!wm1.flat) nd.push((ws1&&ws1.img)?ws1.img:wm1.img);
  if(fm1) nd.push((fs1&&fs1.img)?fs1.img:fm1.img);
  var seq=++photoSeq;
  preload(nd,function(){ if(seq===photoSeq) drawPhotoNow(); });
  drawPhotoNow();
}
function drawPhotoNow(){
  if(!PH.img||!PH.quad) return;
  var el=$('#stage2'), bf=$('canvas.bf',el), af=$('canvas.af',el);
  var W=PH.w, H=PH.h;
  if(bf.width!==W||bf.height!==H){bf.width=af.width=W; bf.height=af.height=H;}
  var b=bf.getContext('2d');
  /* 전: 이용권이 잠겨 있으면 워터마크 */
  b.clearRect(0,0,W,H); b.drawImage(PH.img,0,0,W,H);
  if(PH.wm) watermark(b,W,H);
  var a=af.getContext('2d');
  a.clearRect(0,0,W,H); a.drawImage(PH.img,0,0,W,H);
  var sc=photoScene(); sc.w=W; sc.h=H;
  SCENE_CACHE={};
  try{
    var t=document.createElement('canvas'); t.width=W; t.height=H;
    var tg=t.getContext('2d'); tg.drawImage(PH.img,0,0,W,H);
    paintScene(tg,sc,PH.img);
    a.save(); a.globalAlpha=PH.opacity; a.drawImage(t,0,0); a.restore();
    tonePass(a,sc);
  }catch(e){}
  if(PH.wm) watermark(a,W,H);
  var wrap=$('#stage2 .afw'); if(wrap){wrap.style.transition='none';wrap.style.clipPath='inset(0 0 0 '+(gP?gP.pos():50)+'%)';wrap.style.filter='brightness(1)';}
  placeHandles();
}
/* 빛 온도 — 자재가 덮인 영역만 따뜻하게/차갑게 */
function tonePass(ctx,sc){
  var w=+PH.warm||0; if(!w) return;
  ctx.save();
  ctx.beginPath();
  [sc.wall,sc.floor].forEach(function(poly){
    if(!poly||!poly.length) return;
    poly.forEach(function(p,i){ if(i) ctx.lineTo(p[0],p[1]); else ctx.moveTo(p[0],p[1]); });
    ctx.closePath();
  });
  ctx.clip();
  try{ ctx.globalCompositeOperation='soft-light'; }catch(e){}
  var a=Math.min(0.6,Math.abs(w)/100*0.9);
  ctx.fillStyle=w>0?('rgba(255,168,86,'+a+')'):('rgba(120,170,255,'+a+')');
  ctx.fillRect(0,0,PH.w,PH.h);
  ctx.restore();
}
function watermark(ctx,W,H){
  ctx.save(); ctx.globalAlpha=0.30; ctx.fillStyle='#FFFFFF'; ctx.strokeStyle='rgba(0,0,0,.55)';
  var fs=Math.max(16,Math.round(W/17)); ctx.font='900 '+fs+'px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.translate(W/2,H/2); ctx.rotate(-Math.PI/7);
  for(var y=-H;y<=H;y+=fs*3){for(var x=-W;x<=W;x+=fs*10){ctx.lineWidth=Math.max(1,fs/14);ctx.strokeText('KTS 인테리어 견적',x+((y/(fs*3))%2?fs*5:0),y);ctx.fillText('KTS 인테리어 견적',x+((y/(fs*3))%2?fs*5:0),y);}}
  ctx.restore();
}
/* --- 영역 손잡이 --- */
function placeHandles(){
  var host=$('#hnds'), svg=$('#maskSvg');
  if(!host||!svg) return;
  var show=(WZ.src==='photo'&&!!PH.img&&WZ.step===2);
  host.hidden=!show; svg.hidden=!show;
  if(!show){ host.innerHTML=''; svg.innerHTML=''; return; }
  var part=(S.part==='floor')?'floor':'wall', pts=PH.quad[part], W=PH.w, H=PH.h;
  host.innerHTML=pts.map(function(p,i){
    return '<b class="h" data-i="'+i+'" style="left:'+(p[0]/W*100)+'%;top:'+(p[1]/H*100)+'%" role="slider" aria-label="영역 모서리 '+(i+1)+'"></b>';
  }).join('');
  svg.setAttribute('viewBox','0 0 '+W+' '+H);
  svg.innerHTML='<polygon points="'+pts.map(function(p){return p[0]+','+p[1];}).join(' ')+'"/>';
}
var HD={idx:-1,pid:null};
$('#hnds').addEventListener('pointerdown',function(e){
  var h=e.target.closest('.h'); if(!h) return;
  HD.idx=+h.dataset.i; HD.pid=e.pointerId;
  try{ h.setPointerCapture(e.pointerId); }catch(x){}
  e.preventDefault(); e.stopPropagation();
});
$('#hnds').addEventListener('pointermove',function(e){
  if(HD.idx<0) return;
  var st=$('#stage2'), r=st.getBoundingClientRect();
  var x=(e.clientX-r.left)/r.width*PH.w, y=(e.clientY-r.top)/r.height*PH.h;
  x=Math.max(0,Math.min(PH.w,Math.round(x))); y=Math.max(0,Math.min(PH.h,Math.round(y)));
  var part=(S.part==='floor')?'floor':'wall';
  PH.quad[part][HD.idx]=[x,y];
  if(part==='floor') PH.floorTouched=true;
  else if(!PH.floorTouched){ PH.quad.floor[0]=[PH.quad.wall[3][0],PH.quad.wall[3][1]]; PH.quad.floor[1]=[PH.quad.wall[2][0],PH.quad.wall[2][1]]; }
  var h=$('#hnds .h[data-i="'+HD.idx+'"]');
  if(h){h.style.left=(x/PH.w*100)+'%';h.style.top=(y/PH.h*100)+'%';}
  var svg=$('#maskSvg'), pg=$('polygon',svg);
  if(pg) pg.setAttribute('points',PH.quad[part].map(function(p){return p[0]+','+p[1];}).join(' '));
  scheduleDraw();
  e.preventDefault();
});
$('#hnds').addEventListener('pointerup',function(){ HD.idx=-1; });
$('#hnds').addEventListener('pointercancel',function(){ HD.idx=-1; });
var drawT=null;
function scheduleDraw(){ if(drawT) return; drawT=setTimeout(function(){ drawT=null; drawPhotoNow(); },90); }
$('#quadCenter').addEventListener('click',centerQuad);
$('#quadReset').addEventListener('click',function(){
  PH.quad=defaultQuad(PH.w,PH.h); placeHandles(); drawPhoto(); toast('처음 네모로 되돌렸습니다');
});
$('#opacityIn').addEventListener('input',function(){
  PH.opacity=+this.value/100; $('#opacityVal').textContent=this.value+'%';
  lsSet(PH_KEY,JSON.stringify({opacity:PH.opacity,warm:PH.warm})); scheduleDraw();
});
$('#warmIn').addEventListener('input',function(){
  PH.warm=+this.value; $('#warmVal').textContent=(this.value>0?'+':'')+this.value;
  lsSet(PH_KEY,JSON.stringify({opacity:PH.opacity,warm:PH.warm})); scheduleDraw();
});
/* --- 사진 받기(긴 변 1600px로 줄여 계산을 가볍게) --- */
$('#photoIn').addEventListener('change',function(e){
  var f=e.target.files&&e.target.files[0]; e.target.value='';
  if(!f) return;
  if(!/^image\//.test(f.type)){toast('JPG·PNG 사진을 골라 주세요');return;}
  var fr=new FileReader();
  fr.onload=function(){
    var im=new Image();
    im.onload=function(){
      var W0=im.naturalWidth||im.width, H0=im.naturalHeight||im.height, maxL=1600;
      var s=Math.min(1,maxL/Math.max(W0,H0));
      var W=Math.round(W0*s), H=Math.round(H0*s);
      var cv=document.createElement('canvas'); cv.width=W; cv.height=H;
      cv.getContext('2d').drawImage(im,0,0,W,H);
      var free=unlocked()||used()<1;
      if(!unlocked()&&free) markUsed();
      PH.img=cv; PH.w=W; PH.h=H; PH.wm=!free;
      PH.quad=defaultQuad(W,H);
      S.part='wall';
      WZ.src='photo';
      if(!gP) gP=new Gauge($('#stage2'),null);
      gP.set(50);
      drawPhoto(); syncStage(); renderStep(); renderSpaces(); paintCnt();
      $('#passBox').hidden=free;
      go(2);
      toast(free?'사진 위에 영역을 잡았습니다 · 동그라미를 벽 모서리에 맞추세요':'2장째부터는 이용권이 필요합니다 · 워터마크 미리보기');
    };
    im.onerror=function(){toast('사진을 열 수 없습니다');};
    im.src=fr.result;
  };
  fr.readAsDataURL(f);
});
$('#codeBtn').addEventListener('click',function(){
  if(!codeOk($('#codeIn').value)){toast('코드가 맞지 않습니다 · 이번 달 코드인지 확인해 주세요');return;}
  lsSet(PASS_KEY,yymm()); PH.wm=false; $('#passBox').hidden=true;
  if(PH.img){drawPhoto();} paintCnt(); toast('이용권이 열렸습니다');
});

/* ---------------- 저장: 전후 PNG · A4 ---------------- */
function dlPNG(canvas,name){
  canvas.toBlob(function(b){if(!b){toast('저장하지 못했습니다');return;}var u=URL.createObjectURL(b),a2=document.createElement('a');a2.href=u;a2.download=name;document.body.appendChild(a2);a2.click();setTimeout(function(){URL.revokeObjectURL(u);a2.remove();},800);toast('이미지를 저장했습니다');},'image/png');
}
function activeStage(){
  return (WZ.src==='photo'&&PH.img)?$('#stage2'):$('#stage');
}
function composite(el,pos){
  el=el||activeStage(); if(pos==null) pos=(el.id==='stage2'?(gP?gP.pos():50):gS.pos());
  var bf=$('canvas.bf',el), af=$('canvas.af',el), W=bf.width, H=bf.height, x=Math.round(W*pos/100);
  var c=document.createElement('canvas'); c.width=W; c.height=H; var g=c.getContext('2d');
  g.drawImage(bf,0,0); g.drawImage(af,x,0,W-x,H,x,0,W-x,H);
  g.fillStyle='#FFFFFF'; g.fillRect(x-Math.max(2,W/400),0,Math.max(4,W/200),H);
  var fs=Math.max(16,Math.round(W/28)); g.font='900 '+fs+'px sans-serif'; g.textBaseline='top';
  g.fillStyle='rgba(10,17,40,.8)'; g.fillRect(fs*0.5,fs*0.5,fs*1.6,fs*1.3); g.fillStyle='#fff'; g.fillText('전',fs*0.8,fs*0.65);
  g.fillStyle='rgba(255,107,0,.92)'; g.fillRect(W-fs*2.1,fs*0.5,fs*1.6,fs*1.3); g.fillStyle='#0A1224'; g.fillText('후',W-fs*1.8,fs*0.65);
  return c;
}
function stageComposite(){        /* 무대 그대로 전후 합성 */
  var el=activeStage(), bf=$('canvas.bf',el), af=$('canvas.af',el), W=bf.width,H=bf.height;
  var pos=(el.id==='stage2'?(gP?gP.pos():50):gS.pos());
  var x=Math.round(W*pos/100);
  var c=document.createElement('canvas'); c.width=W; c.height=H; var g=c.getContext('2d');
  g.drawImage(bf,0,0); g.drawImage(af,x,0,W-x,H,x,0,W-x,H);
  g.fillStyle='#fff'; g.fillRect(x-Math.max(2,W/400),0,Math.max(4,W/200),H);
  return c;
}
/* 견적서 미리보기(흰 종이) */
function renderSheetPrev(){
  var el=$('#sheetPrev'); if(!el) return;
  var q=LAST||calc();
  if(!q||!q.area){el.innerHTML='<p class="hint">4단계에서 면적을 넣으면 견적서가 만들어집니다.</p>';return;}
  el.innerHTML='<div class="sheet">'+
    '<h3>인테리어 견적서</h3>'+
    '<div class="meta">'+q.space+' · '+q.wall+' · '+q.area.toLocaleString('ko-KR')+'㎡ · '+q.days+'일(1인)</div>'+
    '<table><tbody>'+q.items.map(function(it){
      return '<tr><th style="width:52px">'+it.k+'</th><td>'+it.nm+'</td><td class="r">'+won(it.amt)+'원</td></tr>';
    }).join('')+'</tbody></table>'+
    '<div class="tot"><span>합계(재료+인건비)</span><span>'+won(q.c2)+'원</span></div>'+
    '<div class="three">'+
      '<div><b>'+won(q.c1)+'</b><small>① 직접 시공</small></div>'+
      '<div><b>'+won(q.c2)+'</b><small>② 기술자 하청</small></div>'+
      '<div class="pick3"><b>'+won(q.c3)+'</b><small>③ 업체 의뢰</small></div>'+
    '</div>'+
    '<div class="fine">③ 업체 의뢰 대비 ① 직접 시공 '+won(q.d31)+'원 · ② 기술자 하청 '+won(q.d32)+'원 절감 · 참고 계산입니다.</div>'+
  '</div>';
}
/* A4 인쇄(PDF) — 한 장에 담는다 */
function printEst(){
  calc();
  var q=LAST;
  var pa=$('#printArea');
  if(!q||!q.area){toast('면적을 먼저 넣어 주세요');return;}
  var bd=(function(){
    try{ if(WZ.src==='photo'&&PH.img){ return {b:$('canvas.bf',$('#stage2')).toDataURL('image/jpeg',0.82), a:$('canvas.af',$('#stage2')).toDataURL('image/jpeg',0.82)}; }
      var st=$('#stage'); return {b:$('canvas.bf',st).toDataURL('image/jpeg',0.82), a:$('canvas.af',st).toDataURL('image/jpeg',0.82)};
    }catch(e){ return null; }
  })();
  var d=new Date(), ymd=d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);
  pa.innerHTML='<h1>인테리어 견적서</h1>'+
    '<p class="m">KTS 원클릭 · autooneclick.com/interior · 문의 010-2002-2899 &nbsp;|&nbsp; 견적일 '+ymd+'</p>'+
    '<table><tbody>'+
      '<tr><th style="width:34mm">공간</th><td>'+q.space+'</td><th style="width:26mm">면적</th><td class="r">'+q.area.toLocaleString('ko-KR')+'㎡ (약 '+(Math.round(q.area/PY*10)/10)+'평)</td></tr>'+
      '<tr><th>벽 마감</th><td>'+q.wall+'</td><th>공사기간</th><td class="r">'+q.days+'일 (1인 기준)</td></tr>'+
      '<tr><th>조명</th><td>'+(q.light||'안 함')+'</td><th>가구</th><td>'+(q.furn||'안 함')+'</td></tr>'+
    '</tbody></table>'+
    '<table><thead><tr><th>공종</th><th>단가·규격</th><th class="r">수량</th><th class="r">금액</th></tr></thead><tbody>'+
      q.items.map(function(it){
        var qty=(it.k==='재료비')?(q.area.toLocaleString('ko-KR')+'㎡'):(it.k==='인건비'?it.nm:'1식');
        return '<tr><td>'+it.k+' · '+it.nm+'</td><td>'+it.spec+'</td><td class="r">'+qty+'</td><td class="r">'+won(it.amt)+'원</td></tr>';
      }).join('')+
      '<tr><td colspan="3" class="r"><b>합계 (재료비 + 인건비)</b></td><td class="r"><b>'+won(q.c2)+'원</b></td></tr>'+
    '</tbody></table>'+
    '<table class="cmp2"><thead><tr><th>시공 방식</th><th>예상 총액</th><th>업체 의뢰 대비</th><th>내가 하는 일</th></tr></thead><tbody>'+
      '<tr><td>① 직접 시공(셀프)</td><td class="r">'+won(q.c1)+'원</td><td class="r">'+won(q.d31)+'원 절감</td><td>자재 주문·시공 전부</td></tr>'+
      '<tr><td>② 기술자 하청</td><td class="r">'+won(q.c2)+'원</td><td class="r">'+won(q.d32)+'원 절감</td><td>자재 주문만</td></tr>'+
      '<tr><td>③ 인테리어 업체 의뢰</td><td class="r">'+won(q.c3)+'원</td><td class="r">기준</td><td>일정만 잡기</td></tr>'+
    '</tbody></table>'+
    (bd?'<div class="ba"><figure><img src="'+bd.b+'" alt="시공 전"><figcaption>시공 전</figcaption></figure><figure><img src="'+bd.a+'" alt="시공 후"><figcaption>시공 후 (합성 이미지)</figcaption></figure></div>':'')+
    '<p class="fine">※ 위 금액은 화면에서 고른 마감·면적·단가로 계산한 <b>참고 견적</b>입니다. 실제 견적은 현장 상태·자재 시세·업체에 따라 달라집니다. 시공 전/후 사진은 사진 위에 자재를 합성한 이미지로, 실제 시공 결과와 다를 수 있습니다. 부가세 별도.</p>';
  setTimeout(function(){window.print();},250);
}
/* A4 PNG — 인쇄와 같은 내용을 그림으로 */
function drawA4(){
  var q=LAST||calc(); if(!q||!q.area){toast('면적을 먼저 넣어 주세요');return null;}
  var W=1240, H=1754, c=document.createElement('canvas'); c.width=W; c.height=H;
  var g=c.getContext('2d');
  var NAVY='#0A1128', INK='#16233D', GRAY='#5A6B85', LINE='#D8DFE9', OR='#FF6B00';
  var M=72;
  g.fillStyle='#fff'; g.fillRect(0,0,W,H);
  var y=M;
  var F=function(sz,w){return (w||700)+' '+sz+'px "Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';};
  g.fillStyle=NAVY; g.fillRect(0,0,W,10);
  g.textBaseline='top'; g.textAlign='left';
  g.fillStyle=NAVY; g.font=F(46,900); g.fillText('인테리어 견적서',M,y);
  g.fillStyle=OR; g.fillRect(M,y+62,86,5);
  g.fillStyle=GRAY; g.font=F(19,700); g.textAlign='right';
  var d=new Date(), ymd=d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);
  g.fillText('KTS 원클릭 · autooneclick.com/interior',W-M,y+6);
  g.fillText('문의 010-2002-2899 · 견적일 '+ymd,W-M,y+34);
  g.textAlign='left';
  y+=96;
  /* 기본 정보 */
  g.fillStyle=INK; g.font=F(19,800);
  g.fillText('공간  '+q.space, M, y);
  g.fillText('면적  '+q.area.toLocaleString('ko-KR')+'㎡ (약 '+(Math.round(q.area/PY*10)/10)+'평)', M+430, y);
  y+=30;
  g.fillText('벽 마감  '+q.wall, M, y);
  g.fillText('공사기간  '+q.days+'일 (1인 기준)', M+430, y);
  y+=30;
  g.fillText('조명  '+(q.light||'안 함'), M, y);
  g.fillText('가구  '+(q.furn||'안 함'), M+430, y);
  y+=44;
  /* 3가지 시공 방식 비교표 */
  var cw=[196,286,286,W-M*2-196-286-286];
  var cx=[M]; for(var ci=1;ci<4;ci++) cx.push(cx[ci-1]+cw[ci-1]);
  function cell(txt,col,row,rowH,opt){
    opt=opt||{};
    g.fillStyle=opt.bg||'#fff'; g.fillRect(cx[col],row,cw[col],rowH);
    g.strokeStyle=LINE; g.lineWidth=1; g.strokeRect(cx[col],row,cw[col],rowH);
    g.fillStyle=opt.fg||INK; g.font=F(opt.sz||17,opt.w||700);
    g.textAlign=opt.center?'center':'left';
    var tx=opt.center?(cx[col]+cw[col]/2):(cx[col]+12);
    var ty=row+(rowH/2)-(opt.sz||17)*0.62+((opt.sub)?-9:0);
    g.fillText(txt,tx,ty);
    if(opt.sub){ g.fillStyle=GRAY; g.font=F(14,700); g.fillText(opt.sub,tx,ty+(opt.sz||17)+5); }
    g.textAlign='left';
  }
  var RH=42;
  cell('시공 방식',0,y,RH,{bg:'#EEF1F6',fg:GRAY,sz:16,w:800});
  cell('① 직접 시공 (셀프)',1,y,RH,{bg:'#EEF1F6',fg:GRAY,sz:16,w:800,center:true});
  cell('② 기술자 하청',2,y,RH,{bg:'#EEF1F6',fg:GRAY,sz:16,w:800,center:true});
  cell('③ 인테리어 업체 의뢰',3,y,RH,{bg:'#FFF3EA',fg:OR,sz:16,w:800,center:true});
  y+=RH;
  cell('예상 총액',0,y,48,{bg:'#F7F9FC',fg:GRAY,sz:16});
  cell(won(q.c1)+'원',1,y,48,{fg:'#1F7A45',sz:23,w:900,center:true});
  cell(won(q.c2)+'원',2,y,48,{fg:INK,sz:23,w:900,center:true});
  cell(won(q.c3)+'원',3,y,48,{fg:OR,sz:23,w:900,center:true,bg:'#FFFBF7'});
  y+=48;
  cell('업체 의뢰 대비',0,y,RH,{fg:GRAY,sz:16});
  cell('-'+won(q.d31)+'원',1,y,RH,{fg:'#1F7A45',sz:18,w:900,center:true});
  cell('-'+won(q.d32)+'원',2,y,RH,{fg:INK,sz:18,w:900,center:true});
  cell('기준',3,y,RH,{fg:GRAY,sz:17,center:true,bg:'#FFFBF7'});
  y+=RH;
  cell('내가 하는 일',0,y,RH,{fg:GRAY,sz:16});
  cell('자재 주문·시공 전부',1,y,RH,{sz:16,center:true});
  cell('자재 주문만',2,y,RH,{sz:16,center:true});
  cell('일정만 잡기',3,y,RH,{sz:16,center:true,bg:'#FFFBF7'});
  y+=RH;
  cell('기간 / 보증',0,y,RH,{fg:GRAY,sz:16});
  cell(Math.round(q.days*1.6)+'일 · 보증 없음',1,y,RH,{sz:16,center:true});
  cell(q.days+'일 · 기사 재량',2,y,RH,{sz:16,center:true});
  cell(q.days+'일 · 업체 A/S',3,y,RH,{sz:16,center:true,bg:'#FFFBF7'});
  y+=RH+30;
  /* 공종 표 */
  var kw=[M,M+320,M+660,W-M-190,W-M];
  function irow(yy,nm,spec,qty,amt,head){
    g.fillStyle=head?'#EEF1F6':'#fff'; g.fillRect(M,yy,W-M*2,34);
    g.strokeStyle=LINE; g.lineWidth=1; g.beginPath(); g.moveTo(M,yy+34); g.lineTo(W-M,yy+34); g.stroke();
    g.fillStyle=head?GRAY:INK; g.font=F(16,head?800:700);
    g.fillText(nm,M+8,yy+9); g.fillText(spec,kw[1],yy+9);
    g.textAlign='right'; g.fillText(qty,kw[3],yy+9); g.fillText(amt,kw[4]-8,yy+9); g.textAlign='left';
  }
  irow(y,'공종','단가·규격','수량','금액',true); y+=34;
  q.items.forEach(function(it){
    var qty=(it.k==='재료비')?(q.area.toLocaleString('ko-KR')+'㎡'):(it.k==='인건비'?it.nm:'1식');
    irow(y,it.k+' · '+it.nm,it.spec,qty,won(it.amt)+'원'); y+=34;
  });
  g.strokeStyle=NAVY; g.lineWidth=2; g.beginPath(); g.moveTo(M,y); g.lineTo(W-M,y); g.stroke();
  g.fillStyle=NAVY; g.font=F(21,900); g.fillText('합계 (재료비 + 인건비)',M+8,y+10);
  g.textAlign='right'; g.fillText(won(q.c2)+'원',W-M-8,y+10); g.textAlign='left';
  y+=58;
  /* 전후 사진 */
  try{
    var el=activeStage(), bf=$('canvas.bf',el), af=$('canvas.af',el);
    if(bf&&bf.width>8){
      var iw=(W-M*2-16)/2, ih=Math.round(iw*bf.height/bf.width);
      var maxH=Math.max(200,H-y-150);
      if(ih>maxH){ ih=maxH; iw=Math.round(ih*bf.width/bf.height); }
      g.drawImage(bf,0,0,bf.width,bf.height,M,y,iw,ih);
      g.drawImage(af,0,0,af.width,af.height,M+iw+16,y,iw,ih);
      g.strokeStyle=LINE; g.lineWidth=1; g.strokeRect(M,y,iw,ih); g.strokeRect(M+iw+16,y,iw,ih);
      g.fillStyle=GRAY; g.font=F(15,700); g.textAlign='center';
      g.fillText('시공 전',M+iw/2,y+ih+7); g.fillText('시공 후 (합성)',M+iw+16+iw/2,y+ih+7);
      g.textAlign='left';
      y+=ih+34;
    }
  }catch(e){}
  /* 유의사항 */
  g.fillStyle=GRAY; g.font=F(15,700);
  var lines=[
    '※ 화면에서 고른 마감·면적·단가로 계산한 참고 견적입니다. 실제 견적은 현장 상태·자재 시세·업체에 따라 다릅니다.',
    '※ 시공 전/후 사진은 사진 위에 자재를 합성한 이미지로, 실제 시공 결과와 다를 수 있습니다. 금액은 부가세 별도입니다.'
  ];
  var fy=Math.min(y,H-86);
  lines.forEach(function(t,i){ g.fillText(t,M,fy+i*24); });
  g.fillStyle=NAVY; g.fillRect(0,H-10,W,10);
  return c;
}
function saveName(){
  var d=new Date(), ymd=''+d.getFullYear()+('0'+(d.getMonth()+1)).slice(-2)+('0'+d.getDate()).slice(-2);
  return 'KTS_인테리어견적서_'+((LAST&&LAST.space)||'')+'_'+ymd+'.png';
}
$('#svA4').addEventListener('click',function(){ var c=drawA4(); if(c) dlPNG(c,saveName()); });
$('#prScreen').addEventListener('click',printEst);
$('#svBA').addEventListener('click',function(){
  var d=new Date(), ymd=''+d.getFullYear()+('0'+(d.getMonth()+1)).slice(-2)+('0'+d.getDate()).slice(-2);
  dlPNG(stageComposite(),'KTS_인테리어_전후_'+ymd+'.png');
});
$('#cpBtn2').addEventListener('click',function(){copy(estText());});
$('#shBtn2').addEventListener('click',share);

/* ---------------- 결과 예시(201) ---------------- */
function renderExamples(){
  var list=SCENES.filter(function(s){return !!s.example;});
  if(!list.length){$('#secEx').hidden=true;return;}
  $('#exGrid').innerHTML=list.map(function(s){
    var e=s.example;
    return '<button type="button" class="excard" data-ex="'+s.id+'">'+
      '<div class="expair">'+
        '<figure><img src="'+e.cb+'" alt="'+s.nm+' 전" loading="lazy"><figcaption>전</figcaption></figure>'+
        '<figure class="a"><img src="'+e.ca+'" alt="'+s.nm+' 후" loading="lazy"><figcaption>후</figcaption></figure>'+
      '</div><div class="t"><b>'+e.title+'</b><small>'+s.nm+' · '+(e.note||'')+'</small></div></button>';
  }).join('');
}
function openExample(sc){
  if(!sc||!sc.example) return;
  var e=sc.example;
  $('#exBox').innerHTML='<h3>'+e.title+'</h3>'+
    '<p class="cap2">같은 구도·같은 가구의 비포/애프터입니다.</p>'+
    '<img src="'+e.before+'" alt="비포"><p class="cap2">시공 전</p>'+
    '<img src="'+e.after+'" alt="애프터"><p class="cap2">시공 후</p>'+
    '<p class="cap2">'+e.note+'</p>'+
    '<div class="row"><button class="btn" type="button" id="exClose">닫기</button>'+
    '<a class="btn p" href="'+e.after+'?print=1" target="_blank" rel="noopener">원본 크게 보기</a></div>';
  $('#exModal').hidden=false;
  $('#exClose').onclick=function(){$('#exModal').hidden=true;};
}
$('#exGrid').addEventListener('click',function(e){
  var b=e.target.closest('[data-ex]'); if(!b) return;
  openExample(scById(b.dataset.ex));
});
$('#exModal').addEventListener('click',function(e){ if(e.target.id==='exModal') $('#exModal').hidden=true; });

/* ---------------- 시작 ---------------- */
function init(){
  buildRates();
  loadSel();
  fetch('regions.json?v=20261126a',{cache:'no-cache'}).then(function(r){if(!r.ok)throw 0;return r.json();}).then(function(j){
    if(!j||!j.scenes||!j.materials) throw 0;
    REG=j; SCENES=j.scenes.slice().sort(function(a,b){return (a.order||0)-(b.order||0);}); MATS=j.materials; READY=true;
  }).catch(function(){
    REG=null; READY=false;
    $('#sampleErr').hidden=false;
  }).then(function(){
    normSel();
    $('#opacityIn').value=Math.round(PH.opacity*100); $('#opacityVal').textContent=Math.round(PH.opacity*100)+'%';
    $('#warmIn').value=PH.warm; $('#warmVal').textContent=(PH.warm>0?'+':'')+PH.warm;
    renderSpaces(); renderExamples(); renderStep(); calc(); paintCnt(); renderSheetPrev();
    if(!READY){ $('#stepBar').innerHTML='<p class="hint">자재 목록을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.</p>'; return; }
    redraw('mat');
    go(1);
  });
}
init();
window.__KTS_INTERIOR=function(){return {state:JSON.parse(JSON.stringify(S)),scene:(curScene()||{}).id,lvl:S.part,
  step:WZ.step,src:WZ.src,
  mat:wallMat()?wallMat().id:null,styleWall:S.styleWall,styleFloor:S.styleFloor,last:LAST,gauge:gS.pos(),
  used:used(),unlocked:unlocked(),photo:!!PH.img,wm:PH.wm,regions:READY?'ok':'fail',sampleOk:sampleOk,
  quad:PH.quad?JSON.parse(JSON.stringify(PH.quad)):null,opacity:PH.opacity,warm:PH.warm,
  mats:MATS.map(function(m){return {id:m.id,nm:m.nm,zone:m.zone,grade:m.grade,styles:stylesOf(m).map(function(s){return s.id+':'+s.nm+':'+s.mult;})};}),
  scenes:SCENES.map(function(s){return {id:s.id,nm:s.nm,w:s.w,h:s.h,example:!!s.example};})};};
window.__KTS_INT={go:go,setStep:function(n){go(n);},center:centerQuad,redrawPhoto:drawPhoto,
  setQuad:function(part,pts){PH.quad[part]=pts.slice();placeHandles();drawPhoto();},drawA4:drawA4};
})();
