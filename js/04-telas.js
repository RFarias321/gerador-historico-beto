/* Gerador de Histórico do Beto — telas */
/* ===== v2: usabilidade, conferência e segurança ===== */
const APP_VERSION='2.3',APP_DATA='28/11/2026';
/* janela simples dentro da página (funciona também onde confirm() é bloqueado) */
function askModal(html,buttons,opts){opts=opts||{};return new Promise(res=>{const bg=document.createElement('div');bg.className='mdl-bg';
  bg.innerHTML=`<div class="mdl${opts.wide?' wide':''}" role="dialog" aria-modal="true"><div class="mdl-body">${html}</div><div class="mdl-foot">${buttons.map((b,i)=>`<button type="button" class="btn ${b.primary?'primary':''} small" data-mi="${i}">${esc_(b.label)}</button>`).join('')}</div></div>`;
  document.body.appendChild(bg);const close=v=>{bg.remove();res(v)};
  bg.addEventListener('click',e=>{const b=e.target.closest('[data-mi]');if(b)close(buttons[+b.dataset.mi].value);else if(e.target===bg&&!opts.sticky)close(null)});
  bg.addEventListener('keydown',e=>{if(e.key==='Escape')close(null)});
  if(opts.onOpen)opts.onOpen(bg);(bg.querySelector('.btn.primary')||bg.querySelector('button')).focus()})}
/* ---------- mensagens de erro claras ---------- */
function friendlyErr(e){const m=String((e&&e.message)||e||'');
  if(e instanceof TypeError||/undefined|null|is not a function|Cannot (read|set)|NaN|of undefined/i.test(m))
    return `Não consegui ler este arquivo. Confira se é um documento do Conexão (FIA, ata de resultados, ficha de matrícula ou de dependência) e se o tipo de ensino no topo (Regular ou EJA) está certo. Se continuar, avise o responsável pelo site com o nome do arquivo. (detalhe técnico: ${m})`;
  return m||'Não foi possível ler o arquivo.'}
/* ---------- lista de documentos do aluno ---------- */
const ROLE_LBL={mat:'Ficha de matrícula',fia:'FIA',arf:'Ata de resultados',dep:'Ficha de dependência'};
function docList(fl){return (fl||[]).filter(f=>f.ok&&f.src&&!f.dup).flatMap(f=>(f.src.docs||[]).map(d=>({f,d})))}
function docChecklist(st,fl){
  const docs=docList(fl),L=LABELS[st.mode],items=[];
  const hasMat=docs.some(x=>x.d.role==='mat');
  items.push({k:hasMat?'o':'w',t:'Ficha de matrícula',s:hasMat?'anexada':'não anexada',go:'#drop'});
  const fromHist=(fl||[]).some(f=>/histórico importado/.test(f.status||''));
  st.periods.forEach((p,i)=>{const has=st.subjects.some(s=>s.g[i]&&(s.g[i].nota!==''||s.g[i].ch!==''));const lab=`${L[i]}${p.ano?' · '+p.ano:''}`;
    const fia=docs.some(x=>x.d.role==='fia'&&x.d.p===i);
    items.push(fia?{k:'o',t:'FIA · '+lab,s:'anexada'}:has?{k:'w',t:'FIA · '+lab,s:fromHist?'dados vieram de histórico ou ata':'não anexada (dados vieram da ata)',go:'#drop'}:{k:'b',t:'FIA · '+L[i],s:'falta',go:'#drop'});
    if(p.ano||has){const arf=docs.some(x=>x.d.role==='arf'&&String(x.d.ano)===String(p.ano)&&(!x.d.serie||+x.d.serie===i+1));
      items.push({k:arf?'o':'w',t:'Ata · '+lab,s:arf?'anexada':'não anexada',go:'#drop'})}});
  for(const d of st.deps){const up=docs.some(x=>x.d.role==='dep'&&(x.d.subjects||[]).some(s=>canon(s).key===canon(d.disc||'').key));
    items.push(d.pendente?{k:'w',t:'Dependência · '+(d.disc||'(disciplina?)'),s:'não cumprida (o histórico registra que o aluno deve)',go:'#deps'}:{k:d.nota&&d.disc?'o':'w',t:'Dependência · '+(d.disc||'(disciplina?)'),s:(up?'ficha enviada':'ficha será gerada pelo site')+(d.nota?'':' · falta a nota final'),go:'#deps'})}
  return items}
function renderDocCheck(){let box=document.getElementById('doc-check');
  if(!box){box=document.createElement('div');box.id='doc-check';box.className='doc-check';const dr=$('#drop');dr.parentNode.insertBefore(box,dr.nextSibling)}
  if(isPristine()||state.example){box.hidden=true;return}box.hidden=false;
  const it=docChecklist(state,files);const ic={o:'✓',w:'!',b:'✗'};const L=LABELS[state.mode];
  const chip=(x,txt)=>`<span class="dk-c dc-${x.k}" title="${esc_(x.t+' · '+x.s)}"><span class="dc-ic" aria-hidden="true">${ic[x.k]}</span>${esc_(txt)}</span>`;
  const short=t=>t.replace(/^(FIA|Ata) · /,'').replace(/ módulo| série/,'').replace(' · ',' · ');
  const grp=(re)=>it.filter(x=>re.test(x.t));
  const lines=[];const m=grp(/^Ficha de matrícula/)[0];
  lines.push(`<li><span class="dk-l">Ficha de matrícula</span>${chip(m,m.k==='o'?'anexada':'não anexada')}</li>`);
  const fia=grp(/^FIA/);lines.push(`<li><span class="dk-l">Fichas individuais (FIA)</span>${fia.map(x=>chip(x,short(x.t))).join('')}</li>`);
  const ata=grp(/^Ata/);if(ata.length)lines.push(`<li><span class="dk-l">Atas de resultados finais</span>${ata.map(x=>chip(x,short(x.t))).join('')}</li>`);
  const dep=grp(/^Dependência/);if(dep.length)lines.push(`<li><span class="dk-l">Fichas de dependência</span>${dep.map(x=>{const d=state.deps.find(z=>'Dependência · '+(z.disc||'(disciplina?)')===x.t);return chip(x,x.t.replace('Dependência · ','')+(d&&d.ano?' · '+d.ano:'')+(x.k==='o'?'':' · '+(/falta a nota/.test(x.s)?'falta a nota':'gerada pelo site')))}).join('')}</li>`);
  const hist=files.filter(f=>f.ok&&/histórico importado/.test(f.status||''));if(hist.length)lines.push(`<li><span class="dk-l">Histórico anterior</span>${hist.map(f=>chip({k:'o',t:f.name,s:'importado'},String(f.status).match(/\((EJA|Regular)[^)]*\)/)?String(f.status).match(/\(([^)]*)\)/)[1]:'importado')).join('')}</li>`);
  box.innerHTML=`<div class="subhead">Documentos deste aluno</div><ul class="dck">${lines.join('')}</ul>`}
