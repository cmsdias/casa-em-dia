/* Casa em Dia — Aprovações (2.1)
 * - Moradores podem pedir para atribuir uma tarefa sua a um colaborador; um administrador ou gestor aprova.
 * - Opcional: o trabalho dos colaboradores fica «Por aprovar» até um administrador ou gestor confirmar.
 * As duas regras ligam-se e desligam-se em Definições › A casa › Regras da casa.
 */
'use strict';
const houseRules=()=>({residentAssign:store.settings?.rules?.residentAssign!==false,reviewCollaborators:store.settings?.rules?.reviewCollaborators===true});
const isCollab=p=>p&&(p.role==='collaborator');
// Opções do campo «Responsável»: gestores escolhem qualquer pessoa; moradores só eles próprios e (com aprovação) colaboradores.
function assignOptions(t){
 const act=people().filter(p=>p.active!==false||p.id===t.assignedTo);const role=store.user?.role;
 if(canManage()||demo)return option('','Por atribuir',t.assignedTo||'')+act.map(p=>option(p.id,p.name+(isCollab(p)?' · colaborador':''),t.assignedTo)).join('');
 const mine=act.filter(p=>p.id===store.user.id||p.id===t.assignedTo);
 const collab=role==='resident'&&houseRules().residentAssign?act.filter(p=>isCollab(p)&&p.id!==t.assignedTo):[];
 return option('','Por atribuir',t.assignedTo||'')+mine.map(p=>option(p.id,p.name,t.assignedTo)).join('')+(collab.length?`<optgroup label="Colaboradores (precisa de aprovação)">${collab.map(p=>option(p.id,p.name,t.assignRequest?.to||'')).join('')}</optgroup>`:'');
}
// Faixa no topo da tarefa: o que está pendente e os botões para decidir.
function approvalBanner(t){
 const out=[];
 if(t.status==='review'&&t.review){const by=owner(t.review.by).split(' ')[0];
  out.push(`<div class="approval-banner">${ico('check-square')}<div><strong>${esc(by)} marcou como feita</strong><small>${esc(relTime(t.review.at))}. Falta a aprovação de um administrador ou gestor.</small></div>${canManage()||demo?`<span class="approval-actions"><button type="button" class="button small" data-action="review-decide" data-id="${esc(t.id)}" data-approve="0">Devolver</button><button type="button" class="button small primary" data-action="review-decide" data-id="${esc(t.id)}" data-approve="1">${ico('check')} Aprovar</button></span>`:''}</div>`);}
 if(t.assignRequest){const rq=t.assignRequest;const mine=rq.by===store.user.id;
  out.push(`<div class="approval-banner">${ico('users')}<div><strong>${mine?'Pediste':esc(owner(rq.by).split(' ')[0])+' pediu'} para atribuir a ${esc(owner(rq.to).split(' ')[0])}</strong><small>${esc(relTime(rq.at))}. ${canManage()||demo?'Aprovas?':'À espera de um administrador ou gestor.'}</small></div><span class="approval-actions">${canManage()||demo?`<button type="button" class="button small" data-action="assign-decide" data-id="${esc(t.id)}" data-approve="0">Recusar</button><button type="button" class="button small primary" data-action="assign-decide" data-id="${esc(t.id)}" data-approve="1">${ico('check')} Aprovar</button>`:mine?`<button type="button" class="button small" data-action="assign-decide" data-id="${esc(t.id)}" data-approve="0">Retirar pedido</button>`:''}</span></div>`);}
 return out.join('');
}
const pendingApprovals=()=>tasks().filter(t=>(t.status==='review'&&t.review)||t.assignRequest);
// Cartão em «Hoje» para o administrador e o gestor.
function approvalsCard(){
 if(!(canManage()||demo))return '';const list=pendingApprovals();if(!list.length)return '';
 return `<h2 class="group-title is-approval">Para aprovar <span>${list.length}</span></h2><div class="panel task-group approvals">${list.slice(0,6).map(t=>{const rv=t.status==='review';const who=rv?owner(t.review.by):owner(t.assignRequest.by);const what=rv?`${who.split(' ')[0]} concluiu`:`${who.split(' ')[0]} pede para atribuir a ${owner(t.assignRequest.to).split(' ')[0]}`;
  return `<div class="approval-row"><button type="button" class="plan-detail" data-action="edit" data-id="${esc(t.id)}"><b>${esc(t.title)}</b><small>${esc(what)} · ${esc(t.room||'Geral')}</small></button><span class="approval-actions"><button type="button" class="icon-btn" data-action="${rv?'review':'assign'}-decide" data-id="${esc(t.id)}" data-approve="0" aria-label="${rv?'Devolver':'Recusar'}: ${esc(t.title)}">×</button><button type="button" class="button small primary" data-action="${rv?'review':'assign'}-decide" data-id="${esc(t.id)}" data-approve="1">${ico('check')} Aprovar</button></span></div>`;}).join('')}</div>`;
}
// Regras da casa (Definições › A casa).
function rulesCard(){
 const r=houseRules();const dis=canManage()||demo?'':'disabled';
 const row=(k,title,desc)=>`<div class="pref-row rule-row"><div><span class="field-label" id="rule-${k}">${title}</span><small class="appearance-state">${desc}</small></div><button type="button" class="switch" role="switch" aria-checked="${r[k]}" aria-labelledby="rule-${k}" data-action="rule-toggle" data-rule="${k}" ${dis}><span></span></button></div>`;
 return `<div class="settings-card"><h3>Regras da casa</h3><p>Decide o que precisa da aprovação de um administrador ou gestor.</p><div class="rules-list">${row('residentAssign','Moradores podem pedir para atribuir tarefas a colaboradores','O pedido fica pendente até ser aprovado.')}${row('reviewCollaborators','O trabalho dos colaboradores precisa de aprovação','As tarefas que concluem ficam «Por aprovar».')}</div></div>`;
}
actionHandlers.push(async(name,el)=>{if(name!=='rule-toggle')return false;const k=el.dataset.rule;const on=el.getAttribute('aria-checked')!=='true';const rules={...houseRules(),[k]:on};el.setAttribute('aria-checked',String(on));
 try{const r=await api('/api/settings','PATCH',{rules});if(r.settings)store.settings=r.settings;await reload();toast(k==='reviewCollaborators'?(on?'O trabalho dos colaboradores passa a precisar de aprovação.':'O trabalho dos colaboradores deixa de precisar de aprovação.'):(on?'Os moradores podem pedir atribuições a colaboradores.':'Os moradores deixam de poder pedir atribuições.'));}catch(err){el.setAttribute('aria-checked',String(!on));toast(err.message);}return true;});

