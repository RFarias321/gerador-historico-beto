/* Testes automáticos do Gerador de Histórico do Beto.
   Abre a página num navegador sem tela, anexa os documentos fictícios de tests/fixtures
   e confere os resultados com tests/esperado.json.
   Uso: node tests/run.js            (confere)
        node tests/run.js --atualizar (grava o resultado atual como esperado) */
const pw=require('playwright');
async function esperar(pg,fn,arg,opts){const lim=Date.now()+((opts&&opts.timeout)||120000);for(;;){let ok=false;try{ok=await pg.evaluate(fn,arg)}catch(e){}if(ok)return true;if(Date.now()>lim)throw new Error('tempo esgotado esperando a página');await new Promise(r=>setTimeout(r,250))}}const BROWSER=process.env.BROWSER||'chromium';const SMOKE=!!process.env.SMOKE;const fs=require('fs');const path=require('path');
const ROOT=path.resolve(__dirname,'..'),FX=path.join(__dirname,'fixtures');
const NM=process.env.NM||path.join(__dirname,'node_modules');
const CDN={'jszip/3.10.1/jszip.min.js':'jszip/dist/jszip.min.js','jspdf/2.5.1/jspdf.umd.min.js':'jspdf/dist/jspdf.umd.min.js','xlsx/0.18.5/xlsx.full.min.js':'xlsx/dist/xlsx.full.min.js','pdf.js/3.11.174/pdf.min.js':'pdfjs-dist/build/pdf.min.js'};
const fx=n=>path.join(FX,n);
const REG=['FIA_2021.xlsx','FIA_2022.xlsx','FIA_2023.xlsx','ARF_2023.xlsx'].map(fx);
const EJA=['eja_1.xlsx','eja_2.xlsx','eja_3.xlsx','eja_4.xlsx','2023.1_-_EJA_1.xlsx','2023.2_-_EJA_2.xlsx','2024.1_-_EJA_3.xlsx','2024.2_-_EJA_4.xlsx'].map(fx);
const errors=[];
async function newPage(browser,vp){const ctx=await browser.newContext({viewport:vp||{width:1400,height:1000},serviceWorkers:'block'});const pg=await ctx.newPage();
  pg.on('pageerror',e=>errors.push('erro na página: '+e.message));
  pg.on('console',m=>{const t=m.text();if(/Content Security Policy|Refused to (load|execute|connect|create|apply)/i.test(t))errors.push('bloqueio de segurança: '+t.slice(0,160));else if(m.type()==='error'&&/ReferenceError|TypeError|SyntaxError|RangeError/.test(t))errors.push('erro de código: '+t.slice(0,160))});if(process.env.DEBUG)pg.on('console',m=>console.log('console:',m.text()));
  await ctx.route('**/*',async r=>{const u=r.request().url();
    if(u.startsWith('https://cdnjs.cloudflare.com/ajax/libs/')){const k=CDN[u.split('/ajax/libs/')[1]];if(k)return r.fulfill({path:path.join(NM,k),contentType:'application/javascript'})}
    if(u==='https://local/__axe.js')return r.fulfill({path:require.resolve('axe-core/axe.min.js',{paths:[NM,__dirname]}),contentType:'application/javascript'});
    if(u.startsWith('https://local/')){const rel=decodeURIComponent(u.slice(14).split('?')[0])||'index.html';const f=path.join(ROOT,rel);if(!f.startsWith(ROOT)||!fs.existsSync(f))return r.fulfill({status:404,body:''});
      return r.fulfill({path:f,contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.html')?'text/html; charset=utf-8':undefined})}
    if(process.env.DEBUG)console.log('bloqueado:',u);return r.abort()});
  await pg.goto('https://local/');await esperar(pg,()=>window.READY===true||typeof READY!=='undefined'&&READY,null,{timeout:30000});await pg.waitForTimeout(500);return pg}
const idle=pg=>esperar(pg,()=>![...document.querySelectorAll('#files li')].some(e=>/Lendo|lendo…|abrindo/.test(e.textContent))&&!/Turma: lendo/.test(document.querySelector('#status').textContent),null,{timeout:120000});
const facts=pg=>pg.evaluate(async()=>{const pages=await buildPackPages();const blob=makePdf(buildSheet(state));const x=await makeXlsx(buildSheet(state));
  return {modo:state.mode,anos:state.periods.map(p=>p.ano),situacao:state.periods.map(p=>p.sit),disciplinas:state.subjects.length,
    notas:state.subjects.slice(0,6).map(s=>s.name+': '+s.g.map(g=>g.nota).join('/')),
    dependencias:state.deps.map(d=>d.ano+' '+d.disc+' '+d.nota),observacoes:obsLines(state).map(l=>l.text),
    arquivos:files.map(f=>f.dup?'repetido':f.err?'erro':f.arf?'ata:'+(f.arfDone?'aluno encontrado':'sem aluno'):(f.src&&f.src.docs||[]).map(d=>d.role).join('+')),
    paginas:pages.map(p=>p.orient+' '+p.title),pdfOk:blob.size>20000,excelOk:x.size>20000}});
function checarArquivos(){/* modo sem internet: todo arquivo do site precisa estar na lista do sw.js, e todo item da lista precisa existir */
  const sw=fs.readFileSync(path.join(ROOT,'sw.js'),'utf8');const lista=JSON.parse(sw.match(/const ARQUIVOS=(\[.*?\]);/s)[1]);
  const faltam=lista.filter(f=>f!=='./'&&!fs.existsSync(path.join(ROOT,f)));
  const site=['css','js','lib','fontes','ocr','icones','tutorial'].flatMap(d=>fs.readdirSync(path.join(ROOT,d)).map(f=>d+'/'+f)).filter(f=>!/tutorial\.js$/.test(f)||true);
  const foraDaLista=site.filter(f=>!lista.includes(f));JSON.parse(fs.readFileSync(path.join(ROOT,'manifest.webmanifest'),'utf8'));
  return {listaSemArquivo:faltam,arquivoForaDaLista:foraDaLista}}
async function main(){const browser=await pw[BROWSER].launch();const res={arquivosDoSite:checarArquivos()};
  try{
    // 1. Ensino Regular, um aluno
    let pg=await newPage(browser);await pg.setInputFiles('#file',REG);await idle(pg);await pg.waitForTimeout(800);res.regular=await facts(pg);
    res.regularVisual=await thumb(pg);
    if(SMOKE){await browser.close();return finish(res,['regular','errosNaPagina','arquivosDoSite'])}
    // 1b. histórico e Excel gerados: resultado visual e células conferidos com a versão aprovada
    res.excelCelulas=await pg.evaluate(async()=>{const b=await makeXlsx(buildSheet(state));const wb=XLSX.read(await b.arrayBuffer(),{type:'array'});const ws=wb.Sheets[wb.SheetNames[0]];return Object.keys(ws).filter(k=>k[0]!=='!'&&ws[k].v!==''&&ws[k].v!=null).length});
    // 1c. impressão (histórico e documentos para assinatura) sem erro
    res.impressao=await pg.evaluate(async()=>{window.PACK_NO_PREVIEW=true;await printHistorico();const a=document.querySelector('#status').textContent;await printPack('print');const b=document.querySelector('#status').textContent;return [/impress|Imprim/.test(a),/página\(s\)/.test(b)]});
    // 1d. acessibilidade (axe): problemas graves ou críticos
    res.acessibilidade=await axe(pg);
    // 1e. celular: sem rolagem lateral
    {const m=await newPage(browser,{width:390,height:844});await m.setInputFiles('#file',REG);await idle(m);res.celularSemRolagemLateral=await m.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)}
    // 2. EJA com a página em Regular: troca sozinha para EJA
    pg=await newPage(browser);await pg.setInputFiles('#file',EJA);await idle(pg);await pg.waitForTimeout(800);res.eja=await facts(pg);
    res.eja.alertaModelo=await pg.evaluate(()=>!!state.modeAlert);
    const ejaNome=await pg.evaluate(()=>state.aluno.nome);
    // 3. arquivo repetido é recusado
    const copia=path.join(require('os').tmpdir(),'copia_eja_1.xlsx');fs.copyFileSync(fx('eja_1.xlsx'),copia);await pg.setInputFiles('#file',[copia]);await idle(pg);
    res.repetido=await pg.evaluate(()=>files[files.length-1].dup===true);
    // 4. ano da dependência alterado vai para a observação
    await pg.evaluate(()=>{const i=document.querySelector('#da-1');i.value='2025';i.dispatchEvent(new Event('input',{bubbles:true}))});await pg.waitForTimeout(300);
    res.anoDependencia=await pg.evaluate(()=>obsLines(state).map(l=>l.text.slice(0,4)));
    // 5. sair para o tutorial e voltar: o trabalho continua
    await pg.waitForTimeout(2500);const antes=await pg.evaluate(()=>state.aluno.nome+'|'+files.length);
    await pg.goto('https://local/tutorial.html');await pg.goto('https://local/');await pg.waitForTimeout(3000);
    const depois=await pg.evaluate(()=>state.aluno.nome+'|'+files.length);res.sessaoRecuperada=depois===antes;if(!res.sessaoRecuperada)console.log('sessão: antes',antes.replace(/^[^|]+/,'(nome)'),'depois',depois.replace(/^[^|]+/,'(nome)'));
    // 6. turma guiada: atas → escolher alunos → um de cada vez → resumo
    {const t=await newPage(browser);await t.evaluate(()=>document.getElementById('tm-all').click());await t.waitForTimeout(300);
      const ATAS=EJA.filter(f=>/EJA_\d/.test(f));await t.setInputFiles('#file',ATAS);await esperar(t,()=>/Turma: \d+ ata/.test(document.querySelector('#status').textContent),null,{timeout:180000});
      const lista=await t.evaluate(()=>[...document.querySelectorAll('.tm-sel-cb')].length);
      await t.evaluate(nome=>{const card=document.getElementById('turma-card');const cbs=[...document.querySelectorAll('.tm-sel-cb')];let outro=false;for(const c of cbs){const s=card._todos[+c.dataset.i];if(nomeParecido(s.nome,nome))c.checked=true;else if(!outro){c.checked=true;outro=true}}document.querySelector('[data-tm="comecar"]').click()},ejaNome);
      await esperar(t,()=>/na turma/.test(document.querySelector('#status').textContent),null,{timeout:180000});
      const etapa3=await t.evaluate(()=>!!document.querySelector('[data-tm="prox"]')&&TURMA.alunos.length);
      await t.evaluate(nome=>{const w=TURMA.alunos.find(a=>nomeParecido(a.nome,nome));return tmOpen(w.id)},ejaNome);await t.waitForTimeout(500);
      await t.setInputFiles('#file',EJA.filter(f=>/eja_\d/.test(f)));await idle(t);await t.waitForTimeout(800);
      const aluno=await t.evaluate(nome=>{tmSync();const w=TURMA.alunos.find(a=>nomeParecido(a.nome,nome));const s=tmStatus(w);return {arquivos:w.files.length,documentos:s.docs+'/'+s.tot,dependencias:w.state.deps.length}},ejaNome);
      await t.evaluate(()=>document.querySelector('[data-tm="resumo"]').click());await t.waitForTimeout(400);
      const resumo=await t.evaluate(()=>document.querySelectorAll('[data-tmopen]').length);
      res.turma={alunosNasAtas:lista,alunosEscolhidos:etapa3,alunoComFias:aluno,linhasNoResumo:resumo}}
    // 6b. item 5 recolhido com a escola em verde e prévia ampliada
    res.item6SemAssinante=await pg.evaluate(()=>document.querySelector('.sec[data-sec="6"] .sec-badge').textContent);
    await pg.evaluate(()=>{for(const [k,v] of [['sec,nome','Prof. Secretário Teste'],['sec,mat','0000000-1'],['dir,nome','Prof. Diretor Teste'],['dir,mat','0000000-2']]){const i=document.querySelector(`[data-sg="${k}"]`);i.value=v;i.dispatchEvent(new Event('input',{bubbles:true}))}});
    res.item6=await pg.evaluate(()=>{const s=document.querySelector('.sec[data-sec="6"]');return s.classList.contains('collapsed')+' '+s.querySelector('.sec-badge').textContent});
    res.nomeEscola=await pg.evaluate(()=>{const i=document.querySelector('#es-curto');i.value='IE Carmela Dutra';i.dispatchEvent(new Event('input',{bubbles:true}));const r=[esc.nome,sig.sec.escola,sig.dir.escola];document.getElementById('esc-reset').click();return r});
    res.escolaPeloCenso=await pg.evaluate(()=>{const i=document.querySelector('#es-censo');const antes=Object.assign({},esc);i.value='33071969';i.dispatchEvent(new Event('input',{bubbles:true}));
      const r={nome:esc.nome,curto:esc.curto,endereco:esc.endereco,municipio:esc.municipio,cep:esc.cep,decreto:esc.decreto,assinatura:sig.dir.escola,aviso:/U\.A\./.test(document.querySelector('#checks').textContent),
        inexistente:(()=>{const i=document.querySelector('#es-censo');i.value='99999999';i.dispatchEvent(new Event('input',{bubbles:true}));return document.querySelector('#esc-censo-nota').textContent})()};
      document.getElementById('esc-reset').click();return r});
    res.itensFechados=await pg.evaluate(()=>[...document.querySelectorAll('.sec')].map(s=>s.dataset.sec+(s.classList.contains('collapsed')?' fechado':' aberto')));
    res.previaAmpliada=await pg.evaluate(()=>{document.getElementById('cv').click();const ok=!!document.querySelector('.big-pv canvas');document.querySelector('[data-z="x"]').click();return ok});
    // 8. segurança: IA desligada, política de segurança ativa, arquivo salvo com senha
    res.seguranca=await pg.evaluate(async()=>{const lab=document.querySelector('#rm-ia').closest('label');const csp=!!document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      const c=await cifrar('teste de conteúdo','senha-forte-1');let errada=false;try{await decifrar(JSON.parse(c),'outra')}catch(e){errada=true}
      return {iaEscondida:lab.hidden,leitura:readMode(),csp,cifraOk:(await decifrar(JSON.parse(c),'senha-forte-1'))==='teste de conteúdo',senhaErradaRecusada:errada,semTextoAberto:!c.includes('teste de conteúdo')}});
    // 9. arquivo corrompido: mensagem clara, sem quebrar
    pg=await newPage(browser);await pg.setInputFiles('#file',[{name:'quebrado.xlsx',mimeType:'application/octet-stream',buffer:Buffer.from('isto não é uma planilha '.repeat(40))}]);await idle(pg);
    res.arquivoQuebrado=await pg.evaluate(()=>({erro:!!files[0].err,mensagemClara:!/undefined|TypeError/.test(files[0].status)}));
    // 10. ficha de matrícula em PDF (fictícia, gerada aqui) e a mesma ficha como foto (OCR)
    const mat=await pg.evaluate(MATRICULA_FICTICIA);
    pg=await newPage(browser);await pg.setInputFiles('#file',[{name:'Ficha_de_Matricula.pdf',mimeType:'application/pdf',buffer:Buffer.from(mat,'base64')}]);await idle(pg);await pg.waitForTimeout(500);
    res.matriculaPdf=await pg.evaluate(async()=>{const pages=await buildPackPages();return {nome:state.aluno.nome,nascimento:state.aluno.nascimento,mae:state.aluno.mae,identidade:state.aluno.identidade,papel:files[0].src.docs.map(d=>d.role),cpf:(state.mat&&state.mat.vals['DOCUMENTO|CPF'])||'',primeiraPagina:pages[0].title}});
    const png=await pg.evaluate(async(b64)=>{const pdf=await pdfjsLib.getDocument({isEvalSupported:false,data:Uint8Array.from(atob(b64),c=>c.charCodeAt(0))}).promise;const page=await pdf.getPage(1);const vp=page.getViewport({scale:2.2});const c=document.createElement('canvas');c.width=vp.width;c.height=vp.height;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);await page.render({canvasContext:x,viewport:vp}).promise;return c.toDataURL('image/png').split(',')[1]},mat);
    pg=await newPage(browser);await pg.setInputFiles('#file',[{name:'foto_matricula.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')}]);
    await esperar(pg,()=>files[0]&&!/lendo|Lendo|abrindo|lendo…/.test(files[0].status||'Lendo'),null,{timeout:240000}).catch(()=>{});
    res.matriculaFoto=await pg.evaluate(()=>({lidaPorOcr:!!files[0].ocr,nomeParecido:/FICT[IÍ]CIA/.test(state.aluno.nome||'')&&/TESTE/.test(state.aluno.nome||''),nascimento:state.aluno.nascimento}));
    // 7b. dependência cumprida anos depois, numa aba curta (ex.: QUÍMICA I sozinha em 2021): não pode virar módulo nem apagar o de 2017
    {const d=await newPage(browser);await d.click('#mode-eja');
      await d.setInputFiles('#file',['dep_fia2021_a.xlsx','dep_fia2021_b.xlsx','dep_fia2017_2S.xlsx','dep_fia2017_1S.xlsx'].map(fx));await idle(d);await d.waitForTimeout(800);
      res.dependenciaEmAbaCurta=await d.evaluate(async()=>{const pages=await buildPackPages();return {anos:state.periods.map(p=>p.ano),dependencias:state.deps.map(x=>x.ano+' '+x.disc+' '+x.nota),obs:obsLines(state).map(l=>l.text),paginasDeDependencia:pages.filter(p=>/Depend/.test(p.title)).map(p=>p.title)}});
      await d.evaluate(()=>{const c=document.querySelector('[data-dpend="0"]');c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}))});await d.waitForTimeout(300);
      res.dependenciaNaoCumprida=await d.evaluate(async()=>{const pages=await buildPackPages();return {obs:obsLines(state).map(l=>l.text),paginasDeDependencia:pages.filter(p=>/Depend/.test(p.title)).map(p=>p.title)}})}
    // 7c. troca automática de modelo: EJA→Regular com um aluno, e nos dois sentidos na turma
    {const m=await newPage(browser);await m.click('#mode-eja');await m.setInputFiles('#file',REG);await idle(m);await m.waitForTimeout(500);
      const um=await m.evaluate(()=>state.mode+(state.modeAlert?' com aviso':' sem aviso'));
      const t1=await newPage(browser);await t1.evaluate(()=>document.getElementById('tm-all').click());await t1.setInputFiles('#file',EJA.filter(f=>/EJA_\d/.test(f)));await esperar(t1,()=>/Turma: \d+ ata/.test(document.querySelector('#status').textContent),null,{timeout:180000});
      const tEja=await t1.evaluate(()=>TURMA.mode+'/'+state.mode+(state.modeAlert?' com aviso':' sem aviso'));
      const t2=await newPage(browser);await t2.click('#mode-eja');await t2.evaluate(()=>document.getElementById('tm-all').click());await t2.setInputFiles('#file',[fx('ARF_2023.xlsx')]);await esperar(t2,()=>/Turma: \d+ ata/.test(document.querySelector('#status').textContent),null,{timeout:180000});
      const tReg=await t2.evaluate(()=>TURMA.mode+'/'+state.mode+(state.modeAlert?' com aviso':' sem aviso'));
      // aluno com fichas dos dois tipos: vale o tipo do último ano (regular 2021, depois EJA 2023-2024 → EJA; e o contrário)
      const misto=async(arqs)=>{const x=await newPage(browser);await x.evaluate(()=>{window.outroAluno=()=>false});
        for(const a of arqs){await x.setInputFiles('#file',[fx(a)]);await idle(x);await x.waitForTimeout(300)}
        return x.evaluate(()=>state.mode+' | '+state.periods.map(p=>p.ano||'-').join(','))};
      const regDepoisEja=await misto(['FIA_2021.xlsx','eja_2.xlsx','eja_3.xlsx','eja_4.xlsx']);
      const ejaDepoisReg=await misto(['eja_1.xlsx','FIA_2022.xlsx','FIA_2023.xlsx']);
      res.escolaDaFicha=await (async()=>{const x=await newPage(browser);await x.evaluate(()=>{window.outroAluno=()=>false});for(const a of ['FIA_2021.xlsx','FIA_2022.xlsx']){await x.setInputFiles('#file',[fx(a)]);await idle(x);await x.waitForTimeout(300)}
        const aviso=await x.evaluate(()=>/FIA do último ano é da escola/.test(document.querySelector('#checks').textContent));
        await x.evaluate(()=>document.getElementById('esc-usar-ficha').click());await x.waitForTimeout(300);
        return x.evaluate(a=>{const r={aviso:a,escola:esc.curto,censo:esc.censo,avisoDepois:/FIA do último ano é da escola/.test(document.querySelector('#checks').textContent)};document.getElementById('esc-reset').click();return r},aviso)})();
      res.tipoDoUltimoAno={regularDepoisEja:regDepoisEja,ejaPrimeiroDepoisRegular:ejaDepoisReg};
      res.trocaDeModelo={umAlunoEjaParaRegular:um,turmaRegularParaEja:tEja,turmaEjaParaRegular:tReg}}
    // 7d. observações: amparo lido da ficha, amparo da ficha de dependência e regra do ano
    {const d=await newPage(browser);await d.click('#mode-eja');await d.setInputFiles('#file',['dep_fia2017_1S.xlsx','dep_fia2017_2S.xlsx','dep_fia2021_a.xlsx','dep_fia2021_b.xlsx'].map(fx));await idle(d);await d.waitForTimeout(800);
      const ficou=await d.evaluate(()=>obsLines(state).map(l=>l.text));
      await d.evaluate(()=>{const s=document.querySelector('#dep-regra');s.value='cumpriu';s.dispatchEvent(new Event('change',{bubbles:true}))});await d.waitForTimeout(300);
      const cumpriu=await d.evaluate(()=>obsLines(state).map(l=>l.text));await d.evaluate(()=>{try{localStorage.removeItem('hist.depano')}catch(e){}});
      res.observacoesAmparo={ficou,cumpriu}}
    // 7e. FIA x ata e carga horária mínima
    {const c=await newPage(browser);await c.setInputFiles('#file',REG);await idle(c);await c.waitForTimeout(500);
      res.fiaAta=await c.evaluate(()=>{const antes=conferirFiaAta().length;const s=state.subjects.find(x=>/BIOLOGIA/.test(N(x.name)));s.g[2].nota='5,00';const depois=conferirFiaAta();return {antes,depois:depois.length,aviso:/BIOLOGIA/.test(depois[0]||'')}});
      res.chMinima=await c.evaluate(()=>{const t=chTotalCurso();try{localStorage.setItem('hist.chmin.reg','5000')}catch(e){}renderChecks();const av=[...document.querySelectorAll('#checks li')].some(l=>/abaixo do mínimo/.test(l.textContent));try{localStorage.removeItem('hist.chmin.reg')}catch(e){}return {total:t.total,padrao:CH_PADRAO.reg,avisaQuandoAbaixo:av}})}
    // 7f. caso para suporte: sem nenhum nome/matrícula do aluno ou dos colegas
    {const c=await newPage(browser);await c.click('#mode-eja');await c.setInputFiles('#file',EJA);await idle(c);await c.waitForTimeout(500);
      res.casoSuporte=await c.evaluate(async()=>{let blob=null;window.saveBlob=async(fn,b)=>{blob=b};const sec=_segredos();await casoSuporte();if(!blob)return 'não gerou';
        const z=await JSZip.loadAsync(blob);let txt='';for(const n of Object.keys(z.files))if(/\.xlsx$/.test(n)){const x=await JSZip.loadAsync(await z.files[n].async('uint8array'));for(const m of Object.keys(x.files))if(/\.xml$/.test(m))txt+=await x.files[m].async('string')}
        const T=_nn(txt);return {planilhas:Object.keys(z.files).filter(n=>/\.xlsx$/.test(n)).length,nomesProcurados:sec.nomes.length,nomesQueSobraram:sec.nomes.filter(n=>T.includes(_nn(n))).length,matriculasQueSobraram:sec.nums.filter(n=>txt.includes(n)).length}})}
    // 7g. histórico de outra escola (Excel e PDF), com médias, junto com a FIA da 3ª série
    for(const tipo of ['xlsx','pdf']){const o=await newPage(browser);
      const b64=await o.evaluate(tipo=>{const A=[['COLÉGIO ESTADUAL FICTÍCIO DE TESTE'],['HISTÓRICO ESCOLAR — ENSINO MÉDIO'],[],['COMPONENTES CURRICULARES','1ª SÉRIE','','2ª SÉRIE',''],['','2019','','2020',''],['','MÉDIA','C.H.','MÉDIA','C.H.'],
        ['LÍNGUA PORTUGUESA',7.5,160,8,160],['MATEMÁTICA',6,160,7.25,160],['HISTÓRIA',8,80,6.5,80],['GEOGRAFIA',7,80,7,80],['QUÍMICA','','',6,80],['TOTAL','',560,'',560],['SITUAÇÃO','APROVADO','','APROVADO','']];
        if(tipo==='xlsx'){const ws=XLSX.utils.aoa_to_sheet(A);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'H');return XLSX.write(wb,{type:'base64',bookType:'xlsx'})}
        const doc=new jspdf.jsPDF({unit:'pt',format:'a4'});doc.setFont('helvetica','normal');doc.setFontSize(9);const X=[40,250,320,400,470];let y=60;
        for(const l of A){l.forEach((v,j)=>{if(v===''||v==null)return;const t=String(typeof v==='number'?String(v).replace('.',','):v);const x=(j===1||j===3)&&/SÉRIE/.test(t)?X[j]+30:X[j];doc.text(t,x,y,j&&!/SÉRIE/.test(t)?{align:'left'}:{})});y+=14}
        return doc.output('datauristring').split(',')[1]},tipo);
      await o.setInputFiles('#file',[{name:'historico_outra.'+tipo,mimeType:tipo==='pdf'?'application/pdf':'application/octet-stream',buffer:Buffer.from(b64,'base64')},{name:'FIA_2023.xlsx',mimeType:'application/octet-stream',buffer:fs.readFileSync(fx('FIA_2023.xlsx'))}]);await idle(o);await o.waitForTimeout(600);
      res['historicoOutraEscola_'+tipo]=await o.evaluate(()=>({anos:state.periods.map(p=>p.ano),situacao:state.periods.map(p=>p.sit),escolas:state.periods.map(p=>p.escola),notas:state.subjects.filter(s=>/PORTUG|QUIM/.test(N(s.name))).map(s=>s.name+': '+s.g.map(g=>g.nota+'/'+g.ch).join(' | '))}))}
    // 7. regra de aprovação (soma mínima)
    res.notaDependencia=await pg.evaluate(()=>{const keep=JSON.stringify(state);state.deps=[{ano:'2024',disc:'MATEMÁTICA',nota:''}];
      applyDepResults([{name:'MATEMÁTICA',n1:1,n2:4,n3:6,media:3.67}],2025);const a=state.deps[0].nota;
      applyDepResults([{name:'MATEMÁTICA',n1:5,n2:5,media:5}],2025);const b=state.deps[0].nota;
      applyDepResults([{name:'MATEMÁTICA',n1:7,n2:0.3,media:3.65}],2025);const c=state.deps[0].nota;
      state=JSON.parse(keep);return {bimestres_1_4_6:a,segundaFichaMenor:b,terceiraFichaMaior:c}});
    res.regras=await pg.evaluate(()=>{const t=(per,v)=>isDep({nota:String(v).replace('.',','),per},null);return {eja_9_5:t(2,9.5),eja_10:t(2,10),reg_tri_14_5:t(3,14.5),reg_tri_15:t(3,15),reg_bim_19_5:t(4,19.5),reg_bim_20:t(4,20)}});
  }finally{await browser.close().catch(()=>{})}
  return finish(res)}