/* ---------- validações ---------- */
function cpfOk(v){const d=String(v).replace(/\D/g,'');if(d.length!==11||/^(\d)\1+$/.test(d))return false;const dv=n=>{let s=0;for(let i=0;i<n;i++)s+=+d[i]*(n+1-i);const r=s*10%11;return r===10?0:r};return dv(9)===+d[9]&&dv(10)===+d[10]}
function dateOk(v){const m=String(v).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);if(!m)return false;const d=new Date(+m[3],+m[2]-1,+m[1]);return d.getFullYear()===+m[3]&&d.getMonth()===+m[2]-1&&d.getDate()===+m[1]}
function matInvalid(){const bad={};const V=(state.mat||{}).vals||{};
  for(const [k,v] of Object.entries(V)){if(!v)continue;const lab=k.split('|')[1];
    if(lab==='CPF'&&!cpfOk(v))bad[k]='CPF inválido (dígito verificador não confere)';
    else if(/^Data/.test(lab)&&!dateOk(v))bad[k]='data inválida (use dd/mm/aaaa)';
    else if(/^(CEP)$/.test(lab)&&String(v).replace(/\D/g,'').length!==8)bad[k]='CEP deve ter 8 dígitos';}
  return bad}
function validationIssues(st){const out=[];const L=LABELS[st.mode];
  const m=String(st.aluno.matricula||'').replace(/\D/g,'');if(m&&m.length!==15)out.push({l:'w',t:`Nº de matrícula com ${m.length} dígitos (no Conexão são 15): confira.`,go:'#al-matricula'});
  st.periods.forEach((p,i)=>{let t=0,n=0;for(const s of st.subjects){const c=num((s.g[i]||{}).ch);if(c!=null){t+=c;n++}}if(n&&(t<200||t>1800))out.push({l:'w',t:`${L[i]}: carga horária total ${t}h fora do comum. Confira.`,go:'#grades'})});
  if(st===state)for(const [k,why] of Object.entries(matInvalid()))out.push({l:'w',t:`Ficha de matrícula, ${k.split('|').slice(0,2).join(' · ')}: ${why}.`,go:'#mat-cfg'});
  return out}
