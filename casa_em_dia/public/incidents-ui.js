/* Daily Casa — Ocorrências (2.3)
 * Reportar algo que partiu, avariou, verteu ou falta, com fotografias. O administrador e o gestor são avisados,
 * podem criar a tarefa de reparação (a ocorrência fica resolvida quando a tarefa é concluída) ou resolvê-la diretamente.
 */
'use strict';
const INC_TYPES={dano:'Dano ou quebra',avaria:'Avaria',agua:'Fuga ou infiltração',seguranca:'Segurança',falta:'Falta de material',outro:'Outro'};
const INC_SEV={baixa:'Baixa',media:'Média',alta:'Alta'};
const INC_STATUS={open:'Aberta',progress:'Em resolução',resolved:'Resolvida'};
const incidents=()=>Array.isArray(store.incidents)?store.incidents:[];
const incPhotoSrc=(x,ph)=>demo?(store.photoData?.[ph.id]||''):`api/incidents/${encodeURIComponent(x.id)}/photos/${encodeURIComponent(ph.id)}`;
const incWhen=iso=>{const d=new Date(iso);return d.toLocaleDateString('pt-PT',{day:'numeric',month:'short'})+' · '+d.toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'});};
let incShowResolved=false;
function incidentCard(x){const ph=(x.photos||[])[0];return `<button type="button" class="inc-card sev-${esc(x.severity)}" data-action="inc-view" data-id="${esc(x.id)}">${ph?`<img class="inc-thumb" src="${esc(incPhotoSrc(x,ph))}" alt="" loading="lazy"/>`:`<span class="inc-ico">${ico('alert')}</span>`}<span class="inc-text"><strong>${esc(x.title)}</strong><small>${esc(INC_TYPES[x.type]||'Ocorrência')} · ${esc(roomShort(x.room||'Geral'))} · ${esc(owner(x.reportedBy).split(' ')[0])} · ${esc(relTime(x.at))}</small><span class="eq-tags"><span class="tag-s sev-tag sev-${esc(x.severity)}">Gravidade ${esc((INC_SEV[x.severity]||'').toLowerCase())}</span>${x.status!=='open'?`<span class="tag-s ${x.status==='resolved'?'lvl-ok':'lvl-warn'}">${esc(INC_STATUS[x.status])}</span>`:''}${(x.photos||[]).length>1?`<span class="tag-s">${ico('camera')}${x.photos.length}</span>`:''}</span></span>${ico('chevron','index-chev')}</button>`;}
function incidentsPage(){
 const all=incidents().slice().sort((a,b)=>b.at.localeCompare(a.at));const open=all.filter(x=>x.status==='open'),prog=all.filter(x=>x.status==='progress'),done=all.filter(x=>x.status==='resolved');
 const sec=(t,list,cls='')=>list.length?`<h2 class="group-title ${cls}">${t} <span>${list.length}</span></h2><div class="inc-list">${list.map(incidentCard).join('')}</div>`:'';
 return `<div class="header-row"><div><h1 class="page-title">Ocorrências</h1><p class="page-subtitle">Algo partiu, avariou, verteu ou falta? Reporta aqui, com fotografia.</p></div><button class="button primary" data-action="inc-new">${ico('plus-square')} Reportar</button></div>
 <button type="button" class="button inc-report-mobile" data-action="inc-new">${ico('alert')} Reportar uma ocorrência</button>
 ${sec('Abertas',open,'is-late')}${sec('Em resolução',prog)}
 ${!open.length&&!prog.length?`<div class="panel">${empty('check-square','Sem ocorrências por resolver','Quando algo partir ou avariar, reporta aqui para ficar registado e ser tratado.')}</div>`:''}
 ${done.length?`<button type="button" class="more-link" data-action="inc-toggle-resolved">${incShowResolved?'Ocultar':'Ver'} as resolvidas (${done.length}) ${ico('chevron')}</button>${incShowResolved?`<div class="inc-list">${done.map(incidentCard).join('')}</div>`:''}`:''}
 <div class="info-note">${canManage()?'Quando alguém reporta, recebes um aviso no sino (e no telemóvel, se a gravidade for alta). Podes criar a tarefa de reparação: quando for concluída, a ocorrência fica resolvida.':'O administrador e o gestor são avisados quando reportas uma ocorrência. Recebes um aviso quando ficar resolvida.'}</div>`;
}
modalRenderers['inc-edit']=holder=>{
 const x=modal.id?incidents().find(i=>i.id===modal.id):{type:'dano',severity:'media',room:'Geral'};if(!x){closeModal();return;}const draft=modal.photos||[];
 const rooms=[...new Set(['Geral',...config().rooms,x.room||'Geral'])];const eq=(store.equipment||[]);
 const seg=(name,map,cur)=>`<div class="seg-control seg-small" role="radiogroup">${Object.entries(map).map(([k,l])=>`<button type="button" role="radio" aria-checked="${cur===k}" data-action="inc-seg" data-name="${name}" data-value="${k}">${l}</button>`).join('')}</div><input type="hidden" name="${name}" value="${esc(cur)}"/>`;
 const body=`<form id="inc-form"><div class="field"><label>O que aconteceu?</label><input name="title" required maxlength="140" placeholder="Ex.: Copo partido na cozinha, mancha no sofá" value="${esc(x.title||'')}"/></div>
 <div class="field"><label>Tipo</label><select name="type">${Object.entries(INC_TYPES).map(([k,l])=>option(k,l,x.type)).join('')}</select></div>
 <div class="field"><span class="field-label">Gravidade</span>${seg('severity',INC_SEV,x.severity||'media')}<small class="field-help">Alta: precisa de atenção hoje (fuga de água, risco elétrico, porta que não fecha).</small></div>
 <div class="form-row"><div class="field"><label>Divisão</label><select name="room">${roomOptions(rooms,x.room||'Geral')}</select></div>${eq.length?`<div class="field"><label>Equipamento (opcional)</label><select name="equipmentId">${option('','Nenhum',x.equipmentId||'')}${eq.map(e=>option(e.id,e.name,x.equipmentId||'')).join('')}</select></div>`:''}</div>
 <div class="field"><label>Detalhes (opcional)</label><textarea name="description" rows="3" maxlength="2000" placeholder="Como aconteceu, o que já foi feito, se é preciso substituir…">${esc(x.description||'')}</textarea></div>
 ${modal.id?'':`<div class="field"><span class="field-label">Fotografias</span><div class="photo-grid">${draft.map((d,i)=>`<span class="photo-thumb"><img src="${d}" alt=""/><button type="button" class="icon-btn inc-ph-del" data-action="inc-draft-del" data-index="${i}" aria-label="Remover fotografia">×</button></span>`).join('')}${draft.length<6?`<button type="button" class="photo-add" data-action="inc-photo-pick">${ico('camera')}<span>Tirar ou escolher</span></button>`:''}</div><input type="file" id="inc-photo-input" accept="image/*" capture="environment" hidden /></div>`}
 <div class="modal-actions"><button type="button" class="button" data-action="close">Cancelar</button><button type="submit" class="button primary">${ico('check')} ${modal.id?'Guardar':'Reportar'}</button></div></form>`;
 holder.innerHTML=modalShell({title:modal.id?'Editar ocorrência':'Reportar ocorrência',sub:'Fica registada e o administrador e o gestor são avisados.',body,cls:'inc-modal'});
 const f=holder.querySelector('#inc-form');f.addEventListener('input',()=>{const o=f.closest('.overlay');if(o)o.dataset.dirty='1';});
 holder.querySelector('#inc-photo-input')?.addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const d=await resizePhoto(file);modal.photos=[...(modal.photos||[]),d];modal.form=Object.fromEntries(new FormData(f));renderModal();}catch(err){toast(err.message);}});
 if(modal.form)for(const [k,v] of Object.entries(modal.form)){const el=f.elements.namedItem(k);if(el&&'value'in el)el.value=v;}
 if(modal.form?.severity)f.querySelectorAll('[data-name=severity]').forEach(b=>b.setAttribute('aria-checked',String(b.dataset.value===modal.form.severity)));
 f.addEventListener('submit',async e=>{e.preventDefault();const v=Object.fromEntries(new FormData(f));const btn=f.querySelector('[type=submit]');btn.disabled=true;
  try{if(modal.id){await api('/api/incidents/'+modal.id,'PATCH',v);const id=modal.id;await reload();modal={type:'inc-view',id};renderModal();toast('Ocorrência atualizada.');}
   else{const r=await api('/api/incidents','POST',v);for(const d of (modal.photos||[]))await api(`/api/incidents/${r.incident.id}/photos`,'POST',{data:d});modal=null;await reload();toast('Ocorrência reportada. O administrador e o gestor foram avisados.');}}
  catch(err){toast(err.message);btn.disabled=false;}});
};
modalRenderers['inc-view']=holder=>{
 const x=incidents().find(i=>i.id===modal.id);if(!x){closeModal();return;}const manage=canManage()||demo;const mine=x.reportedBy===store.user.id;const task=x.taskId&&tasks().find(t=>t.id===x.taskId);const eq=x.equipmentId&&(store.equipment||[]).find(e=>e.id===x.equipmentId);
 const body=`<div class="eq-tags"><span class="tag-s sev-tag sev-${esc(x.severity)}">Gravidade ${esc((INC_SEV[x.severity]||'').toLowerCase())}</span><span class="tag-s ${x.status==='resolved'?'lvl-ok':x.status==='progress'?'lvl-warn':'lvl-bad'}">${esc(INC_STATUS[x.status])}</span></div>
 <div class="eq-fields">${[['Tipo',INC_TYPES[x.type]],['Divisão',x.room],['Reportada por',owner(x.reportedBy)],['Quando',incWhen(x.at)],eq?['Equipamento',eq.name]:null].filter(Boolean).map(([l,v])=>`<div class="eq-field"><span>${l}</span><b>${esc(v||'')}</b></div>`).join('')}</div>
 ${x.description?`<p class="eq-notes">${esc(x.description)}</p>`:''}
 ${(x.photos||[]).length?`<div class="photo-grid inc-photos">${x.photos.map(ph=>`<a class="photo-thumb" href="${esc(incPhotoSrc(x,ph))}" target="_blank" rel="noopener"><img src="${esc(incPhotoSrc(x,ph))}" alt="Fotografia da ocorrência" loading="lazy"/></a>`).join('')}</div>`:''}
 ${(mine||manage)&&(x.photos||[]).length<6&&x.status!=='resolved'?`<button type="button" class="button small" data-action="inc-photo-add" data-id="${esc(x.id)}">${ico('camera')} Acrescentar fotografia</button><input type="file" id="inc-photo-more" accept="image/*" capture="environment" hidden />`:''}
 ${task?`<div class="approval-banner">${ico('tool')}<div><strong>Tarefa de reparação</strong><small>${esc(task.title)} · ${esc(task.status==='done'?'concluída':task.assignedTo?owner(task.assignedTo):'por atribuir')}</small></div><span class="approval-actions"><button type="button" class="button small" data-action="edit" data-id="${esc(task.id)}">Abrir</button></span></div>`:''}
 ${x.status==='resolved'?`<div class="approval-banner ok">${ico('check-square')}<div><strong>Resolvida${x.resolvedBy?' por '+esc(owner(x.resolvedBy).split(' ')[0]):''}</strong><small>${esc(x.resolution||'')}${x.resolvedAt?' · '+esc(incWhen(x.resolvedAt)):''}</small></div></div>`:''}
 ${manage&&x.status!=='resolved'?`<div class="field"><label for="inc-resolution">Como ficou resolvida (opcional)</label><input id="inc-resolution" maxlength="300" placeholder="Ex.: Substituído por um igual; colado; a pagar pela empresa de limpeza"/></div>`:''}
 <div class="modal-actions">${store.user?.role==='admin'||(mine&&x.status==='open')?`<button type="button" class="button danger" data-action="inc-delete" data-id="${esc(x.id)}">${ico('trash')} Eliminar</button>`:''}<span class="spacer"></span>
 ${mine&&x.status==='open'||manage?`<button type="button" class="button" data-action="inc-edit" data-id="${esc(x.id)}">${ico('edit')} Editar</button>`:''}
 ${manage&&x.status!=='resolved'&&!task?`<button type="button" class="button" data-action="inc-task" data-id="${esc(x.id)}">${ico('tool')} Criar tarefa</button>`:''}
 ${manage&&x.status!=='resolved'?`<button type="button" class="button primary" data-action="inc-resolve" data-id="${esc(x.id)}">${ico('check')} Resolvida</button>`:''}
 ${manage&&x.status==='resolved'?`<button type="button" class="button" data-action="inc-reopen" data-id="${esc(x.id)}">Reabrir</button>`:''}</div>`;
 holder.innerHTML=modalShell({title:esc(x.title),sub:esc(`${INC_TYPES[x.type]} · ${roomShort(x.room||'Geral')}`),body,cls:'inc-modal'});
 holder.querySelector('#inc-photo-more')?.addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const d=await resizePhoto(file);await api(`/api/incidents/${x.id}/photos`,'POST',{data:d});await reload();toast('Fotografia acrescentada.');}catch(err){toast(err.message);}});
};
function openIncidentView(id){if(!incidents().some(x=>x.id===id))return;modal={type:'inc-view',id};renderModal();}
actionHandlers.push(async(name,el)=>{
 switch(name){
  case 'inc-new':quickCreateOpen=false;modal={type:'inc-edit',id:null,photos:[]};render();setTimeout(()=>document.querySelector('#inc-form [name=title]')?.focus(),30);return true;
  case 'inc-view':openIncidentView(el.dataset.id);return true;
  case 'inc-edit':modal={type:'inc-edit',id:el.dataset.id};renderModal();return true;
  case 'inc-seg':{const g=el.parentElement;g.querySelectorAll('[role=radio]').forEach(b=>b.setAttribute('aria-checked',String(b===el)));g.nextElementSibling.value=el.dataset.value;return true;}
  case 'inc-photo-pick':document.getElementById('inc-photo-input')?.click();return true;
  case 'inc-photo-add':document.getElementById('inc-photo-more')?.click();return true;
  case 'inc-draft-del':{const f=document.getElementById('inc-form');modal.form=f?Object.fromEntries(new FormData(f)):modal.form;modal.photos.splice(Number(el.dataset.index),1);renderModal();return true;}
  case 'inc-toggle-resolved':incShowResolved=!incShowResolved;render();return true;
  case 'inc-task':{const r=await api(`/api/incidents/${el.dataset.id}/task`,'POST',{});await reload();toast('Tarefa de reparação criada. Quando for concluída, a ocorrência fica resolvida.');if(r.task)openTask(r.task.id);return true;}
  case 'inc-resolve':{const note=document.getElementById('inc-resolution')?.value||'';await api('/api/incidents/'+el.dataset.id,'PATCH',{status:'resolved',resolution:note});await reload();toast('Ocorrência resolvida.');return true;}
  case 'inc-reopen':await api('/api/incidents/'+el.dataset.id,'PATCH',{status:'open'});await reload();return true;
  case 'inc-delete':{const x=incidents().find(i=>i.id===el.dataset.id);if(!x||!await confirmDialog({title:'Eliminar esta ocorrência?',message:`«${x.title}» e as fotografias são apagadas.`,confirmLabel:'Eliminar',danger:true}))return true;await api('/api/incidents/'+x.id,'DELETE',{});modal=null;await reload();toast('Ocorrência eliminada.');return true;}
 }
 return false;
});
Object.assign(NOTIF_ICON,{incident:'alert',security:'lock'});