function finish(res,only){
  if(only)delete res.regularVisual; /* em outros navegadores a letra é desenhada diferente: confere só os dados */
  res.errosNaPagina=errors;if(only)for(const k of Object.keys(res))if(!only.includes(k))delete res[k];
  const espFile=path.join(__dirname,'esperado.json');const visFile=path.join(__dirname,'visual.json');
  if(process.argv.includes('--atualizar')){if(res.regularVisual){fs.writeFileSync(visFile,JSON.stringify({regular:res.regularVisual})+'\n');delete res.regularVisual}fs.writeFileSync(espFile,JSON.stringify(res,null,2)+'\n');console.log('esperado.json atualizado');return}
  const esp=JSON.parse(fs.readFileSync(espFile,'utf8'));let falhas=0;
  // comparação visual com tolerância (a letra pode variar um pouco entre computadores)
  if(res.regularVisual){const ref=fs.existsSync(visFile)?JSON.parse(fs.readFileSync(visFile,'utf8')).regular:null;
    if(ref){let d=0;for(let i=0;i<ref.length;i++)d+=Math.abs(ref[i]-res.regularVisual[i]);d/=ref.length;const ok=d<6;console.log(`${ok?'✓':'✗'} visual do histórico (diferença média ${d.toFixed(2)}, limite 6)`);if(!ok)falhas++}
    delete res.regularVisual}
  for(const k of Object.keys(esp)){if(only&&!only.includes(k))continue;const a=JSON.stringify(res[k]),b=JSON.stringify(esp[k]);if(a!==b){falhas++;console.log(`✗ ${k}\n   esperado: ${b}\n   obtido:   ${a}`)}else console.log(`✓ ${k}`)}
  if(falhas){console.log(`\n${falhas} teste(s) falharam.`);process.exit(1)}console.log('\nTodos os testes passaram.')}