function markMatInvalid(){const bad=matInvalid();document.querySelectorAll('#mat-form input[data-mt]').forEach(i=>{const w=bad[i.dataset.mt];i.classList.toggle('inval',!!w);i.title=w||''})}
{const _rm=renderMat;renderMat=function(){_rm.apply(this,arguments);markMatInvalid()}}
document.addEventListener('input',e=>{if(e.target.dataset&&e.target.dataset.mt!=null){markMatInvalid();renderChecks()}});
/* ---------- painel único "O que precisa da sua atenção" ---------- */
const SEC_OF=sel=>/^#(sig|esc)/.test(sel)?'6':/^#(aluno|al-)/.test(sel)?'2':/^#mat/.test(sel)?'3':/^#(grades|places|subj)/.test(sel)?'4':/^#(deps|obs)/.test(sel)?'5':0;
function renderChecks(){
  const box=$('#checks');if(isPristine()){$('#checks-count').hidden=true;box.innerHTML='<li><span class="chip o" style="background:var(--accent-soft);color:var(--accent-2)">início</span><span>Anexe os documentos do aluno no passo 1. O que precisar de atenção aparece aqui.</span></li>';secBadges({});return}
  const out=[];const A=state.aluno;const L=LABELS[state.mode];const add=(l,t,go)=>out.push({l,t,go});
  if(state.modeAlert)add('w',state.modeAlert,'#mode-alert');
  {const P=escolaDaFicha();if(P&&String(esc.censo||'')!==P.censo){const x=escolaPorCenso(P.censo);add('w',`A FIA do último ano é da escola ${x?x.curto:P.escola} (censo ${P.censo}), mas os dados da escola no item 6 são de ${esc.curto||'outra escola'}${esc.censo?' (censo '+esc.censo+')':''}. No item 6, clique em "Usar a escola da ficha" ou digite o censo.`,'#es-censo')}}
  for(const [k,l] of [['decreto','Decreto'],['do','D.O.'],['ua','U.A.']])if(!esc[k]){add('w',`Dados da escola: falta ${l} (item 6).`,'#es-'+k)}
  for(const f of files){if(f.ocr&&f.ok)add('w',`“${f.name}” é foto ou digitalização: os dados lidos podem ter erros. Se puder, use o PDF original do Conexão.`,'#files');if(f.err)add('b',`“${f.name}”: ${f.status}`,'#files')}
  for(const x of docChecklist(state,files))if(x.k!=='o'&&!/^Dependência/.test(x.t))add(x.k==='b'?'w':'w',`Falta: ${x.t}${x.s&&x.s!=='falta'?' ('+x.s+')':''}`,x.go);
  const miss=ALUNO_FIELDS.filter(([k])=>!A[k]).map(([,l])=>l.replace('Filiação — ',''));if(miss.length)add('w','Dados do aluno vazios: '+miss.join(', '),'#aluno');
  const ocrK=Object.keys(state.ocrFields||{}).filter(k=>A[k]);if(ocrK.length)add('w','Lidos de imagem, confira letra por letra: '+ocrK.map(k=>FIELD_LABEL[k]).join(', '),'#al-'+ocrK[0]);
  state.periods.forEach((p,i)=>{if(!periodHasData(i))return;const lab=L[i];if(!p.ano)add('w',`${lab}: falta o ano`,'#places');if(!p.freq)add('w',`${lab}: falta a frequência`,'#places');if(!p.sit)add('w',`${lab}: falta a situação final`,'#places')});
  const pad=state.subjects.reduce((a,s)=>a+s.g.filter(g=>g.pad).length,0);if(pad)add('w',`${pad} carga(s) horária(s) com valor padrão do modelo: confira`,'#grades');
  const ph=obsLines(state).filter(l=>l.ph).length;if(ph)add('b',`${ph} linha(s) de dependência com (preencher)`,'#deps');
  const depFlag=[];state.subjects.forEach(s=>s.g.forEach((g,p)=>{if(isDep(g,p)&&!state.deps.some(d=>N(d.disc)===N(s.name)))depFlag.push(`${s.name} (${L[p]})`)}));if(depFlag.length)add('b','Nota abaixo da média sem dependência registrada: '+depFlag.join(', '),'#deps');
  if(state.deps.length)add('w',`Confira o ano em vermelho de ${state.deps.length===1?'a dependência':'cada uma das '+state.deps.length+' dependências'} (ano que sai na observação).`,'#deps');
  const nd=files.reduce((a,f)=>a+((f.diff||[]).length),0);if(nd)add('w',`${nd} dado(s) do aluno diferentes entre os arquivos: escolha o certo na lista de arquivos`,'#files');
  for(const v of validationIssues(state))add(v.l,v.t,v.go);
  if(!sig.sec.nome||!sig.dir.nome||!sig.sec.mat||!sig.dir.mat)add('w','Preencha nome e matrícula do secretário e do diretor no item 6 (uma vez só: fica salvo neste navegador).','#sig-sec');
  state.periods.forEach((P,i)=>{const sub=state.subjects.filter(s=>s.g[i]&&s.g[i].nota!=='');if(!sub.length||sub.length>3||P.sit&&P.sit!=='APROV. C/DEP'&&sub.length>1)return;
    const ant=s=>{const k=canon(s.name).key;return state.subjects.some(x=>canon(x.name).key===k&&x.g.some((g,j)=>j!==i&&isDep(g,j)))};
    if(sub.every(ant))add('b',`O ${L[i]}${P.ano?' ('+P.ano+')':''} tem só ${sub.map(s=>s.name).join(', ')}, que já aparece(m) como dependência em outro módulo/série: parece uma ficha de dependência lida como ${L[i]}. Tire o arquivo e anexe de novo junto com as demais fichas.`,'#places')});
  for(const x of conferirFiaAta())add('w',x,'#grades');
  {const t=chTotalCurso(),min=chMinimo();if(t.completo&&min&&t.total<min)add('w',`Carga horária total do curso: ${t.total} h, abaixo do mínimo de ${min} h (${state.mode==='eja'?'EJA':'Regular'}) configurado no item 6. Confira se falta alguma disciplina ou C/H.`,'#grades')}
  if(!state.subjects.length)add('b','Nenhuma disciplina na lista','#grades');
  if(!out.length)add('o','Tudo preenchido. Pode baixar e imprimir.');
  const nOpen=out.filter(o=>o.l!=='o').length;const cc=$('#checks-count');cc.textContent=nOpen?String(nOpen):'';cc.hidden=!nOpen;
  box.innerHTML=out.map(o=>`<li><span class="chip ${o.l}">${o.l==='o'?'ok':o.l==='b'?'atenção':'conferir'}</span><span>${esc_(o.t)}</span>${o.go?`<button type="button" class="btn small go" data-go="${esc_(o.go)}" aria-label="Ir para: ${esc_(o.t)}">ir</button>`:''}</li>`).join('');
  const per={};for(const o of out)if(o.l!=='o'&&o.go){const s=SEC_OF(o.go);if(s)per[s]=(per[s]||0)+1}secBadges(per);renderDocCheck();if(document.activeElement&&document.activeElement.id!=='chmin')renderChMin()}
function goTo(sel){const el=document.querySelector(sel);if(!el)return;const sec=el.closest('.sec');if(sec)sec.classList.remove('collapsed');const det=el.closest('details')||(el.tagName==='DETAILS'?el:null);if(det)det.open=true;
  el.scrollIntoView({behavior:'smooth',block:'center'});const inp=el.matches('input,select,textarea')?el:el.querySelector('input:not([disabled]),select,textarea,button');if(inp)setTimeout(()=>inp.focus({preventScroll:true}),350)}
document.addEventListener('click',e=>{const g=e.target.closest('[data-go]');if(g){e.preventDefault();goTo(g.dataset.go)}});
/* ---------- seções que recolhem, com selo de conferência ---------- */
const HELP={'1':['Anexe tudo de uma vez, em qualquer ordem: FIAs, atas, ficha de matrícula e fichas de dependência, em Excel ou PDF. A lista "Documentos deste aluno" mostra o que falta baixar no Conexão.','anexar'],
  '2':['Dados pessoais do histórico. Vêm da ficha de matrícula (quando é PDF do Conexão) e das FIAs. Campos em amarelo estão vazios; tracejados foram lidos de imagem.','aluno'],
  '4':['Notas são o total de pontos do ano (soma dos bimestres ou trimestres). Vermelho = abaixo da média, gera dependência. "Onde cursou" traz escola, ano, frequência e situação de cada série ou módulo.','notas'],
  '5':['Cada dependência vira uma linha de observação e uma ficha de dependência na impressão para assinatura. "Ficou em" é a série/módulo em que o aluno ficou em dependência; o ano em vermelho é o que sai na observação. Se o aluno não fez a dependência, marque "não cumpriu".','obs'],
  '6':['Escola que emite e quem assina. Fica salvo neste navegador. Ao digitar o nome da escola em um campo (ex.: "IE Carmela Dutra"), os outros se completam sozinhos.','escola'],
  '3':['Dados da ficha de matrícula impressa para assinatura. Campos marcados "(item 2)" são os mesmos do item 2.','anexar']};
