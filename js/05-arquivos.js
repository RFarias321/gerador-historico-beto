/* Gerador de Histórico do Beto — arquivos */
/* ===== v2: prévia da impressão para assinatura, salvar/abrir aluno, gov.br ===== */
const GOVBR_TXT='Para assinar sem imprimir: baixe o PDF, abra <a href="https://assinador.iti.br" target="_blank" rel="noopener">assinador.iti.br</a> (conta gov.br, gratuito), envie o arquivo e posicione a assinatura sobre o nome de cada um. A assinatura gov.br tem validade legal.';
function thumbPage(pg,w){const page=A4[pg.orient];const k=w/page.w;const cv=document.createElement('canvas');cv.width=Math.round(page.w*k*2);cv.height=Math.round(page.h*k*2);cv.style.width=Math.round(page.w*k)+'px';cv.style.height=Math.round(page.h*k)+'px';
  const ctx=cv.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,cv.width,cv.height);ctx.setTransform(k*2,0,0,k*2,0,0);
  try{if(pg.raster){const im=new Image();im.onload=()=>{const s=Math.min(page.w/im.width,page.h/im.height);ctx.drawImage(im,(page.w-im.width*s)/2,(page.h-im.height*s)/2,im.width*s,im.height*s)};im.src=pg.raster}
    else if(pg.hist)paintSheet(buildSheet(state),canvasPainter(ctx));else if(pg.draw)pg.draw(canvasPainterDoc(ctx),page);else paintModel(pg.model,canvasPainterDoc(ctx),page)}catch(e){console.warn(e)}
  return cv}
async function packPreview(pages,mode){
  let order=pages.map((p,i)=>({p,i,on:true}));
  const html=()=>`<h3>Conferir antes de ${mode==='pdf'?'baixar':'imprimir'} · ${order.filter(o=>o.on).length} de ${order.length} página(s)</h3><p class="hint">Desmarque o que não quer e use as setas para mudar a ordem.</p><div class="pk-grid">${order.map((o,k)=>`<figure class="pk-it${o.on?'':' off'}" data-k="${k}"><div class="pk-th"></div><figcaption><label><input type="checkbox" data-pkon="${k}"${o.on?' checked':''}> ${k+1}. ${esc_(o.p.title||'')}</label><span><button type="button" class="ib" data-pkup="${k}" aria-label="Subir">↑</button><button type="button" class="ib" data-pkdn="${k}" aria-label="Descer">↓</button></span></figcaption></figure>`).join('')}</div><p class="govbr">${GOVBR_TXT}</p>`;
  return new Promise(res=>{const bg=document.createElement('div');bg.className='mdl-bg';bg.innerHTML=`<div class="mdl wide" role="dialog" aria-modal="true"><div class="mdl-body"></div><div class="mdl-foot"><button type="button" class="btn small" data-act="x">Cancelar</button><button type="button" class="btn small" data-act="pdf">Baixar PDF</button><button type="button" class="btn small primary" data-act="print">Imprimir</button></div></div>`;
    document.body.appendChild(bg);const body=bg.querySelector('.mdl-body');const thumbs=new Map();
    const draw=()=>{body.innerHTML=html();order.forEach((o,k)=>{let c=thumbs.get(o.i);if(!c){c=thumbPage(o.p,o.p.orient==='l'?150:106);thumbs.set(o.i,c)}body.querySelector(`[data-k="${k}"] .pk-th`).appendChild(c)})};
    draw();const done=v=>{bg.remove();res(v)};
    bg.addEventListener('click',e=>{const t=e.target;let k;
      if((k=t.dataset.pkup)!=null&&+k>0){[order[k-1],order[k]]=[order[k],order[k-1]];draw()}
      else if((k=t.dataset.pkdn)!=null&&+k<order.length-1){[order[+k+1],order[k]]=[order[k],order[+k+1]];draw()}
      else if(t.dataset.act){if(t.dataset.act==='x')return done(null);const sel=order.filter(o=>o.on).map(o=>o.p);if(!sel.length){setStatus('Nenhuma página marcada.',true);return}done({pages:sel,mode:t.dataset.act})}
      else if(t===bg)done(null)});
    bg.addEventListener('change',e=>{const k=e.target.dataset.pkon;if(k!=null){order[k].on=e.target.checked;draw()}});
    bg.addEventListener('keydown',e=>{if(e.key==='Escape')done(null)});bg.querySelector('[data-act="print"]').focus()})}
