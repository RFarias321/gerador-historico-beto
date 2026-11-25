/* Gerador de Histórico do Beto — núcleo: leitura dos documentos, histórico, Excel e PDF */
"use strict";
/* ============ utilidades ============ */
const $=s=>document.querySelector(s);
const N=s=>String(s??'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().replace(/[^A-Z0-9%]/g,'');
const esc_=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const colL=c=>{let s='';while(c>0){const m=(c-1)%26;s=String.fromCharCode(65+m)+s;c=(c-m-1)/26}return s};
const PH='(preencher)';
function num(v){
  if(v==null)return null;
  if(typeof v==='number')return isFinite(v)?v:null;
  let s=String(v).trim().replace(/\s/g,'');
  if(!s)return null;
  const pct=s.endsWith('%');s=s.replace('%','');
  if(/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s))s=s.replace(/\./g,'');
  s=s.replace(',','.');
  if(!/^-?\d+(\.\d+)?$/.test(s))return null;
  const n=parseFloat(s);return pct?n/100:n;
}
const fmtIn=n=>n==null||n===''?'':String(+(+n).toFixed(4)).replace('.',',');
function serialToBR(v){const d=new Date(Math.round((v-25569)*86400000));return String(d.getUTCDate()).padStart(2,'0')+'/'+String(d.getUTCMonth()+1).padStart(2,'0')+'/'+d.getUTCFullYear()}
function brToSerial(s){const m=String(s||'').trim().match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);if(!m)return null;let y=+m[3];if(y<100)y+=y>40?1900:2000;return Date.UTC(y,+m[2]-1,+m[1])/86400000+25569}
function dateStr(v){
  if(v instanceof Date&&!isNaN(v))return String(v.getDate()).padStart(2,'0')+'/'+String(v.getMonth()+1).padStart(2,'0')+'/'+v.getFullYear();
  if(typeof v==='number'&&v>3000&&v<80000)return serialToBR(v);
  const s=String(v??'').trim();const m=s.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);return m?m[1].padStart(2,'0')+'/'+m[2].padStart(2,'0')+'/'+m[3]:s;
}
const MESES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
function hojeLinha(){const d=new Date();const c=(typeof esc!=='undefined'&&esc.municipio)?titleCase(esc.municipio):'Rio de Janeiro';return `${c}, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`}
const SMALL=new Set(['de','da','do','das','dos','e','di','du']);
const titleCase=s=>{s=String(s||'').trim();if(s!==s.toUpperCase())return s;return s.toLowerCase().split(/\s+/).map((w,i)=>i&&SMALL.has(w)?w:w.charAt(0).toUpperCase()+w.slice(1)).join(' ')};
function mapSit(t){const k=N(t);if(!k)return '';if(/CLASSIFICAD/.test(k)&&!/RECLASSIF/.test(k))return 'CLASSIFICADO (OBS.)';if(/DEPENDENCIA|COMDEP|CDEP$|CDEP[^A-Z]/.test(k))return 'APROV. C/DEP';if(/(REPROVADO|RETIDO)POR(FALTA|FREQ)/.test(k))return 'REP FREQ';if(/REPROVADO|RETIDO/.test(k))return 'REP NOTA';if(/PROMOVID/.test(k))return 'PROMOV';if(/APROVAD/.test(k))return 'APROVADO';return ''}
function findSit(rows){for(const r of rows)for(const t of r.toks){const m=t.t.match(/CONSIDERAD[OA]\s*(?:\(A\))?\s*:\s*(.+)$/i);if(m)return mapSit(m[1])}return ''}
const store={get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};

/* ============ recursos ============ */
const SPEC={},TPL={},FONTB64={};let LOGO_URL=null,LOGO_IMG=null,READY=false;
const FONT_FILES={normal:'carlito-Regular.ttf',bold:'carlito-Bold.ttf',italic:'carlito-Italic.ttf',bolditalic:'carlito-BoldItalic.ttf'};
function b64(buf){let s='';const u=new Uint8Array(buf);for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s)}
async function loadAssets(){
  const get64=u=>fetch(u).then(r=>{if(!r.ok)throw new Error(u);return r.text()}).then(t=>Uint8Array.from(atob(t.trim()),c=>c.charCodeAt(0)).buffer);
  const get=(u,t)=>fetch(u).then(r=>{if(!r.ok)throw new Error(u);return t==='json'?r.json():r.arrayBuffer()});
  const [se,sr,te,tr]=await Promise.all([get('spec_eja.json','json'),get('spec_reg.json','json'),get64('modelo_eja.txt'),get64('modelo_reg.txt')]);
  SPEC.eja=se;SPEC.reg=sr;TPL.eja=te;TPL.reg=tr;
  /* letras do histórico 10% maiores (mais fáceis de ler), em proporção */
  for(const sp of [se,sr])for(const st of sp.styles)if(st&&st.font&&st.font.sz)st.font.sz=Math.round(st.font.sz*FONT_K*2)/2;
  for(const sp of [se,sr]){sp.mrg=sp.merges.map(m=>{const x=m.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);const cn=s=>[...s].reduce((a,ch)=>a*26+ch.charCodeAt(0)-64,0);return [cn(x[1]),+x[2],cn(x[3]),+x[4]]})}
  const z=await JSZip.loadAsync(te);const png=await z.file('xl/media/image1.png').async('base64');
  LOGO_URL='data:image/png;base64,'+png;
  LOGO_IMG=new Image();LOGO_IMG.src=LOGO_URL;await LOGO_IMG.decode().catch(()=>{});
  await Promise.all(Object.entries(FONT_FILES).map(async([k,f])=>{
    const buf=await get(f);FONTB64[k]=b64(buf);
    try{const ff=new FontFace('Carlito',buf,{weight:k.includes('bold')?'700':'400',style:k.includes('italic')?'italic':'normal'});await ff.load();document.fonts.add(ff)}catch(e){}
  }));
  if(window.pdfjsLib)pdfjsLib.GlobalWorkerOptions.workerSrc='pdf.worker.min.js';
  const cr=$('#crest');if(cr){cr.src=LOGO_URL;cr.hidden=false}
  READY=true;
}

/* ============ estado ============ */
const LABELS={reg:['1ª série','2ª série','3ª série'],eja:['1º módulo','2º módulo','3º módulo','4º módulo']};
const ORD=['1º','2º','3º','4º'];
const CLASSIF='CLASSIFICADO (OBS.)';
const SIT=['','APROVADO','APROV. C/DEP','PROMOV',CLASSIF,'REP FREQ','REP NOTA'];
const ALIAS={ARTES:'ARTE',EDFISICA:'EDUCACAOFISICA',EDUCACAOFISICAI:'EDUCACAOFISICA',INGLES:'LINGUAINGLESA',LINGUAESTRANGEIRAINGLES:'LINGUAINGLESA',LINGUAESTRANGEIRAMODERNAINGLES:'LINGUAINGLESA',PORTUGUES:'LINGUAPORTUGUESALITERATURA',LINGUAPORTUGUESA:'LINGUAPORTUGUESALITERATURA',LINGUAPORTUGUESAELITERATURA:'LINGUAPORTUGUESALITERATURA',LITERATURA:'LINGUAPORTUGUESALITERATURA',PORTUGUESLITERATURA:'LINGUAPORTUGUESALITERATURA',MATEMATICAI:'MATEMATICA'};
/* Nomes e matrículas de quem assina NÃO ficam no código público: cada escola preenche no item 6 (fica salvo no navegador). */
const DEFAULT_SIG={sec:{nome:'',mat:'',id:'',cargo:'Secretário(a) Escolar',escola:'Colégio Estadual Oswaldo Teixeira'},dir:{nome:'',mat:'',id:'',cargo:'Diretor(a) Geral',escola:'Colégio Estadual Oswaldo Teixeira'}};
const ALUNO_FIELDS=[['nome','Nome do aluno','wide'],['matricula','Nº matrícula'],['nascimento','Data de nascimento','','dd/mm/aaaa'],['nacionalidade','Nacionalidade'],['naturalidade','Naturalidade'],['mae','Filiação — mãe','wide'],['pai','Filiação — pai','wide'],['identidade','Identidade'],['orgao','Órgão expedidor'],['expedicao','Data de expedição','','dd/mm/aaaa']];
const DEFAULT_ESC={nome:'COLÉGIO ESTADUAL OSWALDO TEIXEIRA',curto:'CE OSWALDO TEIXEIRA',endereco:'RUA MILÃO 95',municipio:'RIO DE JANEIRO',uf:'RJ',cep:'21311-430',decreto:'32.416',do:'17/12/2002',ua:'186959',censo:'33140049'};
const ESC_FIELDS=[['nome','Nome completo da escola','wide'],['curto','Nome curto (tabela “Onde cursou”)'],['endereco','Endereço','wide'],['municipio','Município'],['uf','UF'],['cep','CEP'],['decreto','Decreto nº'],['do','D.O. (data)'],['ua','U.A.'],['censo','Censo Escolar']];
let esc=Object.assign({},DEFAULT_ESC,store.get('hist.esc')||{});
let state,sig=Object.assign({},DEFAULT_SIG,store.get('hist.sig')||{});
let files=[];
let SESSION=0;
function resetAll(){
  SESSION++;
  state=blankState(state&&state.mode||'reg');files=[];ocrProgress=null;CONF_RUN++;CONF={state:'idle',items:[],sig:''};try{$('#gate').hidden=true}catch(e){}
  try{$('#file').value=''}catch(e){}
  renderFiles();renderAll();
  const ok=!state.subjects.length&&!state.deps.length&&!files.length&&!state.obsExtra&&ALUNO_FIELDS.every(([k])=>k==='nacionalidade'||!state.aluno[k])&&state.periods.every(p=>!p.ano&&!p.freq&&!p.sit);
  return ok;
}
function nomeParecido(a,b){
  const w=t=>String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().split(/[^A-Z]+/).filter(x=>x.length>2&&!['DOS','DAS','DES'].includes(x));
  const A=w(a),B=w(b);if(!A.length||!B.length)return true;const inter=A.filter(x=>B.includes(x)).length;return inter/Math.min(A.length,B.length)>=0.6;
}
function outroAluno(nome){return !!(nome&&state.aluno.nome&&!state.example&&!nomeParecido(state.aluno.nome,nome))}
const OUTRO_MSG=n=>`Este documento é de outro aluno (${n}) e não foi usado. Para fazer o histórico dele, clique em “Novo aluno” e anexe de novo.`;
const blankG=()=>({nota:'',ch:'',media:null,pad:false});
function blankState(mode){
  const n=mode==='eja'?4:3;
  return {mode,example:false,notaFonte:'total',
    aluno:{nome:'',matricula:'',nascimento:'',nacionalidade:'Brasileira',naturalidade:'',mae:'',pai:'',identidade:'',orgao:'',expedicao:''},
    periods:Array.from({length:n},()=>({ano:'',freq:'',sit:'',escola:esc.curto,municipio:`${esc.municipio}/${esc.uf}`,semestre:''})),
    subjects:[],deps:[],obsExtra:'',dataLocal:hojeLinha()};
}
function exampleState(mode){
  const st=blankState(mode),sp=SPEC[mode],n=sp.ncols;st.example=true;
  st.aluno=Object.assign(st.aluno,{nome:'ALUNO(A) DE EXEMPLO',matricula:'2023 0000 0000',nascimento:'02/02/2008',naturalidade:'Rio de Janeiro',mae:'Nome da Mãe',pai:'Nome do Pai',identidade:'000000000',orgao:'DETRAN / RJ',expedicao:'02/02/2020'});
  const yr=mode==='eja'?[2024,2024,2025,2025]:[2023,2024,2025];
  st.periods.forEach((p,i)=>{p.ano=String(yr[i]);p.sit='APROVADO';p.freq=['94,24','94,03','97,03','95,10'][i]});
  for(let r=31;r<=50;r++){
    const cells={};for(const c of sp.rows[r].cells)cells[c.c]=c;
    const s={name:cells[2].v,g:[]};
    for(let p=0;p<n;p++){const g=blankG();const a=cells[3+2*p]&&cells[3+2*p].v,b=cells[4+2*p]&&cells[4+2*p].v;if(a!=null){g.nota=fmtIn(a);g.ch=fmtIn(b)}s.g.push(g)}
    if(s.g.some(g=>g.nota!==''))st.subjects.push(s);
  }
  if(mode==='eja'){st.subjects.forEach(s=>{const k=N(s.name);if(['BIOLOGIA','FISICA','QUIMICA','HISTORIA','GEOGRAFIA','LINGUAINGLESA','FILOSOFIA','EDUCACAOFISICA'].includes(k)&&s.g[1].nota===''){s.g[1]={nota:'20',ch:'80',media:null,pad:false}}})}
  const fis=st.subjects.find(s=>N(s.name)==='FISICA');if(fis){fis.g[1].nota='16';}
  st.periods[1].sit='APROV. C/DEP';
  st.deps=[{ano:st.periods[1].ano,disc:'FÍSICA',nota:''}];
  return st;
}
function nPer(){return state.periods.length}
function defCh(name,p){
  const d=SPEC[state.mode].defch[canon(name).key];if(!d)return null;
  if(d[p]!=null)return d[p];
  const vals=d.filter(x=>x!=null);if(!vals.length)return null;
  const cnt={};vals.forEach(v=>cnt[v]=(cnt[v]||0)+1);return +Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0][0];
}
function canon(name){
  name=collapseRepeat(String(name||'').replace(/(\s+[\d.,_\-–—]+)+\s*$/,''));let k=N(name);k=ALIAS[k]||k;
  if(/EJA$/.test(k)&&/\(\s*EJA\s*\)\s*$/i.test(name)){const base=N(name.replace(/\(\s*EJA\s*\)\s*$/i,''));if(SPEC[state.mode].order.some(o=>N(o)===(ALIAS[base]||base))){k=ALIAS[base]||base;name=name.replace(/\(\s*EJA\s*\)\s*$/i,'').trim()}}
  if(/^CONECTANDOOINDIVIDUO/.test(k))k=k.replace(/^CONECTANDOOINDIVIDUO/,'CONECTANDOINDIVIDUO');
  const order=SPEC[state.mode].order;const i=order.findIndex(o=>N(o)===k);
  return i>=0?{key:k,name:order[i],idx:i}:{key:k,name:String(name).trim().toUpperCase(),idx:999};
}
function sortSubjects(){state.subjects.sort((a,b)=>{const x=canon(a.name),y=canon(b.name);return x.idx-y.idx||x.name.localeCompare(y.name,'pt')})}
// Regular: 4 bimestres (min. 20) ou 3 trimestres (min. 15). EJA: 2 bimestres por modulo (min. 10).
function defaultPer(){return state&&state.mode==='eja'?2:4}
function normPer(n){return [2,3,4].includes(n)?n:defaultPer()}
function isDep(g,p){
  if(p!=null){const sit=(state.periods[p]||{}).sit;if(sit&&sit!=='APROV. C/DEP')return false}
  const m=g.media!=null?g.media:null;
  if(m!=null)return m<5;
  const v=num(g.nota);if(v==null)return false;
  return v<5*normPer(g.per);
}
function semestreAuto(p){
  const a=state.periods[p].ano;if(!a)return '';
  const prev=p>0?state.periods[p-1].ano:null;return (prev===a?'2º':'1º')+' de '+a;
}

/* ============ montagem da planilha (modelo) ============ */
function buildSheet(st){
  const sp=SPEC[st.mode],n=sp.ncols,eja=st.mode==='eja';
  const seq=[];const add=(src,ov={},clear=false,ro=null)=>{seq.push({src,ov,clear,ro});return seq.length};
  const A=st.aluno;
  const F=eja?{nome:[20,3],matricula:[20,11],nat:[22,5],nasc:[22,11],mae:[24,3],e:[24,8],pai:[24,9],orgao:[26,7],exp:[26,11]}
             :{nome:[20,3],matricula:[20,9],nat:[22,4],nasc:[22,9],mae:[24,3],e:[24,6],pai:[24,7],orgao:[26,5],exp:[26,9]};
  const runsWith=(r,c,val)=>{const cell=sp.rows[r].cells.find(x=>x.c===c);const runs=cell.runs.map(x=>Object.assign({},x));runs[runs.length-1].t=' '+(val||'');return {runs}};
  const date=v=>{const s=brToSerial(v);return s!=null?s:(v||null)};
  const hov={};const set=(r,c,v)=>{(hov[r]=hov[r]||{})[c]=v};
  set(...F.nome,(A.nome||'').toUpperCase()||null);set(...F.matricula,A.matricula||null);set(...F.nat,A.naturalidade||null);
  set(...F.nasc,date(A.nascimento));set(...F.mae,A.mae||null);set(...F.pai,A.pai||null);set(...F.e,(A.mae&&A.pai)?'e':null);
  set(...F.orgao,A.orgao||null);set(...F.exp,date(A.expedicao));
  set(22,2,runsWith(22,2,A.nacionalidade));set(26,2,runsWith(26,2,A.identidade));
  const E=esc,ac=eja?9:7;
  set(4,ac,'DECRETO Nº '+(E.decreto||''));set(5,ac,'D.O. '+(E.do||''));set(6,ac,'U.A: '+(E.ua||''));set(7,ac,'Censo Escolar: '+(E.censo||''));
  set(14,2,runsWith(14,2,(E.nome||'').toUpperCase()));set(16,2,runsWith(16,2,(E.endereco||'').toUpperCase()));
  set(16,eja?6:5,(E.municipio||'').toUpperCase()||null);set(16,eja?10:8,E.cep||null);
  const L=LABELS[st.mode];
  for(let p=0;p<n;p++){set(28,3+2*p,'Ano');set(28,4+2*p,num(st.periods[p].ano)??(st.periods[p].ano||null));set(29,3+2*p,L[p]);set(30,3+2*p,'Nota');set(30,4+2*p,'C/H')}
  for(let r=1;r<=30;r++)add(r,hov[r]||{});
  // disciplinas
  const subs=st.subjects.filter(s=>s.name.trim());
  const tc=3+2*n;const first=seq.length+1;
  if(!subs.length)add(50,{},true);
  subs.forEach((s,i)=>{
    const r=seq.length+1;const ov={2:s.name.trim().toUpperCase()};let sum=0,any=false;const refs=[];
    for(let p=0;p<n;p++){const g=s.g[p]||blankG();const nv=num(g.nota),cv=num(g.ch);
      ov[3+2*p]=nv!=null?nv:(g.nota||null);ov[4+2*p]=cv!=null?cv:(g.ch||null);
      if(cv!=null){sum+=cv;any=true}refs.push(colL(4+2*p)+r)}
    ov[tc]=any?{f:'SUM('+refs.join(',')+')',v:sum}:null;
    const srcRow=i===subs.length-1?50:31;let ro=null;
    const nmCell=sp.rows[srcRow].cells.find(x=>x.c===2);
    if(nmCell){const st0=sp.styles[nmCell.s];const avail=colWidthPt(sp,2)-3;const w=textWidthAt(ov[2],st0.font.sz,st0.font.b,st0.font.i);
      if(w>avail){const sz=Math.max(5.5,Math.floor(st0.font.sz*avail/w*2)/2);ro={cs:{2:extraStyle(sp,'nm'+nmCell.s+'_'+sz,nmCell.s,{sz,h:st0.h||'left',v:st0.v||'bottom',wrap:false})}}}}
    add(srcRow,ov,true,ro);
  });
  const last=seq.length;
  add(51);
  const tot={};let gsum=0;
  for(let p=0;p<n;p++){let s=0;subs.forEach(x=>{const v=num((x.g[p]||{}).ch);if(v!=null)s+=v});gsum+=s;const c=colL(4+2*p);tot[4+2*p]=s?{f:`SUM(${c}${first}:${c}${last})`,v:s}:null}
  tot[tc]=gsum?{f:`SUM(${colL(tc)}${first}:${colL(tc)}${last})`,v:gsum}:null;
  add(52,tot);
  const fr={},si={};
  for(let p=0;p<n;p++){let f=num(st.periods[p].freq);if(f!=null&&f>1)f=+(f/100).toFixed(6);fr[3+2*p]=f;si[3+2*p]=st.periods[p].sit||null}
  add(53,fr);
  if(st.periods.some(p=>p.sit===CLASSIF)){
    const r54=sp.rows[54].cells;const ovS={};
    for(let p=0;p<n;p++)if(st.periods[p].sit===CLASSIF)for(const c of [3+2*p,4+2*p]){const cell=r54.find(x=>x.c===c);if(cell)ovS[c]=sitStyle(sp,cell.s)}
    add(54,si,false,{cs:ovS});
  }else add(54,si);
  add(55);add(56);
  for(let p=0;p<n;p++){const P=st.periods[p];const used=P.ano||st.subjects.some(x=>x.g[p]&&(x.g[p].nota!==''||x.g[p].ch!==''));const ov={2:ORD[p],3:used?(P.escola||null):null};if(!used){add(57,ov,true);continue}
    if(eja){ov[8]=P.municipio||null;ov[11]=P.semestre||semestreAuto(p)||null}else{ov[7]=P.municipio||null;ov[9]=num(P.ano)??(P.ano||null)}
    add(57,ov,true)}
  const lines=obsLines(st).map(l=>l.text);
  if(eja){add(61);add(62)}else{add(60);add(61)}
  const obsSrc=eja?63:62,obsS=obsStyle(sp,obsSrc);
  for(const t of lines)for(const seg of wrapObs(t,obsWidth(sp)))add(obsSrc,{2:seg},true,{s:obsS,ht:OBS_HT});
  const S=sig,sigRows=r0=>{const a=eja?7:5;return {[r0]:{2:S.sec.nome,[a]:S.dir.nome},[r0+1]:{2:'Matrícula '+S.sec.mat,[a]:'Matrícula '+S.dir.mat},[r0+2]:{2:'ID '+S.sec.id,[a]:'ID '+S.dir.id},[r0+3]:{2:S.sec.cargo,[a]:S.dir.cargo},[r0+4]:{2:S.sec.escola,[a]:S.dir.escola}}};
  const tailOv=Object.assign({[eja?78:79]:{2:st.dataLocal||null}},sigRows(eja?82:83));
  for(let r=eja?67:66;r<=(eja?86:87);r++)add(r,tailOv[r]||{});
  add(9999);
  // linhas -> células
  const rows=seq.map(it=>{
    const tr=sp.rows[it.src]||{ht:null,cells:[]};
    const cells=tr.cells.map(c=>({c:c.c,s:it.ro&&it.ro.s!=null?it.ro.s:(it.ro&&it.ro.cs&&it.ro.cs[c.c]!=null?it.ro.cs[c.c]:c.s),val:c.vm?{logo:true}:it.clear?null:(c.runs?{runs:c.runs}:(c.v!==undefined?c.v:null))}));
    for(const k in it.ov){const c=+k;let cell=cells.find(x=>x.c===c);if(!cell){cell={c,s:0,val:null};cells.push(cell)}cell.val=it.ov[k]}
    cells.sort((a,b)=>a.c-b.c);return {ht:it.ro&&it.ro.ht?it.ro.ht:tr.ht,cells,src:it.src};
  });
  const merges=[];
  for(const m of sp.mrg){const h=m[3]-m[1];
    seq.forEach((it,i)=>{if(it.src!==m[1])return;for(let k=1;k<=h;k++)if(!seq[i+k]||seq[i+k].src!==m[1]+k)return;merges.push([m[0],i+1,m[2],i+1+h])})}
  return {spec:sp,rows,merges,mode:st.mode};
}
/* texto de amparo (ou observação) escrito na própria ficha: "AMPARADO PELA RESOLUÇÃO ... Nº 5.595/2021 ..." */
function fmtAmparo(t){t=String(t||'').replace(/\s+/g,' ').trim().replace(/[.;]+$/,'');if(!t)return '';
  for(const [ano,txt] of Object.entries(RESOLUCAO_PROMOV)){const num=(txt.match(/nº\s*([\d.]+\/\d{4})/)||[])[1];if(num&&N(t).includes(N(num)))return txt}
  let x=t===t.toUpperCase()?t.toLowerCase():t;x=x.replace(/\bseeduc\b/gi,'SEEDUC').replace(/\bsugen\b/gi,'SUGEN').replace(/\bd\.\s?o\./gi,'D.O.').replace(/\bn[º°o]\s?(?=[\d.])/gi,'nº ').replace(/\bresolução\b/i,'Resolução').replace(/\bdeliberação\b/i,'Deliberação').replace(/\bcee\b/gi,'CEE').replace(/\bcne\b/gi,'CNE');
  return x.charAt(0).toUpperCase()+x.slice(1)+'.'}
