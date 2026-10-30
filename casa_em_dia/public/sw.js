const VERSION='casa-em-dia-v1-5-1-release';
const SHELL=['./','./index.html','./style.css?v=1.5.1','./app.js?v=1.5.1','./manifest.webmanifest','./logo-mark.svg','./logo-mark-light.svg','./logo-primary-light.svg','./logo-primary-dark.svg','./icon.svg','./icon-maskable-512.png','./apple-touch-icon.png','./icon-192.png','./icon-512.png','./assets/casa-editorial.svg','./assets/casa-detail.svg','./assets/botanical-editorial.svg','./assets/electric-editorial.svg','./assets/plumbing-editorial.svg','./assets/storage-editorial.svg','./assets/coffee-editorial.svg','./assets/laundry-editorial.svg','./assets/office-editorial.svg','./assets/outdoor-editorial.svg','./assets/cleaning-editorial.svg','./assets/bath-editorial.svg','./assets/general-editorial.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);if(e.request.method!=='GET'||u.pathname.includes('/api/'))return;
 if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(()=>caches.match('./index.html')));return;}
 // HTML, scripts e CSS: rede primeiro para apresentar imediatamente atualizações.
 if(e.request.destination==='script'||e.request.destination==='style'||/\\.(?:js|css)$/.test(u.pathname)){
  e.respondWith((async()=>{try{const fresh=await fetch(e.request,{cache:'no-store'});if(fresh.ok){const cache=await caches.open(VERSION);await cache.put(e.request,fresh.clone());}return fresh;}catch{return (await caches.match(e.request))||Response.error();}})());return;
 }
 e.respondWith(caches.match(e.request).then(v=>v||fetch(e.request)));
});
