/* Daily Casa — estrutura da app (2.0)
 * Página «Casa» (índice do que se usa menos), Definições em secções, janelas reutilizáveis e ícones novos.
 * Partilha o âmbito global com app.js e features.js (scripts clássicos, carregados por esta ordem).
 */
'use strict';
const APP_VER=((document.currentScript&&document.currentScript.src)||'').match(/[?&]v=([\d.]+)/)?.[1]||'';
Object.assign(paths,{
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
 scale:'<path d="M12 5v15M8 20.5h8M4.5 7.5h15"/><circle cx="12" cy="4" r="1.2"/><path d="M4.5 7.5 1.8 14a2.7 2.7 0 0 0 5.4 0zM19.5 7.5 16.8 14a2.7 2.7 0 0 0 5.4 0z"/>',
 file:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
 store:'<path d="M4 9h16l-1.2-4.2A1 1 0 0 0 17.8 4H6.2a1 1 0 0 0-1 .8z"/><path d="M5 9v11h14V9M9 20v-6h6v6"/>',
 sparkle:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
 'wifi-off':'<path d="M2 8.8a16 16 0 0 1 4.2-2.6M10.7 5.1A16 16 0 0 1 22 8.8M5 12.6a10 10 0 0 1 3.2-2M15.7 10.7A10 10 0 0 1 19 12.6M8.5 16.4a5 5 0 0 1 7 0"/><circle cx="12" cy="20" r="1"/><path d="M3 3l18 18"/>',
 back:'<path d="M15 5l-7 7 7 7"/>',
 moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
 'theme-auto':'<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17a8.5 8.5 0 0 0 0-17z" fill="currentColor" stroke="none"/>',
 phone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
 mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
 upload:'<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>',
 copy:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
 eye:'<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
 'eye-off':'<path d="M3 3l18 18M10.6 6.1A9.6 9.6 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-3 3.6M6.5 7.6A15.5 15.5 0 0 0 2.5 12S6 18 12 18a9.3 9.3 0 0 0 4.2-1M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'
});
// Janela flutuante com o mesmo aspeto das restantes (cabeçalho fixo, × sempre visível, fecha ao tocar fora).
function modalShell({title,sub='',body='',cls='',label}){return `<div class="overlay" data-action="overlay"><div class="modal ${cls}" role="dialog" aria-modal="true" aria-label="${esc(label||title)}"><div class="modal-head"><div><h2>${title}</h2>${sub?`<p class="modal-sub">${sub}</p>`:''}</div><button type="button" class="close" data-action="close" aria-label="Fechar">×</button></div><div class="modal-body">${body}</div></div></div>`;}
const plural=(n,one,many)=>`${n} ${n===1?one:many}`;
const fmtMin=m=>{m=Math.round(m||0);const h=Math.floor(m/60),r=m%60;return h?`${h}h${r?String(r).padStart(2,'0'):''}`:`${r} min`;};
const dateShortPT=iso=>{if(!iso)return '';const d=new Date(iso+'T12:00:00Z');return `${d.getUTCDate()} ${MONTHS_PT[d.getUTCMonth()]}`;};
const firstNameOf=id=>owner(id).split(' ')[0];
const roomsStatus=()=>CasaCore.roomStatus(tasks(),today(),config().rooms);

