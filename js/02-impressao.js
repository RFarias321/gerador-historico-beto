/* Gerador de Histórico do Beto — impressao */
/* ================= DOCUMENTOS PARA ASSINATURA =================
   Lê cada planilha anexada (fichas, atas, dependência) com estilos, mesclagens e imagens,
   desenha no mesmo modelo, acrescenta assinaturas quando pertinente e monta um PDF único. */
const EMU_PT=12700;
const IDX_COLORS={2:'FF0000',8:'000000',9:'FFFFFF',10:'FF0000',12:'0000FF',22:'C0C0C0',23:'808080',55:'969696',64:'000000'};
async function readXlsxModel(buf,sheetName){
  const z=await JSZip.loadAsync(buf);const P=new DOMParser();
  const xml=async p=>{const f=z.file(p);return f?P.parseFromString(await f.async('string'),'application/xml'):null};
  const all=(d,tag)=>d?[...d.getElementsByTagNameNS('*',tag)]:[];
  const kids=(el,tag)=>el?[...el.children].filter(c=>c.localName===tag):[];
  const kid=(el,tag)=>kids(el,tag)[0]||null;
  const RNS='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const relsOf=async path=>{const i=path.lastIndexOf('/');const rp=path.slice(0,i)+'/_rels/'+path.slice(i+1)+'.rels';const d=await xml(rp);const m={};all(d,'Relationship').forEach(r=>m[r.getAttribute('Id')]=r.getAttribute('Target'));return m};
  const resolve=(base,t)=>{if(t.startsWith('/'))return t.slice(1);const parts=base.split('/');parts.pop();for(const seg of t.split('/')){if(seg==='..')parts.pop();else if(seg!=='.')parts.push(seg)}return parts.join('/')};
  const wb=await xml('xl/workbook.xml');const wrel=await relsOf('xl/workbook.xml');
  const sheets=all(wb,'sheet').map(s=>({name:s.getAttribute('name'),rid:s.getAttributeNS(RNS,'id')||s.getAttribute('r:id')}));
  const sh=sheets.find(s=>s.name===sheetName)||sheets[0];const sheetPath=resolve('xl/workbook.xml',wrel[sh.rid]);
  // tema
  const th=await xml('xl/theme/theme1.xml');const tc={};
  const cs=all(th,'clrScheme')[0];if(cs)for(const el of cs.children){const c=el.firstElementChild;if(c)tc[el.localName]=c.getAttribute('lastClr')||c.getAttribute('val')}
  const theme=[tc.lt1||'FFFFFF',tc.dk1||'000000',tc.lt2||'E7E6E6',tc.dk2||'44546A',tc.accent1,tc.accent2,tc.accent3,tc.accent4,tc.accent5,tc.accent6];
  const tint=(hex,t)=>{if(!t)return hex;let [r,g,b]=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255);const mx=Math.max(r,g,b),mn=Math.min(r,g,b);let h=0,s=0,l=(mx+mn)/2;
    if(mx!==mn){const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;h/=6}
    l=t<0?l*(1+t):l*(1-t)+t;const f=(p,q,x)=>{if(x<0)x+=1;if(x>1)x-=1;return x<1/6?p+(q-p)*6*x:x<.5?q:x<2/3?p+(q-p)*(2/3-x)*6:p};
    let R,G,B;if(s===0)R=G=B=l;else{const q=l<.5?l*(1+s):l+s-l*s,p=2*l-q;R=f(p,q,h+1/3);G=f(p,q,h);B=f(p,q,h-1/3)}
    return [R,G,B].map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('').toUpperCase()};
  const color=el=>{if(!el)return null;if(el.getAttribute('rgb'))return el.getAttribute('rgb').slice(-6).toUpperCase();
    if(el.getAttribute('theme')!=null){const c=theme[+el.getAttribute('theme')]||'000000';return tint(c,+(el.getAttribute('tint')||0))}
    if(el.getAttribute('indexed')!=null)return IDX_COLORS[el.getAttribute('indexed')]||'000000';return null};
  // estilos
  const st=await xml('xl/styles.xml');const numFmts={};all(st,'numFmt').forEach(n=>numFmts[n.getAttribute('numFmtId')]=n.getAttribute('formatCode'));
  const fonts=kids(all(st,'fonts')[0],'font').map(f=>({sz:+(kid(f,'sz')||{getAttribute:()=>11}).getAttribute('val')||11,b:!!kid(f,'b')&&kid(f,'b').getAttribute('val')!=='0',i:!!kid(f,'i')&&kid(f,'i').getAttribute('val')!=='0',u:!!kid(f,'u')&&!/none/i.test(kid(f,'u').getAttribute('val')||''),color:color(kid(f,'color'))||'000000',name:(kid(f,'name')||{getAttribute:()=>'Calibri'}).getAttribute('val')}));
  const fills=kids(all(st,'fills')[0],'fill').map(f=>{const p=kid(f,'patternFill');return p&&p.getAttribute('patternType')==='solid'?color(kid(p,'fgColor')):null});
  const borders=kids(all(st,'borders')[0],'border').map(b=>{const o={};for(const s2 of ['left','right','top','bottom']){const e=kid(b,s2);if(e&&e.getAttribute('style'))o[s2[0]]=[e.getAttribute('style'),color(kid(e,'color'))||'000000']}return o});
  const styles=kids(all(st,'cellXfs')[0],'xf').map(x=>{const a=kid(x,'alignment');const nid=x.getAttribute('numFmtId')||'0';
    return {font:{...fonts[+(x.getAttribute('fontId')||0)]},fill:fills[+(x.getAttribute('fillId')||0)]||null,border:borders[+(x.getAttribute('borderId')||0)]||{},
      h:a&&a.getAttribute('horizontal')||null,v:a&&a.getAttribute('vertical')||'bottom',wrap:!!(a&&a.getAttribute('wrapText')==='1'),indent:a?+(a.getAttribute('indent')||0):0,numFmtId:+nid,fmt:numFmts[nid]||null}});
  if(!styles.length)styles.push({font:{sz:11,b:false,i:false,u:false,color:'000000',name:'Calibri'},fill:null,border:{},h:null,v:'bottom',wrap:false,indent:0,numFmtId:0});
  // textos compartilhados (com trechos formatados)
  const ssd=await xml('xl/sharedStrings.xml');
  const sst=all(ssd,'si').map(si=>{const rs=kids(si,'r');if(!rs.length)return all(si,'t').map(t=>t.textContent).join('');
    return {runs:rs.map(r=>{const pr=kid(r,'rPr');const f={};if(pr){if(kid(pr,'b'))f.b=kid(pr,'b').getAttribute('val')!=='0';if(kid(pr,'i'))f.i=true;const sz=kid(pr,'sz');if(sz)f.sz=+sz.getAttribute('val');const nm=kid(pr,'rFont');if(nm)f.name=nm.getAttribute('val');const c=color(kid(pr,'color'));if(c)f.color=c}
      return {t:all(r,'t').map(t=>t.textContent).join(''),f}})}});
  // planilha
  const sd=await xml(sheetPath);const colRef=s=>[...s].reduce((a,ch)=>a*26+ch.charCodeAt(0)-64,0);
  const fmt=kid(all(sd,'sheetFormatPr')[0]&&all(sd,'sheetFormatPr')[0].parentNode,'sheetFormatPr');
  const sfp=all(sd,'sheetFormatPr')[0];const defH=sfp&&sfp.getAttribute('defaultRowHeight')?+sfp.getAttribute('defaultRowHeight'):15;const defW=sfp&&sfp.getAttribute('defaultColWidth')?+sfp.getAttribute('defaultColWidth'):8.43;
  const colsDef=all(sd,'col').map(c=>({min:+c.getAttribute('min'),max:+c.getAttribute('max'),width:+(c.getAttribute('width')||defW),hidden:c.getAttribute('hidden')==='1'}));
  const rows={};let maxR=1,maxC=1;
  for(const rEl of all(sd,'row')){const rn=+rEl.getAttribute('r');const ro={ht:rEl.getAttribute('ht')?+rEl.getAttribute('ht'):null,custom:rEl.getAttribute('customHeight')==='1',hidden:rEl.getAttribute('hidden')==='1',cells:[]};
    for(const c of kids(rEl,'c')){const ref=c.getAttribute('r');const cn=colRef(ref.match(/[A-Z]+/)[0]);const s=+(c.getAttribute('s')||0);const t=c.getAttribute('t');const vEl=kid(c,'v');let val=null;
      if(t==='s'&&vEl)val=sst[+vEl.textContent];else if(t==='inlineStr'){const is=kid(c,'is');val=is?all(is,'t').map(x=>x.textContent).join(''):null}
      else if(t==='str'||t==='e'){val=vEl?vEl.textContent:null}else if(t==='b'){val=vEl?(vEl.textContent==='1'?'VERDADEIRO':'FALSO'):null}else if(vEl){const n=+vEl.textContent;val=isFinite(n)?n:vEl.textContent}
      if(typeof val==='string'&&!val.trim())val=null;
      ro.cells.push({c:cn,s:s<styles.length?s:0,val});
      const sty=styles[s]||{};const hasB=sty.border&&Object.keys(sty.border).length;
      if(val!=null||hasB||sty.fill){if(rn>maxR)maxR=rn;if(cn>maxC)maxC=cn}}
    rows[rn]=ro}
  const merges=all(sd,'mergeCell').map(m=>{const x=m.getAttribute('ref').match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);return x?[colRef(x[1]),+x[2],colRef(x[3]),+x[4]]:null}).filter(Boolean);
  for(const m of merges){const tl=(rows[m[1]]||{cells:[]}).cells.find(c=>c.c===m[0]);if(tl&&tl.val!=null){if(m[3]>maxR)maxR=m[3];if(m[2]>maxC)maxC=m[2]}}
  const pm=all(sd,'pageMargins')[0];const margins=pm?['left','right','top','bottom'].map(k=>+(pm.getAttribute(k)||0.5)):[0.5,0.5,0.75,0.75];
  const ps=all(sd,'pageSetup')[0];const orientation=ps&&ps.getAttribute('orientation')==='landscape'?'l':'p';
  // imagens (logotipo)
  const images=[];const drw=all(sd,'drawing')[0];
  if(drw){const srel=await relsOf(sheetPath);const dpath=resolve(sheetPath,srel[drw.getAttributeNS(RNS,'id')||drw.getAttribute('r:id')]);const dd=await xml(dpath);const drel=await relsOf(dpath);
    for(const an of [...all(dd,'twoCellAnchor'),...all(dd,'oneCellAnchor')]){const blip=all(an,'blip')[0];if(!blip)continue;const rid=blip.getAttributeNS(RNS,'embed')||blip.getAttribute('r:embed');const ip=resolve(dpath,drel[rid]||'');const f=z.file(ip);if(!f)continue;
      const ext=ip.split('.').pop().toLowerCase();const mime=ext==='png'?'image/png':ext==='gif'?'image/gif':'image/jpeg';const url=`data:${mime};base64,`+await f.async('base64');
      const pt=el=>({col:+all(el,'col')[0].textContent+1,colOff:+all(el,'colOff')[0].textContent/EMU_PT,row:+all(el,'row')[0].textContent+1,rowOff:+all(el,'rowOff')[0].textContent/EMU_PT});
      const from=pt(all(an,'from')[0]);let to=null,ext2=null;if(all(an,'to')[0])to=pt(all(an,'to')[0]);else{const e=all(an,'ext')[0];ext2={w:+e.getAttribute('cx')/EMU_PT,h:+e.getAttribute('cy')/EMU_PT}}
      const img=new Image();img.src=url;await img.decode().catch(()=>{});images.push({url,img,mime,from,to,ext:ext2})}}
  const out={styles,colsDef,defW,defH,rows:[],merges,images,margins,orientation,maxC};
  for(let r=1;r<=maxR;r++){const ro=rows[r]||{ht:null,hidden:false,cells:[]};out.rows.push({ht:ro.hidden?0:(ro.ht!=null?ro.ht:defH),auto:!ro.hidden&&!ro.custom,cells:ro.cells.filter(c=>c.c<=maxC)})}
  return out;
}
/* ---- edição do modelo ---- */
const cellText=v=>v==null?'':typeof v==='object'?(v.runs?v.runs.map(r=>r.t).join(''):String(v.v??'')):String(v);
function mStyle(m,base,mods){const s=JSON.parse(JSON.stringify(base!=null?m.styles[base]:{font:{sz:8,b:false,i:false,u:false,color:'000000',name:'Calibri'},fill:null,border:{},h:'center',v:'center',wrap:false,indent:0,numFmtId:0}));
  if(mods.font)Object.assign(s.font,mods.font);for(const k of ['h','v','wrap','fill','border'])if(k in mods)s[k]=mods[k];m.styles.push(s);return m.styles.length-1}
