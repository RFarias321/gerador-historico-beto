/* Gerador de Histórico do Beto — turma */
/* ===== v2: modo turma — vários alunos, cada arquivo vai para o aluno certo ===== */
const TURMA_ATIVA=false; /* modo turma desligado por enquanto; o código fica para a próxima versão */
let TURMA=null,TM_BUSY=false;const HF_ONE=handleFiles;
const tmNew=()=>({on:true,mode:state&&state.mode||'reg',alunos:[],arfs:[],orfaos:[],fps:[],cur:null,seq:1,criada:Date.now()});
const tmW=id=>TURMA.alunos.find(a=>a.id===id);
function tmSync(){if(!TURMA||TURMA.cur==null)return;const w=tmW(TURMA.cur);if(!w)return;w.state=state;w.files=files;w.nome=state.aluno.nome||w.nome;w.mat=state.aluno.matricula||w.mat}
function tmAddWorkspace(st,fl){const w={id:TURMA.seq++,nome:st.aluno.nome||'',mat:st.aluno.matricula||'',state:st,files:fl||[],done:false};TURMA.alunos.push(w);return w}
function tmFind(nome,mat){const m=String(mat||'').replace(/\D/g,'');
  return TURMA.alunos.find(a=>m&&String(a.mat||'').replace(/\D/g,'')===m)||(nome?TURMA.alunos.find(a=>a.nome&&nomeParecido(a.nome,nome)):null)}
const fileOf=r=>new File([r.buf],r.name,{type:r.type||''});
/* roda a leitura normal dentro do espaço de um aluno */
async function tmRunIn(w,recs){CONF_RUN++;const keepS=state,keepF=files;state=w.state;files=w.files;TM_BUSY=true;
  try{await HF_ONE(recs.map(fileOf))}finally{TM_BUSY=false;w.state=state;w.files=files;w.nome=state.aluno.nome||w.nome;w.mat=state.aluno.matricula||w.mat;state=keepS;files=keepF}}
function arfHas(rec,w){return (rec.alunos||[]).some(s=>(w.mat&&s.mat&&String(s.mat).replace(/\D/g,'')===String(w.mat).replace(/\D/g,''))||(w.nome&&nomeParecido(w.nome,s.nome)))}
async function tmApplyArfs(w){for(const rec of TURMA.arfs){if(!arfHas(rec,w))continue;if((w.files||[]).some(f=>f.src&&srcFp(f)===rec.fp))continue;await tmRunIn(w,[rec])}}
async function tmRoute(list){
  if(TURMA.cur==null)TURMA.mode=state.mode;tmSync();const keepCur=TURMA.cur;const n=list.length;let k=0,novos=0,orf=0,rep=0;
  for(const file of list){k++;setStatus(`Turma: lendo ${k} de ${n}: ${file.name}…`);
    if(/\.json$/i.test(file.name)){await openSaved(file);continue}
    const buf=await file.arrayBuffer();const fp=fileFp(buf);const rec={name:file.name,type:file.type,buf,fp};
    if(TURMA.fps.includes(fp)){rep++;continue}
    // leitura de sondagem num espaço vazio
    const probe={state:Object.assign(blankState(TURMA.mode),{example:false}),files:[]};
    CONF_RUN++;const keepS=state,keepF=files;state=probe.state;files=probe.files;TM_BUSY=true;
    try{await HF_ONE([fileOf(rec)])}catch(e){console.error(e)}finally{TM_BUSY=false;probe.state=state;probe.files=files;state=keepS;files=keepF}
    const ent=probe.files[0]||{};if(probe.state.mode)TURMA.mode=probe.state.mode;
    if(ent.arf){rec.alunos=ent.arf.students.map(s=>({nome:s.nome,mat:s.mat}));rec.ano=ent.arf.ano;TURMA.arfs.push(rec);TURMA.fps.push(fp);
      for(const w of TURMA.alunos)if(arfHas(rec,w))await tmRunIn(w,[rec]);continue}
    const nome=probe.state.aluno.nome,mat=probe.state.aluno.matricula;
    if(ent.err||ent.fund||(!nome&&!mat)){TURMA.orfaos.push({...rec,msg:ent.fund?FUND_MSG:ent.err?ent.status:'Não encontrei o nome do aluno neste arquivo.'});TURMA.fps.push(fp);orf++;continue}
    let w=tmFind(nome,mat);
    if(!w){probe.state.modeAlert='';w=tmAddWorkspace(probe.state,probe.files);novos++;await tmApplyArfs(w)}
    else await tmRunIn(w,[rec]);
    TURMA.fps.push(fp)}
  TURMA.cur=keepCur;if(keepCur!=null){const w=tmW(keepCur);if(w){state=w.state;files=w.files}}else tmBlank();
  renderFiles();renderAll();tmSave();tmRender();
  setStatus(`Turma: ${n} arquivo(s) lido(s). ${TURMA.alunos.length} aluno(s) na lista${novos?` (${novos} novo(s))`:''}${rep?`, ${rep} repetido(s) ignorado(s)`:''}${orf?`, ${orf} sem aluno identificado`:''}.`)}