/* ───────────── Página «Casa» ───────────── */
function nextHoliday(){const t=today();const y=Number(t.slice(0,4));const all={...holidays(y),...holidays(y+1)};const k=Object.keys(all).sort().find(d=>d>=t);return k?{date:k,...all[k]}:null;}
function houseStatusLine(id){
 switch(id){
  case 'calendar':{const h=nextHoliday();return h?`Próximo feriado: ${dateShortPT(h.date)} · ${h.name}`:'Mês, feriados e aniversários';}
  case 'balance':{const b=CasaCore.balance(tasks(),store.history,people(),{today:today()});const top=b.rows[0];return top&&top.total?`Esta semana: ${b.rows.map(r=>`${shortName(who(r.id)||{name:r.name})} ${fmtMin(r.total)}`).slice(0,3).join(' · ')}`:'Ainda sem tarefas esta semana';}
  case 'equipment':{const eq=store.equipment||[];if(!eq.length)return 'Caldeira, AC, eletrodomésticos: tudo num só sítio';const next=eq.filter(x=>x.nextService).sort((a,b)=>a.nextService.localeCompare(b.nextService))[0];return `${plural(eq.length,'equipamento','equipamentos')}${next?` · próxima revisão ${dateShortPT(next.nextService)}`:''}`;}
  case 'incidents':{const open=(store.incidents||[]).filter(x=>x.status!=='resolved');const hi=open.filter(x=>x.severity==='alta').length;return open.length?`${plural(open.length,'por resolver','por resolver')}${hi?` · ${plural(hi,'urgente','urgentes')}`:''}`:'Nada por resolver · algo partiu, avariou ou falta?';}
  case 'people':{const n=people().filter(p=>p.active!==false).length;return `${plural(n,'pessoa','pessoas')} com conta`;}
  case 'worklogs':{const m=today().slice(0,7);const mins=workLogs().filter(x=>(x.date||'').startsWith(m)).reduce((n,x)=>n+Number(x.minutes||0),0);return mins?`${fmtMin(mins)} registadas este mês`:'Trabalhos e tempo de cada pessoa';}
  default:return (HOUSE_PAGES.find(x=>x[0]===id)||[])[3]||'';
 }
}
function housePage(){
 const st=roomsStatus();const score=CasaCore.houseScore(st);const bad=Object.values(st).filter(x=>x.level==='bad').length;
 const items=HOUSE_PAGES.filter(x=>x[4]());
 return `${head('Casa','Tudo o que não é do dia a dia, num só sítio.',false)}
 ${score!=null?`<button type="button" class="house-score" data-action="nav" data-page="tasks" data-view="rooms"><span class="house-score-ring" style="--p:${score}"><b>${score}%</b></span><span><strong>Casa em ordem</strong><small>${bad?`${plural(bad,'divisão precisa','divisões precisam')} de atenção`:'Todas as divisões com rotinas estão em dia'} · ver divisões</small></span>${ico('chevron')}</button>`:''}
 <nav class="index-list" aria-label="Secções da casa">${items.map(([id,label,icon])=>`<button type="button" class="index-row" data-action="nav" data-page="${id}"><span class="index-ico">${ico(icon)}</span><span class="index-text"><strong>${esc(label)}</strong><small>${esc(houseStatusLine(id))}</small></span>${ico('chevron','index-chev')}</button>`).join('')}</nav>`;
}

/* ───────────── Definições em secções ───────────── */
let settingsSection='';
const SETTINGS_SECTIONS=[
 ['house','A casa','home',()=>`${plural(config().floors.length,'piso','pisos')} · ${plural(config().rooms.length,'divisão','divisões')} · ${plural(config().categories.length,'categoria','categorias')}`],
 ['notify','Notificações e Home Assistant','bell',()=>store.haAvailable?'Home Assistant ligado':demo?'Disponível na app instalada no Home Assistant':'Sino da app (Home Assistant não ligado)'],
 ['data','Dados e cópias','download',()=>{if(!isAdmin())return 'Sincronização entre pessoas';const a=(backupsData?.backups||[]).find(b=>b.reason==='auto');return a?`Última cópia: ${fmtDateTime(a.createdAt)}`:'Cópias automáticas diárias';}],
 ['appearance','Aparência','sun',()=>({auto:'Automático (segue o telemóvel)',light:'Claro',dark:'Escuro'})[window.casaThemePref?.()||'auto']],
 ['about','Sobre a app','info',()=>`Versão ${APP_VER}`]];
