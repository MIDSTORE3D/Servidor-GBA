/* Cache local GBA v1. A ROM é salva pelo index.html; recursos EmulatorJS são salvos ao primeiro uso. */
const SHELL='gba-shell-v1';
const ROMS='gba-roms-v1';
const ENGINE='gba-engine-v1';
const BASE=new URL('./', self.registration.scope);
const SHELL_FILES=['./','./index.html','./manifest.webmanifest','./icon.svg','./jogos/catalogo.json'];
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(SHELL);
    await cache.addAll(SHELL_FILES);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keep=new Set([SHELL,ROMS,ENGINE]);
    for(const name of await caches.keys()) if(name.startsWith('gba-')&&!keep.has(name))await caches.delete(name);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  const inside=url.origin===BASE.origin&&url.pathname.startsWith(BASE.pathname);
  const cdn=url.hostname==='cdn.emulatorjs.org'&&url.protocol==='https:';
  if(!inside&&!cdn)return;
  // Navegação: pega atualização online; offline usa o HTML salvo.
  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      try {const result=await fetch(req); if(result.ok){const cache=await caches.open(SHELL);await cache.put(new URL('./index.html',BASE),result.clone())}return result}
      catch {return (await caches.match(new URL('./index.html',BASE)))||Response.error()}
    })());
    return;
  }
  // EmuladorJS (incluindo .wasm) e ROMs: cache primeiro, rede somente na falta.
  const isROM=inside&&url.pathname.startsWith(new URL('./jogos/',BASE).pathname)&&/\.gba$/i.test(url.pathname);
  const name=cdn?ENGINE:isROM?ROMS:SHELL;
  event.respondWith((async()=>{
    const cache=await caches.open(name);
    const cached=await cache.match(req);
    if(cached)return cached;
    const response=await fetch(req);
    if(response.ok||response.type==='opaque'){
      try{await cache.put(req,response.clone())}catch(err){console.warn('[GBA SW] Sem espaço para cache',err)}
    }
    return response;
  })());
});
