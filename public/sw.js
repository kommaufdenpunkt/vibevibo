// VibeVibo Service Worker — v5
// - App-Shell-Caching (offline-fähige PWA für /, /karte, /messenger, /live)
// - Network-first für HTML mit cache-fallback
// - Cache-first für statische Assets (Icons, Fonts, CDN)
// - Update-Toast: Client wird informiert wenn neue SW-Version aktiv
// - Web Push: bestehende Lockscreen-Notifications + Click-Routing

const CACHE_VERSION = "vibevibo-v5";
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const STATIC_CACHE   = `${CACHE_VERSION}-static`;

// Diese Routes werden beim Install vorgecacht, damit die App auch ohne Netz startet.
const APP_SHELL = [
  "/",
  "/karte",
  "/messenger",
  "/live",
  "/profile",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL).catch(() => {})) // einzelne 404s nicht abbrechen
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    // Alte Caches löschen (alles was nicht zu dieser VERSION gehört)
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k)));
    await self.clients.claim();
    // Allen Clients sagen: neue Version aktiv, ggf. Reload anbieten
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of clients) {
      try { c.postMessage({ type: "vv-sw-updated", version: CACHE_VERSION }); } catch {}
    }
  })());
});

// Sofort aktivieren wenn vom Client gefragt
self.addEventListener("message", (event) => {
  if (event.data?.type === "vv-skip-waiting") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Cross-origin (Karten-Tiles, CDNs etc.): nicht cachen, sondern durchreichen.
  if (url.origin !== self.location.origin) return;

  // API + Auth + Stream: NIE cachen, immer Live abfragen
  if (url.pathname.startsWith("/api/")) return;

  // Statische Assets: Cache-first, dann Network
  const isStatic = /\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|otf|css|js)$/i.test(url.pathname)
    || url.pathname === "/sw.js"
    || url.pathname.startsWith("/_next/static/");
  if (isStatic) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // HTML/Pages: Network-first mit Cache-Fallback, Cache wird im Hintergrund aktualisiert.
  if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirstWithFallback(req));
    return;
  }

  // Manifests: stale-while-revalidate
  if (url.pathname.endsWith(".webmanifest") || url.pathname.endsWith("manifest.json")) {
    event.respondWith(staleWhileRevalidate(req, STATIC_CACHE));
    return;
  }
});

async function cacheFirst(req) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const resp = await fetch(req);
    if (resp.ok) cache.put(req, resp.clone());
    return resp;
  } catch {
    // Wenn das Asset offline auch nicht da ist: leeres Bild für Bilder, sonst raw error
    return new Response("", { status: 504, statusText: "offline" });
  }
}

async function networkFirstWithFallback(req) {
  const cache = await caches.open(APP_SHELL_CACHE);
  try {
    const resp = await fetch(req);
    if (resp.ok) cache.put(req, resp.clone());
    return resp;
  } catch {
    const hit = await cache.match(req) || await cache.match("/");
    if (hit) return hit;
    return new Response(
      "<!doctype html><html lang=de><meta charset=utf-8><title>Offline</title>" +
      "<body style=\"font-family:system-ui;text-align:center;padding:60px 20px;background:#0a0420;color:#fff\">" +
      "<h1 style=\"font-size:48px;margin:0\">📡</h1><h2>Keine Verbindung</h2>" +
      "<p>VibeVibo ist gerade nicht erreichbar.</p>" +
      "<button onclick=\"location.reload()\" style=\"padding:12px 24px;border:none;border-radius:8px;background:#ff3e9d;color:#fff;font-weight:700;font-size:16px;cursor:pointer\">Erneut versuchen</button>" +
      "</body></html>",
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const fetchPromise = fetch(req).then((resp) => {
    if (resp.ok) cache.put(req, resp.clone());
    return resp;
  }).catch(() => hit);
  return hit || fetchPromise;
}

// ============================================================
// Web Push: Lockscreen-Notifications je nach Typ + Klick-Routing
// ============================================================
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    try { data = { body: event.data.text() }; } catch {}
  }

  const title = data.title || "VibeVibo";
  const body = data.body || "Neue Nachricht";
  const url = data.url || "/messenger";
  const tag = data.tag || "vv-msg";
  const icon = data.icon || "/icon-192.png";
  const badge = data.badge || "/icon-192.png";
  const kind = data.kind || "message";

  const PROFILES = {
    live_started: {
      vibrate: [200, 80, 200, 80, 400],
      requireInteraction: true,
      silent: false,
      actions: [
        { action: "open",  title: "🎥 Anschauen" },
        { action: "close", title: "Später" },
      ],
    },
    nudge: {
      vibrate: [120, 60, 120, 60, 120, 60, 200],
      requireInteraction: false,
      silent: false,
      actions: [{ action: "open", title: "👋 Antworten" }],
    },
    gift: {
      vibrate: [60, 40, 60, 40, 200],
      requireInteraction: false,
      silent: false,
      actions: [
        { action: "open",  title: "🎁 Ansehen" },
        { action: "close", title: "Schließen" },
      ],
    },
    message: {
      vibrate: [80, 40, 80],
      requireInteraction: false,
      silent: false,
      actions: [
        { action: "open",  title: "💬 Öffnen" },
        { action: "close", title: "Schließen" },
      ],
    },
  };
  const prof = PROFILES[kind] || PROFILES.message;

  const options = {
    body, icon, badge, tag,
    renotify: true,
    vibrate: prof.vibrate,
    silent: !!data.silent,
    timestamp: data.at || Date.now(),
    requireInteraction: prof.requireInteraction,
    image: data.image || undefined,
    data: { url, fromUsername: data.fromUsername || "", kind },
    actions: prof.actions,
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      return self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((all) => {
        for (const c of all) {
          try { c.postMessage({ type: "vv-push", payload: data }); } catch {}
        }
      });
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "close") return;

  const targetUrl = (event.notification.data && event.notification.data.url) || "/messenger";

  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) {
      try {
        const u = new URL(c.url);
        if (u.pathname === targetUrl || u.pathname.startsWith(targetUrl)) {
          await c.focus();
          c.postMessage({ type: "vv-notification-click", url: targetUrl });
          return;
        }
      } catch {}
    }
    for (const c of all) {
      try {
        await c.focus();
        c.postMessage({ type: "vv-notification-click", url: targetUrl });
        return;
      } catch {}
    }
    if (self.clients.openWindow) {
      await self.clients.openWindow(targetUrl);
    }
  })());
});

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) {
      try { c.postMessage({ type: "vv-push-resubscribe" }); } catch {}
    }
  })());
});