/* ---------- salvar / abrir aluno em arquivo ---------- */
function ab2b64(ab){const u=new Uint8Array(ab);let s='';for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s)}
function b642ab(b){const s=atob(b);const u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u.buffer}
const SKIP_KEYS=new Set(['depDocs','entry','parsed','_img','img']);
function serialize(obj){return JSON.stringify(obj,(k,v)=>{if(SKIP_KEYS.has(k))return undefined;if(v instanceof ArrayBuffer)return {__ab:ab2b64(v)};if(ArrayBuffer.isView(v))return {__ab:ab2b64(v.buffer)};return v})}
function deserialize(txt){return JSON.parse(txt,(k,v)=>v&&typeof v==='object'&&typeof v.__ab==='string'?b642ab(v.__ab):v)}
async function saveBlob(filename,blob){if(DL===null&&window.claude&&claude.use)DL=await claude.use('downloads').catch(()=>null);
  if(DL){await DL.save({filename,data:blob});return}const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();a.remove()}
const slug=s=>String(s||'aluno').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_|_$/g,'');
async function saveAluno(){if(isPristine()){setStatus('Não há aluno para salvar.',true);return}
  const senha=await pedirSenha(true);if(!senha){setStatus('Arquivo não salvo.');return}
  const txt=await cifrar(serialize({app:'gerador-historico-beto',kind:'aluno',v:2,salvo:new Date().toISOString(),state,files:files.filter(f=>!f.example)}),senha);
  const fn=`Aluno_${slug(state.aluno.nome)}.historico.json`;await saveBlob(fn,new Blob([txt],{type:'application/json'}));
  setStatus(`Aluno salvo no arquivo ${fn}, protegido por senha. Para continuar depois, anexe esse arquivo no passo 1 e digite a senha.`)}