function amparoDe(rows){const out=[];const add=t=>{t=fmtAmparo(t);if(t&&t.length>8&&!out.some(x=>N(x)===N(t)))out.push(t)};
  for(const r of rows||[]){/* células mescladas repetem o mesmo texto: cada texto conta uma vez */
    const toks=[...new Set((r.toks||[]).map(t=>String(t.t||'').replace(/\s+/g,' ').trim()).filter(Boolean))];
    for(const t of toks){const k=t.search(/AMPARAD[OA]/i);if(k>=0)add(t.slice(k))}
    const li=toks.findIndex(t=>/^OBSERVA[ÇC][ÕO]ES?\b/i.test(t));
    if(li>=0){const mesmo=toks[li].replace(/^OBSERVA[ÇC][ÕO]ES?\s*:?\s*/i,'');const resto=[mesmo,...toks.slice(li+1)].filter(t=>t&&!/^OBSERVA[ÇC][ÕO]ES?\s*:?$/i.test(t)&&!/AMPARAD/i.test(t));if(resto.length)add(resto.join(' '))}}
  return out.join(' ')}
const RESOLUCAO_PROMOV={
  '2020':'Amparado pela Resolução SEEDUC/SUGEN nº 5.879/2020 publicada no D.O. de 14/10/2020.',
  '2021':'Amparado pela Resolução SEEDUC/SUGEN nº 6015/2021 publicada no D.O. de 14/12/2021.'};
/* ---- observações: quebra de linha dentro das margens, fonte 7 ---- */
const FONT_K=1.1;
const OBS_SZ=8,OBS_HT=10.5;
function extraStyle(sp,key,base,mods){
  sp.extra=sp.extra||[];const got=sp.extra.find(e=>e.key===key);if(got)return got.idx;
  const st=JSON.parse(JSON.stringify(sp.styles[base]));st.font.sz=mods.sz;st.h=mods.h;st.v=mods.v;st.wrap=!!mods.wrap;
  const idx=sp.styles.length;sp.styles.push(st);sp.extra.push({key,idx,base,...mods});return idx;
}
function obsStyle(sp,src){
  const base=(sp.rows[src].cells.find(c=>c.c===2)||sp.rows[src].cells[0]).s;
  return extraStyle(sp,'obs',base,{sz:OBS_SZ,h:'left',v:'center',wrap:false});
}
function sitStyle(sp,base){return extraStyle(sp,'sit'+base,base,{sz:7.5,h:'center',v:'center',wrap:false})}
function obsWidth(sp){
  const last=sp.lastcol-1;let w=0;for(let c=2;c<=last;c++){const k=sp.cols.find(q=>c>=q.min&&c<=q.max);w+=Math.round((k?k.width:8.43)*7)*0.75}
  return w-4;
}
let MEAS=null;
function colWidthPt(sp,c){const k=sp.cols.find(q=>c>=q.min&&c<=q.max);return Math.round((k?k.width:8.43)*7)*0.75}
function textWidthAt(t,sz,b,i){if(!MEAS)MEAS=document.createElement('canvas').getContext('2d');MEAS.font=`${i?'italic ':''}${b?'700':'400'} ${sz*10}px Carlito, Calibri, sans-serif`;return MEAS.measureText(String(t||'')).width/10}
function textW(t,italic){if(!MEAS)MEAS=document.createElement('canvas').getContext('2d');MEAS.font=`${italic?'italic ':''}400 ${OBS_SZ*10}px Carlito, Calibri, sans-serif`;return MEAS.measureText(t).width/10}
function wrapObs(text,maxW){
  const out=[];
  for(const para of String(text).split('\n')){
    const words=para.split(/\s+/).filter(Boolean);let cur='';
    for(let w of words){
      while(textW(w,true)>maxW){let i=w.length;while(i>1&&textW(w.slice(0,i),true)>maxW)i--;if(cur){out.push(cur);cur=''}out.push(w.slice(0,i));w=w.slice(i)}
      const t=cur?cur+' '+w:w;if(cur&&textW(t,true)>maxW){out.push(cur);cur=w}else cur=t}
    if(cur)out.push(cur);
  }
  return out.length?out:[''];
}
function obsLines(st){
  const auto=[];
  st.periods.forEach(p=>{const a=String(p.ano||'').trim();if(p.amparo){const text=`${a} – ${p.amparo}`;if(!auto.some(x=>x.text===text))auto.push({ano:a,res:true,ph:false,text})}});
  st.periods.forEach(p=>{const a=String(p.ano||'').trim();if(p.sit==='PROMOV'&&!p.amparo&&RESOLUCAO_PROMOV[a]&&!auto.some(x=>x.res&&x.ano===a))auto.push({ano:a,res:true,ph:false,text:`${a} – ${RESOLUCAO_PROMOV[a]}`})});
  for(const d of st.deps){
    if(d.pendente){const pi=d.p!=null?d.p:d.auto;const onde=pi!=null&&LABELS[st.mode][pi]?` (${LABELS[st.mode][pi]})`:'';auto.push({pi,ano:d.ano||'',text:`${d.ano||PH} – O(a) aluno(a) não cumpriu a dependência na disciplina ${d.disc?d.disc.trim().toUpperCase():PH}${onde}, necessária para a certificação final do Ensino Médio.`,ph:!d.ano||!d.disc,pendente:true});continue}
    const nv=num(d.nota);const nota=d.nota?(nv!=null?nv.toFixed(2).replace('.',','):String(d.nota).trim()):'';
    auto.push({pi:d.p!=null?d.p:d.auto,ano:d.ano||'',text:`${d.ano||PH} – Aprovado em regime de dependência na disciplina ${d.disc?d.disc.trim().toUpperCase():PH}, com nota final ${nota||PH}.${d.extra?' '+d.extra:''}`,ph:!d.ano||!d.disc||!nota});
  }
  st.periods.forEach((p,pi)=>{if(p.sit==='APROV. C/DEP'&&!st.deps.some(d=>(d.p!=null||d.auto!=null)?((d.p!=null?d.p:d.auto)===pi):(d.ano&&(d.ano===p.ano||(+d.ano>+p.ano)))))auto.push({ano:p.ano||'',text:`${p.ano||PH} – Aprovado em regime de dependência na disciplina ${PH}, com nota final ${PH}.`,ph:true})});
  const out=auto.map((x,i)=>[x,i]).sort((a,b)=>((a[0].ano||'9999').localeCompare(b[0].ano||'9999'))||((a[0].pi??99)-(b[0].pi??99))||a[1]-b[1]).map(x=>x[0]);
  for(const l of (st.obsExtra||'').split('\n'))if(l.trim())out.push({text:l.trim(),ph:false});
  return out;
}

