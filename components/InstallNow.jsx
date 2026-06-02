"use client";

// Großer 1-Klick-Install-Button mit beforeinstallprompt-Event.
// Auf Chrome/Edge/Brave: zeigt direkten Install-Dialog (1 Klick → installiert).
// Auf iOS Safari: zeigt prominente Schritt-für-Schritt-Anleitung
// (kein nativer Install-API verfügbar).
// Wird im /live, /karte, /messenger usw. eingesetzt.

import { useEffect, useState } from "react";

export default function InstallNow({
  appName = "VV Live",
  appEmoji = "🎥",
  appColor = "#ec4899",
}) {
  const [installed, setInstalled] = useState(false);
  const [prompt, setPrompt] = useState(null);     // beforeinstallprompt Event
  const [ios, setIos] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent || "";
    setIos(/iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua));
    const inst = window.matchMedia?.("(display-mode: standalone)").matches
      || window.navigator?.standalone === true;
    setInstalled(inst);

    const onPrompt = (e) => {
      e.preventDefault();
      setPrompt(e);
    };
    const onInstalled = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (prompt) {
      setBusy(true);
      try {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice?.outcome === "accepted") setInstalled(true);
      } catch {}
      finally { setBusy(false); setPrompt(null); }
    } else if (ios) {
      setShowIosHelp(true);
    } else {
      // Fallback: irgend ein anderer Browser ohne Install-API
      setShowIosHelp(true);
    }
  }

  if (installed) {
    return (
      <div style={{
        background: "linear-gradient(135deg, #22c55e22, #22c55e11)",
        border: "2px solid #22c55e55",
        borderRadius: 14, padding: "12px 14px",
        display: "flex", alignItems: "center", gap: 10, marginBottom: 12,
        color: "var(--vv-text,#1c1c1e)",
      }}>
        <span style={{ fontSize: 28 }}>✅</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>{appName} ist installiert</div>
          <div style={{ fontSize: 11, color: "var(--vv-muted,#666)" }}>
            Du nutzt {appName} grade als App.
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <button type="button" onClick={install} disabled={busy}
        style={{
          width: "100%", padding: "14px 16px", marginBottom: 12,
          background: `linear-gradient(135deg, ${appColor}, #831843)`,
          border: "none", borderRadius: 14, color: "#fff",
          fontSize: 16, fontWeight: 800, cursor: "pointer",
          boxShadow: `0 8px 20px ${appColor}55`,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          fontFamily: "inherit",
        }}>
        <span style={{ fontSize: 26 }}>{appEmoji}</span>
        <span style={{ flex: 1, textAlign: "left", lineHeight: 1.2 }}>
          <div>{appName} als App installieren</div>
          <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.85 }}>
            {prompt ? "Mit einem Tap — eigenes Icon, kein Browser-Krempel"
              : ios ? "iPhone-Anleitung anzeigen"
              : "Installations-Anleitung anzeigen"}
          </div>
        </span>
        <span style={{ fontSize: 22 }}>{prompt ? "📲" : ios ? "📤" : "📥"}</span>
      </button>

      {showIosHelp && (
        <div onClick={() => setShowIosHelp(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            maxWidth: 360, width: "100%", background: "var(--vv-card,#fff)",
            color: "var(--vv-text,#1c1c1e)", borderRadius: 16, padding: 18,
            boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
          }}>
            <div style={{ fontSize: 38, textAlign: "center", marginBottom: 6 }}>{appEmoji}</div>
            <h3 style={{ margin: "0 0 4px", textAlign: "center" }}>{appName} installieren</h3>
            <div style={{ fontSize: 12, color: "var(--vv-muted,#666)", textAlign: "center", marginBottom: 14 }}>
              {ios ? "Mit Safari auf iPhone/iPad — funktioniert nur in Safari."
                   : "Browser-Menü öffnen → „App installieren"}
            </div>
            <ol style={{ paddingLeft: 22, fontSize: 13, lineHeight: 1.55, margin: 0 }}>
              {ios ? (
                <>
                  <li>Tippe unten in der Safari-Leiste auf <b>📤 Teilen</b> (Quadrat mit Pfeil).</li>
                  <li>Scrolle in der Liste runter, tippe auf <b>„Zum Home-Bildschirm"</b>.</li>
                  <li>Bestätige rechts oben mit <b>„Hinzufügen"</b>.</li>
                  <li>Schließe Safari — das neue {appEmoji} {appName}-Icon ist jetzt auf deinem Bildschirm.</li>
                </>
              ) : (
                <>
                  <li>Tippe oben rechts auf das <b>⋮ Menü</b>.</li>
                  <li>Wähle <b>„App installieren"</b> oder <b>„Zum Startbildschirm"</b>.</li>
                  <li>Bestätige.</li>
                  <li>Das neue {appEmoji} {appName}-Icon ist auf deinem Bildschirm.</li>
                </>
              )}
            </ol>
            <button type="button" onClick={() => setShowIosHelp(false)}
              style={{
                marginTop: 16, width: "100%", padding: 10,
                background: appColor, color: "#fff", border: "none",
                borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}>Verstanden 👌</button>
          </div>
        </div>
      )}
    </>
  );
}
