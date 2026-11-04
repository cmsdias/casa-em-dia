'use strict';
/* ───────────── Esperas: abertura, barra de carregamento e botões ocupados ───────────── */
// Abertura: o símbolo desenha-se num só traço. Só fica visível se o arranque passar 0,3 s;
// uma vez visível, fica até o traço terminar, para não ser cortado a meio.
(function splashControl(){
 const el=document.getElementById('splash');if(!el)return;
 if(window.__CASA_DEMO__){try{if(!sessionStorage.getItem('casa-splash')){sessionStorage.setItem('casa-splash','1');el.classList.add('instant');}else{el.remove();return;}}catch{el.remove();return;}}
 const shownAt=el.classList.contains('instant')?0:300,minEnd=el.classList.contains('instant')?2000:1500;
 const hide=()=>{if(!el.isConnected||el.classList.contains('out'))return;const t=performance.now();if(t<shownAt){el.remove();return;}setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),320);},Math.max(0,minEnd-t));};
 const app=document.getElementById('app');new MutationObserver((m,obs)=>{if(app.childElementCount){obs.disconnect();hide();}}).observe(app,{childList:true});
 setTimeout(hide,8000);
})();
// Barra dourada no topo enquanto a app vai buscar dados (só se demorar mais de 0,2 s).
const topLoad=document.createElement('div');topLoad.className='topbar-load';topLoad.setAttribute('aria-hidden','true');document.body.appendChild(topLoad);
let loadCount=0,loadTimer=null;
function loadStart(){if(++loadCount===1){clearTimeout(loadTimer);loadTimer=setTimeout(()=>topLoad.classList.add('on'),200);}}
function loadEnd(){loadCount=Math.max(0,loadCount-1);if(!loadCount){clearTimeout(loadTimer);topLoad.classList.remove('on');}}
// Botões a guardar: o botão tocado mostra três pontos dourados e fica bloqueado até a gravação terminar.
let lastTrigger=null,lastTriggerAt=0;
const markTrigger=b=>{if(b&&b.matches?.('button')){lastTrigger=b;lastTriggerAt=performance.now();}};
document.addEventListener('click',e=>markTrigger(e.target.closest?.('button')),true);
document.addEventListener('submit',e=>markTrigger(e.submitter||e.target.querySelector('[type=submit]')),true);
function busyStart(){const b=lastTrigger;if(!b||!b.isConnected||performance.now()-lastTriggerAt>2000||b.offsetWidth<64)return null;
 b._busy=(b._busy||0)+1;if(b._busy>1)return b;
 b._busyTimer=setTimeout(()=>{if(!b.isConnected||!b._busy)return;b._busyState={html:b.innerHTML,w:b.style.width,dis:b.disabled};b.style.width=b.offsetWidth+'px';b.classList.add('is-busy');b.setAttribute('aria-busy','true');b.disabled=true;b.innerHTML='<span class="busy-dots" role="status" aria-label="A guardar"><i></i><i></i><i></i></span>';},150);
 return b;}
function busyEnd(b){if(!b)return;b._busy=Math.max(0,(b._busy||1)-1);if(b._busy)return;clearTimeout(b._busyTimer);const st=b._busyState;if(!st)return;b._busyState=null;b.classList.remove('is-busy');b.removeAttribute('aria-busy');b.disabled=st.dis;b.innerHTML=st.html;b.style.width=st.w;}
const apiCore=api;
// eslint-disable-next-line no-global-assign
api=async function(endpoint,method='GET',data){const write=method!=='GET';const b=write?busyStart():null;if(!write)loadStart();
 try{if(demo&&write)await new Promise(r=>setTimeout(r,450));return await apiCore(endpoint,method,data);}finally{if(write)busyEnd(b);else loadEnd();}};
const skeletonLines=(n=3)=>`<div class="sk-group" aria-hidden="true">${Array.from({length:n},(_,i)=>`<div class="sk sk-line" style="width:${[92,74,83,66][i%4]}%"></div>`).join('')}</div>`;

// Casa em Dia 1.7 — funcionalidades acrescentadas ao núcleo (app.js):
// atualização automática, cópias de segurança, calendário sazonal, compras rápidas,
// rotação de rotinas, fotografias nas tarefas e Home Assistant.
// Partilha o estado global de app.js (store, page, modal, render, api…), carregado antes deste ficheiro.

/* ───────────── Atualização automática entre pessoas ───────────── */
let syncRev=null,syncPending=false,formDirty=false;
const SYNC_MS=10_000;
function syncBusy(){const a=document.activeElement;return !!(modal||quickCreateOpen||moreOpen||formDirty||document.getElementById('confirm-holder')||document.getElementById('crop-holder')||document.getElementById('photo-viewer')||(a&&a.matches?.('input,textarea,select')&&a.closest('#content')));}
function syncBanner(show){let el=document.getElementById('sync-banner');if(!show){el?.remove();return;}if(el)return;el=document.createElement('div');el.id='sync-banner';el.className='sync-banner';el.setAttribute('role','status');el.innerHTML=`<span>${ico('refresh')} Há alterações de outras pessoas.</span><button type="button" data-action="sync-apply">Atualizar</button>`;document.body.appendChild(el);}
async function syncApply(){const y=window.scrollY;syncPending=false;syncBanner(false);await load();render();window.scrollTo(0,y);}
async function syncCheck(){
 if(demo||!store.user||document.hidden)return;
 let j;try{const r=await fetch('api/rev',{credentials:'same-origin',headers:{Accept:'application/json'},cache:'no-store'});if(r.status===401){store.user=null;renderAuth('login','A sessão terminou. Volta a entrar.');return;}if(!r.ok)return;j=await r.json();if(offline){offline=false;render();}}catch{return;}
 if(!syncRev){syncRev=j.rev;return;}
 if(j.rev===syncRev){if(syncPending&&!syncBusy())syncApply().catch(()=>{});return;}
 if(syncBusy()){syncPending=true;syncBanner(true);return;}
 await syncApply().catch(()=>{});
}
setInterval(()=>syncCheck(),SYNC_MS);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncCheck();});
document.addEventListener('input',e=>{if(e.target.closest?.('#content form'))formDirty=true;},true);

/* ───────────── Utilitários ───────────── */
const REPEAT_EXTRA={quarterly:'Trimestral',yearly:'Anual'};Object.assign(repeatLabels,REPEAT_EXTRA);
const fmtBytes=n=>n>=1048576?(n/1048576).toLocaleString('pt-PT',{maximumFractionDigits:1})+' MB':Math.max(1,Math.round(n/1024))+' KB';
const fmtDateTime=iso=>{const d=new Date(iso);return d.toLocaleDateString('pt-PT',{day:'numeric',month:'short',year:'numeric'})+' · '+d.toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'});};
async function copyText(text,msg='Copiado.'){try{await navigator.clipboard.writeText(text);toast(msg);}catch{toast('Não foi possível copiar automaticamente.');}}
function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500);}