actionHandlers.push(async(name,el)=>{
 if(name!=='review-decide'&&name!=='assign-decide')return false;
 const t=tasks().find(x=>x.id===el.dataset.id);if(!t)return true;const approve=el.dataset.approve==='1';const review=name==='review-decide';
 let note='';if(review&&!approve){if(!await confirmDialog({title:'Devolver esta tarefa?',message:`«${t.title}» volta para a lista de ${owner(t.review.by).split(' ')[0]}, que recebe um aviso.`,confirmLabel:'Devolver'}))return true;}
 await api(`/api/tasks/${t.id}/${review?'review':'assign-request'}`,'POST',{approve,note});
 await reload();toast(review?(approve?'Trabalho aprovado.':'Tarefa devolvida.'):(approve?`Atribuída a ${owner(tasks().find(x=>x.id===t.id)?.assignedTo).split(' ')[0]}.`:'Pedido de atribuição retirado.'));return true;
});
Object.assign(NOTIF_ICON,{approval:'check-square'});

/* ───────────── Demonstração ───────────── */
const initDemoBeforeApprovals=initDemo;
initDemo=function(){initDemoBeforeApprovals();if(store.demoApprovals)return;
 if(!store.people.some(p=>p.id==='demo-4'))store.people.push({id:'demo-4',name:'Marta (colaboradora)',username:'marta',role:'collaborator'});
 const ago=h=>new Date(Date.now()-h*3600e3).toISOString();
 const a=store.tasks.find(x=>x.title==='Limpar a lareira');if(a)a.assignRequest={to:'demo-4',by:'demo-2',at:ago(2)};
 const b=store.tasks.find(x=>x.title==='Afinar o duche');if(b){b.assignedTo='demo-4';b.status='review';b.review={by:'demo-4',at:ago(1),prev:'todo'};}
 store.settings.rules={residentAssign:true,reviewCollaborators:true};store.demoApprovals=true;persistDemo();};
demoHandlers.push((p,method,b)=>{
 let m=p.match(/^\/api\/tasks\/([^/]+)\/(review|assign-request)$/);
 if(m){const t=tasks().find(x=>x.id===m[1]);if(!t)throw Error('Tarefa não encontrada.');
  if(m[2]==='review'){const rv=t.review;delete t.review;if(b.approve){store.history.push({id:'h'+Date.now(),taskId:t.id,title:t.title,by:rv?.by,at:new Date().toISOString()});t.status=t.kind==='routine'&&t.repeat!=='none'?'todo':'done';if(t.status==='todo')t.dueDate=nextDemoDate(t.dueDate,t.repeat);}else t.status=rv?.prev||'todo';}
  else{const rq=t.assignRequest;delete t.assignRequest;if(b.approve&&rq)t.assignedTo=rq.to;}
  persistDemo();return {task:t};}
 if(p==='/api/settings'&&method==='PATCH'&&b&&'rules'in b&&Object.keys(b).length===1){store.settings={...store.settings,rules:b.rules};if(!b.rules.reviewCollaborators)tasks().forEach(t=>{if(t.status==='review'){t.status=t.review?.prev||'todo';delete t.review;}});persistDemo();return {settings:store.settings};}
 return undefined;
});