function initSections(){document.querySelectorAll('.grid section.card').forEach(sec=>{const st=sec.querySelector(':scope>h2 .step');if(!st)return;
  const n=st.textContent.trim();sec.dataset.sec=n;const h=sec.querySelector('h2')||sec.querySelector('summary');if(!h||h.querySelector('.help-btn'))return;
  const hb=document.createElement('button');hb.type='button';hb.className='help-btn';hb.textContent='?';hb.setAttribute('aria-label','Ajuda sobre esta etapa');hb.dataset.help=n;h.appendChild(hb);
  if(sec.querySelector('h2')&&n!=='1'){sec.classList.add('sec');const bd=document.createElement('span');bd.className='sec-badge';h.appendChild(bd);h.classList.add('sec-h');const tg=document.createElement('button');tg.type='button';tg.className='sec-tg';tg.setAttribute('aria-expanded','true');tg.setAttribute('aria-label','Abrir ou fechar: '+h.textContent.replace(/[?✓]/g,'').trim());tg.textContent='▾';h.appendChild(tg)}})}
function secBadges(per){document.querySelectorAll('.sec').forEach(sec=>{const n=sec.dataset.sec;const b=sec.querySelector('.sec-badge');if(!b)return;const k=per[n]||0;
  if(n==='6'){const falta=!sig.sec.nome||!sig.dir.nome||!sig.sec.mat||!sig.dir.mat;b.className='sec-badge '+(falta?'w':'o');b.hidden=false;b.textContent=falta?'falta quem assina':'✓ '+(esc.curto||esc.nome||'escola');const q=document.getElementById('esc-q');if(q)q.innerHTML=`É para o <b>${esc_(esc.curto||esc.nome||'')}</b>? Se o histórico for emitido por outra escola, mude os dados abaixo.`;sec.querySelector('.sec-tg').setAttribute('aria-expanded',String(!sec.classList.contains('collapsed')));return}
  b.className='sec-badge '+(isPristine()?'':k?'w':'o');b.textContent=isPristine()?'':k?`${k} para conferir`:'✓ conferido';b.hidden=isPristine();
  sec.querySelector('.sec-tg').setAttribute('aria-expanded',String(!sec.classList.contains('collapsed')))})}
function autoCollapse(){if(isPristine())return;const per={};for(const li of document.querySelectorAll('#checks [data-go]')){const s=SEC_OF(li.dataset.go);if(s)per[s]=(per[s]||0)+1}
  document.querySelectorAll('.sec').forEach(sec=>{sec.classList.add('collapsed');const h=sec.querySelector('.sec-tg');if(h)h.setAttribute('aria-expanded',String(!sec.classList.contains('collapsed')))})}
document.addEventListener('click',e=>{const hb=e.target.closest('.help-btn');if(hb){e.preventDefault();e.stopPropagation();const sec=hb.closest('section');let box=sec.querySelector('.helpbox');
    if(box){box.remove();return}const [t,a]=HELP[hb.dataset.help]||['',''];box=document.createElement('div');box.className='helpbox';box.innerHTML=`${esc_(t)} <a href="tutorial.html#${a}" target="_blank">Ver no tutorial</a>`;(sec.querySelector('.sec-h')||hb.parentNode).after(box);return}
  const tgb=e.target.closest('.sec-tg');const h=e.target.closest('.sec-h');if(h&&(tgb||!e.target.closest('button,a,input'))){const sec=h.closest('.sec');sec.classList.toggle('collapsed');(h.querySelector('.sec-tg')||h).setAttribute('aria-expanded',String(!sec.classList.contains('collapsed')))}});
/* ---------- lista de arquivos compacta ---------- */
function fileSummary(f){if(f.dup)return 'Arquivo repetido';if(f.err)return 'Não foi lido';if(f.fund)return 'Ensino fundamental (ignorado)';
  const ds=(f.src&&f.src.docs)||[];if(!ds.length)return f.ok?String(f.status||'').split(' | ')[0].split(' · ')[0]:'Lendo…';
  return ds.map(d=>d.role==='fia'?`FIA · ${d.p!=null?LABELS[state.mode][d.p]:''}${d.ano?' · '+d.ano:''}`:d.role==='arf'?`Ata · ${d.ano||''}`:d.role==='dep'?`Ficha de dependência${d.ano?' · '+d.ano:''}`:ROLE_LBL[d.role]).join(' | ')}
function renderFiles(){
  $('#files').innerHTML=files.map((f,i)=>{const chips=[f.dup?'<span class="chip w">repetido</span>':'',f.err?'<span class="chip b">erro</span>':'',f.ocr&&f.ok?'<span class="chip w">digitalização</span>':'',f.ai?'<span class="chip w">lido com IA</span>':'',f.ok&&!f.err&&!f.dup&&!f.fund?'<span class="chip o">ok</span>':''].join('');
    return `<li title="${esc_(f.status||'')}"><span class="fname">${esc_(f.name)}</span>
    <span class="fsum">${chips}<span>${esc_(fileSummary(f))}${f.arfDone?' · '+esc_(f.arfDone):''}</span></span><button type="button" class="ib" data-rmfile="${i}" aria-label="Remover ${esc_(f.name)} da lista">✕</button>
    ${f.err||f.dup?`<span class="fmeta ferr">${esc_(f.status)}</span>`:''}
    ${f.ocr&&f.ok?'<span class="fmeta fwarn" style="grid-column:1/-1">Foto ou digitalização: pode ter erros de leitura. Se puder, use o PDF original do Conexão.</span>':''}
    ${(f.diff||[]).length?`<div class="fmeta" style="grid-column:1/-1;display:flex;flex-direction:column;gap:6px">${f.diff.map((d,j)=>`<div class="row" style="gap:6px 10px"><span class="chip w">diferente</span><span><b>${esc_(FIELD_LABEL[d.k])}</b>: na tela “${esc_(d.cur)}”, neste arquivo “${esc_(d.v)}”</span><button type="button" class="btn small" data-usediff="${i},${j}">Usar deste arquivo</button></div>`).join('')}</div>`:''}
    ${f.arf&&!f.arfDone?`<span class="fmeta" style="grid-column:1/-1">${state.aluno.nome&&!state.example?'Não encontrei '+esc_(state.aluno.nome)+' nesta ata. Escolha o aluno:':'Anexe a FIA ou a ficha de matrícula para o aluno ser identificado sozinho, ou escolha:'}</span><label class="f" style="grid-column:1/-1">Aluno desta ata<select id="arf-${i}" data-arf="${i}"><option value="">Escolha o aluno…</option>${f.arf.students.map((s,j)=>`<option value="${j}">${esc_(s.nome)}</option>`).join('')}</select></label>`:''}
</li>`}).join('');$('#files').classList.add('compact');
  {const fb=document.getElementById('files-box');if(fb){const prob=files.filter(f=>f.err||f.dup||(f.diff||[]).length||(f.arf&&!f.arfDone)).length;const ocr=files.filter(f=>f.ocr&&f.ok).length;
    fb.hidden=!files.length;fb.querySelector('summary').innerHTML=`Arquivos lidos (${files.length})${prob?` · <span class="tm-b">${prob} precisa(m) de atenção</span>`:''}${ocr?` · <span class="tm-w">${ocr} digitalização(ões)</span>`:''}${!prob&&!ocr&&files.length?' · <span class="dc-oktxt">todos ok</span>':''}`;if(prob)fb.open=true}}
  renderDocCheck()}