/* ───────────── Cópias de segurança (Definições, administrador) ───────────── */
const BACKUP_REASONS={auto:'Automática',manual:'Manual','pre-restore':'Antes de restaurar',upload:'Carregada',upgrade:'Antes da atualização'};
let backupsData=null;
function backupsCard(){
 if(!isAdmin())return '';
 if(!backupsData){queueMicrotask(loadBackups);return `<div class="settings-card" id="backups-card" aria-busy="true"><h3>Cópias de segurança</h3>${skeletonLines(4)}</div>`;}
 const list=backupsData.backups||[];const auto=list.find(b=>b.reason==='auto');
 return `<div class="settings-card" id="backups-card"><h3>Cópias de segurança</h3><p>É feita uma cópia automática por dia (ficam as últimas 14). Antes de restaurar uma cópia, o estado atual é sempre guardado.${demo?' <b>Na demonstração, as cópias são apenas ilustrativas.</b>':''}</p>
 <div class="backup-status">${ico('check-square')}<span>${auto?`Última cópia automática: <b>${esc(fmtDateTime(auto.createdAt))}</b>`:'Ainda não há cópias automáticas.'}</span></div>
 <div class="backup-actions"><button class="button primary" type="button" data-action="backup-create">${ico('download')} Criar cópia agora</button><button class="button" type="button" data-action="backup-upload">${ico('plus-square')} Carregar ficheiro</button><input type="file" id="backup-file" accept=".json,application/json" hidden/></div>
 <div class="backup-list">${list.slice(0,10).map(b=>`<div class="backup-row"><div><strong>${esc(fmtDateTime(b.createdAt))}</strong><small>${esc(BACKUP_REASONS[b.reason]||b.reason)} · ${esc(fmtBytes(b.size))}</small></div><div class="backup-row-actions"><button class="button small" type="button" data-action="backup-download" data-name="${esc(b.name)}" aria-label="Descarregar cópia de ${esc(fmtDateTime(b.createdAt))}">${ico('download')}</button><button class="button small" type="button" data-action="backup-restore" data-name="${esc(b.name)}">Restaurar</button></div></div>`).join('')||'<p class="muted">Sem cópias guardadas.</p>'}</div>
 <p class="field-help">As fotografias das tarefas não entram nestes ficheiros; ficam incluídas nas cópias de segurança do Home Assistant.</p></div>`;
}
async function loadBackups(){try{backupsData=await api('/api/backups');}catch(e){backupsData={backups:[]};}const el=document.getElementById('backups-card');if(el&&page==='settings')el.outerHTML=backupsCard();}

/* ───────────── Home Assistant (Definições, administrador) ───────────── */
let haData=null;
function haCard(){
 if(!isAdmin())return '';
 if(!haData){queueMicrotask(loadHa);return `<div class="settings-card" id="ha-card" aria-busy="true"><h3>Home Assistant</h3>${skeletonLines(3)}</div>`;}
 const h=haData;
 if(!h.available)return `<div class="settings-card" id="ha-card"><h3>Home Assistant</h3><p>As notificações e os sensores funcionam apenas na app instalada no Home Assistant. Nesta instalação, a ligação não está disponível.</p></div>`;
 const act=people().filter(p=>p.active!==false);
 const base=h.hostname?`http://${h.hostname}:3000`:'http://<endereço-do-add-on>:3000';
 const yaml=`rest_command:\n  casa_em_dia_tarefa:\n    url: "${base}/api/integracao/tarefas"\n    method: POST\n    headers:\n      Authorization: "Bearer ${h.token}"\n    content_type: "application/json"\n    payload: '{"title": "{{ titulo }}", "room": "{{ divisao }}", "assignedTo": "{{ pessoa }}"}'`;
 return `<div class="settings-card ha-card" id="ha-card"><h3>Home Assistant</h3><p>${h.demo?'<b>Demonstração:</b> na app instalada, esta secção liga-se ao teu Home Assistant.':'Ligado ao Home Assistant desta casa.'}</p>
 <form id="ha-form" class="ha-form">
 <fieldset class="ha-section"><legend>Notificações no telemóvel</legend><p class="field-help">Escolhe o telemóvel de cada pessoa (a app Home Assistant tem de estar instalada nele).${h.servicesError?' Não foi possível obter a lista de telemóveis: '+esc(h.servicesError):''}</p>
 ${act.map(p=>`<div class="ha-person">${avatarHtml(p,'mini')}<span class="ha-person-name">${esc(p.name)}</span><select class="select-control" name="notify:${esc(p.id)}" aria-label="Telemóvel de ${esc(p.name)}">${option('','Sem notificações',h.notify[p.id]||'')}${[...new Set([...(h.services||[]),...(h.notify[p.id]?[h.notify[p.id]]:[])])].map(s=>option(s,s.replace(/^mobile_app_/,'').replace(/_/g,' '),h.notify[p.id]||'')).join('')}</select><button type="button" class="button small" data-action="ha-test" data-id="${esc(p.id)}" ${h.notify[p.id]?'':'disabled'}>Testar</button></div>`).join('')}
 <label class="check-line"><input type="checkbox" name="assigned" ${h.events.assigned?'checked':''}/> Avisar quando alguém recebe uma tarefa</label>
 <label class="check-line"><input type="checkbox" name="daily" ${h.events.daily?'checked':''}/> Resumo diário das tarefas para hoje e atrasadas</label><label class="check-line ha-time">Enviar às <input type="time" name="dailyTime" value="${esc(h.dailyTime)}" class="inline-time" aria-label="Hora do resumo diário"/></label></fieldset>
 <fieldset class="ha-section"><legend>Sensores</legend><label class="check-line"><input type="checkbox" name="sensors" ${h.sensors?'checked':''}/> Publicar o estado da casa como sensores</label><p class="field-help">Ficam disponíveis para cartões e automações (as tarefas privadas nunca são incluídas):</p><ul class="ha-entities">${(h.sensorEntities||[]).map(e=>`<li><code>${esc(e)}</code></li>`).join('')}</ul></fieldset>
 <div class="manager-actions"><span>As alterações só são aplicadas quando guardares.</span><button class="button primary" type="submit">Guardar</button></div></form>
 <details class="ha-section ha-auto"><summary><span class="disc-ico" aria-hidden="true"></span>Criar tarefas a partir de automações</summary><p class="field-help">Por exemplo: quando a máquina de lavar termina, criar «Estender a roupa». Acrescenta isto a <code>configuration.yaml</code> e chama <code>rest_command.casa_em_dia_tarefa</code> nas automações.</p><pre class="code-block">${esc(yaml)}</pre><div class="backup-actions"><button class="button small" type="button" data-action="ha-copy-yaml">Copiar configuração</button><button class="button small" type="button" data-action="ha-token">Gerar novo token</button></div><p class="field-help">O token dá acesso à criação de tarefas e de produtos de compras. Se o partilhares por engano, gera um novo.</p></details></div>`;
}
async function loadHa(){try{haData=await api('/api/ha');}catch(e){haData={available:false};}const el=document.getElementById('ha-card');if(el&&page==='settings')el.outerHTML=haCard();}
document.addEventListener('submit',async e=>{
 if(e.target.id==='ha-form'){e.preventDefault();const f=e.target;const notify={};f.querySelectorAll('select[name^="notify:"]').forEach(s=>{notify[s.name.slice(7)]=s.value;});
  const body={notify,events:{assigned:f.elements.assigned.checked,daily:f.elements.daily.checked},dailyTime:f.elements.dailyTime.value||'08:30',sensors:f.elements.sensors.checked};
  try{await api('/api/ha','PATCH',body);haData=null;formDirty=false;await loadHa();toast('Definições do Home Assistant guardadas.');}catch(err){toast(err.message);}}
});

/* ───────────── Calendário sazonal ───────────── */
let calMonth=new Date().getMonth()+1,calEditing=false;
const seasonal=()=>Array.isArray(store.seasonal)?store.seasonal:[];
function calYearFor(m){const now=new Date();return m>=now.getMonth()+1?now.getFullYear():now.getFullYear()+1;}
function seasonalTaskFor(item,m){const key=`${item.id}:${calYearFor(m)}-${String(m).padStart(2,'0')}`;return tasks().find(t=>t.seasonalKey===key);}
function seasonalCard(item,m,compact=false){const t=seasonalTaskFor(item,m);
 return `<article class="season-item ${t?'is-created':''}"><div class="season-art room-art art-${esc(roomArt(item.room))}" aria-hidden="true"></div><div class="season-body"><strong>${esc(item.title)}</strong><small>${esc(roomShort(item.room))}${item.minutes?` · ${esc(fmtMinutes(item.minutes))}`:''}${item.months.length>1?` · também em ${esc(item.months.filter(x=>x!==m).map(x=>MONTHS_FULL[x-1]).join(', '))}`:''}</small>${!compact&&item.notes?`<p>${esc(item.notes)}</p>`:''}</div><div class="season-actions">${t?`<button type="button" class="button small" data-action="edit" data-id="${esc(t.id)}">${t.status==='done'?ico('check')+' Feito':ico('check-square')+' Ver tarefa'}</button>`:`<button type="button" class="button small primary" data-action="season-task" data-id="${esc(item.id)}" data-month="${m}" ${store.user?.role==='collaborator'?'disabled':''}>${ico('plus-square')} Criar tarefa</button>`}${calEditing&&(canManage()||demo)&&!compact?`<button type="button" class="button small" data-action="season-edit" data-id="${esc(item.id)}" aria-label="Editar ${esc(item.title)}">${ico('edit')}</button>`:''}</div></article>`;}
