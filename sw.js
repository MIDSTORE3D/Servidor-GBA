/* GBA PWA v2 - cache estável para GitHub Pages */
const SHELL='gba-shell-v2';
const ROMS='gba-roms-v2';
const ENGINE='gba-engine-v2';
const BASE=new URL('./',self.registration.scope);
const ENTRY=new URL('index.html',BASE).href;
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(SHELL);
    // Não impedir a instalação do SW se um único recurso falhar.
    for(const file of ['index.html','manifest.webmanifest','icon.svg','jogos/catalogo.json']){
      try{await cache.add(new URL(file,BASE).href)}catch(e){console.warn('[GBA SW] Sem pré-cache de',file,e)}
    }
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keep=new Set([SHELL,ROMS,ENGINE]);
    for(const name of await caches.keys())if(name.startsWith('gba-')&&!keep.has(name))await caches.delete(name);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  const local=url.origin===BASE.origin&&url.pathname.startsWith(BASE.pathname);
  const engine=url.protocol==='https:'&&url.hostname==='cdn.emulatorjs.org';
  if(!local&&!engine)return;
  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const network=await fetch(req,{cache:'no-store'});
        if(network.ok){
          const cache=await caches.open(SHELL);
          try{await cache.put(ENTRY,network.clone())}catch{}
        }
        return network;
      }catch{
        return (await caches.match(ENTRY))||new Response('Offline: abra uma vez com internet.',{status:503,headers:{'content-type':'text/plain; charset=utf-8'}});
      }
    })());
    return;
  }
  const rom=local&&url.pathname.startsWith(new URL('jogos/',BASE).pathname)&&/\.gba$/i.test(url.pathname);
  const name=engine?ENGINE:rom?ROMS:SHELL;
  event.respondWith((async()=>{
    const cache=await caches.open(name);
    const previous=await cache.match(req);
    if(previous)return previous;
    const response=await fetch(req);
    if(response.ok||response.type==='opaque'){
      try{await cache.put(req,response.clone())}catch(e){console.warn('[GBA SW] Cache indisponível',e)}
    }
    return response;
  })());
});
