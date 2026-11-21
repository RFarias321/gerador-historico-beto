/* Testes automáticos do Gerador de Histórico do Beto.
   Abre a página num navegador sem tela, anexa os documentos fictícios de tests/fixtures
   e confere os resultados com tests/esperado.json.
   Uso: node tests/run.js            (confere)
        node tests/run.js --atualizar (grava o resultado atual como esperado) */
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const ROOT=path.resolve(__dirname,'..'),FX=path.join(__dirname,'fixtures');
const NM=process.env.NM||path.join(__dirname,'node_modules');
const CDN={'jszip/3.10.1/jszip.min.js':'jszip/dist/jszip.min.js','jspdf/2.5.1/jspdf.umd.min.js':'jspdf/dist/jspdf.umd.min.js','xlsx/0.18.5/xlsx.full.min.js':'xlsx/dist/xlsx.full.min.js','pdf.js/3.11.174/pdf.min.js':'pdfjs-dist/build/pdf.min.js'};
const fx=n=>path.join(FX,n);
const REG=['FIA_2021.xlsx','FIA_2022.xlsx','FIA_2023.xlsx','ARF_2023.xlsx'].map(fx);
const EJA=['eja_1.xlsx','eja_2.xlsx','eja_3.xlsx','eja_4.xlsx','2023.1_-_EJA_1.xlsx','2023.2_-_EJA_2.xlsx','2024.1_-_EJA_3.xlsx','2024.2_-_EJA_4.xlsx'].map(fx);
const errors=[];
async function newPage(browser){const ctx=await browser.newContext({viewport:{width:1400,height:1000}});const pg=await ctx.newPage();
  pg.on('pageerror',e=>errors.push('erro na página: '+e.message));if(process.env.DEBUG)pg.on('console',m=>console.log('console:',m.text()));
  await ctx.route('**/*',async r=>{const u=r.request().url();
    if(u.startsWith('https://cdnjs.cloudflare.com/ajax/libs/')){const k=CDN[u.split('/ajax/libs/')[1]];if(k)return r.fulfill({path:path.join(NM,k),contentType:'application/javascript'})}
    if(u.startsWith('http://local/')){const rel=decodeURIComponent(u.slice(13).split('?')[0])||'index.html';const f=path.join(ROOT,rel);if(!f.startsWith(ROOT)||!fs.existsSync(f))return r.fulfill({status:404,body:''});
      return r.fulfill({path:f,contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.html')?'text/html; charset=utf-8':undefined})}
    if(process.env.DEBUG)console.log('bloqueado:',u);return r.abort()});
  await pg.goto('http://local/');await pg.waitForFunction(()=>window.READY===true||typeof READY!=='undefined'&&READY,null,{timeout:30000});await pg.waitForTimeout(500);return pg}
const idle=pg=>pg.waitForFunction(()=>![...document.querySelectorAll('#files li')].some(e=>/Lendo|lendo…|abrindo/.test(e.textContent))&&!/Turma: lendo/.test(document.querySelector('#status').textContent),null,{timeout:120000});
const facts=pg=>pg.evaluate(async()=>{const pages=await buildPackPages();const blob=makePdf(buildSheet(state));const x=await makeXlsx(buildSheet(state));
  return {modo:state.mode,anos:state.periods.map(p=>p.ano),situacao:state.periods.map(p=>p.sit),disciplinas:state.subjects.length,
    notas:state.subjects.slice(0,6).map(s=>s.name+': '+s.g.map(g=>g.nota).join('/')),
    dependencias:state.deps.map(d=>d.ano+' '+d.disc+' '+d.nota),observacoes:obsLines(state).map(l=>l.text),
    arquivos:files.map(f=>f.dup?'repetido':f.err?'erro':f.arf?'ata:'+(f.arfDone?'aluno encontrado':'sem aluno'):(f.src&&f.src.docs||[]).map(d=>d.role).join('+')),
    paginas:pages.map(p=>p.orient+' '+p.title),pdfOk:blob.size>20000,excelOk:x.size>20000}});
async function main(){const browser=await chromium.launch();const res={};
  try{
    // 1. Ensino Regular, um aluno
    let pg=await newPage(browser);await pg.setInputFiles('#file',REG);await idle(pg);await pg.waitForTimeout(800);res.regular=await facts(pg);
    // 2. EJA com a página em Regular: troca sozinha para EJA
    pg=await newPage(browser);await pg.setInputFiles('#file',EJA);await idle(pg);await pg.waitForTimeout(800);res.eja=await facts(pg);
    res.eja.alertaModelo=await pg.evaluate(()=>!!state.modeAlert);
    // 3. arquivo repetido é recusado
    const copia=path.join(require('os').tmpdir(),'copia_eja_1.xlsx');fs.copyFileSync(fx('eja_1.xlsx'),copia);await pg.setInputFiles('#file',[copia]);await idle(pg);
    res.repetido=await pg.evaluate(()=>files[files.length-1].dup===true);
    // 4. ano da dependência alterado vai para a observação
    await pg.evaluate(()=>{const i=document.querySelector('#da-1');i.value='2025';i.dispatchEvent(new Event('input',{bubbles:true}))});await pg.waitForTimeout(300);
    res.anoDependencia=await pg.evaluate(()=>obsLines(state).map(l=>l.text.slice(0,4)));
    // 5. sair para o tutorial e voltar: o trabalho continua
    await pg.waitForTimeout(1200);const antes=await pg.evaluate(()=>state.aluno.nome+'|'+files.length);
    await pg.goto('http://local/tutorial.html');await pg.goto('http://local/');await pg.waitForTimeout(3000);
    res.sessaoRecuperada=(await pg.evaluate(()=>state.aluno.nome+'|'+files.length))===antes;
    // 6. turma: desligada por enquanto (o botão não aparece)
    res.turmaDesligada=await pg.evaluate(()=>!document.getElementById('tm-all'));
    // 6b. item 5 recolhido com a escola em verde e prévia ampliada
    res.item6=await pg.evaluate(()=>{const s=document.querySelector('.sec[data-sec="6"]');return s.classList.contains('collapsed')+' '+s.querySelector('.sec-badge').textContent});
    res.nomeEscola=await pg.evaluate(()=>{const i=document.querySelector('#es-curto');i.value='IE Carmela Dutra';i.dispatchEvent(new Event('input',{bubbles:true}));const r=[esc.nome,sig.sec.escola,sig.dir.escola];document.getElementById('esc-reset').click();return r});
    res.itensFechados=await pg.evaluate(()=>[...document.querySelectorAll('.sec')].map(s=>s.dataset.sec+(s.classList.contains('collapsed')?' fechado':' aberto')));
    res.previaAmpliada=await pg.evaluate(()=>{document.getElementById('cv').click();const ok=!!document.querySelector('.big-pv canvas');document.querySelector('[data-z="x"]').click();return ok});
    // 7. regra de aprovação (soma mínima)
    res.regras=await pg.evaluate(()=>{const t=(per,v)=>isDep({nota:String(v).replace('.',','),per},null);return {eja_9_5:t(2,9.5),eja_10:t(2,10),reg_tri_14_5:t(3,14.5),reg_tri_15:t(3,15),reg_bim_19_5:t(4,19.5),reg_bim_20:t(4,20)}});
  }finally{await browser.close()}
  res.errosNaPagina=errors;
  const espFile=path.join(__dirname,'esperado.json');
  if(process.argv.includes('--atualizar')){fs.writeFileSync(espFile,JSON.stringify(res,null,2)+'\n');console.log('esperado.json atualizado');return}
  const esp=JSON.parse(fs.readFileSync(espFile,'utf8'));let falhas=0;
  for(const k of Object.keys(esp)){const a=JSON.stringify(res[k]),b=JSON.stringify(esp[k]);if(a!==b){falhas++;console.log(`✗ ${k}\n   esperado: ${b}\n   obtido:   ${a}`)}else console.log(`✓ ${k}`)}
  if(falhas){console.log(`\n${falhas} teste(s) falharam.`);process.exit(1)}console.log('\nTodos os testes passaram.')}
main().catch(e=>{console.error(e);process.exit(1)});