function calendarPage(){
 const all=seasonal(),active=all.filter(x=>x.active!==false),inactive=all.filter(x=>x.active===false);
 const counts=m=>active.filter(x=>x.months.includes(m)).length;const nowM=new Date().getMonth()+1;
 const list=active.filter(x=>x.months.includes(calMonth));
 return `${head('Calendário da casa','Manutenção ao longo do ano: o que fazer em cada mês, na casa e no jardim.',false)}
 <div class="month-strip" role="tablist" aria-label="Meses">${MONTHS_PT.map((l,i)=>{const m=i+1;return `<button type="button" role="tab" class="month-chip ${m===calMonth?'active':''} ${m===nowM?'is-now':''}" data-action="cal-month" data-month="${m}" aria-selected="${m===calMonth}"><span>${l}</span><small>${counts(m)||'·'}</small></button>`;}).join('')}</div>
 <div class="season-head"><div><h2 class="section-title">${MONTHS_FULL[calMonth-1][0].toUpperCase()+MONTHS_FULL[calMonth-1].slice(1)} ${calYearFor(calMonth)}</h2><p class="section-sub">${list.length} ${list.length===1?'trabalho sugerido':'trabalhos sugeridos'}${calMonth===nowM?' · este mês':''}. «Criar tarefa» acrescenta-o às Tarefas com prazo até ao fim do mês.</p></div>${canManage()||demo?`<div class="season-tools"><button type="button" class="button" data-action="season-new">${ico('plus-square')} Novo trabalho</button><button type="button" class="button ${calEditing?'primary':''}" data-action="season-editing" aria-pressed="${calEditing}">${ico('edit')} ${calEditing?'Concluir edição':'Editar'}</button></div>`:''}</div>
 <div class="season-list">${list.map(x=>seasonalCard(x,calMonth)).join('')||empty('calendar','Nada previsto para este mês','Acrescenta um trabalho ou escolhe outro mês.')}</div>
 ${inactive.length&&(canManage()||demo)?`<details class="season-inactive"><summary><span class="disc-ico" aria-hidden="true"></span>${inactive.length} ${inactive.length===1?'trabalho desativado':'trabalhos desativados'}</summary>${inactive.map(x=>`<div class="shopping-line"><span>${esc(x.title)} <small class="muted">· ${esc(x.months.map(m=>MONTHS_PT[m-1]).join(', '))}</small></span><button type="button" class="button small" data-action="season-toggle" data-id="${esc(x.id)}">Reativar</button></div>`).join('')}</details>`:''}`;
}
function seasonalDashboard(){if(store.user?.role==='collaborator')return '';const m=new Date().getMonth()+1;const items=seasonal().filter(x=>x.active!==false&&x.months.includes(m));const pending=items.filter(x=>!seasonalTaskFor(x,m));if(!items.length)return '';
 return `<section class="season-dash"><div class="season-dash-head"><div><span class="eyebrow">CALENDÁRIO DA CASA</span><h2 class="editorial-title">${esc(MONTHS_FULL[m-1][0].toUpperCase()+MONTHS_FULL[m-1].slice(1))}, <em>na casa e no jardim.</em></h2></div><button type="button" class="rooms-hint rooms-explore" data-action="nav" data-page="calendar">Ver o ano <span aria-hidden="true">↗</span></button></div><div class="season-list compact">${(pending.length?pending:items).slice(0,3).map(x=>seasonalCard(x,m,true)).join('')}</div>${pending.length>3?`<p class="muted season-more">E mais ${pending.length-3} por planear este mês.</p>`:''}</section>`;}
function seasonModal(item){const it=item||{title:'',months:[calMonth],room:'Geral',category:'Manutenção',minutes:60,notes:'',active:true};const editing=!!item;
 const h=$('#modal-holder');h.innerHTML=`<div class="overlay" data-action="overlay"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="season-title"><div class="modal-head"><div><h2 id="season-title">${editing?'Editar trabalho sazonal':'Novo trabalho sazonal'}</h2><p class="modal-sub">Aparece no calendário nos meses escolhidos.</p></div><button type="button" class="close" data-action="close" aria-label="Fechar">×</button></div><div class="modal-body"><form id="season-form"><div class="field"><label>Trabalho</label><input name="title" required maxlength="140" value="${esc(it.title)}" placeholder="Ex.: Limpar caleiras"/></div><fieldset class="access-days"><legend>Meses</legend><div class="month-picks">${MONTHS_PT.map((l,i)=>`<label class="day-chip-check"><input type="checkbox" name="months" value="${i+1}" ${it.months.includes(i+1)?'checked':''}/><span>${l}</span></label>`).join('')}</div></fieldset><div class="form-row"><div class="field"><label>Divisão / Área</label><select name="room">${option('Geral','Geral',it.room)}${roomOptions(config().rooms,it.room)}</select></div><div class="field"><label>Duração (min)</label><input name="minutes" type="number" min="0" max="10080" step="5" value="${esc(it.minutes??'')}"/></div></div><div class="field"><label>Categoria</label><select name="category">${[...new Set([...config().categories,it.category])].map(c=>option(c,c,it.category)).join('')}</select></div><div class="field"><label>Notas</label><textarea name="notes" maxlength="500" rows="3" placeholder="Como fazer, materiais, contactos…">${esc(it.notes||'')}</textarea></div><div class="modal-actions">${editing?`<button type="button" class="button danger" data-action="season-toggle" data-id="${esc(it.id)}">${it.active===false?'Reativar':'Desativar'}</button><button type="button" class="button danger" data-action="season-delete" data-id="${esc(it.id)}">${ico('trash')} Eliminar</button>`:''}<span class="spacer"></span><button type="button" class="button" data-action="close">Cancelar</button><button type="submit" class="button primary">${ico('check')} Guardar</button></div></form></div></div></div>`;
 modal={type:'season',item:it};associateLabels(h);
 $('#season-form').addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(e.target);const body={title:fd.get('title'),months:fd.getAll('months').map(Number),room:fd.get('room'),category:fd.get('category'),minutes:fd.get('minutes')===''?null:Number(fd.get('minutes')),notes:fd.get('notes')};if(!body.months.length)return toast('Escolhe pelo menos um mês.');
  try{if(editing)await api('/api/seasonal/'+it.id,'PATCH',body);else await api('/api/seasonal','POST',body);modal=null;await reload();toast(editing?'Trabalho atualizado.':'Trabalho acrescentado ao calendário.');}catch(err){toast(err.message);}});
 setTimeout(()=>h.querySelector('[name=title]')?.focus(),30);}