function tmBlank(){state=Object.assign(blankState(TURMA.mode),{example:false});files=[]}
/* ---------- situação de cada aluno ---------- */
function tmStatus(w){const st=w.state;let b=0,wn=0;try{for(const x of dataChecks(st))x.l==='b'?b++:wn++;b+=obsLines(st).filter(l=>l.ph).length;for(const x of validationIssues(st))wn++}catch(e){}
  const dc=docChecklist(st,w.files);const falta=dc.filter(x=>x.k==='b').length,inc=dc.filter(x=>x.k==='w').length;
  const semFia=dc.filter(x=>x.k!=='o'&&/^FIA/.test(x.t)).length;
  return {b,wn,falta:falta+(semFia&&!falta?semFia:0),inc,docs:dc.filter(x=>x.k==='o').length,tot:dc.length,ok:!b&&!falta&&!semFia&&st.subjects.length>0}}
function tmRender(){let card=document.getElementById('turma-card');document.body.classList.toggle('turma-on',!!(TURMA&&TURMA.on));document.body.classList.toggle('turma-nocur',!!(TURMA&&TURMA.on&&TURMA.cur==null));
  $('#tm-one')&&$('#tm-one').setAttribute('aria-pressed',String(!(TURMA&&TURMA.on)));$('#tm-all')&&$('#tm-all').setAttribute('aria-pressed',String(!!(TURMA&&TURMA.on)));
  if(!TURMA||!TURMA.on){if(card)card.hidden=true;return}
  if(!card){card=document.createElement('section');card.className='card';card.id='turma-card';const first=document.querySelector('.grid section.card');first.parentNode.insertBefore(card,first)}
  card.hidden=false;const rows=TURMA.alunos.map(w=>({w,s:tmStatus(w)})).sort((a,b)=>String(a.w.nome).localeCompare(String(b.w.nome),'pt'));
  const prontos=rows.filter(r=>r.s.ok).length,concl=rows.filter(r=>r.w.done).length;
  const naAta=new Map();for(const rec of TURMA.arfs)for(const s of rec.alunos||[])if(!TURMA.alunos.some(w=>arfHas({alunos:[s]},w)))naAta.set(N(s.nome),s);
  const cur=TURMA.cur!=null?tmW(TURMA.cur):null;
  card.innerHTML=`<h2>Turma <span class="count">${TURMA.alunos.length}</span></h2>
  ${cur?`<div class="tm-cur"><span>Aberto: <b>${esc_(cur.nome||'(sem nome)')}</b></span><span class="row"><button type="button" class="btn small primary" data-tm="done" ${cur.done?'disabled':''}>${cur.done?'✓ Concluído':'Marcar como concluído'}</button><button type="button" class="btn small" data-tm="close">← Voltar à lista da turma</button></span></div>`:''}
  <p class="hint">Anexe no passo 1 os documentos de <b>todos</b> os alunos, em qualquer ordem e quando quiser: FIAs, atas, fichas de matrícula e de dependência. Cada arquivo vai sozinho para o aluno certo; as atas completam todos os alunos que aparecem nelas. Clique em <b>Abrir</b> para conferir e corrigir um aluno.</p>
  <details class="tm-list"${cur?'':' open'}><summary>Lista da turma: ${TURMA.alunos.length} aluno(s) · ${prontos} pronto(s)${concl?' · '+concl+' concluído(s)':''}</summary>
  <div class="row tm-acts"><button type="button" class="btn small" data-tm="pdfall" ${prontos?'':'disabled'}>Baixar históricos prontos (${prontos}) em PDF</button>${naAta.size?`<button type="button" class="btn small" data-tm="fromarf">Criar os ${naAta.size} aluno(s) que só aparecem nas atas</button>`:''}<button type="button" class="btn small" data-tm="save">Salvar turma em arquivo</button><button type="button" class="btn small danger" data-tm="clear">Limpar turma</button></div>
  <div class="tablebox"><table class="g tm-tab"><thead><tr><th>Aluno</th><th>Documentos</th><th>Pendências</th><th>Situação</th><th></th></tr></thead><tbody>
  ${rows.length?rows.map(({w,s})=>`<tr class="${cur&&cur.id===w.id?'tm-sel':''}"><td><b>${esc_(w.nome||'(sem nome)')}</b><br><small>${esc_(w.mat||'')}</small></td><td>${s.docs}/${s.tot}${s.falta?` · <span class="tm-b">${s.falta} faltando</span>`:''}</td><td>${s.b?`<span class="tm-b">${s.b} de atenção</span>`:''}${s.b&&s.wn?' · ':''}${s.wn?`<span class="tm-w">${s.wn} para conferir</span>`:''}${!s.b&&!s.wn?'—':''}</td><td>${w.done?'<span class="chip o">concluído</span>':s.ok?'<span class="chip o">pronto</span>':'<span class="chip w">pendente</span>'}</td><td class="tm-btns"><button type="button" class="btn small" data-tmopen="${w.id}">Abrir</button><button type="button" class="ib" data-tmdel="${w.id}" aria-label="Tirar ${esc_(w.nome)} da turma">✕</button></td></tr>`).join(''):'<tr><td colspan="5" class="hint">Nenhum aluno ainda. Anexe os documentos no passo 1.</td></tr>'}
  </tbody></table></div>
  ${TURMA.orfaos.length?`<div class="tm-orf"><div class="subhead">Arquivos sem aluno identificado</div>${TURMA.orfaos.map((o,i)=>`<div class="row"><span><b>${esc_(o.name)}</b> · <small>${esc_(o.msg||'')}</small></span><select data-tmorf="${i}" aria-label="Enviar para o aluno"><option value="">Enviar para o aluno…</option>${TURMA.alunos.map(w=>`<option value="${w.id}">${esc_(w.nome)}</option>`).join('')}</select><button type="button" class="ib" data-tmorfdel="${i}" aria-label="Descartar arquivo">✕</button></div>`).join('')}</div>`:''}
  </details>
  <p class="hint tm-priv">A turma fica guardada <b>só neste computador</b> até você clicar em Limpar turma${concl?` · ${concl} concluído(s)`:''}. Em computador compartilhado, salve em arquivo e limpe ao terminar.</p>`}
