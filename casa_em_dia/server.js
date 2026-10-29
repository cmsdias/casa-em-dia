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
if (fs.existsSync(DB_FILE)) {db=JSON.parse(fs.readFileSync(DB_FILE,'utf8'));}
else {
  const s=JSON.parse(fs.readFileSync(path.join(ROOT,'seed.json'),'utf8'));
  db={version:1,secret:crypto.randomBytes(32).toString('hex'),people:[],tasks:s.tasks.map(t=>({...t,id:crypto.randomUUID()})),history:[],settings:{rooms:['Cozinha','Lavandaria','Sala','Escritório','WC completo','WC serviço','WC suite','Exterior','Organização geral'],categories:['Manutenção','Arrumação','Limpeza','Compras','Obras','Geral']}};
  save();
}
function save(){const tmp=DB_FILE+'.tmp'; fs.writeFileSync(tmp,JSON.stringify(db,null,2),{mode:0o600});fs.renameSync(tmp,DB_FILE);}
function send(res,status,data,extra={}){const body=JSON.stringify(data);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra});res.end(body);}
function fail(res,status,msg){send(res,status,{error:msg});}
function id(){return crypto.randomUUID();}
function cleanStr(val,max=150){return String(val??'').trim().slice(0,max);}
function passwordHash(pw,salt=crypto.randomBytes(16).toString('hex')){return `${salt}:${crypto.scryptSync(pw,salt,64).toString('hex')}`;}
function verifyPw(pw,stored){const [salt,expected]=stored.split(':');const hash=passwordHash(pw,salt).split(':')[1]; return crypto.timingSafeEqual(Buffer.from(hash,'hex'),Buffer.from(expected,'hex'));}
function session(user){const payload=Buffer.from(JSON.stringify({id:user.id,v:user.authVersion||1,exp:Date.now()+14*86400_000})).toString('base64url');const mac=crypto.createHmac('sha256',db.secret).update(payload).digest('base64url');return `${payload}.${mac}`;}
function readUser(req){const token=((req.headers.cookie||'').match(/(?:^|;\s*)casa_session=([^;]+)/)||[])[1];if(!token)return null;
try{const [payload,mac]=token.split('.');const sig=crypto.createHmac('sha256',db.secret).update(payload).digest('base64url');if(!mac||sig.length!==mac.length||!crypto.timingSafeEqual(Buffer.from(mac),Buffer.from(sig)))return null;const claim=JSON.parse(Buffer.from(payload,'base64url').toString());if(claim.exp<Date.now())return null;return db.people.find(u=>u.id===claim.id&&(u.authVersion||1)===claim.v)||null;}catch{return null;}}
function cookie(req,token){const secure=(req.headers['x-forwarded-proto']==='https'||req.socket.encrypted)?'; Secure':'';return `casa_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${token?14*86400:0}${secure}`;}
async function parseBody(req){let size=0;let chunks=[];for await(const c of req){size+=c.length;if(size>256_000)throw new Error('Pedido demasiado grande.');chunks.push(c);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}catch{throw new Error('JSON inválido.');}}
function publicPeople(){return db.people.map(({id,name,username,role,avatar},i)=>({id,name,username,role,avatar:avatar||'●'}));}
function publicTasks(){return db.tasks;}
function state(){return {people:publicPeople(),tasks:publicTasks(),history:db.history.slice(-200),settings:db.settings||{rooms:[],categories:[]},serverTime:new Date().toISOString()};}
function patchTask(t,b){
  if('title'in b){if(!cleanStr(b.title,180))throw Error('Introduz o nome da tarefa.');t.title=cleanStr(b.title,180);}
  if('room'in b)t.room=cleanStr(b.room,70);
  if('notes'in b)t.notes=cleanStr(b.notes,1500);
  if('category'in b)t.category=cleanStr(b.category,70);
  if('thisWeek'in b)t.thisWeek=!!b.thisWeek;
  if('subtasks'in b){if(!Array.isArray(b.subtasks)||b.subtasks.length>40)throw Error('Subtarefas inválidas.');t.subtasks=b.subtasks.map((x,i)=>({id:cleanStr(x.id,80)||String(i),title:cleanStr(x.title,180),done:!!x.done})).filter(x=>x.title);}
  if('estimatedMinutes'in b){const n=b.estimatedMinutes;if(n===''||n===null||n===undefined)t.estimatedMinutes=null;else if(!Number.isInteger(Number(n))||Number(n)<0||Number(n)>10080)throw Error('Duração inválida.');else t.estimatedMinutes=Number(n);}
  if('priority'in b){if(!['P1','P2','P3','P4'].includes(b.priority))throw Error('Prioridade inválida.');t.priority=b.priority;}
  if('kind'in b){if(!['project','routine'].includes(b.kind))throw Error('Tipo inválido.');t.kind=b.kind;}
  if('status'in b){if(!['todo','doing','waiting','done'].includes(b.status))throw Error('Estado inválido.');t.status=b.status;}
  if('assignedTo'in b){if(b.assignedTo && !db.people.some(p=>p.id===b.assignedTo))throw Error('Responsável não existe.');t.assignedTo=b.assignedTo||null;}
  if('dueDate'in b){const d=cleanStr(b.dueDate,10);if(d&&!/^\d{4}-\d{2}-\d{2}$/.test(d))throw Error('Data inválida.');t.dueDate=d;}
  if('repeat'in b){if(!['none','daily','weekly','biweekly','monthly'].includes(b.repeat))throw Error('Periodicidade inválida.');t.repeat=b.repeat;}
  if('suggested'in b)t.suggested=!!b.suggested;
  t.updatedAt=new Date().toISOString();
}
function nextDate(iso,rep){const base=iso?new Date(iso+'T12:00:00Z'):new Date();if(!iso)base.setUTCHours(12,0,0,0);const now=new Date();const step=()=>{if(rep==='daily')base.setUTCDate(base.getUTCDate()+1);if(rep==='weekly')base.setUTCDate(base.getUTCDate()+7);if(rep==='biweekly')base.setUTCDate(base.getUTCDate()+14);if(rep==='monthly')base.setUTCMonth(base.getUTCMonth()+1);};step();let safety=0;while(base<now && safety++<366)step();return base.toISOString().slice(0,10);}
const TYPES={'/':'text/html; charset=utf-8','.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
function staticFile(req,res,pathname){const relative=pathname==='/'?'index.html':decodeURIComponent(pathname).replace(/^\/+/, '');const file=path.resolve(WEB,relative);if(!file.startsWith(WEB+path.sep))return fail(res,403,'Acesso negado.');if(!fs.existsSync(file)||!fs.statSync(file).isFile())return fail(res,404,'Não encontrado.');const ext=path.extname(file);const contents=fs.readFileSync(file);res.writeHead(200,{'Content-Type':TYPES[ext]||'application/octet-stream','Content-Length':contents.length,'Cache-Control':ext==='.html'||path.basename(file)==='sw.js'?'no-cache':'public, max-age=3600','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; connect-src 'self'; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'"});res.end(contents);}
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
      const u=db.people.find(x=>x.username===cleanStr(b.username,40).toLowerCase());if(!u||!verifyPw(String(b.password||''),u.passwordHash))return fail(res,401,'Credenciais inválidas.');return send(res,200,{user:{id:u.id,name:u.name,role:u.role}},{'Set-Cookie':cookie(req,session(u))});
    }
    if(p==='/api/logout'&&req.method==='POST')return send(res,200,{ok:true},{'Set-Cookie':cookie(req,'')});
    const user=readUser(req);if(!user)return fail(res,401,'Inicia sessão para continuar.');
    if(p==='/api/state'&&req.method==='GET')return send(res,200,{...state(),user:{id:user.id,name:user.name,role:user.role}});
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
        const t={id:id(),title:'',room:'Geral',notes:'',kind:'project',priority:'P3',estimatedMinutes:null,category:'Geral',thisWeek:false,subtasks:[],status:'todo',repeat:'none',dueDate:'',assignedTo:null,suggested:false,createdAt:new Date().toISOString()};
        const allowed={};
        for(const field of ['title','room','notes','kind','priority','status','repeat','dueDate','suggested','estimatedMinutes','category','thisWeek','subtasks']){
          if(Object.prototype.hasOwnProperty.call(raw,field))allowed[field]=raw[field];
        }
        try{patchTask(t,allowed);}catch{skipped++;continue;}
        const k=key(t);
        if(existing.has(k)){skipped++;continue;}
        existing.add(k);staged.push(t);imported++;
      }
      db.tasks.push(...staged);save();return send(res,200,{imported,skipped});
    }
    if(p==='/api/settings'&&req.method==='PATCH'){
      if(user.role!=='admin')return fail(res,403,'Só um administrador pode alterar definições.');
      const normalize=a=>{if(!Array.isArray(a)||a.length>100)throw Error('Lista inválida.');return [...new Set(a.map(x=>cleanStr(x,70)).filter(Boolean))];};
      db.settings=db.settings||{rooms:[],categories:[]};
      if('rooms'in b)db.settings.rooms=normalize(b.rooms);
      if('categories'in b)db.settings.categories=normalize(b.categories);
      save();return send(res,200,{settings:db.settings});
    }
    if(p==='/api/tasks'&&req.method==='POST'){
      const task={id:id(),title:'',room:'Geral',notes:'',kind:'project',priority:'P3',estimatedMinutes:null,category:'Geral',thisWeek:false,subtasks:[],status:'todo',repeat:'none',dueDate:'',assignedTo:null,suggested:false,createdAt:new Date().toISOString()};patchTask(task,b);if(!task.title)return fail(res,400,'Introduz o nome da tarefa.');db.tasks.push(task);save();return send(res,201,{task});
    }
    const match=p.match(/^\/api\/tasks\/([^/]+)(\/complete)?$/);
    if(match){const t=db.tasks.find(x=>x.id===match[1]);if(!t)return fail(res,404,'Tarefa não encontrada.');
      if(match[2]&&req.method==='POST'){
        const time=new Date().toISOString();db.history.push({id:id(),taskId:t.id,title:t.title,kind:t.kind,assignedTo:t.assignedTo,by:user.id,at:time});
        if(db.history.length>2000)db.history=db.history.slice(-2000);
        if(t.kind==='routine'&&t.repeat!=='none') {t.status='todo';t.dueDate=nextDate(t.dueDate,t.repeat);t.suggested=false;}else t.status='done';
        t.updatedAt=time;save();return send(res,200,{task:t});
      }
      if(!match[2]&&req.method==='PATCH'){patchTask(t,b);save();return send(res,200,{task:t});}
      if(!match[2]&&req.method==='DELETE'){if(user.role!=='admin')return fail(res,403,'Só um administrador pode eliminar tarefas.');db.tasks=db.tasks.filter(x=>x.id!==t.id);save();return send(res,200,{ok:true});}
    }
    if(p==='/api/people'&&req.method==='POST'){
      if(user.role!=='admin')return fail(res,403,'Apenas administradores.');
      const name=cleanStr(b.name,80),username=cleanStr(b.username,40).toLowerCase(),pw=String(b.password||'');
      if(name.length<2||!/^[a-z0-9._-]{3,40}$/.test(username)||pw.length<10)return fail(res,400,'Nome, utilizador (mín. 3 caracteres) e palavra-passe (mín. 10 caracteres) obrigatórios.');
      if(db.people.some(p=>p.username===username))return fail(res,409,'Esse nome de utilizador já existe.');
      db.people.push({id:id(),name,username,passwordHash:passwordHash(pw),role:'member',authVersion:1,avatar:'●'});save();return send(res,201,{people:publicPeople()});
    }
    const personMatch=p.match(/^\/api\/people\/([^/]+)\/password$/);
    if(personMatch&&req.method==='POST'){
      if(user.role!=='admin'&&user.id!==personMatch[1])return fail(res,403,'Sem permissão.');const target=db.people.find(u=>u.id===personMatch[1]);if(!target)return fail(res,404,'Pessoa não encontrada.');
      if(String(b.password||'').length<10)return fail(res,400,'A nova palavra-passe deve ter pelo menos 10 caracteres.');
      target.passwordHash=passwordHash(b.password);target.authVersion=(target.authVersion||1)+1;save();return send(res,200,{ok:true});
    }
    return fail(res,404,'Rota não encontrada.');
  }catch(e){console.error('Request error:',e);return fail(res,400,e.message||'Ocorreu um erro.');}
});
server.listen(PORT,HOST,()=>console.log(`Casa em Dia online: http://${HOST}:${PORT} • dados: ${DB_FILE}`));