/* ───────────── Compras rápidas ───────────── */
const SHOP_CATEGORIES=['Alimentação','Limpeza','Higiene','Casa','Jardim','Outros'];
const SHOP_RULES=[[/leite|pão|ovos|queijo|fiambre|iogurte|manteiga|fruta|banana|maçã|laranja|tomate|alface|batata|cebola|alho|arroz|massa|azeite|óleo|açúcar|sal\b|farinha|café|chá|cereais|bolachas|carne|frango|peixe|atum|feijão|grão|legumes|vinho|cerveja|água|sumo|chocolate|bacalhau|natas|congelad/,'Alimentação'],[/detergente|lixívia|esfregão|esponja|desengordurante|lava.?loiça|amaciador|limpa|sacos do lixo|papel de cozinha|pastilhas|vinagre de limpeza|sal para a máquina/,'Limpeza'],[/champô|gel de banho|sabonete|pasta de dentes|escova de dentes|desodorizante|papel higiénico|lenços|creme|algodão|pensos|lâminas/,'Higiene'],[/lâmpada|pilhas|fita|parafuso|cola|vela|filtro|tomada|extensão/,'Casa'],[/adubo|substrato|terra|semente|vaso|planta|inseticida|herbicida|mangueira/,'Jardim']];
function guessShopCategory(title){const t=String(title).toLocaleLowerCase('pt-PT');const known=(store.shoppingFrequent||[]).find(x=>x.title.toLocaleLowerCase('pt-PT')===t);if(known?.category)return known.category;return SHOP_RULES.find(([re])=>re.test(t))?.[1]||'Outros';}
// «2 leite», «leite x2», «3 kg batatas», «1 pacote de café», «0,5kg queijo» → quantidade + unidade + produto.
function parseShopInput(raw){let s=String(raw||'').trim().replace(/\s+/g,' ');let quantity='1',unit='';
 let m=/^(\d+(?:[.,]\d+)?)\s*([A-Za-zÀ-ÿ.]+)?\s+(.+)$/.exec(s);
 if(m){const u=m[2]?CasaUnits.unitFromWord(m[2]):'';if(m[2]&&!u){quantity=m[1];s=`${m[2]} ${m[3]}`;}else{quantity=m[1];unit=u==='un'&&/^x$/i.test(m[2]||'')?'':u;s=m[3];}s=s.replace(/^de\s+/i,'');}
 else if((m=/^(\d+(?:[.,]\d+)?)\s*([A-Za-zÀ-ÿ.]+)$/.exec(s))&&!CasaUnits.unitFromWord(m[2])){quantity=m[1];s=m[2];}
 else if((m=/^(.+?)\s*(?:x\s*(\d+)|(\d+)\s*x)$/i.exec(s))){s=m[1];quantity=m[2]||m[3];}
 return {title:s.charAt(0).toUpperCase()+s.slice(1),quantity:quantity.replace('.',','),unit};}
const unitOptions=sel=>option('','Sem unidade',sel||'')+CasaUnits.UNITS.map(([k,one])=>option(k,one,sel||'')).join('');
// Campos de quantidade, unidade e categoria (janela «+» e edição de um produto).
function shopQtyFields(it,withCategory=true,lockOthers=false){const cats=[...new Set([...SHOP_CATEGORIES,...(it.category?[it.category]:[])])];
 return `<div class="form-row shop-qty-row"><div class="field"><label>Quantidade</label><div class="qty-stepper"><button type="button" class="icon-btn" data-action="qty-step" data-step="-1" aria-label="Menos">−</button><input name="quantity" inputmode="decimal" maxlength="20" value="${esc(it.quantity||'1')}"/><button type="button" class="icon-btn" data-action="qty-step" data-step="1" aria-label="Mais">+</button></div></div><div class="field"><label>Unidade</label><select name="unit">${unitOptions(it.unit)}</select></div></div>${withCategory?`<div class="field"><label>Categoria</label><select name="category" ${lockOthers?'disabled':''}>${option('','Automática',it.category||'')}${cats.map(c=>option(c,c,it.category||'')).join('')}</select></div>`:''}`;}
function stepQty(el){const input=el.closest('.qty-stepper')?.querySelector('input');if(!input)return;const n=Number(String(input.value).replace(',','.'));const step=Number(el.dataset.step);const unit=input.form?.elements.unit?.value;const inc=['kg','L'].includes(unit)&&n<2?0.5:['g','ml'].includes(unit)?100:1;let v=(Number.isFinite(n)?n:0)+step*inc;if(v<=0)v=inc;input.value=String(Math.round(v*1000)/1000).replace('.',',');}
function editShopItem(id){const it=shopping().find(x=>x.id===id);if(!it)return;const mine=canManage()||it.createdBy===store.user?.id||demo;
 const h=$('#modal-holder');modal={type:'shop-edit'};
 h.innerHTML=`<div class="overlay" data-action="overlay"><div class="modal quick-modal" role="dialog" aria-modal="true" aria-labelledby="shop-edit-title"><div class="modal-head"><div><h2 id="shop-edit-title">Editar produto</h2>${mine?'':'<p class="modal-sub">Podes acertar a quantidade e a unidade. O resto só quem o acrescentou.</p>'}</div><button type="button" class="close" data-action="close" aria-label="Fechar">×</button></div><div class="modal-body"><form id="shop-edit-form"><div class="field"><label>Produto</label><input name="title" required maxlength="180" value="${esc(it.title)}" ${mine?'':'disabled'}/></div>${shopQtyFields(it,true,!mine)}<div class="field"><label>Notas</label><input name="notes" maxlength="500" value="${esc(it.notes||'')}" placeholder="Ex.: marca, tamanho, sem lactose" ${mine?'':'disabled'}/></div><div class="modal-actions">${mine?`<button type="button" class="button danger" data-action="shopping-delete" data-id="${esc(it.id)}">${ico('trash')} Eliminar</button>`:''}<span class="spacer"></span><button type="button" class="button" data-action="close">Cancelar</button><button type="submit" class="button primary">${ico('check')} Guardar</button></div></form></div></div></div>`;
 associateLabels(h);const form=$('#shop-edit-form');
 form.addEventListener('submit',async e=>{e.preventDefault();const v=Object.fromEntries(new FormData(form));const q=String(v.quantity||'').trim();if(q&&!/^\d{1,5}([.,]\d{1,3})?$/.test(q))return toast('Quantidade inválida: usa um número, por exemplo 2 ou 0,5.');
  const body={quantity:q||'1',unit:v.unit||''};if(mine){body.title=v.title;body.notes=v.notes;body.category=v.category||guessShopCategory(v.title);}
  try{await api('/api/shopping/'+it.id,'PATCH',body);modal=null;h.innerHTML='';await reload();toast('Produto atualizado.');}catch(err){toast(err.message);}});
 setTimeout(()=>form.querySelector('[name=quantity]')?.select(),30);}
function shoppingQuickHtml(){const open=new Set(shopping().filter(x=>!x.purchased).map(x=>x.title.toLocaleLowerCase('pt-PT')));const usual=(store.shoppingFrequent||[]).filter(x=>!open.has(x.title.toLocaleLowerCase('pt-PT'))).slice(0,12);const bought=shopping().filter(x=>x.purchased).length;
 return `<form class="shop-quick" id="shopping-quick" autocomplete="off"><label class="search">${ico('cart')}<input name="product" required maxlength="200" placeholder="Ex.: 2 leite, detergente, 1 kg batatas" aria-label="Produto a acrescentar" enterkeyhint="send" list="shop-suggest"/></label><datalist id="shop-suggest">${(store.shoppingFrequent||[]).map(x=>`<option value="${esc(x.title)}"></option>`).join('')}</datalist><button class="button primary" type="submit">${ico('plus')} Adicionar</button><div class="shop-quick-opts"><input name="quantity" class="select-control" inputmode="decimal" maxlength="20" placeholder="Qtd." aria-label="Quantidade (opcional)"/><select name="unit" class="select-control" aria-label="Unidade">${option('','Unidade','')}${CasaUnits.UNITS.map(([k,one])=>option(k,one,'')).join('')}</select><select name="category" class="select-control" aria-label="Categoria">${option('','Categoria automática','')}${SHOP_CATEGORIES.map(c=>option(c,c,'')).join('')}</select></div></form>
 ${usual.length?`<div class="shop-usual"><span class="eyebrow">COMPRAS HABITUAIS · TOCA PARA ACRESCENTAR</span><div class="shop-chips">${usual.map(x=>`<button type="button" class="shop-chip" data-action="shop-usual" data-title="${esc(x.title)}" data-category="${esc(x.category||'')}" data-quantity="${esc(x.quantity||'1')}" data-unit="${esc(x.unit||'')}">${ico('plus')}${esc(x.title)}</button>`).join('')}</div></div>`:''}
 ${bought?`<div class="shop-clear"><span>${bought} ${bought===1?'produto comprado':'produtos comprados'}</span><button type="button" class="button small" data-action="shop-clear">${ico('trash')} Limpar comprados</button></div>`:''}`;}