function mFind(m,pred){for(let i=0;i<m.rows.length;i++)for(const c of m.rows[i].cells)if(pred(cellText(c.val),c,i+1))return {r:i+1,cell:c};return null}
function mFindAll(m,pred){const out=[];for(let i=0;i<m.rows.length;i++)for(const c of m.rows[i].cells)if(pred(cellText(c.val),c,i+1))out.push({r:i+1,cell:c});return out}
function mMergeAt(m,r,c){return m.merges.find(x=>x[1]===r&&x[0]===c)||null}
function mInsertRows(m,after,newRows){const n=newRows.length;m.rows.splice(after,0,...newRows);
  m.merges=m.merges.map(x=>x[1]>after?[x[0],x[1]+n,x[2],x[3]+n]:(x[3]>after?[x[0],x[1],x[2],x[3]+n]:x));
  for(const im of m.images){if(im.from.row>after)im.from.row+=n;if(im.to&&im.to.row>after)im.to.row+=n}}
function mSetLabeled(m,label,value){const L=N(label);const hit=mFind(m,t=>N(t).startsWith(L));if(!hit)return;const v=hit.cell.val;
  if(v&&v.runs){const runs=v.runs.map(x=>({t:x.t,f:{...x.f}}));let acc='',k=0;for(;k<runs.length;k++){acc+=runs[k].t;if(N(acc).length>=L.length&&N(acc).startsWith(L))break}
    const keep=runs.slice(0,k+1);const last=runs[runs.length-1];keep.push({t:' '+(value||''),f:{...last.f,b:false}});hit.cell.val={runs:keep}}
  else hit.cell.val=label+' '+(value||'')}
