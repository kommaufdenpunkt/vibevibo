"use client";

// 📲 VibeVibo App-Center — eine Seite mit allen installierbaren VibeVibo-Apps.
// URL: /apps
//
// Konzept: jede VibeVibo-Welt kann als EIGENE PWA aufs Handy (eigenes Icon,
// eigener Start-Bereich). Technik-Hinweis: ein beforeinstallprompt installiert
// immer das Manifest der GERADE offenen Seite. Darum:
//   • VibeVibo (Haupt-App): direkt hier installierbar (Haupt-Manifest aktiv).
//   • Sub-Apps (Messenger, Live, Mein VIBO, Spiele): Karte öffnet die App-Seite,
//     wo deren eigenes Manifest + Install-Button (InstallNow) sitzt.
//
// 2007er-Retro-Look: Icon-Grid, bunte Kacheln, dezenter Glow.

import Link from "next/link";
import InstallNow from "@/components/InstallNow";

const APPS = [
  {
    key: "vibevibo", name: "VibeVibo", emoji: "🌟", color: "#ec4899",
    desc: "Die komplette Community — Profile, Buschfunk, Coms, Geschenke. Das Haupt-Icon.",
    install: true,
  },
  {
    key: "messenger", name: "VV Messenger", emoji: "💬", color: "#2d7dd2",
    desc: "Nur Chats, Gruppen & Sprachnachrichten — als eigene Messenger-App.",
    href: "/messenger",
  },
  {
    key: "live", name: "VV Live", emoji: "🎥", color: "#f43f5e",
    desc: "Live-Streams ansehen & selbst senden — Vollbild, ohne Ablenkung.",
    href: "/live",
  },
  {
    key: "vibo", name: "Mein VIBO", emoji: "🐾", color: "#a855f7",
    desc: "Realitätskarte, Items sammeln, dein VIBO pflegen — mit Push.",
    href: "/karte",
  },
  {
    key: "spiele", name: "VV Spiele", emoji: "🎮", color: "#f59e0b",
    desc: "Mini-Games gegen deine Freunde — schnell gestartet vom Home-Screen.",
    href: "/spiele",
  },
];

export default function AppsPage() {
  return (
    <div style={{ maxWidth: 820, margin: "20px auto", padding: 14 }}>
      {/* Hero */}
      <div style={{
        position: "relative", textAlign: "center",
        background: "linear-gradient(135deg, rgba(236,72,153,0.22), rgba(124,58,237,0.20))",
        border: "1px solid rgba(244,114,182,0.4)",
        borderRadius: 18, padding: "26px 18px", marginBottom: 18,
        boxShadow: "0 12px 40px rgba(124,58,237,0.22), inset 0 1px 0 rgba(255,255,255,0.12)",
        overflow: "hidden",
      }}>
        <div style={{ fontSize: 44, filter: "drop-shadow(0 3px 10px rgba(236,72,153,0.5))" }}>📲</div>
        <h1 style={{ margin: "8px 0 6px", fontSize: 25, fontWeight: 900, color: "#fff", textShadow: "0 2px 12px rgba(124,58,237,0.5)" }}>
          ★ VibeVibo App-Center ★
        </h1>
        <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.92)", margin: "0 auto", lineHeight: 1.55, maxWidth: 520 }}>
          Hol dir jede VibeVibo-Welt als <b style={{ color: "#ffd9ee" }}>eigene App</b> aufs Handy —
          mit eigenem Icon, startet direkt in ihrem Bereich. Wie kleine Apps, alle aus VibeVibo.
        </p>
      </div>

      {/* App-Grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14,
      }}>
        {APPS.map((app) => (
          <div key={app.key} style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 16, padding: 16,
            display: "flex", flexDirection: "column", gap: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16, flexShrink: 0,
                background: `linear-gradient(135deg, ${app.color}, #831843)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 30, boxShadow: `0 6px 18px ${app.color}66`,
              }}>{app.emoji}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 900, color: "#fff" }}>{app.name}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.4 }}>{app.desc}</div>
              </div>
            </div>

            {app.install ? (
              <InstallNow appName={app.name} appEmoji={app.emoji} appColor={app.color} />
            ) : (
              <Link href={app.href} style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "12px 14px", borderRadius: 12, textDecoration: "none",
                background: `linear-gradient(135deg, ${app.color}, #831843)`,
                color: "#fff", fontWeight: 800, fontSize: 14,
                boxShadow: `0 6px 18px ${app.color}55`,
              }}>
                <span style={{ fontSize: 18 }}>{app.emoji}</span>
                Öffnen & installieren →
              </Link>
            )}
            {!app.install && (
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", textAlign: "center", lineHeight: 1.4 }}>
                Öffnet {app.name} — dort auf „Installieren" tippen, dann liegt {app.emoji} als eigenes Icon auf dem Home-Bildschirm.
              </div>
            )}
          </div>
        ))}
      </div>

      {/* iOS-Hinweis */}
      <div style={{
        marginTop: 18, background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12,
        padding: 14, fontSize: 12, color: "rgba(255,255,255,0.78)", lineHeight: 1.6,
      }}>
        📱 <b style={{ color: "#fff" }}>iPhone/iPad:</b> Apps werden über <b>Safari</b> installiert
        (Teilen-Symbol 📤 → „Zum Home-Bildschirm"). Jede App bekommt ihr eigenes Icon.
        <br />
        🤖 <b style={{ color: "#fff" }}>Android/Chrome:</b> Tippe einfach auf „Installieren" — fertig in 1 Sekunde.
      </div>
    </div>
  );
}
