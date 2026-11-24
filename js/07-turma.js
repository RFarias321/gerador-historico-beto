/* Gerador de Histórico do Beto — turma */
/* ===== modo turma guiado: 1) atas da turma  2) escolher os alunos  3) um aluno de cada vez  4) resumo ===== */
const TURMA_ATIVA=true;
let TURMA=null,TM_BUSY=false;const HF_ONE=handleFiles;
const tmNew=()=>({on:true,mode:state&&state.mode||'reg',alunos:[],arfs:[],orfaos:[],fps:[],cur:null,seq:1,criada:Date.now(),started:false,escolhendo:false});
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
  if(TURMA.cur==null&&!TURMA.arfs.length)TURMA.mode=state.mode;tmSync();const n=list.length;let k=0,atas=0,rep=0,outros=[];
  for(const file of list){k++;setStatus(`Turma: lendo ${k} de ${n}: ${file.name}…`);
    if(/\.json$/i.test(file.name)){await openSaved(file);continue}
    const buf=await file.arrayBuffer();const fp=fileFp(buf);const rec={name:file.name,type:file.type,buf,fp};
    if(TURMA.arfs.some(r=>r.fp===fp)){rep++;continue}
    const probe={state:Object.assign(blankState(TURMA.mode),{example:false}),files:[]};
    CONF_RUN++;const keepS=state,keepF=files;state=probe.state;files=probe.files;TM_BUSY=true;
    try{await HF_ONE([fileOf(rec)])}catch(e){console.error(e)}finally{TM_BUSY=false;probe.state=state;probe.files=files;state=keepS;files=keepF}
    const ent=probe.files[0]||{};
    if(!ent.arf){outros.push(file.name);continue}
    if(probe.state.mode)TURMA.mode=probe.state.mode;
    rec.alunos=ent.arf.students.map(s=>({nome:s.nome,mat:s.mat}));rec.ano=ent.arf.ano;rec.serie=String((ent.arf.info||{}).serie||'').replace(/\D/g,'');TURMA.arfs.push(rec);atas++;
    for(const w of TURMA.alunos)if(arfHas(rec,w))await tmRunIn(w,[rec])}
  tmBlank();renderFiles();renderAll();tmSave();tmRender();
  setStatus(`Turma: ${atas} ata(s) anexada(s)${rep?`, ${rep} repetida(s) ignorada(s)`:''}.`+(outros.length?` ${outros.length} arquivo(s) não são atas (${outros.slice(0,3).join(', ')}${outros.length>3?'…':''}): FIAs e fichas de matrícula se anexam com o aluno aberto, no passo 3.`:''))}
function tmTodos(){const m=new Map();for(const rec of TURMA.arfs)for(const s of rec.alunos||[]){const k=N(s.nome);if(!k)continue;const x=m.get(k)||{nome:String(s.nome).toUpperCase(),mat:s.mat||'',atas:[]};if(!x.mat&&s.mat)x.mat=s.mat;x.atas.push((rec.ano||'')+(rec.serie?' · '+rec.serie+(TURMA.mode==='eja'?'º mód.':'ª série'):''));m.set(k,x)}
  return [...m.values()].sort((a,b)=>a.nome.localeCompare(b.nome,'pt'))}
const tmNaTurma=s=>TURMA.alunos.some(w=>arfHas({alunos:[s]},w));
async function tmComecar(sel){tmSync();let n=0;for(const s of sel){if(tmNaTurma(s))continue;const st=Object.assign(blankState(TURMA.mode),{example:false});st.aluno.nome=s.nome;st.aluno.matricula=s.mat||'';const w=tmAddWorkspace(st,[]);setStatus(`Preparando ${s.nome}…`);await tmApplyArfs(w);n++}
  TURMA.started=true;TURMA.escolhendo=false;const fila=tmFila();const prox=fila.find(w=>!w.done)||fila[0];if(prox)await tmOpen(prox.id);else{tmRender();tmSave()}
  setStatus(`${n} aluno(s) na turma. Agora anexe as FIAs e a ficha de matrícula de cada um.`)}
