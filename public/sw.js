// Minimaler Service Worker - macht VibeVibo installierbar (PWA).
// Network-first, kein aggressives Caching (Daten sollen immer frisch sein).
const CACHE = "vibevibo-v1";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  // Nur GET-Requests behandeln, API immer durchlassen
  if (req.method !== "GET" || req.url.includes("/api/")) return;
  e.respondWith(
    fetch(req).catch(() => caches.match(req).then((r) => r || caches.match("/")))
  );
});