function ddmmyyyy(){const m=String(state.dataLocal||'').match(/(\d{1,2}) de ([a-zç]+) de (\d{4})/i);if(m){const mi=MESES.indexOf(m[2].toLowerCase());if(mi>=0)return String(m[1]).padStart(2,'0')+'/'+String(mi+1).padStart(2,'0')+'/'+m[3]}
  const d=new Date();return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear()}
function isOwnSchool(escola){if(!escola)return true;const k=N(escola);const c=N(esc.censo);const nm=N(String(esc.curto||'').replace(/^C\.?\s*E\.?\s+/i,''));return (c&&k.includes(c))||(nm&&k.includes(nm))}
const EXTRAIDA=()=>`Extraída do sistema Conexão Educação no dia ${ddmmyyyy()}`;
/* bloco de assinaturas: usa a linha "ASSINATURA DO SECRETÁRIO / DIRETOR" da ficha, ou cria uma no fim */
function applySignatures(m,own){
  const labs=mFindAll(m,t=>/^ASSINATURA DO (SECRET|DIRET|INSPET)/i.test(t.trim()));
  if(labs.length){
    const r=labs[0].r;
    if(own){
      if(r>1)m.rows[r-2].ht=Math.max(m.rows[r-2].ht||0,42);
      const sN=mStyle(m,labs[0].cell.s,{font:{b:true,sz:8,color:'000000'},h:'center',v:'center',border:{}});const sM=mStyle(m,labs[0].cell.s,{font:{b:false,sz:7.5,color:'000000'},h:'center',v:'center',border:{}});
      const rowN={ht:12,cells:[]},rowM={ht:11,cells:[]},newMerges=[];
      for(const L of labs){const who=/SECRET/i.test(cellText(L.cell.val))?sig.sec:/DIRET/i.test(cellText(L.cell.val))?sig.dir:null;if(!who)continue;
        const mg=mMergeAt(m,r,L.cell.c);const c1=L.cell.c,c2=mg?mg[2]:L.cell.c;
        rowN.cells.push({c:c1,s:sN,val:who.nome});rowM.cells.push({c:c1,s:sM,val:'Matrícula '+who.mat+(who.id?' · ID '+who.id:'')});
        if(c2>c1)newMerges.push([c1,c2])}
      mInsertRows(m,r,[rowN,rowM]);for(const [c1,c2] of newMerges){m.merges.push([c1,r+1,c2,r+1]);m.merges.push([c1,r+2,c2,r+2])}
    }else{
      const plain={};const noB=s=>{if(plain[s]==null)plain[s]=mStyle(m,s,{border:{}});return plain[s]};
      for(const rr of [r-1,r])if(m.rows[rr-1])for(const c of m.rows[rr-1].cells){c.s=noB(c.s);if(rr===r)c.val=null}
      m.merges=m.merges.filter(x=>!(x[1]===r&&x[3]===r));
      const cs=labs.map(l=>l.cell.c);const c1=Math.min(...cs);let c2=Math.max(...cs);const lm=mMergeAt(m,r,c2);if(lm)c2=lm[2];
      const red=mStyle(m,labs[0].cell.s,{font:{b:true,sz:10,color:'C00000'},h:'center',v:'center',border:{}});
      let cell=m.rows[r-1].cells.find(c=>c.c===c1);if(!cell){cell={c:c1,s:red,val:null};m.rows[r-1].cells.push(cell)}cell.s=red;cell.val=EXTRAIDA();m.merges.push([c1,r,c2,r]);m.rows[r-1].ht=Math.max(m.rows[r-1].ht||0,16)}
    return}
  // sem linha de assinatura: acrescenta no fim
  let c1=m.maxC,c2=1;for(const ro of m.rows)for(const c of ro.cells)if(c.val!=null){c1=Math.min(c1,c.c);c2=Math.max(c2,c.c)}
  for(const mg of m.merges)c2=Math.max(c2,Math.min(mg[2],m.maxC));if(c1>c2){c1=1;c2=m.maxC}
  const base=null;
  if(!own){const red=mStyle(m,base,{font:{b:true,sz:10,color:'C00000'},h:'center',v:'center'});m.rows.push({ht:10,cells:[]});m.rows.push({ht:18,cells:[{c:c1,s:red,val:EXTRAIDA()}]});m.merges.push([c1,m.rows.length,c2,m.rows.length]);return}
  const w=colWidthsPt(m);const total=w.slice(c1,c2+1).reduce((a,b)=>a+b,0);const at=x=>{let acc=0;for(let c=c1;c<=c2;c++){acc+=w[c];if(acc>=x)return c}return c2};
  const half=Math.min(80,total*0.14);const segs=[0.3,0.7].map(f=>[at(total*f-half),at(total*f+half)]);
  const sLine=mStyle(m,base,{font:{sz:7},h:'center',v:'top',border:{t:['thin','000000']}});const sN=mStyle(m,base,{font:{sz:8,b:true},h:'center',v:'center'});const sM=mStyle(m,base,{font:{sz:7.5},h:'center',v:'center'});
  m.rows.push({ht:50,cells:[]});const rL=m.rows.length+1;const lab={ht:12,cells:[]},nm={ht:12,cells:[]},mt={ht:11,cells:[]};
  const who=[sig.sec,sig.dir],title=['ASSINATURA DO SECRETÁRIO','ASSINATURA DO DIRETOR'];
  segs.forEach(([a,b],i)=>{for(let c=a;c<=b;c++)lab.cells.push({c,s:sLine,val:c===a?title[i]:null});nm.cells.push({c:a,s:sN,val:who[i].nome});mt.cells.push({c:a,s:sM,val:'Matrícula '+who[i].mat+(who[i].id?' · ID '+who[i].id:'')})});
  m.rows.push(lab,nm,mt);segs.forEach(([a,b])=>{if(b>a){m.merges.push([a,rL,b,rL]);m.merges.push([a,rL+1,b,rL+1]);m.merges.push([a,rL+2,b,rL+2])}});
}
function colWidthsPt(m){const w=[0];for(let c=1;c<=m.maxC;c++){const k=m.colsDef.find(q=>c>=q.min&&c<=q.max);w[c]=k&&k.hidden?0:Math.round((k?k.width:m.defW)*7)*0.75}return w}
/* destaque do aluno na ata: linha inteira em negrito, fonte 1 ponto maior */
function highlightStudent(m,nome,mat){
  const k=N(nome),km=String(mat||'').replace(/\D/g,'');
  for(const ro of m.rows){const hit=ro.cells.some(c=>{const t=cellText(c.val);return (k&&N(t)===k)||(km&&km.length>=6&&t.replace(/\D/g,'')===km)});if(!hit)continue;
    const map={};for(const c of ro.cells){if(map[c.s]==null){const b=m.styles[c.s];map[c.s]=mStyle(m,c.s,{font:{b:true,sz:(b.font.sz||11)+1},wrap:false})}c.s=map[c.s]}
    ro.ht=Math.max(ro.ht||15,((ro.ht||15)*1.12));ro.auto=false;return true}
  return false}
