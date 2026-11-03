'use strict';
// Integração com o Home Assistant através da API do Supervisor (só funciona como add-on).
// - Notificações para a app Home Assistant de cada pessoa (serviço notify.mobile_app_…).
// - Sensores com o estado da casa (tarefas atrasadas, para hoje, compras por fazer…).
// As tarefas privadas nunca são incluídas nos sensores nem em notificações de outras pessoas.
const SUPERVISOR=process.env.SUPERVISOR_URL||'http://supervisor';
const UNITS=require('../public/shopping-units.js');

function createHa({getDb,todayISO,nowHM,save=()=>{},onError=console.error,fetchImpl=globalThis.fetch}){
  const token=()=>process.env.SUPERVISOR_TOKEN||'';
  const available=()=>!!token();
  let selfInfo=null,lastDigest='',sensorTimer=null,lastSensors='';
  async function call(method,pathName,body){
    if(!available())throw Error('A integração só está disponível na app instalada no Home Assistant.');
    const res=await fetchImpl(SUPERVISOR+pathName,{method,headers:{Authorization:'Bearer '+token(),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(8000)});
    const text=await res.text();let data=null;try{data=text?JSON.parse(text):null;}catch{data=text;}
    if(!res.ok)throw Error(`Home Assistant respondeu ${res.status}${data&&data.message?': '+data.message:''}`);
    return data;
  }
  const settings=()=>getDb().ha||{};
  async function info(){
    if(!available())return {available:false};
    if(!selfInfo){try{const r=await call('GET','/addons/self/info');selfInfo=r?.data||r||{};}catch(e){onError('HA self info:',e.message);selfInfo={};}}
    return {available:true,ingressUrl:selfInfo.ingress_url||'',hostname:selfInfo.hostname||''};
  }
  async function notifyServices(){
    const services=await call('GET','/core/api/services');
    const notify=(Array.isArray(services)?services:[]).find(s=>s.domain==='notify');
    return Object.keys(notify?.services||{}).filter(s=>s!=='notify'&&s!=='persistent_notification').sort();
  }
  async function notify(personId,title,message,extra={}){
    const service=settings().notify?.[personId];if(!service||!available())return false;
    if(!/^[a-z0-9_]+$/.test(service))return false;
    const i=await info();const url=i.ingressUrl||'';
    // url (iOS) e clickAction (Android) abrem a app Casa em Dia ao tocar na notificação.
    await call('POST',`/core/api/services/notify/${service}`,{title,message,data:{url,clickAction:url,group:'casa-em-dia',tag:extra.tag||undefined}});
    return true;
  }
  const db=()=>getDb();
  const visibleTo=(p,t)=>t.visibility!=='private'||t.createdBy===p.id;
  function personSummary(p){
    const today=todayISO();
    const mine=db().tasks.filter(t=>t.status!=='done'&&t.assignedTo===p.id&&visibleTo(p,t));
    return {overdue:mine.filter(t=>t.dueDate&&t.dueDate<today),today:mine.filter(t=>t.dueDate===today)};
  }
  // Resumo diário à hora definida: tarefas atrasadas e para hoje de cada pessoa com notificações ligadas.
  async function digestTick(){
    const s=settings();if(!available()||!s.events?.daily)return;
    const day=todayISO();const time=s.dailyTime||'08:30';
    if(lastDigest===day||nowHM()<time)return;
    if(s.lastDigest===day){lastDigest=day;return;}
    lastDigest=day;s.lastDigest=day;save();
    for(const p of db().people.filter(p=>p.active!==false&&s.notify?.[p.id])){
      const {overdue,today}=personSummary(p);if(!overdue.length&&!today.length)continue;
      const parts=[];if(today.length)parts.push(`${today.length} para hoje`);if(overdue.length)parts.push(`${overdue.length} ${overdue.length===1?'atrasada':'atrasadas'}`);
      const names=[...today,...overdue].slice(0,4).map(t=>'• '+t.title).join('\n');
      try{await notify(p.id,`Bom dia, ${p.name.split(' ')[0]}: ${parts.join(' e ')}`,names,{tag:'resumo-diario'});}catch(e){onError('HA resumo:',e.message);}
    }
  }
  async function taskAssigned(task,actor){
    const s=settings();if(!available()||!s.events?.assigned||!task.assignedTo||task.assignedTo===actor.id)return;
    const p=db().people.find(x=>x.id===task.assignedTo);if(!p||p.active===false||!visibleTo(p,task))return;
    try{await notify(p.id,'Nova tarefa para ti',`${task.title}${task.dueDate?' · até '+task.dueDate.split('-').reverse().join('/'):''}\nAtribuída por ${actor.name}`,{tag:'tarefa-'+task.id});}catch(e){onError('HA atribuição:',e.message);}
  }
  function sensorStates(){
    const today=todayISO();
    const shared=db().tasks.filter(t=>t.visibility!=='private'&&t.status!=='done');
    const overdue=shared.filter(t=>t.dueDate&&t.dueDate<today),dueToday=shared.filter(t=>t.dueDate===today);
    const shopping=(db().shopping||[]).filter(x=>!x.purchased);
    const titles=a=>a.slice(0,20).map(t=>t.title);
    const icon='mdi:home-outline';
    return {
      'sensor.casa_em_dia_tarefas_por_fazer':{state:shared.filter(t=>t.kind==='project').length,attributes:{friendly_name:'Casa em Dia · Tarefas por fazer',unit_of_measurement:'tarefas',icon:'mdi:format-list-checks'}},
      'sensor.casa_em_dia_tarefas_atrasadas':{state:overdue.length,attributes:{friendly_name:'Casa em Dia · Tarefas atrasadas',unit_of_measurement:'tarefas',icon:'mdi:alert-circle-outline',tarefas:titles(overdue)}},
      'sensor.casa_em_dia_para_hoje':{state:dueToday.length,attributes:{friendly_name:'Casa em Dia · Para hoje',unit_of_measurement:'tarefas',icon:'mdi:calendar-today',tarefas:titles(dueToday)}},
      'sensor.casa_em_dia_compras':{state:shopping.length,attributes:{friendly_name:'Casa em Dia · Compras por fazer',unit_of_measurement:'produtos',icon:'mdi:cart-outline',produtos:shopping.slice(0,40).map(x=>(x.quantity&&x.quantity!=='1')||x.unit?`${x.title} (${UNITS.format(x.quantity,x.unit)})`:x.title)}},
      'sensor.casa_em_dia_ultima_conclusao':{state:(db().history||[]).slice(-1)[0]?.at||'unknown',attributes:{friendly_name:'Casa em Dia · Última tarefa concluída',device_class:'timestamp',icon,tarefa:(db().history||[]).slice(-1)[0]?.title||''}},
    };
  }
  async function pushSensors(force=false){
    if(!available()||!settings().sensors)return;
    const states=sensorStates();const sig=JSON.stringify(states);if(!force&&sig===lastSensors)return;lastSensors=sig;
    for(const [entity,v] of Object.entries(states)){try{await call('POST',`/core/api/states/${entity}`,{state:String(v.state),attributes:v.attributes});}catch(e){onError('HA sensor:',e.message);lastSensors='';return;}}
  }
  // Chamado depois de cada gravação: agrupa alterações seguidas numa só atualização.
  function changed(){if(!available()||!settings().sensors)return;clearTimeout(sensorTimer);sensorTimer=setTimeout(()=>pushSensors().catch(()=>{}),3000);sensorTimer.unref?.();}
  function start(){if(!available())return;const t=setInterval(()=>{digestTick().catch(()=>{});pushSensors().catch(()=>{});},60_000);t.unref?.();setTimeout(()=>pushSensors(true).catch(()=>{}),5000).unref?.();}
  return {available,info,notifyServices,notify,taskAssigned,digestTick,sensorStates,pushSensors,changed,start};
}
module.exports={createHa};
