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
    v=v.replace(/https?:\/\/\S+/g,' ').replace(/\S*conexao\.educacao\S*/gi,' ').replace(/\b\d{2}\/\d{2}\/\d{2,4},\s*\d{2}:\d{2}\b/g,' ').replace(/(^|\s)\d{1,2}\/\d{1,2}(?=\s|$)/g,' ').replace(/\s+[A-Za-zÀ-ú][A-Za-zÀ-ú\/(). ]{2,40}\s?:.*$/,'').replace(/\s+/g,' ').trim();
    it.f.val=v});
  const out=new Map();for(const it of seq)if(it.f)out.set(it.f,it.f.val||'');
  return out}
/* foto e quadros do "Modal" vêm do documento original (só PDF digital) */
async function matExtras(f,d){const ex={photo:null,checked:new Set()};if(!f||!f.src)return ex;const digital=!d.ocr&&f.src.kind==='pdf';
  try{const c=f.src.kind==='pdf'?(await pdfToCanvases(f.src.buf.slice(0),1))[0]:await imageToCanvas(new Blob([f.src.buf]));const W=c.width,H=c.height,ctx=c.getContext('2d');
    const crop=async(x,y,w,h,mime)=>{x=Math.max(0,Math.floor(x));y=Math.max(0,Math.floor(y));w=Math.min(W-x,Math.ceil(w));h=Math.min(H-y,Math.ceil(h));if(w<4||h<4)return null;
      const o=document.createElement('canvas');o.width=w;o.height=h;o.getContext('2d').drawImage(c,x,y,w,h,0,0,w,h);const url=o.toDataURL(mime,.92);const img=new Image();img.src=url;await img.decode().catch(()=>{});return {url,mime,img,ar:w/h}};
    if(digital){
      /* PDF digital: o próprio PDF diz onde está cada imagem (vale para folha em pé ou deitada) */
      const pdf=await pdfjsLib.getDocument({isEvalSupported:false,data:f.src.buf.slice(0)}).promise;const pg=await pdf.getPage(1);const vp=pg.getViewport({scale:W/pg.getViewport({scale:1}).width});
      const ops=await pg.getOperatorList();const O=pdfjsLib.OPS,U=pdfjsLib.Util;let ctm=[1,0,0,1,0,0];const pilha=[],imgs=[];
      const pintar=new Set([O.paintImageXObject,O.paintInlineImageXObject,O.paintJpegXObject,O.paintImageXObjectRepeat].filter(x=>x!=null));
      for(let k=0;k<ops.fnArray.length;k++){const fn=ops.fnArray[k];
        if(fn===O.save)pilha.push(ctm.slice());else if(fn===O.restore)ctm=pilha.pop()||ctm;else if(fn===O.transform)ctm=U.transform(ctm,ops.argsArray[k]);
        else if(pintar.has(fn)){const M=U.transform(vp.transform,ctm);const pts=[[0,0],[1,0],[0,1],[1,1]].map(p=>U.applyTransform(p,M));
          const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);imgs.push({x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)})}}
      const vis=imgs.filter(m=>m.w>W*.02&&m.h>H*.02&&m.w<W*.6);
      const logo=vis.filter(m=>m.w/m.h>1.4&&m.y<H*.3).sort((a,b)=>a.y-b.y||a.x-b.x)[0];
      const foto=vis.filter(m=>m!==logo&&m.w/m.h>.55&&m.w/m.h<1.6).sort((a,b)=>b.w*b.h-a.w*a.h)[0];
      if(logo)ex.logo=await crop(logo.x,logo.y,logo.w,logo.h,'image/png');
      if(foto)ex.photo=await crop(foto.x,foto.y,foto.w,foto.h,'image/jpeg');
    }else if(H>W){
      /* foto ou digitalização em pé: logo no canto de cima, à esquerda */
      const lx=Math.round(W*.03),ly=Math.round(H*.045),lw=Math.round(W*.19),lh=Math.round(H*.085);const q=ctx.getImageData(lx,ly,lw,lh).data;let a0=lw,b0=lh,a1=-1,b1=-1;
      for(let y=0;y<lh;y++)for(let x=0;x<lw;x++){const i=(y*lw+x)*4;if(q[i]+q[i+1]+q[i+2]<700){if(x<a0)a0=x;if(x>a1)a1=x;if(y<b0)b0=y;if(y>b1)b1=y}}
      if(a1-a0>W*.04&&(a1-a0)/(b1-b0+1)>1.2)ex.logo=await crop(lx+a0,ly+b0,a1-a0+1,b1-b0+1,'image/png')}
    // quadros marcados no "Modal": acha a página e a linha das opções pelo texto do PDF e olha o quadro à esquerda de cada uma
    if(digital){const pdf=await pdfjsLib.getDocument({isEvalSupported:false,data:f.src.buf.slice(0)}).promise;
      for(let pn=1;pn<=Math.min(pdf.numPages,4);pn++){const pg=await pdf.getPage(pn);const tc=await pg.getTextContent();
        const barcas=tc.items.find(it=>/BARCAS/.test(N(it.str)));if(!barcas)continue;
        const yb=barcas.transform[5];const linha=tc.items.filter(it=>Math.abs(it.transform[5]-yb)<3&&it.str.trim());
        const cv=pn===1?c:(await pdfToCanvasPage(f.src.buf,pn));const cx=cv.getContext('2d',{willReadFrequently:true});
        const vp=pg.getViewport({scale:cv.width/pg.getViewport({scale:1}).width});const dark=[];
        for(const it of linha){const [x,y]=vp.convertToViewportPoint(it.transform[4],it.transform[5]);const k=vp.scale;
          const bx=Math.round(x-11*k),by=Math.round(y-9*k),bw=Math.round(8*k),bh=Math.round(9*k);if(bx<0||by<0)continue;
          const q=cx.getImageData(bx,by,bw,bh).data;let sm=0;for(let t=0;t<q.length;t+=4)sm+=765-(q[t]+q[t+1]+q[t+2]);dark.push([it.str.trim(),sm/(q.length/4)])}
        if(dark.length){const mn=Math.min(...dark.map(x=>x[1]));for(const [t,v] of dark)if(v>40&&v>mn*2.2)ex.checked.add(N(t))}
        break}}
  }catch(e){console.warn('matExtras',e)}
  return ex}
