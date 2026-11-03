'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {URL}=require('node:url');
const {createBackups}=require('./lib/backups');
const {createHa}=require('./lib/ha');
const SEASONAL=require('./public/seasonal-defaults.js');
const FIN=require('./public/finance-core.js');
const UNITS=require('./public/shopping-units.js');
function cleanUnit(v){const u=cleanStr(v,20);if(!u)return '';if(!UNITS.KEYS.includes(u))throw Error('Unidade inválida.');return u;}
// Quantidade: número (vírgula decimal, ex.: «0,5») ou, por compatibilidade, texto livre das versões anteriores.
function cleanQty(v){const raw=cleanStr(v,50);if(!raw)return '1';const n=raw.replace(',','.');return /^\d{1,5}(\.\d{1,3})?$/.test(n)?n.replace('.',','):raw;}
const APP_VERSION=require('./package.json').version;
const BOOT=crypto.randomBytes(3).toString('hex');let revCounter=0;const rev=()=>`${BOOT}-${revCounter}`;let ha=null;
const ROOT=__dirname, WEB=path.join(ROOT,'public');
const DATA_DIR=process.env.DATA_DIR||path.join(ROOT,'data');
const DB_FILE=path.join(DATA_DIR,'casa.json');
const PORT=+(process.env.PORT||3000);
const HOST=process.env.HOST||'0.0.0.0';
fs.mkdirSync(DATA_DIR,{recursive:true});
const PHOTO_DIR=path.join(DATA_DIR,'photos');fs.mkdirSync(PHOTO_DIR,{recursive:true});
let db;let rawDb=null;
if (fs.existsSync(DB_FILE)) {
  try{rawDb=fs.readFileSync(DB_FILE,'utf8');db=JSON.parse(rawDb);}
  catch(e){console.error(`ERRO: não foi possível ler ${DB_FILE} (${e.message}). Os dados não foram alterados; restaura uma cópia de segurança.`);process.exit(1);}
}
else {
  const s=JSON.parse(fs.readFileSync(path.join(ROOT,'seed.json'),'utf8'));
  db={version:1,secret:crypto.randomBytes(32).toString('hex'),people:[],tasks:s.tasks.map(t=>({...t,id:crypto.randomUUID()})),history:[],settings:{rooms:['Cozinha','Lavandaria','Sala','Escritório','WC completo','WC serviço','WC suite','Exterior','Organização geral'],categories:['Manutenção','Arrumação','Limpeza','Compras','Obras','Geral']}};
}

