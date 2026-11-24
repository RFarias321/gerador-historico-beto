/* Gerador de Histórico do Beto — tutorial: voltar fecha a aba e mantém o gerador como estava */
for(const a of document.querySelectorAll('#voltar,.back'))a.addEventListener('click',e=>{try{if(window.opener&&!window.opener.closed){e.preventDefault();window.opener.focus();window.close()}}catch(_){}});
