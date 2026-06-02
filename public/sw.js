// VibeVibo Service Worker
// - PWA-Cache (network-first, leichte Offline-Fallbacks)
// - Web Push: zeigt Lockscreen-Benachrichtigungen, Klick öffnet/fokussiert Chat.

const CACHE = "vibevibo-v3";

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

// ----- Web Push -----
// Differenziert je nach `kind`, damit Live/Chat/Gift/Nudge unterschiedlich
// auf dem Lockscreen wirken (Aufmerksamkeit, Vibrate, Aktionen, Verweilen).
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

  // Profile pro Notification-Typ
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
      actions: [
        { action: "open", title: "👋 Antworten" },
      ],
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
    body,
    icon,
    badge,
    tag,
    renotify: true,                  // jede neue Push reaktiviert die Anzeige
    vibrate: prof.vibrate,
    silent: !!data.silent,           // Lockscreen ohne Sound, wenn explizit gewünscht
    timestamp: data.at || Date.now(),
    requireInteraction: prof.requireInteraction,
    image: data.image || undefined,  // großes Hero-Bild auf Android
    data: {
      url,
      fromUsername: data.fromUsername || "",
      kind,
    },
    actions: prof.actions,
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      // Allen offenen Clients Bescheid geben — Sound spielen / Badge updaten
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

    // 1) Bereits offenes Fenster mit passendem Pfad → fokussieren
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
    // 2) Sonst irgendein Fenster fokussieren und Navigation übernehmen lassen
    for (const c of all) {
      try {
        await c.focus();
        c.postMessage({ type: "vv-notification-click", url: targetUrl });
        return;
      } catch {}
    }
    // 3) Sonst neues Fenster öffnen
    if (self.clients.openWindow) {
      await self.clients.openWindow(targetUrl);
    }
  })());
});

self.addEventListener("pushsubscriptionchange", (event) => {
  // Browser hat die Subscription rotiert – beim nächsten App-Start wird neu abonniert.
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) {
      try { c.postMessage({ type: "vv-push-resubscribe" }); } catch {}
    }
  })());
});
