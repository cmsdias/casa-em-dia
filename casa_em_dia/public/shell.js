/* Casa em Dia — estrutura da app (2.0)
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
 phone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
 mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
 upload:'<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>'
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
  case 'house':return `${title('A casa','Pisos, divisões, categorias e regras da casa.')}${rulesCard()}${settingsHouseCard()}${isAdmin()?`<div class="settings-card"><h3>Assistente de início</h3><p>Escolhe o tipo de casa e recebe divisões e rotinas sugeridas. Não apaga nada do que já existe; só acrescenta o que escolheres.</p><button type="button" class="button" data-action="onboarding-open">${ico('sparkle')} Abrir o assistente</button></div>`:''}`;
  case 'notify':return `${title('Notificações e Home Assistant','O que te avisa e onde.')}<div class="settings-card"><h3>Sino da app</h3><p>Recebes no sino as tarefas que te atribuem, a tua vez nas rotinas, conclusões das tarefas que criaste, aniversários, revisões de equipamentos e o calendário do mês. «Limpar» só as tira do sino; ficam em «Ver todas» durante 30 dias.</p><button type="button" class="button" data-action="nav" data-page="notifications">${ico('bell')} Ver todas as notificações</button></div>${isAdmin()?haCard()+haDashboardCard():`<div class="settings-card"><h3>Home Assistant</h3><p>As notificações no telemóvel e os sensores da casa são configurados pelo administrador.</p></div>`}`;
  case 'data':return `${title('Dados e cópias','Onde estão os dados e como os guardar.')}<div class="settings-card"><h3>Sincronização</h3><p>${demo?'Estás a utilizar uma demonstração local neste browser. A versão com servidor sincroniza automaticamente as alterações entre todos os membros.':'As alterações das outras pessoas aparecem sozinhas, em poucos segundos. Se estiveres a escrever, a app avisa e espera que termines. Sem rede, as conclusões e as compras ficam guardadas no telemóvel e são enviadas quando a ligação voltar.'}</p><button class="button" data-action="refresh">${ico('refresh')} Atualizar agora</button></div>${backupsCard()}${isAdmin()||demo?`<div class="settings-card"><h3>Importar tarefas</h3><p>Para carregar uma lista inicial num servidor novo, seleciona o ficheiro JSON privado guardado no teu computador. O GitHub guarda apenas o código, nunca a lista de tarefas. Tarefas repetidas são ignoradas.</p><button class="button" data-action="import">${ico('download')} Importar ficheiro JSON</button><input id="casa-import-file" type="file" accept=".json,application/json" hidden /></div><div class="settings-card"><h3>Exportar</h3><p>Guarda um ficheiro JSON com as tarefas, as pessoas e o histórico de conclusões.</p><button class="button" data-action="export">${ico('download')} Exportar dados</button></div>`:''}`;
  case 'appearance':return `${title('Aparência','Claro, escuro ou a seguir o telemóvel.')}<div class="settings-card">${appearanceField()}</div>`;
  case 'about':return `${title('Sobre a app','Versão, instalação e licença.')}<div class="settings-card"><h3>Casa em Dia ${esc(APP_VER)}</h3><p>Dados guardados no servidor desta casa (Home Assistant), sem serviços externos. Todos os direitos reservados.</p><button type="button" class="button" data-action="nav" data-page="notifications">${ico('bell')} Notificações</button></div><div class="settings-card"><h3>Instalar no telemóvel</h3><p>Abre a aplicação através de uma ligação segura HTTPS. No iPhone: Partilhar → Adicionar ao ecrã principal. No Android/Chrome: menu → Instalar aplicação. Dentro da app Home Assistant, a Casa em Dia está na barra lateral.</p></div>`;
 }
 return '';
}
// Cartão para o painel do Home Assistant (usa os sensores publicados pela app).
function haDashboardCard(){
 if(!haData?.available)return '';const path=haData.panelUrl||'/casa_em_dia';
 const yaml=`type: vertical-stack\ncards:\n  - type: markdown\n    title: Casa em Dia\n    content: >-\n      **Casa em ordem: {{ states('sensor.casa_em_dia_estado_da_casa') }}%**\n\n      {% set t = state_attr('sensor.casa_em_dia_hoje', 'tarefas') or [] %}\n      {% if t | count == 0 %}Nada para hoje.{% else %}\n      {% for x in t %}- {{ 'Atrasada: ' if x.atrasada }}{{ x.titulo }}{{ ' · ' ~ x.divisao if x.divisao }}{{ ' · ' ~ x.quem if x.quem }}\n      {% endfor %}{% endif %}\n\n      Compras: {{ states('sensor.casa_em_dia_compras') }} por comprar\n  - type: button\n    name: Abrir a Casa em Dia\n    icon: mdi:home-variant-outline\n    tap_action:\n      action: navigate\n      navigation_path: ${path}`;
 return `<div class="settings-card"><h3>Cartão para o painel</h3><p>Mostra as tarefas de hoje, o estado da casa e as compras num painel do Home Assistant (por exemplo, num tablet na cozinha). Requer «Publicar o estado da casa como sensores» ligado.</p><ol class="steps-mini"><li>No Home Assistant, abre o painel e escolhe <b>Editar painel</b> → <b>Adicionar cartão</b> → <b>Manual</b>.</li><li>Cola o código abaixo e guarda.</li></ol><pre class="code-block">${esc(yaml)}</pre><button type="button" class="button" data-action="copy-ha-card">${ico('download')} Copiar código</button></div>`;
}

actionHandlers.push(async(name,el)=>{
 if(name==='settings-open'){settingsSection=el.dataset.section||'';render();window.scrollTo(0,0);return true;}
 if(name==='copy-ha-card'){const pre=el.parentElement.querySelector('.code-block');await copyText(pre?.textContent||'','Código do cartão copiado.');return true;}
 if(name==='nav'&&el.dataset.page==='settings'){settingsSection=el.dataset.section||'';return false;}
 return false;
});