/* ───────────── Demonstração ───────────── */
demoHandlers.push((p,method,b)=>{
 if(!p.startsWith('/api/incidents'))return undefined;store.incidents=incidents();const parts=p.split('/').slice(3);const res=()=>({incidents:store.incidents});
 if(!parts.length){const x={id:'inc'+Date.now(),status:'open',reportedBy:store.user.id,at:new Date().toISOString(),photos:[],type:'dano',severity:'media',room:'Geral',...b};if(!x.title)throw Error('Descreve em poucas palavras o que aconteceu.');store.incidents.push(x);persistDemo();return {incident:x,...res()};}
 const x=store.incidents.find(i=>i.id===parts[0]);if(!x)throw Error('Ocorrência não encontrada.');
 if(parts[1]==='photos'&&method==='POST'){if(b.data.length>900_000)throw Error('Na demonstração, as fotografias estão limitadas (ficam guardadas no browser).');const id='iph'+Date.now();(x.photos||=[]).push({id,by:store.user.id,at:new Date().toISOString()});store.photoData={...(store.photoData||{}),[id]:b.data};persistDemo();return {incident:x,...res()};}
 if(parts[1]==='task'){const t={id:'d'+Date.now(),title:'Reparar: '+x.title,room:x.room,kind:'project',priority:{alta:'P1',media:'P2',baixa:'P3'}[x.severity],status:'todo',repeat:'none',category:'Manutenção',notes:x.description||'',visibility:'shared',assignedTo:null,subtasks:[]};store.tasks.push(t);x.taskId=t.id;x.status='progress';persistDemo();return {incident:x,task:t,...res()};}
 if(method==='PATCH'){Object.assign(x,b);if(b.status==='resolved'){x.resolvedBy=store.user.id;x.resolvedAt=new Date().toISOString();}persistDemo();return {incident:x,...res()};}
 if(method==='DELETE'){store.incidents=store.incidents.filter(i=>i.id!==x.id);persistDemo();return res();}
 return res();
});
demoHandlers.push((p,method)=>{const m=p.match(/^\/api\/tasks\/([^/]+)\/complete$/);if(!m||method!=='POST')return undefined;const x=incidents().find(i=>i.taskId===m[1]&&i.status!=='resolved');if(x){x.status='resolved';x.resolvedBy=store.user.id;x.resolvedAt=new Date().toISOString();x.resolution='Resolvida com a tarefa de reparação.';}return undefined;});
const initDemoBeforeIncidents=initDemo;
initDemo=function(){initDemoBeforeIncidents();if(Array.isArray(store.incidents))return;const ago=h=>new Date(Date.now()-h*3600e3).toISOString();
 store.incidents=[{id:'inc-1',title:'Copo de vidro partido ao limpar a bancada',type:'dano',severity:'baixa',room:'Cozinha',status:'open',reportedBy:'demo-4',at:ago(3),photos:[],description:'Era um dos copos altos. Os cacos já foram apanhados.'},
  {id:'inc-2',title:'Pingo constante na torneira do WC',type:'agua',severity:'media',room:'WC Completo',status:'open',reportedBy:'demo-2',at:ago(28),photos:[]}];persistDemo();};
