'use strict';
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const net=require('node:net');
(async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'casa-test-'));
 const srv=net.createServer();await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;await new Promise(r=>srv.close(r));
 const proc=spawn(process.execPath,[path.join(__dirname,'server.js')],{env:{...process.env,PORT:String(port),HOST:'127.0.0.1',DATA_DIR:tmp},stdio:'pipe'});
 let cookie='';const req=async (url,method='GET',body)=>{const response=await fetch('http://127.0.0.1:'+port+url,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(method!=='GET'?{'Content-Type':'application/json','X-Casa-Request':'1'}:{})},body:body===undefined?undefined:JSON.stringify(body)});const data=await response.json();if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return {status:response.status,data};};
 try{
  let ready=false;for(let i=0;i<80;i++){try{if((await req('/health')).status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}
  assert(ready,'Servidor não arrancou');
  const page=await fetch('http://127.0.0.1:'+port+'/');
  const html=await page.text();
  assert.match(html,/app\.js\?v=1\.2\.0/,'HTML deve invalidar a cache do JavaScript');
  assert.match(html,/style\.css\?v=1\.2\.0/,'HTML deve invalidar a cache do CSS');
  assert.match(page.headers.get('cache-control'),/no-cache/);
  for(const f of ['app.js','style.css','sw.js']){
   const response=await fetch('http://127.0.0.1:'+port+'/'+f);
   assert.equal(response.status,200);
   assert.match(response.headers.get('cache-control'),/no-cache/,'Os ficheiros de interface devem ser revalidados');
  }

  assert.equal((await req('/api/bootstrap')).data.setup,true);
  assert.equal((await req('/api/setup','POST',{name:'Pessoa de teste',username:'teste',password:'senha-de-teste-123'})).status,200);
  assert.equal((await req('/api/state')).data.user.role,'admin');
  const t=await req('/api/tasks','POST',{title:'Limpar cozinha',room:'Cozinha',category:'Limpeza',priority:'P2',estimatedMinutes:30,thisWeek:true,subtasks:[{id:'a',title:'Bancada',done:false},{id:'b',title:'Armários',done:true}]});
  assert.equal(t.status,201);
  const id=t.data.task.id;
  assert.equal(t.data.task.estimatedMinutes,30);
  assert.equal(t.data.task.subtasks.length,2);
  assert.equal(t.data.task.thisWeek,true);
  let patch=await req('/api/tasks/'+id,'PATCH',{estimatedMinutes:15,subtasks:[{id:'a',title:'Bancada',done:true}]});
  assert.equal(patch.status,200);assert.equal(patch.data.task.subtasks[0].done,true);
  const invalid=await req('/api/tasks/'+id,'PATCH',{title:'Não deve guardar',priority:'errada'});assert.equal(invalid.status,400);
  let state=(await req('/api/state')).data;assert.equal(state.tasks.find(x=>x.id===id).title,'Limpar cozinha','Erro não pode alterar tarefa');
  const settings=await req('/api/settings','PATCH',{rooms:['Cozinha','Jardim'],categories:['Limpeza','Manutenção']});assert.equal(settings.status,200);
  assert(settings.data.settings.rooms.includes('Jardim'));
  const complete=await req('/api/tasks/'+id+'/complete','POST',{});assert.equal(complete.data.task.status,'done');
  assert.equal((await req('/api/export')).status,200);
  assert.equal((await req('/api/state')).data.tasks.find(x=>x.id===id).status,'done');
  assert.equal((await req('/api/tasks/'+id,'DELETE',{})).status,200);
  console.log('OK: instalação, autenticação, tarefas, validação, subtarefas, planeamento, definições, histórico, exportação e eliminação');
 }finally{proc.kill('SIGTERM');fs.rmSync(tmp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
