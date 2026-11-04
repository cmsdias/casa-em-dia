/* Casa em Dia — Assistente de início (2.0)
 * Numa instalação nova, o administrador escolhe o tipo de casa e recebe divisões e rotinas sugeridas.
 * Pode voltar a ser aberto em Definições › A casa; só acrescenta, nunca apaga o que já existe
 * (exceto as tarefas de exemplo, se o administrador o pedir).
 */
'use strict';
const OB_TYPES={
 'apt-small':{label:'Apartamento T0 a T2',desc:'Um piso, uma ou duas casas de banho.',floors:[],rooms:['Hall de entrada','Sala','Cozinha','Quarto principal','Quarto 2','Casa de banho','Varanda']},
 'apt-large':{label:'Apartamento T3 ou maior',desc:'Um piso, lavandaria e várias casas de banho.',floors:[],rooms:['Hall de entrada','Sala','Cozinha','Lavandaria','Quarto principal','Quarto 2','Quarto 3','Casa de banho','Casa de banho do quarto','Varanda']},
 'house':{label:'Moradia',desc:'Dois pisos e garagem.',floors:['Piso 0','Piso 1'],rooms:[['Hall de entrada','Piso 0'],['Sala','Piso 0'],['Cozinha','Piso 0'],['Lavandaria','Piso 0'],['WC de serviço','Piso 0'],['Garagem','Piso 0'],['Quarto principal','Piso 1'],['Quarto 2','Piso 1'],['Quarto 3','Piso 1'],['Escritório','Piso 1'],['Casa de banho','Piso 1']]},
 'house-garden':{label:'Moradia com jardim',desc:'Dois pisos, garagem, jardim e terraço.',floors:['Piso 0','Piso 1','Exterior'],rooms:[['Hall de entrada','Piso 0'],['Sala','Piso 0'],['Cozinha','Piso 0'],['Lavandaria','Piso 0'],['WC de serviço','Piso 0'],['Garagem','Piso 0'],['Quarto principal','Piso 1'],['Quarto 2','Piso 1'],['Quarto 3','Piso 1'],['Escritório','Piso 1'],['Casa de banho','Piso 1'],['Jardim','Exterior'],['Terraço','Exterior']]}};
// Rotinas sugeridas por divisão: [título, repetição, minutos].
const OB_ROUTINES=[
 [/cozinha/i,[['Limpar bancadas e placa','weekly',20],['Limpar o frigorífico','monthly',30],['Lavar os filtros do exaustor','quarterly',20]]],
 [/casa de banho|^wc/i,[['Limpar a casa de banho','weekly',30]]],
 [/quarto/i,[['Mudar a roupa de cama','weekly',15]]],
 [/sala/i,[['Aspirar e limpar o pó','weekly',30]]],
 [/lavandaria/i,[['Limpar o filtro da máquina de lavar','monthly',15]]],
 [/jardim/i,[['Cortar a relva','biweekly',60],['Verificar a rega','monthly',20]]],
 [/varanda|terra[çc]o/i,[['Varrer e lavar o chão','monthly',30]]],
 [/garagem/i,[['Arrumar a garagem','quarterly',60]]],
 [/hall|entrada/i,[['Limpar a entrada e o tapete','weekly',10]]],
 [/escrit[óo]rio/i,[['Arrumar a secretária e os papéis','monthly',30]]]];
function obRoutinesFor(rooms){const out=[];const kitchen=rooms.find(r=>/cozinha/i.test(r))||'Geral';
 out.push({title:'Lixo e reciclagem',room:kitchen,repeat:'weekly',estimatedMinutes:10});
 for(const r of rooms)for(const [re,list] of OB_ROUTINES)if(re.test(r))list.forEach(([title,repeat,min])=>out.push({title:/^(Limpar a casa de banho|Mudar a roupa de cama)$/.test(title)&&rooms.filter(x=>re.test(x)).length>1?`${title} (${roomShort(r)})`:title,room:r,repeat,estimatedMinutes:min}));
 return out.filter((x,i,a)=>a.findIndex(y=>y.title===x.title&&y.room===x.room)===i);}