async function tmOpen(id){CONF_RUN++;CONF={state:'idle',items:[],sig:''};tmSync();const w=tmW(id);if(!w)return;TURMA.cur=id;state=w.state;files=w.files;renderFiles();renderAll();tmRender();tmSave();
  setTimeout(()=>{try{renderChecks();autoCollapse()}catch(e){}},50);document.getElementById('turma-card').scrollIntoView({behavior:'smooth',block:'start'})}
function tmClose(){CONF_RUN++;CONF={state:'idle',items:[],sig:''};tmSync();TURMA.cur=null;tmBlank();renderFiles();renderAll();tmRender();tmSave()}
async function tmPdfAll(){tmSync();const ready=TURMA.alunos.filter(w=>tmStatus(w).ok).sort((a,b)=>String(a.nome).localeCompare(String(b.nome),'pt'));if(!ready.length)return;
  const doc=new jspdf.jsPDF({unit:'pt',format:'a4',orientation:'portrait'});for(const [k,f] of Object.entries(FONT_FILES)){doc.addFileToVFS(f,FONTB64[k]);doc.addFont(f,'Carlito',k)}
  const keep=state;try{ready.forEach((w,i)=>{if(i)doc.addPage('a4','portrait');state=w.state;paintSheet(buildSheet(w.state),pdfPainter(doc))})}finally{state=keep}
  doc.setProperties({title:'Históricos da turma'});await saveBlob(`Historicos_turma_${ready.length}_alunos.pdf`,doc.output('blob'));setStatus(`${ready.length} histórico(s) em um PDF. Os alunos com pendência não entraram: abra cada um para corrigir.`)}
async function tmImport(obj){const t=obj.turma;if(!t)return;
  if(TURMA&&TURMA.alunos.length){const ok=await askModal('<h3>Abrir turma salva?</h3><p>A turma que está neste computador será substituída pela do arquivo.</p>',[{label:'Cancelar',value:false},{label:'Substituir',value:true,primary:true}]);if(!ok)return}
  TURMA=t;TURMA.on=true;TURMA.cur=null;tmBlank();renderFiles();renderAll();tmRender();tmSave();setStatus(`Turma aberta do arquivo: ${TURMA.alunos.length} aluno(s).`)}
