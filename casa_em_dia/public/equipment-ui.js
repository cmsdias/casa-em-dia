/* Casa em Dia — Equipamentos e documentos da casa (2.0)
 * Caldeira, ar condicionado, eletrodomésticos, rega…: manual, fatura, garantia, técnico e revisões.
 * As revisões geram uma tarefa 30 dias antes (no servidor) e são marcadas como feitas aqui ou ao concluir a tarefa.
 */
'use strict';
const EQ_CATEGORIES=['Aquecimento e águas quentes','Climatização','Eletrodomésticos','Canalização','Eletricidade','Jardim e rega','Segurança','Cobertura e fachada','Outros'];
const EQ_DOC_KINDS={manual:'Manual',fatura:'Fatura',garantia:'Garantia',contrato:'Contrato',foto:'Fotografia',outro:'Outro'};
const equipment=()=>Array.isArray(store.equipment)?store.equipment:[];
const eqFmt=iso=>iso?new Date(iso+'T12:00:00Z').toLocaleDateString('pt-PT',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}):'';
function eqService(it){if(!it.nextService)return null;const d=CasaCore.daysBetween(today(),it.nextService);return {d,level:d<0?'bad':d<=30?'warn':'ok',label:d<0?`Revisão atrasada (${eqFmt(it.nextService)})`:d===0?'Revisão hoje':d<=30?`Revisão daqui a ${plural(d,'dia','dias')}`:`Revisão a ${eqFmt(it.nextService)}`};}
function eqWarranty(it){if(!it.warrantyUntil)return null;const d=CasaCore.daysBetween(today(),it.warrantyUntil);return d<0?{level:'none',label:'Garantia terminada'}:{level:d<=30?'warn':'ok',label:`Garantia até ${eqFmt(it.warrantyUntil)}`};}
function equipmentPage(){
 const list=equipment();const edit=canManage()||demo;
 const due=list.map(it=>({it,s:eqService(it)})).filter(x=>x.s&&x.s.d<=60).sort((a,b)=>a.s.d-b.s.d);
 const groups=roomsByFloor([...new Set(list.map(x=>x.room||'Geral'))]);
 const card=it=>{const s=eqService(it),w=eqWarranty(it);return `<button type="button" class="eq-card" data-action="eq-view" data-id="${esc(it.id)}"><span class="eq-ico">${ico('tool')}</span><span class="eq-text"><strong>${esc(it.name)}</strong><small>${esc([it.brand,it.model].filter(Boolean).join(' ')||it.category||'')}</small><span class="eq-tags">${s?`<span class="tag-s lvl-${s.level}">${esc(s.label)}</span>`:''}${w?`<span class="tag-s lvl-${w.level}">${esc(w.label)}</span>`:''}${(it.docs||[]).length?`<span class="tag-s">${ico('file')}${it.docs.length}</span>`:''}</span></span>${ico('chevron','index-chev')}</button>`;};
 return `<div class="header-row"><div><h1 class="page-title">Equipamentos</h1><p class="page-subtitle">Manuais, garantias, técnicos e revisões de cada equipamento da casa.</p></div>${edit?`<button class="button primary" data-action="eq-new">${ico('plus-square')} Novo equipamento</button>`:''}</div>
 ${due.length?`<section class="panel eq-due"><h2 class="section-title">Próximas revisões</h2>${due.map(({it,s})=>`<div class="eq-due-row"><span class="dot-lvl lvl-${s.level}" aria-hidden="true"></span><button type="button" class="eq-due-text" data-action="eq-view" data-id="${esc(it.id)}"><b>${esc(it.name)}</b><small>${esc(s.label)}${it.techName?' · '+esc(it.techName):''}</small></button>${it.techPhone?`<a class="button small" href="tel:${esc(it.techPhone.replace(/\s/g,''))}">${ico('phone')} Ligar</a>`:''}${edit?`<button type="button" class="button small" data-action="eq-service" data-id="${esc(it.id)}">${ico('check')} Feita</button>`:''}</div>`).join('')}</section>`:''}
 ${list.length?groups.map(g=>`<h2 class="group-title">${esc(g.floor||'')}</h2>${g.rooms.map(r=>`<h3 class="eq-room">${esc(roomShort(r))}</h3><div class="eq-grid">${list.filter(x=>(x.room||'Geral')===r).sort((a,b)=>a.name.localeCompare(b.name,'pt-PT')).map(card).join('')}</div>`).join('')}`).join(''):`<div class="panel">${empty('tool','Ainda não há equipamentos',edit?'Começa pelos que têm revisões ou garantias: caldeira, ar condicionado, esquentador, máquinas, sistema de rega.':'O administrador ou o gestor podem acrescentar os equipamentos da casa.')}${edit?`<div style="text-align:center;padding-bottom:22px"><button class="button primary" data-action="eq-new">${ico('plus-square')} Acrescentar equipamento</button></div>`:''}</div>`}
 <div class="info-note">Trinta dias antes de cada revisão é criada uma tarefa «Revisão: …» e o administrador e o gestor recebem um aviso. Ao concluir essa tarefa, a próxima revisão é marcada automaticamente. Os documentos ficam guardados no servidor da casa.</div>`;
}
function eqDocHref(it,d){return demo?'#':`api/equipment/${encodeURIComponent(it.id)}/docs/${encodeURIComponent(d.id)}`;}
modalRenderers['eq-view']=holder=>{
 const it=equipment().find(x=>x.id===modal.id);if(!it){closeModal();return;}const edit=canManage()||demo;const s=eqService(it),w=eqWarranty(it);
 const row=(l,v)=>v?`<div class="eq-field"><span>${l}</span><b>${v}</b></div>`:'';
 const body=`<div class="eq-tags">${s?`<span class="tag-s lvl-${s.level}">${esc(s.label)}</span>`:''}${w?`<span class="tag-s lvl-${w.level}">${esc(w.label)}</span>`:''}</div>
 <div class="eq-fields">${row('Divisão',esc(it.room||'Geral'))}${row('Tipo',esc(it.category||''))}${row('Marca e modelo',esc([it.brand,it.model].filter(Boolean).join(' ')))}${row('N.º de série',esc(it.serial||''))}${row('Comprado em',esc(eqFmt(it.purchaseDate)))}${row('Fornecedor',esc(it.supplier||''))}${row('Revisões',it.serviceEveryMonths?`De ${it.serviceEveryMonths} em ${it.serviceEveryMonths} meses`:'')}${row('Última revisão',esc(eqFmt(it.lastService)))}</div>
 ${it.techName||it.techPhone||it.techEmail?`<div class="eq-tech"><strong>${ico('user')} ${esc(it.techName||'Técnico')}</strong><span>${it.techPhone?`<a class="button small" href="tel:${esc(it.techPhone.replace(/\s/g,''))}">${ico('phone')} ${esc(it.techPhone)}</a>`:''}${it.techEmail?`<a class="button small" href="mailto:${esc(it.techEmail)}">${ico('mail')} Email</a>`:''}</span></div>`:''}
 ${it.notes?`<p class="eq-notes">${esc(it.notes)}</p>`:''}
 <h3 class="eq-sub">Documentos</h3><div class="eq-docs">${(it.docs||[]).map(d=>`<div class="eq-doc"><a class="eq-doc-link" ${demo?`data-action="eq-doc-open" data-id="${esc(it.id)}" data-doc="${esc(d.id)}" role="button"`:`target="_blank" rel="noopener"`} href="${esc(eqDocHref(it,d))}">${ico('file')}<span><b>${esc(d.name)}</b><small>${esc(EQ_DOC_KINDS[d.kind]||'Documento')} · ${esc(fmtBytes(d.size))}</small></span></a>${edit?`<button type="button" class="icon-btn" data-action="eq-doc-delete" data-id="${esc(it.id)}" data-doc="${esc(d.id)}" aria-label="Remover ${esc(d.name)}">×</button>`:''}</div>`).join('')||'<p class="muted">Sem documentos.</p>'}</div>
 ${edit?`<div class="eq-upload"><select class="select-control" id="eq-doc-kind" aria-label="Tipo de documento">${Object.entries(EQ_DOC_KINDS).map(([k,v])=>option(k,v,'manual')).join('')}</select><button type="button" class="button" data-action="eq-doc-pick" data-id="${esc(it.id)}">${ico('upload')} Acrescentar PDF ou fotografia</button><input type="file" id="eq-doc-file" accept="application/pdf,image/jpeg,image/png,image/webp" hidden /></div><p class="field-help">PDF, JPEG, PNG ou WebP até 8 MB.</p>`:''}
 ${(it.serviceLog||[]).length?`<h3 class="eq-sub">Histórico de revisões</h3><ul class="eq-log">${it.serviceLog.slice().reverse().slice(0,8).map(l=>`<li>${esc(eqFmt(l.date))}${l.by?' · '+esc(owner(l.by)):''}</li>`).join('')}</ul>`:''}
 ${edit?`<div class="modal-actions"><button type="button" class="button danger" data-action="eq-delete" data-id="${esc(it.id)}">${ico('trash')} Eliminar</button><span class="spacer"></span>${it.serviceEveryMonths||it.nextService?`<button type="button" class="button" data-action="eq-service" data-id="${esc(it.id)}">${ico('check')} Revisão feita</button>`:''}<button type="button" class="button primary" data-action="eq-edit" data-id="${esc(it.id)}">${ico('edit')} Editar</button></div>`:''}`;
 holder.innerHTML=modalShell({title:esc(it.name),sub:esc([roomShort(it.room||'Geral'),it.category].filter(Boolean).join(' · ')),body,cls:'eq-modal'});
};
modalRenderers['eq-edit']=holder=>{
 const it=modal.id?equipment().find(x=>x.id===modal.id):{category:'Outros',room:'Geral',serviceEveryMonths:0};if(!it){closeModal();return;}
 const rooms=[...new Set(['Geral',...config().rooms,it.room||'Geral'])];const months=[0,3,6,12,24,36,60];
 const f=(label,name,type='text',extra='')=>`<div class="field"><label>${label}</label><input name="${name}" type="${type}" value="${esc(it[name]||'')}" ${extra}/></div>`;
 const body=`<form id="eq-form">${f('Nome','name','text','required maxlength="80" placeholder="Ex.: Caldeira, Ar condicionado da sala"')}
 <div class="form-row"><div class="field"><label>Divisão</label><select name="room">${roomOptions(rooms,it.room||'Geral')}</select></div><div class="field"><label>Tipo</label><select name="category">${EQ_CATEGORIES.map(c=>option(c,c,it.category||'Outros')).join('')}</select></div></div>
 <div class="form-row">${f('Marca','brand','text','maxlength="60"')}${f('Modelo','model','text','maxlength="80"')}</div>
 <div class="form-row">${f('N.º de série','serial','text','maxlength="80"')}${f('Fornecedor / loja','supplier','text','maxlength="80"')}</div>
 <div class="form-row">${f('Data de compra','purchaseDate','date')}${f('Garantia até','warrantyUntil','date')}</div>
 <fieldset class="eq-fieldset"><legend>Revisões periódicas</legend><div class="form-row"><div class="field"><label>Periodicidade</label><select name="serviceEveryMonths">${[...new Set([...months,it.serviceEveryMonths||0])].sort((a,b)=>a-b).map(m=>option(String(m),m?`De ${m} em ${m} meses`:'Sem revisões periódicas',String(it.serviceEveryMonths||0))).join('')}</select></div>${f('Última revisão','lastService','date')}</div>${f('Próxima revisão','nextService','date')}<small class="field-help">Se deixares a próxima em branco, é calculada a partir da última revisão e da periodicidade.</small></fieldset>
 <fieldset class="eq-fieldset"><legend>Técnico ou assistência</legend>${f('Nome ou empresa','techName','text','maxlength="80"')}<div class="field"><label for="eq-tech-phone">Telefone</label>${phoneField('eq-tech-phone','techPhone',it.techPhone||'')}</div>${f('Email','techEmail','email','maxlength="120"')}</fieldset>
 <div class="field"><label>Notas</label><textarea name="notes" maxlength="1500" rows="3" placeholder="Pressão recomendada, código do filtro, onde está a torneira de corte…">${esc(it.notes||'')}</textarea></div>
 <div class="modal-actions"><button type="button" class="button" data-action="${modal.id?'eq-view':'close'}" data-id="${esc(modal.id||'')}">Cancelar</button><button type="submit" class="button primary">${ico('check')} Guardar</button></div></form>`;
 holder.innerHTML=modalShell({title:modal.id?'Editar equipamento':'Novo equipamento',sub:'Só o nome é obrigatório; o resto pode ser acrescentado depois.',body,cls:'eq-modal'});
 const form=holder.querySelector('#eq-form');form.addEventListener('input',()=>{const o=form.closest('.overlay');if(o)o.dataset.dirty='1';});
 form.addEventListener('submit',async e=>{e.preventDefault();const wasEdit=!!modal.id;const v=Object.fromEntries(new FormData(form));v.serviceEveryMonths=Number(v.serviceEveryMonths||0);const btn=form.querySelector('[type=submit]');btn.disabled=true;
  try{const r=modal.id?await api('/api/equipment/'+modal.id,'PATCH',v):await api('/api/equipment','POST',v);if(r.equipment)store.equipment=r.equipment;const nid=r.item?.id||modal.id;await reload();modal={type:'eq-view',id:nid};renderModal();toast(wasEdit?'Equipamento guardado.':'Equipamento acrescentado.');}catch(err){toast(err.message);btn.disabled=false;}});
};
function openEquipment(id){if(!(canManage()||demo))return toast('Só o administrador e o gestor podem acrescentar equipamentos.');modal={type:'eq-edit',id:id||null};renderModal();setTimeout(()=>document.querySelector('#eq-form [name=name]')?.focus(),30);}
function openEquipmentView(id){if(!equipment().some(x=>x.id===id))return;modal={type:'eq-view',id};renderModal();}
function fileToBase64(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(',')[1]||'');r.onerror=()=>rej(Error('Não foi possível ler o ficheiro.'));r.readAsDataURL(file);});}