/* desenho de um modelo numa página */
function paintModel(m,P,page){
  autoFitRows(m);
  const w=colWidthsPt(m);const cx=[0,0];for(let c=1;c<=m.maxC;c++)cx[c+1]=cx[c]+w[c];
  const ry=[0,0];m.rows.forEach((r,i)=>ry[i+2]=ry[i+1]+(r.ht||0));
  const tw=cx[m.maxC+1],th=ry[m.rows.length+1];const ml=14,mt=14;
  const sc=Math.min((page.w-2*ml)/tw,(page.h-2*mt)/th,1.4);const ox=ml+((page.w-2*ml)-tw*sc)/2;
  const X=c=>ox+cx[Math.min(c,m.maxC+1)]*sc,Y=r=>mt+ry[Math.min(r,m.rows.length+1)]*sc;
  const inM=new Map();for(const g of m.merges)for(let r=g[1];r<=g[3];r++)for(let c=g[0];c<=g[2];c++)inM.set(r+':'+c,g);
  const fam=st=>/arial|helvet|liberation sans|sans serif|tahoma|verdana/i.test(st.font.name||'')?'S':'C';
  m.rows.forEach((row,i)=>{const r=i+1;for(const cell of row.cells){const g=inM.get(r+':'+cell.c);if(g&&(g[0]!==cell.c||g[1]!==r))continue;const st=m.styles[cell.s];if(!st||!st.fill)continue;
    if(g)P.rect(X(g[0]),Y(g[1]),X(Math.min(g[2],m.maxC)+1)-X(g[0]),Y(g[3]+1)-Y(g[1]),st.fill);else P.rect(X(cell.c),Y(r),X(cell.c+1)-X(cell.c),Y(r+1)-Y(r),st.fill)}});
  for(const im of m.images){const x1=X(im.from.col)+im.from.colOff*sc,y1=Y(im.from.row)+im.from.rowOff*sc;let x2,y2;
    if(im.to){x2=X(im.to.col)+im.to.colOff*sc;y2=Y(im.to.row)+im.to.rowOff*sc}else{x2=x1+im.ext.w*sc;y2=y1+im.ext.h*sc}
    if(x2>x1&&y2>y1)P.imageUrl(im,x1,y1,x2-x1,y2-y1)}
  m.rows.forEach((row,i)=>{const r=i+1;if(!(row.ht>0))return;
    for(const cell of row.cells){if(cell.val==null)continue;const st=m.styles[cell.s];const g=inM.get(r+':'+cell.c);if(g&&(g[0]!==cell.c||g[1]!==r))continue;
      const rc=g?{x1:X(g[0]),x2:X(Math.min(g[2],m.maxC)+1),y1:Y(g[1]),y2:Y(g[3]+1)}:{x1:X(cell.c),x2:X(cell.c+1),y1:Y(r),y2:Y(r+1)};
      if(rc.x2-rc.x1<0.5)continue;P.fam=fam(st);drawTextDoc(P,st,cell.val,rc,sc)}});
  m.rows.forEach((row,i)=>{const r=i+1;for(const cell of row.cells){const b=(m.styles[cell.s]||{}).border;if(!b)continue;const g=inM.get(r+':'+cell.c);
    const x1=X(cell.c),x2=X(cell.c+1),y1=Y(r),y2=Y(r+1);if(x2-x1<0.01&&y2-y1<0.01)continue;
    const side=(k,a,bb,c,d)=>{const s=b[k];if(!s)return;P.line(a,bb,c,d,BW[s[0]]||.55,s[1],/dot/.test(s[0])?[.6,1]:/dash/i.test(s[0])?[2,1]:null)};
    if(!(g&&cell.c>g[0]))side('l',x1,y1,x1,y2);if(!(g&&cell.c<g[2]))side('r',x2,y1,x2,y2);if(!(g&&r>g[1]))side('t',x1,y1,x2,y1);if(!(g&&r<g[3]))side('b',x1,y2,x2,y2)}});
}
function wrapText(text,maxw,meas){const out=[];let cur='';
  const pushWord=w=>{while(w&&meas(w)>maxw){let k=w.length-1;while(k>1&&meas(w.slice(0,k))>maxw)k--;out.push(w.slice(0,k));w=w.slice(k)}return w};
  for(const w of String(text).split(' ')){const tryS=cur?cur+' '+w:w;if(meas(tryS)<=maxw){cur=tryS;continue}if(cur)out.push(cur);cur=pushWord(w)}
  out.push(cur);return out}
