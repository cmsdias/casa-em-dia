'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {URL}=require('node:url');
const ROOT=__dirname, WEB=path.join(ROOT,'public');
const DATA_DIR=process.env.DATA_DIR||path.join(ROOT,'data');
const DB_FILE=path.join(DATA_DIR,'casa.json');
const PORT=+(process.env.PORT||3000);
const HOST=process.env.HOST||'0.0.0.0';
fs.mkdirSync(DATA_DIR,{recursive:true});
let db;
if (fs.existsSync(DB_FILE)) {
  try{db=JSON.parse(fs.readFileSync(DB_FILE,'utf8'));}
  catch(e){console.error(`ERRO: não foi possível ler ${DB_FILE} (${e.message}). Os dados não foram alterados; restaura uma cópia de segurança.`);process.exit(1);}
}
else {
  const s=JSON.parse(fs.readFileSync(path.join(ROOT,'seed.json'),'utf8'));
  db={version:1,secret:crypto.randomBytes(32).toString('hex'),people:[],tasks:s.tasks.map(t=>({...t,id:crypto.randomUUID()})),history:[],settings:{rooms:['Cozinha','Lavandaria','Sala','Escritório','WC completo','WC serviço','WC suite','Exterior','Organização geral'],categories:['Manutenção','Arrumação','Limpeza','Compras','Obras','Geral']}};
  save();
}

// v1.2: migração conservadora e compatível com cópias de segurança anteriores.
if(typeof db.secret!=='string'||db.secret.length<32){db.secret=crypto.randomBytes(32).toString('hex');save();}
db.people=Array.isArray(db.people)?db.people:[];
db.tasks=Array.isArray(db.tasks)?db.tasks:[];
db.history=Array.isArray(db.history)?db.history:[];
db.shopping=Array.isArray(db.shopping)?db.shopping:[];
db.workLogs=Array.isArray(db.workLogs)?db.workLogs:[];
db.audit=Array.isArray(db.audit)?db.audit:[];
for(const p of db.people){if(p.role==='member')p.role='resident';}
const originalAdmin=db.people.find(p=>p.role==='admin')?.id||null;
for(const t of db.tasks){if(!t.createdBy)t.createdBy=originalAdmin;if(!t.visibility)t.visibility='shared';}
function roleOf(u){return u.role==='member'?'resident':u.role;}
function elevated(u){return ['admin','manager'].includes(roleOf(u));}
function canSeeTask(u,t){if(roleOf(u)==='admin')return true;if(t.visibility==='private')return t.createdBy===u.id;if(roleOf(u)==='collaborator')return t.createdBy===u.id||t.assignedTo===u.id;return true;}
function canEditTask(u,t){return (roleOf(u)==='admin'||(roleOf(u)==='manager'&&t.visibility!=='private')||t.createdBy===u.id);}
function canCompleteTask(u,t){return canEditTask(u,t)||t.assignedTo===u.id;}
function allowedTaskPatch(u,t,b){if(canEditTask(u,t))return true;
 return canCompleteTask(u,t)&&Object.keys(b).every(k=>['status','subtasks'].includes(k));}
function logAction(u,action,entityId){db.audit.push({id:id(),actor:u.id,action,entityId,at:new Date().toISOString()});if(db.audit.length>3000)db.audit=db.audit.slice(-3000);}
function visibleState(u){const allowed=db.tasks.filter(t=>canSeeTask(u,t));const ids=new Set(allowed.map(t=>t.id));const users=roleOf(u)==='collaborator'?db.people.filter(p=>p.id===u.id||allowed.some(t=>t.assignedTo===p.id||t.createdBy===p.id)):db.people;const people=users.map(({id,name,username,role,avatar,photo})=>({id,name,username:roleOf(u)==='collaborator'?'':username,role:roleOf({role}),avatar:avatar||'●',photo:photo||''}));return {...state(),people,tasks:allowed,history:db.history.filter(h=>h.taskId?ids.has(h.taskId):h.by===u.id).slice(-200),shopping:db.shopping,workLogs:db.workLogs.filter(l=>elevated(u)?(!l.taskId||ids.has(l.taskId)):l.userId===u.id||l.actor===u.id),audit:roleOf(u)==='admin'?db.audit.slice(-300):elevated(u)?db.audit.filter(a=>!a.action.startsWith('task.')||ids.has(a.entityId)).slice(-300):[],permissions:{manageUsers:roleOf(u)==='admin',manageSettings:elevated(u),manageAllShared:elevated(u)}};}


