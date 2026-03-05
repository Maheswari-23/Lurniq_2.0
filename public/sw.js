// Lurniq Service Worker — DISABLED
// This stub immediately clears all caches and unregisters itself.
// Offline caching is disabled so that new deployments are always visible.

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
            .then(() => self.registration.unregister())
    );
    self.clients.claim();
});