document.addEventListener('submit',async e=>{if(e.target.id!=='shopping-quick')return;e.preventDefault();const f=e.target;const raw=f.elements.product.value;if(!raw.trim())return;
 // Vários produtos de uma vez, separados por vírgulas ou mudanças de linha.
 const parts=raw.split(/[,;\n]+/).map(x=>x.trim()).filter(Boolean).slice(0,20);
 const qOver=f.elements.quantity.value.trim(),uOver=f.elements.unit.value;if(qOver&&!/^\d{1,5}([.,]\d{1,3})?$/.test(qOver))return toast('Quantidade inválida: usa um número, por exemplo 2 ou 0,5.');
 try{for(const part of parts){const it=parseShopInput(part);await api('/api/shopping','POST',{title:it.title,quantity:(parts.length===1&&qOver)||it.quantity,unit:uOver||it.unit||(store.shoppingFrequent||[]).find(x=>x.title.toLocaleLowerCase('pt-PT')===it.title.toLocaleLowerCase('pt-PT'))?.unit||'',category:f.elements.category.value||guessShopCategory(it.title)});}formDirty=false;await reload();toast(parts.length>1?`${parts.length} produtos adicionados.`:'Produto adicionado.');setTimeout(()=>$('#shopping-quick [name=product]')?.focus(),20);}catch(err){toast(err.message);}});

/* ───────────── Rotação de rotinas ───────────── */
// Rotação ordenada: o 1.º da lista fica responsável agora; ao marcar como feita passa ao seguinte.
// Ao abrir uma rotina já em curso, a lista começa em quem a tem atualmente.
const shortName=p=>{const first=(p?.name||'?').split(' ')[0];return people().filter(x=>x.active!==false&&x.name.split(' ')[0]===first).length>1?p.name:first;};
function rotationField(t){if(!(canManage()||demo))return '';let rot=(Array.isArray(t.rotation)?t.rotation:[]).filter(id=>people().some(p=>p.id===id&&p.active!==false));const i=rot.indexOf(t.assignedTo);if(i>0)rot=[...rot.slice(i),...rot.slice(0,i)];
 return `<fieldset class="access-days rotation-field" data-rotation-field ${(t.kind||'project')==='routine'?'':'hidden'}><legend>Rotação <small>(rotinas)</small></legend><p class="field-help">Toca nas pessoas pela ordem em que fazem a rotina. A 1.ª fica responsável agora; ao marcar como feita, passa à seguinte. Usa as setas (ou arrasta) para mudar a ordem.</p><ol class="rotation-order">${rotationItems(rot)}</ol><div class="rotation-pool">${rotationPool(rot)}</div></fieldset>`;}
function rotationItems(rot){return rot.map((id,i)=>{const p=who(id);return `<li class="rotation-item" draggable="true" data-id="${esc(id)}"><input type="hidden" name="rotation" value="${esc(id)}"/><span class="rotation-pos">${i+1}</span><span class="rotation-name">${esc(shortName(p))}${i===0?' <small>agora</small>':''}</span><span class="rotation-tools"><button type="button" class="icon-btn" data-action="rot-move" data-dir="-1" aria-label="Passar ${esc(p?.name)} para antes" ${i===0?'disabled':''}>↑</button><button type="button" class="icon-btn" data-action="rot-move" data-dir="1" aria-label="Passar ${esc(p?.name)} para depois" ${i===rot.length-1?'disabled':''}>↓</button><button type="button" class="icon-btn" data-action="rot-remove" aria-label="Retirar ${esc(p?.name)} da rotação">×</button></span></li>`;}).join('');}
function rotationPool(rot){const rest=people().filter(p=>p.active!==false&&!rot.includes(p.id));return rest.map(p=>`<button type="button" class="shop-chip" data-action="rot-add" data-id="${esc(p.id)}">${ico('plus')}${esc(shortName(p))}</button>`).join('')||'<small class="field-help">Todas as pessoas estão na rotação.</small>';}
function rotationRefresh(field,rot){field.querySelector('.rotation-order').innerHTML=rotationItems(rot);field.querySelector('.rotation-pool').innerHTML=rotationPool(rot);const sel=field.closest('form')?.elements.assignedTo;if(sel&&rot.length)sel.value=rot[0];}
const rotationOf=field=>[...field.querySelectorAll('.rotation-item')].map(li=>li.dataset.id);
function rotationAction(name,el){const field=el.closest('[data-rotation-field]');if(!field)return;let rot=rotationOf(field);const id=el.closest('.rotation-item')?.dataset.id||el.dataset.id;
 if(name==='rot-add')rot.push(id);if(name==='rot-remove')rot=rot.filter(x=>x!==id);
 if(name==='rot-move'){const i=rot.indexOf(id),j=i+Number(el.dataset.dir);if(j<0||j>=rot.length)return;[rot[i],rot[j]]=[rot[j],rot[i]];}
 rotationRefresh(field,rot);const focus=name==='rot-move'?field.querySelector(`.rotation-item[data-id="${CSS.escape(id)}"] [data-dir="${el.dataset.dir}"]:not([disabled])`)||field.querySelector(`.rotation-item[data-id="${CSS.escape(id)}"] .rotation-name`):null;focus?.focus?.();}
// Arrastar para reordenar (computador).
let rotDrag=null;
document.addEventListener('dragstart',e=>{const li=e.target.closest?.('.rotation-item');if(!li)return;rotDrag=li.dataset.id;e.dataTransfer.effectAllowed='move';li.classList.add('dragging');});
document.addEventListener('dragover',e=>{const li=e.target.closest?.('.rotation-item');if(!li||!rotDrag)return;e.preventDefault();});
document.addEventListener('drop',e=>{const li=e.target.closest?.('.rotation-item');if(!li||!rotDrag)return;e.preventDefault();const field=li.closest('[data-rotation-field]');let rot=rotationOf(field).filter(x=>x!==rotDrag);const at=rot.indexOf(li.dataset.id);const r=li.getBoundingClientRect();rot.splice(at+(e.clientY>r.top+r.height/2?1:0),0,rotDrag);rotDrag=null;rotationRefresh(field,rot);});
document.addEventListener('dragend',()=>{rotDrag=null;document.querySelectorAll('.rotation-item.dragging').forEach(x=>x.classList.remove('dragging'));});
function rotationLine(t){if(!Array.isArray(t.rotation)||t.rotation.length<2)return '';return `<div class="rotation-line" title="Rotação">${ico('repeat')}${t.rotation.map(id=>`<span class="${id===t.assignedTo?'is-current':''}">${esc(shortName(who(id)))}</span>`).join('<i aria-hidden="true">→</i>')}</div>`;}

/* ───────────── Fotografias nas tarefas ───────────── */
const photoSrc=ph=>demo?(store.photoData?.[ph.id]||''):'api/photos/'+encodeURIComponent(ph.id);
function taskPhotosHtml(t){if(!t?.id)return '';
 const list=t.photos||[];const can=canCompleteVisible(t);
 return `<div class="task-photos" id="task-photos"><div class="task-photos-head"><strong>Fotografias</strong><small>${list.length}/8 · antes, depois ou do problema</small></div><div class="photo-grid">${list.map(ph=>`<button type="button" class="photo-thumb" data-action="photo-view" data-task="${esc(t.id)}" data-id="${esc(ph.id)}" aria-label="Ver fotografia${ph.caption?': '+esc(ph.caption):''}"><img src="${esc(photoSrc(ph))}" alt="" loading="lazy"/>${ph.caption?`<span>${esc(ph.caption)}</span>`:''}</button>`).join('')}${can&&list.length<8?`<button type="button" class="photo-add" data-action="photo-add" data-task="${esc(t.id)}">${ico('camera')}<span>Acrescentar</span></button>`:''}</div><input type="file" id="task-photo-input" accept="image/*" hidden/></div>`;}