function settingsPage(){
 const sec=SETTINGS_SECTIONS.find(x=>x[0]===settingsSection);
 if(!sec){
  if(isAdmin()&&!backupsData&&!demo)queueMicrotask(async()=>{try{backupsData=await api('/api/backups');}catch{backupsData={backups:[]};}if(page==='settings'&&!settingsSection&&!modal)render();});
  return `${head('Definições','A tua casa e os teus dados, sempre sob controlo.',false)}<nav class="index-list" aria-label="Secções das definições">${SETTINGS_SECTIONS.map(([id,label,icon,status])=>`<button type="button" class="index-row" data-action="settings-open" data-section="${id}"><span class="index-ico">${ico(icon)}</span><span class="index-text"><strong>${esc(label)}</strong><small>${esc(status())}</small></span>${ico('chevron','index-chev')}</button>`).join('')}</nav>
  <button type="button" class="index-row index-row-solo" data-action="profile-open"><span class="index-ico">${avatarHtml(me(),'mini')}</span><span class="index-text"><strong>O teu perfil</strong><small>Fotografia, contactos, palavra-passe e terminar sessão</small></span>${ico('chevron','index-chev')}</button>`;
 }
 const back=`<button type="button" class="back-link" data-action="settings-open" data-section="">${ico('back')} Definições</button>`;
 const title=(t,s)=>`${back}${head(t,s,false)}`;
 switch(sec[0]){
  case 'house':return `${title('A casa','Pisos, divisões, categorias e regras da casa.')}${isAdmin()?`<div class="settings-card"><h3>Assistente de início</h3><p>Escolhe o tipo de casa e recebe divisões e rotinas sugeridas. Não apaga nada do que já existe; só acrescenta o que escolheres.</p><button type="button" class="button" data-action="onboarding-open">${ico('sparkle')} Abrir o assistente</button></div>`:''}${rulesCard()}${settingsHouseCard()}`;
  case 'notify':return `${title('Notificações e Home Assistant','O que te avisa e onde.')}<div class="settings-card"><h3>Sino da app</h3><p>Recebes no sino as tarefas que te atribuem, a tua vez nas rotinas, conclusões das tarefas que criaste, aniversários, revisões de equipamentos e o calendário do mês. «Limpar» só as tira do sino; ficam em «Ver todas» durante 30 dias.</p><button type="button" class="button" data-action="nav" data-page="notifications">${ico('bell')} Ver todas as notificações</button></div>${isAdmin()?haCard()+haDashboardCard():`<div class="settings-card"><h3>Home Assistant</h3><p>As notificações no telemóvel e os sensores da casa são configurados pelo administrador.</p></div>`}`;
  case 'data':return `${title('Dados e cópias','Onde estão os dados e como os guardar.')}<div class="settings-card"><h3>Sincronização</h3><p>${demo?'Estás a utilizar uma demonstração local neste browser. A versão com servidor sincroniza automaticamente as alterações entre todos os membros.':'As alterações das outras pessoas aparecem sozinhas, em poucos segundos. Se estiveres a escrever, a app avisa e espera que termines. Sem rede, as conclusões e as compras ficam guardadas no telemóvel e são enviadas quando a ligação voltar.'}</p><button class="button" data-action="refresh">${ico('refresh')} Atualizar agora</button></div>${backupsCard()}${isAdmin()||demo?`<div class="settings-card"><h3>Importar tarefas</h3><p>Para carregar uma lista inicial num servidor novo, seleciona o ficheiro JSON privado guardado no teu computador. O GitHub guarda apenas o código, nunca a lista de tarefas. Tarefas repetidas são ignoradas.</p><button class="button" data-action="import">${ico('download')} Importar ficheiro JSON</button><input id="casa-import-file" type="file" accept=".json,application/json" hidden /></div><div class="settings-card"><h3>Exportar</h3><p>Guarda um ficheiro JSON com as tarefas, as pessoas e o histórico de conclusões.</p><button class="button" data-action="export">${ico('download')} Exportar dados</button></div>`:''}`;
  case 'appearance':return `${title('Aparência','Claro, escuro ou a seguir o telemóvel.')}<div class="settings-card">${appearanceField()}</div>`;
  case 'about':return `${title('Sobre a app','Versão, instalação e licença.')}<div class="settings-card"><h3>Daily Casa ${esc(APP_VER)}</h3><p>Dados guardados no servidor desta casa (Home Assistant), sem serviços externos. Todos os direitos reservados.</p><button type="button" class="button" data-action="nav" data-page="notifications">${ico('bell')} Notificações</button></div><div class="settings-card"><h3>Instalar no telemóvel</h3><p>Para ter a Daily Casa como app própria, sem o cabeçalho do Home Assistant: o administrador liga o <b>acesso direto</b> no Home Assistant (Definições → Aplicações → Daily Casa → Configuração → Rede, porta 3000). Depois, no telemóvel ligado ao Wi-Fi de casa, abre o endereço IP do Home Assistant com a porta (ex.: <code>http://192.168.1.50:3000</code>; o IP está em Definições → Sistema → Rede do Home Assistant), entra com a tua conta e escolhe Partilhar → Adicionar ao ecrã principal (iPhone) ou menu → Instalar aplicação (Android).</p><p class="field-help">Fora de casa, continua a usar a app Home Assistant, onde a Daily Casa está na barra lateral.</p></div>`;
 }
 return '';
}
// Cartão para o painel do Home Assistant (usa os sensores publicados pela app).
function haDashboardCard(){
 if(!haData?.available)return '';const path=haData.panelUrl||'/daily_casa';
 const yaml=`type: vertical-stack\ncards:\n  - type: markdown\n    title: Daily Casa\n    content: >-\n      **Casa em ordem: {{ states('sensor.daily_casa_estado_da_casa') }}%**\n\n      {% set t = state_attr('sensor.daily_casa_hoje', 'tarefas') or [] %}\n      {% if t | count == 0 %}Nada para hoje.{% else %}\n      {% for x in t %}- {{ 'Atrasada: ' if x.atrasada }}{{ x.titulo }}{{ ' · ' ~ x.divisao if x.divisao }}{{ ' · ' ~ x.quem if x.quem }}\n      {% endfor %}{% endif %}\n\n      Compras: {{ states('sensor.daily_casa_compras') }} por comprar\n  - type: button\n    name: Abrir a Daily Casa\n    icon: mdi:home-variant-outline\n    tap_action:\n      action: navigate\n      navigation_path: ${path}`;
 return `<div class="settings-card"><h3>Cartão para o painel</h3><p>Mostra as tarefas de hoje, o estado da casa e as compras num painel do Home Assistant (por exemplo, num tablet na cozinha). Requer «Publicar o estado da casa como sensores» ligado.</p><ol class="steps-mini"><li>No Home Assistant, abre o painel e escolhe <b>Editar painel</b> → <b>Adicionar cartão</b> → <b>Manual</b>.</li><li>Cola o código abaixo e guarda.</li></ol><pre class="code-block">${esc(yaml)}</pre><button type="button" class="button" data-action="copy-ha-card">${ico('copy')} Copiar código</button></div>`;
}

