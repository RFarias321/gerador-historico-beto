/* Gerador de Histórico do Beto — matricula */
/* ficha de matrícula redesenhada como página nova (sem cabeçalho/rodapé do navegador e sem assinaturas digitalizadas) */
const MAT_LAYOUT=[
  ['#DADOS PESSOAIS'],
  [['Nome',0,'nome']],
  [['Data de Nascimento',0,'nascimento'],['Sexo',.5]],
  [['Quantidade de Filhos',0],['Tipo Sanguíneo',.5]],
  [['Etnia',0],['Estado Civil',.5]],
  [['País de Nascimento',0],['Nacionalidade',.5,'nacionalidade']],
  [['UF Nascimento',0],['Naturalidade',.5,'naturalidade']],
  [['Credo',0],['Necessidade Especial',.5]],
  [['Matrícula',0,'matricula']],
  [['Data da Situação',0],['Hora',.5]],
  ['#FILIAÇÃO'],
  [['Nome mãe',0,'mae'],['Falecida',.6],['CPF',.75]],
  [['Nome Pai',0,'pai'],['Falecido',.6],['CPF',.75]],
  [['Resp. Legal',0]],
  [['Nome Outros',0],['CPF',.75]],
  [['Tel Mãe',0],['Tel Pai',.6],['Tel Resp',.75]],
  ['#ENDEREÇO'],
  [['Endereço',0],['Número',.5]],
  [['Complemento',0],['Bairro',.5]],
  [['Município',0],['Estado',.5]],
  [['CEP',0],['Localização/Zona de Residência',.5]],
  ['#CONTATO'],
  [['Telefone',0],['Celular',.3],['E-mail',.6]],
  ['#RG DETRAN/RJ'],
  [['Número do Documento',0],['Data de Exp. RG DETRAN/RJ',.5]],
  ['#DOCUMENTO'],
  [['CPF',0]],
  [['Tipo',0],['Número',.16,'identidade'],['Complemento Identidade',.6]],
  [['Estado',0],['Órgão Emissor',.16,'orgao'],['Data de Expedição',.6,'expedicao']],
  ['#OUTRAS INFORMAÇÕES'],
  [['Identificação no INEP',0],['Identificação Social(NIS)',.6]],
  ['#CERTIDÃO CIVIL'],
  [['Tipo Certidão',0],['Certidão Civil',.5]],
  [['UF Cartório',0],['Município Cartório',.5]],
  [['Nome do Cartório',0]],
  [['Livro',0],['Folha',.16],['Termo',.3],['Data da Emissão',.5]],
  [['Matrícula da Certidão',0]],
  ['#TRANSPORTE'],
  [['Utiliza Transporte?',0],['Poder Responsável',.5]],
  [['Modal',0]]
];
const MAT_UPPER=new Set(['nome','mae','pai','nacionalidade','naturalidade']);
/* chave de cada campo: seção + rótulo (CPF, Número e Estado aparecem em mais de uma seção) */
(()=>{let sec='',seen={};for(const ln of MAT_LAYOUT){if(typeof ln[0]==='string'){sec=ln[0].slice(1);continue}for(const f of ln){let k=sec+'|'+f[0];seen[k]=(seen[k]||0)+1;if(seen[k]>1)k+='|'+seen[k];f.key=k;f.sec=sec}}})();
const MAT_FMT=(f,v)=>{v=String(v||'').trim().replace(/\s*[:;]+$/,'').trim();if(/^(Quantidade de Filhos|Identificação no INEP|CEP|Matrícula)$/.test(f[0]))v=v.replace(/[oO]/g,'0').replace(/[lI]/g,'1').replace(/[^\d]/g,'');if(/^CPF$/.test(f[0])){const d=v.replace(/\D/g,'');if(d.length===11)return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4')}
  if(/^(Data|Hora)/.test(f[0]))v=v.replace(/[^\d\/:]/g,'');if(/^(Matrícula|Número|Telefone|Celular|CEP|Identificação no INEP|Termo|Folha)$/.test(f[0]))v=v.replace(/[oO]/g,'0').replace(/[lI]/g,'1');return v};
function matIngest(text){state.mat=state.mat||{vals:{},edited:{}};const vals=matFields(text);let n=0;
  for(const [f,v] of vals){if(f[2]||f[0]==='Modal'||state.mat.edited[f.key])continue;const x=MAT_FMT(f,v);if(x){state.mat.vals[f.key]=x;n++}}return n}
function matValue(f){const A=state.aluno||{};if(f[2]){const v=A[f[2]]||'';return MAT_UPPER.has(f[2])?String(v).toUpperCase():String(v)}return ((state.mat||{}).vals||{})[f.key]||''}
function matHasData(){return !!(state.mat&&Object.values(state.mat.vals||{}).some(Boolean))}
function renderMat(){const box=document.getElementById('mat-form');if(!box)return;let h='',sec='';
  for(const ln of MAT_LAYOUT){if(typeof ln[0]==='string'){h+=`<div class="subhead" style="grid-column:1/-1">${esc_(ln[0].slice(1))}</div>`;continue}
    for(const f of ln){if(f[0]==='Modal')continue;const v=matValue(f);const link=f[2]?` data-mal="${f[2]}" title="Mesmo campo do item 2"`:` data-mt="${esc_(f.key)}"`;
      h+=`<label class="f${/^(Nome|Nome mãe|Nome Pai|Nome do Cartório|Endereço|E-mail)$/.test(f[0])?' wide':''}">${esc_(f[0])}${f[2]?' <small style="color:var(--muted)">(item 2)</small>':''}<input${link} value="${esc_(v)}"></label>`}}
  box.innerHTML=h}
document.addEventListener('input',e=>{const t=e.target,d=t.dataset||{};
  if(d.mt!=null){state.mat=state.mat||{vals:{},edited:{}};state.mat.vals[d.mt]=t.value;state.mat.edited[d.mt]=1}
  else if(d.mal!=null){state.aluno[d.mal]=t.value;const o=document.getElementById('al-'+d.mal);if(o)o.value=t.value;if(typeof schedulePreview==='function')schedulePreview()}
  else if(d.al!=null){const o=document.querySelector(`[data-mal="${d.al}"]`);if(o)o.value=MAT_UPPER.has(d.al)?t.value.toUpperCase():t.value}});
/* lê os valores do texto do documento, rótulo a rótulo, na ordem em que aparecem na ficha */
function matFields(text){
  const src=String(text||'').replace(/CONFIRMA[ÇC][ÃA]O DE MATR[ÍI]CULA[\s\S]*$/i,'');
  let ns='',map=[];for(let i=0;i<src.length;i++){const ch=src[i].normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().replace(';',':');if(/\s/.test(ch))continue;for(const c of ch){ns+=c;map.push(i)}}
  const key=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().replace(/\s+/g,'');
  const seq=[];for(const ln of MAT_LAYOUT){if(typeof ln[0]==='string')seq.push({head:ln[0].slice(1)});else for(const f of ln)seq.push({f})}
  for(const it of seq)if(it.f)it.f.val='';
  const fuzzy=(k,pos)=>{let j=ns.indexOf(k,pos);if(j>=0&&j-pos<600)return j;const tol=k.length>=9?2:k.length>=5?1:0;if(!tol)return j;const end=Math.min(ns.length-k.length,pos+600);
    for(let i=pos;i<=end;i++){if(k.endsWith(':')&&ns[i+k.length-1]!==':')continue;let d=0;for(let q=0;q<k.length&&d<=tol;q++)if(ns[i+q]!==k[q])d++;if(d<=tol)return i}return j};
  const heads=seq.filter(x=>x.head).map(x=>key(x.head));const nextHead=(pos,cur)=>{let best=ns.length;for(const h of heads){if(h===cur)continue;const j=ns.indexOf(h,pos);if(j>=0&&j<best)best=j}return best};
  let pos=0,curHead='';for(const it of seq){const k=it.head?key(it.head):key(it.f[0])+(/\?$|^Modal$/.test(it.f[0])?'':':');if(it.head)curHead=k;let j=fuzzy(k,pos);if(j>=0&&!it.head&&j>nextHead(pos,curHead))j=-1;if(j<0)continue;it.s=map[j];it.e=map[j+k.length-1]+1;pos=j+k.length}
  const found=seq.filter(it=>it.s!=null);
  found.forEach((it,i)=>{if(!it.f)return;const nx=found[i+1];let v=src.slice(it.e,nx?nx.s:src.length);
    v=v.replace(/https?:\/\/\S+/g,' ').replace(/\S*conexao\.educacao\S*/gi,' ').replace(/\b\d{2}\/\d{2}\/\d{4},\s*\d{2}:\d{2}\b/g,' ').replace(/\s\d\/\d\s*$/,' ').replace(/\s+[A-Za-zÀ-ú][A-Za-zÀ-ú\/(). ]{2,40}\s?:.*$/,'').replace(/\s+/g,' ').trim();
    it.f.val=v});
  const out=new Map();for(const it of seq)if(it.f)out.set(it.f,it.f.val||'');
  return out}
/* foto e quadros do "Modal" vêm do documento original (só PDF digital) */
async function matExtras(f,d){const ex={photo:null,checked:new Set()};if(!f||!f.src)return ex;const digital=!d.ocr&&f.src.kind==='pdf';
  try{const c=f.src.kind==='pdf'?(await pdfToCanvases(f.src.buf.slice(0),1))[0]:await imageToCanvas(new Blob([f.src.buf]));const W=c.width,H=c.height,ctx=c.getContext('2d');
    if(digital){
    // foto: área à direita dos dados pessoais, recortada sem a margem branca
    const rx=Math.round(W*.64),ry=Math.round(H*.158),rw=Math.round(W*.30),rh=Math.round(H*.13);const px=ctx.getImageData(rx,ry,rw,rh).data;
    let x0=rw,y0=rh,x1=-1,y1=-1;const isRule=y=>{let n=0;for(let x=0;x<rw;x++){const i=(y*rw+x)*4;if(px[i]+px[i+1]+px[i+2]<690)n++}return n>rw*.8};
    for(let y=0;y<rh;y++){if(isRule(y))continue;for(let x=0;x<rw;x++){const i=(y*rw+x)*4;if(px[i]+px[i+1]+px[i+2]<690){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}}}
    if(x1-x0>W*.06&&y1-y0>H*.04){const o=document.createElement('canvas');o.width=x1-x0+1;o.height=y1-y0+1;o.getContext('2d').drawImage(c,rx+x0,ry+y0,o.width,o.height,0,0,o.width,o.height);
      const url=o.toDataURL('image/jpeg',.92);const img=new Image();img.src=url;await img.decode().catch(()=>{});ex.photo={url,mime:'image/jpeg',img,fx:(rx+x0)/W,fy:(ry+y0)/H,fw:o.width/W,fh:o.height/H}}
    }
    {const lx=Math.round(W*.03),ly=Math.round(H*.045),lw=Math.round(W*.19),lh=Math.round(H*.085);const q=ctx.getImageData(lx,ly,lw,lh).data;let a0=lw,b0=lh,a1=-1,b1=-1;
      for(let y=0;y<lh;y++)for(let x=0;x<lw;x++){const i=(y*lw+x)*4;if(q[i]+q[i+1]+q[i+2]<700){if(x<a0)a0=x;if(x>a1)a1=x;if(y<b0)b0=y;if(y>b1)b1=y}}
      if(a1-a0>W*.04){const o=document.createElement('canvas');o.width=a1-a0+1;o.height=b1-b0+1;o.getContext('2d').drawImage(c,lx+a0,ly+b0,o.width,o.height,0,0,o.width,o.height);const url=o.toDataURL('image/png');const img=new Image();img.src=url;await img.decode().catch(()=>{});ex.logo={url,mime:'image/png',img,fx:(lx+a0)/W,fy:(ly+b0)/H,fw:o.width/W,fh:o.height/H}}}
    // quadros marcados no "Modal": quadro escuro à esquerda de cada opção
    const row=digital&&(d.rows||[]).find(r=>r.toks.some(t=>/BARCAS/.test(N(t.t)))&&r.toks.some(t=>/TREM/.test(N(t.t))));
    if(row){const all=(d.rows||[]);const top=all.find(r=>r.toks.some(t=>N(t.t).startsWith('DADOSPESSOAIS')));const bottomUp=top&&top.y>row.y;
      const pdf=await pdfjsLib.getDocument({isEvalSupported:false,data:f.src.buf.slice(0)}).promise;const pg=await pdf.getPage(1);const vp=pg.getViewport({scale:1});const sc=W/vp.width;
      const dark=[];for(const t of row.toks){const yy=(bottomUp?vp.height-row.y:row.y)*sc;const bx=Math.round((t.x0-11)*sc),by=Math.round(yy-9*sc),bw=Math.round(8*sc),bh=Math.round(9*sc);
        if(bx<0)continue;const q=ctx.getImageData(bx,by,bw,bh).data;let s=0;for(let i=0;i<q.length;i+=4)s+=765-(q[i]+q[i+1]+q[i+2]);dark.push([t.t,s/(q.length/4)])}
      const mn=Math.min(...dark.map(x=>x[1]));for(const [t,v] of dark)if(v>40&&v>mn*2.2)ex.checked.add(N(t))}
  }catch(e){console.warn('matExtras',e)}
  return ex}
function matPage(ex){
  ex=ex||{photo:null,checked:new Set()};
  const draw=(P,page)=>{P.fam='S';const L=40,R=page.w-40,W=R-L;let y=58;
    if(ex.logo){const g=ex.logo;P.imageUrl(g,g.fx*page.w,g.fy*page.h,g.fw*page.w,g.fh*page.h)}else P.image(L,30,70,38);
    P.font(false,false,8.5);for(const [t,yy] of [['GOVERNO DO ESTADO DO RIO DE JANEIRO',76],['SECRETARIA DE EDUCAÇÃO',86],['FICHA DE MATRÍCULA',96]]){P.text(t,(L+R)/2-P.width(t)/2,yy,'000000')}
    if(ex.photo){const ph=ex.photo;const w=ph.fw*page.w,h=ph.fh*page.h;P.imageUrl(ph,Math.max(ph.fx*page.w,R-w-8),Math.max(ph.fy*page.h,140),w,h)}
    y=122;const lh=10.6;
    for(const ln of MAT_LAYOUT){
      if(typeof ln[0]==='string'){y+=7;P.font(true,false,8.2);P.text(ln[0].slice(1),L,y,'000000');P.line(L,y+3,R,y+3,.5,'BFBFBF');y+=lh+1;continue}
      if(ln[0][0]==='Modal'){P.font(false,false,7.6);P.text('Modal',L,y,'000000');y+=lh+2;const ops=['BARCAS','CARRO COM ACESSIBILIDADE (CADEIRANTE)','METRÔ','ÔNIBUS','TRANSPORTE RURAL','TREM'];let x=L+12;P.font(false,false,7.2);for(const o of ops){const on=ex.checked.has(N(o));if(on)P.rect(x-10,y-6.6,7,7,'BFBFBF');P.line(x-10,y-6.6,x-3,y-6.6,.4,'808080');P.line(x-10,y+.4,x-3,y+.4,.4,'808080');P.line(x-10,y-6.6,x-10,y+.4,.4,'808080');P.line(x-3,y-6.6,x-3,y+.4,.4,'808080');P.text(o,x,y,'000000');x+=P.width(o)+24}y+=lh;continue}
      for(const f of ln){const v=matValue(f);
        const lab=f[0]+(/\?$/.test(f[0])?' ':': ');const x=L+W*f[1];P.font(false,false,7.6);P.text(lab,x,y,'000000');const lw=P.width(lab);P.font(true,false,7.6);
        const nxt=ln[ln.indexOf(f)+1];const maxw=(nxt?L+W*nxt[1]:R)-x-lw-4;let t=v;while(t&&P.width(t)>maxw)t=t.slice(0,-1);P.text(t,x+lw,y,'000000')}
      y+=lh}
    // assinaturas: mesmo lugar da ficha original (canto inferior esquerdo), para assinar à mão
    y+=58;const blocks=[[sig.dir,L+95],[sig.sec,L+300]];
    for(const [s,cx] of blocks){P.line(cx-85,y,cx+85,y,.6,'000000',null);let yy=y+10;
      for(const [t,b,sz] of [[s.nome,true,8],[s.cargo||'',false,7.2],['Matrícula '+s.mat+(s.id?' · ID '+s.id:''),false,7.2],[s.escola||'',false,7.2]]){if(!t)continue;P.font(b,false,sz);P.text(t,cx-P.width(t)/2,yy,'000000');yy+=9}}
  };
  return {orient:'p',draw,title:'Ficha de matrícula'};
}