const tmFila=()=>TURMA.alunos.slice().sort((a,b)=>String(a.nome).localeCompare(String(b.nome),'pt'));
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
  card.hidden=false;const cur=TURMA.cur!=null?tmW(TURMA.cur):null;const fila=tmFila();
  const passos=n=>`<ol class="tm-passos">${['Atas da turma','Escolher alunos','Um aluno de cada vez','Resumo'].map((t,i)=>`<li class="${i+1===n?'on':i+1<n?'ok':''}">${i+1}. ${t}</li>`).join('')}</ol>`;
  const rodape=`<p class="hint tm-priv">A turma fica guardada <b>só neste computador</b> até você clicar em Limpar turma. Em computador compartilhado, salve em arquivo (com senha) e limpe ao terminar.</p>`;
  const acoes=`<div class="row tm-acts"><button type="button" class="btn small" data-tm="save">Salvar turma em arquivo</button><button type="button" class="btn small danger" data-tm="clear">Limpar turma</button></div>`;
  // etapa 1: atas
  if(!TURMA.arfs.length&&!TURMA.alunos.length){card.innerHTML=`<h2>Turma</h2>${passos(1)}<p class="tm-guia">Anexe no passo 1, logo abaixo, as <b>atas de resultados finais</b> da turma: uma de cada ano (ou de cada módulo, na EJA). A lista de alunos sai delas.</p>${rodape}`;return}
  // etapa 2: escolher alunos
  if(!TURMA.started||TURMA.escolhendo){const todos=tmTodos();
    card.innerHTML=`<h2>Turma <span class="count">${todos.length}</span></h2>${passos(2)}<p class="tm-guia">Marque os alunos que vão receber histórico e clique em <b>Começar</b>. Atas anexadas: ${TURMA.arfs.map(r=>esc_((r.ano||'')+(r.serie?' · '+r.serie+(TURMA.mode==='eja'?'º módulo':'ª série'):''))).join(', ')}. Pode anexar mais atas no passo 1.</p>
    <div class="row tm-acts"><button type="button" class="btn small" data-tm="todos">Marcar todos</button><button type="button" class="btn small" data-tm="nenhum">Desmarcar todos</button><span style="flex:1"></span><button type="button" class="btn small primary" data-tm="comecar">Começar →</button></div>
    <div class="tablebox"><table class="g tm-tab"><thead><tr><th></th><th>Aluno</th><th>Matrícula</th><th>Aparece nas atas</th></tr></thead><tbody>
    ${todos.map((s,i)=>{const ja=tmNaTurma(s);return `<tr><td><input type="checkbox" class="tm-sel-cb" data-i="${i}" aria-label="Escolher ${esc_(s.nome)}"${ja?' checked disabled':''}></td><td>${esc_(s.nome)}${ja?' <small class="tm-w">já na turma</small>':''}</td><td><small>${esc_(s.mat)}</small></td><td><small>${esc_(s.atas.join(' | '))}</small></td></tr>`}).join('')}</tbody></table></div>${TURMA.started?'<div class="row tm-acts"><button type="button" class="btn small" data-tm="resumo">← Voltar ao resumo</button></div>':''}${acoes}${rodape}`;
    card._todos=todos;return}
  // etapa 3: um aluno de cada vez
  if(cur){const i=fila.findIndex(w=>w.id===cur.id);const s=tmStatus(cur);
    card.innerHTML=`<h2>Turma</h2>${passos(3)}<div class="tm-cur"><span><b>Aluno ${i+1} de ${fila.length}:</b> ${esc_(cur.nome||'(sem nome)')} ${cur.done?'<span class="chip o">concluído</span>':s.ok?'<span class="chip o">pronto</span>':'<span class="chip w">pendente</span>'}</span>
      <span class="row"><button type="button" class="btn small" data-tm="ant" ${i<=0?'disabled':''}>← Anterior</button><button type="button" class="btn small primary" data-tm="prox">${i>=fila.length-1?'Terminar e ver resumo':'Próximo aluno →'}</button></span></div>
      <p class="tm-guia">Anexe no passo 1 as <b>FIAs</b> e a <b>ficha de matrícula</b> de ${esc_(cur.nome||'deste aluno')} (e a ficha de dependência, se houver). Os dados das atas já estão aqui. Confira os itens 2 a 6, baixe ou imprima, e siga para o próximo.</p>
      <div class="row tm-acts"><button type="button" class="btn small" data-tm="done" ${cur.done?'disabled':''}>${cur.done?'✓ Concluído':'Marcar como concluído'}</button><button type="button" class="btn small" data-tm="resumo">Ver resumo da turma</button></div>`;return}
  // etapa 4: resumo
  const rows=fila.map(w=>({w,s:tmStatus(w)}));const prontos=rows.filter(r=>r.s.ok).length,concl=rows.filter(r=>r.w.done).length;
  card.innerHTML=`<h2>Turma <span class="count">${fila.length}</span></h2>${passos(4)}<p class="tm-guia">${prontos} pronto(s) · ${concl} concluído(s) · ${fila.length-prontos} pendente(s). Clique em <b>Abrir</b> para continuar um aluno.</p>
  <div class="row tm-acts"><button type="button" class="btn small primary" data-tm="continuar" ${rows.some(r=>!r.w.done)?'':'disabled'}>Continuar do próximo pendente →</button><button type="button" class="btn small" data-tm="pdfall" ${prontos?'':'disabled'}>Baixar históricos prontos (${prontos}) em PDF</button><button type="button" class="btn small" data-tm="escolher">Escolher mais alunos</button></div>
  <div class="tablebox"><table class="g tm-tab"><thead><tr><th>Aluno</th><th>Documentos</th><th>Pendências</th><th>Situação</th><th></th></tr></thead><tbody>
  ${rows.map(({w,s})=>`<tr><td><b>${esc_(w.nome||'(sem nome)')}</b><br><small>${esc_(w.mat||'')}</small></td><td>${s.docs}/${s.tot}${s.falta?` · <span class="tm-b">${s.falta} faltando</span>`:''}</td><td>${s.b?`<span class="tm-b">${s.b} de atenção</span>`:''}${s.b&&s.wn?' · ':''}${s.wn?`<span class="tm-w">${s.wn} para conferir</span>`:''}${!s.b&&!s.wn?'—':''}</td><td>${w.done?'<span class="chip o">concluído</span>':s.ok?'<span class="chip o">pronto</span>':'<span class="chip w">pendente</span>'}</td><td class="tm-btns"><button type="button" class="btn small" data-tmopen="${w.id}">Abrir</button><button type="button" class="ib" data-tmdel="${w.id}" aria-label="Tirar ${esc_(w.nome)} da turma">✕</button></td></tr>`).join('')}
  </tbody></table></div>${acoes}${rodape}`}
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
{const _r=sessRestore;sessRestore=async function(){try{const t=await tmKv(null,true);if(t&&t.alunos&&t.alunos.length&&t.started===undefined)t.started=true;if(t&&!TURMA_ATIVA){const n=(t.alunos||[]).length;setTimeout(()=>tmLeftover(n),1500)}else if(t&&t.on){TURMA=t;const c=TURMA.cur;TURMA.cur=null;tmBlank();if(c!=null&&tmW(c)){await tmOpen(c)}else{renderFiles();renderAll();tmRender()}setStatus(`Turma recuperada: ${TURMA.alunos.length} aluno(s).`);return true}if(t)TURMA=t}catch(e){console.warn(e)}return _r()}}
{const _sc=scheduleConf;scheduleConf=function(){if(TM_BUSY)return;return _sc.apply(this,arguments)}}
{const _h=handleFiles;handleFiles=async function(list){if(TURMA&&TURMA.on&&!TM_BUSY&&TURMA.cur==null){return tmRoute([...list])}const r=await _h(list);if(TURMA&&TURMA.on&&TURMA.cur!=null){tmSync();tmRender();tmSave()}return r}}
{const _rs=resetAll;resetAll=function(){if(TURMA&&TURMA.on&&TURMA.cur!=null&&!TM_BUSY){const w=tmW(TURMA.cur);const r=_rs.apply(this,arguments);if(w){w.state=state;w.files=files;w.done=false}tmRender();tmSave();return r}return _rs.apply(this,arguments)}}
function tmFinishPrompt(what){const w=TURMA.cur!=null?tmW(TURMA.cur):null;if(!w)return;let t=document.getElementById('finish-toast');if(t)t.remove();t=document.createElement('div');t.id='finish-toast';t.className='toast';
  t.innerHTML=`<span><b>${esc_(what)}</b> Terminou ${esc_(w.nome||'este aluno')}?</span><span class="row"><button type="button" class="btn small primary" id="ft-done">Marcar como concluído e ir ao próximo</button><button type="button" class="btn small" id="ft-keep">Ainda não</button></span>`;
  document.body.appendChild(t);$('#ft-keep').onclick=()=>t.remove();$('#ft-done').onclick=()=>{t.remove();w.done=true;const f=tmFila();const i=f.findIndex(x=>x.id===w.id);if(i<f.length-1)tmOpen(f[i+1].id);else tmClose()}}