/* ---------- dependências: "ficou em" e "cumpriu em" ---------- */
function depPeriod(d){if(d.p!=null&&state.periods[d.p])return d.p;if(d.auto!=null&&state.periods[d.auto])return d.auto;try{return periodOfDep(d)}catch(e){return null}}
function renderDeps(){
  const L=LABELS[state.mode];const subjOpts=state.subjects.map(s=>`<option value="${esc_(s.name)}">`).join('');
  const perOpts=sel=>'<option value="">—</option>'+state.periods.map((p,i)=>`<option value="${i}"${sel===i?' selected':''}>${esc_(L[i])}${p.ano?' · '+esc_(p.ano):''}</option>`).join('');
  const regra=regraAnoDep();
  $('#deps').innerHTML=(state.deps.length?`<label class="dep-regra">Ano que sai na observação: <select id="dep-regra"><option value="ficou"${regra==='ficou'?' selected':''}>ano em que o aluno ficou em dependência</option><option value="cumpriu"${regra==='cumpriu'?' selected':''}>ano em que cumpriu a dependência</option></select></label>`:'')+(state.deps.length?`<div class="dep-row dep-head"><span>Ficou em dependência</span><span class="dep-ano-h">⚠ Ano</span><span>Disciplina</span><span>Nota final</span><span>Não cumpriu</span><span></span></div>`:'<p class="hint" style="margin:0">Nenhuma dependência. As linhas de observação não aparecem no histórico.</p>')+
    state.deps.map((d,i)=>`<div class="dep-row"><select id="dp-${i}" data-dp="${i}" aria-label="Série ou módulo em que ficou em dependência">${perOpts(depPeriod(d))}</select><input id="da-${i}" data-da="${i}" value="${esc_(d.ano)}" placeholder="ano" inputmode="numeric" aria-label="Ano em que a dependência foi cumprida" class="${d.ano?'':'empty'}"><input id="dd-${i}" data-dd="${i}" value="${esc_(d.disc)}" list="subj-list" placeholder="disciplina" aria-label="Disciplina" class="${d.disc?'':'empty'}"><input id="dn-${i}" data-dn="${i}" value="${esc_(d.pendente?'':d.nota)}" placeholder="${d.pendente?'—':'(preencher)'}" aria-label="Nota final" class="${d.nota||d.pendente?'':'empty'}" inputmode="decimal"${d.pendente?' disabled':''}><label class="dep-pend" title="Marque se o aluno não fez a dependência: a observação passa a dizer que ele deve a dependência"><input type="checkbox" data-dpend="${i}"${d.pendente?' checked':''}> não cumpriu</label><button type="button" class="ib" data-rmdep="${i}" aria-label="Remover dependência">✕</button></div>`).join('')+
    `<datalist id="subj-list">${subjOpts}</datalist>`}
document.addEventListener('change',e=>{const t=e.target;if(t.id==='dep-regra'){try{localStorage.setItem('hist.depano',t.value)}catch(_){}for(const d of state.deps)delete d.anoManual;aplicarAnoDep();renderDeps();schedulePreview();renderChecks();return}if(t.dataset&&t.dataset.dpend!=null){const d=state.deps[+t.dataset.dpend];d.pendente=t.checked;d.edited=1;renderDeps();schedulePreview();renderChecks();return}if(t.dataset&&t.dataset.dp!=null){const d=state.deps[+t.dataset.dp];d.p=t.value===''?null:+t.value;d.edited=1;aplicarAnoDep();renderDeps();schedulePreview();renderChecks()}});
/* ---------- leitura com IA: sempre começa desligada e pede autorização ---------- */
let AI_OK=false;
{const _r=readWithAI;readWithAI=async function(c){if(!AI_OK){const ok=await askModal('<h3>Enviar este documento para a IA?</h3><p>Com "Ler com IA" ligado, a imagem do documento (com dados pessoais do aluno) é enviada à Anthropic para ser lida. Sem isso, a leitura é feita só neste computador.</p>',[{label:'Não enviar',value:false},{label:'Enviar e ler com IA',value:true,primary:true}],{sticky:true});
    if(!ok)throw new Error('Leitura com IA cancelada. Para ler sem enviar, escolha "Ler no computador (OCR)".');AI_OK=true}return _r(c)}}
