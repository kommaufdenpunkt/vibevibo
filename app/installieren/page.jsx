"use client";

import { useEffect, useState } from "react";

function detectPlatform() {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Edg/.test(ua)) return "edge";
  if (/Chrome/.test(ua)) return "chrome";
  if (/Firefox/.test(ua)) return "firefox";
  if (/Safari/.test(ua)) return "safari";
  return "desktop";
}

export default function InstallierenPage() {
  const [platform, setPlatform] = useState("unknown");
  const [installed, setInstalled] = useState(false);
  const [deferred, setDeferred] = useState(null);

  useEffect(() => {
    setPlatform(detectPlatform());
    if (window.matchMedia?.("(display-mode: standalone)").matches) setInstalled(true);
    if (window.navigator.standalone) setInstalled(true);

    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  async function tryInstall() {
    if (!deferred) return;
    deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice?.outcome === "accepted") setInstalled(true);
    setDeferred(null);
  }

  return (
    <div style={{ padding: 16, maxWidth: 640, margin: "0 auto" }}>
      <div style={{
        background: "linear-gradient(135deg, #ec4899, #8b5cf6, #06b6d4)",
        color: "#fff",
        padding: "22px 18px",
        borderRadius: 16,
        marginBottom: 18,
        textAlign: "center",
        boxShadow: "0 6px 20px rgba(139,92,246,0.35)",
      }}>
        <div style={{ fontSize: 42, marginBottom: 6 }}>📲</div>
        <div style={{ fontSize: 24, fontWeight: 900 }}>VibeVibo installieren</div>
        <div style={{ fontSize: 13, marginTop: 6, opacity: 0.95 }}>
          Zum Homebildschirm hinzufuegen — wie eine echte App!
        </div>
      </div>

      {installed && (
        <div style={{
          padding: 14, marginBottom: 16,
          background: "linear-gradient(135deg, #d1fae5, #a7f3d0)",
          border: "2px solid #10b981",
          borderRadius: 12, fontSize: 14, color: "#065f46",
          textAlign: "center", fontWeight: 700,
        }}>
          ✅ Du nutzt VibeVibo schon als App. Hammer!
        </div>
      )}

      {!installed && deferred && (
        <div style={{
          padding: 14, marginBottom: 16,
          background: "linear-gradient(135deg, #fef3c7, #fde68a)",
          border: "2px solid #f59e0b", borderRadius: 12,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ fontSize: 26 }}>⚡</span>
          <div style={{ flex: 1, fontSize: 13, color: "#92400e" }}>
            <b>Schnell-Install verfuegbar!</b><br/>Dein Browser kann VibeVibo jetzt direkt installieren.
          </div>
          <button onClick={tryInstall} className="vv-btn-big vv-btn-big-orange" style={{ padding: "10px 16px", fontSize: 14 }}>
            Installieren
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <PlatformBox
          active={platform === "ios"}
          title="🍎 iPhone / iPad (Safari)"
          steps={[
            "Tippe unten auf das ⬆ Teilen-Symbol",
            "Scroll und tippe „Zum Home-Bildschirm“",
            "Bestätige oben rechts mit „Hinzufügen“",
          ]}
        />
        <PlatformBox
          active={platform === "android" || platform === "chrome"}
          title="🤖 Android (Chrome)"
          steps={[
            "Tippe rechts oben auf ⋮ (Menü)",
            "Wähle „Zum Startbildschirm hinzufügen“ oder „App installieren“",
            "Bestätige mit „Installieren“",
          ]}
        />
        <PlatformBox
          active={platform === "edge"}
          title="🌐 Edge / Chrome (Desktop)"
          steps={[
            "Klick in der Adressleiste auf das ⊕ Install-Icon (rechts neben URL)",
            "Wähle „App installieren“",
            "VibeVibo öffnet sich als eigenständiges Fenster",
          ]}
        />
        <PlatformBox
          active={platform === "firefox"}
          title="🦊 Firefox"
          steps={[
            "Firefox unterstützt PWA-Install nur eingeschränkt",
            "Tipp: Lesezeichen auf den Homescreen ziehen funktioniert auf Android",
            "Auf Desktop: in Chrome/Edge öffnen für volle Erfahrung",
          ]}
        />
        <PlatformBox
          active={platform === "safari" || platform === "desktop"}
          title="💻 Mac Safari"
          steps={[
            "Datei → „Zum Dock hinzufügen…“",
            "Bestätige den Namen",
            "VibeVibo erscheint im Dock und startet als App-Fenster",
          ]}
        />
      </div>

      <div style={{
        marginTop: 18,
        padding: 14,
        background: "linear-gradient(135deg, #fdf2f8, #fce7f3)",
        borderRadius: 12,
        border: "1px solid #fbcfe8",
        fontSize: 12,
        color: "#831843",
      }}>
        <b>Warum installieren?</b>
        <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
          <li>📲 Eigenes App-Icon auf dem Homescreen</li>
          <li>⚡ Schnellerer Start, weniger Browser-Buttons</li>
          <li>🔔 Push-Benachrichtigungen für Nachrichten und VIBO-Hunger</li>
          <li>💾 Funktioniert auch offline (Cache)</li>
        </ul>
      </div>
    </div>
  );
}

function PlatformBox({ active, title, steps }) {
  return (
    <div style={{
      background: "#fff",
      border: active ? "2px solid #ec4899" : "1px solid #f0e7f5",
      borderRadius: 12,
      padding: 14,
      boxShadow: active ? "0 4px 14px rgba(236,72,153,0.2)" : "0 2px 6px rgba(0,0,0,0.04)",
    }}>
      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8, color: active ? "#831843" : "#1c1c1e" }}>
        {title} {active && <span style={{ fontSize: 11, background: "#fce7f3", color: "#831843", padding: "2px 8px", borderRadius: 999, marginLeft: 6 }}>Du bist hier</span>}
      </div>
      <ol style={{ margin: 0, paddingLeft: 22, fontSize: 13, color: "#3f3f46", lineHeight: 1.6 }}>
        {steps.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
    </div>
  );
}