/* linhas sem altura fixa crescem como no Excel quando o texto quebra */
let FIT_CTX=null;
function autoFitRows(m){if(m._fit)return;m._fit=true;if(!FIT_CTX)FIT_CTX=document.createElement('canvas').getContext('2d');const ctx=FIT_CTX;
  const w=colWidthsPt(m);const mg=new Map();for(const g of m.merges)mg.set(g[1]+':'+g[0],g);const inM=new Set();for(const g of m.merges)for(let r=g[1];r<=g[3];r++)for(let c=g[0];c<=g[2];c++)if(r!==g[1]||c!==g[0])inM.add(r+':'+c);
  m.rows.forEach((row,i)=>{if(!row.auto)return;const r=i+1;let need=row.ht||0;
    for(const cell of row.cells){const st=m.styles[cell.s];if(!st||!st.wrap||cell.val==null||inM.has(r+':'+cell.c))continue;const g=mg.get(r+':'+cell.c);if(g&&g[3]!==r)continue;
      const t=cell.val&&cell.val.runs?cell.val.runs.map(x=>x.t).join(''):String(cell.val);if(!t.trim())continue;let cw=0;for(let c=cell.c;c<=(g?g[2]:cell.c);c++)cw+=w[c]||0;
      const f=st.font;ctx.font=`${f.i?'italic ':''}${f.b?'700 ':'400 '}${f.sz}px ${/arial|helvet|liberation sans/i.test(f.name||'')?'LibSans, Arial':'Carlito, Calibri'}, sans-serif`;
      const n=t.split('\n').reduce((a,ln)=>a+wrapText(ln,cw-1,x=>ctx.measureText(x).width).length,0);need=Math.max(need,n*f.sz*1.2+3)}
    row.ht=need})}
function drawTextDoc(P,st,val,rc,sc){
  const f=st.font;let runs;
  if(val&&val.runs){runs=val.runs.filter(x=>x.t).map(x=>({t:x.t,sz:x.f.sz??f.sz,b:x.f.b??f.b,i:x.f.i??f.i,color:x.f.color||f.color}))}
  else{const t=typeof val==='number'?(Number.isInteger(val)?String(val):String(+val.toFixed(6))):String(val);if(!t)return;runs=[{t,sz:f.sz,b:f.b,i:f.i,color:f.color}]}
  const isNum=typeof val==='number';const h=st.h||(isNum?'right':'left');const sz=Math.max(...runs.map(x=>x.sz));
  const W=x=>{P.font(x.b,x.i,x.sz*sc);return P.width(x.t)};
  let lines;if(runs.length===1){lines=runs[0].t.replace(/\s+$/,'').split('\n').map(t=>[{...runs[0],t}]);
    if(st.wrap){const maxw=rc.x2-rc.x1-1*sc;const out=[];for(const ln of lines)for(const t of wrapText(ln[0].t,maxw,t=>W({...ln[0],t})))out.push([{...ln[0],t}]);lines=out}}
  else lines=[runs];
  const lh=sz*1.2*sc,n=lines.length;let y0;
  if(st.v==='center')y0=(rc.y1+rc.y2)/2-(n-1)*lh/2+sz*.3*sc;else if(st.v==='top')y0=rc.y1+(sz*.85+1)*sc;else y0=rc.y2-(sz*.22+1)*sc-(n-1)*lh;
  lines.forEach((ln,li)=>{const w=ln.reduce((a,x)=>a+W(x),0);const pad=(1.6+(st.indent||0)*6.75)*sc;let x=h==='center'||h==='centerContinuous'?(rc.x1+rc.x2)/2-w/2:h==='right'?rc.x2-pad-w:rc.x1+pad;const y=y0+li*lh;
    for(const x0 of ln){const ww=W(x0);P.text(x0.t,x,y,x0.color||'000000');if(f.u)P.line(x,y+x0.sz*.12*sc,x+ww,y+x0.sz*.12*sc,Math.max(.4,x0.sz*.06*sc),x0.color||'000000',null);x+=ww}})}