/* ---------- ao terminar: oferecer limpar ---------- */
function finishPrompt(what){if(typeof TURMA!=='undefined'&&TURMA&&TURMA.on){tmFinishPrompt(what);return}
  let t=document.getElementById('finish-toast');if(t)t.remove();t=document.createElement('div');t.id='finish-toast';t.className='toast';t.setAttribute('role','status');
  t.innerHTML=`<span><b>${esc_(what)}</b> Terminou este aluno? Os dados ficam guardados neste computador até você limpar.</span><span class="row"><button type="button" class="btn small primary" id="ft-clear">Limpar dados do aluno</button><button type="button" class="btn small" id="ft-keep">Ainda não</button></span>`;
  document.body.appendChild(t);$('#ft-keep').onclick=()=>t.remove();$('#ft-clear').onclick=()=>{t.remove();const ok=resetAll();setStatus(ok?'Dados apagados. Pronto para o próximo aluno.':'Atenção: algo não foi limpo. Recarregue a página (F5).',!ok);window.scrollTo({top:0,behavior:'smooth'})};
  clearTimeout(finishPrompt._t);finishPrompt._t=setTimeout(()=>{if(t.isConnected)t.remove()},30000)}
{const _d=download;download=async function(kind){await _d(kind);if(!/não foi|cancelad/i.test($('#status').textContent))logEmissao(kind==='pdf'?'Histórico (PDF)':'Histórico (Excel)');if(!/não foi|cancelad/i.test($('#status').textContent))finishPrompt(kind==='pdf'?'PDF gerado.':'Excel gerado.')}}
{const _p=printHistorico;printHistorico=async function(){await _p.apply(this,arguments);logEmissao('Histórico (impressão)');finishPrompt('Histórico enviado para impressão.')}}
{const _pp=printPack;printPack=async function(mode){const r=await _pp(mode);if(/página\(s\)/.test($('#status').textContent))logEmissao('Documentos para assinatura');if(/página\(s\)/.test($('#status').textContent))finishPrompt('Documentos para assinatura prontos.');return r}}
/* ---------- depois de cada lote de arquivos: recolher o que está conferido ---------- */
{const _hf=handleFiles;handleFiles=async function(list){AI_OK=false;const r=await _hf(list);try{aplicarAnoDep();renderDeps();schedulePreview();renderChecks();autoCollapse()}catch(e){}return r}}
window.addEventListener('error',e=>{try{setStatus('Algo deu errado na página. Se o problema continuar, recarregue (F5): o trabalho fica guardado. (detalhe: '+(e.message||'')+')',true)}catch(_){}});
/* funciona sem internet (PWA): registra o service worker do site */
function initPwa(){try{if(!('serviceWorker' in navigator)||location.protocol!=='https:'||IN_CLAUDE)return;
  const tinha=!!navigator.serviceWorker.controller;navigator.serviceWorker.register('sw.js').catch(()=>{});
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(tinha)setStatus('Nova versão do site instalada. Recarregue a página (F5) quando terminar o aluno atual.')})}catch(e){}}
function initV2(){initPwa();{const s6=document.getElementById('sig-dir');if(s6&&!document.getElementById('chmin-box')){const h=document.createElement('div');h.innerHTML='<div class="subhead">Conferência da carga horária</div><div id="chmin-box"></div>';s6.after(h)}}setTimeout(logRender,0);if(!IA_PERMITIDA){const r=$('#rm-ia');if(r)r.closest('label').hidden=true;for(const id of ['ia-key','ia-claude'])($('#'+id)||{}).hidden=true;const o=$('#ia-off');if(o)o.hidden=false}
  initSections();document.querySelectorAll('.sec').forEach(s=>s.classList.add('collapsed'));
  {const fl=$('#files');if(fl&&!document.getElementById('files-box')){const d=document.createElement('details');d.id='files-box';d.className='files-box';d.innerHTML='<summary>Arquivos lidos</summary>';fl.parentNode.insertBefore(d,fl);d.appendChild(fl)}}
  {const cv=$('#cv');if(cv){cv.title='Clique para ampliar';cv.style.cursor='zoom-in';cv.tabIndex=0;cv.setAttribute('role','button');cv.setAttribute('aria-label','Ampliar a prévia do histórico');const pv=cv.closest('.preview');const h=pv&&pv.querySelector('.pvsub');if(h)h.textContent='folha A4 · clique para ampliar'}}
  const side=document.querySelector('aside.side');if(side&&!document.getElementById('app-ver')){const p=document.createElement('p');p.id='app-ver';p.className='app-ver';p.innerHTML=`Versão ${APP_VERSION} · ${APP_DATA} · <a href="tutorial.html#novidades" target="_blank">o que mudou</a> · <a href="tutorial.html#privacidade" target="_blank">privacidade</a> · <a href="https://github.com/RFarias321/gerador-historico-beto/issues/new/choose" target="_blank" rel="noopener">relatar problema</a>`;side.appendChild(p)}
  renderChecks()}

/* ---------- prévia do histórico ampliada ---------- */
function bigPreview(){const page=A4.p;const vw=Math.min(window.innerWidth-80,900);let zoom=1;
  const draw=box=>{box.innerHTML='';const w=Math.round(vw*zoom),k=w/page.w,dpr=Math.min(window.devicePixelRatio||1,2);const cv=document.createElement('canvas');cv.width=Math.round(page.w*k*dpr);cv.height=Math.round(page.h*k*dpr);cv.style.width=w+'px';cv.style.height=Math.round(page.h*k)+'px';
    const ctx=cv.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,cv.width,cv.height);ctx.setTransform(k*dpr,0,0,k*dpr,0,0);try{paintSheet(buildSheet(state),canvasPainter(ctx))}catch(e){console.warn(e)}box.appendChild(cv)};
  const bg=document.createElement('div');bg.className='mdl-bg';bg.innerHTML=`<div class="mdl wide" role="dialog" aria-modal="true" aria-label="Prévia do histórico ampliada"><div class="mdl-body big-pv"></div><div class="mdl-foot"><button type="button" class="btn small" data-z="-">− Menor</button><button type="button" class="btn small" data-z="+">+ Maior</button><span style="flex:1"></span><button type="button" class="btn small" data-z="print">Imprimir histórico</button><button type="button" class="btn small primary" data-z="x">Fechar</button></div></div>`;
  document.body.appendChild(bg);const box=bg.querySelector('.big-pv');draw(box);const close=()=>bg.remove();
  bg.addEventListener('click',e=>{const z=e.target.dataset&&e.target.dataset.z;if(e.target===bg||z==='x')return close();if(z==='+'){zoom=Math.min(zoom+.25,2.5);draw(box)}else if(z==='-'){zoom=Math.max(zoom-.25,.5);draw(box)}else if(z==='print'){close();document.getElementById('btn-print').click()}});
  bg.addEventListener('keydown',e=>{if(e.key==='Escape')close()});bg.querySelector('[data-z="x"]').focus()}
document.addEventListener('click',e=>{if(e.target&&e.target.id==='cv')bigPreview()});
document.addEventListener('keydown',e=>{if(e.target&&e.target.id==='cv'&&(e.key==='Enter'||e.key===' ')){e.preventDefault();bigPreview()}});

