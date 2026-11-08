/* Same-origin image cache for repeat visits; published data and originals are never changed. */
const CACHE_NAME = 'kvm-guide-images-v1';
const MAX_ENTRIES = 180;
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('kvm-guide-images-') && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.destination !== 'image') return;
  const url = new URL(request.url);
  const scopePath = new URL(self.registration.scope).pathname;
  if (url.origin !== self.location.origin || !url.pathname.startsWith(scopePath + 'img/')) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const saved = await cache.match(request);
    if (saved) return saved;
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      event.waitUntil((async () => {
        await cache.put(request, response.clone());
        const entries = await cache.keys();
        if (entries.length > MAX_ENTRIES) {
          await Promise.all(entries.slice(0, entries.length - MAX_ENTRIES).map(item => cache.delete(item)));
        }
      })().catch(() => {}));
    }
    return response;
  })());
});