actionHandlers.push(async(name,el)=>{
 switch(name){
  case 'eq-new':openEquipment(null);return true;
  case 'eq-view':openEquipmentView(el.dataset.id);return true;
  case 'eq-edit':modal={type:'eq-edit',id:el.dataset.id};renderModal();return true;
  case 'eq-service':{const it=equipment().find(x=>x.id===el.dataset.id);if(!it)return true;if(!await confirmDialog({title:`Revisão feita: ${it.name}?`,message:`Fica registada com a data de hoje.${it.serviceEveryMonths?` A próxima fica marcada para daqui a ${it.serviceEveryMonths} meses.`:''} Se houver uma tarefa de revisão aberta, é concluída.`,confirmLabel:'Registar'}))return true;
   const r=await api('/api/equipment/'+it.id+'/service','POST',{});if(r.equipment)store.equipment=r.equipment;await reload();toast('Revisão registada.');return true;}
  case 'eq-delete':{const it=equipment().find(x=>x.id===el.dataset.id);if(!it||!await confirmDialog({title:`Eliminar «${it.name}»?`,message:'Os documentos guardados também são apagados. As tarefas já criadas mantêm-se.',confirmLabel:'Eliminar',danger:true}))return true;
   await api('/api/equipment/'+it.id,'DELETE',{});modal=null;await reload();toast('Equipamento eliminado.');return true;}
  case 'eq-doc-pick':{const input=document.getElementById('eq-doc-file');const id=el.dataset.id;input.value='';input.onchange=async()=>{const file=input.files?.[0];if(!file)return;
    try{let data;if(/^image\//.test(file.type)&&file.size>1_500_000)data=(await resizePhoto(file,2200,0.85)).split(',')[1];else{if(file.size>8*1024*1024)throw Error('O ficheiro tem mais de 8 MB.');data=await fileToBase64(file);}
     const kind=document.getElementById('eq-doc-kind')?.value||'outro';const r=await api('/api/equipment/'+id+'/docs','POST',{name:file.name.replace(/\.[a-z0-9]+$/i,''),kind,data});if(r.equipment)store.equipment=r.equipment;await reload();toast('Documento guardado.');}catch(err){toast(err.message);}};input.click();return true;}
  case 'eq-doc-delete':{if(!await confirmDialog({title:'Remover este documento?',message:'O ficheiro é apagado do servidor.',confirmLabel:'Remover',danger:true}))return true;const r=await api(`/api/equipment/${el.dataset.id}/docs/${el.dataset.doc}`,'DELETE',{});if(r.equipment)store.equipment=r.equipment;await reload();return true;}
  case 'eq-doc-open':{const url=store.docData?.[el.dataset.doc];if(!url)return toast('Na demonstração, o documento só fica disponível neste dispositivo.'),true;const blob=await (await fetch(url)).blob();window.open(URL.createObjectURL(blob),'_blank');return true;}
 }
 return false;
});

/* ───────────── Demonstração ───────────── */
const initDemoBeforeEquipment=initDemo;
initDemo=function(){initDemoBeforeEquipment();if(Array.isArray(store.equipment))return;const t=today(),add=(n)=>CasaCore.addDays(t,n),now=new Date().toISOString();
 store.equipment=[
  {id:'eq-1',name:'Caldeira',room:'Lavandaria',category:'Aquecimento e águas quentes',brand:'Vulcano',model:'Condensação 24 kW',serviceEveryMonths:12,lastService:add(-353),nextService:add(12),techName:'Assistência Técnica Norte',techPhone:'+351 220 000 000',notes:'Pressão do circuito entre 1 e 1,5 bar. A torneira de enchimento está por baixo, à esquerda.',docs:[],createdAt:now},
  {id:'eq-2',name:'Ar condicionado da sala',room:'Sala',category:'Climatização',brand:'Daikin',model:'Perfera',serviceEveryMonths:6,lastService:add(-40),nextService:add(142),notes:'Lavar os filtros antes do verão e do inverno.',docs:[],createdAt:now},
  {id:'eq-3',name:'Máquina de lavar loiça',room:'Cozinha',category:'Eletrodomésticos',brand:'Bosch',model:'Série 6',purchaseDate:add(-140),warrantyUntil:add(590),supplier:'Loja de eletrodomésticos',serviceEveryMonths:0,docs:[],createdAt:now},
  {id:'eq-4',name:'Sistema de rega',room:'Jardim',category:'Jardim e rega',brand:'Hunter',model:'Programador X-Core',serviceEveryMonths:12,lastService:add(-240),nextService:add(125),notes:'Trocar a pilha do programador em março.',docs:[],createdAt:now}];
 if(!store.tasks.some(x=>x.equipmentId==='eq-1'))store.tasks.push({id:'eq-task-1',title:'Revisão: Caldeira',room:'Lavandaria',kind:'project',priority:'P2',status:'todo',repeat:'none',dueDate:add(12),estimatedMinutes:60,category:'Manutenção',visibility:'shared',assignedTo:null,subtasks:[],equipmentId:'eq-1',notes:'Revisão periódica (de 12 em 12 meses)\nTécnico: Assistência Técnica Norte · +351 220 000 000'});
 persistDemo();};
demoHandlers.push((p,method,b)=>{
 if(!p.startsWith('/api/equipment'))return undefined;const list=store.equipment=equipment();const parts=p.split('/').slice(3);const res=()=>({equipment:store.equipment});
 if(!parts.length){if(method==='POST'){const it={id:'eq'+Date.now(),docs:[],createdAt:new Date().toISOString(),...b};if(!it.name)throw Error('Indica o nome do equipamento.');if(it.serviceEveryMonths&&!it.nextService&&it.lastService){const d=new Date(it.lastService+'T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+it.serviceEveryMonths);it.nextService=d.toISOString().slice(0,10);}list.push(it);persistDemo();return {item:it,...res()};}return res();}
 const it=list.find(x=>x.id===parts[0]);if(!it)throw Error('Equipamento não encontrado.');
 if(parts.length===1){if(method==='PATCH'){Object.assign(it,b);if(it.serviceEveryMonths&&!it.nextService&&it.lastService){const d=new Date(it.lastService+'T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+it.serviceEveryMonths);it.nextService=d.toISOString().slice(0,10);}}if(method==='DELETE'){store.equipment=list.filter(x=>x.id!==it.id);(it.docs||[]).forEach(d=>{delete store.docData?.[d.id];});}persistDemo();return {item:it,...res()};}
 if(parts[1]==='service'){const t=today();it.lastService=t;if(it.serviceEveryMonths){const d=new Date(t+'T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+it.serviceEveryMonths);it.nextService=d.toISOString().slice(0,10);}else it.nextService='';(it.serviceLog||=[]).push({date:t,by:store.user.id});const task=store.tasks.find(x=>x.equipmentId===it.id&&x.status!=='done');if(task)task.status='done';persistDemo();return {item:it,...res()};}
 if(parts[1]==='docs'){if(method==='POST'){if(b.data.length>1_400_000)throw Error('Na demonstração, os documentos estão limitados a 1 MB (ficam guardados no browser). Na app instalada o limite é 8 MB.');const head=atob(b.data.slice(0,16));const mime=head.startsWith('%PDF')?'application/pdf':head.charCodeAt(0)===0xff?'image/jpeg':head.startsWith('\x89PNG')?'image/png':'image/webp';const d={id:'doc'+Date.now(),name:b.name||'Documento',kind:b.kind||'outro',mime,size:Math.round(b.data.length*0.75),at:new Date().toISOString(),by:store.user.id};(it.docs||=[]).push(d);store.docData={...(store.docData||{}),[d.id]:`data:${mime};base64,${b.data}`};persistDemo();return {doc:d,item:it,...res()};}
  if(method==='DELETE'){it.docs=(it.docs||[]).filter(x=>x.id!==parts[2]);delete store.docData?.[parts[2]];persistDemo();return {item:it,...res()};}}
 return res();
});
// Demonstração: concluir a tarefa de revisão marca a revisão como feita (como no servidor).
demoHandlers.push((p,method)=>{const m=p.match(/^\/api\/tasks\/([^/]+)\/complete$/);if(!m||method!=='POST')return undefined;const t=tasks().find(x=>x.id===m[1]);const it=t?.equipmentId&&equipment().find(x=>x.id===t.equipmentId);
 if(it&&t.status!=='done'){const d=today();it.lastService=d;(it.serviceLog||=[]).push({date:d,by:store.user.id});if(it.serviceEveryMonths){const n=new Date(d+'T12:00:00Z');n.setUTCMonth(n.getUTCMonth()+it.serviceEveryMonths);it.nextService=n.toISOString().slice(0,10);}else it.nextService='';}return undefined;});