// Migração conservadora e compatível com cópias de segurança anteriores (também usada ao restaurar uma cópia).
function migrate(){
 if(typeof db.secret!=='string'||db.secret.length<32)db.secret=crypto.randomBytes(32).toString('hex');
 for(const k of ['people','tasks','history','shopping','workLogs','audit'])db[k]=Array.isArray(db[k])?db[k]:[];
 for(const p of db.people){if(p.role==='member')p.role='resident';}
 const originalAdmin=db.people.find(p=>p.role==='admin')?.id||null;
 for(const t of db.tasks){if(!t.createdBy)t.createdBy=originalAdmin;if(!t.visibility)t.visibility='shared';}
 db.finance=db.finance&&typeof db.finance==='object'?db.finance:{accounts:[],transactions:[],budgets:[],goals:[]};
 for(const key of ['accounts','transactions','budgets','goals'])if(!Array.isArray(db.finance[key]))db.finance[key]=[];
 FIN.migrate(db.finance);
 // 1.7: calendário sazonal, frequência das compras e integração com o Home Assistant.
 if(!Array.isArray(db.seasonal))db.seasonal=SEASONAL.DEFAULTS.map(x=>({id:'s-'+x.key,...x,active:true}));
 if(!db.shoppingFreq||typeof db.shoppingFreq!=='object'||Array.isArray(db.shoppingFreq))db.shoppingFreq={};
 db.ha=db.ha&&typeof db.ha==='object'?db.ha:{};
 db.ha.notify=db.ha.notify&&typeof db.ha.notify==='object'?db.ha.notify:{};
 db.ha.events={assigned:true,daily:true,...(db.ha.events||{})};
 if(!/^\d{2}:\d{2}$/.test(db.ha.dailyTime||''))db.ha.dailyTime='08:30';
 db.ha.sensors=!!db.ha.sensors;
 if(typeof db.ha.token!=='string'||db.ha.token.length<32)db.ha.token=crypto.randomBytes(24).toString('base64url');
 db.appVersion=APP_VERSION;
}
// Antes de migrar dados de outra versão, guarda uma cópia do ficheiro tal como estava.
const dateInTz=d=>new Intl.DateTimeFormat('en-CA',{timeZone:process.env.TZ||'Europe/Lisbon',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
const backups=createBackups({dataDir:DATA_DIR,getDb:()=>db,dateInTz});
if(rawDb&&db.appVersion!==APP_VERSION){try{backups.create('upgrade',rawDb);}catch(e){console.error('Não foi possível guardar a cópia anterior à atualização:',e.message);}}
rawDb=null;
migrate();save();
function roleOf(u){return u.role==='member'?'resident':u.role;}
const isActive=u=>u.active!==false;
// Dias de acesso de colaboradores (0 = domingo … 6 = sábado), no fuso horário da casa.
const HOUSE_TZ=process.env.TZ||'Europe/Lisbon';
const WEEKDAYS=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
function todayWeekday(){const d=new Intl.DateTimeFormat('en-US',{timeZone:HOUSE_TZ,weekday:'short'}).format(new Date());return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(d);}
function scheduleAllows(u){if(roleOf(u)!=='collaborator'||!Array.isArray(u.accessDays)||!u.accessDays.length)return true;return u.accessDays.includes(todayWeekday());}
function scheduleText(u){return u.accessDays.slice().sort((a,b)=>((a+6)%7)-((b+6)%7)).map(d=>WEEKDAYS[d].toLowerCase()).join(', ');}
function elevated(u){return ['admin','manager'].includes(roleOf(u));}
function canSeeTask(u,t){if(t.visibility==='private')return t.createdBy===u.id;if(roleOf(u)==='admin')return true;if(roleOf(u)==='collaborator')return t.createdBy===u.id||t.assignedTo===u.id;return true;}
function canEditTask(u,t){if(t.visibility==='private')return t.createdBy===u.id;return roleOf(u)==='admin'||roleOf(u)==='manager'||t.createdBy===u.id;}
function canCompleteTask(u,t){return canEditTask(u,t)||t.assignedTo===u.id;}
function allowedTaskPatch(u,t,b){if(canEditTask(u,t))return true;
 return canCompleteTask(u,t)&&Object.keys(b).every(k=>['status','subtasks'].includes(k));}
function logAction(u,action,entityId){db.audit.push({id:id(),actor:u.id,action,entityId,at:new Date().toISOString()});if(db.audit.length>3000)db.audit=db.audit.slice(-3000);}
function visibleState(u){const allowed=db.tasks.filter(t=>canSeeTask(u,t));const ids=new Set(allowed.map(t=>t.id));const users=roleOf(u)==='collaborator'?db.people.filter(p=>p.id===u.id||allowed.some(t=>t.assignedTo===p.id||t.createdBy===p.id)):db.people;const people=users.map(({id,name,username,role,avatar,photo,active,accessDays,mustChangePassword})=>({id,name,username:roleOf(u)==='collaborator'?'':username,role:roleOf({role}),avatar:avatar||'●',photo:photo||'',active:active!==false,...(roleOf(u)==='admin'?{accessDays:Array.isArray(accessDays)?accessDays:[],mustChangePassword:!!mustChangePassword}:{})}));return {...state(),people,tasks:allowed,history:db.history.filter(h=>h.taskId?ids.has(h.taskId):h.by===u.id).slice(-200),shopping:db.shopping,workLogs:db.workLogs.filter(l=>elevated(u)?(!l.taskId||ids.has(l.taskId)):l.userId===u.id||l.actor===u.id),audit:elevated(u)?db.audit.filter(a=>!a.action.startsWith('task.')||ids.has(a.entityId)).slice(-300):[],permissions:{manageUsers:roleOf(u)==='admin',manageSettings:elevated(u),manageAllShared:elevated(u)},rev:rev(),seasonal:roleOf(u)==='collaborator'?[]:db.seasonal,shoppingFrequent:frequentShopping(),haAvailable:!!ha?.available()};}
function frequentShopping(){return Object.values(db.shoppingFreq).sort((a,b)=>b.count-a.count||String(b.last).localeCompare(String(a.last))).slice(0,16).map(({title,category,quantity,unit})=>({title,category,quantity,unit:unit||''}));}


function financeAllowed(u){return elevated(u);}
function dateISO(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||new Date(v+'T12:00:00Z').toISOString().slice(0,10)!==v)throw Error('Data inválida.');return v;}

// Revisão: muda a cada gravação; os clientes comparam-na para saber se há alterações de outras pessoas.
function save(){const tmp=DB_FILE+'.tmp'; fs.writeFileSync(tmp,JSON.stringify(db,null,2),{mode:0o600});fs.renameSync(tmp,DB_FILE);revCounter++;ha?.changed();}
function send(res,status,data,extra={}){const body=JSON.stringify(data);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra});res.end(body);}
function fail(res,status,msg){send(res,status,{error:msg});}
function id(){return crypto.randomUUID();}
function cleanStr(val,max=150){return String(val??'').trim().slice(0,max);}
function passwordHash(pw,salt=crypto.randomBytes(16).toString('hex')){return `${salt}:${crypto.scryptSync(pw,salt,64).toString('hex')}`;}
function verifyPw(pw,stored){const [salt,expected]=stored.split(':');const hash=passwordHash(pw,salt).split(':')[1]; return crypto.timingSafeEqual(Buffer.from(hash,'hex'),Buffer.from(expected,'hex'));}
const DUMMY_HASH=passwordHash('palavra-passe-inexistente','00000000000000000000000000000000');
// Limite de tentativas falhadas por utilizador (em memória): 8 falhas em 10 minutos bloqueiam novas tentativas até expirarem.
const LOGIN_WINDOW_MS=10*60_000,LOGIN_MAX_FAILURES=8;const loginAttempts=new Map();
function loginBlocked(username){const e=loginAttempts.get(username);if(!e)return false;if(Date.now()-e.first>LOGIN_WINDOW_MS){loginAttempts.delete(username);return false;}return e.count>=LOGIN_MAX_FAILURES;}
function loginFailed(username){const now=Date.now();const e=loginAttempts.get(username);if(!e||now-e.first>LOGIN_WINDOW_MS)loginAttempts.set(username,{first:now,count:1});else e.count++;if(loginAttempts.size>1000){for(const [k,v] of loginAttempts)if(now-v.first>LOGIN_WINDOW_MS)loginAttempts.delete(k);}}
function loginSucceeded(username){loginAttempts.delete(username);}
function session(user){const payload=Buffer.from(JSON.stringify({id:user.id,v:user.authVersion||1,exp:Date.now()+14*86400_000})).toString('base64url');const mac=crypto.createHmac('sha256',db.secret).update(payload).digest('base64url');return `${payload}.${mac}`;}
function readUser(req){const token=((req.headers.cookie||'').match(/(?:^|;\s*)casa_session=([^;]+)/)||[])[1];if(!token)return null;
try{const [payload,mac]=token.split('.');const sig=crypto.createHmac('sha256',db.secret).update(payload).digest('base64url');if(!mac||sig.length!==mac.length||!crypto.timingSafeEqual(Buffer.from(mac),Buffer.from(sig)))return null;const claim=JSON.parse(Buffer.from(payload,'base64url').toString());if(claim.exp<Date.now())return null;const u=db.people.find(x=>x.id===claim.id&&(x.authVersion||1)===claim.v);return u&&isActive(u)&&scheduleAllows(u)?u:null;}catch{return null;}}
function cookie(req,token){const secure=(req.headers['x-forwarded-proto']==='https'||req.socket.encrypted)?'; Secure':'';return `casa_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${token?14*86400:0}${secure}`;}
async function parseBody(req,limit=256_000){let size=0;let chunks=[];for await(const c of req){size+=c.length;if(size>limit)throw new Error('Pedido demasiado grande.');chunks.push(c);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}catch{throw new Error('JSON inválido.');}}
function publicPeople(){return db.people.map(({id,name,username,role,avatar,photo,active,accessDays,mustChangePassword})=>({id,name,username,role:role==='member'?'resident':role,avatar:avatar||'●',photo:photo||'',active:active!==false,accessDays:Array.isArray(accessDays)?accessDays:[],mustChangePassword:!!mustChangePassword}));}
// Fotografia de perfil: imagem pequena (redimensionada no browser) guardada como data URL.
const PHOTO_MAX=200_000;
function cleanPhoto(v){if(v===null||v==='')return '';if(typeof v!=='string'||v.length>PHOTO_MAX||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(v))throw Error('Fotografia inválida ou demasiado grande.');return v;}
function publicTasks(){return db.tasks;}
function state(){return {people:publicPeople(),tasks:publicTasks(),history:db.history.slice(-200),shopping:db.shopping,workLogs:db.workLogs,audit:db.audit.slice(-300),settings:db.settings||{rooms:[],categories:[]},serverTime:new Date().toISOString()};}
function patchTask(t,b){
  if('title'in b){if(!cleanStr(b.title,180))throw Error('Introduz o nome da tarefa.');t.title=cleanStr(b.title,180);}
  if('room'in b)t.room=cleanStr(b.room,70);
  if('notes'in b)t.notes=cleanStr(b.notes,1500);
  if('category'in b)t.category=cleanStr(b.category,70);
  if('visibility'in b){if(!['shared','private'].includes(b.visibility))throw Error('Visibilidade inválida.');t.visibility=b.visibility;}
  if('thisWeek'in b){if(typeof b.thisWeek!=='boolean')throw Error('Plano semanal inválido.');t.thisWeek=b.thisWeek;}
  if('subtasks'in b){if(!Array.isArray(b.subtasks)||b.subtasks.length>40)throw Error('Subtarefas inválidas.');t.subtasks=b.subtasks.map((x,i)=>({id:cleanStr(x.id,80)||String(i),title:cleanStr(x.title,180),done:!!x.done})).filter(x=>x.title);}
  if('estimatedMinutes'in b){const n=b.estimatedMinutes;if(n===''||n===null||n===undefined)t.estimatedMinutes=null;else if(!Number.isInteger(Number(n))||Number(n)<0||Number(n)>10080)throw Error('Duração inválida.');else t.estimatedMinutes=Number(n);}
  if('priority'in b){if(!['P1','P2','P3','P4'].includes(b.priority))throw Error('Prioridade inválida.');t.priority=b.priority;}
  if('kind'in b){if(!['project','routine'].includes(b.kind))throw Error('Tipo inválido.');t.kind=b.kind;}
  if('status'in b){if(!['todo','doing','waiting','done'].includes(b.status))throw Error('Estado inválido.');t.status=b.status;}
  if('assignedTo'in b){delete t.unassignedFrom;if(b.assignedTo && !db.people.some(p=>p.id===b.assignedTo&&isActive(p)))throw Error('Responsável não existe ou está desativado.');t.assignedTo=b.assignedTo||null;}
  if('dueDate'in b){const d=cleanStr(b.dueDate,10);t.dueDate=d?dateISO(d):'';}
  if('repeat'in b){if(!['none','daily','weekly','biweekly','monthly','quarterly','yearly'].includes(b.repeat))throw Error('Periodicidade inválida.');t.repeat=b.repeat;}
  if('rotation'in b){if(!Array.isArray(b.rotation)||b.rotation.length>10||b.rotation.some(x=>typeof x!=='string'||!db.people.some(p=>p.id===x&&isActive(p))))throw Error('Rotação inválida: escolhe pessoas com conta ativa.');t.rotation=[...new Set(b.rotation)];}
  if('suggested'in b)t.suggested=!!b.suggested;
  t.updatedAt=new Date().toISOString();
}
function nextDate(iso,rep){const base=iso?new Date(iso+'T12:00:00Z'):new Date();if(!iso)base.setUTCHours(12,0,0,0);const now=new Date();const step=()=>{if(rep==='daily')base.setUTCDate(base.getUTCDate()+1);if(rep==='weekly')base.setUTCDate(base.getUTCDate()+7);if(rep==='biweekly')base.setUTCDate(base.getUTCDate()+14);if(rep==='monthly')base.setUTCMonth(base.getUTCMonth()+1);if(rep==='quarterly')base.setUTCMonth(base.getUTCMonth()+3);if(rep==='yearly')base.setUTCFullYear(base.getUTCFullYear()+1);};step();let safety=0;while(base<now && safety++<366)step();return base.toISOString().slice(0,10);}
// Rotação: ao concluir uma rotina, passa para a pessoa seguinte da lista (ignorando contas desativadas).
function rotate(t){if(!Array.isArray(t.rotation)||t.rotation.length<2)return false;const act=t.rotation.filter(id=>db.people.some(p=>p.id===id&&isActive(p)));if(!act.length)return false;const i=act.indexOf(t.assignedTo);const next=act[(i+1)%act.length];if(next===t.assignedTo)return false;t.assignedTo=next;return true;}
function cleanSeasonal(b,item={}){const out={...item};
 if(!item.id||'title'in b){const title=cleanStr(b.title,140);if(!title)throw Error('Indica o trabalho.');out.title=title;}
 if(!item.id||'months'in b){if(!Array.isArray(b.months)||!b.months.length||b.months.some(m=>!Number.isInteger(m)||m<1||m>12))throw Error('Escolhe pelo menos um mês.');out.months=[...new Set(b.months)].sort((x,y)=>x-y);}
 if('room'in b||!item.id)out.room=cleanStr(b.room,70)||'Geral';
 if('category'in b||!item.id)out.category=cleanStr(b.category,70)||'Manutenção';
 if('notes'in b||!item.id)out.notes=cleanStr(b.notes,500);
 if('minutes'in b||!item.id){const n=b.minutes;out.minutes=n===''||n==null?null:Number(n);if(out.minutes!==null&&(!Number.isInteger(out.minutes)||out.minutes<0||out.minutes>10080))throw Error('Duração inválida.');}
 if('active'in b){if(typeof b.active!=='boolean')throw Error('Estado inválido.');out.active=b.active;}else if(!item.id)out.active=true;
 return out;}