/* pintores com família de fonte e imagens */
function canvasPainterDoc(ctx){const P={fam:'C',
  font(b,i,s){ctx.font=`${i?'italic ':''}${b?'700 ':'400 '}${s}px ${P.fam==='S'?'LibSans, Arial':'Carlito, Calibri'}, sans-serif`},
  width:t=>ctx.measureText(t).width,text(t,x,y,c){ctx.fillStyle='#'+c;ctx.fillText(t,x,y)},
  line(x1,y1,x2,y2,w,c,d){ctx.beginPath();ctx.setLineDash(d||[]);ctx.lineWidth=w;ctx.strokeStyle='#'+c;ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()},
  rect(x,y,w,h,c){ctx.fillStyle='#'+c;ctx.fillRect(x,y,w,h)},
  imageUrl(im,x,y,w,h){if(im.img&&im.img.complete)ctx.drawImage(im.img,x,y,w,h)},image(x,y,w,h){if(LOGO_IMG&&LOGO_IMG.complete)ctx.drawImage(LOGO_IMG,x,y,w,h)}};return P}
function pdfPainterDoc(doc){const P={fam:'C',
  font(b,i,s){doc.setFont(P.fam==='S'?'LibSans':'Carlito',b&&i?'bolditalic':b?'bold':i?'italic':'normal');doc.setFontSize(s)},
  width:t=>doc.getTextWidth(t),text(t,x,y,c){doc.setTextColor('#'+c);doc.text(t,x,y)},
  line(x1,y1,x2,y2,w,c,d){doc.setDrawColor('#'+c);doc.setLineWidth(w);doc.setLineDashPattern(d||[],0);doc.line(x1,y1,x2,y2)},
  rect(x,y,w,h,c){doc.setFillColor('#'+c);doc.rect(x,y,w,h,'F')},
  imageUrl(im,x,y,w,h){doc.addImage(im.url,im.mime==='image/png'?'PNG':'JPEG',x,y,w,h,undefined,'FAST')},image(x,y,w,h){doc.addImage(LOGO_URL,'PNG',x,y,w,h,'logo','FAST')}};return P}
