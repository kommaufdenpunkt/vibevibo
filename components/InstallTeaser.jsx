"use client";

// Zeigt direkt auf der Landing-Seite eine geraete-spezifische Kurzanleitung
// fuer das Installieren der beiden PWAs (Haupt-App und Messenger).
// Erkennung via User-Agent + Standalone-Check + beforeinstallprompt-Event.

import { useEffect, useState } from "react";

function detectPlatform() {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  // iPadOS gibt sich seit iOS 13 als "Macintosh" aus -> Touchpunkte pruefen
  const isIPadOS =
    /Macintosh/.test(ua) && typeof document !== "undefined" &&
    "ontouchend" in document && navigator.maxTouchPoints > 1;
  if (/iPad|iPhone|iPod/.test(ua) || isIPadOS) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

export default function InstallTeaser() {
  const [platform, setPlatform] = useState("unknown");
  const [standalone, setStandalone] = useState(false);
  const [deferred, setDeferred] = useState(null);
  const [browser, setBrowser] = useState("");

  useEffect(() => {
    setPlatform(detectPlatform());
    setStandalone(isStandalone());
    const ua = navigator.userAgent || "";
    if (/CriOS|Chrome/.test(ua) && !/EdgA|EdgiOS/.test(ua)) setBrowser("chrome");
    else if (/FxiOS|Firefox/.test(ua)) setBrowser("firefox");
    else if (/EdgA|EdgiOS|Edg\//.test(ua)) setBrowser("edge");
    else if (/Safari/.test(ua) && !/Chrome|CriOS/.test(ua)) setBrowser("safari");
    else setBrowser("other");

    const onPrompt = (e) => { e.preventDefault(); setDeferred(e); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (standalone) {
    return (
      <div style={baseCard("#e7fff0", "#0d8a3f")}>
        ✅ Du nutzt VibeVibo bereits als App. Du kannst die <strong>Messenger-App</strong> separat dazuholen:{" "}
        <a href="/messenger" style={{ color: "#0d8a3f", fontWeight: "bold" }}>vibevibo.de/messenger</a>
        {" "}öffnen und im Browser „Zum Home-Bildschirm" wählen.
      </div>
    );
  }

  async function doInstall() {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  // iOS – nur Safari kann installieren
  if (platform === "ios") {
    const wrongBrowser = browser !== "safari";
    return (
      <div style={baseCard("#fff5fb", "#c2185b")}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 22 }}>🍎</span>
          <strong>iPhone / iPad — als App installieren</strong>
        </div>
        {wrongBrowser && (
          <div style={{ marginTop: 6, padding: 8, borderRadius: 8, background: "#fff3c2", color: "#7a5b00", fontSize: 12 }}>
            ⚠️ Auf iOS funktioniert das Installieren <strong>nur in Safari</strong>. Öffne diese Seite bitte in Safari.
          </div>
        )}
        <ol style={stepStyle}>
          <li>Unten/oben auf das <strong>Teilen-Symbol</strong> tippen ( <span style={{ display: "inline-block", padding: "0 5px", border: "1px solid #c2185b", borderRadius: 4 }}>⬆</span> )</li>
          <li>Etwas runterscrollen → <strong>„Zum Home-Bildschirm"</strong> antippen</li>
          <li>Mit <strong>„Hinzufügen"</strong> oben rechts bestätigen</li>
          <li>Für die <strong>Messenger-App</strong>: <code>vibevibo.de/messenger</code> aufrufen und Schritte wiederholen — bekommst ein zweites Icon</li>
        </ol>
      </div>
    );
  }

  // Android – Chrome/Edge zeigen i.d.R. beforeinstallprompt
  if (platform === "android") {
    return (
      <div style={baseCard("#eaf3ff", "#1f5fa8")}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 22 }}>🤖</span>
          <strong>Android — als App installieren</strong>
        </div>
        {deferred ? (
          <>
            <p style={{ fontSize: 13, color: "#333", margin: "8px 0" }}>
              Tipp einfach auf den Knopf — keine weiteren Klicks nötig:
            </p>
            <button onClick={doInstall} style={installBtnStyle}>
              ⬇ Jetzt installieren
            </button>
          </>
        ) : (
          <ol style={stepStyle}>
            <li>Oben rechts auf das Menü <strong>⋮</strong> tippen</li>
            <li><strong>„App installieren"</strong> oder „Zum Startbildschirm" auswählen</li>
            <li>Mit <strong>„Installieren"</strong> bestätigen</li>
          </ol>
        )}
        <div style={{ fontSize: 12, color: "#555", marginTop: 6 }}>
          Für die separate <strong>Messenger-App</strong>: <code>vibevibo.de/messenger</code> aufrufen und genauso vorgehen.
        </div>
      </div>
    );
  }

  // Desktop
  return (
    <div style={baseCard("#f6f6fa", "#444")}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 22 }}>💻</span>
        <strong>Desktop — als App ablegen</strong>
      </div>
      {deferred ? (
        <button onClick={doInstall} style={installBtnStyle}>
          ⬇ Jetzt installieren
        </button>
      ) : (
        <ol style={stepStyle}>
          <li>In <strong>Chrome/Edge</strong> oben rechts in der Adressleiste auf das <strong>Install-Symbol ⤓</strong></li>
          <li>Mit <strong>„Installieren"</strong> bestätigen — VibeVibo erscheint als App-Fenster</li>
          <li>Für den <strong>Messenger</strong>: <code>vibevibo.de/messenger</code> aufrufen und dasselbe wiederholen</li>
        </ol>
      )}
      <div style={{ fontSize: 12, color: "#666", marginTop: 6, fontStyle: "italic" }}>
        Tipp: Am Handy klappt es noch reibungsloser — Push-Benachrichtigungen tuten dann auch im Sperrbildschirm.
      </div>
    </div>
  );
}

function baseCard(bg, accent) {
  return {
    background: bg,
    border: `1.5px solid ${accent}33`,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    textAlign: "left",
    color: "#222",
    fontFamily: "Arial, sans-serif",
    boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
  };
}
const stepStyle = { paddingLeft: 20, margin: "8px 0 0", lineHeight: 1.55, fontSize: 13 };
const installBtnStyle = {
  marginTop: 10, padding: "10px 16px", background: "#ff3e9d", color: "#fff",
  border: "none", borderRadius: 10, fontWeight: "bold", cursor: "pointer", width: "100%", fontSize: 14,
};