actionHandlers.push(async(name,el)=>{
 if(name==='settings-open'){settingsSection=el.dataset.section||'';render();window.scrollTo(0,0);return true;}
 if(name==='copy-ha-card'){const pre=el.parentElement.querySelector('.code-block');await copyText(pre?.textContent||'','Código do cartão copiado.',pre);return true;}
 if(name==='nav'&&el.dataset.page==='settings'){settingsSection=el.dataset.section||'';return false;}
 return false;
});

// Importar: resumo do ficheiro e opção de substituir o que existe (com cópia de segurança automática antes).
modalRenderers.import=holder=>{
 const {payload,file}=modal;const t=payload.tasks||[];const routines=t.filter(x=>x.kind==='routine').length;const rooms=payload.settings?.rooms?.length||0;const now=tasks().length;
 const body=`<p class="import-summary"><b>${esc(file)}</b><br>${plural(t.length-routines,'tarefa pontual','tarefas pontuais')} · ${plural(routines,'rotina','rotinas')}${rooms?` · ${plural(rooms,'divisão','divisões')}`:''}</p>
 ${demo?'':`<label class="check-line"><input type="checkbox" id="imp-replace" ${now?'checked':''}/> Apagar primeiro as ${plural(now,'tarefa e rotina atual','tarefas e rotinas atuais')}</label>
 <label class="check-line"><input type="checkbox" id="imp-other"/> Limpar também a lista de compras, os registos de horas e o histórico de conclusões</label>
 <p class="field-help">Antes de apagar, a app guarda uma cópia de segurança «Antes de importar» (Definições › Dados e cópias), para poder voltar atrás. Pessoas, finanças, equipamentos e definições não são tocados.</p>`}
 <div class="modal-actions"><button type="button" class="button" data-action="close">Cancelar</button><span class="spacer"></span><button type="button" class="button primary" data-action="import-run">${ico('download')} Importar</button></div>`;
 holder.innerHTML=modalShell({title:'Importar tarefas',sub:'As tarefas repetidas (mesmo título, divisão e tipo) são ignoradas.',body,cls:'import-modal'});
 holder.querySelector('#imp-other')?.addEventListener('change',e=>{if(e.target.checked){const r=holder.querySelector('#imp-replace');if(r)r.checked=true;}});
};
actionHandlers.push(async(name)=>{
 if(name!=='import-run')return false;const {payload,file}=modal;const rep=document.getElementById('imp-replace')?.checked,other=document.getElementById('imp-other')?.checked;
 if(rep&&!await confirmDialog({title:'Substituir as tarefas atuais?',message:`As ${tasks().length} tarefas e rotinas atuais são apagadas${other?', bem como as compras, os registos de horas e o histórico':''}, e substituídas pelas de «${file}». Fica uma cópia de segurança para voltar atrás.`,confirmLabel:'Substituir',danger:true}))return true;
 if(demo){let n=0;if(rep)store.tasks=[];const ids=new Set(store.tasks.map(t=>[t.title,t.room,t.kind].join('|')));for(const raw of payload.tasks){const key=[raw.title,raw.room,raw.kind].join('|');if(!raw.title||ids.has(key))continue;ids.add(key);store.tasks.push({status:'todo',priority:'P3',repeat:'none',kind:'project',...raw,id:'import-'+Date.now()+'-'+n++});}persistDemo();modal=null;render();toast(`${n} tarefas importadas para a demonstração.`);return true;}
 const r=await api('/api/import','POST',{tasks:payload.tasks,settings:payload.settings,replace:rep?{tasks:true,other:!!other}:false});
 modal=null;await reload();toast(`${r.imported} importadas${r.skipped?`, ${r.skipped} ignoradas`:''}${r.removed?` · ${r.removed} antigas apagadas (cópia guardada)`:''}.`);return true;
});