// Redimensiona no browser (máx. 1600 px; 800 px na demonstração) e converte para JPEG.
function resizePhoto(file,max=demo?800:1600,q=demo?0.7:0.82){return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file);const img=new Image();img.onload=()=>{const s=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));const c=document.createElement('canvas');c.width=Math.round(img.naturalWidth*s);c.height=Math.round(img.naturalHeight*s);const ctx=c.getContext('2d');ctx.imageSmoothingQuality='high';ctx.drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);resolve(c.toDataURL('image/jpeg',q));};img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Não foi possível ler esta imagem.'));};img.src=url;});}
let photoTarget=null;
document.addEventListener('change',async e=>{if(e.target.id!=='task-photo-input'||!e.target.files?.[0]||!photoTarget)return;const file=e.target.files[0];e.target.value='';const taskId=photoTarget;
 const grid=document.querySelector('#task-photos .photo-grid');grid?.insertAdjacentHTML('beforeend','<span class="photo-thumb is-loading sk" role="status" aria-label="A enviar a fotografia"></span>');
 try{const data=await resizePhoto(file);const caption=(tasks().find(t=>t.id===taskId)?.photos||[]).length?'':'Antes';const r=await api(`/api/tasks/${taskId}/photos`,'POST',{data,caption});const t=tasks().find(x=>x.id===taskId);if(t&&r.task)t.photos=r.task.photos;const box=document.getElementById('task-photos');if(box&&t)box.outerHTML=taskPhotosHtml(t);toast('Fotografia acrescentada.');}catch(err){document.querySelector('#task-photos .is-loading')?.remove();toast(err.message);}});
function viewPhoto(taskId,photoId){const t=tasks().find(x=>x.id===taskId);const ph=t?.photos?.find(x=>x.id===photoId);if(!ph)return;const canDel=ph.by===store.user?.id||canEditVisible(t);
 const v=document.createElement('div');v.id='photo-viewer';v.innerHTML=`<div class="confirm-overlay photo-overlay" data-photo-close><figure class="photo-figure" role="dialog" aria-modal="true" aria-label="Fotografia da tarefa"><img src="${esc(photoSrc(ph))}" alt="${esc(ph.caption||'Fotografia da tarefa')}"/><figcaption><span><b>${esc(ph.caption||t.title)}</b><small>${esc(owner(ph.by))} · ${esc(fmtDateTime(ph.at))}</small></span><span class="photo-figure-actions">${canDel?`<button type="button" class="button small danger" data-photo-delete>${ico('trash')} Remover</button>`:''}<button type="button" class="button small" data-photo-close>Fechar</button></span></figcaption></figure></div>`;
 document.body.appendChild(v);const close=()=>{v.remove();document.removeEventListener('keydown',onKey,true);};const onKey=ev=>{if(ev.key==='Escape'){ev.stopPropagation();close();}};document.addEventListener('keydown',onKey,true);
 v.addEventListener('click',async ev=>{if(ev.target.closest('[data-photo-delete]')){ev.stopPropagation();if(!await confirmDialog({title:'Remover esta fotografia?',confirmLabel:'Remover',danger:true}))return;try{const r=await api(`/api/tasks/${t.id}/photos/${ph.id}`,'DELETE',{});t.photos=r.task.photos;close();const box=document.getElementById('task-photos');if(box)box.outerHTML=taskPhotosHtml(t);toast('Fotografia removida.');}catch(err){toast(err.message);}return;}if(ev.target.hasAttribute('data-photo-close')||ev.target.closest('button[data-photo-close]'))close();});
 v.querySelector('button[data-photo-close]').focus();}

/* ───────────── Ações ───────────── */
async function featureAction(name,el){
 if(name.startsWith('notif-'))return notifAction(name,el);
 switch(name){
  // Tocar fora da janela fecha-a; se já houver alterações escritas, pergunta antes de as perder.
  case 'overlay':{if(el.dataset.dirty==='1'&&!await confirmDialog({title:'Fechar sem guardar?',message:'As alterações que fizeste nesta janela perdem-se.',confirmLabel:'Fechar',danger:true}))return true;closeModal();return true;}
  case 'person-edit':personEditModal(el.dataset.id);return true;
  case 'theme-set':{window.casaSetTheme?.(el.dataset.themeValue);el.parentElement.querySelectorAll('[role=radio]').forEach(b=>b.setAttribute('aria-checked',String(b===el)));return true;}
  case 'sync-apply':await syncApply();return true;
  case 'backup-create':{if(demo){toast('Na demonstração não há cópias de segurança.');return true;}const r=await api('/api/backups','POST',{});backupsData={...backupsData,backups:r.backups};loadBackups();toast('Cópia de segurança criada.');return true;}
  case 'backup-download':{if(demo){toast('Indisponível na demonstração.');return true;}const res=await fetch('api/backups/'+encodeURIComponent(el.dataset.name),{credentials:'same-origin'});if(!res.ok)throw Error('Não foi possível descarregar a cópia.');downloadBlob(await res.blob(),el.dataset.name);toast('Transferência iniciada.');return true;}
  case 'backup-upload':{if(demo){toast('Indisponível na demonstração.');return true;}const input=$('#backup-file');input.value='';input.onchange=async()=>{const f=input.files?.[0];if(!f)return;try{const data=JSON.parse(await f.text());const r=await api('/api/backups/upload','POST',{data});backupsData={...backupsData,backups:r.backups};loadBackups();toast(`Cópia carregada (${r.summary.tasks} tarefas, ${r.summary.people} pessoas). Usa «Restaurar» para a aplicar.`);}catch(err){toast(err instanceof SyntaxError?'O ficheiro não é JSON válido.':err.message);}};input.click();return true;}
  case 'backup-restore':{if(demo){toast('Indisponível na demonstração.');return true;}const b=(backupsData?.backups||[]).find(x=>x.name===el.dataset.name);if(!await confirmDialog({title:'Restaurar esta cópia?',message:`Os dados atuais são substituídos pelos da cópia de ${b?fmtDateTime(b.createdAt):'segurança'}. O estado atual fica guardado numa cópia «Antes de restaurar».`,confirmLabel:'Restaurar',danger:true}))return true;
   await api('/api/backups/'+encodeURIComponent(el.dataset.name)+'/restore','POST',{});backupsData=null;try{await load();render();toast('Cópia restaurada.');}catch{store.user=null;renderAuth('login','Cópia restaurada. Volta a entrar.');}return true;}
  case 'ha-test':{await api('/api/ha/test','POST',{personId:el.dataset.id});toast('Notificação de teste enviada.');return true;}
  case 'ha-copy-yaml':{await copyText(document.querySelector('#ha-card pre')?.textContent||'','Configuração copiada.');return true;}
  case 'ha-token':{if(!await confirmDialog({title:'Gerar um novo token?',message:'As automações que usam o token atual deixam de funcionar até atualizares a configuração.',confirmLabel:'Gerar novo',danger:true}))return true;await api('/api/ha/token','POST',{});haData=null;await loadHa();toast('Novo token gerado.');return true;}
  case 'cal-month':calMonth=Number(el.dataset.month);render();return true;
  case 'season-editing':calEditing=!calEditing;render();return true;
  case 'season-new':seasonModal(null);return true;
  case 'season-edit':seasonModal(seasonal().find(x=>x.id===el.dataset.id));return true;
  case 'season-task':{const it=seasonal().find(x=>x.id===el.dataset.id);const m=Number(el.dataset.month);const r=await api('/api/seasonal/'+it.id+'/task','POST',{year:calYearFor(m),month:m});await reload();toast('Tarefa criada até '+shortDate(r.task.dueDate)+'.');return true;}
  case 'season-toggle':{const it=seasonal().find(x=>x.id===el.dataset.id);await api('/api/seasonal/'+it.id,'PATCH',{active:it.active===false});modal=null;await reload();toast(it.active===false?'Trabalho reativado.':'Trabalho desativado.');return true;}
  case 'season-delete':{const it=seasonal().find(x=>x.id===el.dataset.id);if(!await confirmDialog({title:'Eliminar este trabalho?',message:`«${it.title}» sai do calendário. As tarefas já criadas mantêm-se.`,confirmLabel:'Eliminar',danger:true}))return true;await api('/api/seasonal/'+it.id,'DELETE',{});modal=null;await reload();toast('Trabalho eliminado.');return true;}
  case 'shop-usual':{await api('/api/shopping','POST',{title:el.dataset.title,quantity:el.dataset.quantity||'1',unit:el.dataset.unit||'',category:el.dataset.category||guessShopCategory(el.dataset.title)});await reload();toast(el.dataset.title+' adicionado.');return true;}
  case 'shop-clear':{const n=shopping().filter(x=>x.purchased).length;if(!await confirmDialog({title:`Limpar ${n} ${n===1?'produto comprado':'produtos comprados'}?`,message:'Saem da lista. Continuam nas compras habituais para os voltares a acrescentar com um toque.',confirmLabel:'Limpar'}))return true;await api('/api/shopping/clear-purchased','POST',{});await reload();toast('Lista limpa.');return true;}
  case 'rot-add':case 'rot-remove':case 'rot-move':rotationAction(name,el);return true;
  case 'shop-edit':editShopItem(el.dataset.id);return true;
  case 'qty-step':stepQty(el);return true;
  case 'photo-add':photoTarget=el.dataset.task;$('#task-photo-input')?.click();return true;
  case 'photo-view':viewPhoto(el.dataset.task,el.dataset.id);return true;
 }
 return false;
}

