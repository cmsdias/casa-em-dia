'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net');
const {spawn}=require('node:child_process');
(async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'casa-roles-'));
 const socket=net.createServer();await new Promise(ok=>socket.listen(0,'127.0.0.1',ok));const port=socket.address().port;await new Promise(ok=>socket.close(ok));
 const child=spawn(process.execPath,[path.join(__dirname,'server.js')],{env:{...process.env,DATA_DIR:tmp,PORT:String(port),HOST:'127.0.0.1'},stdio:'pipe'});
 const cookies={};
 async function request(as,p,method='GET',body){const rsp=await fetch('http://127.0.0.1:'+port+p,{method,headers:{...(cookies[as]?{Cookie:cookies[as]}:{}),...(method!=='GET'?{'X-Casa-Request':'1','Content-Type':'application/json'}:{})},body:body===undefined?undefined:JSON.stringify(body)});const c=rsp.headers.get('set-cookie');if(c)cookies[as]=c.split(';')[0];return {status:rsp.status,data:await rsp.json()};}
 try{
  let ready=false;for(let i=0;i<80;i++){try{if((await request('admin','/health')).status===200){ready=true;break;}}catch{}await new Promise(ok=>setTimeout(ok,100));}assert(ready);
  assert.equal((await request('admin','/api/setup','POST',{name:'Dono',username:'admin',password:'senha-testes-123'})).status,200);
  const users={};
  for(const role of ['manager','resident','collaborator']){
   const create=await request('admin','/api/people','POST',{name:role,username:role,password:'senha-testes-123',role});assert.equal(create.status,201);
   users[role]=create.data.people.find(x=>x.username===role).id;
   assert.equal((await request(role,'/api/login','POST',{username:role,password:'senha-testes-123'})).status,200);
  }
  const privateT=await request('admin','/api/tasks','POST',{title:'Informação privada',visibility:'private',notes:'privado'});assert.equal(privateT.status,201);
  const shared=await request('admin','/api/tasks','POST',{title:'Limpeza comum',visibility:'shared',assignedTo:users.collaborator,subtasks:[{id:'a',title:'Limpar chão',done:false}]});assert.equal(shared.status,201);
  const privateId=privateT.data.task.id, sharedId=shared.data.task.id;
  for(const role of ['manager','resident','collaborator']){
   const state=(await request(role,'/api/state')).data;
   assert(!state.tasks.some(t=>t.id===privateId),role+' não pode ver tarefa privada');
   assert.equal((await request(role,'/api/tasks/'+privateId,'PATCH',{title:'alterada'})).status,404);
  }
  assert.equal((await request('collaborator','/api/tasks/'+sharedId,'PATCH',{title:'alterar trabalho alheio'})).status,403);
  assert.equal((await request('collaborator','/api/tasks/'+sharedId,'PATCH',{status:'done'})).status,200);
  assert.equal((await request('collaborator','/api/settings','PATCH',{rooms:['Outra']})).status,403);
  assert.equal((await request('resident','/api/people','POST',{name:'Outra',username:'outra',password:'senha-testes-123'})).status,403);
  assert.equal((await request('manager','/api/settings','PATCH',{rooms:['Sala']})).status,200);
  assert.equal((await request('collaborator','/api/shopping','POST',{title:'Detergente',quantity:'2'})).status,201);
  assert.equal((await request('resident','/api/state')).data.shopping.length,1);
  assert.equal((await request('collaborator','/api/worklogs','POST',{date:'2026-10-29',minutes:30,note:'Limpei o chão',taskId:sharedId})).status,201);
  assert.equal((await request('resident','/api/state')).data.workLogs.length,0);
  assert.equal((await request('admin','/api/state')).data.workLogs.length,1);
  assert.equal((await request('admin','/api/people/'+users.resident+'/role','PATCH',{role:'collaborator'})).status,200);
  assert.equal((await request('resident','/api/state')).status,401,'Mudança de perfil deve invalidar sessões');
  const own=(await request('collaborator','/api/tasks','POST',{title:'Trabalho extra'}));assert.equal(own.status,201);
  assert.equal((await request('collaborator','/api/tasks/'+own.data.task.id,'PATCH',{notes:'Registo'})).status,200);
  assert.equal((await request('resident','/api/export')).status,401);
  console.log('OK: perfis, tarefas privadas, edição delegada, contas, compras, trabalhos e sessão');
 }finally{child.kill();fs.rmSync(tmp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