/* ───────────── 2.2 · Notificações no telemóvel (perfil) e recuperar a palavra-passe ───────────── */
Object.assign(paths,{login:'<path d="M10 17l5-5-5-5M15 12H3"/><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/>'});
// Interruptor por pessoa: as notificações chegam pela app Home Assistant do telemóvel (o administrador escolhe o telemóvel de cada um).
function pushField(){
 const u=me();const ready=demo||!!u.pushReady;const on=ready&&!u.pushOff;
 const state=!ready?(store.haAvailable?'O administrador ainda não ligou o teu telemóvel':'Disponível na app instalada no Home Assistant'):on?'Ligadas · tarefas atribuídas e resumo diário':'Desligadas · continuas a ver tudo no sino';
 return `<div class="field pref-row"><div><span class="field-label" id="push-label">Notificações no telemóvel</span><small class="appearance-state" id="push-state">${esc(state)}</small></div><button type="button" class="switch" role="switch" aria-checked="${on}" aria-labelledby="push-label" data-action="push-toggle" ${ready?'':'disabled'}><span></span></button></div>`;
}
actionHandlers.push(async(name,el)=>{
 if(name==='push-toggle'){const on=el.getAttribute('aria-checked')!=='true';el.setAttribute('aria-checked',String(on));
  try{if(demo){me().pushOff=!on;}else{const r=await api('/api/me','PATCH',{pushOff:!on});if(r.people)store.people=r.people;}const st=document.getElementById('push-state');if(st)st.textContent=on?'Ligadas · tarefas atribuídas e resumo diário':'Desligadas · continuas a ver tudo no sino';toast(on?'Notificações no telemóvel ligadas.':'Notificações no telemóvel desligadas.');}
  catch(e){el.setAttribute('aria-checked',String(!on));toast(e.message);}return true;}
 if(name==='forgot-open'){renderForgot(1,document.querySelector('#auth-form [name=email]')?.value||'');return true;}
 if(name==='forgot-back'){renderAuth('login');return true;}
 return false;
});
// Recuperar a palavra-passe: 1) pedir o código (chega à app Home Assistant do telemóvel; o administrador é avisado); 2) código + nova palavra-passe.
function renderForgot(step,email='',msg=''){
 const box=document.querySelector('.auth-inner');if(!box)return;
 box.innerHTML=`<img class="auth-mobile-logo" src="logo-primary-dark.svg" alt="Daily Casa" /><div class="eyebrow">DAILY CASA · RECUPERAR ACESSO</div><h2>${step===1?'Esqueceste-te da palavra-passe?':'Escolhe uma nova palavra-passe.'}</h2>
 <p>${step===1?'Indica o teu email. Se o teu telemóvel estiver ligado ao Home Assistant, recebes lá um código; o administrador é também avisado e pode repor-te a palavra-passe.':'Escreve o código de 6 dígitos que recebeste na app Home Assistant e a nova palavra-passe.'}</p>
 <form id="forgot-form">${step===1?`<div class="field"><label>Email</label><input type="email" name="email" required autocomplete="username" autocapitalize="none" spellcheck="false" value="${esc(email)}" placeholder="nome@exemplo.pt"/></div>`:`<input type="hidden" name="email" value="${esc(email)}"/><div class="field"><label>Código</label><input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="\\d{6}" maxlength="6" required placeholder="000000"/></div><div class="field"><label>Nova palavra-passe</label><input type="password" name="password" autocomplete="new-password" minlength="10" required placeholder="Mínimo de 10 caracteres"/></div>`}
 <button class="button primary auth-submit" type="submit">${ico(step===1?'mail':'check')}<span>${step===1?'Enviar código':'Guardar e entrar'}</span></button><div class="auth-message ${msg?'ok':''}" id="auth-error">${esc(msg)}</div>
 <button type="button" class="auth-link" data-action="forgot-back">${ico('back')} Voltar ao login</button>${step===2?`<button type="button" class="auth-link" data-action="forgot-open">Pedir um novo código</button>`:''}</form>`;
 const f=box.querySelector('#forgot-form');f.querySelector('input:not([type=hidden])')?.focus();
 f.addEventListener('submit',async e=>{e.preventDefault();const v=Object.fromEntries(new FormData(f));const b=f.querySelector('[type=submit]');b.disabled=true;
  try{if(step===1){await api('/api/password/forgot','POST',{email:v.email});renderForgot(2,v.email,'Se o email estiver registado, o código foi enviado para a app Home Assistant do teu telemóvel (válido 15 minutos). Se não chegar, o administrador já foi avisado.');}
   else{await api('/api/password/reset','POST',v);await load();render();toast('Palavra-passe alterada. Bem-vindo de volta.');}}
  catch(err){const m=box.querySelector('#auth-error');m.classList.remove('ok');m.textContent=err.message;b.disabled=false;}});
}