async function openSaved(file){let obj;try{const raw=JSON.parse(await file.text());
    if(raw&&raw.app==='gerador-historico-beto'&&raw.cifrado){let txt=null;for(let t=0;t<3&&txt==null;t++){const senha=await pedirSenha(false,t?'Senha errada. Tente de novo.':'');if(!senha){setStatus('Arquivo não aberto.');return true}try{txt=await decifrar(raw,senha)}catch(_){}}
      if(txt==null){setStatus('Senha errada: o arquivo não foi aberto.',true);return true}obj=deserialize(txt)}
    else{obj=deserialize(JSON.stringify(raw));if(obj&&obj.app==='gerador-historico-beto')setStatus('Aviso: este arquivo é de uma versão antiga, sem senha. Salve de novo para protegê-lo.')}}
  catch(e){setStatus(`“${file.name}” não é um arquivo salvo por este site.`,true);return true}
  if(!obj||obj.app!=='gerador-historico-beto')return false;
  if(obj.kind==='turma'){await tmImport(obj);return true}
  if(typeof TURMA!=='undefined'&&TURMA&&TURMA.on){tmAddWorkspace(obj.state,obj.files||[]);tmSave();tmRender();setStatus(`Aluno ${obj.state.aluno.nome||''} adicionado à turma.`);return true}
  if(!isPristine()&&!state.example){const ok=await askModal(`<h3>Abrir aluno salvo?</h3><p>O aluno que está na tela (${esc_(state.aluno.nome||'sem nome')}) será substituído por ${esc_(obj.state.aluno.nome||'o aluno do arquivo')}.</p>`,[{label:'Cancelar',value:false},{label:'Abrir',value:true,primary:true}]);if(!ok)return true}
  state=obj.state;files=obj.files||[];renderFiles();renderAll();setStatus(`Aluno ${state.aluno.nome||''} aberto do arquivo ${file.name}.`);return true}
{const _hf=handleFiles;handleFiles=async function(list){list=[...list];const rest=[];for(const f of list){if(/\.json$/i.test(f.name)){if(!(await openSaved(f)))rest.push(f)}else rest.push(f)}if(rest.length)return _hf(rest)}}
function initV2Files(){const side=document.querySelector('aside.side .packrow');if(side&&!document.getElementById('btn-save')){const b=document.createElement('button');b.type='button';b.className='btn';b.id='btn-save';b.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M5 3h11l3 3v15H5V3Zm2 2v5h8V5H7Zm5 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"/></svg>Salvar aluno em arquivo';b.title='Gera um arquivo para continuar este aluno outro dia ou em outro computador';side.after(b)}
  if(side&&!document.getElementById('btn-suporte')){const b2=document.createElement('button');b2.type='button';b2.className='btn small';b2.id='btn-suporte';b2.textContent='Criar caso para suporte (sem dados pessoais)';b2.title='Gera uma cópia das planilhas com nomes, matrículas e datas trocados, para mostrar um problema sem expor o aluno';document.getElementById('btn-save').after(b2)}
  const inp=$('#file');if(inp&&!/json/.test(inp.accept||''))inp.accept=(inp.accept?inp.accept+',':'')+'.json,application/json'}
document.addEventListener('click',e=>{if(e.target.closest('#btn-save'))saveAluno()});
/* ---------- arquivos salvos protegidos por senha (AES-GCM 256, chave PBKDF2-SHA256) ---------- */
const PBKDF2_ITER=310000;
async function _chave(senha,salt,uso){const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(senha),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:PBKDF2_ITER,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,[uso])}
async function cifrar(txt,senha){const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
  const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},await _chave(senha,salt,'encrypt'),new TextEncoder().encode(txt));
  return JSON.stringify({app:'gerador-historico-beto',cifrado:'AES-GCM-256/PBKDF2-SHA256',iter:PBKDF2_ITER,salt:ab2b64(salt.buffer),iv:ab2b64(iv.buffer),dados:ab2b64(ct)})}
async function decifrar(obj,senha){const salt=new Uint8Array(b642ab(obj.salt)),iv=new Uint8Array(b642ab(obj.iv));
  const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv},await _chave(senha,salt,'decrypt'),b642ab(obj.dados));return new TextDecoder().decode(pt)}
function pedirSenha(nova,erro){return new Promise(res=>{const bg=document.createElement('div');bg.className='mdl-bg';
  bg.innerHTML=`<div class="mdl" role="dialog" aria-modal="true" aria-labelledby="pw-t"><div class="mdl-body"><h3 id="pw-t">${nova?'Proteger o arquivo com senha':'Arquivo protegido por senha'}</h3>
    <p class="hint">${nova?'O arquivo tem dados pessoais do aluno. Escolha uma senha (mínimo 6 caracteres). <b>Sem a senha ninguém abre o arquivo, nem você</b>: guarde-a em local seguro.':'Digite a senha usada ao salvar.'}</p>
    <label class="pw-f">Senha<input type="password" id="pw1" autocomplete="${nova?'new-password':'current-password'}"></label>${nova?'<label class="pw-f">Repita a senha<input type="password" id="pw2" autocomplete="new-password"></label>':''}<div class="pw-err" id="pw-err" role="alert">${esc_(erro||'')}</div></div>
    <div class="mdl-foot"><button type="button" class="btn small" data-pw="x">Cancelar</button><button type="button" class="btn small primary" data-pw="ok">${nova?'Salvar com senha':'Abrir'}</button></div></div>`;
  document.body.appendChild(bg);const p1=bg.querySelector('#pw1'),p2=bg.querySelector('#pw2'),er=bg.querySelector('#pw-err');p1.focus();
  const fim=v=>{bg.remove();res(v)};const ok=()=>{const a=p1.value;if(nova){if(a.length<6){er.textContent='Use pelo menos 6 caracteres.';return}if(a!==p2.value){er.textContent='As duas senhas não são iguais.';return}}else if(!a){er.textContent='Digite a senha.';return}fim(a)};
  bg.addEventListener('click',e=>{const k=e.target.dataset&&e.target.dataset.pw;if(k==='x')fim(null);else if(k==='ok')ok()});
  bg.addEventListener('keydown',e=>{if(e.key==='Escape')fim(null);else if(e.key==='Enter')ok()})})}
