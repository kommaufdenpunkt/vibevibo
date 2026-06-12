"use client";

import { useState } from "react";
import Link from "next/link";
import ViboMinigame from "@/components/ViboMinigame";

const GAMES = [
  {
    id: "snack",
    name: "Snack-Schnapp",
    emoji: "🍔",
    color: "linear-gradient(135deg, #f97316, #fbbf24)",
    desc: "Füttere dein VIBO mit fallenden Snacks. Bomben meiden!",
    duration: "30 Sek",
    rewards: "Bis 10 Vibes + Hunger-Boost fuer dein VIBO",
    live: true,
  },
  {
    id: "memory",
    name: "Memo-Match",
    emoji: "🧠",
    color: "linear-gradient(135deg, #8b5cf6, #ec4899)",
    desc: "Klassisches Memory mit VIBO-Karten. Schnellster Spieler gewinnt extra Vibes.",
    duration: "1-3 Min",
    rewards: "Bis 15 Vibes",
    live: false,
  },
  {
    id: "fortune",
    name: "Glücksrad",
    emoji: "🎰",
    color: "linear-gradient(135deg, #06b6d4, #3b82f6)",
    desc: "1x pro Tag drehen. Gratis Vibes, Items oder Pet-Boosts.",
    duration: "5 Sek",
    rewards: "Zufallspreis, max 50 Vibes",
    live: false,
    hint: "Bereits auf /fortune verfuegbar",
  },
  {
    id: "quiz",
    name: "VIBO-Quiz",
    emoji: "❓",
    color: "linear-gradient(135deg, #16a34a, #84cc16)",
    desc: "Fragen aus den 2000ern: Musik, Filme, Internet-Memes.",
    duration: "2 Min",
    rewards: "Bis 20 Vibes + XP",
    live: false,
  },
  {
    id: "fish",
    name: "Angeln",
    emoji: "🎣",
    color: "linear-gradient(135deg, #0ea5e9, #06b6d4)",
    desc: "Fang Fische in der Realitaetskarte fuer dein VIBO.",
    duration: "Endlos",
    rewards: "Fische ins Inventar",
    live: false,
    hint: "Bereits auf /karte verfuegbar",
  },
];

export default function SpielePage() {
  const [active, setActive] = useState(null);

  if (active === "snack") {
    return (
      <div className="vv-card" style={{ maxWidth: 540, margin: "20px auto" }}>
        <ViboMinigame vibo={null} onClose={() => setActive(null)} />
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 720, margin: "0 auto" }}>
      <div style={{
        background: "linear-gradient(135deg, #ec4899, #8b5cf6, #3b82f6)",
        color: "#fff",
        padding: "18px 16px",
        borderRadius: 14,
        marginBottom: 18,
        boxShadow: "0 6px 18px rgba(139,92,246,0.3)",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 0.5 }}>🎮 VibeVibo Spiele</div>
        <div style={{ fontSize: 13, marginTop: 4, opacity: 0.9 }}>
          Spielen, sammeln, dein VIBO grossziehen
        </div>
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
        {GAMES.map((g) => (
          <div key={g.id} style={{
            background: "#fff",
            borderRadius: 14,
            overflow: "hidden",
            border: "1px solid #f0e7f5",
            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
            display: "flex",
            flexDirection: "column",
          }}>
            <div style={{
              background: g.color,
              padding: "16px 14px",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontWeight: 900,
            }}>
              <span style={{ fontSize: 32 }}>{g.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16 }}>{g.name}</div>
                <div style={{ fontSize: 11, opacity: 0.9, fontWeight: 600 }}>⏱ {g.duration}</div>
              </div>
            </div>
            <div style={{ padding: 12, flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 13, color: "#3f3f46", lineHeight: 1.4 }}>{g.desc}</div>
              <div style={{ fontSize: 11, color: "#831843", background: "#fce7f3", padding: "4px 8px", borderRadius: 8 }}>
                🎁 {g.rewards}
              </div>
              {g.hint && (
                <div style={{ fontSize: 11, color: "#65a30d" }}>↗ {g.hint}</div>
              )}
              <div style={{ marginTop: "auto" }}>
                {g.live ? (
                  <button
                    onClick={() => setActive(g.id)}
                    className="vv-btn-big vv-btn-big-orange"
                    style={{ width: "100%", padding: 10, fontSize: 13 }}
                  >🚀 Jetzt spielen</button>
                ) : g.hint && g.id === "fortune" ? (
                  <Link href="/fortune" className="vv-btn-big vv-btn-big-ghost" style={{ width: "100%", padding: 10, fontSize: 13, textAlign: "center", textDecoration: "none", display: "block" }}>
                    → Zum Glücksrad
                  </Link>
                ) : g.hint && g.id === "fish" ? (
                  <Link href="/karte" className="vv-btn-big vv-btn-big-ghost" style={{ width: "100%", padding: 10, fontSize: 13, textAlign: "center", textDecoration: "none", display: "block" }}>
                    → Zur Karte
                  </Link>
                ) : (
                  <button
                    disabled
                    className="vv-btn-big vv-btn-big-ghost"
                    style={{ width: "100%", padding: 10, fontSize: 13, opacity: 0.55, cursor: "not-allowed" }}
                  >🔜 Bald verfügbar</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 18,
        padding: 14,
        background: "linear-gradient(135deg, #fef3c7, #fde68a)",
        borderRadius: 12,
        border: "2px dashed #f59e0b",
        fontSize: 12,
        color: "#92400e",
        textAlign: "center",
      }}>
        💡 Wunsch fuer ein Spiel? Schreib's in den <Link href="/buschfunk" style={{ color: "#92400e" }}>Buschfunk</Link>!
      </div>
    </div>
  );
}
