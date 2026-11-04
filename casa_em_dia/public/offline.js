/* Casa em Dia — trabalhar sem rede (2.0)
 * - Guarda no dispositivo a última versão dos dados (para abrir a app sem ligação).
 * - Concluir tarefas e mexer nas compras sem rede: a alteração aplica-se logo no ecrã e fica numa fila,
 *   enviada pela ordem certa quando a ligação voltar. As restantes edições pedem ligação.
 * Na demonstração nada disto é necessário (os dados já estão no dispositivo).
 */
'use strict';
const CACHE_KEY='casa-cache-v2',QUEUE_KEY='casa-fila';
const readJSON=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d;}catch{return d;}};
const writeJSON=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}};
let queue=readJSON(QUEUE_KEY,[]);if(!Array.isArray(queue))queue=[];
const pendingCount=()=>queue.length;
function saveQueue(){writeJSON(QUEUE_KEY,queue);}
function offlineBanner(){
 const n=queue.length;
 if(!offline)return n?`<div class="offline-banner sending">${ico('refresh')} A enviar ${plural(n,'alteração feita','alterações feitas')} sem rede…</div>`:'';
 return `<div class="offline-banner">${ico('wifi-off')}<span><b>Sem ligação ao servidor.</b> Podes consultar os dados, concluir tarefas e mexer nas compras${n?` (${plural(n,'alteração','alterações')} por enviar)`:''}; o resto fica disponível quando a ligação voltar.</span></div>`;
}
// Ao abrir sem ligação: usa a última cópia guardada neste dispositivo.
function offlineBoot(){if(demo)return false;const c=readJSON(CACHE_KEY,null);if(!c?.state?.user)return false;store=c.state;offline=true;render();return true;}
// Depois de cada leitura bem-sucedida, guarda os dados (sem notificações nem registo de auditoria).
const loadOnline=load;
load=async function(){await loadOnline();if(!demo&&store.user){const {audit,...rest}=store;writeJSON(CACHE_KEY,{at:new Date().toISOString(),state:rest});}if(queue.length)queueMicrotask(flushQueue);};

const QUEUEABLE=[[/^\/api\/tasks\/[^/]+\/complete$/,'POST'],[/^\/api\/shopping\/[^/]+$/,'PATCH'],[/^\/api\/shopping$/,'POST'],[/^\/api\/tasks\/[^/]+$/,'PATCH',b=>Object.keys(b||{}).every(k=>['status','subtasks','thisWeek'].includes(k))]];
const canQueue=(ep,m,b)=>!demo&&QUEUEABLE.some(([re,mm,ok])=>re.test(ep)&&mm===m&&(!ok||ok(b)));
// Aplica a alteração aos dados no ecrã, como o servidor faria.
function applyLocally(ep,method,b){
 let m;
 if((m=ep.match(/^\/api\/tasks\/([^/]+)\/complete$/))){const t=tasks().find(x=>x.id===m[1]);if(!t)return {};store.history=[...(store.history||[]),{id:'tmp-'+Date.now(),taskId:t.id,title:t.title,kind:t.kind,assignedTo:t.assignedTo,by:store.user.id,at:new Date().toISOString()}];
  if(t.kind==='routine'&&t.repeat!=='none'){t.dueDate=nextDemoDate(t.dueDate,t.repeat);t.status='todo';if(Array.isArray(t.rotation)&&t.rotation.length>1){const i=t.rotation.indexOf(t.assignedTo);t.assignedTo=t.rotation[(i+1)%t.rotation.length];}}else t.status='done';return {task:t};}
 if((m=ep.match(/^\/api\/tasks\/([^/]+)$/))){const t=tasks().find(x=>x.id===m[1]);if(t)Object.assign(t,b);return {task:t};}
 if(ep==='/api/shopping'){const item={...b,id:'tmp-'+Date.now(),purchased:false,createdBy:store.user.id,quantity:b.quantity||'1',unit:b.unit||'',category:b.category||guessShopCategory(b.title)||'Outros'};store.shopping=[...shopping(),item];return {item,tempId:item.id};}
 if((m=ep.match(/^\/api\/shopping\/([^/]+)$/))){const it=shopping().find(x=>x.id===m[1]);if(it)Object.assign(it,b);return {item:it};}
 return {};
}
function enqueue(ep,method,b){
 const res=applyLocally(ep,method,b);
 // Um produto criado sem rede e alterado logo a seguir: junta a alteração ao próprio pedido de criação.
 const tm=ep.match(/^\/api\/shopping\/(tmp-[^/]+)$/);if(tm){const create=queue.find(q=>q.tempId===tm[1]);if(create){Object.assign(create.data,b);saveQueue();return res;}}
 queue.push({endpoint:ep,method,data:b,at:new Date().toISOString(),...(res.tempId?{tempId:res.tempId}:{})});saveQueue();
 return res;
}
const apiOnline=api;
api=async function(endpoint,method='GET',data){
 // Sem rede confirmada (ou um produto ainda só local): vai direto para a fila, sem esperar pela falha do pedido.
 if(method!=='GET'&&canQueue(endpoint,method,data)&&((offline&&navigator.onLine===false)||endpoint.includes('/tmp-'))){const r=enqueue(endpoint,method,data);if(!endpoint.includes('/tmp-'))toast('Sem rede: fica guardado e é enviado quando a ligação voltar.');return r;}
 try{return await apiOnline(endpoint,method,data);}
 catch(e){if(method!=='GET'&&offline&&canQueue(endpoint,method,data)){const r=enqueue(endpoint,method,data);toast('Sem rede: fica guardado e é enviado quando a ligação voltar.');return r;}throw e;}
};
// A reload sem rede mantém o que está no ecrã (incluindo as alterações em fila).
let flushing=false;
async function flushQueue(){
 if(flushing||!queue.length||demo)return;flushing=true;let sent=0,failed=[];
 try{while(queue.length){const q=queue[0];
   try{await apiOnline(q.endpoint,q.method,q.data);sent++;}
   catch(e){if(offline)break; /* continua sem rede: tenta mais tarde */ failed.push(e.message);}
   queue.shift();saveQueue();}
 }finally{flushing=false;}
 if(sent||failed.length){await loadOnline().catch(()=>{});if(!modal)render();
  if(failed.length)toast(`${plural(failed.length,'alteração feita sem rede não pôde','alterações feitas sem rede não puderam')} ser aplicada${failed.length>1?'s':''}: ${failed[0]}`);else toast(`${plural(sent,'alteração enviada','alterações enviadas')}.`);}
}
window.addEventListener('online',()=>{if(store.user&&!demo)reload();});
setInterval(()=>{if(queue.length&&store.user&&!demo&&navigator.onLine!==false)api('/api/rev').then(()=>{offline=false;flushQueue();}).catch(()=>{});},15_000);