/* ---------- caso para suporte: cópia dos documentos SEM dados pessoais ----------
   Troca nomes (aluno, pais e todos os colegas das atas), matrículas, documentos e datas de nascimento
   por dados inventados, nas planilhas. PDFs e fotos não entram (não dá para limpar com segurança).
   Antes de baixar, confere que nenhum dado real sobrou; se sobrar, não gera o arquivo. */
const _nn=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase();
function _segredos(){const A=state.aluno||{},nomes=new Set(),nums=new Set(),datas=new Set();
  for(const k of ['nome','mae','pai'])if(A[k]&&A[k].trim().length>4)nomes.add(A[k].trim());
  for(const f of files){if(f.arf&&f.arf.students)for(const s of f.arf.students){if(s.nome&&s.nome.trim().length>4)nomes.add(s.nome.trim());if(s.mat)nums.add(String(s.mat).replace(/\D/g,''))}}
  for(const k of ['matricula','identidade'])if(A[k]){const d=String(A[k]).replace(/\D/g,'');if(d.length>=6)nums.add(d)}
  const V=(state.mat&&state.mat.vals)||{};for(const [k,v] of Object.entries(V)){const d=String(v||'').replace(/\D/g,'');if(/CPF|Número|Matrícula|INEP|Termo|Telefone|Celular/.test(k)&&d.length>=6)nums.add(d);if(/Nome/.test(k)&&String(v).trim().length>4)nomes.add(String(v).trim())}
  if(A.nascimento)datas.add(A.nascimento);
  return {nomes:[...nomes].sort((a,b)=>b.length-a.length),nums:[...nums].filter(Boolean),datas:[...datas]}}
function _falsoNome(i){const s=['BA','LO','RI','TE','MU','SA','VI','NO','FE','DU','CA','PE','ZO','GI','TA'];const w=n=>{let t='';for(let k=0;k<3;k++)t+=s[(i*7+n*5+k*3)%s.length];return t};return `${w(1)} ${w(2)} ${w(3)} TESTE`}
function _trocarTexto(t,mapa,sec){let changed=true,guard=0;
  while(changed&&guard++<50){changed=false;let nt='',idx=[];for(let i=0;i<t.length;i++){const c=_nn(t[i]);for(const ch of c){nt+=ch;idx.push(i)}}
    const ntc=nt.replace(/\s/g,' ');for(const nome of sec.nomes){const k=_nn(nome).replace(/\s+/g,' ');const j=ntc.indexOf(k);if(j>=0){t=t.slice(0,idx[j])+mapa.get(nome)+t.slice(idx[j+k.length-1]+1);changed=true;break}}}
  for(const n of sec.nums){const fake=('9'+'8'.repeat(n.length)).slice(0,n.length);t=t.split(n).join(fake)}
  t=t.replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g,'000.000.000-00');for(const d of sec.datas)t=t.split(d).join('01/01/2000');return t}