/* ============ Excel ============ */
function cellXml(ref,s,v){
  if(v&&v.logo)return `<c r="${ref}" s="${s}" t="e" vm="1"><v>#VALUE!</v></c>`;
  if(v==null||v==='')return `<c r="${ref}" s="${s}"/>`;
  if(typeof v==='number')return `<c r="${ref}" s="${s}"><v>${v}</v></c>`;
  if(v.f)return `<c r="${ref}" s="${s}"><f>${v.f}</f><v>${v.v}</v></c>`;
  if(v.runs)return `<c r="${ref}" s="${s}" t="inlineStr"><is>${v.runs.map(r=>`<r>${r.rpr||''}<t xml:space="preserve">${esc_(r.t)}</t></r>`).join('')}</is></c>`;
  return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${esc_(v)}</t></is></c>`;
}
async function makeXlsx(sheet){
  const sp=sheet.spec,z=await JSZip.loadAsync(TPL[sheet.mode]);const Nr=sheet.rows.length;
  const rx=sheet.rows.map((row,i)=>{const r=i+1;if(!row.cells.length&&!row.ht)return '';
    return `<row r="${r}"${row.ht?` ht="${row.ht}" customHeight="1"`:''}>${row.cells.map(c=>cellXml(colL(c.c)+r,c.s,c.val)).join('')}</row>`}).join('');
  const mg=sheet.merges.map(m=>`<mergeCell ref="${colL(m[0])}${m[1]}:${colL(m[2])}${m[3]}"/>`);
  const xml=sp.head.replace('{{DIM}}',`B2:${colL(sp.lastcol-1)}${Nr-1}`)+'<sheetData>'+rx+'</sheetData>'+sp.tail.replace('{{MERGES}}',mg.length?`<mergeCells count="${mg.length}">${mg.join('')}</mergeCells>`:'');
  z.file('xl/worksheets/sheet1.xml',xml);
  {/* mesmas letras maiores no Excel */let s0=await z.file('xl/styles.xml').async('string');s0=s0.replace(/(<fonts\b[^>]*>)([\s\S]*?)(<\/fonts>)/,(m,a,b,c)=>a+b.replace(/<sz val="([\d.]+)"\/>/g,(x,v)=>`<sz val="${Math.round(+v*FONT_K*2)/2}"/>`)+c);z.file('xl/styles.xml',s0)}
  if(sp.extra&&sp.extra.length){
    let st=await z.file('xl/styles.xml').async('string');
    const xfsM=st.match(/<cellXfs count="(\d+)">([\s\S]*?)<\/cellXfs>/);
    const xfs=xfsM[2].match(/<xf\b[^>]*?(?:\/>|>[\s\S]*?<\/xf>)/g);
    if(xfs.length===sp.extra[0].idx){
      const fontsM=st.match(/<fonts count="(\d+)"([^>]*)>([\s\S]*?)<\/fonts>/);
      const fonts=fontsM[3].match(/<font\b[^>]*?(?:\/>|>[\s\S]*?<\/font>)/g);
      let addF='',addX='',nF=fonts.length;
      for(const e of sp.extra){
        const bx=xfs[e.base];const fid=+(bx.match(/fontId="(\d+)"/)||[0,0])[1];
        addF+=fonts[fid].replace(/<sz val="[\d.]+"\/>/,`<sz val="${e.sz}"/>`);
        let nx=bx.replace(/fontId="\d+"/,`fontId="${nF}"`);nF++;if(!/applyFont=/.test(nx))nx=nx.replace('<xf ','<xf applyFont="1" ');
        const al=`<alignment horizontal="${e.h}" vertical="${e.v}"${e.wrap?' wrapText="1"':''}/>`;
        if(/<alignment\b[^>]*\/>/.test(nx))nx=nx.replace(/<alignment\b[^>]*\/>/,al);
        else if(/\/>$/.test(nx))nx=nx.replace(/\/>$/,` applyAlignment="1">${al}</xf>`);
        else nx=nx.replace(/>/,`>${al}`).replace('<xf ','<xf applyAlignment="1" ');
        addX+=nx}
      st=st.replace(fontsM[0],`<fonts count="${nF}"${fontsM[2]}>${fontsM[3]}${addF}</fonts>`);
      st=st.replace(xfsM[0],`<cellXfs count="${xfs.length+sp.extra.length}">${xfsM[2]}${addX}</cellXfs>`);
      z.file('xl/styles.xml',st);
    }
  }
  let wb=await z.file('xl/workbook.xml').async('string');
  const area=`Historico!$A$1:$${colL(sp.lastcol)}$${Nr}`;
  wb=wb.replace(/(<definedName name="_xlnm\.Print_Area"[^>]*>)[^<]*/,(m,a)=>a+area).replace(/<calcPr([^>]*?)\/>/,(m,a)=>a.includes('fullCalcOnLoad')?m:`<calcPr${a} fullCalcOnLoad="1"/>`);
  z.file('xl/workbook.xml',wb);
  return z.generateAsync({type:'blob',compression:'DEFLATE',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}

/* ============ desenho (PDF e pré-visualização) ============ */
const PAGE={w:595.28,h:841.89};
function fmtVal(v,st){
  if(v==null)return '';
  if(typeof v==='object'){if(v.f!==undefined)v=v.v;else return ''}
  if(v==null||v==='')return '';
  if(typeof v==='number'){
    switch(st.numFmtId){case 2:return v.toFixed(2).replace('.',',');case 10:return (v*100).toFixed(2).replace('.',',')+'%';case 9:return Math.round(v*100)+'%';case 14:return serialToBR(v);
      default:return Number.isInteger(v)?String(v):String(+v.toFixed(8)).replace('.',',')}}
  return String(v);
}
const BW={thin:.55,medium:1.1,thick:1.6,hair:.3,dotted:.55,dashed:.55,mediumDashed:1.1,double:.4};
function paintSheet(sheet,P){
  const sp=sheet.spec,nc=sp.lastcol;const cw=[0];
  for(let c=1;c<=nc;c++){const k=sp.cols.find(q=>c>=q.min&&c<=q.max);cw[c]=Math.round((k?k.width:8.43)*7)*0.75}
  const cx=[0,0];for(let c=1;c<=nc;c++)cx[c+1]=cx[c]+cw[c];
  const ry=[0,0];sheet.rows.forEach((r,i)=>ry[i+2]=ry[i+1]+(r.ht||15));
  const tw=cx[nc+1],th=ry[sheet.rows.length+1];
  /* margens de 1,2 cm em todos os lados: o histórico ocupa a folha até as margens e fica centralizado */
  /* enquadra só a área de impressão do modelo (B2 até a penúltima coluna/linha), sem a coluna e as linhas vazias da borda */
  const bx0=cx[2],bx1=cx[nc],by0=ry[2],by1=ry[Math.max(2,sheet.rows.length)];const bw=bx1-bx0,bh=by1-by0;
  const mg=sp.margins[0]*72;const sc=Math.min((PAGE.w-2*mg)/bw,(PAGE.h-2*mg)/bh,1.35);
  const ml=(PAGE.w-bw*sc)/2-bx0*sc,mt=(PAGE.h-bh*sc)/2-by0*sc;
  const X=c=>ml+cx[c]*sc,Y=r=>mt+ry[r]*sc;
  const inM=new Map();for(const m of sheet.merges)for(let r=m[1];r<=m[3];r++)for(let c=m[0];c<=m[2];c++)inM.set(r+':'+c,m);
  const styles=sp.styles;
  sheet.rows.forEach((row,i)=>{const r=i+1;
    for(const cell of row.cells){if(cell.c>nc)continue;const st=styles[cell.s];const m=inM.get(r+':'+cell.c);
      if(m&&(m[0]!==cell.c||m[1]!==r))continue;
      const rc=m?{x1:X(m[0]),x2:X(Math.min(m[2],nc)+1),y1:Y(m[1]),y2:Y(m[3]+1)}:{x1:X(cell.c),x2:X(cell.c+1),y1:Y(r),y2:Y(r+1)};
      if(cell.val&&cell.val.logo){const ar=LOGO_IMG.naturalWidth/LOGO_IMG.naturalHeight||0.79;let h=rc.y2-rc.y1,w=h*ar;if(w>rc.x2-rc.x1){w=rc.x2-rc.x1;h=w/ar}P.image(rc.x1+(rc.x2-rc.x1-w)/2,rc.y1+(rc.y2-rc.y1-h)/2,w,h);continue}
      drawText(P,st,cell.val,rc,sc);
    }});
  sheet.rows.forEach((row,i)=>{const r=i+1;
    for(const cell of row.cells){if(cell.c>nc)continue;const b=styles[cell.s].border;if(!b)continue;const m=inM.get(r+':'+cell.c);
      const x1=X(cell.c),x2=X(cell.c+1),y1=Y(r),y2=Y(r+1);
      const side=(k,a,bb,c,d)=>{const s=b[k];if(!s)return;P.line(a,bb,c,d,BW[s[0]]||.55,s[1],/dot/.test(s[0])?[.6,1]:/dash/i.test(s[0])?[2,1]:null)};
      if(!(m&&cell.c>m[0]))side('l',x1,y1,x1,y2);
      if(!(m&&cell.c<m[2]))side('r',x2,y1,x2,y2);
      if(!(m&&r>m[1]))side('t',x1,y1,x2,y1);
      if(!(m&&r<m[3]))side('b',x1,y2,x2,y2);
    }});
}
function drawText(P,st,val,rc,sc){
  const f=st.font;let runs;
  if(val&&val.runs){runs=val.runs.filter(x=>x.t).map(x=>({t:x.t,sz:x.f.sz??f.sz,b:x.f.b??f.b,i:x.f.i??f.i}))}
  else{const t=fmtVal(val,st);if(t==='')return;runs=[{t,sz:f.sz,b:f.b,i:f.i}]}
  const isNum=typeof val==='number'||(val&&val.f!==undefined);
  const h=st.h||(isNum?'right':'left');
  const sz=Math.max(...runs.map(x=>x.sz));
  const W=x=>{P.font(x.b,x.i,x.sz*sc);return P.width(x.t)};
  let lines;
  if(runs.length===1){
    lines=runs[0].t.replace(/\s+$/,'').split('\n').map(t=>[{...runs[0],t}]);
    if(st.wrap){const maxw=rc.x2-rc.x1-3*sc;const out=[];for(const ln of lines){const words=ln[0].t.split(' ');let cur='';for(const w of words){const tryS=cur?cur+' '+w:w;if(cur&&W({...ln[0],t:tryS})>maxw){out.push([{...ln[0],t:cur}]);cur=w}else cur=tryS}out.push([{...ln[0],t:cur}])}lines=out}
  }else lines=[runs];
  const lh=sz*1.22*sc,n=lines.length;
  let y0;
  if(st.v==='center')y0=(rc.y1+rc.y2)/2-(n-1)*lh/2+sz*.27*sc;
  else if(st.v==='top')y0=rc.y1+(sz*.8+1)*sc;
  else y0=rc.y2-(sz*.24+1)*sc-(n-1)*lh;
  lines.forEach((ln,li)=>{
    const w=ln.reduce((a,x)=>a+W(x),0);const pad=(1.6+(st.indent||0)*6.75)*sc;
    let x=h==='center'?(rc.x1+rc.x2)/2-w/2:h==='right'?rc.x2-pad-w:rc.x1+pad;
    const y=y0+li*lh;
    for(const x0 of ln){const ww=W(x0);P.text(x0.t,x,y,f.color||'000000');if(f.u)P.line(x,y+x0.sz*.12*sc,x+ww,y+x0.sz*.12*sc,Math.max(.5,x0.sz*.06*sc),f.color||'000000',null);x+=ww}
  });
}
function canvasPainter(ctx){return {
  font(b,i,s){ctx.font=`${i?'italic ':''}${b?'700 ':'400 '}${s}px Carlito, Calibri, sans-serif`},
  width:t=>ctx.measureText(t).width,
  text(t,x,y,c){ctx.fillStyle='#'+c;ctx.fillText(t,x,y)},
  line(x1,y1,x2,y2,w,c,d){ctx.beginPath();ctx.setLineDash(d||[]);ctx.lineWidth=w;ctx.strokeStyle='#'+c;ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()},
  image(x,y,w,h){if(LOGO_IMG&&LOGO_IMG.complete)ctx.drawImage(LOGO_IMG,x,y,w,h)}
}}
function pdfPainter(doc){return {
  font(b,i,s){doc.setFont('Carlito',b&&i?'bolditalic':b?'bold':i?'italic':'normal');doc.setFontSize(s)},
  width:t=>doc.getTextWidth(t),
  text(t,x,y,c){doc.setTextColor('#'+c);doc.text(t,x,y)},
  line(x1,y1,x2,y2,w,c,d){doc.setDrawColor('#'+c);doc.setLineWidth(w);doc.setLineDashPattern(d||[],0);doc.line(x1,y1,x2,y2)},
  image(x,y,w,h){doc.addImage(LOGO_URL,'PNG',x,y,w,h,'logo','FAST')}
}}
function makePdf(sheet){
  const doc=new jspdf.jsPDF({unit:'pt',format:'a4',orientation:'portrait'});
  for(const [k,f] of Object.entries(FONT_FILES)){doc.addFileToVFS(f,FONTB64[k]);doc.addFont(f,'Carlito',k)}
  doc.setProperties({title:'Histórico Escolar — '+(state.aluno.nome||''),subject:'Histórico escolar do Ensino Médio',author:esc.nome||'',creator:'Gerador de Histórico do Beto '+(typeof APP_VERSION!=='undefined'?APP_VERSION:''),keywords:'histórico escolar; '+(state.mode==='eja'?'EJA':'Ensino Médio Regular')});
  paintSheet(sheet,pdfPainter(doc));
  return doc.output('blob');
}
let pvTimer=null;
function schedulePreview(){clearTimeout(pvTimer);pvTimer=setTimeout(renderPreview,120);scheduleConf()}
/* ================= CONFERÊNCIA AUTOMÁTICA (redundância) ================= */
let CONF={state:'idle',items:[],sig:''},confTimer=null,CONF_RUN=0;
function stateSig(){try{return JSON.stringify([state.mode,state.aluno,state.periods,state.subjects.map(s=>[s.name,s.g.map(g=>[g.nota,g.ch])]),state.deps,state.obsExtra,state.dataLocal,esc,sig])}catch(e){return String(Math.random())}}
function scheduleConf(){clearTimeout(confTimer);if(!READY||isPristine()){CONF={state:'idle',items:[],sig:''};renderConf();return}CONF.state='pending';renderConf();confTimer=setTimeout(()=>conferir().catch(e=>console.error(e)),1500)}
function dataChecks(st){
  const out=[];const L=LABELS[st.mode];const push=(l,t)=>out.push({l,t});
  const keys={};
  st.subjects.forEach(s=>{
    const nm=s.name.trim();if(!nm)return;
    if(/(\s[\d.,]+)+\s*$/.test(nm))push('b',`Disciplina "${nm}": o nome termina com números.`);
    if(collapseRepeat(nm)!==nm.replace(/\s+/g,' '))push('b',`Disciplina "${nm}": o nome tem palavras repetidas.`);
    const k=canon(nm).key;if(keys[k])push('b',`Disciplina "${nm}" aparece duas vezes na lista.`);keys[k]=1;
    s.g.forEach((g,p)=>{
      if(g.nota!==''){const v=num(g.nota);if(v==null)push('b',`${nm}, ${L[p]}: a nota "${g.nota}" não é um número.`);else if(v<0||v>10*normPer(g.per))push('w',`${nm}, ${L[p]}: nota ${g.nota} fora da faixa de total de pontos (0 a ${10*normPer(g.per)}).`)}
      if(g.ch!==''){const c=num(g.ch);if(c==null)push('b',`${nm}, ${L[p]}: a C/H "${g.ch}" não é um número.`);else if(c<=0||c>400)push('w',`${nm}, ${L[p]}: C/H ${g.ch} fora do comum.`)}
      if(g.nota!==''&&g.ch==='')push('w',`${nm}, ${L[p]}: tem nota mas falta a C/H.`);
    })});
  for(let p=0;p<st.periods.length;p++){
    const vals=st.subjects.map(s=>num((s.g[p]||{}).nota)).filter(v=>v!=null);
    if(vals.length>=4){const lim=state.mode==='eja'?5:10;const altos=vals.filter(v=>v>lim).length;const baixos=st.subjects.filter(s=>{const v=num((s.g[p]||{}).nota);return v!=null&&v<=lim&&v>=2});
      if(altos>=vals.length*0.6)baixos.forEach(s=>push('w',`${s.name}, ${L[p]}: nota ${s.g[p].nota} muito baixa para total de pontos. Confira se não é a média.`))}
    const has=st.subjects.some(s=>s.g[p]&&(s.g[p].nota!==''||s.g[p].ch!==''));const P=st.periods[p];
    if(has){
      if(!/^\d{4}$/.test(String(P.ano||'').trim()))push('b',`${L[p]}: falta o ano (4 dígitos).`);
      if(!P.sit)push('b',`${L[p]}: falta a situação final.`);
      const f=num(P.freq);if(P.freq===''||f==null)push('w',`${L[p]}: falta a frequência.`);else if(f<0||(f>100&&f>1))push('b',`${L[p]}: frequência ${P.freq} fora de 0 a 100.`);
    }
  }
  const anos=st.periods.map(p=>+p.ano).filter(Boolean);for(let i=1;i<anos.length;i++)if(anos[i]<anos[i-1])push('w','Os anos das séries não estão em ordem crescente.');
  for(const [k,lab] of [['nascimento','Data de nascimento'],['expedicao','Data de expedição']]){const v=st.aluno[k];if(v&&brToSerial(v)==null)push('w',`${lab} "${v}" não está no formato dd/mm/aaaa.`)}
  for(const [k] of ALUNO_FIELDS){const v=st.aluno[k];if(!v)continue;const bad=validField(k,v);if(bad)push(/data|outro campo/.test(bad)?'b':'w',`${FIELD_LABEL[k]} "${v}": ${bad}.`)}
  const ocrK=Object.keys(st.ocrFields||{}).filter(k=>st.aluno[k]);if(ocrK.length)push('w',`Lidos de imagem (OCR), confira letra por letra: ${ocrK.map(k=>FIELD_LABEL[k]).join(', ')}.`);
  const ny=+(String(st.aluno.nascimento||'').match(/(\d{4})$/)||[])[1];if(ny&&(ny<1940||ny>new Date().getFullYear()-10))push('w',`Data de nascimento com ano ${ny}: confira.`);
  return out;
}
function layoutChecks(sheet){
  const out=[];const sp=sheet.spec,nc=sp.lastcol;const cw=[0];for(let c=1;c<=nc;c++)cw[c]=colWidthPt(sp,c);
  const inM=new Map();for(const m of sheet.merges)inM.set(m[1]+':'+m[0],m);
  const watch=new Set([31,50,52,53,54,57,sheet.mode==="eja"?63:62]);
  sheet.rows.forEach((row,i)=>{if(!watch.has(row.src))return;const r=i+1;
    for(const cell of row.cells){const v=cell.val;if(v==null||v===''||typeof v==='object'&&!v.f)continue;const st=sp.styles[cell.s];if(st.wrap)continue;
      const txt=fmtVal(v,st);if(!txt)continue;const m=inM.get(r+':'+cell.c);let w=0;if(m){for(let c=m[0];c<=Math.min(m[2],nc);c++)w+=cw[c]}else w=cw[cell.c];
      const tw=textWidthAt(txt,st.font.sz,st.font.b,st.font.i);if(tw>w-2)out.push({l:'b',t:`O texto "${txt.length>40?txt.slice(0,40)+'…':txt}" não cabe na célula (linha ${r}).`})}});
  const th=sheet.rows.reduce((a,r)=>a+(r.ht||15),0),tw=sp.cols.reduce((a,k)=>a+(k.max-k.min+1)*Math.round(k.width*7)*0.75,0);
  const sc=Math.min((PAGE.w-2*sp.margins[0]*72)/tw,(PAGE.h-2*sp.margins[2]*72)/th,1.35);
  if(sc<0.6)out.push({l:'w',t:`O histórico ficou muito longo; na folha A4 a letra fica pequena (${Math.round(sc*100)}%). Reduza observações ou disciplinas vazias.`});
  return out;
}

function cmpState(label,parsed,st){
  const out=[];const push=t=>out.push({l:'b',t:`${label}: ${t}`});const L=LABELS[st.mode];
  if(!parsed){push('não consegui ler o arquivo gerado de volta.');return out}
  const A=st.aluno,I=parsed.info||{};
  for(const [k,lab] of [['nome','nome do aluno'],['matricula','matrícula'],['naturalidade','naturalidade'],['mae','mãe'],['pai','pai'],['identidade','identidade'],['orgao','órgão expedidor']]){
    const a=N(k==='nome'?String(A[k]||'').toUpperCase():A[k]),b=N(I[k]);if(a&&a!==b)push(`${lab} saiu "${I[k]||'(vazio)'}" em vez de "${A[k]}".`)}
  for(const [k,lab] of [['nascimento','data de nascimento'],['expedicao','data de expedição']]){const a=brToSerial(A[k]),b=brToSerial(I[k]);if(a!=null&&a!==b)push(`${lab} saiu "${I[k]||'(vazio)'}" em vez de "${A[k]}".`)}
  const want=st.subjects.filter(s=>s.name.trim());const got=parsed.subjects||[];
  for(const s of want){const k=canon(s.name).key;const g2=got.find(x=>canon(x.name).key===k);
    if(!g2){push(`a disciplina "${s.name}" não aparece no documento.`);continue}
    s.g.forEach((g,p)=>{const a=num(g.nota),b=num((g2.g[p]||{}).nota);if((a==null)!==(b==null)||(a!=null&&Math.abs(a-b)>0.005))push(`${s.name}, ${L[p]}: nota saiu "${(g2.g[p]||{}).nota||'(vazia)'}" em vez de "${g.nota||'(vazia)'}".`);
      const c=num(g.ch),d=num((g2.g[p]||{}).ch);if((c==null)!==(d==null)||(c!=null&&c!==d))push(`${s.name}, ${L[p]}: C/H saiu "${(g2.g[p]||{}).ch||'(vazia)'}" em vez de "${g.ch||'(vazia)'}".`)})}
  if(got.length>want.length)push(`o documento tem ${got.length} disciplinas e a lista tem ${want.length}.`);
  st.periods.forEach((P,p)=>{const Q=(parsed.periods||[])[p]||{};
    if(String(P.ano||'').trim()&&String(Q.ano||'').trim()!==String(P.ano).trim())push(`${L[p]}: ano saiu "${Q.ano||'(vazio)'}" em vez de "${P.ano}".`);
    const f1=num(P.freq),f2=num(Q.freq);if(f1!=null&&(f2==null||Math.abs((f1>1?f1:f1*100)-(f2>1?f2:f2*100))>0.01))push(`${L[p]}: frequência saiu "${Q.freq||'(vazia)'}" em vez de "${P.freq}".`);
    if(P.sit&&mapSit(Q.sit||'')!==mapSit(P.sit)&&N(Q.sit)!==N(P.sit))push(`${L[p]}: situação saiu "${Q.sit||'(vazia)'}" em vez de "${P.sit}".`);
    const used=P.ano||st.subjects.some(x=>x.g[p]&&(x.g[p].nota!==''||x.g[p].ch!==''));
    if(used&&P.escola&&N(Q.escola)!==N(P.escola))push(`${L[p]}: escola saiu "${Q.escola||'(vazia)'}" em vez de "${P.escola}".`)});
  const depsWant=obsLines(st).filter(l=>/regime de depend/.test(l.text)&&!l.ph).length,depsGot=(parsed.deps||[]).filter(d=>d.disc&&d.nota&&d.ano).length;
  if(depsWant!==depsGot)push(`linhas de dependência: ${depsGot} no documento, ${depsWant} esperadas.`);
  return out;
}
async function conferir(){
  if(!READY||isPristine()){CONF={state:'idle',items:[],sig:''};renderConf();return CONF}
  const run=++CONF_RUN;const sigNow=stateSig();CONF.state='running';renderConf();
  const items=[];
  try{
    items.push(...dataChecks(state));
    const sheet=buildSheet(state);items.push(...layoutChecks(sheet));
    const pdfBlob=makePdf(sheet);const xBlob=await makeXlsx(sheet);
    const pdfRows=(await rowsFromPdf(await pdfBlob.arrayBuffer())).flat();
    items.push(...cmpState('PDF',parseHistPdf(pdfRows),state));
    const wb=XLSX.read(await xBlob.arrayBuffer(),{type:'array',cellDates:true});
    items.push(...cmpState('Excel',parseHist(rowsFromSheet(wb.Sheets[wb.SheetNames[0]])),state));
    if(wb.SheetNames.length!==1)items.push({l:'b',t:'Excel: o arquivo deveria ter só a aba do histórico.'});
  }catch(e){console.error(e);items.push({l:'b',t:'A conferência não conseguiu terminar: '+(e.message||e)})}
  if(run!==CONF_RUN)return CONF;
  const seen=new Set();const uniq=items.filter(x=>{if(seen.has(x.t))return false;seen.add(x.t);return true});
  CONF={state:uniq.some(x=>x.l==='b')?'issues':uniq.length?'warn':'ok',items:uniq,sig:sigNow,at:new Date()};
  renderConf();return CONF;
}
function renderConf(){
  const el=$('#conf');if(!el)return;
  if(CONF.state==='idle'){el.innerHTML='';return}
  const head='<div class="ct">Conferência automática do documento</div>';
  if(CONF.state==='pending'||CONF.state==='running'){el.innerHTML=head+'<span style="color:var(--muted)">Conferindo o Excel e o PDF…</span>';return}
  if(CONF.state==='ok'){el.innerHTML=head+'<ul><li><span class="chip o">ok</span><span>Excel e PDF gerados e lidos de volta: tudo bate com os dados da tela, e a diagramação está dentro das margens.</span></li></ul>';return}
  el.innerHTML=head+'<ul>'+CONF.items.map(x=>`<li><span class="chip ${x.l}">${x.l==='b'?'atenção':'conferir'}</span><span>${esc_(x.t)}</span></li>`).join('')+'</ul>';
}
async function guard(kind,go){
  const g=$('#gate');g.hidden=true;
  let r=CONF;if(r.sig!==stateSig()||r.state==='pending'||r.state==='running'||r.state==='idle'){setStatus('Conferindo o documento antes de gerar…');r=await conferir();setStatus('')}
  const bad=(r.items||[]).filter(x=>x.l==='b');
  if(!bad.length){go();return}
  g.innerHTML=`<b>A conferência encontrou ${bad.length} problema(s) antes de ${kind==='print'?'imprimir':'baixar'}:</b><ul>${bad.slice(0,6).map(x=>`<li>${esc_(x.t)}</li>`).join('')}${bad.length>6?`<li>… e mais ${bad.length-6} (veja em Pendências)</li>`:''}</ul><div class="row"><button type="button" class="btn small" id="gate-fix">Voltar e corrigir</button><button type="button" class="btn small" id="gate-go">${kind==='print'?'Imprimir':'Baixar'} assim mesmo</button></div>`;
  g.hidden=false;
  $('#gate-fix').onclick=()=>{g.hidden=true;$('#checks').scrollIntoView({behavior:'smooth',block:'center'})};
  $('#gate-go').onclick=()=>{g.hidden=true;go()};
}
function renderPreview(){
  if(!READY)return;const cv=$('#cv');const k=Math.min(3,(cv.clientWidth||520)/PAGE.w*(window.devicePixelRatio||1));
  cv.width=Math.round(PAGE.w*k);cv.height=Math.round(PAGE.h*k);
  const ctx=cv.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#fff';ctx.fillRect(0,0,cv.width,cv.height);ctx.setTransform(k,0,0,k,0,0);ctx.lineCap='square';
  try{paintSheet(buildSheet(state),canvasPainter(ctx))}catch(e){console.error(e)}
  renderChecks();renderObsPreview();
}

/* ============ leitura de arquivos ============ */
function valStr(v){if(v instanceof Date)return dateStr(v);if(typeof v==='number')return String(+v.toFixed(6));return String(v).trim()}
function rowsFromSheet(ws){
  if(!ws||!ws['!ref'])return [];
  const rng=XLSX.utils.decode_range(ws['!ref']);
  const a=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:null,blankrows:true});const dup={};
  for(const m of ws['!merges']||[]){const v=(a[m.s.r-rng.s.r]||[])[m.s.c-rng.s.c];if(v==null)continue;
    for(let r=m.s.r;r<=m.e.r;r++)for(let c=m.s.c;c<=m.e.c;c++){const rr=r-rng.s.r,cc=c-rng.s.c;a[rr]=a[rr]||[];if(a[rr][cc]==null||(String(a[rr][cc]).trim()===''&&(r!==m.s.r||c!==m.s.c))){a[rr][cc]=v;(dup[rr]=dup[rr]||{})[cc]=1}}}
  return a.map((row,i)=>({y:i,toks:(row||[]).map((v,j)=>v==null||String(v).trim()===''?null:{t:valStr(v),raw:v,x0:j+rng.s.c,x1:j+rng.s.c,xc:j+rng.s.c,dup:!!(dup[i]&&dup[i][j])}).filter(Boolean)}));
}
async function rowsFromPdf(buf){
  const pdf=await pdfjsLib.getDocument({isEvalSupported:false,data:buf.slice(0)}).promise;const pages=[];
  for(let p=1;p<=pdf.numPages;p++){
    const page=await pdf.getPage(p);const tc=await page.getTextContent();
    const items=tc.items.filter(it=>it.str&&it.str.trim()).map(it=>({t:it.str,x:it.transform[4],y:it.transform[5],w:it.width,h:Math.abs(it.transform[3])||8}));
    pages.push(itemsToRows(items,.35));
  }
  return pages;
}
function itemsToRows(items,tolF){
  items=items.slice().sort((a,b)=>b.y-a.y||a.x-b.x);
  const rows=[];for(const it of items){let row=rows.find(r=>Math.abs(r.yc-it.y)<=Math.max(2,it.h*tolF));if(!row){row={yc:it.y,items:[]};rows.push(row)}row.items.push(it)}
  rows.sort((a,b)=>b.yc-a.yc);
  return rows.map(r=>{r.items.sort((a,b)=>a.x-b.x);const toks=[];
    for(const it of r.items){const last=toks[toks.length-1];const gap=last?it.x-last.x1:99;
      if(last&&gap<it.h*.45&&!(/^[\d.,%_-]+$/.test(it.t.trim())&&/^[\d.,%_-]+$/.test(last.t.trim()))){last.t+=(gap>it.h*.12?' ':'')+it.t;last.x1=it.x+it.w}
      else toks.push({t:it.t,x0:it.x,x1:it.x+it.w})}
    toks.forEach(t=>{t.t=t.t.replace(/\s+/g,' ').trim();t.xc=(t.x0+t.x1)/2});
    return {y:r.yc,toks:toks.filter(t=>t.t)}});
}
/* ---------- imagens: PDF escaneado -> imagens; foto -> canvas ---------- */
async function pdfToCanvases(buf,maxPages){
  const pdf=await pdfjsLib.getDocument({isEvalSupported:false,data:buf.slice(0)}).promise;const out=[];
  for(let p=1;p<=Math.min(pdf.numPages,maxPages||6);p++){const page=await pdf.getPage(p);const vp0=page.getViewport({scale:1});const sc=Math.min(3,1700/vp0.width);const vp=page.getViewport({scale:sc});
    const c=document.createElement('canvas');c.width=Math.round(vp.width);c.height=Math.round(vp.height);const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);
    await page.render({canvasContext:ctx,viewport:vp}).promise;out.push(c)}
  return out;
}
async function imageToCanvas(file){
  let bmp;try{bmp=await createImageBitmap(file,{imageOrientation:'from-image'})}catch(e){throw new Error('Não consegui abrir esta imagem. Use JPG ou PNG (fotos do iPhone em HEIC precisam ser convertidas).')}
  const k=Math.max(Math.min(2.5,2300/bmp.width),Math.min(1,3200/Math.max(bmp.width,bmp.height)))||1;const c=document.createElement('canvas');c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k);
  const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(bmp,0,0,c.width,c.height);return c;
}
/* ---------- OCR no computador (Tesseract.js) ---------- */
let OCR=null;
function loadScript(src){return new Promise((ok,err)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>err(new Error('Não consegui carregar o leitor de imagens. Verifique a internet.'));document.head.appendChild(s)})}
async function ocrWorker(progress){
  if(OCR)return OCR;
  if(!window.Tesseract)await loadScript('lib/tesseract.min.js');
  const base=new URL('ocr/',location.href).href;
  if(IN_CLAUDE)try{const b64=await fetch('ocr/por.traineddata.txt').then(r=>{if(!r.ok)throw 0;return r.text()});
    await seedOcrCache('./por.traineddata',Uint8Array.from(atob(b64.trim()),c=>c.charCodeAt(0)))}catch(e){}
  OCR=await Tesseract.createWorker('por',1,{workerPath:base+'worker.min.js',corePath:base,langPath:base.replace(/\/$/,''),workerBlobURL:false,cacheMethod:'readOnly',logger:m=>{if(progress&&m.status==='recognizing text')progress(m.progress)}});
  await OCR.setParameters({preserve_interword_spaces:'1'});
  return OCR;
}
function seedOcrCache(key,val){return new Promise((ok,err)=>{const rq=indexedDB.open('keyval-store');rq.onupgradeneeded=()=>rq.result.createObjectStore('keyval');
  rq.onerror=()=>err(rq.error);rq.onsuccess=()=>{const db=rq.result;if(!db.objectStoreNames.contains('keyval')){db.close();return err(new Error('store'))}const tx=db.transaction('keyval','readwrite');tx.objectStore('keyval').put(val,key);tx.oncomplete=()=>{db.close();ok()};tx.onerror=()=>err(tx.error)}})}
let ocrProgress=null;
function deskew(src){
  const k=Math.min(1,900/src.width),w=Math.round(src.width*k),h=Math.round(src.height*k);const t=document.createElement('canvas');t.width=w;t.height=h;const tx=t.getContext('2d');
  let best=0,bestScore=-1;
  for(let a=-4;a<=4.001;a+=0.25){tx.setTransform(1,0,0,1,0,0);tx.fillStyle='#fff';tx.fillRect(0,0,w,h);tx.translate(w/2,h/2);tx.rotate(a*Math.PI/180);tx.drawImage(src,-w/2,-h/2,w,h);
    const d=tx.getImageData(0,0,w,h).data;let prev=0,score=0;for(let y=0;y<h;y++){let n=0;for(let x=0;x<w;x+=2){if(d[4*(y*w+x)]<140)n++}score+=(n-prev)*(n-prev);prev=n}
    if(score>bestScore){bestScore=score;best=a}}
  if(Math.abs(best)<0.2)return src;
  const c=document.createElement('canvas');c.width=src.width;c.height=src.height;const cx=c.getContext('2d');cx.fillStyle='#fff';cx.fillRect(0,0,c.width,c.height);cx.translate(c.width/2,c.height/2);cx.rotate(best*Math.PI/180);cx.drawImage(src,-src.width/2,-src.height/2);return c;
}
function cleanForOcr(src0){
  const src=deskew(src0);
  const W=src.width,H=src.height,c=document.createElement('canvas');c.width=W;c.height=H;const ctx=c.getContext('2d');ctx.drawImage(src,0,0);
  const im=ctx.getImageData(0,0,W,H),d=im.data,g=new Uint8Array(W*H);let sum=0;
  for(let i=0;i<W*H;i++){const v=(d[4*i]*299+d[4*i+1]*587+d[4*i+2]*114)/1000;g[i]=v;sum+=v}
  const thr=Math.min(200,sum/(W*H)*0.78);const dark=new Uint8Array(W*H);for(let i=0;i<W*H;i++)dark[i]=g[i]<thr?1:0;
  const kill=new Uint8Array(W*H);const minH=Math.round(W*0.12),minV=Math.round(H*0.04);
  for(let y=0;y<H;y++){let run=0;for(let x=0;x<=W;x++){if(x<W&&dark[y*W+x])run++;else{if(run>=minH)for(let k=x-run;k<x;k++){kill[y*W+k]=1;if(y>0)kill[(y-1)*W+k]=1;if(y<H-1)kill[(y+1)*W+k]=1}run=0}}}
  for(let x=0;x<W;x++){let run=0;for(let y=0;y<=H;y++){if(y<H&&dark[y*W+x])run++;else{if(run>=minV)for(let k=y-run;k<y;k++){kill[k*W+x]=1;if(x>0)kill[k*W+x-1]=1;if(x<W-1)kill[k*W+x+1]=1}run=0}}}
  for(let i=0;i<W*H;i++){const v=kill[i]?255:(dark[i]?0:255);d[4*i]=d[4*i+1]=d[4*i+2]=v;d[4*i+3]=255}
  ctx.putImageData(im,0,0);return c;
}
async function ocrCanvas(c0){
  const c=cleanForOcr(c0);
  const w=await ocrWorker(p=>ocrProgress&&ocrProgress(p));
  const {data}=await w.recognize(c,{},{blocks:true});
  const k=595/c.width,items=[];
  for(const b of data.blocks||[])for(const pa of b.paragraphs||[])for(const ln of pa.lines||[])for(const wd of ln.words||[]){
    let t=String(wd.text||'').replace(/[|¦\[\]]/g,'').trim();if(!t||wd.confidence<20)continue;
    if(/\d/.test(t)&&/^[\dOoDIlSsBZ,.\/%-]+$/.test(t))t=t.replace(/[OoD]/g,'0').replace(/[Il]/g,'1').replace(/[Ss]/g,'5').replace(/B/g,'8').replace(/Z/g,'2');
    const bb=wd.bbox;items.push({t,x:bb.x0*k,y:-bb.y1*k,w:(bb.x1-bb.x0)*k,h:Math.max(4,(bb.y1-bb.y0)*k)})}
  return itemsToRows(items,.55);
}
/* ---------- leitura com IA (Claude) ---------- */
const IN_CLAUDE=!!(window.claude&&window.claude.use);
/* Leitura com IA: desligada no site público (transferência internacional de dados exige autorização — LGPD art. 33). */
const IA_PERMITIDA=false;
let RM_MEM='ocr';try{localStorage.removeItem('hist.rm')}catch(e){}
const readMode=()=>IA_PERMITIDA?RM_MEM:'ocr';
const apiKey=()=>{try{return localStorage.getItem('hist.apikey')||''}catch(e){return ''}};
const AI_SCHEMA={type:'object',additionalProperties:false,required:['tipo','nivel','aluno','periodos','dependencias'],properties:{
  tipo:{type:'string',enum:['historico','ficha_individual','ata_resultados','ficha_matricula','dependencia','outro']},
  nivel:{type:'string',enum:['medio','fundamental','desconhecido']},
  aluno:{type:'object',additionalProperties:false,required:['nome','matricula','nascimento','nacionalidade','naturalidade','mae','pai','identidade','orgao','expedicao'],properties:Object.fromEntries(['nome','matricula','nascimento','nacionalidade','naturalidade','mae','pai','identidade','orgao','expedicao'].map(k=>[k,{type:'string'}]))},
  periodos:{type:'array',items:{type:'object',additionalProperties:false,required:['etapa','divisoes','ano','escola','municipio','frequencia','situacao','disciplinas'],properties:{
    etapa:{type:'integer'},divisoes:{type:'integer'},ano:{type:'string'},escola:{type:'string'},municipio:{type:'string'},frequencia:{type:'string'},situacao:{type:'string'},
    disciplinas:{type:'array',items:{type:'object',additionalProperties:false,required:['nome','nota','media','carga_horaria'],properties:{nome:{type:'string'},nota:{type:'string'},media:{type:'string'},carga_horaria:{type:'string'}}}}}}},
  dependencias:{type:'array',items:{type:'object',additionalProperties:false,required:['ano','disciplina','nota_final'],properties:{ano:{type:'string'},disciplina:{type:'string'},nota_final:{type:'string'}}}}}};
function aiPrompt(){
  const alvo=state.aluno.nome&&!state.example?`\nSe o documento listar vários alunos (ata da turma), extraia somente o aluno ${state.aluno.nome}${state.aluno.matricula?' (matrícula '+state.aluno.matricula+')':''}.`:'';
  return `As imagens são páginas de um documento escolar brasileiro do Ensino Médio (${state.mode==='eja'?'EJA, por módulos':'regular, por séries'}): pode ser histórico escolar, ficha individual do aluno, ata de resultados finais, ficha de matrícula ou ficha de dependência.
Transcreva os dados exatamente como aparecem, sem inventar nada. Campo que não aparece ou está ilegível fica como "".
- tipo: o tipo do documento.
- nivel: "fundamental" se o documento for do Ensino Fundamental (1º ao 9º ano), "medio" se for do Ensino Médio ou EJA de Ensino Médio, "desconhecido" se não der para saber.
- aluno: dados pessoais. Datas no formato dd/mm/aaaa. Nomes como escritos.
- periodos: um item por série/ano letivo (ou módulo, na EJA). etapa = número da série ou módulo (1 a 4); 0 se não souber. ano = ano letivo com 4 dígitos. escola e municipio daquele ano. frequencia = frequência anual em %, só o número (ex.: "94,24"). situacao = resultado final escrito no documento (ex.: "APROVADO", "PROMOVIDO", "APROVADO COM DEPENDÊNCIA", "REPROVADO").
- divisoes: quantas avaliações compõem a nota do ano/módulo: 4 (bimestres do ensino regular), 3 (trimestres) ou 2 (bimestres de um módulo da EJA); 0 se não souber.
- disciplinas: nome da disciplina; nota = total de pontos do ano (soma dos bimestres ou trimestres), se o documento mostrar; media = média final, se houver coluna própria; carga_horaria = horas do ano.
- dependencias: aprovações em regime de dependência citadas no documento (ano, disciplina, nota final).
Números como escritos, com vírgula decimal.${alvo}`;
}
async function canvasesToImages(cs){
  const out=[];for(const c of cs){let w=c.width,h=c.height;const k=Math.min(1,1600/Math.max(w,h));const d=document.createElement('canvas');d.width=Math.round(w*k);d.height=Math.round(h*k);d.getContext('2d').drawImage(c,0,0,d.width,d.height);
    const blob=await new Promise(r=>d.toBlob(r,'image/jpeg',.85));out.push(blob)}
  return out;
}
let ANTHROPIC=null;
async function readWithAI(canvases){
  const blobs=await canvasesToImages(canvases);
  if(IN_CLAUDE){
    const sample=await claude.use('sample');if(!sample)throw new Error('A leitura com IA não está disponível nesta visualização.');
    const lim=await sample.limits().catch(()=>null);if(!lim||!lim.images)throw new Error('Esta visualização não pode enviar imagens para o Claude.');
    const imgs=blobs.slice(0,lim.images.maxImages||blobs.length);
    try{return await sample.json(aiPrompt()+'\n\nResponda somente com um objeto JSON neste formato (JSON Schema):\n'+JSON.stringify(AI_SCHEMA),{images:imgs,modelTier:'complex'})}
    catch(e){if(e&&e.code==='not_granted')throw new Error('Leitura com IA não autorizada. Permita o uso do Claude nesta página ou use a leitura no computador.');throw new Error('A IA não conseguiu ler: '+(e&&e.message||e))}
  }
  const key=apiKey();if(!key)throw new Error('Para ler com IA no site, informe a chave da API Anthropic no quadro "Fotos e PDFs escaneados".');
  if(!ANTHROPIC)ANTHROPIC=(await import('https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@1.4.0/+esm')).default;
  const client=new ANTHROPIC({apiKey:key,dangerouslyAllowBrowser:true});
  const b64s=await Promise.all(blobs.map(b=>b.arrayBuffer().then(x=>b64(x))));
  let resp;
  try{
    resp=await client.beta.messages.create({model:'claude-opus-5-5',max_tokens:16000,betas:['server-side-fallback-2026-07-01'],fallbacks:'default',
      output_config:{effort:'medium',format:{type:'json_schema',schema:AI_SCHEMA}},
      messages:[{role:'user',content:[...b64s.map(d=>({type:'image',source:{type:'base64',media_type:'image/jpeg',data:d}})),{type:'text',text:aiPrompt()}]}]});
  }catch(e){
    if(e instanceof ANTHROPIC.AuthenticationError)throw new Error('Chave da API recusada. Confira a chave no quadro "Fotos e PDFs escaneados".');
    if(e instanceof ANTHROPIC.PermissionDeniedError)throw new Error('Esta chave não tem permissão para usar o modelo. Confira a conta no console da Anthropic.');
    if(e instanceof ANTHROPIC.RateLimitError)throw new Error('Limite de uso da API atingido. Espere um pouco e tente de novo.');
    if(e instanceof ANTHROPIC.APIConnectionError)throw new Error('Sem conexão com a API da Anthropic. Verifique a internet.');
    if(e instanceof ANTHROPIC.APIError)throw new Error('A API recusou o pedido: '+e.message);
    throw e;
  }
  if(resp.stop_reason==='refusal')throw new Error('A IA não aceitou ler este documento.');
  if(resp.stop_reason==='max_tokens')throw new Error('O documento é grande demais para ler de uma vez. Envie uma página por vez.');
  const txt=resp.content.filter(c=>c.type==='text').map(c=>c.text).join('');
  try{return JSON.parse(txt)}catch(e){throw new Error('A IA respondeu num formato inesperado. Tente de novo.')}
}
function applyAI(r,entry){
  if(r&&r.nivel==='fundamental'){entry.fund=true;return [FUND_MSG]}
  resetIfExample();const done=[];const tipo=r.tipo||'outro';
  const filled=applyAlunoDoc(r.aluno||{},entry,tipo==='ficha_matricula');
  if(filled.length)done.push((tipo==='ficha_matricula'?'ficha de matrícula (IA)':'dados do aluno (IA)')+': '+filled.join(', '));
  const per=(r.periodos||[]).filter(p=>p&&((p.disciplinas||[]).some(d=>d.nome)||p.ano));
  if(tipo==='dependencia'){const subs=per.flatMap(p=>p.disciplinas.map(d=>({name:d.nome,total:num(d.nota),media:num(d.media)!=null?num(d.media):num(d.nota)})));const k=applyDepResults(subs,(per[0]||{}).ano);done.push(`dependência (IA): ${k} resultado(s)`)}
  else for(const p of per){
    const idx=(p.etapa>=1&&p.etapa<=nPer())?p.etapa-1:nextFreePeriod(p.ano);
    const subs=(p.disciplinas||[]).filter(d=>d.nome).map(d=>{let nt=num(d.nota),md=num(d.media);if(nt!=null&&nt<=10&&md==null){md=nt;nt=null}return {name:d.nome,total:nt,media:md,ch:num(d.carga_horaria)}});
    if(subs.length)applyFicha({subs,info:{},ano:p.ano,sit:mapSit(p.situacao),freqGlobal:num(p.frequencia),escola:cleanEscola(p.escola),nPer:normPer(p.divisoes)},idx);
    else if(p.ano)state.periods[idx].ano=String(p.ano);
    if(p.municipio)state.periods[idx].municipio=p.municipio.toUpperCase().replace(/\/R[IL1]$/,'/RJ');
    done.push(`${LABELS[state.mode][idx]}${p.ano?' · '+p.ano:''} · ${subs.length} disciplinas (IA)`)}
  for(const d of r.dependencias||[]){if(!d.disciplina&&!d.ano)continue;const c=canon(d.disciplina||'').name;
    let x=state.deps.find(y=>N(canon(y.disc||'').name)===N(c)&&(!d.ano||!y.ano||y.ano===d.ano));
    if(!x){x={ano:d.ano||'',disc:d.disciplina?c:'',nota:''};state.deps.push(x)}
    if(d.nota_final&&!x.nota)x.nota=d.nota_final}
  return done;
}
const LBL=[['nome',/^(NOMEDOALUNO|NOMEDAALUNA|NOMEDOAALUNOA|NOMEDOALUNOA|ALUNO|ALUNOA|ALUNA|ESTUDANTE|NOMEDOESTUDANTE|NOMECOMPLETO|NOMECIVIL|NOMEDOALUNOCIVIL|NOME)$/],
  ['pai',/^(NOMEDOPAI|NOMEPAI|PAI|FILIACAOPAI|FILIACAO2|NOMEDOPAIRESPONSAVEL)$/],['mae',/^(NOMEDAMAE|NOMEDOMAE|NOMEMAE|MAE|FILIACAOMAE|FILIACAO1|NOMEDAMAERESPONSAVEL)$/],
  ['nascimento',/^(NASCIMENTO|DATADENASCIMENTO|DATANASCIMENTO|DTNASC|DTNASCIMENTO|DATADENASC|DTDENASCIMENTO|DATANASC|NASCIDOEM|NASCIDAEM)$/],
  ['naturalidade',/^(NATURALIDADE|NATURAL|MUNICIPIODENASCIMENTO|CIDADEDENASCIMENTO|LOCALDENASCIMENTO|NATURALIDADEMUNICIPIO)$/],['escola',/^(ESCOLA|UNIDADEESCOLAR|ESTABELECIMENTO)$/],['modalidade',/^MODALIDADE$/],['nacionalidade',/^NACIONALIDADE$/],['matricula',/^(NMATRICULA|MATRICULA|NUMERODEMATRICULA|NDEMATRICULA|NUMMATRICULA|NUMERODAMATRICULA|MATRICULADOALUNO|CODIGODOALUNO|MATRICULASEEDUC)$/],
  ['identidade',/^(IDENTIDADE|NUMERODODOCUMENTO|RG|NRG|NDORG|NUMERODORG|RGNUMERO|CARTEIRADEIDENTIDADE|DOCUMENTODEIDENTIDADE|NDAIDENTIDADE|NUMERODAIDENTIDADE|IDENTIDADENUMERO|NIDENTIDADE)$/],['orgao',/^(ORGAOEXPEDIDOR|ORGAOEMISSOR|EXPEDIDOR|ORGEXPEDIDOR|ORGAOEXP|ORGEMISSOR|ORGAO|EMISSOR|ORGAOEXPEDIDORUF|ORGAOEMISSORUF)$/],
  ['expedicao',/^(DATADEEXPEDICAO|DATAEXPEDICAO|EXPEDICAO|DATADEEMISSAO|DATAEMISSAO|DTEXPEDICAO|DTEMISSAO|EMISSAO|DTDEEXPEDICAO|DTDEEMISSAO)$/],['ano',/^(ANO|ANOLETIVO)$/],['turma',/^TURMA$/],
  ['serie',/^(SERIE|ANOSERIE|MODULO|ETAPA|FASE|ANODEESCOLARIDADE)$/],['curso',/^(CURSO|NIVELDEENSINO)$/],['filiacao',/^FILIACAO$/]];
const lblKey=t=>{const k=N(t);for(const [n,re] of LBL)if(re.test(k))return n;return null};
function splitTok(t){
  const re=/([^:]{1,60}?):/g;let m;const cuts=[];
  while((m=re.exec(t.t))){const words=m[1].trim().split(/\s+/);for(let k=Math.min(5,words.length);k>=1;k--){const lab=words.slice(-k).join(' ');if(lblKey(lab)){const start=m.index+m[1].lastIndexOf(lab);if(start>0)cuts.push(start);break}}}
  if(!cuts.length)return [t];
  const pts=[0,...cuts,t.t.length],L=t.t.length||1,w=(t.x1-t.x0);
  return pts.slice(0,-1).map((a,i)=>({...t,t:t.t.slice(a,pts[i+1]).trim(),x0:t.x0+w*a/L,x1:t.x0+w*pts[i+1]/L,xc:t.x0+w*(a+pts[i+1])/2/L})).filter(q=>q.t);
}
function extractInfo(rows0){
  const rows=rows0.map(r=>({...r,toks:r.toks.flatMap(splitTok)}));
  const info={};
  for(const row of rows){const T=row.toks;
    for(let j=0;j<T.length;j++){
      const raw=T[j].t,ci=raw.indexOf(':');const lab=ci>=0?raw.slice(0,ci):raw,rest=ci>=0?raw.slice(ci+1).trim():'';
      const key=lblKey(lab);if(!key||info[key]!=null)continue;
      if(ci<0&&lab.length>40)continue;
      let val=rest,raws=null,k=j+1;
      if(val&&T[j].raw===undefined){let q=j+1;while(q<T.length&&!lblKey(T[q].t.split(':')[0])&&!/:/.test(T[q].t)&&N(T[q].t)!=='E'&&T[q].x0-T[q-1].x1<22){val+=' '+T[q].t;q++}}
      if(!val){while(k<T.length&&(T[k].t===raw||N(T[k].t)===N(raw)))k++;
        if(k<T.length&&!lblKey(T[k].t.split(':')[0])&&!/:\s*$/.test(T[k].t)&&!/^[^:]{2,30}:\s*\S/.test(T[k].t)){val=T[k].t;raws=T[k].raw;
          if(T[k].raw===undefined){let q=k+1;while(q<T.length&&!lblKey(T[q].t.split(':')[0])&&!/:/.test(T[q].t)&&N(T[q].t)!=='E'&&T[q].x0-T[q-1].x1<22){val+=' '+T[q].t;q++}}}}
      if(!val){const lx=T[j].x1,nx=(T.slice(j+1).find(q=>lblKey(q.t.split(':')[0]))||{x0:1e9}).x0;
        const ri=rows.indexOf(row),isX=T[j].raw!==undefined;const isLbl=q=>!!lblKey(q.t.split(':')[0]);
        const rb=rows[ri+1];
        if(ci<0&&rb&&!rb.toks.some(q=>isLbl(q)&&/:/.test(q.t))){const tl=isX?0.5:Math.max(4,(T[j].x1-T[j].x0)*0.2);
          const c=rb.toks.filter(q=>q.x0>=T[j].x0-tl&&q.x0<=T[j].x1+(isX?0:tl)&&q.x0<nx&&!isLbl(q)).sort((a,b)=>Math.abs(a.x0-T[j].x0)-Math.abs(b.x0-T[j].x0));
          if(c.length){val=c[0].t;raws=c[0].raw}}
        if(!val&&ci>=0)for(const rr of [rows[ri-1],rows[ri+1]]){if(!rr||rr.toks.some(isLbl))continue;const q=rr.toks.find(q=>q.x0>lx&&q.x0<nx);if(q){val=q.t;raws=q.raw;break}}}
      if(!val)continue;
      if(key==='filiacao'){let q=k+1;while(q<T.length&&T[q].t===T[k].t)q++;const ie=T.findIndex((x,i)=>i>k&&N(x.t)==='E');let mae=val;if(ie>0&&T[k].raw===undefined)mae=T.slice(k,ie).map(x=>x.t).join(' ');info.mae=info.mae||mae;let pq=ie>0?ie+1:q;while(pq<T.length&&N(T[pq].t)==='E')pq++;if(pq<T.length&&!lblKey(T[pq].t)){let pai=T[pq].t;if(T[pq].raw===undefined){let r2=pq+1;while(r2<T.length&&!lblKey(T[r2].t)&&!/:/.test(T[r2].t)){pai+=' '+T[r2].t;r2++}}info.pai=info.pai||pai}continue}
      if(key==='nascimento'||key==='expedicao')val=dateStr(raws!=null?raws:val);
      if(['nascimento','expedicao','identidade','matricula'].includes(key)&&/ilegível|impossível|outro campo/.test(validField(key,val)))continue;
      info[key]=val;
    }}
  for(const row of rows){const line=row.toks.map(t=>t.t).join('   ');
    let m=line.match(/Tip[oa0]\s*:?\s*RG\b.*?N[úuü]mer[o0]\s*:\s*([0-9A-Za-z.\-\/]{4,})/i);if(m&&m[1].replace(/\D/g,'').length>=5)info.identidade=m[1];
    m=line.match(/[ÓO]rg[ãa][oc0]?\s*:?\s*(?:Emissor|Expedidor)\s*:\s*([A-Za-zÀ-ú.\/ ]+?)(?:\s{2,}|$)/i);
    if(m&&m[1].trim()){let o=m[1].trim();const uf=line.match(/Estado:\s*([A-Z]{2})\b/);if(uf&&!o.includes('/'))o=o+' / '+uf[1];info.orgao=o}}
  return info;
}
function classify(lbl,grp){
  const L=N(lbl),G=N(grp||'');
  let m=L.match(/^([1-4])(B|BI|BIM|BIMESTRE|T|TR|TRI|TRIM|TRIMESTRE|S|SEM|SEMESTRE|UN|UNID|UNIDADE|ETAPA|E|P|PER|PERIODO|CERT|CERTIFICACAO|C)?$/)||L.match(/^(?:B|T|S|BIM|TRI|TRIM|SEM)([1-4])$/);
  if(m)return (/FALT/.test(G)?'f':'n')+m[1];
  if(/^(TF|TOTALDEFALTAS|TOTALFALTAS|FALTAS|FALTASTOTAL)$/.test(L))return 'tf';
  if(/^(CH|CHA|CARGAHORARIA|CARGA|HORASAULA|AULASDADAS|AULASPREVISTAS|AULAS)$/.test(L))return 'ch';
  if(/^(%FR|FR|%FREQ|FREQ|FREQUENCIA|FREQANUAL|%|FREQUENCIAANUAL|%FREQUENCIA|%FREQANUAL)$/.test(L))return 'freq';
  if(/^(TOTALDEPONTOS|TOTAL|PONTOS|SOMA|TOTALPONTOS|SOMADOSPONTOS|TP)$/.test(L))return 'total';
  if(/^(MEDIAFINAL|MEDIA|MF|NOTAFINAL|MEDIAANUAL|NOTA|MA)$/.test(L))return 'media';
  if(/^(SITUACAO|RESULTADO|SIT|SITUACAOFINAL)$/.test(L))return 'sit';
  return null;
}
const STOP=/^(TOTAL|TOTAIS|FREQUENCIAGERAL|SITUACAO|RESULTADOFINAL|OBSERV|ASSINATURA|PROF|SECRETAR|DIRET|LEGENDA|INSPETOR|MATRICULA\d)/;
function collapseRepeat(name){
  const t=String(name||'').replace(/\s+/g,' ').trim();if(!t)return t;
  for(let k=2;k<=6;k++){const w=t.split(' ');if(w.length%k)continue;const n=w.length/k;const part=w.slice(0,n).join(' ');let ok=true;for(let i=1;i<k;i++)if(w.slice(i*n,(i+1)*n).join(' ')!==part){ok=false;break}if(ok)return part}
  return t;
}
function joinName(toks){const out=[];for(const t of toks){if(t.dup)continue;if(/^[\d.,%_\-–—\/]+$/.test(String(t.t).trim()))continue;if(out.length&&out[out.length-1]===t.t)continue;out.push(t.t)}return collapseRepeat(out.join(' ').trim())}
function parseTable(rows,isPdf){
  const h=rows.findIndex(r=>r.toks.some(t=>/^(DISCIPLINAS?|COMPONENTESCURRICULARES|COMPONENTECURRICULAR|COMPONENTES?)$/.test(N(t.t))));
  if(h<0)return null;
  const tol=isPdf?3:0.1;const hrow=rows[h];
  const above=[rows[h-1],rows[h-2]].filter(Boolean).flatMap(r=>r.toks).filter(t=>!lblKey(t.t.split(':')[0])&&!/:/.test(t.t));
  const GRP=/FALT|REND|AVALIA|CONCEIT|APROVEIT|NOTAS/;
  const groups=above.filter(t=>GRP.test(N(t.t))).sort((a,b)=>a.x0-b.x0);
  const disc=hrow.toks.find(t=>/^(DISCIPLINA|COMPONENTE)/.test(N(t.t)));
  const anchors=[];
  for(const t of hrow.toks){if(t===disc)continue;let g=null,gd=1e9;for(const q of groups){const d=Math.abs(q.xc-t.xc);if(d<gd){gd=d;g=q}}let k=classify(t.t,g&&g.t);
    if(!k){const ab=above.find(q=>!GRP.test(N(q.t))&&q.x1>=t.x0-tol&&q.x0<=t.x1+tol);if(ab)k=classify(ab.t+' '+t.t)||classify(ab.t)}
    if(k)anchors.push({k,xc:t.xc})}
  for(const g of above){if(groups.includes(g)&&!isPdf)continue;if(hrow.toks.some(t=>t!==disc&&t.x1>=g.x0-tol&&t.x0<=g.x1+tol))continue;if(GRP.test(N(g.t))&&isPdf)continue;const k=classify(g.t);if(k&&!anchors.some(a=>Math.abs(a.xc-g.xc)<=tol))anchors.push({k,xc:g.xc})}
  // linha de sub-cabeçalho logo abaixo
  let start=h+1;
  if(rows[start]&&rows[start].toks.length&&rows[start].toks.every(t=>classify(t.t)||/^(NOTA|CH|C\/H)$/i.test(t.t))){for(const t of rows[start].toks){const k=classify(t.t);if(k&&!anchors.some(a=>Math.abs(a.xc-t.xc)<=tol))anchors.push({k,xc:t.xc})}start++}
  if(!anchors.length)return null;
  const firstX=Math.min(...anchors.map(a=>a.xc));
  const subs=[];let empty=0;
  for(let i=start;i<rows.length;i++){
    const T=rows[i].toks;if(!T.length){empty++;if(!isPdf&&subs.length&&empty>=1)break;continue}empty=0;
    const nameT=T.filter(t=>isPdf?t.x1<firstX-2:t.xc<firstX-tol);const name=joinName(nameT);
    if(name&&STOP.test(N(name)))break;
    const vals={};
    for(const t of T){if(nameT.includes(t))continue;let best=null,bd=1e9;for(const a of anchors){const d=Math.abs(a.xc-t.xc);if(d<bd){bd=d;best=a}}
      if(!best||(isPdf&&bd>40)||(!isPdf&&bd>tol))continue;
      const key=best.k;const v=key==='sit'?t.t:num(t.t);if(v==null)continue;if(vals[key]==null)vals[key]=v}
    if(!name){if(subs.length&&vals.freq!=null&&Object.keys(vals).length<=3)subs.freqGlobal=vals.freq;continue}
    if(!Object.keys(vals).length){if(isPdf&&subs.length&&!/\d/.test(name)&&name===name.toUpperCase()&&name.length<40&&i-1>=start)subs[subs.length-1].name+=' '+name;continue}
    subs.push(Object.assign({name},vals));
  }
  if(subs.length){
    const nk=new Set(anchors.filter(a=>/^n[1-4]$/.test(a.k)).map(a=>a.k)),fk=new Set(anchors.filter(a=>/^f[1-4]$/.test(a.k)).map(a=>a.k));
    let np=nk.size||fk.size;
    if(!np&&state.mode==='eja')np=2;
    if(!np){const txt=rows.slice(0,Math.min(rows.length,start+2)).flatMap(r=>r.toks.map(t=>N(t.t))).join(' ');np=/TRIMESTR|TRIM\b|\b[1-3]T\b/.test(txt)?3:4}
    subs.nPer=normPer(np);
  }
  return subs.length?subs:null;
}
function inferPeriod(info,ctx,mode){
  const n=mode==='eja'?4:3;const srcs=[info.serie,ctx.sheet,ctx.file,info.curso,info.turma];
  for(const s of srcs){if(!s)continue;const t=String(s);
    let m=t.match(/([1-4])\s*[ºª°oa]?\s*\.?\s*(s[ée]rie|ano|m[óo]d|fase|etapa)/i)||t.match(/(m[óo]dulo|s[ée]rie|fase)\s*([1-4])/i);
    if(m){const d=+(m[1].match(/\d/)?m[1]:m[2]);if(d>=1&&d<=n)return d-1}}
  if(info.serie&&/^\s*[1-4]\s*$/.test(info.serie))return +info.serie-1;
  if(info.turma){const m=String(info.turma).match(/^\s*([1-4])\d{2,3}\b/);if(m&&+m[1]<=n)return +m[1]-1}
  return null;
}
function inferYear(info,ctx,rows){
  const c=[info.ano,ctx.sheet,ctx.file];for(const s of c){const m=String(s||'').match(/\b(19[89]\d|20[0-4]\d)\b/);if(m)return m[1]}
  for(const r of rows)for(const t of r.toks){const m=t.t.match(/ano\s*letivo\D{0,3}(20\d\d)/i);if(m)return m[1]}
  return null;
}
const FUND_MSG='Documentação do ensino fundamental: dados não são necessários no histórico do ensino médio.';
function isFundamental(rows){
  let fund=false,medio=false;
  for(const r of rows)for(const t of r.toks){const k=N(t.t);
    if(/ENSINOFUNDAMENTAL|^CURSOFUNDAMENTAL|^NIVELFUNDAMENTAL|^MODALIDADEFUNDAMENTAL|^ETAPAFUNDAMENTAL/.test(k)||(/^CURSO/.test(k)&&/FUNDAMENTAL/.test(k)))fund=true;
    if(/ENSINOMEDIO|^CURSOMEDIO|^NIVELMEDIO|^MEDIO$|SERIEDOENSINOMEDIO/.test(k)||(/^CURSO/.test(k)&&/MEDIO/.test(k)))medio=true}
  const curso=rows.flatMap(r=>r.toks).findIndex(t=>/^CURSO:?$/.test(N(t.t)));
  if(curso>=0){const all=rows.flatMap(r=>r.toks);const nx=all[curso+1];if(nx){const k=N(nx.t);if(/FUNDAMENTAL/.test(k))fund=true;if(/MEDIO/.test(k))medio=true}}
  return fund&&!medio;
}
function isDependencyFile(rows){return rows.some(r=>r.toks.some(t=>{if(/=/.test(t.t))return false;const k=N(t.t);return k.length<60&&/DEPENDENCIA/.test(k)&&!/APROVADO|LEGENDA/.test(k)}))}
function parseHistPdf(rows){
  /* "Carga Horária Total" pode quebrar em duas linhas: procura o cabeçalho perto de DISCIPLINAS */
  const h=rows.findIndex((r,i)=>r.toks.some(t=>N(t.t)==='DISCIPLINAS')&&rows.slice(Math.max(0,i-2),i+3).some(q=>q.toks.some(t=>/CARGAHORARIA/.test(N(t.t)))));
  if(h<0)return null;
  const mode=rows.slice(Math.max(0,h-2),h+3).some(r=>r.toks.some(t=>/MODULO/.test(N(t.t))))?'eja':'reg',n=mode==='eja'?4:3;
  const hr=rows.slice(Math.max(0,h-2),h+3).flatMap(r=>r.toks).sort((a,b)=>a.xc-b.xc);
  const anos=hr.filter(t=>N(t.t)==='ANO'),yrs=hr.filter(t=>/^(19|20)\d\d$/.test(t.t.trim()));
  if(anos.length<n)return null;
  const P=[];for(let p=0;p<n;p++){const a=anos[p];const y=yrs.find(q=>q.xc>a.xc&&(!anos[p+1]||q.xc<anos[p+1].xc));P.push({nx:a.xc,cx:y?y.xc:a.xc+(a.x1-a.x0)*2,ano:y?y.t.trim():''})}
  const totX=(hr.find(t=>/CARGAHORARIA/.test(N(t.t)))||{xc:1e9}).xc;
  const firstX=Math.min(...P.map(p=>p.nx))-((P[0].cx-P[0].nx)/2);
  const cols=[];P.forEach((p,i)=>{cols.push({k:'n',p:i,x:p.nx},{k:'c',p:i,x:p.cx})});cols.push({k:'t',x:totX});
  const near=(x,arr)=>{let b=null,d=1e9;for(const c of arr){const e=Math.abs(c.x-x);if(e<d){d=e;b=c}}return b};
  let top=h;while(top>0&&rows[top-1].toks.some(t=>N(t.t)==='ANO'||/^(19|20)\d\d$/.test(t.t.trim())))top--;
  const res={mode,info:extractInfo(rows.slice(0,top)),periods:P.map(p=>({ano:p.ano,freq:'',sit:''})),subjects:[],deps:[],dataLocal:null};
  const mids=P.map((p,i)=>({p:i,x:(p.nx+p.cx)/2}));
  let i=h+1;
  for(;i<rows.length;i++){const T=rows[i].toks;if(!T.length)continue;
    const nm=T.filter(t=>t.x1<firstX).map(t=>t.t).join(' ').trim();if(!nm)continue;const k=N(nm);
    if(k==='TOTAL')break;if(/^(NOTA|CH|DISCIPLINAS|ANO)$/.test(k))continue;
    const cn=canon(nm);const s={name:cn.idx<999?cn.name:nm,g:P.map(()=>blankG())};
    let tot=null;
    for(const t of T){if(t.x1<firstX)continue;const c=near(t.xc,cols);if(!c)continue;const v=num(t.t);if(c.k==='t'){tot=v;continue}if(c.k==='n')s.g[c.p].nota=v!=null?fmtIn(v):t.t;else s.g[c.p].ch=v!=null?fmtIn(v):t.t}
    if(!s.g.some(g=>g.nota!==''||g.ch!==''))continue;
    const bad=s.g.filter(g=>g.ch!==''&&num(g.ch)==null);
    if(tot!=null&&bad.length===1){const known=s.g.reduce((a,g)=>a+(num(g.ch)||0),0);const v=tot-known;if(v>0&&v%20===0){bad[0].ch=fmtIn(v);bad[0].pad=true}}
    else if(bad.length){const ok=s.g.map(g=>num(g.ch)).filter(v=>v!=null);for(const g of bad){if(ok.length){g.ch=fmtIn(ok[0]);g.pad=true}}}
    res.subjects.push(s)}
  for(;i<rows.length;i++){const T=rows[i].toks;const nm=T.filter(t=>t.x1<firstX).map(t=>t.t).join(' ');const k=N(nm);
    if(/FREQUENCIA/.test(k))for(const t of T){if(t.x1<firstX||t.xc>totX-20)continue;const m=near(t.xc,mids);let f=num(t.t);if(f!=null){if(f<=1)f*=100;res.periods[m.p].freq=fmtIn(+f.toFixed(2))}}
    if(/SITUACAO/.test(k)){for(const t of T){if(t.x1<firstX||t.xc>totX-20)continue;const m=near(t.xc,mids);res.periods[m.p].sit=mapSit(t.t)||t.t.trim()}
      const parts=P.map(()=>[]);for(const rr of [rows[i-1],rows[i],rows[i+1]]){if(!rr)continue;if(rr.toks.some(t=>t.x1<firstX&&!/SITUACAO/.test(N(t.t))))continue;for(const t of rr.toks){if(t.x1<firstX||t.xc>totX-20)continue;const m=near(t.xc,mids);parts[m.p].push(t.t)}}
      parts.forEach((ps,pi)=>{const j=ps.join(' ');if(/CLASSIFICAD/i.test(j))res.periods[pi].sit=mapSit(j)});
      break}}
  const ph=rows.findIndex(r=>r.toks.some(t=>N(t.t)==='ESTABELECIMENTODEENSINO'));
  if(ph>=0){const hd=rows[ph].toks.slice().sort((a,b)=>a.xc-b.xc);const ce=hd.find(t=>N(t.t)==='ESTABELECIMENTODEENSINO'),cm=hd.find(t=>/MUNICIPIO/.test(N(t.t))),cl=hd[hd.length-1];
    const pc=[{k:'escola',x:ce.xc},...(cm?[{k:'municipio',x:cm.xc}]:[]),{k:'ult',x:cl.xc}];
    for(let p=0;p<n;p++){const r=rows[ph+1+p];if(!r)break;for(const t of r.toks){if(t.x1<firstX)continue;const c=near(t.xc,pc);const v=t.t.trim();if(c.k==='ult'){if(mode==='eja')res.periods[p].semestre=((res.periods[p].semestre||'')+' '+v).trim();else if(!res.periods[p].ano&&/^(19|20)\d\d$/.test(v))res.periods[p].ano=v}else res.periods[p][c.k]=((res.periods[p][c.k]||'')+' '+v).trim()}}}
  const re=/(\d{4}|\(preencher\))\s*[–-]\s*Aprovado em regime de depend[êe]ncia n[oa]\s*(?:\(a\)\s*)?(?:disciplina\s*)?(.+?),\s*com nota final\s*(.+?)\.?\s*$/i;
  for(const r of rows){const line=r.toks.map(t=>t.t).join(' ');const m=line.match(re);
    if(m){const cl=x=>/preencher|^\[?nota\]?$|^disciplina$/i.test(x.trim())?'':x.trim();res.deps.push({ano:cl(m[1]),disc:cl(m[2]),nota:cl(m[3])})}
    else{const d=line.trim().match(/^[A-ZÀ-Úa-zà-ú ]+, \d{1,2} de [a-zç]+ de \d{4}$/);if(d)res.dataLocal=d[0]}}
  return res;
}
function parseHist(rows){
  /* "Carga Horária Total" pode quebrar em duas linhas: procura o cabeçalho perto de DISCIPLINAS */
  const h=rows.findIndex((r,i)=>r.toks.some(t=>N(t.t)==='DISCIPLINAS')&&rows.slice(Math.max(0,i-2),i+3).some(q=>q.toks.some(t=>/CARGAHORARIA/.test(N(t.t)))));
  if(h<0)return null;
  const disc=rows[h].toks.find(t=>N(t.t)==='DISCIPLINAS');
  const years=rows[h].toks.filter(t=>/^20\d\d$/.test(t.t)).reduce((a,t)=>{if(!a.some(x=>x.xc===t.xc))a.push(t);return a},[]).sort((a,b)=>a.xc-b.xc);
  const mode=rows[h+1]&&rows[h+1].toks.some(t=>/MODULO/.test(N(t.t)))?'eja':'reg';
  const n=mode==='eja'?4:3;
  const ycols=[];for(let p=0;p<n;p++)ycols.push(disc.xc+2+2*p);
  const res={mode,info:extractInfo(rows.slice(0,h)),periods:[],subjects:[],deps:[],dataLocal:null};
  for(let p=0;p<n;p++){const y=rows[h].toks.find(t=>t.xc===ycols[p]);res.periods.push({ano:y?y.t:'',freq:'',sit:''})}
  const at=(r,c)=>{const t=r.toks.find(q=>q.xc===c);return t?t:null};
  let i=h+3;
  for(;i<rows.length;i++){const nm=at(rows[i],disc.xc);if(!nm)continue;const k=N(nm.t);if(k==='TOTAL')break;
    const s={name:nm.t,g:[]};for(let p=0;p<n;p++){const a=at(rows[i],ycols[p]-1),b=at(rows[i],ycols[p]);s.g.push({nota:a?fmtIn(num(a.t)??a.t):'',ch:b?fmtIn(num(b.t)??b.t):'',media:null,pad:false})}res.subjects.push(s)}
  for(;i<rows.length;i++){const nm=at(rows[i],disc.xc);if(!nm)continue;const k=N(nm.t);
    if(/FREQUENCIA/.test(k))for(let p=0;p<n;p++){const a=at(rows[i],ycols[p]-1);if(a){let f=num(a.raw??a.t);if(f!=null&&f<=1)f*=100;res.periods[p].freq=f!=null?fmtIn(+f.toFixed(2)):''}}
    if(/SITUACAO/.test(k)){for(let p=0;p<n;p++){const a=at(rows[i],ycols[p]-1);if(a)res.periods[p].sit=a.t}break}}
  const ph=rows.findIndex(r=>r.toks.some(t=>N(t.t)==='ESTABELECIMENTODEENSINO')&&r.toks.some(t=>/MODULOSEMESTRAL|^SERIE$/.test(N(t.t))));
  if(ph>=0){const hd=rows[ph].toks;const ce=hd.find(t=>N(t.t)==='ESTABELECIMENTODEENSINO'),cm=hd.find(t=>/MUNICIPIO/.test(N(t.t))),cl=hd[hd.length-1];
    for(let p=0;p<n;p++){const r=rows[ph+1+p];if(!r)break;const e=ce&&at(r,ce.xc),m=cm&&at(r,cm.xc),l=at(r,cl.xc);Object.assign(res.periods[p],{escola:e?e.t:'',municipio:m?m.t:'',semestre:mode==='eja'&&l?l.t:''})}}
  const re=/^(\d{4}|\(preencher\))\s*[–-]\s*Aprovado em regime de depend[êe]ncia n[oa]\s*(?:\(a\)\s*)?(?:disciplina\s*)?(.+?),\s*com nota final\s*(.+?)\.?$/i;
  const seen=new Set();
  for(const r of rows)for(const t of r.toks){const m=t.t.match(re);if(m){const cl=x=>/preencher|^\[?nota\]?$|^disciplina$/i.test(x.trim())?'':x.trim();const d={ano:cl(m[1]),disc:cl(m[2]),nota:cl(m[3])};if(!seen.has(t.t)){seen.add(t.t);res.deps.push(d)}}
    else if(/^[A-ZÀ-Úa-zà-ú ]+, \d{1,2} de [a-zç]+ de \d{4}$/.test(t.t))res.dataLocal=t.t}
  return res;
}
let PENDING_DEPS=[];
const EJA_MSG='documento de EJA: a página mudou para EJA · 4 módulos';
const isRegDoc=rows=>rows.some(r=>(r.toks||[]).some(t=>/^(MODALIDADE)?REGULAR$|ENSINOMEDIOREGULAR|MODALIDADEREGULAR/.test(N(t.t))));
const docKind=rows=>{if(isEjaDoc(rows))return 'eja';if(isRegDoc(rows))return 'reg';const h=new Set(rows.flatMap(r=>(r.toks||[]).map(t=>N(t.t))));if(['1B','2B','3B','4B'].every(x=>h.has(x))||['1T','2T','3T'].every(x=>h.has(x)))return 'reg';return null};
const isEjaDoc=rows=>rows.some(r=>(r.toks||[]).some(t=>{const k=N(t.t);return /EDUCACAODEJOVENSEADULTOS|EJANEM|^EJA[A-Z0-9_]|^TURMAEJA|^EJA$/.test(k)}));
/* tipo de ensino do aluno: vale o do ÚLTIMO ano (onde ele se formou). Ex.: 1ª série no regular em 2021 e EJA até 2025 → EJA */
function ultimoTipo(){const a=state.kindAno||{},n=state.kindN||{};if(a.reg==null||a.eja==null)return null;if(a.eja!==a.reg)return a.eja>a.reg?'eja':'reg';
  /* mesmo ano nos dois: desempata pelo tipo com mais fichas */
  return (n.eja||0)>(n.reg||0)?'eja':(n.reg||0)>(n.eja||0)?'reg':null}
function ensureMode(k,name,entry,ano){
  if(k==='eja')state.ejaSeen=1;else state.regSeen=1;
  const kn=state.kindN||(state.kindN={});entry._kinds=entry._kinds||{};if(!entry._kinds[k]){entry._kinds[k]=1;kn[k]=(kn[k]||0)+1}
  const ka=state.kindAno||(state.kindAno={});const y=+ano||0;if(y&&(ka[k]==null||y>ka[k]))ka[k]=y;else if(ka[k]==null)ka[k]=0;
  const nome=t=>t==='eja'?'EJA · 4 módulos':'Ensino Médio Regular · 3 séries',tipo=t=>t==='eja'?'EJA':'Ensino Médio Regular';
  if(state.ejaSeen&&state.regSeen){const u=ultimoTipo();
    if(!u){if(state.mode!==k)state.modeAlert=`O aluno tem fichas de EJA e do Ensino Médio Regular, e não consegui ver qual é a do último ano. A página ficou em ${nome(state.mode)}. Se o aluno se formou no outro tipo, clique nele no topo.`;return}
    const msg=`O aluno tem fichas do Ensino Médio Regular (até ${ka.reg||'?'}) e de EJA (até ${ka.eja||'?'}). Vale o tipo do último ano: ${tipo(u)}.`;
    if(u==='reg'&&state.mode==='eja'&&state.periods.length>3&&periodHasData(3)){state.modeAlert=msg+' A página continua em EJA porque o 4º módulo já tem notas; confira.';return}
    if(state.mode!==u){setMode(u);entry.modeNote='a página mudou para '+nome(u)+' (tipo do último ano)'}
    state.modeAlert=msg+' Confira se as fichas do outro tipo ficaram na coluna certa.';return}
  if(state.mode===k)return;
  setMode(k);state.modeAlert=`O arquivo “${name}” é de ${tipo(k)}. A página estava em ${tipo(k==='eja'?'reg':'eja')} e mudou sozinha para ${nome(k)}. Se estiver errado, clique no tipo certo no topo e anexe de novo.`;
  entry.modeNote='documento de '+tipo(k)+': a página mudou para '+nome(k)}
function fileFp(buf){const u=new Uint8Array(buf);let h=0x811c9dc5;for(let i=0;i<u.length;i++){h^=u[i];h=Math.imul(h,0x01000193)}return u.length+':'+(h>>>0).toString(16)}
function srcFp(f){if(!f||!f.src||!f.src.buf)return null;if(!f.src.fp)f.src.fp=fileFp(f.src.buf);return f.src.fp}
let TALVEZ_DEP=[];
/* decide se uma aba curta (até 3 disciplinas, sem "considerado: ...") é o registro de uma dependência:
   é dependência quando TODAS as disciplinas dela ficaram abaixo do mínimo num módulo/série anterior */
function resolverTalvezDep(){const lista=TALVEZ_DEP;TALVEZ_DEP=[];
  for(const pd of lista){const ano=+pd.ano||0;
    const falhou=nome=>{const k=canon(nome).key;return state.subjects.some(s=>canon(s.name).key===k&&s.g.some((g,i)=>isDep(g,i)&&(!ano||!+state.periods[i].ano||+state.periods[i].ano<=ano)))};
    const ehDep=pd.subs.length&&pd.subs.every(x=>falhou(x.name));const nomes=pd.subs.map(x=>canon(x.name).name).join(', ');
    if(ehDep){PENDING_DEPS.push(pd);pd.entry.src&&pd.entry.src.docs.push({role:'dep',sheet:pd.sheet,ano:pd.ano,escola:pd.doc.escola,subjects:pd.subs.map(x=>x.name)});pd.entry.depDocs=pd.entry.depDocs||[];pd.entry.depDocs.push(pd);
      pd.entry.status=pd.entry.status.replace('__talvez__',`ficha de dependência (${nomes}${pd.ano?', cumprida em '+pd.ano:''})`)}
    else{let p=inferPeriod(pd.info,pd.ctx,state.mode);if(p==null||(periodHasData(p)&&String(state.periods[p].ano)!==String(pd.ano)))p=nextFreePeriod(pd.ano);
      if(p==null||p>=state.periods.length){pd.entry.status=pd.entry.status.replace('__talvez__',`aba com ${nomes}: não sei onde colocar (confira se é ficha de dependência)`);continue}
      applyFicha({subs:pd.subs,info:pd.info,ano:pd.ano,sit:'',freqGlobal:pd.subs.freqGlobal,escola:pd.doc.escola,nPer:pd.subs.nPer},p);{const am=amparoDe(pd.rows);if(am)state.periods[p].amparo=am}pd.entry.src&&pd.entry.src.docs.push({role:'fia',sheet:pd.sheet,p,ano:pd.ano,escola:pd.doc.escola});
      pd.entry.status=pd.entry.status.replace('__talvez__',`${LABELS[state.mode][p]}${pd.ano?' · '+pd.ano:''} · ${pd.subs.length} disciplina(s)`)}}}
async function handleFiles(list){
  if(!READY){setStatus('Aguarde o carregamento do modelo…');return}
  PENDING_DEPS=[];TALVEZ_DEP=[];
  const my=SESSION;const alive=()=>my===SESSION;
  for(const file of list){
    if(!alive())return;
    const entry={name:file.name,status:'lendo…',period:null};files.push(entry);renderFiles();
    try{
      const buf=await file.arrayBuffer();if(!alive())return;const isImg=/^image\//.test(file.type)||/\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name);
      const isPdf=isImg||/\.pdf$/i.test(file.name)||file.type==='application/pdf';
      {const fp=fileFp(buf);const twin=files.find(f=>f!==entry&&srcFp(f)===fp);if(twin){entry.status=`Arquivo repetido: já está na lista como “${twin.name}”. Não foi lido de novo.`;entry.dup=true;entry.ok=false;renderFiles();continue}}
      entry.src={kind:isImg?'img':(isPdf?'pdf':'xlsx'),buf:buf.slice(0),docs:[]};entry.src.fp=fileFp(buf);const addDoc=d=>{if(entry.src.kind!=='xlsx'&&entry.src.docs.some(x=>x.role===d.role))return;entry.src.docs.push(d)};
      let groups=[],canvases=null;READING_OCR=false;
      if(isPdf){
        let pages=isImg?[]:await rowsFromPdf(buf);if(!alive())return;const chars=pages.flat().reduce((a,r)=>a+r.toks.reduce((b,t)=>b+t.t.length,0),0);
        if(isImg||chars<30){
          entry.status=isImg?'abrindo a foto…':'PDF escaneado: abrindo as páginas…';renderFiles();
          canvases=isImg?[await imageToCanvas(file)]:await pdfToCanvases(buf,6);if(!alive())return;
          if(readMode()==='ia'){
            entry.status='lendo com IA (Claude)… pode levar até 1 minuto';renderFiles();
            const r=await readWithAI(canvases);if(!alive())return;
            if(r&&r.aluno&&outroAluno(r.aluno.nome)&&r.tipo!=='ata_resultados')throw new Error(OUTRO_MSG(r.aluno.nome));
            const d=applyAI(r,entry);
            {const role={ficha_individual:'fia',ficha_matricula:'mat',dependencia:'dep',ata_resultados:'arf'}[r.tipo];const p0=(r.periodos||[])[0]||{};if(role&&!entry.fund)entry.src.docs.push({role,sheet:'',p:p0.etapa>=1?p0.etapa-1:null,ano:p0.ano,escola:cleanEscola(p0.escola),subjects:(p0.disciplinas||[]).map(x=>x.nome)})}
            entry.status=entry.fund?FUND_MSG:(d.length?d.join(' | '):'IA não encontrou dados de aluno neste documento')+' · confira os campos';entry.ok=true;entry.ai=true;renderFiles();renderAll();continue;
          }
          pages=[];for(let i=0;i<canvases.length;i++){ocrProgress=p=>{entry.status=`lendo a imagem no computador${canvases.length>1?` (página ${i+1} de ${canvases.length})`:''}… ${Math.round(p*100)}%`;renderFiles()};pages.push(await ocrCanvas(canvases[i]));if(!alive())return}
          ocrProgress=null;entry.ocr=true;READING_OCR=true;
        }
        let cur=null;for(const pg of pages){const hasHead=pg.some(r=>r.toks.some(t=>/^(DISCIPLINAS?|COMPONENTE)/.test(N(t.t))));if(hasHead||!cur){cur={rows:[],sheet:''};groups.push(cur)}cur.rows.push(...pg)}
      }else{
        const wb=XLSX.read(buf,{type:'array',cellDates:true});
        for(const sn of wb.SheetNames){const rows=rowsFromSheet(wb.Sheets[sn]);if(rows.length)groups.push({rows,sheet:sn})}
      }
      const done=[];let fundOnly=groups.length>0;
      for(const g of groups){
        if(isFundamental(g.rows)){if(!done.includes(FUND_MSG))done.push(FUND_MSG);continue}
        fundOnly=false;
        {const k=docKind(g.rows);if(k)ensureMode(k,file.name,entry,inferYear(extractInfo(g.rows),{sheet:g.sheet,file:file.name},g.rows))}
        {const hg=(isPdf?parseHistPdf(g.rows):parseHist(g.rows))?null:parseHistGenerico(g.rows,isPdf);if(hg){importarHistoricoOutraEscola(hg,done);continue}}
        {const hist=isPdf?parseHistPdf(g.rows):parseHist(g.rows);if(hist){if(outroAluno(hist.info.nome))throw new Error(OUTRO_MSG(String(hist.info.nome).toUpperCase()));applyHist(hist);done.push('histórico importado ('+(hist.mode==='eja'?'EJA':'Regular')+', '+hist.subjects.length+' disciplinas)');continue}}
        const arf=parseArf(g.rows,isPdf);
        if(arf){entry.arf=arf;addDoc({role:'arf',sheet:g.sheet,ano:arf.ano,escola:arf.escola,serie:(String((arf.info||{}).serie||'').match(/\d/)||[''])[0]});done.push(`ata de resultados ${arf.ano||''} · ${arf.students.length} alunos`);continue}
        const subs=parseTable(g.rows,isPdf);if(!subs)continue;
        const info=extractInfo(g.rows);const ctx={sheet:g.sheet,file:file.name};
        if(outroAluno(info.nome))throw new Error(OUTRO_MSG(String(info.nome).toUpperCase()));
        const ano=inferYear(info,ctx,g.rows);
        if(isDependencyFile(g.rows)||/DEPEND/.test(N(g.sheet||''))){fillAluno(info);const pd={subs,ano,entry,sheet:g.sheet,info,file:file.name,rows:g.rows};PENDING_DEPS.push(pd);addDoc({role:'dep',sheet:g.sheet,ano,escola:cleanEscola(info.escola),subjects:subs.map(x=>x.name)});entry.depDocs=entry.depDocs||[];entry.depDocs.push(pd);done.push('ficha de dependência');continue}
        if(subs.length<=3&&!findSit(g.rows)){fillAluno(info);TALVEZ_DEP.push({subs,ano,entry,sheet:g.sheet,info,file:file.name,ctx,rows:g.rows,doc:{sheet:g.sheet,ano,escola:cleanEscola(info.escola)}});done.push('__talvez__');continue}
        let p=inferPeriod(info,ctx,state.mode);
        if(p==null)p=nextFreePeriod(ano);
        /* proteção: uma ficha de outro ano nunca apaga um módulo/série já preenchido */
        if(p!=null&&p<state.periods.length&&periodHasData(p)&&state.periods[p].ano&&ano&&String(state.periods[p].ano)!==String(ano)){const q=nextFreePeriod(ano);
          if(q!=null&&q<state.periods.length&&!periodHasData(q)){done.push(`aviso: ia ocupar o ${LABELS[state.mode][p]} (${state.periods[p].ano}); colocada no ${LABELS[state.mode][q]}`);p=q}
          else throw new Error(`Esta ficha de ${ano} apagaria o ${LABELS[state.mode][p]} de ${state.periods[p].ano}. Confira se ela é de outro aluno, repetida ou uma ficha de dependência.`)}
        /* 4ª ficha (ou ficha da 4ª série/módulo) com a página no regular: só cabe na EJA, que tem 4 colunas */
        if(state.mode==='reg'&&ultimoTipo()!=='reg'&&(p==null||p>=3)&&(p===3||(p==null&&[0,1,2].every(periodHasData)))){
          setMode('eja');state.modeAlert=`Há 4 fichas (séries ou módulos) para este aluno, e o regular só tem 3. A página mudou para EJA · 4 módulos. Se estiver errado, clique no tipo certo no topo.`;entry.modeNote='4ª ficha: a página mudou para EJA · 4 módulos';if(p==null)p=nextFreePeriod(ano)}
        if(p==null||p>=state.periods.length)throw new Error(state.mode==='reg'?'Esta ficha é de um 4º módulo (EJA). Clique em "EJA · 4 módulos" no topo e anexe de novo.':'Não encontrei uma coluna livre para esta ficha.');
        applyFicha({subs,info,ano,sit:findSit(g.rows),freqGlobal:subs.freqGlobal,escola:cleanEscola(info.escola),nPer:subs.nPer},p);{const am=amparoDe(g.rows);if(am)state.periods[p].amparo=am}addDoc({role:'fia',sheet:g.sheet,p,ano,escola:cleanEscola(info.escola)});entry.parsed=entry.parsed||[];entry.parsed.push({subs,info,ano,p});
        done.push(`${LABELS[state.mode][p]}${ano?' · '+ano:''} · ${subs.length} disciplinas`);
      }
      if(entry.arf){const st=matchArf(entry.arf);if(st){applyArf(entry.arf,st);entry.arfDone=st.nome}}
      if(fundOnly&&done.length){entry.status=FUND_MSG;entry.fund=true;entry.ok=true;renderFiles();continue}
      if(!done.length){
        const info=extractInfo(groups.flatMap(g=>g.rows));
        const n=ALUNO_FIELDS.filter(([k])=>info[k]).length;
        if(n<2){
          if(readMode()==='ia'&&isPdf){entry.status='formato não reconhecido; lendo com IA (Claude)…';renderFiles();
            const r=await readWithAI(canvases||await pdfToCanvases(buf,6));const d=applyAI(r,entry);
            entry.status=entry.fund?FUND_MSG:(d.length?d.join(' | '):'IA não encontrou dados de aluno neste documento')+' · confira os campos';entry.ok=true;entry.ai=true;renderFiles();renderAll();continue}
          throw new Error(entry.ocr?'Não consegui ler esta imagem. Tente uma foto mais nítida, reta e com boa luz, ou ative "Ler com IA".':'Não encontrei notas nem dados do aluno neste arquivo. Se for de outra escola, ative "Ler com IA" no quadro abaixo da área de anexos.')}
        if(outroAluno(info.nome))throw new Error(OUTRO_MSG(String(info.nome).toUpperCase()));
        const oficial=isFichaMatricula(groups.flatMap(g=>g.rows));if(oficial)addDoc({role:'mat',sheet:(groups[0]||{}).sheet||'',ocr:!!entry.ocr,rows:groups.flatMap(g=>g.rows),text:groups.flatMap(g=>g.rows).map(r=>(r.toks||[]).map(t=>t.t).join('  ')).join('\n')});if(oficial)matIngest(groups.flatMap(g=>g.rows).map(r=>(r.toks||[]).map(t=>t.t).join('  ')).join('\n'));
        const filled=applyAlunoDoc(info,entry,oficial);
        done.push((oficial&&!entry.ocr?'ficha de matrícula (dados pessoais têm prioridade)':entry.ocr?'dados do aluno lidos de imagem (sem prioridade: confira cada campo)':'dados do aluno')+(filled.length?' · '+(oficial?'usado: ':'preenchido: ')+filled.join(', '):' · tudo já conferia'));
      }
      entry.status=(entry.modeNote?entry.modeNote+' | ':'')+done.join(' | ')+(entry.ocr?' · lido por OCR: confira os números':'')+((entry.skipped||[]).length?' · ilegível, não usado: '+entry.skipped.join(', '):'');READING_OCR=false;entry.ok=true;state.example=false;
    }catch(e){console.error(e);entry.status=friendlyErr(e);entry.err=true}
    renderFiles();renderAll();
  }
  if(!alive())return;
  resolverTalvezDep();renderFiles();
  for(const pd of PENDING_DEPS){const k=applyDepResults(pd.subs,pd.ano,amparoDe(pd.rows));pd.applied=k;pd.entry.status=pd.entry.status.replace('ficha de dependência',`ficha de dependência: ${k} nota(s) nas observações`)}
  PENDING_DEPS=[];
  renderAluno();
  for(const f of files)if(f.arf&&!f.arfDone){const st=matchArf(f.arf);if(st){applyArf(f.arf,st);f.arfDone=st.nome}}
  renderFiles();renderAll();
}
function cleanEscola(e){if(!e)return '';return String(e).replace(/^\s*\d{5,}\s*-\s*/,'').trim().toUpperCase()}
function parseArf(rows,isPdf){
  const tol=isPdf?6:0.1;
  const h=rows.findIndex(r=>r.toks.some(t=>N(t.t)==='NOMEALUNO'||N(t.t)==='NOMEDOALUNO'||N(t.t)==='ALUNO')&&r.toks.some(t=>/^MATRICULA$/.test(N(t.t))));
  if(h<1)return null;
  const hr=rows[h],dr=rows[h-1];
  const tm=hr.toks.find(t=>N(t.t)==='MATRICULA'),tn=hr.toks.find(t=>/^(NOMEALUNO|NOMEDOALUNO|ALUNO)$/.test(N(t.t)));
  const near=(r,x)=>r.toks.find(q=>Math.abs(q.xc-x)<=tol)||(isPdf?r.toks.filter(q=>q.x0<=x+tol).pop():null);
  const discs=[];
  for(const t of hr.toks){if(N(t.t)!=='NOTA')continue;const d=isPdf?dr.toks.filter(q=>q.x0<=t.xc+tol).pop():near(dr,t.xc);if(!d||discs.some(x=>x.name===d.t))continue;
    const ft=hr.toks.find(q=>N(q.t)==='FALTAS'&&q.xc>t.xc);discs.push({name:d.t,x:t.xc,fx:ft?ft.xc:null})}
  if(!discs.length)return null;
  const fq=dr.toks.find(t=>/FREQUENCIA/.test(N(t.t))),sq=dr.toks.find(t=>/SITUACAO/.test(N(t.t)));
  const students=[];
  for(let i=h+1;i<rows.length;i++){const r=rows[i];const n=near(r,tn.xc);if(!n||!/[A-Za-zÀ-ú]{2}/.test(n.t))continue;const m=near(r,tm.xc);
    const notas=discs.map(d=>{const v=near(r,d.x);return {disc:d.name,nota:v?num(v.t):null}}).filter(x=>x.nota!=null);
    const fv=fq&&near(r,fq.xc),sv=sq&&near(r,sq.xc);
    students.push({mat:m?m.t:'',nome:n.t,notas,freq:fv?num(fv.t):null,sit:sv?sv.t:''})}
  if(!students.length)return null;
  const info=extractInfo(rows.slice(0,h-1));
  return {info,ano:inferYear(info,{},rows.slice(0,h-1)),escola:cleanEscola(info.escola),students};
}
function matchArf(arf){
  if(state.example)return null;
  const dig=x=>String(x||'').replace(/\D/g,'');const m=dig(state.aluno.matricula),k=N(state.aluno.nome);
  let s=m.length>=6&&arf.students.find(x=>dig(x.mat)===m);if(s)return s;
  if(!k)return null;
  s=arf.students.find(x=>N(x.nome)===k);if(s)return s;
  const words=t=>String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().split(/[^A-Z]+/).filter(w=>w.length>2&&!['DOS','DAS','DES'].includes(w));
  const a=words(state.aluno.nome);let best=null,bs=0;
  for(const x of arf.students){const b=words(x.nome);const inter=a.filter(w=>b.includes(w)).length;const sc=inter/Math.max(a.length,b.length);if(sc>bs){bs=sc;best=x}}
  return bs>=0.75?best:null;
}
function applyArf(arf,stu){
  resetIfExample();
  if(!state.aluno.nome)state.aluno.nome=stu.nome.toUpperCase();
  if(stu.mat&&(!state.aluno.matricula||(state.ocrFields||{}).matricula||N(state.aluno.matricula)===N(stu.mat))){state.aluno.matricula=stu.mat;if(state.ocrFields)delete state.ocrFields.matricula}
  let p=inferPeriod(arf.info,{},state.mode);
  if(p==null){const i=state.periods.findIndex(x=>x.ano===String(arf.ano));p=i>=0?i:nextFreePeriod(arf.ano)}
  if(p==null||!state.periods[p])return;
  const per=state.periods[p];if(arf.ano&&!per.ano)per.ano=String(arf.ano);
  const sit=mapSit(stu.sit);
  /* guarda o que a ata diz, para comparar com a FIA */
  state.ataNotas=state.ataNotas||{};state.ataNotas[p]={ano:String(arf.ano||''),sit,notas:stu.notas.map(x=>({disc:x.disc,nota:x.nota}))};
  if(periodHasData(p)){if(!per.sit&&sit)per.sit=sit;if(!per.freq&&stu.freq!=null)per.freq=fmtIn(stu.freq);return}
  const subs=stu.notas.map(x=>({name:x.disc,total:x.nota,media:x.nota!=null?x.nota/defaultPer():null}));
  applyFicha({subs,info:{},ano:arf.ano,sit,freqGlobal:stu.freq,escola:arf.escola},p);
}
function nextFreePeriod(ano){
  const n=nPer();
  if(ano){const i=state.periods.findIndex(p=>p.ano===String(ano));if(i>=0&&!periodHasData(i))return i}
  for(let p=0;p<n;p++)if(!periodHasData(p)&&!state.periods[p].ano)return p;
  for(let p=0;p<n;p++)if(!periodHasData(p))return p;
  return 0;
}
const periodHasData=p=>state.subjects.some(s=>s.g[p]&&(s.g[p].nota!==''||s.g[p].ch!==''));
function normField(k,v){v=String(v??'').trim();if(!v)return '';
  if(k==='orgao')return v.replace(/\s*\/\s*/g,' / ').replace(/\/ R[IlJ1]$/,'/ RJ');
  if(k==='nome')return v.toUpperCase();
  if(k==='naturalidade')return titleCase(v.replace(/\s*[-\/]\s*[A-Z]{2}$/,''));
  if(k==='nacionalidade'&&/^BRASIL(I?ERA|EIRO)$/.test(N(v)))return 'Brasileira';
  if(k==='mae'||k==='pai'||k==='nacionalidade')return titleCase(v);
  if(k==='nascimento'||k==='expedicao')return dateStr(v);
  return v}
const FIELD_LABEL=Object.fromEntries(ALUNO_FIELDS.map(([k,l])=>[k,l]));
const PREPOS=new Set(['DE','DA','DO','DOS','DAS','E','DI','DU']);
let READING_OCR=false;
function validField(k,v){
  v=String(v||'').trim();if(!v)return '';
  if(k==='nascimento'||k==='expedicao'){const m=v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);if(!m)return 'data ilegível';const d=+m[1],mo=+m[2],y=+m[3];
    if(d<1||d>31||mo<1||mo>12||y<1930||y>new Date().getFullYear())return 'data impossível';return ''}
  if(/^[^:]{2,30}:\s*\S/.test(v))return 'pegou outro campo do documento';
  if(['nome','mae','pai','naturalidade'].includes(k)){
    if(/[\d:;@#=_|]/.test(v))return 'texto com números ou sinais';
    const w=v.toUpperCase().split(/\s+/);if(PREPOS.has(w[w.length-1]))return 'nome parece cortado';
    if(k!=='naturalidade'&&w.length<2)return 'nome parece incompleto'}
  if(k==='identidade'&&v.replace(/\D/g,'').length<5)return 'número ilegível';
  if(k==='matricula'&&v.replace(/\D/g,'').length<6)return 'número ilegível';
  return '';
}
function applyAlunoDoc(info,entry,oficial){
  const ocr=!!(entry&&entry.ocr);if(ocr)oficial=false;
  state.ocrFields=state.ocrFields||{};entry.skipped=entry.skipped||[];
  if(state.example){state=blankState(state.mode)}
  const filled=[],diff=[];
  for(const [k] of ALUNO_FIELDS){const v=normField(k,info[k]);if(!v)continue;const cur=state.aluno[k]||'';
    const bad=validField(k,v);if(bad&&(ocr||/data/.test(bad)||/outro campo/.test(bad))){entry.skipped.push(`${FIELD_LABEL[k]} (${bad})`);continue}
    if(oficial){if(N(cur)!==N(v)){state.aluno[k]=v;filled.push(FIELD_LABEL[k]+(cur&&k!=='nacionalidade'?` (antes: ${cur})`:''))}state.fromMatricula=state.fromMatricula||{};state.fromMatricula[k]=v;continue}
    if(!cur||(k==='nacionalidade'&&cur==='Brasileira'&&N(v)!==N(cur))){state.aluno[k]=v;filled.push(FIELD_LABEL[k]);if(ocr)state.ocrFields[k]=1}
    else if(N(cur)!==N(v))diff.push({k,cur,v,ocr})}
  entry.diff=diff;
  return filled;
}
const isFichaMatricula=rows=>rows.some(r=>r.toks.some(t=>/^(FICHADEMATRICULA|CONFIRMACAODEMATRICULA)/.test(N(t.t))));
function fillAluno(info){
  state.ocrFields=state.ocrFields||{};
  const A=state.aluno;const m={nome:'nome',matricula:'matricula',nascimento:'nascimento',naturalidade:'naturalidade',mae:'mae',pai:'pai',identidade:'identidade',orgao:'orgao',expedicao:'expedicao',nacionalidade:'nacionalidade'};
  if(state.example){state.aluno=blankState(state.mode).aluno}
  for(const k in m){if(info[k]&&!READING_OCR&&state.ocrFields[m[k]]&&N(info[k])===N(state.aluno[m[k]]))delete state.ocrFields[m[k]];if(info[k]&&(!state.aluno[m[k]]||(!READING_OCR&&state.ocrFields[m[k]])||(k==='nacionalidade'&&state.aluno.nacionalidade==='Brasileira'))){if(!READING_OCR)delete state.ocrFields[m[k]];let v=String(info[k]).trim();{const bad=validField(m[k],normField(m[k],v));if(bad&&(READING_OCR||/data|outro campo/.test(bad)))continue}if(READING_OCR)state.ocrFields[m[k]]=1;if(k==='nome')v=v.toUpperCase();else if(k==='naturalidade')v=titleCase(v.replace(/\s*[-\/]\s*[A-Z]{2}$/,''));else if(k==='mae'||k==='pai'||k==='nacionalidade')v=titleCase(v);state.aluno[m[k]]=v}}
}
function resetIfExample(){if(state.example){const keep=state.mode;state=blankState(keep);files=files.filter(f=>!f.example)}}
function applyFicha(res,p){
  resetIfExample();fillAluno(res.info);
  const per=state.periods[p];if(res.ano)per.ano=String(res.ano);
  state.deps=state.deps.filter(x=>!(x.auto===p&&!x.nota&&!x.edited));
  let tf=0,chs=0,fr=[],deps=[];
  for(const r of res.subs){
    const c=canon(r.name);let s=state.subjects.find(x=>canon(x.name).key===c.key);
    if(!s){s={name:c.name,g:Array.from({length:nPer()},blankG)};state.subjects.push(s)}
    const nP=normPer(res.nPer);
    const bims=[r.n1,r.n2,r.n3,r.n4].filter(v=>typeof v==='number');
    let total=r.total!=null?r.total:(bims.length?bims.reduce((a,b)=>a+b,0):null);
    if(total==null&&r.media!=null)total=r.media*nP;
    const media=r.media!=null?r.media:(total!=null?total/nP:null);
    const nota=total;
    const g=s.g[p];g.nota=nota!=null?fmtIn(+nota.toFixed(2)):'';g.media=media;g.per=nP;
    if(r.ch!=null&&r.ch>0){g.ch=fmtIn(r.ch);g.pad=false}else{const d=defCh(c.name,p);g.ch=d!=null?fmtIn(d):'';g.pad=d!=null}
    if(r.tf!=null&&r.ch!=null&&r.ch>0){tf+=r.tf;chs+=r.ch}
    if(r.freq!=null)fr.push(r.freq>1?r.freq/100:r.freq);
    if(media!=null?media<5:(total!=null&&total<5*nP))deps.push({disc:c.name,nota:''});
  }
  if(res.freqGlobal!=null){const f=res.freqGlobal>1?res.freqGlobal:res.freqGlobal*100;per.freq=fmtIn(+f.toFixed(2))}
  else if(!per.freq){if(chs>0)per.freq=fmtIn(+((1-tf/chs)*100).toFixed(2));else if(fr.length)per.freq=fmtIn(+(fr.reduce((a,b)=>a+b,0)/fr.length*100).toFixed(2))}
  if(res.escola)per.escola=res.escola;
  if(res.sit)per.sit=res.sit;else if(!per.sit)per.sit=deps.length?'APROV. C/DEP':'APROVADO';
  if(per.sit!=='APROV. C/DEP')deps=[];
  for(const d of deps)if(!state.deps.some(x=>x.ano===per.ano&&N(x.disc)===N(d.disc)))state.deps.push({ano:per.ano,disc:d.disc,nota:'',auto:p});
  state.subjects=state.subjects.filter(s=>s.g.some(g=>g.nota!==''||g.ch!==''));
  sortSubjects();
}
function applyDepResults(subs,ano,extra){
  resetIfExample();let k=0;
  for(const r of subs){const c=canon(r.name);
    // regra da dependência: a nota final é a MAIOR nota tirada em qualquer bimestre/trimestre (ex.: 1, 4 e 6 → 6);
    // sem notas por bimestre, usa a média final; senão o total da ficha
    const lancadas=[r.n1,r.n2,r.n3,r.n4].filter(v=>typeof v==='number');
    const v=lancadas.length?Math.max(...lancadas):(r.media!=null?r.media:(r.total!=null?r.total:null));if(v==null)continue;
    let d=state.deps.find(x=>N(canon(x.disc||'').name)===N(c.name)&&!x.nota)||state.deps.find(x=>N(canon(x.disc||'').name)===N(c.name));
    // mais de uma ficha da mesma dependência (ex.: 1º e 2º semestre): fica a maior nota entre elas
    if(d&&d.depMax!=null&&d.nota&&v<=d.depMax){k++;continue}
    if(!d){d=state.deps.find(x=>!x.disc);if(d)d.disc=c.name}
    if(!d){d={ano:ano?String(ano):'',disc:c.name,nota:''};state.deps.push(d)}
    d.nota=fmtIn(+v.toFixed(2));d.depMax=v;if(ano)d.anoCumpriu=String(ano);if(extra)d.extra=extra;k++}
  return k;
}
function applyHist(h){
  const st=blankState(h.mode);
  Object.keys(st.aluno).forEach(k=>{if(h.info[k])st.aluno[k]=normField(k,h.info[k])});
  h.periods.forEach((p,i)=>{if(p.municipio)p.municipio=p.municipio.replace(/\/\s*R[IL1]$/,'/RJ');Object.assign(st.periods[i],Object.fromEntries(Object.entries(p).filter(([k,v])=>v!==''&&v!=null)))});
  st.subjects=h.subjects;st.deps=h.deps;if(h.dataLocal)st.dataLocal=h.dataLocal;
  state=st;syncMode();
}

/* ============ interface ============ */
function setStatus(t,bad){const s=$('#status');s.textContent=t;s.style.color=bad?'var(--bad)':''}
function renderFilesOld(){
  $('#files').innerHTML=files.map((f,i)=>`<li><span class="fname">${esc_(f.name)}</span><button type="button" class="ib" data-rmfile="${i}" aria-label="Remover da lista">✕</button><span class="fmeta ${f.err?'ferr':''} ${f.fund?'ffund':''}">${esc_(f.status)}${f.arfDone?' · aluno: '+esc_(f.arfDone):''}</span>${(f.diff||[]).length?`<div class="fmeta" style="grid-column:1/-1;display:flex;flex-direction:column;gap:6px">${f.diff.map((d,j)=>`<div class="row" style="gap:6px 10px"><span class="chip w">diferente</span><span><b>${esc_(FIELD_LABEL[d.k])}</b>: na tela “${esc_(d.cur)}”, neste arquivo “${esc_(d.v)}”</span><button type="button" class="btn small" data-usediff="${i},${j}">Usar deste arquivo</button></div>`).join('')}</div>`:''}${f.arf&&!f.arfDone?`<span class="fmeta" style="grid-column:1/-1">${state.aluno.nome&&!state.example?'Não encontrei '+esc_(state.aluno.nome)+' nesta ata. Escolha o aluno:':'Anexe a FIA ou a ficha de matrícula para o aluno ser identificado sozinho, ou escolha:'}</span><label class="f" style="grid-column:1/-1">Aluno desta ata<select id="arf-${i}" data-arf="${i}"><option value="">Escolha o aluno…</option>${f.arf.students.map((s,j)=>`<option value="${j}">${esc_(s.nome)}</option>`).join('')}</select></label>`:''}</li>`).join('');
}
function isPristine(){return !files.length&&!state.subjects.length&&!ALUNO_FIELDS.some(([k])=>k!=='nacionalidade'&&state.aluno[k])&&!state.deps.length}
function renderAluno(){const pr=isPristine();
  $('#aluno').innerHTML=ALUNO_FIELDS.map(([k,l,w,ph])=>`<label class="f ${w||''}">${l}<input id="al-${k}" data-al="${k}" value="${esc_(state.aluno[k]||'')}" ${ph?`placeholder="${ph}"`:''} class="${state.aluno[k]||pr?'':'empty'} ${(state.ocrFields||{})[k]&&state.aluno[k]?'ocrf':''}" ${(state.ocrFields||{})[k]&&state.aluno[k]?'title="Lido de imagem (OCR): confira letra por letra"':''}></label>`).join('');
}
function renderGrades(){
  const n=nPer(),L=LABELS[state.mode];
  let h=`<thead><tr><th class="left" rowspan="2">Disciplina</th>${L.map((l,p)=>`<th colspan="2">${l}<br><input id="ano-${p}" data-ano="${p}" value="${esc_(state.periods[p].ano)}" placeholder="ano" style="width:70px;margin-top:3px"></th>`).join('')}<th rowspan="2">C/H total</th><th rowspan="2"></th></tr><tr>${L.map(()=>'<th>Nota</th><th>C/H</th>').join('')}</tr></thead><tbody>`;
  state.subjects.forEach((s,i)=>{
    let tot=0;h+=`<tr><td class="left"><input id="sn-${i}" data-sn="${i}" value="${esc_(s.name)}" style="min-width:220px"></td>`;
    for(let p=0;p<n;p++){const g=s.g[p];const c=num(g.ch);if(c!=null)tot+=c;
      h+=`<td><input class="n ${isDep(g,p)?'dep':''}" id="gn-${i}-${p}" data-gn="${i},${p}" value="${esc_(g.nota)}" inputmode="decimal"></td><td><input class="ch ${g.pad?'pad':''}" id="gc-${i}-${p}" data-gc="${i},${p}" value="${esc_(g.ch)}" inputmode="numeric" title="${g.pad?'Carga horária padrão do modelo — confira':''}"></td>`}
    h+=`<td class="tot" id="tot-${i}">${tot||''}</td><td><div class="rowbtns"><button type="button" class="ib" data-up="${i}" aria-label="Subir">↑</button><button type="button" class="ib" data-down="${i}" aria-label="Descer">↓</button><button type="button" class="ib" data-rm="${i}" aria-label="Remover disciplina">✕</button></div></td></tr>`;
  });
  h+=`</tbody><tfoot><tr><th class="left">% Frequência anual</th>${state.periods.map((p,i)=>`<td colspan="2"><input id="fr-${i}" data-fr="${i}" value="${esc_(p.freq)}" placeholder="ex.: 94,24" style="width:90px"></td>`).join('')}<td></td><td></td></tr>
  <tr><th class="left">Situação final</th>${state.periods.map((p,i)=>`<td colspan="2"><select id="si-${i}" data-si="${i}" style="width:auto">${SIT.map(s=>`<option ${s===p.sit?'selected':''} value="${s}">${s||'—'}</option>`).join('')}</select></td>`).join('')}<td></td><td></td></tr></tfoot>`;
  $('#grades').innerHTML=h;
}
function renderPlaces(){
  const eja=state.mode==='eja',L=LABELS[state.mode];
  $('#places').innerHTML=`<thead><tr><th class="left">${eja?'Módulo':'Série'}</th><th class="left">Estabelecimento de ensino</th><th class="left">Município/Estado</th>${eja?'<th class="left">Semestre</th>':''}</tr></thead><tbody>`+
   state.periods.map((p,i)=>`<tr><td class="left">${L[i]}</td><td class="left"><input id="pe-${i}" data-pe="${i}" value="${esc_(p.escola)}"></td><td class="left"><input id="pm-${i}" data-pm="${i}" value="${esc_(p.municipio)}"></td>${eja?`<td class="left"><input id="ps-${i}" data-ps="${i}" value="${esc_(p.semestre)}" placeholder="${esc_(semestreAuto(i)||'ex.: 1º de 2024')}"></td>`:''}</tr>`).join('')+'</tbody>';
}
function renderDepsOld(){
  const subjOpts=state.subjects.map(s=>`<option value="${esc_(s.name)}">`).join('');
  $('#deps').innerHTML=(state.deps.length?`<div class="dep-row" style="font-size:.76rem;font-weight:600;color:var(--muted)"><span>Ano</span><span>Disciplina</span><span>Nota final</span><span></span></div>`:'<p class="hint" style="margin:0">Nenhuma dependência. As linhas de observação não aparecem no histórico.</p>')+
    state.deps.map((d,i)=>`<div class="dep-row"><input id="da-${i}" data-da="${i}" value="${esc_(d.ano)}" placeholder="ano" class="${d.ano?'':'empty'}"><input id="dd-${i}" data-dd="${i}" value="${esc_(d.disc)}" list="subj-list" placeholder="disciplina" class="${d.disc?'':'empty'}"><input id="dn-${i}" data-dn="${i}" value="${esc_(d.nota)}" placeholder="(preencher)" class="${d.nota?'':'empty'}" inputmode="decimal"><button type="button" class="ib" data-rmdep="${i}" aria-label="Remover dependência">✕</button></div>`).join('')+
    `<datalist id="subj-list">${subjOpts}</datalist>`;
}
function renderObsPreview(){
  const ls=obsLines(state);
  $('#obs-preview').innerHTML='<b style="font-style:normal">Observação:</b>\n'+(ls.length?ls.map(l=>esc_(l.text).replace(/\(preencher\)/g,'<span class="ph">(preencher)</span>')).join('\n'):'<span style="color:var(--muted)">(sem linhas)</span>');
}
function renderSig(){
  const f=(who)=>[['nome','Nome'],['mat','Matrícula'],['id','ID'],['cargo','Cargo'],['escola','Unidade','wide']].map(([k,l,w])=>`<label class="f ${w||''}">${l}<input id="sg-${who}-${k}" data-sg="${who},${k}" value="${esc_(sig[who][k]||'')}"></label>`).join('');
  $('#sig-sec').innerHTML=f('sec');$('#sig-dir').innerHTML=f('dir');
  $('#esc-form').innerHTML=ESC_FIELDS.map(([k,l,w])=>`<label class="f ${w||''}">${l}<input id="es-${k}" data-es="${k}" value="${esc_(esc[k]||'')}"></label>`).join('');
}
function renderChecksOld(){
  const vazio=isPristine();
  if(vazio){$('#checks-count').hidden=true;$('#checks').innerHTML='<li><span class="chip o" style="background:var(--accent-soft);color:var(--accent-2)">início</span><span>Anexe os documentos do aluno no passo 1. As pendências aparecem aqui.</span></li>';return}
  const out=[];const A=state.aluno;
  const miss=ALUNO_FIELDS.filter(([k])=>!A[k]).map(([,l])=>l.replace('Filiação — ',''));
  if(miss.length)out.push(['w','Dados do aluno vazios: '+miss.join(', ')]);
  state.periods.forEach((p,i)=>{const lab=LABELS[state.mode][i];if(!p.ano&&periodHasData(i))out.push(['w',`${lab}: falta o ano`]);if(periodHasData(i)&&!p.freq)out.push(['w',`${lab}: falta a frequência`]);if(periodHasData(i)&&!p.sit)out.push(['w',`${lab}: falta a situação final`])});
  const pad=state.subjects.reduce((a,s)=>a+s.g.filter(g=>g.pad).length,0);if(pad)out.push(['w',`${pad} carga(s) horária(s) com valor padrão do modelo — confira`]);
  const ph=obsLines(state).filter(l=>l.ph).length;if(ph)out.push(['b',`${ph} linha(s) de dependência com (preencher)`]);
  const depFlag=[];state.subjects.forEach(s=>s.g.forEach((g,p)=>{if(isDep(g,p)&&!state.deps.some(d=>N(d.disc)===N(s.name)))depFlag.push(`${s.name} (${LABELS[state.mode][p]})`)}));
  if(depFlag.length)out.push(['b','Nota abaixo da média sem dependência registrada: '+depFlag.join(', ')]);
  const nd=files.reduce((a,f)=>a+((f.diff||[]).length),0);if(nd)out.push(['w',`${nd} dado(s) do aluno diferentes entre os arquivos — veja na lista de arquivos`]);
  if(!state.subjects.length)out.push(['b','Nenhuma disciplina na lista']);
  if(!out.length)out.push(['o','Tudo preenchido. Pode baixar.']);
  const nOpen=out.filter(o=>o[0]!=='o').length;const cc=$('#checks-count');cc.textContent=nOpen?String(nOpen):'';cc.hidden=!nOpen;
  $('#checks').innerHTML=out.map(([c,t])=>`<li><span class="chip ${c}">${c==='o'?'ok':c==='b'?'atenção':'conferir'}</span><span>${esc_(t)}</span></li>`).join('');
}
function syncReadMode(){const m=readMode();const lt=$('#lock-txt');if(lt)lt.textContent=m==='ia'?'Leitura com IA ligada: fotos e PDFs escaneados são enviados à Anthropic. O resto é lido só neste computador.':'Os arquivos são lidos só neste computador. Nenhum dado de aluno é enviado para a internet.';$('#rm-ocr').checked=m==='ocr';$('#rm-ia').checked=m==='ia';$('#ia-key').hidden=!(m==='ia'&&!IN_CLAUDE);$('#ia-claude').hidden=!(m==='ia'&&IN_CLAUDE);if(!IN_CLAUDE)$('#apikey').value=apiKey()}
function syncMode(){$('#mode-reg').setAttribute('aria-pressed',state.mode==='reg');$('#mode-eja').setAttribute('aria-pressed',state.mode==='eja')}
function renderAll(){
  syncMode();$('#example-banner').hidden=!state.example;{const a=$('#mode-alert');a.hidden=!state.modeAlert;a.innerHTML=state.modeAlert?'<span><b>Confira o modelo:</b> '+esc_(state.modeAlert)+'</span>':''}
  renderAluno();renderMat();renderGrades();renderPlaces();renderDeps();$('#obsExtra').value=state.obsExtra;$('#dataLocal').value=state.dataLocal;renderSig();schedulePreview();
}
function setMode(m){
  if(m===state.mode)return;state.modeAlert='';
  if(state.example){state=exampleState(m);renderAll();return}
  const n=m==='eja'?4:3;state.mode=m;
  while(state.periods.length<n)state.periods.push(blankState(m).periods[0]);state.periods.length=n;
  state.subjects.forEach(s=>{while(s.g.length<n)s.g.push(blankG());s.g.length=n});
  state.subjects=state.subjects.filter(s=>s.g.some(g=>g.nota!==''||g.ch!==''));
  renderAll();
}
function updateRowTotal(i){const s=state.subjects[i];let t=0;s.g.forEach(g=>{const c=num(g.ch);if(c!=null)t+=c});const el=$('#tot-'+i);if(el)el.textContent=t||''}

document.addEventListener('input',e=>{
  const t=e.target,d=t.dataset;let re=false;
  if(d.al){state.aluno[d.al]=t.value;t.classList.toggle('empty',!t.value);if(state.ocrFields&&state.ocrFields[d.al]){delete state.ocrFields[d.al];t.classList.remove('ocrf');t.removeAttribute('title')}}
  else if(d.ano!=null){state.periods[+d.ano].ano=t.value.trim()}
  else if(d.sn!=null){state.subjects[+d.sn].name=t.value}
  else if(d.gn){const [i,p]=d.gn.split(',').map(Number);const g=state.subjects[i].g[p];g.nota=t.value;g.media=null;t.classList.toggle('dep',isDep(g,p))}
  else if(d.gc){const [i,p]=d.gc.split(',').map(Number);const g=state.subjects[i].g[p];g.ch=t.value;g.pad=false;t.classList.remove('pad');updateRowTotal(i)}
  else if(d.fr!=null)state.periods[+d.fr].freq=t.value;
  else if(d.pe!=null)state.periods[+d.pe].escola=t.value;
  else if(d.pm!=null)state.periods[+d.pm].municipio=t.value;
  else if(d.ps!=null)state.periods[+d.ps].semestre=t.value;
  else if(d.da!=null){state.deps[+d.da].ano=t.value.trim();state.deps[+d.da].anoManual=1;state.deps[+d.da].edited=1;t.classList.toggle('empty',!t.value)}
  else if(d.dd!=null){state.deps[+d.dd].disc=t.value;state.deps[+d.dd].edited=1;t.classList.toggle('empty',!t.value)}
  else if(d.dn!=null){state.deps[+d.dn].nota=t.value.trim();t.classList.toggle('empty',!t.value)}
  else if(t.id==='apikey'){try{localStorage.setItem('hist.apikey',t.value.trim())}catch(e){}return}
  else if(d.es){const old=Object.assign({},esc);esc=Object.assign({},esc,{[d.es]:t.value});store.set('hist.esc',esc);
    state.periods.forEach(P=>{if(P.escola===old.curto)P.escola=esc.curto;if(P.municipio===`${old.municipio}/${old.uf}`)P.municipio=`${esc.municipio}/${esc.uf}`});
    if(d.es==='municipio'&&state.dataLocal.startsWith(titleCase(old.municipio)+','))state.dataLocal=state.dataLocal.replace(titleCase(old.municipio),titleCase(esc.municipio));
    renderPlaces();$('#dataLocal').value=state.dataLocal}
  else if(d.sg){const [w,k]=d.sg.split(',');sig[w]=Object.assign({},sig[w],{[k]:t.value});store.set('hist.sig',sig)}
  else if(t.id==='obsExtra')state.obsExtra=t.value;
  else if(t.id==='dataLocal')state.dataLocal=t.value;
  else return;
  if(state.example&&!d.sg&&!d.es){state.example=false;$('#example-banner').hidden=true}
  schedulePreview();
});
document.addEventListener('change',e=>{
  const t=e.target,d=t.dataset;
  if(t.name==='rm'){RM_MEM=t.value;syncReadMode();return}
  if(d.arf!=null&&t.value!==''){const f=files[+d.arf];const stu=f.arf.students[+t.value];applyArf(f.arf,stu);f.arfDone=stu.nome;renderFiles();renderAll();return}
  if(d.si!=null){const p=+d.si;state.periods[p].sit=t.value;const ano=state.periods[p].ano;
    if(t.value==='APROV. C/DEP'&&!state.deps.some(x=>x.ano&&x.ano===ano)){state.deps.push({ano,disc:'',nota:''});renderDeps()}
    schedulePreview()}
  else if(d.ano!=null||d.sn!=null){renderPlaces();renderDeps();schedulePreview()}
});
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;const d=b.dataset;
  if(d.rm!=null){state.subjects.splice(+d.rm,1);renderGrades();renderDeps()}
  else if(d.up!=null){const i=+d.up;if(i>0){const s=state.subjects;[s[i-1],s[i]]=[s[i],s[i-1]];renderGrades()}}
  else if(d.down!=null){const i=+d.down,s=state.subjects;if(i<s.length-1){[s[i+1],s[i]]=[s[i],s[i+1]];renderGrades()}}
  else if(d.rmdep!=null){state.deps.splice(+d.rmdep,1);renderDeps()}
  else if(d.rmfile!=null){files.splice(+d.rmfile,1);renderFiles();return}
  else if(d.usediff!=null){const [i,j]=d.usediff.split(',').map(Number);const f=files[i],x=f.diff[j];state.aluno[x.k]=x.v;if(x.ocr){state.ocrFields=state.ocrFields||{};state.ocrFields[x.k]=1}f.diff.splice(j,1);renderFiles();renderAluno()}
  else if(b.id==='add-subj'){state.subjects.push({name:'',g:Array.from({length:nPer()},blankG)});renderGrades();const el=$('#sn-'+(state.subjects.length-1));if(el)el.focus()}
  else if(b.id==='apikey-clear'){try{localStorage.removeItem('hist.apikey')}catch(e){}$('#apikey').value='';setStatus('Chave da API apagada deste navegador.');return}
  else if(b.id==='esc-reset'){esc=Object.assign({},DEFAULT_ESC);store.set('hist.esc',esc);renderSig()}
  else if(b.id==='add-dep'){state.deps.push({ano:'',disc:'',nota:''});renderDeps()}
  else if(b.id==='btn-new'){resetAll()}
  else if(b.id==='btn-reset'){
    if(!b.classList.contains('confirm')){b.classList.add('confirm');b.querySelector('span').textContent='Clique de novo para limpar tudo';clearTimeout(b._t);b._t=setTimeout(()=>{b.classList.remove('confirm');b.querySelector('span').textContent='Novo aluno'},4000);return}
    clearTimeout(b._t);b.classList.remove('confirm');b.querySelector('span').textContent='Novo aluno';
    const ok=resetAll();setStatus(ok?'Tudo zerado. Pronto para o próximo aluno.':'Atenção: algo não foi limpo. Recarregue a página (F5) antes de continuar.',!ok);window.scrollTo({top:0,behavior:'smooth'});$('#drop').focus({preventScroll:true});return}
  else if(b.id==='mode-reg')setMode('reg');
  else if(b.id==='mode-eja')setMode('eja');
  else if(b.id==='dl-xlsx')guard('xlsx',()=>download('xlsx'));
  else if(b.id==='dl-pdf')guard('pdf',()=>download('pdf'));
  else if(b.id==='btn-print')guard('print',()=>printHistorico());
  else if(b.id==='btn-pack')guard('print',()=>printPack('print'));
  else if(b.id==='btn-pack-pdf')guard('pdf',()=>printPack('pdf'));
  else return;
  if(state.example&&!['mode-reg','mode-eja','btn-new','dl-xlsx','dl-pdf'].includes(b.id)){state.example=false;$('#example-banner').hidden=true}
  schedulePreview();
});
const drop=$('#drop'),fin=$('#file');
drop.addEventListener('click',()=>fin.click());
drop.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fin.click()}});
fin.addEventListener('change',()=>{handleFiles([...fin.files]);fin.value=''});
['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('over')}));
['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('over')}));
drop.addEventListener('drop',e=>handleFiles([...e.dataTransfer.files]));

async function printHistorico(){
  if(!READY)return;
  if(IN_CLAUDE){setStatus('Dentro do Claude a impressão direta é bloqueada. Baixe o PDF e imprima, ou use o site do GitHub.');download('pdf');return}
  const btn=$('#btn-print');btn.disabled=true;
  try{
    const sheet=buildSheet(state);const k=4;const cv=document.createElement('canvas');cv.width=Math.round(PAGE.w*k);cv.height=Math.round(PAGE.h*k);
    const ctx=cv.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,cv.width,cv.height);ctx.setTransform(k,0,0,k,0,0);ctx.lineCap='square';
    paintSheet(sheet,canvasPainter(ctx));
    const url=URL.createObjectURL(await new Promise(r=>cv.toBlob(r,'image/png')));
    let fr=document.getElementById('printframe');
    if(fr)fr.remove();
    fr=document.createElement('iframe');fr.id='printframe';fr.title='Impressão';fr.setAttribute('aria-hidden','true');fr.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(fr);
    const d=fr.contentWindow.document;d.open();
    d.write('<!doctype html><html><head><meta charset="utf-8"><title>Histórico Escolar</title><style>@page{size:A4 portrait;margin:0}html,body{margin:0;padding:0;background:#fff}img{display:block;width:210mm;height:297mm}</style></head><body><img alt="Histórico escolar"></body></html>');d.close();
    const img=d.querySelector('img');await new Promise((ok,err)=>{img.onload=ok;img.onerror=()=>err(new Error('imagem'));img.src=url});
    fr.contentWindow.focus();fr.contentWindow.print();
    setStatus('Janela de impressão aberta. Para o próximo aluno, clique em “Novo aluno”.');
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  }catch(e){console.error(e);setStatus('Não foi possível abrir a impressão. Baixe o PDF e imprima por ele.',true)}
  finally{btn.disabled=false}
}
let DL=null;
async function download(kind){
  if(!READY)return;
  const btn=$(kind==='pdf'?'#dl-pdf':'#dl-xlsx');btn.disabled=true;
  try{
    const sheet=buildSheet(state);const blob=kind==='pdf'?makePdf(sheet):await makeXlsx(sheet);
    const nome=(state.aluno.nome||'aluno').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_|_$/g,'');
    const filename=`Historico_${state.mode==='eja'?'EJA':'Regular'}_${nome}.${kind}`;
    if(DL===null&&window.claude&&claude.use)DL=await claude.use('downloads').catch(()=>null);
    if(DL){await DL.save({filename,data:blob});setStatus('Arquivo salvo: '+filename+'. Para o próximo aluno, clique em “Novo aluno”.')}
    else{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();a.remove();setStatus('Download iniciado: '+filename+'. Para o próximo aluno, clique em “Novo aluno”.')}
  }catch(e){
    if(e&&e.code==='declined')setStatus('Download cancelado.');
    else if(e&&e.code==='rate_limited')setStatus('Já existe um pedido de download aberto. Conclua-o e tente de novo.',true);
    else{console.error(e);setStatus('Não foi possível gerar o arquivo'+(e&&e.message?': '+e.message:'.'),true)}
  }finally{btn.disabled=false}
}
window.addEventListener('resize',schedulePreview);

(async()=>{
  setStatus('Carregando o modelo…');
  try{await loadAssets();state=blankState('reg');renderAll();syncReadMode();setStatus('');
    /* espera todos os arquivos de código da página terminarem de carregar */
    if(document.readyState==='loading')await new Promise(r=>document.addEventListener('DOMContentLoaded',r,{once:true}));
    initV2();initV2Files();initTurma();await sessRestore();renderChecks()}
  catch(e){console.error(e);setStatus('Não foi possível carregar o modelo. Recarregue a página.',true)}
  if(window.claude&&claude.use)claude.use('downloads').then(d=>{DL=d}).catch(()=>{DL=null});
})();

/* ano que sai na observação de dependência: o ano em que o aluno ficou em dependência (padrão) ou o ano em que cumpriu */
function regraAnoDep(){try{return localStorage.getItem('hist.depano')==='cumpriu'?'cumpriu':'ficou'}catch(e){return 'ficou'}}
function aplicarAnoDep(){const r=regraAnoDep();for(const d of state.deps){if(d.anoManual)continue;const pi=d.p!=null?d.p:d.auto;const ficou=pi!=null&&state.periods[pi]?String(state.periods[pi].ano||''):'';
  const novo=r==='cumpriu'?(d.anoCumpriu||ficou||d.ano):(ficou||d.ano);if(novo)d.ano=novo}}

/* ---------- histórico de outra escola (modelos diferentes do nosso) ----------
   Procura a tabela de disciplinas e as colunas de cada série/módulo, com nomes variados:
   "Disciplinas"/"Componentes curriculares", "1ª série"/"1º ano"/"1º módulo", "Nota"/"Média", "C.H."/"Carga horária". */
function parseHistGenerico(rows,isPdf){
  const K=t=>N(t.t);const ehDisc=t=>/^(DISCIPLINAS?|COMPONENTES?(CURRICULAR(ES)?)?|COMPONENTESCURRICULARES|AREASDECONHECIMENTO)$/.test(K(t));
  const h=rows.findIndex(r=>r.toks.some(ehDisc));if(h<0)return null;
  const faixa=rows.slice(Math.max(0,h-3),h+3);const hr=faixa.flatMap(r=>r.toks);
  const serie=t=>{const m=K(t).match(/^([1-4])(SERIE|ANO|MODULO|SEMESTRE|ETAPA|FASE|PERIODO)/);return m?{n:+m[1],eja:/MODULO|SEMESTRE|ETAPA|FASE|PERIODO/.test(m[2])}:null};
  let G=hr.map(t=>({t,s:serie(t)})).filter(x=>x.s).sort((a,b)=>a.t.xc-b.t.xc);
  const vistos=new Set();G=G.filter(x=>{if(vistos.has(x.s.n))return false;vistos.add(x.s.n);return true});
  if(G.length<2)return null;
  const mode=G.some(x=>x.s.eja)||G.length===4?'eja':'reg',n=mode==='eja'?4:3;
  const discX=Math.max(...hr.filter(ehDisc).map(t=>t.x1));
  const notaT=hr.filter(t=>/^(NOTA|NOTAS|MEDIA|MEDIAFINAL|MF|RESULTADO|CONCEITO|PONTOS|TOTAL)$/.test(K(t))&&t.xc>discX);
  const chT=hr.filter(t=>/^(CH|CHA|CHT|CARGAHORARIA|HORAS|HA|HORASAULA)$/.test(K(t))&&t.xc>discX);
  const anoT=hr.filter(t=>/^(19|20)\d\d$/.test(String(t.t).trim()));
  const P=[];for(let k=0;k<n;k++)P.push({nx:null,cx:null,ano:''});
  const grupoDe=x=>{let b=null,d=1e9;for(const g of G){const e=Math.abs(g.t.xc-x);if(e<d){d=e;b=g}}return b?b.s.n-1:null};
  /* cada coluna "nota"/"C.H." fica com a série cujo título está mais perto (à esquerda ou em cima) */
  /* no Excel o título da série fica na 1ª coluna do bloco mesclado; no PDF fica centralizado sobre as colunas */
  const lim=G.map((g,i)=>isPdf?{p:g.s.n-1,ini:i?(G[i-1].t.xc+g.t.xc)/2:discX,fim:G[i+1]?(g.t.xc+G[i+1].t.xc)/2:1e9}:{p:g.s.n-1,ini:g.t.x0,fim:G[i+1]?G[i+1].t.x0:1e9});
  const perDe=x=>{const L=lim.find(l=>x>=l.ini&&x<l.fim);return L?L.p:grupoDe(x)};
  for(const t of notaT){const p=perDe(t.xc);if(p!=null&&p<n&&P[p].nx==null)P[p].nx=t.xc}
  for(const t of chT){const p=perDe(t.xc);if(p!=null&&p<n&&P[p].cx==null)P[p].cx=t.xc}
  for(const t of anoT){const p=perDe(t.xc);if(p!=null&&p<n&&!P[p].ano)P[p].ano=String(t.t).trim()}
  for(const g of G){const p=g.s.n-1;if(p>=n)continue;if(P[p].nx==null)P[p].nx=g.t.xc;if(P[p].cx==null)P[p].cx=P[p].nx+(isPdf?30:1)}
  const cols=[];P.forEach((q,i)=>{if(q.nx!=null)cols.push({k:'n',p:i,x:q.nx},{k:'c',p:i,x:q.cx})});
  const firstX=discX+(isPdf?2:0.5);const near=x=>{let b=null,d=1e9;for(const c of cols){const e=Math.abs(c.x-x);if(e<d){d=e;b=c}}return b};
  const res={mode,info:extractInfo(rows.slice(0,Math.max(0,h-3))),periods:P.map(q=>({ano:q.ano,freq:'',sit:''})),subjects:[],escola:''};
  for(const r of rows.slice(0,h)){const t=r.toks.map(x=>x.t).join(' ');if(/\b(COL[EÉ]GIO|ESCOLA|INSTITUTO|CENTRO|CIEP|C\.?\s?E\.?)\b/i.test(t)&&!/SECRETARIA|GOVERNO/i.test(t)){res.escola=cleanEscola(t.replace(/^.*?(?=COL[EÉ]GIO|ESCOLA|INSTITUTO|CENTRO|CIEP)/i,''));break}}
  let i=h+1;
  for(;i<rows.length;i++){const T=rows[i].toks;if(!T.length)continue;
    const nm=T.filter(t=>t.x1<firstX).map(t=>t.t).join(' ').trim();const k=N(nm);
    if(/^(TOTAL|CARGAHORARIATOTAL|SITUACAO|RESULTADO|OBSERVA|FREQUENCIA|PERCENTUAL)/.test(k))break;
    if(!nm||/^(NOTA|CH|MEDIA|ANO|SERIE)$/.test(k)||serie({t:nm}))continue;
    const s={name:canon(nm).idx<999?canon(nm).name:nm,g:P.map(()=>blankG())};
    for(const t of T){if(t.x1<firstX)continue;const c=near(t.xc);if(!c)continue;const v=num(t.t);if(v==null)continue;if(c.k==='n')s.g[c.p].nota=fmtIn(v);else s.g[c.p].ch=fmtIn(v)}
    if(s.g.some(g=>g.nota!==''||g.ch!==''))res.subjects.push(s)}
  for(;i<rows.length;i++){const T=rows[i].toks;const k=N(T.filter(t=>t.x1<firstX).map(t=>t.t).join(' '));
    if(/SITUACAO|RESULTADO/.test(k))for(const t of T){if(t.x1<firstX)continue;const sit=mapSit(t.t);if(!sit)continue;const p=perDe(t.xc);if(p!=null&&p<n)res.periods[p].sit=sit}
    if(/FREQUENCIA/.test(k))for(const t of T){if(t.x1<firstX)continue;let f=num(t.t);if(f==null)continue;if(f<=1)f*=100;const p=perDe(t.xc);if(p!=null&&p<n)res.periods[p].freq=fmtIn(+f.toFixed(2))}}
  if(res.subjects.length<3)return null;
  /* notas em média (0 a 10): converte para total de pontos, como no histórico da escola */
  const vals=res.subjects.flatMap(s=>s.g.map(g=>num(g.nota))).filter(v=>v!=null);
  res.media=vals.length&&Math.max(...vals)<=10;return res}
function importarHistoricoOutraEscola(h,done){
  if(h.mode!==state.mode&&isPristine())setMode(h.mode);fillAluno(h.info);const L=LABELS[state.mode];const fator=defaultPer();const feitos=[],pulados=[];
  h.periods.forEach((p,i)=>{if(i>=state.periods.length)return;const subs=h.subjects.filter(s=>s.g[i]&&(s.g[i].nota!==''||s.g[i].ch!=='')).map(s=>{const v=num(s.g[i].nota),c=num(s.g[i].ch);
      return {name:s.name,total:v!=null?(h.media?+(v*fator).toFixed(2):v):null,media:v!=null&&h.media?v:null,ch:c}});
    if(!subs.length)return;if(periodHasData(i)){pulados.push(L[i]);return}
    applyFicha({subs,info:{},ano:p.ano,sit:p.sit||'',freqGlobal:p.freq?num(p.freq):null,escola:h.escola,nPer:fator},i);feitos.push(L[i]+(p.ano?' · '+p.ano:''))});
  done.push(`histórico de outra escola${h.escola?' ('+h.escola+')':''}: ${feitos.length?feitos.join(', '):'nada novo'}${pulados.length?` · já preenchido, não mudei: ${pulados.join(', ')}`:''}${h.media?` · notas em média convertidas para total de pontos (×${fator})`:''} · confira`)}