/* ───────────── Demonstração (sem servidor) ───────────── */
function demoFeatureApi(p,method,b){
 if(p==='/api/notifications/read'){store.notifications=notifications().map(n=>b.ids==='all'||b.ids.includes(n.id)?{...n,read:true}:n);persistDemo();return {notifications:store.notifications};}
 if(p==='/api/notifications/clear'){store.notifications=[];persistDemo();return {notifications:[]};}
 const SEED=window.__CASA_SEASONAL__||[];
 if(!Array.isArray(store.seasonal))store.seasonal=SEED.map(x=>({...x}));
 if(p==='/api/rev')return {rev:'demo'};
 if(p==='/api/backups'&&method==='GET'){const d=new Date();const mk=(h,r,s)=>({name:'demo-'+h,reason:r,createdAt:new Date(d-h*3600e3).toISOString(),size:s});return {backups:[mk(2,'auto',84211),mk(26,'auto',83102),mk(50,'manual',82877),mk(74,'auto',80544)]};}
 if(p==='/api/ha'&&method==='GET'){store.demoHa=store.demoHa||{notify:{'demo-1':'mobile_app_iphone_de_tu'},events:{assigned:true,daily:true},dailyTime:'08:30',sensors:true};return {available:true,demo:true,hostname:'local-casa-em-dia',token:'exemplo-token-da-demonstracao',services:['mobile_app_iphone_de_tu','mobile_app_pixel_da_pessoa_2'],sensorEntities:['sensor.casa_em_dia_tarefas_por_fazer','sensor.casa_em_dia_tarefas_atrasadas','sensor.casa_em_dia_para_hoje','sensor.casa_em_dia_compras','sensor.casa_em_dia_ultima_conclusao'],...store.demoHa};}
 if(p==='/api/ha'&&method==='PATCH'){store.demoHa={...(store.demoHa||{}),...b};persistDemo();return {ok:true};}
 if(p==='/api/ha/test'||p==='/api/ha/token')return {ok:true};
 if(p==='/api/seasonal'&&method==='POST'){const item={id:'s-d'+Date.now(),active:true,...b};store.seasonal.push(item);persistDemo();return {item};}
 let m=p.match(/^\/api\/seasonal\/([^/]+?)(\/task)?$/);
 if(m){const it=store.seasonal.find(x=>x.id===m[1]);if(!it)throw Error('Trabalho não encontrado.');
  if(m[2]){const key=`${it.id}:${b.year}-${String(b.month).padStart(2,'0')}`;if(tasks().some(t=>t.seasonalKey===key))throw Error('Este trabalho já foi criado como tarefa para este mês.');const due=new Date(Date.UTC(b.year,b.month,0)).toISOString().slice(0,10);const t={id:'d'+Date.now(),title:it.title,room:it.room,category:it.category,notes:it.notes||'',estimatedMinutes:it.minutes,kind:'project',priority:'P3',status:'todo',repeat:'none',dueDate:due,assignedTo:null,createdBy:store.user.id,visibility:'shared',subtasks:[],seasonalKey:key};store.tasks.push(t);persistDemo();return {task:t};}
  if(method==='PATCH'){Object.assign(it,b);persistDemo();return {item:it};}
  if(method==='DELETE'){store.seasonal=store.seasonal.filter(x=>x.id!==it.id);persistDemo();return {ok:true};}}
 if(p==='/api/shopping'&&method==='POST'){store.shoppingFreqDemo=store.shoppingFreqDemo||{};const k=String(b.title).toLocaleLowerCase('pt-PT');const prev=store.shoppingFreqDemo[k]||{count:0};store.shoppingFreqDemo[k]={title:b.title,category:b.category,quantity:b.quantity,unit:b.unit||'',count:prev.count+1};store.shoppingFrequent=Object.values(store.shoppingFreqDemo).sort((a,b)=>b.count-a.count).slice(0,16);return undefined;}
 if(p==='/api/shopping/clear-purchased'){const n=shopping().filter(x=>x.purchased).length;store.shopping=shopping().filter(x=>!x.purchased);persistDemo();return {removed:n};}
 m=p.match(/^\/api\/tasks\/([^/]+)\/photos(?:\/([^/]+))?$/);
 if(m){const t=tasks().find(x=>x.id===m[1]);if(!t)throw Error('Tarefa não encontrada.');store.photoData=store.photoData||{};
  if(method==='POST'){if((t.photos||[]).length>=8)throw Error('Cada tarefa pode ter no máximo 8 fotografias.');const pid='ph'+Date.now();store.photoData[pid]=b.data;t.photos=[...(t.photos||[]),{id:pid,by:store.user.id,at:new Date().toISOString(),caption:b.caption||''}];try{persistDemo();localStorage.setItem('casa-demo-1-7',JSON.stringify(store));}catch{t.photos.pop();delete store.photoData[pid];throw Error('Sem espaço na demonstração para mais fotografias.');}return {task:t};}
  if(method==='DELETE'){t.photos=(t.photos||[]).filter(x=>x.id!==m[2]);delete store.photoData[m[2]];persistDemo();return {task:t};}}
 return undefined;
}

// A rotação só faz sentido em rotinas: mostra/esconde ao mudar o tipo da tarefa.
document.addEventListener('change',e=>{if(e.target.name!=='kind'||!e.target.closest('#task-form'))return;const f=e.target.closest('#task-form').querySelector('[data-rotation-field]');if(f)f.hidden=e.target.value!=='routine';});
document.addEventListener('input',e=>{const o=e.target.closest?.('.overlay[data-action="overlay"]');if(o)o.dataset.dirty='1';},true);

