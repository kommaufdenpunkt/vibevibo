"use client";

// PWA-Erklärung mit automatischer Plattform/Browser-Erkennung.
// Zeigt nur die für DAS aktuelle Gerät passende Anleitung — keine Tabs.
// Wenn Erkennung danebenliegt, kann der User unten auf „andere Anleitung anzeigen" tappen.

import { useEffect, useState } from "react";
import HelpCard from "./HelpCard";

function detectPlatform() {
  if (typeof window === "undefined") return { id: "unknown" };
  const ua = navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isMac = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1; // iPadOS „Mac-Mode"
  const ios = isIOS || isMac;
  const android = /Android/.test(ua);
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches
    || window.navigator?.standalone === true;
  if (ios) {
    if (/CriOS|FxiOS|EdgiOS|YaBrowser/.test(ua)) return { id: "ios-other", standalone };
    return { id: "ios-safari", standalone };
  }
  if (android) {
    if (/SamsungBrowser/.test(ua)) return { id: "android-samsung", standalone };
    if (/Firefox|FxiOS/.test(ua)) return { id: "android-firefox", standalone };
    return { id: "android-chrome", standalone };
  }
  // Desktop
  if (/Edg\//.test(ua)) return { id: "desktop-edge", standalone };
  if (/Firefox/.test(ua)) return { id: "desktop-firefox", standalone };
  if (/Safari/.test(ua) && !/Chrome/.test(ua)) return { id: "desktop-safari", standalone };
  return { id: "desktop-chrome", standalone };
}

const STEPS = {
  "ios-safari": {
    label: "🍎 iPhone / iPad — Safari",
    color: "#0ea5e9",
    intro: "Auf deinem iPhone/iPad geht das in Safari mit 3 Tipps:",
    list: [
      <>Tippe unten in der Leiste auf <b>📤 Teilen</b> (Quadrat mit Pfeil nach oben).</>,
      <>Scrolle nach unten und tippe auf <b>„Zum Home-Bildschirm"</b>.</>,
      <>Bestätige rechts oben mit <b>„Hinzufügen"</b> — fertig!</>,
    ],
  },
  "ios-other": {
    label: "🍎 iPhone / iPad — falscher Browser",
    color: "#f59e0b",
    intro: "Du benutzt grade Chrome/Firefox/Edge auf iPhone. Apple erlaubt die App-Installation NUR über Safari.",
    list: [
      <>Schließe diesen Browser.</>,
      <>Öffne <b>Safari</b> und gehe wieder auf VibeVibo.</>,
      <>Dann: 📤 Teilen → „Zum Home-Bildschirm" → „Hinzufügen".</>,
    ],
  },
  "android-chrome": {
    label: "🤖 Android — Chrome / Edge / Brave",
    color: "#22c55e",
    intro: "Mit Chrome (oder Edge/Brave) auf Android sind das nur 3 Tipps:",
    list: [
      <>Tippe oben rechts auf das <b>⋮ Menü</b> (drei Punkte).</>,
      <>Wähle <b>„App installieren"</b> (oder „Zum Startbildschirm hinzufügen").</>,
      <>Bestätige im Dialog — fertig!</>,
    ],
    tip: 'Tipp: Wenn beim Öffnen ein „Installieren"-Vorschlag erscheint, kannst du direkt darauf tippen.',
  },
  "android-firefox": {
    label: "🤖 Android — Firefox",
    color: "#f97316",
    intro: "Mit Firefox auf Android:",
    list: [
      <>Tippe oben rechts auf das <b>⋮ Menü</b>.</>,
      <>Wähle <b>„Installieren"</b> oder <b>„Zum Startbildschirm hinzufügen"</b>.</>,
      <>Bestätige — fertig!</>,
    ],
  },
  "android-samsung": {
    label: "🤖 Android — Samsung Internet",
    color: "#2563eb",
    intro: "Mit Samsung Internet:",
    list: [
      <>Tippe unten auf das <b>≡ Menü</b>.</>,
      <>Wähle <b>„Seite hinzufügen zu"</b>.</>,
      <>Tippe auf <b>„Startbildschirm"</b> — fertig!</>,
    ],
  },
  "desktop-chrome": {
    label: "💻 Desktop — Chrome",
    color: "#22c55e",
    intro: "Mit Chrome am Desktop:",
    list: [
      <>Schau in die Adressleiste rechts — da erscheint ein kleines <b>📥 Install-Icon</b>.</>,
      <>Tippe drauf oder geh ins <b>⋮ Menü</b> → <b>„App installieren"</b>.</>,
      <>Bestätige — Icon liegt ab jetzt im Programmstart/Dock.</>,
    ],
  },
  "desktop-edge": {
    label: "💻 Desktop — Edge",
    color: "#0ea5e9",
    intro: "Mit Edge am Desktop:",
    list: [
      <>Klick rechts oben auf das <b>⋯ Menü</b>.</>,
      <>Wähle <b>„Apps"</b> → <b>„Diese Website als App installieren"</b>.</>,
      <>Bestätige — fertig.</>,
    ],
  },
  "desktop-safari": {
    label: "💻 Desktop — Safari",
    color: "#0ea5e9",
    intro: "Safari am Mac unterstützt PWAs ab macOS Sonoma:",
    list: [
      <>Klick in der Menüleiste oben auf <b>„Ablage"</b>.</>,
      <>Wähle <b>„Zum Dock hinzufügen…"</b>.</>,
      <>Bestätige den Namen — Icon erscheint im Dock.</>,
    ],
    tip: "Geht erst ab macOS 14 (Sonoma). Bei älterem Mac: Lesezeichen anlegen.",
  },
  "desktop-firefox": {
    label: "💻 Desktop — Firefox",
    color: "#f97316",
    intro: "Firefox am Desktop hat aktuell keine offizielle PWA-Funktion.",
    list: [
      <>Du kannst die Seite als <b>Lesezeichen</b> speichern (Ctrl+D / Cmd+D).</>,
      <>Für echtes PWA-Feeling: nimm Chrome, Edge oder Brave.</>,
    ],
  },
  unknown: {
    label: "❓ Unbekanntes Gerät",
    color: "#888",
    intro: "Wir können dein Gerät nicht eindeutig erkennen.",
    list: [
      <>Versuch im Browser-Menü nach <b>„App installieren"</b> oder <b>„Zum Startbildschirm"</b> zu suchen.</>,
      <>Sonst geht's auch als Lesezeichen.</>,
    ],
  },
};

