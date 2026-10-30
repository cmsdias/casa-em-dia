'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net');
const {spawn}=require('node:child_process');
(async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'casa-fin-'));const server=net.createServer();await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const port=server.address().port;await new Promise(ok=>server.close(ok));
 const child=spawn(process.execPath,[path.join(__dirname,'server.js')],{env:{...process.env,DATA_DIR:tmp,PORT:String(port),HOST:'127.0.0.1'},stdio:'pipe'});const cookies={};
 async function req(as,p,method='GET',body){const r=await fetch('http://127.0.0.1:'+port+p,{method,headers:{...(cookies[as]?{Cookie:cookies[as]}:{}),...(method==='GET'?{}:{'X-Casa-Request':'1','Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body)});let c=r.headers.get('set-cookie');if(c)cookies[as]=c.split(';')[0];return {status:r.status,data:await r.json()};}
 try{for(let n=0;n<80;n++){try{if((await req('a','/health')).status===200)break;}catch{}await new Promise(ok=>setTimeout(ok,100));}
 assert.equal((await req('a','/api/setup','POST',{name:'Admin',username:'admin',password:'teste-seguro-123'})).status,200);
 for(const role of ['resident','manager','collaborator']){assert.equal((await req('a','/api/people','POST',{name:role,username:role,password:'teste-seguro-123',role})).status,201);assert.equal((await req(role,'/api/login','POST',{username:role,password:'teste-seguro-123'})).status,200);}
 assert.equal((await req('collaborator','/api/finance')).status,403);
 assert.equal((await req('collaborator','/api/finance/accounts','POST',{name:'Proibido'})).status,403);
 const account=await req('resident','/api/finance/accounts','POST',{name:'Conta privada',scope:'private',kind:'bank'});assert.equal(account.status,201);const accountId=account.data.account.id;
 assert.equal((await req('manager','/api/finance')).data.finance.accounts.length,0);
 assert.equal((await req('manager','/api/finance/transactions','POST',{accountId,kind:'expense',amountCents:100,transactionDate:'2026-10-30'})).status,404);
 const tx=await req('resident','/api/finance/transactions','POST',{accountId,kind:'expense',amountCents:1999,transactionDate:'2026-10-30',category:'Alimentação'});assert.equal(tx.status,201);
 assert.equal((await req('resident','/api/finance/transactions','POST',{accountId,kind:'expense',amountCents:19.99,transactionDate:'2026-10-30'})).status,400);
 assert.equal((await req('resident','/api/finance')).data.finance.transactions.length,1);
 assert.equal((await req('collaborator','/api/state')).data.finance,undefined);
 assert.equal((await req('resident','/api/finance/budgets','POST',{accountId,month:'2026-10',amountCents:25000,category:'Alimentação'})).status,201);
 assert.equal((await req('resident','/api/finance/goals','POST',{accountId,title:'Férias',targetCents:90000,savedCents:25000})).status,201);
 assert.equal((await req('resident','/api/finance/accounts/'+accountId,'PATCH',{archived:true})).status,200);
 assert.equal((await req('resident','/api/finance/transactions','POST',{accountId,kind:'income',amountCents:200,transactionDate:'2026-10-30'})).status,409);
 console.log('OK: privacidade financeira, movimentos monetários inteiros, orçamentos, objetivos, arquivamento');
 }finally{child.kill();fs.rmSync(tmp,{force:true,recursive:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