async function tmSaveFile(){tmSync();const senha=await pedirSenha(true);if(!senha)return;const txt=await cifrar(serialize({app:'gerador-historico-beto',kind:'turma',v:2,salvo:new Date().toISOString(),turma:TURMA}),senha);
  await saveBlob(`Turma_${new Date().toISOString().slice(0,10)}.historico.json`,new Blob([txt],{type:'application/json'}));setStatus('Turma salva em arquivo. Guarde-o em local seguro: tem dados pessoais dos alunos.')}
/* ---------- guardar no navegador ---------- */
async function tmKv(v,get){const db=await sessDb();const r=await new Promise((res,rej)=>{const tx=db.transaction('kv',get?'readonly':'readwrite');const s=tx.objectStore('kv');let q;if(get)q=s.get('turma');else if(v==null)s.delete('turma');else s.put(v,'turma');tx.oncomplete=()=>res(q&&q.result);tx.onerror=()=>rej(tx.error)});db.close();return r}
let tmSaveT=null;function tmSave(){clearTimeout(tmSaveT);tmSaveT=setTimeout(()=>{if(TURMA&&!TM_BUSY){tmSync();tmKv(TURMA).catch(e=>console.warn('turma',e))}},400)}
{const _s=sessSaveNow;sessSaveNow=async function(){if(TURMA&&TURMA.on){if(!TM_BUSY){tmSync();try{await tmKv(TURMA)}catch(e){console.warn(e)}}return}return _s()}}
{const _r=sessRestore;sessRestore=async function(){try{const t=await tmKv(null,true);if(t&&!TURMA_ATIVA){const n=(t.alunos||[]).length;setTimeout(()=>tmLeftover(n),1500)}else if(t&&t.on){TURMA=t;const c=TURMA.cur;TURMA.cur=null;tmBlank();if(c!=null&&tmW(c)){await tmOpen(c)}else{renderFiles();renderAll();tmRender()}setStatus(`Turma recuperada: ${TURMA.alunos.length} aluno(s).`);return true}if(t)TURMA=t}catch(e){console.warn(e)}return _r()}}
{const _sc=scheduleConf;scheduleConf=function(){if(TM_BUSY)return;return _sc.apply(this,arguments)}}
{const _h=handleFiles;handleFiles=async function(list){if(TURMA&&TURMA.on&&!TM_BUSY){return tmRoute([...list])}return _h(list)}}
{const _rs=resetAll;resetAll=function(){if(TURMA&&TURMA.on&&TURMA.cur!=null&&!TM_BUSY){const w=tmW(TURMA.cur);const r=_rs.apply(this,arguments);if(w){w.state=state;w.files=files;w.done=false}tmRender();tmSave();return r}return _rs.apply(this,arguments)}}
function tmFinishPrompt(what){const w=TURMA.cur!=null?tmW(TURMA.cur):null;if(!w)return;let t=document.getElementById('finish-toast');if(t)t.remove();t=document.createElement('div');t.id='finish-toast';t.className='toast';
  t.innerHTML=`<span><b>${esc_(what)}</b> Terminou ${esc_(w.nome||'este aluno')}?</span><span class="row"><button type="button" class="btn small primary" id="ft-done">Marcar como concluído e voltar à turma</button><button type="button" class="btn small" id="ft-keep">Ainda não</button></span>`;
  document.body.appendChild(t);$('#ft-keep').onclick=()=>t.remove();$('#ft-done').onclick=()=>{t.remove();w.done=true;tmClose()}}
async function tmToggle(on){if(on){if(!TURMA){if(!isPristine()&&!state.example){const ok=await askModal('<h3>Começar uma turma?</h3><p>O aluno que está na tela entra como o primeiro aluno da turma.</p>',[{label:'Cancelar',value:false},{label:'Começar turma',value:true,primary:true}]);if(!ok)return;TURMA=tmNew();const w=tmAddWorkspace(state,files);for(const f of files){const fp=srcFp(f);if(fp)TURMA.fps.push(fp)}TURMA.cur=w.id}else{TURMA=tmNew();tmBlank()}}
    else{TURMA.on=true;tmBlank();TURMA.cur=null}renderFiles();renderAll();tmRender();tmSave();setStatus('Modo turma: anexe os documentos de todos os alunos no passo 1.')}
  else{if(!TURMA)return;tmSync();TURMA.on=false;TURMA.cur=null;await tmKv(TURMA).catch(()=>{});state=blankState(TURMA.mode);files=[];renderFiles();renderAll();tmRender();setStatus('Modo um aluno. A turma continua guardada: clique em Turma para voltar a ela.')}}
