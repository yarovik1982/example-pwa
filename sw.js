const CACHE_NAME = "example-pwa-v1";
const PRECACHE_URLS = [
   "index.html",
   "manifest.json",
   "icon-192.png",
   "icon-512.png",
   "hero.png",
];

self.addEventListener("install", event => {
   event.waitUntil(
      (async () => {
         const cache = await caches.open(CACHE_NAME);
         await cache.addAll(PRECACHE_URLS);
         await self.skipWaiting();
      })()
   );
});

self.addEventListener("activate", event => {
   event.waitUntil(
      (async () => {
         const keys = await caches.keys();
         await Promise.all(
            keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
         );
         await self.clients.claim();
      })()
   );
});

self.addEventListener("fetch", event => {
   if (event.request.method !== "GET") return;

   if (event.request.mode === "navigate") {
      event.respondWith(
         (async () => {
            try {
               const response = await fetch(event.request);
               if (response.ok) {
                  const cache = await caches.open(CACHE_NAME);
                  cache.put("index.html", response.clone());
               }
               return response;
            } catch {
               const cache = await caches.open(CACHE_NAME);
               return (
                  (await cache.match("index.html")) ||
                  new Response("Offline", {
                     status: 503,
                     headers: { "Content-Type": "text/plain; charset=utf-8" },
                  })
               );
            }
         })()
      );
      return;
   }

   event.respondWith(
      (async () => {
         const cache = await caches.open(CACHE_NAME);
         const cached = await cache.match(event.request);
         if (cached) return cached;

         try {
            const response = await fetch(event.request);
            const url = new URL(event.request.url);

            if (response.ok && url.origin === self.location.origin) {
               cache.put(event.request, response.clone());
            }

            return response;
         } catch {
            return (
               cached ||
               new Response("Offline", {
                  status: 503,
                  headers: { "Content-Type": "text/plain; charset=utf-8" },
               })
            );
         }
      })()
   );
});
