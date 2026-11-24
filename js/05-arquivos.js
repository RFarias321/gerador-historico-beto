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