/* ───────────── Aparência (claro / escuro), por dispositivo ───────────── */
function appearanceField(){const cur=window.casaThemePref?.()||'auto';const opts=[['auto','Automático'],['light','Claro'],['dark','Escuro']];
 return `<div class="field"><span class="field-label" id="appearance-label">Aparência</span><div class="seg-control" role="radiogroup" aria-labelledby="appearance-label">${opts.map(([v,l])=>`<button type="button" role="radio" aria-checked="${cur===v}" data-action="theme-set" data-theme-value="${v}">${l}</button>`).join('')}</div><small class="field-help">Aplica-se logo, só neste dispositivo. «Automático» segue o modo do telemóvel ou do computador.</small></div>`;}

/* ───────────── Pessoas: contactos e edição pelo administrador ───────────── */
const fmtBirthday=mmdd=>{const m=/^(\d{2})-(\d{2})$/.exec(mmdd||'');return m?`${Number(m[2])} ${MONTHS_PT[Number(m[1])-1]}`:'';};
function personContacts(p){const bd=p.birthDate?p.birthDate.slice(5):p.birthday;const items=[];
 if(bd)items.push(`<span>${ico('cake')}${esc(fmtBirthday(bd))}</span>`);
 if(p.phone)items.push(`<a href="tel:${esc(p.phone.replace(/[^\d+]/g,''))}">${ico('phone')}${esc(p.phone)}</a>`);
 if(p.email)items.push(`<a href="mailto:${esc(p.email)}">${ico('mail')}${esc(p.email)}</a>`);
 return items.length?`<div class="person-contacts">${items.join('')}</div>`:'';}
function personEditModal(id){const p=people().find(x=>x.id===id);if(!p)return;const h=$('#modal-holder');modal={type:'person-edit'};
 h.innerHTML=`<div class="overlay" data-action="overlay"><div class="modal quick-modal" role="dialog" aria-modal="true" aria-labelledby="pe-title"><div class="modal-head"><div><h2 id="pe-title">Editar ${esc(p.name.split(' ')[0])}</h2><p class="modal-sub">Nome, utilizador de entrada e contactos.</p></div><button type="button" class="close" data-action="close" aria-label="Fechar">×</button></div><div class="modal-body"><form id="person-edit-form" novalidate><div class="field"><label>Nome</label><input name="name" required minlength="2" maxlength="80" value="${esc(p.name)}"/></div><div class="field"><label>Nome de utilizador</label><input name="username" autocapitalize="none" spellcheck="false" maxlength="40" value="${esc(p.username||'')}"/><small class="field-help">Se mudares, avisa a pessoa: passa a entrar com o novo nome. A palavra-passe mantém-se.</small></div><div class="form-row"><div class="field"><label>Data de nascimento</label><input type="date" name="birthDate" max="${today()}" value="${esc(p.birthDate||'')}"/></div><div class="field"><label>Telefone</label><input type="tel" name="phone" maxlength="30" value="${esc(p.phone||'')}"/></div></div><div class="field"><label>Email</label><input type="email" name="email" maxlength="120" value="${esc(p.email||'')}"/></div><div class="modal-actions"><span class="spacer"></span><button type="button" class="button" data-action="close">Cancelar</button><button type="submit" class="button primary">${ico('check')} Guardar</button></div></form></div></div></div>`;
 associateLabels(h);$('#person-edit-form').addEventListener('submit',async e=>{e.preventDefault();const v=Object.fromEntries(new FormData(e.target));const body={};for(const k of ['name','username','birthDate','email','phone']){const val=String(v[k]??'').trim();if(val!==String(p[k]||''))body[k]=k==='username'?val.toLowerCase():val;}
  if(!Object.keys(body).length){closeModal();return;}
  try{const r=await api('/api/people/'+p.id,'PATCH',body);if(r.people)store.people=r.people;modal=null;h.innerHTML='';await reload();toast(body.username?`Dados guardados. ${p.name.split(' ')[0]} passa a entrar como «${body.username}».`:'Dados guardados.');}catch(err){toast(err.message);}});}

/* ───────────── Notificações (sino) ───────────── */
let notifOpen=false;
const notifications=()=>Array.isArray(store.notifications)?store.notifications:[];
const NOTIF_ICON={assigned:'list',rotation:'repeat',done:'check-square',birthday:'cake',due:'clock',season:'calendar'};
function relTime(iso){const d=(Date.now()-Date.parse(iso))/1000;if(d<60)return 'agora';if(d<3600)return `há ${Math.floor(d/60)} min`;if(d<86400)return `há ${Math.floor(d/3600)} h`;if(d<172800)return 'ontem';if(d<7*86400)return `há ${Math.floor(d/86400)} dias`;return new Date(iso).toLocaleDateString('pt-PT',{day:'numeric',month:'short'});}
function bellButton(){const n=notifications().filter(x=>!x.read).length;return `<button type="button" class="icon-btn bell-btn ${notifOpen?'is-open':''}" data-action="notif-toggle" aria-haspopup="dialog" aria-expanded="${notifOpen}" aria-label="Notificações${n?`: ${n} por ler`:''}">${ico('bell')}${n?`<span class="bell-badge" aria-hidden="true">${n>9?'9+':n}</span>`:''}</button>`;}
function notifPanel(){if(!notifOpen)return '';const list=notifications();const unread=list.filter(x=>!x.read).length;
 return `<button class="notif-dismiss" type="button" data-action="notif-close" tabindex="-1" aria-label="Fechar notificações"></button><section class="notif-panel" role="dialog" aria-label="Notificações" tabindex="-1"><header class="notif-head"><strong>Notificações</strong><span>${unread?`<button type="button" class="link-btn" data-action="notif-read-all">Marcar todas como lidas</button>`:''}${list.length?`<button type="button" class="link-btn" data-action="notif-clear">Limpar</button>`:''}</span></header><div class="notif-list">${list.map(n=>`<button type="button" class="notif-item ${n.read?'':'unread'}" data-action="notif-open" data-id="${esc(n.id)}"><span class="notif-ico t-${esc(n.type)}" aria-hidden="true">${ico(NOTIF_ICON[n.type]||'info')}</span><span class="notif-text"><b>${esc(n.title)}</b>${n.body?`<small>${esc(n.body)}</small>`:''}<em>${esc(relTime(n.at))}</em></span>${n.read?'':'<i class="notif-dot" aria-label="Por ler"></i>'}</button>`).join('')||`<div class="notif-empty">${ico('bell')}<p>Sem notificações.</p><small>Aqui aparecem tarefas atribuídas, conclusões, rotações, aniversários e lembretes.</small></div>`}</div></section>`;}
async function notifRead(ids){try{const r=await api('/api/notifications/read','POST',{ids});if(r.notifications)store.notifications=r.notifications;}catch(e){toast(e.message);}}
async function notifAction(name,el){
 if(name==='notif-toggle'){notifOpen=!notifOpen;moreOpen=false;quickCreateOpen=false;render();if(notifOpen)(document.querySelector('.notif-panel .notif-item')||document.querySelector('.notif-panel'))?.focus();return true;}
 if(name==='notif-close'){notifOpen=false;render();return true;}
 if(name==='notif-read-all'){await notifRead('all');render();return true;}
 if(name==='notif-clear'){try{await api('/api/notifications/clear','POST',{});store.notifications=[];}catch(e){toast(e.message);}render();return true;}
 if(name==='notif-open'){const n=notifications().find(x=>x.id===el.dataset.id);if(!n)return true;if(!n.read)await notifRead([n.id]);notifOpen=false;const l=n.link||{};
  if(l.page){page=l.page;query='';roomFilter='all';statusFilter='all';priorityFilter='all';personFilter=l.filter==='mine'?store.user.id:'all';tab='active';}
  render();window.scrollTo(0,0);if(l.taskId&&tasks().some(t=>t.id===l.taskId))openTask(l.taskId);return true;}
 return false;}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&notifOpen){notifOpen=false;render();document.querySelector('.bell-btn')?.focus();}});