const obKey=r=>r.title+'|'+r.room;
modalRenderers.onboarding=holder=>{
 const o=modal.ob;let body='',title='',sub='';
 if(o.step===1){title='Bem-vindo à Casa em Dia';sub='Três passos para pôr a casa a funcionar. Podes mudar tudo depois.';
  body=`<p class="ob-q">Que tipo de casa é?</p><div class="ob-types">${Object.entries(OB_TYPES).map(([k,t])=>`<button type="button" class="ob-type ${o.type===k?'on':''}" data-action="ob-type" data-type="${k}" aria-pressed="${o.type===k}"><strong>${esc(t.label)}</strong><small>${esc(t.desc)}</small></button>`).join('')}</div>
  <div class="modal-actions"><button type="button" class="button" data-action="ob-skip">Configurar à mão</button><span class="spacer"></span><button type="button" class="button primary" data-action="ob-next" ${o.type?'':'disabled'}>Continuar</button></div>`;}
 if(o.step===2){const t=OB_TYPES[o.type];title='As divisões';sub='Desmarca as que não existem. As que já tens ficam como estão.';const have=new Set(config().rooms);
  body=`<div class="ob-checks">${o.rooms.map((r,i)=>`<label class="check-line"><input type="checkbox" data-ob-room="${i}" ${r.on?'checked':''} ${have.has(r.name)?'disabled':''}/> ${esc(r.name)}${r.floor?` <small class="muted">· ${esc(r.floor)}</small>`:''}${have.has(r.name)?' <small class="muted">· já existe</small>':''}</label>`).join('')}</div>
  <div class="ob-add"><input id="ob-new-room" maxlength="70" placeholder="Outra divisão (ex.: Sótão)" aria-label="Nova divisão"/><button type="button" class="button small" data-action="ob-add-room">${ico('plus')} Acrescentar</button></div>
  <div class="modal-actions"><button type="button" class="button" data-action="ob-back">Voltar</button><span class="spacer"></span><button type="button" class="button primary" data-action="ob-next">Continuar</button></div>`;}
 if(o.step===3){title='Rotinas sugeridas';sub='Pequenos cuidados que se repetem. Ficam por atribuir; depois podes definir quem faz e a rotação.';
  const byRoom={};o.routines.forEach((r,i)=>(byRoom[r.room]??=[]).push([r,i]));
  body=`<div class="ob-checks">${Object.entries(byRoom).map(([room,list])=>`<p class="ob-room">${esc(room)}</p>${list.map(([r,i])=>`<label class="check-line"><input type="checkbox" data-ob-routine="${i}" ${r.on?'checked':''}/> ${esc(r.title)} <small class="muted">· ${esc(repeatLabels[r.repeat])} · ${r.estimatedMinutes} min</small></label>`).join('')}`).join('')}</div>
  ${o.examples?`<label class="check-line ob-examples"><input type="checkbox" id="ob-remove-examples" ${o.removeExamples?'checked':''}/> Apagar as ${o.examples} tarefas de exemplo da instalação</label>`:''}
  <div class="modal-actions"><button type="button" class="button" data-action="ob-back">Voltar</button><span class="spacer"></span><button type="button" class="button primary" data-action="ob-finish">${ico('check')} Criar ${plural(o.routines.filter(r=>r.on).length,'rotina','rotinas')}</button></div>`;}
 holder.innerHTML=modalShell({title,sub:`Passo ${o.step} de 3 · ${sub}`,body,cls:'ob-modal'});
 holder.querySelectorAll('[data-ob-room]').forEach(c=>c.addEventListener('change',()=>{o.rooms[Number(c.dataset.obRoom)].on=c.checked;}));
 holder.querySelectorAll('[data-ob-routine]').forEach(c=>c.addEventListener('change',()=>{o.routines[Number(c.dataset.obRoutine)].on=c.checked;const b=holder.querySelector('[data-action=ob-finish]');if(b)b.innerHTML=`${ico('check')} Criar ${plural(o.routines.filter(r=>r.on).length,'rotina','rotinas')}`;}));
 holder.querySelector('#ob-remove-examples')?.addEventListener('change',e=>{o.removeExamples=e.target.checked;});
};
function openOnboarding(){const examples=tasks().filter(t=>t.suggested===true&&t.status!=='done').length;modal={type:'onboarding',ob:{step:1,type:'',rooms:[],routines:[],examples,removeExamples:examples>0}};quickCreateOpen=false;renderModal();}
let obChecked=false;
const loadBeforeOnboarding=load;
load=async function(){await loadBeforeOnboarding();if(!obChecked&&!demo&&store.user?.role==='admin'&&store.settings?.onboarded===false){obChecked=true;setTimeout(()=>{if(!modal)openOnboarding();},400);}};
actionHandlers.push(async(name,el)=>{
 const o=modal?.ob;
 switch(name){
  case 'onboarding-open':openOnboarding();return true;
  case 'ob-type':o.type=el.dataset.type;renderModal();return true;
  case 'ob-next':{if(o.step===1){const t=OB_TYPES[o.type];o.rooms=t.rooms.map(r=>Array.isArray(r)?{name:r[0],floor:r[1],on:true}:{name:r,floor:'',on:true});o.floors=t.floors;}
   if(o.step===2){const prev=new Map(o.routines.map(r=>[obKey(r),r.on]));const names=[...new Set([...config().rooms.filter(r=>o.rooms.some(x=>x.name===r)),...o.rooms.filter(r=>r.on).map(r=>r.name)])];o.routines=obRoutinesFor(names).map(r=>({...r,on:prev.has(obKey(r))?prev.get(obKey(r)):true}));}
   o.step++;renderModal();return true;}
  case 'ob-back':o.step--;renderModal();return true;
  case 'ob-add-room':{const i=document.getElementById('ob-new-room');const v=i?.value.trim();if(!v)return true;if(!o.rooms.some(r=>r.name.toLocaleLowerCase('pt-PT')===v.toLocaleLowerCase('pt-PT')))o.rooms.push({name:v.slice(0,70),floor:'',on:true});renderModal();document.getElementById('ob-new-room')?.focus();return true;}
  case 'ob-skip':{if(!demo)try{await api('/api/onboarding','POST',{skip:true});}catch{}modal=null;go('settings');settingsSection='house';render();return true;}
  case 'ob-finish':{const rooms=o.rooms.filter(r=>r.on);const routines=o.routines.filter(r=>r.on).map(({on,...r})=>r);
   const body={floors:o.floors,rooms:rooms.map(({name,floor})=>({name,floor})),routines,removeExamples:!!o.removeExamples&&o.examples>0};
   const r=demo?demoOnboarding(body):await api('/api/onboarding','POST',body);modal=null;await reload();
   toast(`Casa configurada: ${plural(r.created||0,'rotina criada','rotinas criadas')}${r.removed?`, ${plural(r.removed,'exemplo apagado','exemplos apagados')}`:''}. Convida as pessoas da casa em Casa › Pessoas.`);go('tasks',{view:'routines'});return true;}
 }
 return false;
});
// Na demonstração, o assistente aplica-se só aos dados deste dispositivo.
function demoOnboarding(b){const st=store.settings;st.floors=[...new Set([...(st.floors||[]),...b.floors])];st.rooms=[...new Set([...(st.rooms||[]),...b.rooms.map(r=>r.name)])];st.roomFloors=st.roomFloors||{};b.rooms.forEach(r=>{if(r.floor&&!st.roomFloors[r.name])st.roomFloors[r.name]=r.floor;});
 let removed=0;if(b.removeExamples){const n=store.tasks.length;store.tasks=store.tasks.filter(t=>!(t.suggested===true&&t.status!=='done'));removed=n-store.tasks.length;}
 const have=new Set(store.tasks.map(t=>t.title+'|'+t.room));let created=0;for(const r of b.routines){if(have.has(r.title+'|'+r.room))continue;store.tasks.push({id:'ob'+Date.now()+created,kind:'routine',status:'todo',priority:'P3',category:'Limpeza',visibility:'shared',dueDate:'',assignedTo:null,subtasks:[],...r});created++;}
 st.onboarded=true;persistDemo();return {created,removed};}