async function tmToggle(on){if(on){if(!TURMA){if(!isPristine()&&!state.example){const ok=await askModal('<h3>Começar uma turma?</h3><p>O aluno que está na tela entra como o primeiro aluno da turma.</p>',[{label:'Cancelar',value:false},{label:'Começar turma',value:true,primary:true}]);if(!ok)return;TURMA=tmNew();const w=tmAddWorkspace(state,files);for(const f of files){const fp=srcFp(f);if(fp)TURMA.fps.push(fp)}TURMA.cur=w.id}else{TURMA=tmNew();tmBlank()}}
    if(TURMA.alunos.length&&TURMA.started===undefined)TURMA.started=true;
    else{TURMA.on=true;tmBlank();TURMA.cur=null}renderFiles();renderAll();tmRender();tmSave();setStatus('Modo turma: comece anexando as atas de resultados finais da turma no passo 1.')}
  else{if(!TURMA)return;tmSync();TURMA.on=false;TURMA.cur=null;await tmKv(TURMA).catch(()=>{});state=blankState(TURMA.mode);files=[];renderFiles();renderAll();tmRender();setStatus('Modo um aluno. A turma continua guardada: clique em Turma para voltar a ela.')}}
document.addEventListener('click',async e=>{const t=e.target.closest('[data-tm],[data-tmopen],[data-tmdel],[data-tmorfdel],#tm-one,#tm-all');if(!t)return;
  if(t.id==='tm-all')return tmToggle(true);if(t.id==='tm-one')return tmToggle(false);
  if(t.dataset.tmopen)return tmOpen(+t.dataset.tmopen);
  if(t.dataset.tmdel){const w=tmW(+t.dataset.tmdel);const ok=await askModal(`<h3>Tirar ${esc_(w.nome||'este aluno')} da turma?</h3><p>Os dados e arquivos dele somem deste computador.</p>`,[{label:'Cancelar',value:false},{label:'Tirar da turma',value:true,primary:true}]);if(!ok)return;
    if(TURMA.cur===w.id){TURMA.cur=null;tmBlank();renderFiles();renderAll()}TURMA.alunos=TURMA.alunos.filter(a=>a!==w);for(const f of w.files||[]){const fp=srcFp(f);TURMA.fps=TURMA.fps.filter(x=>x!==fp||TURMA.arfs.some(r=>r.fp===x))}tmRender();tmSave();return}
  if(t.dataset.tmorfdel!=null){const o=TURMA.orfaos.splice(+t.dataset.tmorfdel,1)[0];TURMA.fps=TURMA.fps.filter(x=>x!==o.fp);tmRender();tmSave();return}
  const a=t.dataset.tm;const fila=tmFila();const i=fila.findIndex(w=>w.id===TURMA.cur);
  if(a==='close'||a==='resumo'){TURMA.escolhendo=false;tmClose()}
  else if(a==='done'){const w=tmW(TURMA.cur);if(w){w.done=true;tmRender();tmSave();setStatus(`${w.nome} marcado como concluído.`)}}
  else if(a==='ant'&&i>0)tmOpen(fila[i-1].id);
  else if(a==='prox'){if(i<fila.length-1)tmOpen(fila[i+1].id);else tmClose()}
  else if(a==='continuar'){const p=fila.find(w=>!w.done);if(p)tmOpen(p.id)}
  else if(a==='escolher'){TURMA.escolhendo=true;tmRender()}
  else if(a==='todos'||a==='nenhum')document.querySelectorAll('.tm-sel-cb:not(:disabled)').forEach(c=>c.checked=a==='todos');
  else if(a==='comecar'){const card=document.getElementById('turma-card');const sel=[...document.querySelectorAll('.tm-sel-cb:checked:not(:disabled)')].map(c=>card._todos[+c.dataset.i]);
    if(!sel.length&&!TURMA.alunos.length){setStatus('Marque pelo menos um aluno.',true);return}await tmComecar(sel)}
  else if(a==='pdfall')tmPdfAll();else if(a==='save')tmSaveFile();
  else if(a==='fromarf_antigo'){tmSync();let n=0;const seen=new Set();for(const rec of TURMA.arfs)for(const s of rec.alunos||[]){if(seen.has(N(s.nome))||TURMA.alunos.some(w=>arfHas({alunos:[s]},w)))continue;seen.add(N(s.nome));const st=Object.assign(blankState(TURMA.mode),{example:false});st.aluno.nome=String(s.nome).toUpperCase();st.aluno.matricula=s.mat||'';const w=tmAddWorkspace(st,[]);setStatus(`Criando ${s.nome}…`);await tmApplyArfs(w);n++}
    if(TURMA.cur==null)tmBlank();renderAll();tmRender();tmSave();setStatus(`${n} aluno(s) criado(s) a partir das atas. Faltam as FIAs e a ficha de matrícula de cada um.`)}
  else if(a==='clear'){const ok=await askModal(`<h3>Limpar a turma?</h3><p>Os ${TURMA.alunos.length} aluno(s) e todos os arquivos somem deste computador. Se quiser guardar, use antes "Salvar turma em arquivo".</p>`,[{label:'Cancelar',value:false},{label:'Limpar turma',value:true,primary:true}]);if(!ok)return;
    TURMA=null;await tmKv(null).catch(()=>{});state=blankState(state.mode);files=[];renderFiles();renderAll();tmRender();setStatus('Turma apagada deste computador.')}});
