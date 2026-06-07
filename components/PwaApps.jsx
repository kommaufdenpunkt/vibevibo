"use client";

// 📲 PWA-Install-Hub für die Startseite: jede VibeVibo-App als eigenes Icon.
// Community (Hauptapp) installiert direkt per beforeinstallprompt; die anderen
// PWAs (Messages, Tamagotchi/VIBO, 3D-Karte) haben eigene Scopes — dort wird
// auf der jeweiligen Seite installiert, darum führen die Kacheln dorthin.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const APPS = [
  { key: "community", emoji: "🎨", name: "Community", sub: "Profile · Pinnwand · Buschfunk", color: "#ec4899", action: "install" },
  { key: "messages",  emoji: "✉️", name: "Messages",  sub: "Chat · ICQ-Style",              color: "#a855f7", href: "/messenger" },
  { key: "vibo",      emoji: "🥚", name: "Tamagotchi", sub: "Dein VIBO-Pet",                 color: "#f59e0b", href: "/vibo" },
  { key: "karte",     emoji: "🗺️", name: "3D-Karte",  sub: "Echte Welt · Items sammeln",    color: "#06b6d4", href: "/karte" },
];

export default function PwaApps() {
  const router = useRouter();
  const [prompt, setPrompt] = useState(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent || "";
    setIos(/iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua));
    const inst = window.matchMedia?.("(display-mode: standalone)").matches
      || window.navigator?.standalone === true;
    setInstalled(inst);
    const onPrompt = (e) => { e.preventDefault(); setPrompt(e); };
    const onInstalled = () => setPrompt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function clickApp(app) {
    if (app.action === "install") {
      if (prompt) {
        try { await prompt.prompt(); await prompt.userChoice; } catch {}
        finally { setPrompt(null); }
      } else { setHelp(app); }
    } else if (app.href) {
      router.push(app.href);
    }
  }

  return (
    <div className="vv-pwaapps">
      <div className="vv-pwaapps-head">
        <span className="vv-pwaapps-head-emoji">📲</span>
        <div>
          <div className="vv-pwaapps-title">APPS INSTALLIEREN</div>
          <div className="vv-pwaapps-sub">Hol dir jede VibeVibo-App als eigenes Icon auf den Startbildschirm</div>
        </div>
      </div>
      <div className="vv-pwaapps-grid">
        {APPS.map((app) => (
          <button key={app.key} type="button" className="vv-pwaapps-tile"
            style={{ "--vv-app-color": app.color }}
            onClick={() => clickApp(app)}>
            <span className="vv-pwaapps-tile-emoji">{app.emoji}</span>
            <span className="vv-pwaapps-tile-name">{app.name}</span>
            <span className="vv-pwaapps-tile-sub">{app.sub}</span>
            <span className="vv-pwaapps-tile-cta">
              {app.action === "install"
                ? (installed ? "✅ installiert" : prompt ? "📲 1-Klick" : "📥 installieren")
                : "→ öffnen & installieren"}
            </span>
          </button>
        ))}
      </div>

      {help && (
        <div className="vv-pwaapps-modal" onClick={() => setHelp(null)}>
          <div className="vv-pwaapps-modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 38, textAlign: "center" }}>{help.emoji}</div>
            <h3 style={{ margin: "4px 0 2px", textAlign: "center" }}>{help.name} installieren</h3>
            <div style={{ fontSize: 12, opacity: 0.7, textAlign: "center", marginBottom: 12 }}>
              {ios ? "Mit Safari — geht nur in Safari." : "Über das Browser-Menü"}
            </div>
            <ol style={{ paddingLeft: 22, fontSize: 13, lineHeight: 1.55, margin: 0 }}>
              {ios ? (
                <>
                  <li>Unten in Safari auf <b>📤 Teilen</b> tippen.</li>
                  <li>Auf <b>„Zum Home-Bildschirm"</b> tippen.</li>
                  <li>Rechts oben mit <b>„Hinzufügen"</b> bestätigen.</li>
                </>
              ) : (
                <>
                  <li>Oben rechts auf das <b>⋮ Menü</b> tippen.</li>
                  <li><b>„App installieren"</b> wählen.</li>
                  <li>Bestätigen — fertig.</li>
                </>
              )}
            </ol>
            <button type="button" onClick={() => setHelp(null)} className="vv-pwaapps-modal-ok">
              Verstanden 👌
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