/* ---- montagem da sequência ---- */
let DEP_TPL=null,LIBSANS=null;
async function loadPackAssets(){
  if(!DEP_TPL)DEP_TPL=await fetch('modelo_dep.txt').then(r=>{if(!r.ok)throw new Error('modelo de dependência');return r.text()}).then(t=>Uint8Array.from(atob(t.trim()),c=>c.charCodeAt(0)).buffer);
  if(!LIBSANS){LIBSANS={};for(const [k,f] of Object.entries({normal:'libsans-Regular.ttf',bold:'libsans-Bold.ttf',italic:'libsans-Italic.ttf',bolditalic:'libsans-BoldItalic.ttf'})){const buf=await fetch(f).then(r=>r.arrayBuffer());LIBSANS[k]=b64(buf);
    try{const ff=new FontFace('LibSans',buf,{weight:k.includes('bold')?'700':'400',style:k.includes('italic')?'italic':'normal'});await ff.load();document.fonts.add(ff)}catch(e){}}}
}
async function depModel(dep,p){
  const m=await readXlsxModel(DEP_TPL.slice(0),'Dependencia');const A=state.aluno;
  mSetLabeled(m,'NOME DO ALUNO :',(A.nome||'').toUpperCase());mSetLabeled(m,'DATA DE NASCIMENTO :',A.nascimento||'');
  mSetLabeled(m,'NATURAL:',(A.naturalidade||'').toUpperCase());mSetLabeled(m,'PAI:',(A.pai||'').toUpperCase());mSetLabeled(m,'MÃE:',(A.mae||'').toUpperCase());
  mSetLabeled(m,'SEXO','');const perEsc=p!=null&&state.periods[p]?state.periods[p].escola:'';const ownDep=!perEsc||isOwnSchool(perEsc);mSetLabeled(m,'ESCOLA:',ownDep?`${esc.censo} - ${esc.curto}`:String(perEsc).toUpperCase());mSetLabeled(m,'ANO:',String(dep.ano||''));mSetLabeled(m,'CURSO:','MÉDIO');mSetLabeled(m,'TURMA:','');mSetLabeled(m,'SÉRIE:','');mSetLabeled(m,'TURNO:','');mSetLabeled(m,'PERÍODO:','');
  const hd=mFind(m,t=>N(t)==='DISCIPLINA');
  if(hd){const r=hd.r+1;const row=m.rows[r-1];const cols={};for(const c of m.rows[hd.r-1].cells){const k=N(cellText(c.val));if(k==='CH')cols.ch=c.c;if(k==='FINAL')cols.fin=c.c;if(k==='PONTOS')cols.pts=c.c}
    for(const c of row.cells)c.val=null;const put=(c,v)=>{if(!c)return;let cell=row.cells.find(x=>x.c===c);if(!cell){cell={c,s:row.cells[0]?row.cells[0].s:0,val:null};row.cells.push(cell)}cell.val=v};
    const subj=state.subjects.find(s=>canon(s.name).key===canon(dep.disc||'').key);const ch=subj&&p!=null?num((subj.g[p]||{}).ch):null;
    put(hd.cell.c,dep.disc||'');if(ch!=null)put(cols.ch,String(ch));if(dep.nota)put(cols.fin,String(dep.nota));
    const tot=m.rows[r];if(tot)for(const c of tot.cells){if(c.c===cols.ch)c.val=ch!=null?String(ch):null;else if(c.val!=null&&/^\d/.test(cellText(c.val)))c.val=null}}
  applySignatures(m,ownDep);return m;
}
function periodOfDep(d){
  if(d.p!=null&&state.periods[d.p])return d.p;if(d.auto!=null&&state.periods[d.auto])return d.auto;
  const k=canon(d.disc||'').key;const P=state.periods;const failed=i=>state.subjects.some(s=>canon(s.name).key===k&&isDep(s.g[i],null));
  let idx=P.map((p,i)=>i).filter(i=>String(P[i].ano)===String(d.ano));
  if(!idx.length){const prev=P.map((p,i)=>i).filter(i=>!(+P[i].ano>+d.ano));const cd=prev.filter(i=>P[i].sit==='APROV. C/DEP');const fl=cd.filter(failed);
    const pick=fl.length?fl:cd.length?cd:prev.length?prev:P.map((p,i)=>i);return pick.length?pick[pick.length-1]:null}
  const best=idx.filter(i=>P[i].sit==='APROV. C/DEP'&&failed(i));
  return (best.length?best:idx)[(best.length?best:idx).length-1];
}
async function buildPackPages(){
  await loadPackAssets();const pages=[];const own=isOwnSchool;
  // cada arquivo uma vez só, mesmo que tenha sido anexado repetido
  const fx=[];{const seen=new Set();for(const f of files){if(!f.ok||!f.src||f.dup)continue;const k=srcFp(f);if(k&&seen.has(k))continue;seen.add(k);fx.push(f)}}
  // 1. ficha de matrícula
  {const m=fx.flatMap(f=>f.src.docs.filter(d=>d.role==='mat').map(d=>[f,d]));if(m.length)pages.push(...await sourcePages(m[0][0],m[0][1]))}
  if(!fx.some(f=>f.src.docs.some(d=>d.role==='mat'))&&matHasData())pages.push(matPage(null));
  // 2. por série/módulo: fichas e, logo depois, as dependências daquele período
  const depsDone=new Set();
  for(let p=0;p<nPer();p++){
    for(const f of fx)for(const d of f.src.docs.filter(d=>d.role==='fia'&&d.p===p)){const pg=await sourcePages(f,d);pages.push(...pg)}
    for(const dep of state.deps){if(periodOfDep(dep)!==p)continue;const k=canon(dep.disc||'').key;
      let printed=false;
      for(const f of fx)for(const d of f.src.docs.filter(d=>d.role==='dep'&&(d.subjects||[]).some(s=>canon(s).key===k))){const key=f.name+'|'+d.sheet;if(depsDone.has(key)){printed=true;continue}depsDone.add(key);pages.push(...await sourcePages(f,d));printed=true}
      if(!printed){const m=await depModel(dep,p);pages.push({orient:'l',model:m,title:'Dependência · '+(dep.disc||'')+' (gerada)'})}}
  }
  for(const dep of state.deps)if(periodOfDep(dep)==null){const m=await depModel(dep,null);pages.push({orient:'l',model:m,title:'Dependência '+(dep.disc||'')})}
  // dependências enviadas sem período identificado
  for(const f of fx)for(const d of f.src.docs.filter(d=>d.role==='dep')){const key=f.name+'|'+d.sheet;if(!depsDone.has(key)){depsDone.add(key);pages.push(...await sourcePages(f,d))}}
  // 3. atas de resultados finais, por ano e série/módulo
  const arfs=[];for(const f of fx)for(const d of f.src.docs.filter(d=>d.role==='arf'))arfs.push({f,d});
  arfs.sort((a,b)=>((+a.d.ano||0)*10+(+a.d.serie||0))-((+b.d.ano||0)*10+(+b.d.serie||0)));
  for(const {f,d} of arfs)pages.push(...await sourcePages(f,d));
  // 4. histórico
  pages.push({orient:'p',hist:true,title:'Histórico escolar'});
  return pages;
}
async function sourcePages(f,d){
  if(d.role==='mat'&&(matHasData()||state.aluno.nome))return [matPage(await matExtras(f,d))];
  const own=isOwnSchool(d.escola);
  if(f.src.kind==='xlsx'){const m=await readXlsxModel(f.src.buf.slice(0),d.sheet);
    if(d.role==='arf'){highlightStudent(m,state.aluno.nome,state.aluno.matricula);applySignatures(m,own);return [{orient:'l',model:m,title:'Ata · '+(d.serie?(state.mode==='eja'?d.serie+'º módulo':d.serie+'ª série')+' · ':'')+(d.ano||'')}]}
    if(d.role==='mat')return [{orient:'p',model:m,title:'Ficha de matrícula'}];
    if(d.role==='dep'){const dd=state.deps.find(x=>x.ano&&(d.subjects||[]).some(t=>canon(t).key===canon(x.disc||'').key));if(dd&&String(dd.ano)!==String(d.ano||''))mSetLabeled(m,'ANO:',String(dd.ano))}
    applySignatures(m,own);return [{orient:'l',model:m,title:d.role==='dep'?'Dependência · '+((d.subjects||[]).join(', ')||d.ano||''):'FIA · '+(d.p!=null?LABELS[state.mode][d.p]+' · ':'')+(d.ano||'')}]}
  // PDF ou imagem: páginas como imagem, sem alterar o documento
  const out=[];const canv=f.src.kind==='pdf'?await pdfToCanvases(f.src.buf.slice(0),8):[await imageToCanvas(new Blob([f.src.buf]))];
  for(const c of canv){const k=Math.min(1,1800/Math.max(c.width,c.height));const d2=document.createElement('canvas');d2.width=Math.round(c.width*k);d2.height=Math.round(c.height*k);d2.getContext('2d').drawImage(c,0,0,d2.width,d2.height);
    out.push({orient:d.role==='mat'?'p':(c.width>c.height?'l':'p'),raster:d2.toDataURL('image/jpeg',.9),title:d.role})}
  return out;
}
const A4={p:{w:595.28,h:841.89},l:{w:841.89,h:595.28}};
/* ata muito larga: folha A4 vertical com o conteúdo girado (lê-se virando a folha), para não ficar ilegível */
function modelAspect(m){const w=colWidthsPt(m);let tw=0;for(let c=1;c<=m.maxC;c++)tw+=w[c]||0;const th=m.rows.reduce((a,r)=>a+(r.ht||0),0);return th?tw/th:1}
async function rotatedPng(pg){const page=A4.p,k=3;const cv=document.createElement('canvas');cv.width=Math.round(page.w*k);cv.height=Math.round(page.h*k);const ctx=cv.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,cv.width,cv.height);
  for(const im of pg.model.images)if(im.img&&im.img.decode)await im.img.decode().catch(()=>{});
  ctx.setTransform(k,0,0,k,0,0);ctx.translate(0,page.h);ctx.rotate(-Math.PI/2);ctx.lineCap='square';paintModel(pg.model,canvasPainterDoc(ctx),A4.l);
  return cv.toDataURL('image/png')}
