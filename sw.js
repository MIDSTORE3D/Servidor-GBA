// GBA Android: SW de recuperação, sem interceptar recursos.
self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.registration.unregister()));
