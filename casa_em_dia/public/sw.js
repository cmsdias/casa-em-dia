const VERSION='casa-em-dia-v1-0-0';
const SHELL=['./','./index.html','./style.css','./app.js','./manifest.webmanifest','./icon-192.png','./icon-512.png','./assets/casa-editorial.svg','./assets/casa-detail.svg','./assets/botanical-editorial.svg','./assets/electric-editorial.svg','./assets/plumbing-editorial.svg','./assets/storage-editorial.svg','./assets/coffee-editorial.svg','./assets/laundry-editorial.svg','./assets/office-editorial.svg','./assets/outdoor-editorial.svg','./assets/cleaning-editorial.svg','./assets/bath-editorial.svg','./assets/general-editorial.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);if(e.request.method!=='GET'||u.pathname.includes('/api/'))return;
 if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(()=>caches.match('./index.html')));return;}
 e.respondWith(caches.match(e.request).then(v=>v||fetch(e.request)));
});