/* Ficha de matrícula fictícia no mesmo formato da do Conexão (texto em PDF, como a impressa pelo navegador) */
const MATRICULA_FICTICIA=()=>{const doc=new jspdf.jsPDF({unit:'pt',format:'a4'});doc.setFont('helvetica','normal');doc.setFontSize(9);
  const L=[[null,'GOVERNO DO ESTADO DO RIO DE JANEIRO',200],[null,'SECRETARIA DE EDUCAÇÃO',230],[null,'FICHA DE MATRÍCULA',240],[],
  ['DADOS PESSOAIS'],['Nome: ALUNA FICTICIA DE TESTE'],['Data de Nascimento: 15/03/2008','Sexo: Feminino'],['Quantidade de Filhos: 0','Tipo Sanguíneo:'],['Etnia: Parda','Estado Civil: Solteiro'],
  ['País de Nascimento: BRASIL','Nacionalidade: BRASILEIRA'],['UF Nascimento: RJ','Naturalidade: RIO DE JANEIRO'],['Credo: Não declarado','Necessidade Especial: Não possui.'],['Matrícula: 202399999999991'],['Data da Situação: 01/02/2025','Hora: 10:00'],[],
  ['FILIAÇÃO'],['Nome mãe: MAE FICTICIA DE TESTE','Falecida: Não','CPF:'],['Nome Pai: PAI FICTICIO DE TESTE','Falecido: Não','CPF:'],['Resp. Legal: Mãe'],[],
  ['ENDEREÇO'],['Endereço: RUA DE TESTE','Número: 10'],['Complemento:','Bairro: CENTRO'],['Município: RIO DE JANEIRO','Estado: RJ'],['CEP: 20000000','Localização/Zona de Residência: Urbana'],[],
  ['DOCUMENTO'],['CPF: 529.982.247-25'],['Tipo: RG','Número: 123456789','Complemento Identidade:'],['Estado: RJ','Órgão Emissor: DETRAN','Data de Expedição: 10/01/2020'],[],
  ['TRANSPORTE'],['Utiliza Transporte? Sim','Poder Responsável: Estadual'],['Modal']];
  let y=60;for(const l of L){if(!l.length){y+=8;continue}if(l[0]===null){doc.text(l[1],l[2],y);y+=12;continue}l.forEach((t,i)=>doc.text(t,40+[0,250,420][i],y));y+=13}
  return doc.output('datauristring').split(',')[1]};
async function thumb(pg){return pg.evaluate(()=>{const W=60,H=85,c=document.createElement('canvas');c.width=595;c.height=842;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,595,842);paintSheet(buildSheet(state),canvasPainter(x));
  const t=document.createElement('canvas');t.width=W;t.height=H;const y=t.getContext('2d');y.drawImage(c,0,0,W,H);const d=y.getImageData(0,0,W,H).data;const out=[];for(let i=0;i<d.length;i+=4)out.push(Math.round((d[i]+d[i+1]+d[i+2])/3));return out})}
async function axe(pg){await pg.addScriptTag({url:'https://local/__axe.js'});return pg.evaluate(async()=>{const r=await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa']},resultTypes:['violations']});return r.violations.filter(v=>v.impact==='serious'||v.impact==='critical').map(v=>v.id+' ('+v.nodes.length+')')})}
main().catch(e=>{console.error(e);process.exit(1)});