const lastDayOf=(y,m)=>new Date(Date.UTC(y,m,0)).toISOString().slice(0,10);
const PHOTO_ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function removePhotoFiles(t){for(const ph of t.photos||[]){if(PHOTO_ID.test(ph.id))try{fs.unlinkSync(path.join(PHOTO_DIR,ph.id+'.jpg'));}catch{}}}
function authIntegration(req){const h=String(req.headers.authorization||'');const m=/^Bearer\s+(.+)$/.exec(h);if(!m||!db.ha?.token)return false;const a=Buffer.from(m[1].trim()),b=Buffer.from(db.ha.token);return a.length===b.length&&crypto.timingSafeEqual(a,b);}
function trackShopping(item){const key=item.title.toLocaleLowerCase('pt-PT').trim();const prev=db.shoppingFreq[key]||{count:0};db.shoppingFreq[key]={title:item.title,category:item.category,quantity:item.quantity,unit:item.unit||'',count:prev.count+1,last:new Date().toISOString()};const keys=Object.keys(db.shoppingFreq);if(keys.length>300){keys.sort((a,b)=>String(db.shoppingFreq[a].last).localeCompare(String(db.shoppingFreq[b].last))).slice(0,keys.length-300).forEach(k=>delete db.shoppingFreq[k]);}}
function knownCategory(title){return db.shoppingFreq[String(title).toLocaleLowerCase('pt-PT').trim()]?.category||'';}
const TYPES={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8'};
function staticFile(req,res,pathname){let decoded;try{decoded=decodeURIComponent(pathname);}catch{return fail(res,400,'URL inválido.');}if(decoded.includes('\0'))return fail(res,400,'URL inválido.');const relative=pathname==='/'?'index.html':decoded.replace(/^\/+/, '');const file=path.resolve(WEB,relative);if(!file.startsWith(WEB+path.sep))return fail(res,403,'Acesso negado.');if(!fs.existsSync(file)||!fs.statSync(file).isFile())return fail(res,404,'Não encontrado.');const ext=path.extname(file);const contents=fs.readFileSync(file);res.writeHead(200,{'Content-Type':TYPES[ext]||'application/octet-stream','Content-Length':contents.length,'Cache-Control':['.html','.js','.css','.webmanifest'].includes(ext)?'no-cache, must-revalidate':'public, max-age=3600','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; connect-src 'self'; img-src 'self' data: blob:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'"});res.end(contents);}
const server=http.createServer(async (req,res)=>{
  let url;try{url=new URL(req.url,'http://localhost');}catch{return fail(res,400,'URL inválido.');}
  const p=url.pathname;
  if(p==='/health'){return send(res,200,{ok:true});}
  if(!p.startsWith('/api/')){if(req.method!=='GET')return fail(res,405,'Método não permitido.');return staticFile(req,res,p);}
  if(!['GET','POST','PATCH','DELETE'].includes(req.method))return fail(res,405,'Método não permitido.');
  if(req.method!=='GET'){
    // A custom header makes cross-origin browser writes require preflight; CORS is never enabled.
    // Avoid comparing Origin/Host: HA Ingress may legitimately rewrite the Host header.
    if(req.headers['x-casa-request']!=='1'&&!p.startsWith('/api/integracao/'))return fail(res,403,'Pedido não autorizado.');
  }
  const bodyLimit=p==='/api/backups/upload'?30_000_000:/^\/api\/tasks\/[^/]+\/photos$/.test(p)?3_000_000:256_000;
  let b={};if(req.method!=='GET')try{b=await parseBody(req,bodyLimit);}catch(e){return fail(res,400,e.message);}
  try{
    if(p==='/api/bootstrap'&&req.method==='GET')return send(res,200,{setup:db.people.length===0,user:(()=>{const u=readUser(req);return u?{id:u.id,name:u.name,role:u.role,mustChangePassword:!!u.mustChangePassword}:null;})()});
    if(p==='/api/setup'&&req.method==='POST'){
      if(db.people.length)return fail(res,409,'Aplicação já configurada.');
      const name=cleanStr(b.name,80),username=cleanStr(b.username,40).toLowerCase(),password=String(b.password||'');
      if(name.length<2||!/^[a-z0-9._-]{3,40}$/.test(username)||password.length<10)return fail(res,400,'Nome, utilizador (mín. 3 caracteres) e palavra-passe (mín. 10 caracteres) são obrigatórios.');
      const u={id:id(),name,username,role:'admin',avatar:'●',passwordHash:passwordHash(password),authVersion:1};db.people.push(u);save();return send(res,200,{user:{id:u.id,name:u.name,role:u.role}},{'Set-Cookie':cookie(req,session(u))});
    }
    if(p==='/api/login'&&req.method==='POST'){
      const username=cleanStr(b.username,40).toLowerCase();
      if(loginBlocked(username))return fail(res,429,'Demasiadas tentativas. Tenta novamente dentro de alguns minutos.');
      const u=db.people.find(x=>x.username===username);
      // Verifica sempre uma palavra-passe (mesmo para utilizadores inexistentes) para não revelar contas pelo tempo de resposta.
      const ok=verifyPw(String(b.password||'').slice(0,200),u?u.passwordHash:DUMMY_HASH)&&!!u;
      if(!ok){loginFailed(username);return fail(res,401,'Credenciais inválidas.');}
      if(!isActive(u))return fail(res,403,'Esta conta foi desativada. Fala com o administrador da casa.');
      if(!scheduleAllows(u))return fail(res,403,'O teu acesso está disponível apenas em: '+scheduleText(u)+'.');
      loginSucceeded(username);return send(res,200,{user:{id:u.id,name:u.name,role:u.role,mustChangePassword:!!u.mustChangePassword}},{'Set-Cookie':cookie(req,session(u))});
    }
    if(p==='/api/logout'&&req.method==='POST')return send(res,200,{ok:true},{'Set-Cookie':cookie(req,'')});
    // Entrada a partir de automações do Home Assistant (autenticação por token, sem cookies).
    if(p.startsWith('/api/integracao/')){
      if(!authIntegration(req))return fail(res,401,'Token de integração inválido.');
      const robot=db.people.find(x=>roleOf(x)==='admin'&&isActive(x));if(!robot)return fail(res,409,'Sem administrador ativo.');
      const actor={id:robot.id,name:'Home Assistant'};
      if(p==='/api/integracao/tarefas'&&req.method==='POST'){
        const title=cleanStr(b.title,180);if(!title)return fail(res,400,'Indica o título da tarefa.');
        const open=db.tasks.find(t=>t.status!=='done'&&t.visibility!=='private'&&t.title.toLocaleLowerCase('pt-PT')===title.toLocaleLowerCase('pt-PT'));
        if(open)return send(res,200,{task:open,duplicate:true});
        const assignee=b.assignedTo?db.people.find(x=>x.username===String(b.assignedTo).toLowerCase()&&isActive(x)):null;
        const task={id:id(),title:'',room:'Geral',notes:'',kind:'project',priority:'P3',estimatedMinutes:null,category:'Geral',thisWeek:false,subtasks:[],status:'todo',repeat:'none',dueDate:'',assignedTo:null,suggested:false,createdAt:new Date().toISOString(),createdBy:robot.id,visibility:'shared',source:'home-assistant'};
        patchTask(task,{title,room:b.room||'Geral',notes:b.notes||'',priority:['P1','P2','P3','P4'].includes(b.priority)?b.priority:'P3',dueDate:b.dueDate||'',assignedTo:assignee?.id||null,category:b.category||'Geral'});
        db.tasks.push(task);logAction(robot,'task.create.ha',task.id);save();ha?.taskAssigned(task,actor);return send(res,201,{task});
      }
      if(p==='/api/integracao/compras'&&req.method==='POST'){
        const title=cleanStr(b.title,180);if(!title)return fail(res,400,'Indica o produto.');
        const open=db.shopping.find(x=>!x.purchased&&x.title.toLocaleLowerCase('pt-PT')===title.toLocaleLowerCase('pt-PT'));if(open)return send(res,200,{item:open,duplicate:true});
        const item={id:id(),title,quantity:cleanQty(b.quantity),unit:cleanUnit(b.unit),category:cleanStr(b.category,70)||knownCategory(title)||'Geral',notes:'',purchased:false,createdBy:robot.id,createdAt:new Date().toISOString(),source:'home-assistant'};
        db.shopping.push(item);trackShopping(item);logAction(robot,'shopping.create.ha',item.id);save();return send(res,201,{item});
      }
      return fail(res,404,'Rota de integração não encontrada.');
    }
    const user=readUser(req);if(!user)return fail(res,401,'Inicia sessão para continuar.');
    if(user.mustChangePassword&&!(p===`/api/people/${user.id}/password`&&req.method==='POST'))return fail(res,428,'Define uma nova palavra-passe para continuar.');
    if(p==='/api/rev'&&req.method==='GET')return send(res,200,{rev:rev()});
    // Fotografias das tarefas: ficheiros em DATA_DIR/photos, servidos só a quem pode ver a tarefa.
    const photoGet=p.match(/^\/api\/photos\/([^/]+)$/);
    if(photoGet&&req.method==='GET'){const pid=photoGet[1];if(!PHOTO_ID.test(pid))return fail(res,404,'Fotografia não encontrada.');const t=db.tasks.find(x=>(x.photos||[]).some(ph=>ph.id===pid));if(!t||!canSeeTask(user,t))return fail(res,404,'Fotografia não encontrada.');let buf;try{buf=fs.readFileSync(path.join(PHOTO_DIR,pid+'.jpg'));}catch{return fail(res,404,'Fotografia não encontrada.');}res.writeHead(200,{'Content-Type':'image/jpeg','Content-Length':buf.length,'Cache-Control':'private, max-age=604800, immutable','X-Content-Type-Options':'nosniff'});return res.end(buf);}
    const photoPost=p.match(/^\/api\/tasks\/([^/]+)\/photos(?:\/([^/]+))?$/);
    if(photoPost){const t=db.tasks.find(x=>x.id===photoPost[1]);if(!t||!canSeeTask(user,t))return fail(res,404,'Tarefa não encontrada.');
      if(!photoPost[2]&&req.method==='POST'){if(!canCompleteTask(user,t))return fail(res,403,'Sem permissão para acrescentar fotografias a esta tarefa.');if((t.photos||[]).length>=8)return fail(res,409,'Cada tarefa pode ter no máximo 8 fotografias.');
        const m=/^data:image\/jpeg;base64,([A-Za-z0-9+/]+=*)$/.exec(typeof b.data==='string'?b.data:'');if(!m)return fail(res,400,'Fotografia inválida.');const buf=Buffer.from(m[1],'base64');if(buf.length>2_200_000||buf[0]!==0xFF||buf[1]!==0xD8)return fail(res,400,'Fotografia inválida ou demasiado grande.');
        const pid=crypto.randomUUID();fs.writeFileSync(path.join(PHOTO_DIR,pid+'.jpg'),buf,{mode:0o600});t.photos=[...(t.photos||[]),{id:pid,by:user.id,at:new Date().toISOString(),caption:cleanStr(b.caption,140)}];t.updatedAt=new Date().toISOString();logAction(user,'task.photo.add',t.id);save();return send(res,201,{task:t});}
      if(photoPost[2]&&req.method==='DELETE'){const ph=(t.photos||[]).find(x=>x.id===photoPost[2]);if(!ph)return fail(res,404,'Fotografia não encontrada.');if(ph.by!==user.id&&!canEditTask(user,t))return fail(res,403,'Só quem a acrescentou pode remover esta fotografia.');removePhotoFiles({photos:[ph]});t.photos=t.photos.filter(x=>x.id!==ph.id);logAction(user,'task.photo.delete',t.id);save();return send(res,200,{task:t});}
      return fail(res,405,'Método não permitido.');}
    // Cópias de segurança (apenas administradores).
    if(p==='/api/backups'||p.startsWith('/api/backups/')){
      if(roleOf(user)!=='admin')return fail(res,403,'Apenas administradores.');
      if(p==='/api/backups'&&req.method==='GET')return send(res,200,{backups:backups.list(),current:backups.summaryOf(db)});
      if(p==='/api/backups'&&req.method==='POST'){const bk=backups.create('manual');logAction(user,'backup.create',bk.name);return send(res,201,{backup:bk,backups:backups.list()});}
      if(p==='/api/backups/upload'&&req.method==='POST'){const bk=backups.upload(b.data);logAction(user,'backup.upload',bk.name);return send(res,201,{backup:bk,summary:backups.summaryOf(b.data),backups:backups.list()});}
      const bm=p.match(/^\/api\/backups\/([^/]+?)(\/restore)?$/);
      if(bm&&!bm[2]&&req.method==='GET'){const buf=backups.read(bm[1]);res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Content-Length':buf.length,'Content-Disposition':`attachment; filename="${bm[1]}"`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});return res.end(buf);}
      if(bm&&bm[2]&&req.method==='POST'){const data=backups.load(bm[1]);backups.create('pre-restore');const secret=db.secret;db=data;db.secret=secret;migrate();logAction(user,'backup.restore',bm[1]);save();return send(res,200,{ok:true,summary:backups.summaryOf(db)});}
      return fail(res,404,'Rota não encontrada.');
    }
    // Calendário sazonal.
    if(p==='/api/seasonal'&&req.method==='POST'){if(!elevated(user))return fail(res,403,'Sem permissão para alterar o calendário.');const item={id:'s-'+id(),...cleanSeasonal(b)};db.seasonal.push(item);logAction(user,'seasonal.create',item.id);save();return send(res,201,{item,seasonal:db.seasonal});}
    const sm=p.match(/^\/api\/seasonal\/([^/]+?)(\/task)?$/);
    if(sm){const item=db.seasonal.find(x=>x.id===sm[1]);if(!item)return fail(res,404,'Trabalho sazonal não encontrado.');
      if(sm[2]&&req.method==='POST'){if(roleOf(user)==='collaborator')return fail(res,403,'Sem permissão.');const y=Number(b.year),m=Number(b.month);if(!Number.isInteger(y)||y<2020||y>2100||!Number.isInteger(m)||m<1||m>12)return fail(res,400,'Mês inválido.');const key=`${item.id}:${y}-${String(m).padStart(2,'0')}`;
        const existing=db.tasks.find(t=>t.seasonalKey===key);if(existing&&canSeeTask(user,existing))return fail(res,409,'Este trabalho já foi criado como tarefa para este mês.');
        const task={id:id(),title:'',room:'Geral',notes:'',kind:'project',priority:'P3',estimatedMinutes:null,category:'Geral',thisWeek:false,subtasks:[],status:'todo',repeat:'none',dueDate:'',assignedTo:null,suggested:false,createdAt:new Date().toISOString(),createdBy:user.id,visibility:'shared',seasonalKey:key};
        patchTask(task,{title:item.title,room:item.room,category:item.category,notes:item.notes||'',estimatedMinutes:item.minutes??'',dueDate:lastDayOf(y,m)});db.tasks.push(task);logAction(user,'task.create',task.id);save();return send(res,201,{task});}
      if(!elevated(user))return fail(res,403,'Sem permissão para alterar o calendário.');
      if(!sm[2]&&req.method==='PATCH'){Object.assign(item,cleanSeasonal(b,item));logAction(user,'seasonal.update',item.id);save();return send(res,200,{item,seasonal:db.seasonal});}
      if(!sm[2]&&req.method==='DELETE'){db.seasonal=db.seasonal.filter(x=>x.id!==item.id);logAction(user,'seasonal.delete',item.id);save();return send(res,200,{seasonal:db.seasonal});}
      return fail(res,405,'Método não permitido.');}
    // Home Assistant: notificações e sensores (apenas administradores).
    if(p==='/api/ha'||p.startsWith('/api/ha/')){
      if(roleOf(user)!=='admin')return fail(res,403,'Apenas administradores.');
      if(p==='/api/ha'&&req.method==='GET'){const info=await ha.info();let services=[],servicesError='';if(info.available){try{services=await ha.notifyServices();}catch(e){servicesError=e.message;}}return send(res,200,{...info,services,servicesError,notify:db.ha.notify,events:db.ha.events,dailyTime:db.ha.dailyTime,sensors:db.ha.sensors,token:db.ha.token,sensorEntities:Object.keys(ha.sensorStates())});}
      if(p==='/api/ha'&&req.method==='PATCH'){
        if('notify'in b){if(!b.notify||typeof b.notify!=='object'||Array.isArray(b.notify))return fail(res,400,'Configuração inválida.');const out={};for(const [pid,svc] of Object.entries(b.notify)){if(!db.people.some(x=>x.id===pid))continue;if(svc&&!/^[a-z0-9_]{1,80}$/.test(svc))return fail(res,400,'Serviço de notificação inválido.');if(svc)out[pid]=svc;}db.ha.notify=out;}
        if('events'in b){if(!b.events||typeof b.events!=='object')return fail(res,400,'Configuração inválida.');for(const k of ['assigned','daily'])if(k in b.events)db.ha.events[k]=!!b.events[k];}
        if('dailyTime'in b){if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(b.dailyTime))return fail(res,400,'Hora inválida.');db.ha.dailyTime=b.dailyTime;}
        if('sensors'in b){db.ha.sensors=!!b.sensors;}
        logAction(user,'ha.update','global');save();if(db.ha.sensors)ha.pushSensors(true).catch(()=>{});return send(res,200,{ok:true});}
      if(p==='/api/ha/test'&&req.method==='POST'){if(!db.ha.notify[b.personId])return fail(res,400,'Escolhe primeiro o telemóvel desta pessoa e guarda.');try{await ha.notify(b.personId,'Casa em Dia','As notificações estão a funcionar.',{tag:'teste'});}catch(e){return fail(res,502,e.message);}return send(res,200,{ok:true});}
      if(p==='/api/ha/token'&&req.method==='POST'){db.ha.token=crypto.randomBytes(24).toString('base64url');logAction(user,'ha.token','global');save();return send(res,200,{token:db.ha.token});}
      return fail(res,404,'Rota não encontrada.');
    }
    // Finanças: só administradores e gestores. A lógica está em public/finance-core.js (partilhada com a demonstração).
    if(p==='/api/finance'||p.startsWith('/api/finance/')){
      if(!financeAllowed(user))return fail(res,403,'Sem acesso às finanças.');
      let out;try{out=FIN.handle(db.finance,user,req.method,p,b,{newId:id,today:()=>dateInTz(new Date()),isAdmin:roleOf(user)==='admin'});}catch(e){return fail(res,e.status||400,e.message);}
      if(out===undefined)return fail(res,404,'Rota não encontrada.');
      if(req.method!=='GET')logAction(user,'finance.'+(p.split('/')[3]||'view')+'.'+req.method.toLowerCase(),'');
      save();return send(res,req.method==='POST'?201:200,out);
    }
    if(p==='/api/state'&&req.method==='GET')return send(res,200,{...visibleState(user),user:{id:user.id,name:user.name,role:roleOf(user)}});
    if(p==='/api/export'&&req.method==='GET'){if(user.role!=='admin')return fail(res,403,'Apenas administradores.');const visible=new Set(db.tasks.filter(t=>canSeeTask(user,t)).map(t=>t.id));return send(res,200,{exportedAt:new Date().toISOString(),...state(),tasks:db.tasks.filter(t=>visible.has(t.id)),history:db.history.filter(h=>!h.taskId||visible.has(h.taskId)).slice(-200),audit:db.audit.filter(x=>!x.action.startsWith('task.')||visible.has(x.entityId)).slice(-300)},{'Content-Disposition':'attachment; filename="casa-em-dia-backup.json"'});}
    if(p==='/api/import'&&req.method==='POST'){
      if(user.role!=='admin')return fail(res,403,'Apenas administradores.');
      if(!Array.isArray(b.tasks)||b.tasks.length>500)return fail(res,400,'Ficheiro inválido ou demasiado grande (máximo 500 tarefas).');
      let imported=0,skipped=0;
      const key=t=>[t.title,t.room,t.kind].map(x=>String(x||'').trim().toLocaleLowerCase('pt-PT')).join('|');
      const existing=new Set(db.tasks.map(key));
      const staged=[];
      for(const raw of b.tasks){
        if(!raw||typeof raw!=='object'||!cleanStr(raw.title,180)){skipped++;continue;}
        const t={id:id(),title:'',room:'Geral',notes:'',kind:'project',priority:'P3',estimatedMinutes:null,category:'Geral',thisWeek:false,subtasks:[],status:'todo',repeat:'none',dueDate:'',assignedTo:null,suggested:false,createdAt:new Date().toISOString(),createdBy:user.id,visibility:'shared'};
        const allowed={};
        for(const field of ['title','room','notes','kind','priority','status','repeat','dueDate','suggested','estimatedMinutes','category','thisWeek','subtasks','visibility']){
          if(Object.prototype.hasOwnProperty.call(raw,field))allowed[field]=raw[field];
        }
        try{patchTask(t,allowed);}catch{skipped++;continue;}
        const k=key(t);
        if(existing.has(k)){skipped++;continue;}
        existing.add(k);staged.push(t);imported++;
      }
      db.tasks.push(...staged);logAction(user,'tasks.import',String(imported));save();return send(res,200,{imported,skipped});
    }
    if(p==='/api/settings'&&req.method==='PATCH'){
      if(!elevated(user))return fail(res,403,'Sem permissão para alterar definições.');
      const normalize=a=>{if(!Array.isArray(a)||a.length>100||a.some(x=>typeof x!=='string'))throw Error('Lista inválida.');return [...new Set(a.map(x=>cleanStr(x,70)).filter(Boolean))];};
      db.settings=db.settings||{rooms:[],categories:[]};
      const incoming={...db.settings};if('rooms'in b)incoming.rooms=normalize(b.rooms);if('categories'in b)incoming.categories=normalize(b.categories);if('floors'in b){const f=normalize(b.floors);if(f.length>20)throw Error('No máximo 20 pisos.');incoming.floors=f.map(x=>cleanStr(x,40));}
      if('roomFloors'in b){if(!b.roomFloors||typeof b.roomFloors!=='object'||Array.isArray(b.roomFloors))throw Error('Pisos das divisões inválidos.');const rooms=new Set(incoming.rooms||[]),floors=new Set(incoming.floors||[]);incoming.roomFloors=Object.fromEntries(Object.entries(b.roomFloors).filter(([r,f])=>rooms.has(r)&&typeof f==='string'&&floors.has(f)));}
      else if(incoming.roomFloors){const rooms=new Set(incoming.rooms||[]),floors=new Set(incoming.floors||[]);incoming.roomFloors=Object.fromEntries(Object.entries(incoming.roomFloors).filter(([r,f])=>rooms.has(r)&&floors.has(f)));}db.settings=incoming;logAction(user,'settings.update','global');save();return send(res,200,{settings:db.settings});
    }
    if(p==='/api/tasks'&&req.method==='POST'){
      const task={id:id(),title:'',room:'Geral',notes:'',kind:'project',priority:'P3',estimatedMinutes:null,category:'Geral',thisWeek:false,subtasks:[],status:'todo',repeat:'none',dueDate:'',assignedTo:null,suggested:false,createdAt:new Date().toISOString(),createdBy:user.id,visibility:'shared'};patchTask(task,b);if(!elevated(user)&&task.assignedTo&&task.assignedTo!==user.id)return fail(res,403,'Não podes atribuir esta tarefa a outra pessoa.');if(!elevated(user)&&(task.rotation||[]).some(x=>x!==user.id))return fail(res,403,'Só gestores podem criar rotações entre pessoas.');if(roleOf(user)==='collaborator'&&task.visibility==='private')return fail(res,403,'Colaboradores não podem criar tarefas privadas.');if(task.visibility==='private'&&task.assignedTo&&task.assignedTo!==user.id)return fail(res,403,'Uma tarefa privada não pode ser atribuída a outra pessoa.');if(!task.title)return fail(res,400,'Introduz o nome da tarefa.');db.tasks.push(task);logAction(user,'task.create',task.id);save();ha?.taskAssigned(task,user);return send(res,201,{task});
    }
    // Limpar as tarefas pontuais concluídas (só administrador; as rotinas nunca são apagadas; o histórico de conclusões mantém-se).
    if(p==='/api/tasks/clear-done'&&req.method==='POST'){if(roleOf(user)!=='admin')return fail(res,403,'Só um administrador pode eliminar tarefas.');const gone=db.tasks.filter(t=>t.kind==='project'&&t.status==='done'&&canSeeTask(user,t));gone.forEach(removePhotoFiles);const ids=new Set(gone.map(t=>t.id));db.tasks=db.tasks.filter(t=>!ids.has(t.id));logAction(user,'tasks.clear-done',String(gone.length));save();return send(res,200,{removed:gone.length});}
    const match=p.match(/^\/api\/tasks\/([^/]+)(\/complete)?$/);
    if(match){const t=db.tasks.find(x=>x.id===match[1]);if(!t||!canSeeTask(user,t))return fail(res,404,'Tarefa não encontrada.');
      if(match[2]&&req.method==='POST'){
        if(!canCompleteTask(user,t))return fail(res,403,'Sem permissão para concluir esta tarefa.');
        const time=new Date().toISOString();db.history.push({id:id(),taskId:t.id,title:t.title,kind:t.kind,assignedTo:t.assignedTo,by:user.id,at:time});
        if(db.history.length>2000)db.history=db.history.slice(-2000);
        let rotated=false;if(t.kind==='routine'&&t.repeat!=='none') {t.status='todo';t.dueDate=nextDate(t.dueDate,t.repeat);t.suggested=false;rotated=rotate(t);}else t.status='done';
        t.updatedAt=time;logAction(user,'task.complete',t.id);save();if(rotated)ha?.taskAssigned(t,user);return send(res,200,{task:t,rotatedTo:rotated?t.assignedTo:null});
      }
      if(!match[2]&&req.method==='PATCH'){if(!allowedTaskPatch(user,t,b))return fail(res,403,'Sem permissão para alterar esta tarefa.');const updated={...t};patchTask(updated,b);if(!canEditTask(user,t)){if('status'in b && !['doing','done'].includes(b.status))return fail(res,403,'Só podes iniciar ou concluir esta tarefa.');if('subtasks'in b){if(!Array.isArray(b.subtasks)||b.subtasks.length!==(t.subtasks||[]).length||b.subtasks.some((v,i)=>v.title!==t.subtasks[i].title||v.id!==t.subtasks[i].id))return fail(res,403,'Só podes marcar subtarefas como concluídas.');}}if(!elevated(user)&&('assignedTo'in b)&&updated.assignedTo!==t.assignedTo)return fail(res,403,'Sem permissão para atribuir tarefas.');if(!elevated(user)&&('rotation'in b)&&JSON.stringify(updated.rotation||[])!==JSON.stringify(t.rotation||[]))return fail(res,403,'Só gestores podem alterar a rotação.');const reassigned=updated.assignedTo&&updated.assignedTo!==t.assignedTo;if(updated.visibility==='private'&&updated.assignedTo&&updated.assignedTo!==updated.createdBy)return fail(res,403,'Uma tarefa privada não pode ser atribuída a outra pessoa.');if(roleOf(user)==='collaborator'&&updated.visibility==='private')return fail(res,403,'Colaboradores não podem criar tarefas privadas.');Object.assign(t,updated);logAction(user,'task.update',t.id);save();if(reassigned)ha?.taskAssigned(t,user);return send(res,200,{task:t});}
      if(!match[2]&&req.method==='DELETE'){if(roleOf(user)!=='admin')return fail(res,403,'Só um administrador pode eliminar tarefas.');removePhotoFiles(t);db.tasks=db.tasks.filter(x=>x.id!==t.id);logAction(user,'task.delete',t.id);save();return send(res,200,{ok:true});}
    }
    if(p==='/api/shopping'&&req.method==='POST'){
      const title=cleanStr(b.title,180);if(!title)return fail(res,400,'Indica o produto.');
      const item={id:id(),title,quantity:cleanQty(b.quantity),unit:cleanUnit(b.unit),category:cleanStr(b.category,70)||knownCategory(title)||'Geral',notes:cleanStr(b.notes,500),purchased:false,createdBy:user.id,createdAt:new Date().toISOString()};
      db.shopping.push(item);trackShopping(item);logAction(user,'shopping.create',item.id);save();return send(res,201,{item});
    }
    if(p==='/api/shopping/clear-purchased'&&req.method==='POST'){const n=db.shopping.filter(x=>x.purchased).length;db.shopping=db.shopping.filter(x=>!x.purchased);logAction(user,'shopping.clear',String(n));save();return send(res,200,{removed:n});}
    const shoppingMatch=p.match(/^\/api\/shopping\/([^/]+)$/);
    if(shoppingMatch){const item=db.shopping.find(x=>x.id===shoppingMatch[1]);if(!item)return fail(res,404,'Produto não encontrado.');
      if(req.method==='PATCH'){// Lista partilhada: todos podem marcar como comprado e acertar quantidade e unidade; o resto só quem criou ou gestores.
        if(!elevated(user)&&item.createdBy!==user.id&&Object.keys(b).some(k=>!['purchased','quantity','unit'].includes(k)))return fail(res,403,'Só podes marcar como comprado ou acertar a quantidade deste produto.');
        const updated={...item};if('title'in b){if(!cleanStr(b.title,180))return fail(res,400,'Nome inválido.');updated.title=cleanStr(b.title,180);}
        if('quantity'in b)updated.quantity=cleanQty(b.quantity);
        if('unit'in b)updated.unit=cleanUnit(b.unit);
        if('category'in b)updated.category=cleanStr(b.category,70);
        if('notes'in b)updated.notes=cleanStr(b.notes,500);
        if('purchased'in b){if(typeof b.purchased!=='boolean')return fail(res,400,'Estado inválido.');updated.purchased=b.purchased;}
        updated.updatedAt=new Date().toISOString();Object.assign(item,updated);logAction(user,'shopping.update',item.id);save();return send(res,200,{item});
      }
      if(req.method==='DELETE'){if(!elevated(user)&&item.createdBy!==user.id)return fail(res,403,'Sem permissão para eliminar.');db.shopping=db.shopping.filter(x=>x.id!==item.id);logAction(user,'shopping.delete',item.id);save();return send(res,200,{ok:true});}
    }
    if(p==='/api/worklogs'&&req.method==='POST'){
      let date;try{date=dateISO(cleanStr(b.date,10));}catch{return fail(res,400,'Data inválida.');}
      const minutes=Number(b.minutes);if(!Number.isInteger(minutes)||minutes<1||minutes>1440)return fail(res,400,'Duração inválida.');
      const note=cleanStr(b.note,1000);if(!note)return fail(res,400,'Descreve o trabalho realizado.');
      const task=b.taskId?db.tasks.find(t=>t.id===b.taskId):null;if(b.taskId&&(!task||!canSeeTask(user,task)))return fail(res,404,'Tarefa não encontrada.');
      const userId=elevated(user)&&b.userId&&db.people.some(p=>p.id===b.userId)?b.userId:user.id;
      const entry={id:id(),taskId:task?.id||null,userId,actor:user.id,date,minutes,note,createdAt:new Date().toISOString()};
      db.workLogs.push(entry);logAction(user,'worklog.create',entry.id);save();return send(res,201,{entry});
    }
    const roleMatch=p.match(/^\/api\/people\/([^/]+)\/role$/);
    if(roleMatch&&req.method==='PATCH'){
      if(roleOf(user)!=='admin')return fail(res,403,'Apenas administradores podem alterar perfis.');
      const target=db.people.find(x=>x.id===roleMatch[1]);if(!target)return fail(res,404,'Pessoa não encontrada.');
      if(!['admin','manager','resident','collaborator'].includes(b.role))return fail(res,400,'Perfil inválido.');
      if(target.id===user.id&&b.role!=='admin')return fail(res,403,'Não podes retirar o teu próprio acesso de administrador.');if(target.role==='admin'&&b.role!=='admin'&&db.people.filter(x=>roleOf(x)==='admin').length===1)return fail(res,403,'É obrigatório manter um administrador.');
      target.role=b.role;target.authVersion=(target.authVersion||1)+1;logAction(user,'person.role',target.id);save();return send(res,200,{people:publicPeople()});
    }
    if(p==='/api/people'&&req.method==='POST'){
      if(user.role!=='admin')return fail(res,403,'Apenas administradores.');
      const name=cleanStr(b.name,80),username=cleanStr(b.username,40).toLowerCase(),pw=String(b.password||'');
      if(name.length<2||!/^[a-z0-9._-]{3,40}$/.test(username)||pw.length<10)return fail(res,400,'Nome, utilizador (mín. 3 caracteres) e palavra-passe (mín. 10 caracteres) obrigatórios.');
      if(db.people.some(p=>p.username===username))return fail(res,409,'Esse nome de utilizador já existe.');
      const person={id:id(),name,username,passwordHash:passwordHash(pw),role:['manager','resident','collaborator'].includes(b.role)?b.role:'resident',authVersion:1,avatar:'●',active:true,mustChangePassword:true};db.people.push(person);logAction(user,'person.create',person.id);save();return send(res,201,{people:publicPeople()});
    }
    if(p==='/api/me'&&req.method==='PATCH'){
      const target=db.people.find(x=>x.id===user.id);
      if('name'in b){const name=cleanStr(b.name,80);if(name.length<2)return fail(res,400,'O nome deve ter pelo menos 2 caracteres.');target.name=name;}
      if('photo'in b)target.photo=cleanPhoto(b.photo);
      logAction(user,'person.profile',user.id);save();return send(res,200,{user:{id:target.id,name:target.name,role:roleOf(target)},people:publicPeople()});
    }
    const statusMatch=p.match(/^\/api\/people\/([^/]+)\/status$/);
    if(statusMatch&&req.method==='PATCH'){
      if(roleOf(user)!=='admin')return fail(res,403,'Apenas administradores.');
      const target=db.people.find(x=>x.id===statusMatch[1]);if(!target)return fail(res,404,'Pessoa não encontrada.');
      if(typeof b.active!=='boolean')return fail(res,400,'Estado inválido.');
      if(target.id===user.id&&!b.active)return fail(res,403,'Não podes desativar a tua própria conta.');
      if(!b.active&&roleOf(target)==='admin'&&db.people.filter(x=>roleOf(x)==='admin'&&isActive(x)).length===1)return fail(res,403,'É obrigatório manter um administrador ativo.');
      target.active=b.active;target.authVersion=(target.authVersion||1)+1;
      // Ao desativar, as tarefas pendentes ficam por atribuir mas guardam a quem pertenciam; ao reativar, voltam a essa pessoa
      // (exceto as que entretanto foram atribuídas a outra pessoa).
      let affected=0;
      for(const t of db.tasks){
        if(!b.active&&t.assignedTo===target.id&&t.status!=='done'){t.assignedTo=null;t.unassignedFrom=target.id;affected++;}
        else if(b.active&&t.unassignedFrom===target.id){if(!t.assignedTo&&t.status!=='done'){t.assignedTo=target.id;affected++;}delete t.unassignedFrom;}
      }
      logAction(user,b.active?'person.activate':'person.deactivate',target.id);save();return send(res,200,{people:publicPeople(),tasks:affected});
    }
    const scheduleMatch=p.match(/^\/api\/people\/([^/]+)\/schedule$/);
    if(scheduleMatch&&req.method==='PATCH'){
      if(roleOf(user)!=='admin')return fail(res,403,'Apenas administradores.');
      const target=db.people.find(x=>x.id===scheduleMatch[1]);if(!target)return fail(res,404,'Pessoa não encontrada.');
      if(!Array.isArray(b.accessDays)||b.accessDays.some(d=>!Number.isInteger(d)||d<0||d>6))return fail(res,400,'Dias inválidos.');
      target.accessDays=[...new Set(b.accessDays)].sort();target.authVersion=(target.authVersion||1)+1;
      logAction(user,'person.schedule',target.id);save();return send(res,200,{people:publicPeople()});
    }
    const personMatch=p.match(/^\/api\/people\/([^/]+)\/password$/);
    if(personMatch&&req.method==='POST'){
      if(user.role!=='admin'&&user.id!==personMatch[1])return fail(res,403,'Sem permissão.');const target=db.people.find(u=>u.id===personMatch[1]);if(!target)return fail(res,404,'Pessoa não encontrada.');
      if(String(b.password||'').length<10)return fail(res,400,'A nova palavra-passe deve ter pelo menos 10 caracteres.');
      if(target.id===user.id&&!verifyPw(String(b.currentPassword||'').slice(0,200),target.passwordHash))return fail(res,403,'A palavra-passe atual não está correta.');
      if(target.id===user.id&&String(b.password)===String(b.currentPassword||''))return fail(res,400,'A nova palavra-passe tem de ser diferente da atual.');
      target.passwordHash=passwordHash(b.password);target.authVersion=(target.authVersion||1)+1;target.mustChangePassword=target.id!==user.id;logAction(user,'person.password',target.id);save();
      return send(res,200,{ok:true},target.id===user.id?{'Set-Cookie':cookie(req,session(target))}:{});
    }
    return fail(res,404,'Rota não encontrada.');
  }catch(e){console.error('Request error:',e);return fail(res,400,e.message||'Ocorreu um erro.');}
});
server.on('clientError',(err,socket)=>{if(socket.writable)socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');});
// Um erro inesperado num pedido nunca deve derrubar o serviço (os dados são gravados de forma atómica a cada alteração).
process.on('unhandledRejection',e=>console.error('Rejeição não tratada:',e));
process.on('uncaughtException',e=>console.error('Exceção não tratada:',e));
// O Supervisor do Home Assistant para o add-on com SIGTERM; como PID 1 o Node ignoraria o sinal e a paragem demoraria ~10 s.
for(const sig of ['SIGTERM','SIGINT'])process.on(sig,()=>{console.log(`${sig} recebido, a terminar.`);server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),3000).unref();});
// Cópia de segurança automática diária e integração com o Home Assistant (se disponível).
try{const bk=backups.autoTick();if(bk)console.log('Cópia de segurança automática:',bk.name);}catch(e){console.error('Cópia automática falhou:',e.message);}
setInterval(()=>{try{backups.autoTick();}catch(e){console.error('Cópia automática falhou:',e.message);}try{if(FIN.generateRecurring(db.finance,dateInTz(new Date()),id))save();}catch(e){console.error('Despesas fixas:',e.message);}},30*60_000).unref();
try{if(FIN.generateRecurring(db.finance,dateInTz(new Date()),id))save();}catch(e){console.error('Despesas fixas:',e.message);}
const hhmm=()=>new Intl.DateTimeFormat('en-GB',{timeZone:HOUSE_TZ,hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());
ha=createHa({getDb:()=>db,todayISO:()=>dateInTz(new Date()),nowHM:hhmm,save});ha.start();
server.listen(PORT,HOST,()=>console.log(`Casa em Dia ${APP_VERSION} online: http://${HOST}:${PORT} • dados: ${DB_FILE}${ha.available()?' • Home Assistant ligado':''}`));