document.addEventListener('change',async e=>{const s=e.target;if(s.dataset&&s.dataset.tmorf!=null&&s.value){const o=TURMA.orfaos.splice(+s.dataset.tmorf,1)[0];const w=tmW(+s.value);tmSync();await tmRunIn(w,[o]);if(TURMA.cur===w.id){state=w.state;files=w.files;renderFiles();renderAll()}tmRender();tmSave();setStatus(`“${o.name}” enviado para ${w.nome}.`)}});
function tmLeftover(n){const st=$('#status');const d=document.createElement('div');d.className='tm-left';d.innerHTML=`Há uma turma de teste guardada neste computador (${n} aluno(s)). O modo turma está desligado por enquanto. <button type="button" class="btn small" id="tm-left-del">Apagar a turma guardada</button>`;st.after(d);d.querySelector('button').onclick=async()=>{await tmKv(null).catch(()=>{});d.remove();setStatus('Turma de teste apagada deste computador.')}}
function initTurma(){if(!TURMA_ATIVA)return;const seg=document.querySelector('.topright .seg');if(seg&&!document.getElementById('tm-all')){const d=document.createElement('div');d.className='seg';d.setAttribute('role','group');d.setAttribute('aria-label','Um aluno ou turma');d.innerHTML='<button type="button" id="tm-one" aria-pressed="true">Um aluno</button><button type="button" id="tm-all" aria-pressed="false">Turma</button>';seg.parentNode.insertBefore(d,seg)}tmRender()}
