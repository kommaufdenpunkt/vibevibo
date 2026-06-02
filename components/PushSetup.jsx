"use client";

// Push-Setup: dezenter Banner + Button, mit dem User Lockscreen-Benachrichtigungen
// aktivieren kann. Registriert sich beim Service Worker und schickt die
// Subscription an /api/push/subscribe. Beim Logout wird die Subscription gelöst.

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useMe } from "@/lib/useMe";
import { api } from "@/lib/api";

const LS_KEY = "vv:push:dismissed";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

export default function PushSetup() {
  const { me } = useMe();
  const pathname = usePathname();
  // In der Messenger-App sitzt unten eine Tab-Bar – darüber positionieren statt drauflegen
  const inMessenger = !!pathname && pathname.startsWith("/messenger");
  const bottomOffset = inMessenger ? 78 : 12;

  const [perm, setPerm] = useState("default");
  const [subscribed, setSubscribed] = useState(false);
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dismissed, setDismissed] = useState(true); // default zu, bis useEffect prüft
  const [enabledOnServer, setEnabledOnServer] = useState(false);

  // Initialer Check: Browser-Support, Permission, Subscription
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(ok);
    setDismissed(localStorage.getItem(LS_KEY) === "1");
    if (!ok) return;
    setPerm(Notification.permission);

    // Service Worker registrieren (idempotent) – damit "/sw.js" sicher aktiv ist.
    navigator.serviceWorker.register("/sw.js").catch(() => {});

    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setSubscribed(!!sub);
      } catch {}
      try {
        const r = await api.pushKey();
        setEnabledOnServer(!!(r?.enabled && r?.publicKey));
      } catch {}
    })();
  }, []);

  // Resubscribe-Nachricht vom SW (pushsubscriptionchange)
  useEffect(() => {
    if (!supported) return;
    const onMsg = (e) => {
      if (e?.data?.type === "vv-push-resubscribe") {
        enable().catch(() => {});
      }
    };
    navigator.serviceWorker?.addEventListener?.("message", onMsg);
    return () => navigator.serviceWorker?.removeEventListener?.("message", onMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported]);

  // Bei Logout: lokales Abo lösen (Server-Seite weiß sonst nicht, dass User weg ist).
  useEffect(() => {
    if (me || !supported) return;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await api.pushUnsubscribe(sub.endpoint).catch(() => {});
          await sub.unsubscribe().catch(() => {});
          setSubscribed(false);
        }
      } catch {}
    })();
  }, [me, supported]);

  const enable = useCallback(async () => {
    setError("");
    setBusy(true);
    try {
      if (!("Notification" in window)) throw new Error("Browser unterstützt keine Benachrichtigungen.");
      const permission = await Notification.requestPermission();
      setPerm(permission);
      if (permission !== "granted") {
        throw new Error("Benachrichtigungen wurden nicht erlaubt.");
      }

      const { publicKey, enabled } = await api.pushKey();
      if (!enabled || !publicKey) throw new Error("Server-Schlüssel fehlt – bitte später erneut versuchen.");

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }
      await api.pushSubscribe(sub.toJSON());
      setSubscribed(true);
      try { localStorage.removeItem(LS_KEY); } catch {}
      setDismissed(false);
    } catch (e) {
      setError(e?.message || "Fehler beim Aktivieren.");
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setError("");
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api.pushUnsubscribe(sub.endpoint).catch(() => {});
        await sub.unsubscribe().catch(() => {});
      }
      setSubscribed(false);
    } catch (e) {
      setError(e?.message || "Fehler beim Deaktivieren.");
    } finally {
      setBusy(false);
    }
  }, []);

  function hide() {
    try { localStorage.setItem(LS_KEY, "1"); } catch {}
    setDismissed(true);
  }

  // Globaler Trigger: andere Komponenten können `window.dispatchEvent(new Event("vv-push-open"))` rufen
  useEffect(() => {
    const open = () => setDismissed(false);
    window.addEventListener("vv-push-open", open);
    return () => window.removeEventListener("vv-push-open", open);
  }, []);

  if (!me || !supported) return null;
  // User hat Permission abgelehnt → nie wieder zeigen (sonst nervt's)
  if (perm === "denied") return null;
  // Schon aktiv abonniert → zeigt nur Status-Pille (siehe unten)
  if (dismissed && subscribed) return null;
  // User hat manuell weggeklickt → nicht wieder anzeigen
  if (dismissed && !subscribed) return null;
  if (!enabledOnServer && !subscribed) return null;

  // Wenn bereits abonniert: kleiner Status-Pille (zum Deaktivieren)
  if (subscribed) {
    return (
      <div
        style={{
          position: "fixed", right: 12, bottom: `calc(${bottomOffset}px + env(safe-area-inset-bottom, 0px))`, zIndex: 110,
          background: "#fff", borderRadius: 999, padding: "8px 12px",
          boxShadow: "0 6px 18px rgba(0,0,0,0.18)", fontFamily: "Arial, sans-serif",
          fontSize: 12, display: "flex", alignItems: "center", gap: 8, border: "1px solid #eee",
        }}
      >
        <span style={{ color: "#11a047" }}>🔔</span>
        <span style={{ color: "#333" }}>Benachrichtigungen aktiv</span>
        <button
          onClick={async () => {
            try { await api.pushTest(); }
            catch (e) { setError(e?.message || "Test fehlgeschlagen"); }
          }}
          style={{ background: "none", border: "none", color: "#1f5fa8", cursor: "pointer", fontSize: 12, padding: 0 }}
          aria-label="Test-Benachrichtigung senden"
          title="Sperr dein Handy, dann tippe drauf — Push muss als Banner aufploppen"
        >
          📲 testen
        </button>
        <button
          onClick={disable}
          disabled={busy}
          style={{ background: "none", border: "none", color: "#a00", cursor: "pointer", fontSize: 12, padding: 0 }}
          aria-label="Benachrichtigungen ausschalten"
        >
          ausschalten
        </button>
        <button
          onClick={hide}
          style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 16, padding: 0, marginLeft: 2 }}
          aria-label="Hinweis ausblenden"
        >×</button>
      </div>
    );
  }

  // Banner zum Aktivieren
  return (
    <div
      role="region"
      aria-label="Benachrichtigungen aktivieren"
      style={{
        position: "fixed", left: 12, right: 12, bottom: `calc(${bottomOffset}px + env(safe-area-inset-bottom, 0px))`, zIndex: 110, maxWidth: 460, margin: "0 auto",
        background: "linear-gradient(135deg, #ff3e9d 0%, #b91e7c 100%)", color: "#fff",
        borderRadius: 14, padding: 14, boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ fontSize: 24 }}>🔔</div>
        <div style={{ flex: 1, fontSize: 14, lineHeight: 1.35 }}>
          <strong>Sperrbildschirm-Benachrichtigungen</strong>
          <div style={{ opacity: 0.95, fontSize: 12, marginTop: 2 }}>
            Sei sofort dabei, wenn dir jemand schreibt – auch wenn VibeVibo geschlossen ist.
            {!isStandalone() ? " (Am besten als App zum Startbildschirm hinzufügen, damit's auch im Standby tutet.)" : ""}
          </div>
        </div>
        <button
          onClick={hide}
          aria-label="später"
          style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 12 }}
        >später</button>
      </div>
      {error && <div style={{ marginTop: 8, background: "rgba(0,0,0,0.25)", padding: 8, borderRadius: 8, fontSize: 12 }}>{error}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "flex-end" }}>
        <button
          onClick={enable}
          disabled={busy || perm === "denied"}
          style={{
            background: "#fff", color: "#b91e7c", border: "none", borderRadius: 10,
            padding: "10px 14px", fontWeight: "bold", fontSize: 13,
            cursor: busy || perm === "denied" ? "not-allowed" : "pointer",
            opacity: busy || perm === "denied" ? 0.6 : 1,
          }}
        >
          {busy ? "Aktiviere…" : perm === "denied" ? "Im Browser blockiert" : "🔔 Aktivieren"}
        </button>
      </div>
      {perm === "denied" && (
        <div style={{ marginTop: 8, fontSize: 11, opacity: 0.95 }}>
          Du hast Benachrichtigungen für diese Seite blockiert. Öffne die Seiteneinstellungen im Browser und erlaube es dort.
        </div>
      )}
    </div>
  );
}