document.addEventListener('click',async e=>{const t=e.target.closest('[data-tm],[data-tmopen],[data-tmdel],[data-tmorfdel],#tm-one,#tm-all');if(!t)return;
  if(t.id==='tm-all')return tmToggle(true);if(t.id==='tm-one')return tmToggle(false);
  if(t.dataset.tmopen)return tmOpen(+t.dataset.tmopen);
  if(t.dataset.tmdel){const w=tmW(+t.dataset.tmdel);const ok=await askModal(`<h3>Tirar ${esc_(w.nome||'este aluno')} da turma?</h3><p>Os dados e arquivos dele somem deste computador.</p>`,[{label:'Cancelar',value:false},{label:'Tirar da turma',value:true,primary:true}]);if(!ok)return;
    if(TURMA.cur===w.id){TURMA.cur=null;tmBlank();renderFiles();renderAll()}TURMA.alunos=TURMA.alunos.filter(a=>a!==w);for(const f of w.files||[]){const fp=srcFp(f);TURMA.fps=TURMA.fps.filter(x=>x!==fp||TURMA.arfs.some(r=>r.fp===x))}tmRender();tmSave();return}
  if(t.dataset.tmorfdel!=null){const o=TURMA.orfaos.splice(+t.dataset.tmorfdel,1)[0];TURMA.fps=TURMA.fps.filter(x=>x!==o.fp);tmRender();tmSave();return}
  const a=t.dataset.tm;if(a==='close')tmClose();else if(a==='done'){const w=tmW(TURMA.cur);if(w){w.done=true;tmClose();setStatus(`${w.nome} marcado como concluído.`)}}
  else if(a==='pdfall')tmPdfAll();else if(a==='save')tmSaveFile();
  else if(a==='fromarf'){tmSync();let n=0;const seen=new Set();for(const rec of TURMA.arfs)for(const s of rec.alunos||[]){if(seen.has(N(s.nome))||TURMA.alunos.some(w=>arfHas({alunos:[s]},w)))continue;seen.add(N(s.nome));const st=Object.assign(blankState(TURMA.mode),{example:false});st.aluno.nome=String(s.nome).toUpperCase();st.aluno.matricula=s.mat||'';const w=tmAddWorkspace(st,[]);setStatus(`Criando ${s.nome}…`);await tmApplyArfs(w);n++}
    if(TURMA.cur==null)tmBlank();renderAll();tmRender();tmSave();setStatus(`${n} aluno(s) criado(s) a partir das atas. Faltam as FIAs e a ficha de matrícula de cada um.`)}
  else if(a==='clear'){const ok=await askModal(`<h3>Limpar a turma?</h3><p>Os ${TURMA.alunos.length} aluno(s) e todos os arquivos somem deste computador. Se quiser guardar, use antes "Salvar turma em arquivo".</p>`,[{label:'Cancelar',value:false},{label:'Limpar turma',value:true,primary:true}]);if(!ok)return;
    TURMA=null;await tmKv(null).catch(()=>{});state=blankState(state.mode);files=[];renderFiles();renderAll();tmRender();setStatus('Turma apagada deste computador.')}});
document.addEventListener('change',async e=>{const s=e.target;if(s.dataset&&s.dataset.tmorf!=null&&s.value){const o=TURMA.orfaos.splice(+s.dataset.tmorf,1)[0];const w=tmW(+s.value);tmSync();await tmRunIn(w,[o]);if(TURMA.cur===w.id){state=w.state;files=w.files;renderFiles();renderAll()}tmRender();tmSave();setStatus(`“${o.name}” enviado para ${w.nome}.`)}});
function tmLeftover(n){const st=$('#status');const d=document.createElement('div');d.className='tm-left';d.innerHTML=`Há uma turma de teste guardada neste computador (${n} aluno(s)). O modo turma está desligado por enquanto. <button type="button" class="btn small" id="tm-left-del">Apagar a turma guardada</button>`;st.after(d);d.querySelector('button').onclick=async()=>{await tmKv(null).catch(()=>{});d.remove();setStatus('Turma de teste apagada deste computador.')}}
function initTurma(){if(!TURMA_ATIVA)return;const seg=document.querySelector('.topright .seg');if(seg&&!document.getElementById('tm-all')){const d=document.createElement('div');d.className='seg';d.setAttribute('role','group');d.setAttribute('aria-label','Um aluno ou turma');d.innerHTML='<button type="button" id="tm-one" aria-pressed="true">Um aluno</button><button type="button" id="tm-all" aria-pressed="false">Turma</button>';seg.parentNode.insertBefore(d,seg)}tmRender()}