async function packPdf(pages){
  for(const pg of pages)if(pg.rot&&!pg.raster){pg.raster=await rotatedPng(pg);pg.rasterFmt='PNG'}
  const doc=new jspdf.jsPDF({unit:'pt',format:'a4',orientation:pages[0].orient==='l'?'landscape':'portrait'});
  for(const [k,f] of Object.entries(FONT_FILES)){doc.addFileToVFS(f,FONTB64[k]);doc.addFont(f,'Carlito',k)}
  for(const [k,f] of Object.entries({normal:'libsans-Regular.ttf',bold:'libsans-Bold.ttf',italic:'libsans-Italic.ttf',bolditalic:'libsans-BoldItalic.ttf'})){doc.addFileToVFS(f,LIBSANS[k]);doc.addFont(f,'LibSans',k)}
  pages.forEach((pg,i)=>{if(i>0)doc.addPage('a4',pg.orient==='l'?'landscape':'portrait');const page=A4[pg.orient];
    if(pg.hist){paintSheet(buildSheet(state),pdfPainter(doc))}
    else if(pg.draw){const P=pdfPainterDoc(doc);pg.draw(P,page)}
    else if(pg.raster){const ip=doc.getImageProperties(pg.raster);const s=Math.min(page.w/ip.width,page.h/ip.height);doc.addImage(pg.raster,pg.rasterFmt||'JPEG',(page.w-ip.width*s)/2,(page.h-ip.height*s)/2,ip.width*s,ip.height*s)}
    else paintModel(pg.model,pdfPainterDoc(doc),page)});
  doc.setProperties({title:'Documentos para assinatura — '+(state.aluno.nome||'')});
  return doc.output('blob');
}
async function packImages(pages){
  const out=[];for(const pg of pages){const page=A4[pg.orient];if(pg.rot&&!pg.raster){pg.raster=await rotatedPng(pg)}if(pg.raster){out.push({orient:pg.orient,url:pg.raster});continue}
    const k=3;const cv=document.createElement('canvas');cv.width=Math.round(page.w*k);cv.height=Math.round(page.h*k);const ctx=cv.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,cv.width,cv.height);ctx.setTransform(k,0,0,k,0,0);ctx.lineCap='square';
    if(pg.hist)paintSheet(buildSheet(state),canvasPainter(ctx));else if(pg.draw)pg.draw(canvasPainterDoc(ctx),page);else paintModel(pg.model,canvasPainterDoc(ctx),page);
    out.push({orient:pg.orient,url:URL.createObjectURL(await new Promise(r=>cv.toBlob(r,'image/png')))})}
  return out;
}
async function printPack(mode){
  if(!READY)return;const btn=$('#btn-pack');btn.disabled=true;setStatus('Montando os documentos para assinatura…');
  try{
    let pages=await buildPackPages();
    if(!window.PACK_NO_PREVIEW){const pick=await packPreview(pages,mode);if(!pick){setStatus('');return}pages=pick.pages;mode=pick.mode}
    if(mode==='pdf'||IN_CLAUDE){const blob=await packPdf(pages);const nome=(state.aluno.nome||'aluno').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_|_$/g,'');const filename=`Documentos_assinatura_${nome}.pdf`;
      if(DL===null&&window.claude&&claude.use)DL=await claude.use('downloads').catch(()=>null);
      if(DL)await DL.save({filename,data:blob});else{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();a.remove()}
      setStatus(`${pages.length} página(s) prontas: ${filename}.`+(IN_CLAUDE&&mode!=='pdf'?' Dentro do Claude a impressão direta é bloqueada; imprima o PDF.':''));return}
    // impressão do PDF vetorial: texto e linhas nítidos, como impressão nova
    const url=URL.createObjectURL(await packPdf(pages));
    let fr=document.getElementById('printframe');if(fr)fr.remove();fr=document.createElement('iframe');fr.id='printframe';fr.setAttribute('aria-hidden','true');fr.style.cssText='position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0';
    await new Promise(res=>{fr.onload=res;fr.src=url;document.body.appendChild(fr);setTimeout(res,4000)});
    try{await new Promise(r=>setTimeout(r,400));fr.contentWindow.focus();fr.contentWindow.print();setStatus(`${pages.length} página(s) enviadas para a impressão.`)}
    catch(e){window.open(url,'_blank');setStatus(`${pages.length} página(s) abertas em nova aba: use Imprimir do leitor de PDF.`)}
  }catch(e){console.error(e);setStatus('Não foi possível montar os documentos: '+(e.message||e),true)}
  finally{btn.disabled=false}
}
