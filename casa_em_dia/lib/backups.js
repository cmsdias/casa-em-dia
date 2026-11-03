'use strict';
// Cópias de segurança de casa.json em DATA_DIR/backups.
// Nome: casa-AAAA-MM-DDTHH-MM-SSZ-<motivo>.json. Cada motivo tem o seu limite de cópias guardadas.
const fs=require('node:fs');
const path=require('node:path');

const REASONS={auto:14,manual:20,'pre-restore':5,upload:5,upgrade:5};
const NAME_RE=/^casa-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}(?:-\d{3})?Z)-(auto|manual|pre-restore|upload|upgrade)\.json$/;

function stamp(d=new Date()){return d.toISOString().replace(/:/g,'-').replace(/\.(\d{3})Z$/,'-$1Z');}
function parseStamp(s){const m=/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})(?:-(\d{3}))?Z$/.exec(s);return m?new Date(`${m[1]}T${m[2]}:${m[3]}:${m[4]}.${m[5]||'000'}Z`):null;}

// Valida um ficheiro de dados antes de o aceitar como cópia ou de o restaurar.
function validate(data){
  if(!data||typeof data!=='object'||Array.isArray(data))throw Error('O ficheiro não é uma cópia de segurança da Casa em Dia.');
  if(!Array.isArray(data.people)||!Array.isArray(data.tasks))throw Error('O ficheiro não tem pessoas e tarefas: não é uma cópia de segurança completa.');
  const admins=data.people.filter(p=>p&&p.role==='admin'&&typeof p.passwordHash==='string'&&p.active!==false);
  if(!admins.length)throw Error('A cópia não tem nenhum administrador ativo; restaurá-la deixaria a casa sem acesso.');
  if(data.people.some(p=>!p||typeof p.id!=='string'||typeof p.username!=='string'))throw Error('A cópia tem pessoas inválidas.');
  if(data.tasks.some(t=>!t||typeof t.id!=='string'))throw Error('A cópia tem tarefas inválidas.');
  return data;
}
function summaryOf(data){return {people:data.people.length,tasks:data.tasks.length,shopping:Array.isArray(data.shopping)?data.shopping.length:0};}

function createBackups({dataDir,getDb,dateInTz}){
  const dir=path.join(dataDir,'backups');
  fs.mkdirSync(dir,{recursive:true});
  function writeFile(name,text){const tmp=path.join(dir,'.'+name+'.tmp');fs.writeFileSync(tmp,text,{mode:0o600});fs.renameSync(tmp,path.join(dir,name));}
  function list(){
    return fs.readdirSync(dir).map(name=>{const m=NAME_RE.exec(name);if(!m)return null;let size=0;try{size=fs.statSync(path.join(dir,name)).size;}catch{return null;}return {name,reason:m[2],createdAt:parseStamp(m[1]).toISOString(),size};}).filter(Boolean).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  }
  function prune(){const all=list();for(const [reason,keep] of Object.entries(REASONS)){all.filter(b=>b.reason===reason).slice(keep).forEach(b=>{try{fs.unlinkSync(path.join(dir,b.name));}catch{}});}}
  function uniqueName(reason){let name=`casa-${stamp()}-${reason}.json`;let i=0;while(fs.existsSync(path.join(dir,name))){i++;name=`casa-${stamp(new Date(Date.now()+i))}-${reason}.json`;}return name;}
  function create(reason='manual',text=null){
    if(!REASONS[reason])throw Error('Motivo de cópia inválido.');
    const name=uniqueName(reason);writeFile(name,text??JSON.stringify(getDb()));prune();
    return list().find(b=>b.name===name);
  }
  function file(name){if(typeof name!=='string'||!NAME_RE.test(name))throw Error('Cópia de segurança inexistente.');const p=path.join(dir,name);if(!fs.existsSync(p))throw Error('Cópia de segurança inexistente.');return p;}
  function read(name){return fs.readFileSync(file(name));}
  function load(name){let data;try{data=JSON.parse(read(name).toString('utf8'));}catch(e){if(/inexistente/.test(e.message))throw e;throw Error('A cópia está danificada e não pode ser lida.');}return validate(data);}
  function upload(data){validate(data);return create('upload',JSON.stringify(data));}
  // Cópia automática: uma por dia (no fuso horário da casa), feita no arranque e verificada periodicamente.
  function autoTick(){const today=dateInTz(new Date());const has=list().some(b=>b.reason==='auto'&&dateInTz(new Date(b.createdAt))===today);if(!has)return create('auto');return null;}
  function lastAuto(){return list().find(b=>b.reason==='auto')||null;}
  return {dir,list,create,read,load,upload,autoTick,lastAuto,validate,summaryOf};
}
module.exports={createBackups,validate,REASONS,NAME_RE};
