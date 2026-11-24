/* Gerador de Histórico do Beto — sessao */
/* sessão salva só neste navegador: ir ao tutorial (ou recarregar) não apaga o trabalho.
   Fica no IndexedDB deste computador, some com "Novo aluno" e expira em 12 horas. */
const SESS_TTL=12*3600*1000;let sessTimer=null,sessRestoring=false;
function sessDb(){return new Promise((res,rej)=>{const r=indexedDB.open('gerador-historico-sessao',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function sessPut(v){const db=await sessDb();await new Promise((res,rej)=>{const tx=db.transaction('kv','readwrite');v==null?tx.objectStore('kv').delete('atual'):tx.objectStore('kv').put(v,'atual');tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});db.close()}
async function sessGet(){const db=await sessDb();const v=await new Promise((res,rej)=>{const tx=db.transaction('kv','readonly');const q=tx.objectStore('kv').get('atual');q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});db.close();return v}
async function sessSaveNow(){if(sessRestoring||!READY||!state)return;
  try{if(state.example||isPristine()){await sessPut(null);return}
    const keep=files.filter(f=>!f.example&&!/lendo|abrindo/.test(f.status||''));
    try{await sessPut({t:Date.now(),state,files:keep})}
    catch(e){await sessPut({t:Date.now(),state:JSON.parse(JSON.stringify(state)),files:[]})}}
  catch(e){console.warn('sessão',e)}}
function sessSave(){clearTimeout(sessTimer);sessTimer=setTimeout(sessSaveNow,600)}
async function sessRestore(){
  try{const v=await sessGet();if(!v||!v.state)return false;if(Date.now()-v.t>SESS_TTL){await sessPut(null);return false}
    sessRestoring=true;state=v.state;files=v.files||[];renderFiles();renderAll();sessRestoring=false;
    setStatus(`Recuperei o trabalho em andamento${state.aluno&&state.aluno.nome?' de '+state.aluno.nome:''}. Para começar outro aluno, clique em Novo aluno.`);return true}
  catch(e){sessRestoring=false;console.warn('sessão',e);return false}}
{const _sp=schedulePreview;schedulePreview=function(){_sp.apply(this,arguments);sessSave()}}
{const _rf=renderFiles;renderFiles=function(){_rf.apply(this,arguments);sessSave()}}
addEventListener('pagehide',()=>{sessSaveNow()});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')sessSaveNow()});