/* ---------- nome da escola: um campo completa os outros ---------- */
const ESC_TIPOS=[['CENTRO ESTADUAL DE EDUCAÇÃO DE JOVENS E ADULTOS','CEEJA'],['CENTRO ESTADUAL DE EDUCAÇÃO DE JOVENS E ADULTOS','CEJA'],['CENTRO INTEGRADO DE EDUCAÇÃO PÚBLICA','CIEP'],['COLÉGIO ESTADUAL INTEGRADO','CEI'],['INSTITUTO DE EDUCAÇÃO','IE'],['ESCOLA TÉCNICA ESTADUAL','ETE'],['COLÉGIO ESTADUAL','CE'],['COLÉGIO MUNICIPAL','CM'],['COLÉGIO FEDERAL','CF'],['ESCOLA ESTADUAL','EE'],['ESCOLA MUNICIPAL','EM'],['ESCOLA TÉCNICA','ET']];
const _nk=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().replace(/[.]/g,'').replace(/\s+/g,' ').trim();
function escParse(v){const k=_nk(v);for(const [full,ab] of ESC_TIPOS){const f=_nk(full);if(k.startsWith(f+' ')){return {full,ab,nome:String(v).trim().split(/\s+/).slice(full.split(' ').length).join(' ')}}}
  for(const [full,ab] of ESC_TIPOS){if(k.startsWith(ab+' ')){const raw=String(v).trim().replace(/^[A-Za-z.]+\s+/,'');return {full,ab,nome:raw}}}return null}
const _tc=s=>titleCase(String(s||'').toUpperCase());
document.addEventListener('input',e=>{const t=e.target,d=t.dataset||{};const src=d.es==='nome'||d.es==='curto'?'es-'+d.es:(d.sg&&/,escola$/.test(d.sg)?'sg-'+d.sg:null);if(!src)return;
  const p=escParse(t.value);if(!p||!p.nome.trim())return;const nm=p.nome.trim();
  const novo={nome:p.full+' '+nm.toUpperCase(),curto:p.ab+' '+nm.toUpperCase(),unid:_tc(p.full)+' '+_tc(nm)};
  const old=Object.assign({},esc);
  if(src!=='es-nome'){esc.nome=novo.nome;const i=$('#es-nome');if(i)i.value=novo.nome}
  if(src!=='es-curto'){esc.curto=novo.curto;const i=$('#es-curto');if(i)i.value=novo.curto}
  if(old.curto!==esc.curto)state.periods.forEach(P=>{if(P.escola===old.curto)P.escola=esc.curto});
  store.set('hist.esc',esc);
  for(const w of ['sec','dir']){if(src==='sg-'+w+',escola')continue;sig[w]=Object.assign({},sig[w],{escola:novo.unid});const i=document.querySelector(`[data-sg="${w},escola"]`);if(i)i.value=novo.unid}
  store.set('hist.sig',sig);try{renderPlaces()}catch(_){}schedulePreview();renderChecks()});
document.addEventListener('click',e=>{if(e.target&&e.target.id==='esc-reset'){setTimeout(()=>{for(const w of ['sec','dir'])sig[w]=Object.assign({},sig[w],{escola:DEFAULT_SIG[w].escola});store.set('hist.sig',sig);renderSig();renderChecks();schedulePreview()},0)}});
document.addEventListener('input',e=>{if(e.target.dataset&&e.target.dataset.sg!=null)renderChecks()});

/* ---------- registro de emissões (opcional, só neste navegador) ---------- */
const LOG_KEY='hist.registro',LOG_ON='hist.registro.on';
function logLer(){try{const a=JSON.parse(localStorage.getItem(LOG_KEY)||'[]');const lim=Date.now()-365*864e5;return a.filter(x=>x.t>=lim)}catch(e){return []}}
function logGravar(a){try{localStorage.setItem(LOG_KEY,JSON.stringify(a.slice(-2000)))}catch(e){}}
function logAtivo(){try{return localStorage.getItem(LOG_ON)==='1'}catch(e){return false}}
function logEmissao(tipo){if(!logAtivo()||isPristine())return;const a=logLer();a.push({t:Date.now(),aluno:state.aluno.nome||'',matricula:state.aluno.matricula||'',ensino:state.mode==='eja'?'EJA':'Regular',tipo,escola:esc.curto||''});logGravar(a);logRender()}
function logRender(){const on=logAtivo(),a=logLer();const c=$('#log-on');if(c)c.checked=on;const i=$('#log-info');if(i)i.textContent=on?`${a.length} emissão(ões) registrada(s) neste computador.`:(a.length?`Registro desligado (${a.length} antiga(s) guardada(s)).`:'Registro desligado.');
  for(const id of ['log-csv','log-clear']){const b=$('#'+id);if(b)b.disabled=!a.length}}