async function casoSuporte(){if(isPristine()){setStatus('Anexe os documentos do aluno antes.',true);return}
  const sec=_segredos();const mapa=new Map(sec.nomes.map((n,i)=>[n,_falsoNome(i)]));const zip=new JSZip();let n=0;const fora=[];
  const fix=x=>x.replace(/(<t(?:\s[^>]*)?>)([\s\S]*?)(<\/t>)/g,(m,a,b,c)=>a+_esc(_trocarTexto(_unesc(b),mapa,sec))+c).replace(/(<v>)(\d{6,})(<\/v>)/g,(m,a,b,c)=>a+_trocarTexto(b,mapa,sec)+c);
  for(const f of files){if(!f.src||!f.src.buf||f.dup)continue;if(f.src.kind!=='xlsx'){fora.push(f.src.kind==='pdf'?'PDF':'foto');continue}
    const z=await JSZip.loadAsync(f.src.buf.slice(0));const out=new JSZip();
    for(const name of Object.keys(z.files)){const e=z.files[name];if(e.dir)continue;
      if(/^xl\/(worksheets\/sheet\d+|sharedStrings)\.xml$/.test(name))out.file(name,fix(await e.async('string')));
      else if(name==='xl/workbook.xml')out.file(name,_trocarTexto((await e.async('string')).replace(/<mc:AlternateContent[\s\S]*?<\/mc:AlternateContent>/g,'').replace(/<x15ac:absPath[^>]*\/>/g,''),mapa,sec));
      else if(/^docProps\/core/.test(name))out.file(name,(await e.async('string')).replace(/<cp:lastModifiedBy>[\s\S]*?<\/cp:lastModifiedBy>|<dc:creator>[\s\S]*?<\/dc:creator>/g,''));
      else out.file(name,await e.async('uint8array'))}
    const blob=await out.generateAsync({type:'uint8array'});
    /* conferência final: nenhum nome, número ou data real pode ter sobrado */
    const chk=await JSZip.loadAsync(blob);let txt='';for(const name of Object.keys(chk.files))if(/\.xml$/.test(name))txt+=_unesc(await chk.files[name].async('string'));
    const T=_nn(txt).replace(/\s+/g,' ');const sobrou=sec.nomes.some(x=>T.includes(_nn(x).replace(/\s+/g,' ')))||sec.nums.some(x=>new RegExp('(^|\\D)'+x+'(\\D|$)').test(txt))||sec.datas.some(x=>txt.includes(x));
    if(sobrou){setStatus('Não consegui tirar todos os dados pessoais de um dos arquivos. Por segurança, o caso não foi gerado.',true);return}
    n++;zip.file(`documento_${n}.xlsx`,blob)}
  if(!n){setStatus('Nenhuma planilha para enviar. PDFs e fotos não entram no caso de suporte, porque não dá para tirar os dados pessoais deles com segurança.',true);return}
  zip.file('LEIA-ME.txt',`Caso para suporte do Gerador de Histórico do Beto (versão ${APP_VERSION})\r\nGerado em ${new Date().toLocaleDateString('pt-BR')}.\r\nTipo de ensino: ${state.mode==='eja'?'EJA':'Regular'}.\r\nAs planilhas tiveram nomes, matrículas, documentos e datas de nascimento trocados por dados inventados.\r\n${fora.length?`Não incluídos (${fora.join(', ')}): não dá para tirar dados pessoais deles com segurança.\r\n`:''}Descreva abaixo o que aconteceu de errado:\r\n\r\n`);
  await saveBlob(`caso_suporte_${new Date().toISOString().slice(0,10)}.zip`,await zip.generateAsync({type:'blob'}));
  setStatus(`Caso para suporte gerado com ${n} planilha(s), sem dados pessoais${fora.length?` (${fora.length} PDF/foto não incluído)`:''}. Escreva no LEIA-ME o que deu errado e envie.`)}
const _unesc=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
const _esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('#btn-suporte'))casoSuporte()});
