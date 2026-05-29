"use client";

import { useEffect, useState } from "react";

// Modal mit klarer Schritt-fuer-Schritt-Anleitung fuer iOS und Android,
// und einem Install-Knopf fuer Chrome/Edge (via beforeinstallprompt).
// Geoeffnet via Event "vv-pwa-install" (z.B. von Buttons im UI).
export default function InstallHelp() {
  const [open, setOpen] = useState(false);
  const [deferred, setDeferred] = useState(null);
  const [platform, setPlatform] = useState("unknown");

  useEffect(() => {
    const ua = navigator.userAgent || "";
    const isIos = /iphone|ipad|ipod/i.test(ua);
    const isAndroid = /android/i.test(ua);
    setPlatform(isIos ? "ios" : isAndroid ? "android" : "desktop");

    const onPrompt = (e) => { e.preventDefault(); setDeferred(e); };
    const onOpen = () => setOpen(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("vv-pwa-install", onOpen);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("vv-pwa-install", onOpen);
    };
  }, []);

  async function doInstall() {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setOpen(false);
  }

  if (!open) return null;

  const inMessenger = typeof window !== "undefined" && window.location.pathname.startsWith("/messenger");

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={() => setOpen(false)}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 14, maxWidth: 480, width: "100%",
          maxHeight: "86vh", overflowY: "auto", padding: 18,
          fontFamily: "Arial, sans-serif", boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <h2 style={{ margin: 0, flex: 1, fontSize: 18 }}>📱 VibeVibo als App installieren</h2>
          <button onClick={() => setOpen(false)} aria-label="Schließen"
            style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#666" }}>×</button>
        </div>
        <p style={{ color: "#666", fontSize: 13, marginTop: 6 }}>Du kannst zwei eigene Apps zum Startbildschirm hinzufügen — wie zwei richtige Apps mit eigenem Icon.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8, marginTop: 8 }}>
          <div style={{ padding: 12, borderRadius: 10, background: "#fff5fb", border: "1px solid #ffd6e7" }}>
            <h3 style={{ margin: 0, color: "#c2185b", fontSize: 14 }}>🌟 Haupt-App</h3>
            <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>VibeVibo komplett (Profil, Wall, Fotos, Gruppen…)</div>
            <div style={{ fontSize: 11, color: "#888", marginTop: 6 }}>Adresse: <code>vibevibo.de</code></div>
          </div>
          <div style={{ padding: 12, borderRadius: 10, background: "#eaf3ff", border: "1px solid #cfdfff" }}>
            <h3 style={{ margin: 0, color: "#1f5fa8", fontSize: 14 }}>💬 Messenger</h3>
            <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>Nur Chats im ICQ/MSN-Stil — eigene App-Kachel.</div>
            <div style={{ fontSize: 11, color: "#888", marginTop: 6 }}>Adresse: <code>vibevibo.de/messenger</code></div>
          </div>
        </div>

        <h3 style={{ marginTop: 18, fontSize: 15 }}>
          {platform === "ios" ? "🍎 iPhone / iPad (Safari)" : platform === "android" ? "🤖 Android (Chrome)" : "💻 So geht's auf dem Handy"}
        </h3>

        {platform === "ios" ? (
          <ol style={{ paddingLeft: 20, lineHeight: 1.6, fontSize: 14 }}>
            <li>Öffne <strong>vibevibo.de</strong> in <strong>Safari</strong> (geht nicht in Chrome auf iOS!).</li>
            <li>Tippe unten auf das <strong>Teilen-Symbol</strong> (Quadrat mit Pfeil nach oben ⬆️).</li>
            <li>Scrolle runter und tippe auf <strong>„Zum Home-Bildschirm"</strong>.</li>
            <li>Bestätige mit <strong>„Hinzufügen"</strong> oben rechts.</li>
            <li>Für den <strong>Messenger</strong>: gleiche Schritte auf <strong>vibevibo.de/messenger</strong> wiederholen — du bekommst ein zweites Icon.</li>
          </ol>
        ) : platform === "android" ? (
          <>
            <ol style={{ paddingLeft: 20, lineHeight: 1.6, fontSize: 14 }}>
              <li>Öffne <strong>vibevibo.de</strong> (für die Haupt-App) bzw. <strong>vibevibo.de/messenger</strong> (für die Messenger-App) in <strong>Chrome</strong>.</li>
              <li>Tippe auf das Menü <strong>⋮</strong> oben rechts.</li>
              <li>Wähle <strong>„App installieren"</strong> oder <strong>„Zum Startbildschirm"</strong>.</li>
              <li>Bestätige mit <strong>„Installieren"</strong>.</li>
              <li>Für die zweite App: andere Adresse aufrufen und Schritte wiederholen.</li>
            </ol>
            {deferred && (
              <button onClick={doInstall}
                style={{ marginTop: 10, padding: "11px 16px", background: "#ff3e9d", color: "#fff", border: "none", borderRadius: 10, fontWeight: "bold", cursor: "pointer", width: "100%", fontSize: 14 }}>
                ⬇ Jetzt {inMessenger ? "Messenger-App" : "Haupt-App"} installieren
              </button>
            )}
          </>
        ) : (
          <ol style={{ paddingLeft: 20, lineHeight: 1.6, fontSize: 14 }}>
            <li>Öffne die Seite auf deinem <strong>Handy</strong> (iPhone Safari / Android Chrome).</li>
            <li>Folge dort der Anleitung — du kannst beide Apps separat hinzufügen.</li>
            <li>Auf dem Desktop: in Chrome/Edge oben rechts in der Adressleiste das ⬇-Symbol.</li>
          </ol>
        )}

        <div style={{ marginTop: 14, padding: 10, background: "#f6f6fa", borderRadius: 8, fontSize: 12, color: "#555", lineHeight: 1.5 }}>
          💡 <strong>Tipp:</strong> Die Messenger-App öffnet direkt den Chat im blauen ICQ-Look. Die Haupt-App ist VibeVibo komplett (Profil, Wall, Galerie, Gruppen).
        </div>
      </div>
    </div>
  );
}