db.finance=db.finance&&typeof db.finance==='object'?db.finance:{accounts:[],transactions:[],budgets:[],goals:[]};
for(const key of ['accounts','transactions','budgets','goals'])if(!Array.isArray(db.finance[key]))db.finance[key]=[];
function financeAllowed(u){return roleOf(u)!=='collaborator';}
function accessAccount(u,a){if(!financeAllowed(u))return false;return roleOf(u)==='admin'||a.ownerId===u.id||(a.scope==='shared'&&Array.isArray(a.allowedUserIds)&&a.allowedUserIds.includes(u.id));}
function financeState(u){if(!financeAllowed(u))return null;const accounts=db.finance.accounts.filter(a=>accessAccount(u,a));const ids=new Set(accounts.map(a=>a.id));return {accounts,transactions:db.finance.transactions.filter(t=>ids.has(t.accountId)),budgets:db.finance.budgets.filter(b=>ids.has(b.accountId)),goals:db.finance.goals.filter(g=>ids.has(g.accountId))};}
function cents(v){if(!Number.isSafeInteger(v)||v<=0||v>1_000_000_000_00)throw Error('Valor inválido em cêntimos.');return v;}
function dateISO(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||new Date(v+'T12:00:00Z').toISOString().slice(0,10)!==v)throw Error('Data inválida.');return v;}