/* 2.3.7 · Olho nos campos de palavra-passe (entrada, recuperação, perfil, pessoas): mostra ou esconde o que se escreveu. */
function enhancePasswords(root){
 (root.querySelectorAll?root:document).querySelectorAll('input[type="password"]:not([data-eye])').forEach(inp=>{
  inp.dataset.eye='1';const w=document.createElement('span');w.className='pw-wrap';inp.parentNode.insertBefore(w,inp);w.appendChild(inp);
  const b=document.createElement('button');b.type='button';b.className='pw-eye';b.setAttribute('aria-label','Mostrar palavra-passe');b.setAttribute('aria-pressed','false');b.innerHTML=ico('eye');w.appendChild(b);});
}
document.addEventListener('pointerdown',e=>{if(e.target.closest('.pw-eye'))e.preventDefault();},true);
document.addEventListener('click',e=>{const b=e.target.closest('.pw-eye');if(!b)return;e.preventDefault();e.stopPropagation();
 const inp=b.parentNode.querySelector('input');if(!inp)return;const show=inp.type==='password';const pos=inp.selectionStart;
 inp.type=show?'text':'password';b.setAttribute('aria-pressed',String(show));b.setAttribute('aria-label',show?'Esconder palavra-passe':'Mostrar palavra-passe');b.innerHTML=ico(show?'eye-off':'eye');
 if(document.activeElement===inp&&pos!=null)try{inp.setSelectionRange(pos,pos);}catch{}},true);
// Ao submeter, volta a esconder (para o gestor de palavras-passe do iPhone reconhecer o campo).
document.addEventListener('submit',e=>{e.target.querySelectorAll?.('.pw-wrap input[data-eye]').forEach(i=>{i.type='password';const b=i.parentNode.querySelector('.pw-eye');if(b){b.setAttribute('aria-pressed','false');b.innerHTML=ico('eye');}});},true);
new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1)enhancePasswords(n);}).observe(document.body,{childList:true,subtree:true});
enhancePasswords(document);
