'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');

(async()=>{
 const root=path.resolve(__dirname);
 const paths={'/':'../docs/index.html','/index.html':'../docs/index.html','/app.js':'public/app.js','/style.css':'public/style.css'};
 const server=http.createServer((req,res)=>{
   const url=new URL(req.url,'http://localhost');
   let name=paths[url.pathname];
   if(!name&&url.pathname.startsWith('/assets/'))name='public'+url.pathname;
   if(!name&&/^\/(?:logo-[\w-]+\.svg|icon(?:-[\w-]+)?\.svg)$/.test(url.pathname))name='public'+url.pathname;
   if(!name){res.writeHead(404);return res.end('Not found');}
   const full=path.resolve(root,name);
   if(!full.startsWith(path.resolve(root,'..')+path.sep)){res.writeHead(403);return res.end('Forbidden');}
   try{const data=fs.readFileSync(full);res.writeHead(200,{'Content-Type':full.endsWith('.js')?'text/javascript':full.endsWith('.css')?'text/css':full.endsWith('.html')?'text/html':'image/svg+xml','Cache-Control':'no-store'});res.end(data);}catch{res.writeHead(404);res.end('Not found');}
 });
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const base='http://127.0.0.1:'+server.address().port+'/';
 let browser;
 try{
   browser=await chromium.launch({headless:true,args:['--no-sandbox']});
   for(const vp of [{width:390,height:844},{width:1440,height:900}]){
     const context=await browser.newContext({viewport:vp,deviceScaleFactor:1,hasTouch:vp.width<500,isMobile:vp.width<500});
     const page=await context.newPage();const navSelector=vp.width<500?'.tab-nav':'.sidebar';const errors=[];page.on('pageerror',e=>errors.push(e.message));
     await page.goto(base,{waitUntil:'networkidle'});
     await page.locator('.action-hub').waitFor();
     assert.equal(await page.locator('.action-hub-task').count(),3);
     const metrics=await page.evaluate(()=>{
      const nav=document.querySelector('.tab-nav');
      return {overflow:document.documentElement.scrollWidth-window.innerWidth,
       navDirection:nav?getComputedStyle(nav).flexDirection:null,
       navWidth:nav?.clientWidth||0,navScroll:nav?.scrollWidth||0,
       firstWidth:nav?.querySelector('button')?.getBoundingClientRect().width||0,
       navCount:nav?.querySelectorAll('button').length||0};
     });
     assert(metrics.overflow<=2,'Horizontal page overflow: '+JSON.stringify(metrics));
     if(vp.width<500){
       assert.equal(metrics.navDirection,'row','Bottom nav must be horizontal');
       assert.equal(metrics.navCount,5,'Barra com Painel, Tarefas, +, Compras e Mais');
       const fixed=await page.locator('.tab-nav').evaluate(el=>{const r=el.getBoundingClientRect();return {bottom:Math.round(innerHeight-r.bottom),left:Math.round(r.left),width:Math.round(r.width)};});
       assert.equal(fixed.bottom,0,'Bottom bar must touch bottom of viewport');
       assert.equal(fixed.left,0,'Bottom bar must touch left edge');
       assert.equal(fixed.width,vp.width,'Bottom bar must be full width');
       assert.equal(await page.locator('.mobile-header img[src="logo-primary-dark.svg"]').count(),1,'Mobile header must use primary SVG logo');
       assert.equal(await page.locator('.mobile-header .profile-btn').count(),1,'Botão de perfil no cabeçalho');
       assert.equal(await page.locator('.floating-add').isVisible(),false,'O + flutuante dá lugar ao + da barra');
       await page.locator('[data-action="more-toggle"]').click();
       await page.locator('.more-sheet').waitFor();
       assert(await page.locator('.more-grid button').count()>=5,'Mais mostra as restantes secções');
       await page.locator('.more-grid [data-page="routines"]').click();
       assert.equal(await page.locator('.more-sheet').count(),0,'Mais fecha ao navegar');
       assert.equal(await page.locator('.tab-nav [data-action="more-toggle"].active').count(),1,'Mais fica ativo numa secção secundária');
       await page.locator('.mobile-header .profile-btn').click();
       await page.locator('#profile-name-form').waitFor();
       await page.locator('.mobile-header .brand-home').click();
       await page.locator('.action-hub').waitFor();
     }
     if(vp.width<500)fs.mkdirSync(path.join(root,'ui-screens'),{recursive:true});
     if(vp.width<500)await page.screenshot({path:path.join(root,'ui-screens','01-dashboard-iphone.png'),fullPage:true});
     await page.locator(navSelector+' [data-page="tasks"]').click();
     await page.locator('.filters-summary').waitFor();
     assert.equal(await page.locator('.filters-collapsed').count(),1);
     await page.locator('[data-action="filter-toggle"]').click();
     assert.equal(await page.locator('.filters-collapsed').count(),0);
     if(vp.width<500)await page.screenshot({path:path.join(root,'ui-screens','02-tarefas-iphone.png'),fullPage:true});
     await page.locator(vp.width<500?'.tab-add':'.header-row [data-action="add"]').click();
     if(vp.width<500){await page.locator('.quick-create-menu').waitFor();await page.locator('[data-action="quick-new"][data-kind="task"]').click();}
     await page.locator('#task-form').waitFor();
     assert.equal(await page.locator('#task-advanced').isHidden(),true);
     await page.locator('[data-action="advanced-task"]').click();
     assert.equal(await page.locator('#task-advanced').isVisible(),true);
     if(vp.width<500)await page.screenshot({path:path.join(root,'ui-screens','03-tarefa-iphone.png'),fullPage:true});
     await page.locator('.modal .close[data-action="close"]').click();
     await page.locator(navSelector+' [data-page="shopping"]').click();
     await page.locator('.shopping-switch').waitFor();
     assert(await page.locator('.shopping-category').count()>=1,'Grouped shopping categories visible');
     assert(await page.locator('#shopping-form select[name="category"]').count()===1);
     if(vp.width<500)await page.screenshot({path:path.join(root,'ui-screens','04-compras-iphone.png'),fullPage:true});
     if(vp.width<500)await page.locator('[data-action="more-toggle"]').click();
     await page.locator((vp.width<500?'.more-grid':navSelector)+' [data-page="finance"]').click();
     await page.locator('#finance-period').waitFor();
     if(vp.width<500)await page.screenshot({path:path.join(root,'ui-screens','05-financas-iphone.png'),fullPage:true});
     if(vp.width<500)await page.locator('[data-action="more-toggle"]').click();
     await page.locator((vp.width<500?'.more-grid':navSelector)+' [data-page="settings"]').click();
     await page.locator('.settings-manager').waitFor();
     assert(await page.locator('.manager-item').count()>2);
     if(vp.width<500)await page.screenshot({path:path.join(root,'ui-screens','06-definicoes-iphone.png'),fullPage:true});
     assert.equal(errors.length,0,'Frontend errors: '+errors.join('; '));
     await context.close();
     console.log('OK: responsive and interactive UI '+vp.width+'x'+vp.height);
   }
 }finally{if(browser)await browser.close();await new Promise(ok=>server.close(ok));}
})().catch(e=>{console.error(e);process.exitCode=1;});