function save(){const tmp=DB_FILE+'.tmp'; fs.writeFileSync(tmp,JSON.stringify(db,null,2),{mode:0o600});fs.renameSync(tmp,DB_FILE);}
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
try{const [payload,mac]=token.split('.');const sig=crypto.createHmac('sha256',db.secret).update(payload).digest('base64url');if(!mac||sig.length!==mac.length||!crypto.timingSafeEqual(Buffer.from(mac),Buffer.from(sig)))return null;const claim=JSON.parse(Buffer.from(payload,'base64url').toString());if(claim.exp<Date.now())return null;return db.people.find(u=>u.id===claim.id&&(u.authVersion||1)===claim.v)||null;}catch{return null;}}
function cookie(req,token){const secure=(req.headers['x-forwarded-proto']==='https'||req.socket.encrypted)?'; Secure':'';return `casa_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${token?14*86400:0}${secure}`;}
async function parseBody(req){let size=0;let chunks=[];for await(const c of req){size+=c.length;if(size>256_000)throw new Error('Pedido demasiado grande.');chunks.push(c);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}catch{throw new Error('JSON inválido.');}}
function publicPeople(){return db.people.map(({id,name,username,role,avatar,photo})=>({id,name,username,role:role==='member'?'resident':role,avatar:avatar||'●',photo:photo||''}));}
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
  if('assignedTo'in b){if(b.assignedTo && !db.people.some(p=>p.id===b.assignedTo))throw Error('Responsável não existe.');t.assignedTo=b.assignedTo||null;}
  if('dueDate'in b){const d=cleanStr(b.dueDate,10);t.dueDate=d?dateISO(d):'';}
  if('repeat'in b){if(!['none','daily','weekly','biweekly','monthly'].includes(b.repeat))throw Error('Periodicidade inválida.');t.repeat=b.repeat;}
  if('suggested'in b)t.suggested=!!b.suggested;
  t.updatedAt=new Date().toISOString();
}
function nextDate(iso,rep){const base=iso?new Date(iso+'T12:00:00Z'):new Date();if(!iso)base.setUTCHours(12,0,0,0);const now=new Date();const step=()=>{if(rep==='daily')base.setUTCDate(base.getUTCDate()+1);if(rep==='weekly')base.setUTCDate(base.getUTCDate()+7);if(rep==='biweekly')base.setUTCDate(base.getUTCDate()+14);if(rep==='monthly')base.setUTCMonth(base.getUTCMonth()+1);};step();let safety=0;while(base<now && safety++<366)step();return base.toISOString().slice(0,10);}
const TYPES={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8'};
function staticFile(req,res,pathname){let decoded;try{decoded=decodeURIComponent(pathname);}catch{return fail(res,400,'URL inválido.');}if(decoded.includes('\0'))return fail(res,400,'URL inválido.');const relative=pathname==='/'?'index.html':decoded.replace(/^\/+/, '');const file=path.resolve(WEB,relative);if(!file.startsWith(WEB+path.sep))return fail(res,403,'Acesso negado.');if(!fs.existsSync(file)||!fs.statSync(file).isFile())return fail(res,404,'Não encontrado.');const ext=path.extname(file);const contents=fs.readFileSync(file);res.writeHead(200,{'Content-Type':TYPES[ext]||'application/octet-stream','Content-Length':contents.length,'Cache-Control':['.html','.js','.css','.webmanifest'].includes(ext)?'no-cache, must-revalidate':'public, max-age=3600','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; connect-src 'self'; img-src 'self' data:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'"});res.end(contents);}
const server=http.createServer(async (req,res)=>{
  let url;try{url=new URL(req.url,'http://localhost');}catch{return fail(res,400,'URL inválido.');}
  const p=url.pathname;
  if(p==='/health'){return send(res,200,{ok:true});}
  if(!p.startsWith('/api/')){if(req.method!=='GET')return fail(res,405,'Método não permitido.');return staticFile(req,res,p);}
  if(!['GET','POST','PATCH','DELETE'].includes(req.method))return fail(res,405,'Método não permitido.');
  if(req.method!=='GET'){
    // A custom header makes cross-origin browser writes require preflight; CORS is never enabled.
    // Avoid comparing Origin/Host: HA Ingress may legitimately rewrite the Host header.
    if(req.headers['x-casa-request']!=='1')return fail(res,403,'Pedido não autorizado.');
  }
  let b={};if(req.method!=='GET')try{b=await parseBody(req);}catch(e){return fail(res,400,e.message);}
  try{
    if(p==='/api/bootstrap'&&req.method==='GET')return send(res,200,{setup:db.people.length===0,user:(()=>{const u=readUser(req);return u?{id:u.id,name:u.name,role:u.role}:null;})()});
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
      loginSucceeded(username);return send(res,200,{user:{id:u.id,name:u.name,role:u.role}},{'Set-Cookie':cookie(req,session(u))});
    }
    if(p==='/api/logout'&&req.method==='POST')return send(res,200,{ok:true},{'Set-Cookie':cookie(req,'')});
    const user=readUser(req);if(!user)return fail(res,401,'Inicia sessão para continuar.');
    if(p==='/api/finance'&&req.method==='GET'){if(!financeAllowed(user))return fail(res,403,'Sem acesso às finanças.');return send(res,200,{finance:financeState(user)});}
    if(p==='/api/finance/accounts'&&req.method==='POST'){
      if(!financeAllowed(user))return fail(res,403,'Sem acesso às finanças.');
      const name=cleanStr(b.name,100);if(!name)return fail(res,400,'Indica o nome da conta.');
      if(!['cash','bank','other'].includes(b.kind||'bank'))return fail(res,400,'Tipo de conta inválido.');
      const scope=b.scope||'private';if(!['private','shared'].includes(scope))return fail(res,400,'Visibilidade inválida.');
      if(b.allowedUserIds!==undefined&&(!Array.isArray(b.allowedUserIds)||b.allowedUserIds.some(x=>typeof x!=='string'||!db.people.some(p=>p.id===x&&roleOf(p)!=='collaborator'&&p.id!==user.id))))return fail(res,400,'Utilizadores da partilha inválidos.');
      const allowedUserIds=Array.isArray(b.allowedUserIds)?b.allowedUserIds:[];
      if(!elevated(user)&&allowedUserIds.length)return fail(res,403,'Só gestores podem partilhar contas com terceiros.');
      const a={id:id(),name,kind:b.kind||'bank',currency:'EUR',scope,ownerId:user.id,allowedUserIds:scope==='shared'?[...new Set(allowedUserIds)]:[],archived:false,createdAt:new Date().toISOString()};
      db.finance.accounts.push(a);save();return send(res,201,{account:a});
    }
    const accountMatch=p.match(/^\/api\/finance\/accounts\/([^/]+)$/);
    if(accountMatch&&req.method==='PATCH'){
      const a=db.finance.accounts.find(x=>x.id===accountMatch[1]);if(!a||!accessAccount(user,a))return fail(res,404,'Conta não encontrada.');
      if(a.ownerId!==user.id&&roleOf(user)!=='admin')return fail(res,403,'Só o titular pode alterar a conta.');
      if('archived'in b&&typeof b.archived!=='boolean')return fail(res,400,'Estado inválido.');
      if('name'in b&&!cleanStr(b.name,100))return fail(res,400,'Nome inválido.');
      if('scope'in b||'allowedUserIds'in b){if(!['private','shared'].includes(b.scope||a.scope))return fail(res,400,'Visibilidade inválida.');const ids='allowedUserIds'in b?b.allowedUserIds:a.allowedUserIds;if(!Array.isArray(ids)||ids.some(x=>typeof x!=='string'||!db.people.some(p=>p.id===x&&roleOf(p)!=='collaborator'&&p.id!==a.ownerId)))return fail(res,400,'Utilizadores inválidos.');if(!elevated(user)&&ids.length)return fail(res,403,'Sem permissão para partilhar a conta.');a.scope=b.scope||a.scope;a.allowedUserIds=a.scope==='private'?[]:[...new Set(ids)];}
      if('name'in b)a.name=cleanStr(b.name,100);if('archived'in b)a.archived=b.archived;
      save();return send(res,200,{account:a});
    }
    if(p==='/api/finance/transactions'&&req.method==='POST'){
      if(!financeAllowed(user))return fail(res,403,'Sem acesso às finanças.');
      const account=db.finance.accounts.find(x=>x.id===b.accountId);if(!account||!accessAccount(user,account))return fail(res,404,'Conta não encontrada.');
      if(account.archived)return fail(res,409,'Conta arquivada.');
      if(!['income','expense'].includes(b.kind))return fail(res,400,'Tipo inválido.');
      const amountCents=cents(b.amountCents),transactionDate=dateISO(b.transactionDate);
      const transaction={id:id(),accountId:account.id,kind:b.kind,amountCents,transactionDate,category:cleanStr(b.category,80)||'Geral',description:cleanStr(b.description,250),createdBy:user.id,createdAt:new Date().toISOString()};
      db.finance.transactions.push(transaction);save();return send(res,201,{transaction});
    }
    if(p==='/api/finance/budgets'&&req.method==='POST'){
      if(!financeAllowed(user))return fail(res,403,'Sem acesso às finanças.');
      const account=db.finance.accounts.find(x=>x.id===b.accountId);if(!account||!accessAccount(user,account))return fail(res,404,'Conta não encontrada.');
      if(typeof b.month!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(b.month))return fail(res,400,'Mês inválido.');
      if(account.archived)return fail(res,409,'Conta arquivada.');
      const amountCents=cents(b.amountCents);
      if(db.finance.budgets.some(x=>x.accountId===account.id&&x.month===b.month&&x.category===(cleanStr(b.category,80)||'Geral')))return fail(res,409,'Já existe orçamento desta categoria para este mês.');
      const budget={id:id(),accountId:account.id,month:b.month,category:cleanStr(b.category,80)||'Geral',amountCents,createdBy:user.id};
      db.finance.budgets.push(budget);save();return send(res,201,{budget});
    }
    if(p==='/api/finance/goals'&&req.method==='POST'){
      if(!financeAllowed(user))return fail(res,403,'Sem acesso às finanças.');
      const account=db.finance.accounts.find(x=>x.id===b.accountId);if(!account||!accessAccount(user,account))return fail(res,404,'Conta não encontrada.');
      if(account.archived)return fail(res,409,'Conta arquivada.');
      const title=cleanStr(b.title,140);if(!title)return fail(res,400,'Indica o objetivo.');
      const targetCents=cents(b.targetCents),savedCents=b.savedCents===undefined?0:b.savedCents;if(!Number.isSafeInteger(savedCents)||savedCents<0||savedCents>targetCents)return fail(res,400,'Poupança inválida.');
      const goal={id:id(),accountId:account.id,title,targetCents,savedCents,createdBy:user.id};
      db.finance.goals.push(goal);save();return send(res,201,{goal});
    }
    if(p==='/api/state'&&req.method==='GET')return send(res,200,{...visibleState(user),user:{id:user.id,name:user.name,role:roleOf(user)}});
    if(p==='/api/export'&&req.method==='GET'){if(user.role!=='admin')return fail(res,403,'Apenas administradores.');return send(res,200,{exportedAt:new Date().toISOString(),...state()},{'Content-Disposition':'attachment; filename="casa-em-dia-backup.json"'});}
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
      const incoming={...db.settings};if('rooms'in b)incoming.rooms=normalize(b.rooms);if('categories'in b)incoming.categories=normalize(b.categories);db.settings=incoming;logAction(user,'settings.update','global');save();return send(res,200,{settings:db.settings});
    }
    if(p==='/api/tasks'&&req.method==='POST'){
      const task={id:id(),title:'',room:'Geral',notes:'',kind:'project',priority:'P3',estimatedMinutes:null,category:'Geral',thisWeek:false,subtasks:[],status:'todo',repeat:'none',dueDate:'',assignedTo:null,suggested:false,createdAt:new Date().toISOString(),createdBy:user.id,visibility:'shared'};patchTask(task,b);if(!elevated(user)&&task.assignedTo&&task.assignedTo!==user.id)return fail(res,403,'Não podes atribuir esta tarefa a outra pessoa.');if(roleOf(user)==='collaborator'&&task.visibility==='private')return fail(res,403,'Colaboradores não podem criar tarefas privadas.');if(task.visibility==='private'&&task.assignedTo&&task.assignedTo!==user.id)return fail(res,403,'Uma tarefa privada não pode ser atribuída a outra pessoa.');if(!task.title)return fail(res,400,'Introduz o nome da tarefa.');db.tasks.push(task);logAction(user,'task.create',task.id);save();return send(res,201,{task});
    }
    const match=p.match(/^\/api\/tasks\/([^/]+)(\/complete)?$/);
    if(match){const t=db.tasks.find(x=>x.id===match[1]);if(!t||!canSeeTask(user,t))return fail(res,404,'Tarefa não encontrada.');
      if(match[2]&&req.method==='POST'){
        if(!canCompleteTask(user,t))return fail(res,403,'Sem permissão para concluir esta tarefa.');
        const time=new Date().toISOString();db.history.push({id:id(),taskId:t.id,title:t.title,kind:t.kind,assignedTo:t.assignedTo,by:user.id,at:time});
        if(db.history.length>2000)db.history=db.history.slice(-2000);
        if(t.kind==='routine'&&t.repeat!=='none') {t.status='todo';t.dueDate=nextDate(t.dueDate,t.repeat);t.suggested=false;}else t.status='done';
        t.updatedAt=time;logAction(user,'task.complete',t.id);save();return send(res,200,{task:t});
      }
      if(!match[2]&&req.method==='PATCH'){if(!allowedTaskPatch(user,t,b))return fail(res,403,'Sem permissão para alterar esta tarefa.');const updated={...t};patchTask(updated,b);if(!canEditTask(user,t)){if('status'in b && !['doing','done'].includes(b.status))return fail(res,403,'Só podes iniciar ou concluir esta tarefa.');if('subtasks'in b){if(!Array.isArray(b.subtasks)||b.subtasks.length!==(t.subtasks||[]).length||b.subtasks.some((v,i)=>v.title!==t.subtasks[i].title||v.id!==t.subtasks[i].id))return fail(res,403,'Só podes marcar subtarefas como concluídas.');}}if(!elevated(user)&&('assignedTo'in b)&&updated.assignedTo!==t.assignedTo)return fail(res,403,'Sem permissão para atribuir tarefas.');if(updated.visibility==='private'&&updated.assignedTo&&updated.assignedTo!==updated.createdBy)return fail(res,403,'Uma tarefa privada não pode ser atribuída a outra pessoa.');if(roleOf(user)==='collaborator'&&updated.visibility==='private')return fail(res,403,'Colaboradores não podem criar tarefas privadas.');Object.assign(t,updated);logAction(user,'task.update',t.id);save();return send(res,200,{task:t});}
      if(!match[2]&&req.method==='DELETE'){if(roleOf(user)!=='admin')return fail(res,403,'Só um administrador pode eliminar tarefas.');db.tasks=db.tasks.filter(x=>x.id!==t.id);logAction(user,'task.delete',t.id);save();return send(res,200,{ok:true});}
    }
    if(p==='/api/shopping'&&req.method==='POST'){
      const title=cleanStr(b.title,180);if(!title)return fail(res,400,'Indica o produto.');
      const item={id:id(),title,quantity:cleanStr(b.quantity,50)||'1',category:cleanStr(b.category,70)||'Geral',notes:cleanStr(b.notes,500),purchased:false,createdBy:user.id,createdAt:new Date().toISOString()};
      db.shopping.push(item);logAction(user,'shopping.create',item.id);save();return send(res,201,{item});
    }
    const shoppingMatch=p.match(/^\/api\/shopping\/([^/]+)$/);
    if(shoppingMatch){const item=db.shopping.find(x=>x.id===shoppingMatch[1]);if(!item)return fail(res,404,'Produto não encontrado.');
      if(req.method==='PATCH'){if(!elevated(user)&&item.createdBy!==user.id&&Object.keys(b).some(k=>k!=='purchased'))return fail(res,403,'Só podes marcar este produto como comprado.');
        const updated={...item};if('title'in b){if(!cleanStr(b.title,180))return fail(res,400,'Nome inválido.');updated.title=cleanStr(b.title,180);}
        if('quantity'in b)updated.quantity=cleanStr(b.quantity,50);
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
      const person={id:id(),name,username,passwordHash:passwordHash(pw),role:['manager','resident','collaborator'].includes(b.role)?b.role:'resident',authVersion:1,avatar:'●'};db.people.push(person);logAction(user,'person.create',person.id);save();return send(res,201,{people:publicPeople()});
    }
    if(p==='/api/me'&&req.method==='PATCH'){
      const target=db.people.find(x=>x.id===user.id);
      if('name'in b){const name=cleanStr(b.name,80);if(name.length<2)return fail(res,400,'O nome deve ter pelo menos 2 caracteres.');target.name=name;}
      if('photo'in b)target.photo=cleanPhoto(b.photo);
      logAction(user,'person.profile',user.id);save();return send(res,200,{user:{id:target.id,name:target.name,role:roleOf(target)},people:publicPeople()});
    }
    const personMatch=p.match(/^\/api\/people\/([^/]+)\/password$/);
    if(personMatch&&req.method==='POST'){
      if(user.role!=='admin'&&user.id!==personMatch[1])return fail(res,403,'Sem permissão.');const target=db.people.find(u=>u.id===personMatch[1]);if(!target)return fail(res,404,'Pessoa não encontrada.');
      if(String(b.password||'').length<10)return fail(res,400,'A nova palavra-passe deve ter pelo menos 10 caracteres.');
      if(target.id===user.id&&!verifyPw(String(b.currentPassword||'').slice(0,200),target.passwordHash))return fail(res,403,'A palavra-passe atual não está correta.');
      target.passwordHash=passwordHash(b.password);target.authVersion=(target.authVersion||1)+1;logAction(user,'person.password',target.id);save();return send(res,200,{ok:true});
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
server.listen(PORT,HOST,()=>console.log(`Casa em Dia online: http://${HOST}:${PORT} • dados: ${DB_FILE}`));