export default function PwaInfo({
  appName = "VibeVibo",
  appEmoji = "📱",
  appPurpose = "deine Community",
  id = "pwa-info",
}) {
  const [pl, setPl] = useState({ id: "unknown", standalone: false });
  const [otherOpen, setOtherOpen] = useState(false);

  useEffect(() => { setPl(detectPlatform()); }, []);

  if (pl.standalone) {
    return (
      <HelpCard id={`${id}-installed`} title={`${appName} ist installiert ✅`} emoji={appEmoji} color="#22c55e">
        Du nutzt {appName} gerade als App — alles bleibt auf dem Home-Bildschirm.
        Du brauchst nicht jedes Mal den Browser zu öffnen.
      </HelpCard>
    );
  }

  const step = STEPS[pl.id] || STEPS.unknown;

  return (
    <HelpCard id={id} title={`${appName} als App installieren`} emoji={appEmoji} color="#ec4899">
      <b>Was ist das?</b> {appName} kann wie eine ganz normale App auf deinem Gerät laufen —
      mit eigenem Icon, ohne Adressleiste, schneller als der Browser. {appPurpose
        ? <>So hast du {appPurpose} immer mit einem Tap dabei.</>
        : null}
      <br/><br/>

      <div style={{
        background: `${step.color}14`, border: `1px solid ${step.color}55`,
        borderRadius: 10, padding: "10px 12px", marginBottom: 10,
      }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
          {step.label}
        </div>
        <div style={{ fontSize: 12.5, marginBottom: 6 }}>{step.intro}</div>
        <ol style={{ paddingLeft: 22, fontSize: 13, lineHeight: 1.55, margin: 0 }}>
          {step.list.map((item, i) => <li key={i}>{item}</li>)}
        </ol>
        {step.tip && (
          <div style={{ marginTop: 8, fontSize: 11, color: "var(--vv-muted,#666)", fontStyle: "italic" }}>
            💡 {step.tip}
          </div>
        )}
      </div>

      <button type="button" onClick={() => setOtherOpen((v) => !v)}
        style={{
          background: "none", border: "none", padding: 0,
          color: "#ec4899", cursor: "pointer", fontSize: 11,
          textDecoration: "underline", fontFamily: "inherit",
        }}>
        {otherOpen ? "↑ schließen" : "Falsche Erkennung? Andere Anleitungen anzeigen"}
      </button>

      {otherOpen && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--vv-border,#eee)" }}>
          {Object.entries(STEPS).filter(([k]) => k !== pl.id && k !== "unknown").map(([k, s]) => (
            <details key={k} style={{ marginBottom: 8 }}>
              <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{s.label}</summary>
              <div style={{ fontSize: 12, marginTop: 4, marginLeft: 10 }}>
                {s.intro}
                <ol style={{ paddingLeft: 22, lineHeight: 1.5, marginTop: 4 }}>
                  {s.list.map((item, i) => <li key={i}>{item}</li>)}
                </ol>
              </div>
            </details>
          ))}
        </div>
      )}

      <div style={{ marginTop: 10, fontSize: 11, color: "var(--vv-muted,#666)" }}>
        <b>Hinweis:</b> Du kannst <b>4 VibeVibo-Apps</b> nebeneinander installieren — jede mit eigenem Icon:
        <br/>🎨 Community · 💬 VV Messenger (/messenger) · 🐾 Mein VIBO (/karte) · 🎥 VV Live (/live)
      </div>
    </HelpCard>
  );
}