function matPage(ex){
  ex=ex||{photo:null,checked:new Set()};
  const draw=(P,page)=>{P.fam='S';const L=40,R=page.w-40,W=R-L;let y=58;
    if(ex.logo){const g=ex.logo;const h=36,w=Math.min(110,h*g.ar);P.imageUrl(g,L,52,w,w/g.ar)}else P.image(L,30,70,38);
    P.font(false,false,8.5);for(const [t,yy] of [['GOVERNO DO ESTADO DO RIO DE JANEIRO',76],['SECRETARIA DE EDUCAÇÃO',86],['FICHA DE MATRÍCULA',96]]){P.text(t,(L+R)/2-P.width(t)/2,yy,'000000')}
    if(ex.photo){const ph=ex.photo;let h=96,w=h*ph.ar;if(w>110){w=110;h=w/ph.ar}P.imageUrl(ph,R-w-10,138,w,h)}
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

/* desenha uma página específica de um PDF (para achar o quadro do transporte quando ele fica na página 2) */
async function pdfToCanvasPage(buf,pn){const pdf=await pdfjsLib.getDocument({isEvalSupported:false,data:buf.slice(0)}).promise;const page=await pdf.getPage(pn);const vp0=page.getViewport({scale:1});const vp=page.getViewport({scale:Math.min(3,1700/vp0.width)});
  const c=document.createElement('canvas');c.width=Math.round(vp.width);c.height=Math.round(vp.height);const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);await page.render({canvasContext:ctx,viewport:vp}).promise;return c}