document.addEventListener('change',e=>{if(e.target&&e.target.id==='log-on'){try{localStorage.setItem(LOG_ON,e.target.checked?'1':'0')}catch(_){}logRender()}});
document.addEventListener('click',async e=>{const id=e.target&&e.target.id;
  if(id==='log-csv'){const a=logLer();const q=v=>'"'+String(v).replace(/"/g,'""')+'"';const lin=[['Data','Hora','Aluno','Matrícula','Ensino','Documento','Escola'].map(q).join(';')].concat(a.map(x=>{const d=new Date(x.t);return [d.toLocaleDateString('pt-BR'),d.toLocaleTimeString('pt-BR'),x.aluno,x.matricula,x.ensino,x.tipo,x.escola].map(q).join(';')}));
    await saveBlob(`Registro_emissoes_${new Date().toISOString().slice(0,10)}.csv`,new Blob(['\ufeff'+lin.join('\r\n')],{type:'text/csv'}));setStatus('Registro baixado. Ele tem dados pessoais: guarde em local seguro.')}
  if(id==='log-clear'){const ok=await askModal('<h3>Apagar o registro de emissões?</h3><p>Todas as linhas guardadas neste computador serão apagadas.</p>',[{label:'Cancelar',value:false},{label:'Apagar',value:true,primary:true}]);if(ok){logGravar([]);logRender();setStatus('Registro apagado.')}}});

/* ---------- FIA x ata: notas e situação do mesmo ano devem bater ---------- */
function conferirFiaAta(){const out=[];const A=state.ataNotas||{};const L=LABELS[state.mode];const docs=docList(files);
  for(const [pk,at] of Object.entries(A)){const p=+pk;if(!state.periods[p])continue;if(!docs.some(x=>x.d.role==='fia'&&x.d.p===p))continue;
    const dif=[];for(const n of at.notas||[]){const v=typeof n.nota==='number'?n.nota:num(n.nota);if(v==null)continue;const s=state.subjects.find(q=>canon(q.name).key===canon(n.disc).key);if(!s)continue;const f=num((s.g[p]||{}).nota);
      if(f!=null&&Math.abs(f-v)>0.051)dif.push(`${s.name} (FIA ${fmtIn(f)} · ata ${fmtIn(v)})`)}
    const P=state.periods[p];const sitDif=at.sit&&P.sit&&at.sit!==P.sit&&!(at.sit==='APROVADO'&&P.sit==='PROMOV');
    if(dif.length||sitDif)out.push(`${L[p]}${P.ano?' · '+P.ano:''}: a FIA e a ata de resultados não batem${dif.length?' em '+dif.slice(0,4).join(', ')+(dif.length>4?` e mais ${dif.length-4}`:''):''}${sitDif?`${dif.length?'; ':' na '}situação (FIA ${P.sit} · ata ${at.sit})`:''}. Confira no Conexão qual está certo.`)}
  return out}
/* ---------- carga horária mínima do curso ---------- */
const CH_PADRAO={reg:2400,eja:1200};
function chMinimo(){try{const v=+localStorage.getItem('hist.chmin.'+state.mode);return v>0?v:CH_PADRAO[state.mode]}catch(e){return CH_PADRAO[state.mode]}}
function chTotalCurso(){let total=0;for(const s of state.subjects)for(const g of s.g){const c=num(g.ch);if(c!=null)total+=c}
  const completo=state.periods.every((p,i)=>periodHasData(i));return {total,completo}}
function renderChMin(){const box=document.getElementById('chmin-box');if(!box)return;const t=chTotalCurso();
  box.innerHTML=`<label class="f">Carga horária mínima do curso — ${state.mode==='eja'?'EJA':'Regular'} (horas)<input id="chmin" inputmode="numeric" value="${chMinimo()}"></label><p class="hint" style="margin:4px 0 0">Usada só para conferência: o site avisa se a soma do histórico ficar abaixo. Total deste histórico: <b>${t.total} h</b>. Confira o valor com a norma da SEEDUC para o curso.</p>`}
document.addEventListener('input',e=>{if(e.target&&e.target.id==='chmin'){const v=+e.target.value;try{if(v>0)localStorage.setItem('hist.chmin.'+state.mode,String(v))}catch(_){}renderChecks()}});

/* ---------- escola pelo código do Censo Escolar (tabela pública do INEP, sem internet) ---------- */
let _escMap=null;
function escolaPorCenso(c){c=String(c||'').replace(/\D/g,'');if(c.length!==8||typeof ESCOLAS_RJ!=='string')return null;
  if(!_escMap){_escMap=new Map();for(const l of ESCOLAS_RJ.split('\n')){const f=l.split('|');_escMap.set(f[0],f)}}
  const f=_escMap.get(c);if(!f)return null;const [censo,curto,endereco,bairro,cep,municipio]=f;const p=escParse(curto);
  return {censo,curto,nome:p?p.full+' '+p.nome.toUpperCase():curto,unid:p?_tc(p.full)+' '+_tc(p.nome):_tc(curto),endereco,bairro,cep,municipio,uf:'RJ'}}
/* preenche o item 6 com a escola do censo; decreto, D.O. e U.A. não estão no censo e ficam em branco para preencher */
function aplicarEscola(e){const old=Object.assign({},esc);const mesma=_nk(old.curto)===_nk(e.curto);
  esc=Object.assign({},esc,{nome:e.nome,curto:e.curto,endereco:e.endereco,municipio:e.municipio,uf:e.uf,cep:e.cep,censo:e.censo});
  if(mesma){for(const k of ['nome','endereco'])esc[k]=old[k]||esc[k]}else{esc.decreto='';esc.do='';esc.ua=''}
  state.periods.forEach(P=>{if(P.escola===old.curto)P.escola=esc.curto;if(P.municipio===`${old.municipio}/${old.uf}`)P.municipio=`${esc.municipio}/${esc.uf}`});
  if(old.municipio&&state.dataLocal&&state.dataLocal.startsWith(titleCase(old.municipio)+','))state.dataLocal=state.dataLocal.replace(titleCase(old.municipio),titleCase(esc.municipio));
  store.set('hist.esc',esc);if(!mesma){for(const w of ['sec','dir'])sig[w]=Object.assign({},sig[w],{escola:e.unid});store.set('hist.sig',sig)}
  const foco=document.activeElement&&document.activeElement.id;renderSig();if(foco){const f=document.getElementById(foco);if(f)f.focus()}try{renderPlaces()}catch(_){}{const d=$('#dataLocal');if(d)d.value=state.dataLocal}
  const n=$('#esc-censo-nota');if(n){n.hidden=false;n.textContent=mesma?`Censo ${e.censo}: ${e.curto}.`:`Censo ${e.censo}: ${e.curto} (${e.bairro}, ${titleCase(e.municipio)}). Nome, endereço, município e CEP vieram do Censo Escolar ${ESCOLAS_RJ_ANO} do INEP, sem acentos: confira. Preencha decreto, D.O. e U.A.`}
  schedulePreview();renderChecks()}
document.addEventListener('input',e=>{const t=e.target;if(!t||t.id!=='es-censo')return;const c=t.value.replace(/\D/g,'');const n=$('#esc-censo-nota');
  if(c.length<8){if(n)n.hidden=true;return}const x=escolaPorCenso(c);
  if(!x){if(n){n.hidden=false;n.textContent=`O censo ${c} não está na lista das escolas estaduais do RJ (INEP ${ESCOLAS_RJ_ANO}). Preencha os dados à mão.`}return}
  /* o campo já gravou o número em esc.censo; troca quando a escola do número for outra */
  if(_nk(esc.curto)!==_nk(x.curto)||!esc.nome)aplicarEscola(x)});
/* escola da FIA do último ano diferente da escola do item 6 */
function escolaDaFicha(){let b=null;state.periods.forEach((P,i)=>{if(P.censo&&periodHasData(i)&&(!b||(+P.ano||0)>=(+b.ano||0)))b=P});return b}
document.addEventListener('click',e=>{if(e.target&&e.target.id==='esc-usar-ficha'){const P=escolaDaFicha();const x=P&&escolaPorCenso(P.censo);if(x)aplicarEscola(x)}});
