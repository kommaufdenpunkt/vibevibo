"use client";

// 🎛 Dashboard-Editor — User stellt seine /heute-Sektionen zusammen.
// Speicherung in localStorage als JSON-Array. Drag-frei (nur ▲▼-Buttons) damit
// auf Mobile sauber funktioniert.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMe } from "@/lib/useMe";

const STORAGE_KEY = "vv_dashboard_layout";

// Definition aller Sektionen — Reihenfolge = Default
const ALL_SECTIONS = [
  {
    id: "hero",
    icon: "🌅",
    name: "Begrüßung + Saldo",
    desc: "Animierter Header mit Datum, Saldo und Streak. Kann nicht entfernt werden.",
    locked: true,
  },
  {
    id: "alerts",
    icon: "⚠",
    name: "Wichtige Alerts",
    desc: "Tages-Bonus, Gruscheln-Inbox, Geburtstage, offene Quests.",
  },
  {
    id: "tiles",
    icon: "🚀",
    name: "Schnell loslegen (Tiles)",
    desc: "Deine 8 wichtigsten Apps als große Buttons. Pinnen im Apps-Launcher.",
  },
  {
    id: "buschfunk",
    icon: "📣",
    name: "Buschfunk-Feed",
    desc: "Live-Posts von Freunden und aus dem Netz mit Infinite-Scroll.",
  },
  {
    id: "fortune",
    icon: "🔮",
    name: "Spruch des Tages",
    desc: "Täglicher Glückskeks-Spruch.",
  },
  {
    id: "activity",
    icon: "📰",
    name: "Benachrichtigungen",
    desc: "Wer hat dich gegruschelt, besucht, kommentiert.",
  },
];

const DEFAULT_LAYOUT = ALL_SECTIONS.map((s) => ({ id: s.id, enabled: true }));

function loadLayout() {
  if (typeof window === "undefined") return DEFAULT_LAYOUT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return DEFAULT_LAYOUT;
    // Sicherstellen dass alle Sektionen vorkommen (neue dazugebaut werden)
    const seen = new Set();
    const result = [];
    for (const it of arr) {
      if (it && typeof it.id === "string" && ALL_SECTIONS.find((s) => s.id === it.id)) {
        seen.add(it.id);
        result.push({ id: it.id, enabled: !!it.enabled });
      }
    }
    // Fehlende Sektionen am Ende anhaengen (enabled-Default)
    for (const s of ALL_SECTIONS) {
      if (!seen.has(s.id)) result.push({ id: s.id, enabled: true });
    }
    return result;
  } catch {
    return DEFAULT_LAYOUT;
  }
}

function saveLayout(layout) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(layout)); } catch {}
}

export default function DashboardEditorPage() {
  const { me, loading } = useMe();
  const [layout, setLayout] = useState(null);
  const [flash, setFlash] = useState("");

  useEffect(() => { setLayout(loadLayout()); }, []);

  function persist(next) {
    setLayout(next);
    saveLayout(next);
    setFlash("✓ Gespeichert");
    setTimeout(() => setFlash(""), 1800);
  }

  function moveUp(idx) {
    if (idx <= 0) return;
    const sec = ALL_SECTIONS.find((s) => s.id === layout[idx].id);
    if (sec?.locked) return; // gelockte koennen nicht verschoben werden
    const above = ALL_SECTIONS.find((s) => s.id === layout[idx - 1].id);
    if (above?.locked) return; // nicht ueber gelockte hinaus
    const next = [...layout];
    [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
    persist(next);
  }
  function moveDown(idx) {
    if (idx >= layout.length - 1) return;
    const sec = ALL_SECTIONS.find((s) => s.id === layout[idx].id);
    if (sec?.locked) return;
    const next = [...layout];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    persist(next);
  }
  function toggle(idx) {
    const sec = ALL_SECTIONS.find((s) => s.id === layout[idx].id);
    if (sec?.locked) return;
    const next = [...layout];
    next[idx] = { ...next[idx], enabled: !next[idx].enabled };
    persist(next);
  }
  function reset() {
    if (!confirm("Wirklich auf Standard zurücksetzen?")) return;
    persist(DEFAULT_LAYOUT);
  }

  if (loading) return null;
  if (!me) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <Link href="/login?next=/profile/dashboard" className="vv-btn vv-btn-pink">Zum Login</Link>
      </div>
    );
  }
  if (!layout) return <div style={{ padding: 30, color: "#fff", textAlign: "center" }}>⏳ Lade…</div>;

  return (
    <div style={{ background: "transparent", paddingBottom: 100 }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "12px 12px 0" }}>

        {/* Hero */}
        <div style={{
          background: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #f59e0b 100%)",
          backgroundSize: "200% 200%",
          animation: "vv-dash-hero 14s ease infinite",
          color: "#fff", borderRadius: 18, padding: "18px 20px",
          marginBottom: 14, boxShadow: "0 8px 24px rgba(139,92,246,0.35)",
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.95, letterSpacing: 1, textTransform: "uppercase" }}>
            🎛 Dein Dashboard
          </div>
          <h1 style={{ margin: "4px 0 6px", fontSize: 26, fontWeight: 900, textShadow: "0 2px 6px rgba(0,0,0,0.2)" }}>
            Heute zusammenstellen
          </h1>
          <div style={{ fontSize: 13, opacity: 0.95, lineHeight: 1.4 }}>
            Wähle welche Sektionen auf <Link href="/heute" style={{ color: "#fff", fontWeight: 800 }}>/heute</Link> erscheinen
            und in welcher Reihenfolge. Speicherung im Browser — alle Geräte separat.
          </div>
        </div>
        <style>{`
          @keyframes vv-dash-hero {
            0%, 100% { background-position: 0% 50%; }
            50%      { background-position: 100% 50%; }
          }
        `}</style>

        {flash && (
          <div style={{
            position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)",
            background: "#10b981", color: "#fff", padding: "8px 16px",
            borderRadius: 999, fontWeight: 800, fontSize: 13, zIndex: 100,
            boxShadow: "0 4px 12px rgba(16,185,129,0.4)",
          }}>{flash}</div>
        )}

        {/* Sektion-Liste */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          {layout.map((entry, idx) => {
            const sec = ALL_SECTIONS.find((s) => s.id === entry.id);
            if (!sec) return null;
            const isFirst = idx === 0;
            const isLast = idx === layout.length - 1;
            const canMoveUp = !sec.locked && !isFirst && !ALL_SECTIONS.find((s) => s.id === layout[idx - 1]?.id)?.locked;
            const canMoveDown = !sec.locked && !isLast;
            return (
              <div key={sec.id} style={{
                background: entry.enabled ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.55)",
                backdropFilter: "blur(12px)",
                borderRadius: 14, padding: 12,
                border: entry.enabled ? "2px solid #ec4899" : "2px dashed rgba(0,0,0,0.15)",
                opacity: entry.enabled ? 1 : 0.65,
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <div style={{ fontSize: 32, lineHeight: 1, flexShrink: 0 }}>{sec.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: "#1f2937" }}>{sec.name}</div>
                    {sec.locked && (
                      <span style={{
                        background: "#fef3c7", color: "#92400e",
                        padding: "1px 7px", borderRadius: 999,
                        fontSize: 9.5, fontWeight: 800,
                      }}>🔒 fix</span>
                    )}
                    {!entry.enabled && (
                      <span style={{
                        background: "#fee2e2", color: "#991b1b",
                        padding: "1px 7px", borderRadius: 999,
                        fontSize: 9.5, fontWeight: 800,
                      }}>AUS</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11.5, color: "#64748b", lineHeight: 1.4 }}>{sec.desc}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <button onClick={() => moveUp(idx)} disabled={!canMoveUp} style={{
                    ...iconBtn,
                    opacity: canMoveUp ? 1 : 0.3,
                    cursor: canMoveUp ? "pointer" : "not-allowed",
                  }} title="Hoch">▲</button>
                  <button onClick={() => moveDown(idx)} disabled={!canMoveDown} style={{
                    ...iconBtn,
                    opacity: canMoveDown ? 1 : 0.3,
                    cursor: canMoveDown ? "pointer" : "not-allowed",
                  }} title="Runter">▼</button>
                </div>
                {!sec.locked && (
                  <button onClick={() => toggle(idx)} style={{
                    background: entry.enabled
                      ? "linear-gradient(135deg, #10b981, #059669)"
                      : "linear-gradient(135deg, #64748b, #334155)",
                    color: "#fff", border: "none",
                    padding: "8px 14px", borderRadius: 999,
                    fontWeight: 800, fontSize: 12, cursor: "pointer",
                    whiteSpace: "nowrap", flexShrink: 0,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                  }}>{entry.enabled ? "✓ AN" : "AUS"}</button>
                )}
              </div>
            );
          })}
        </div>

        {/* Reset */}
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <button onClick={reset} style={{
            background: "rgba(255,255,255,0.85)",
            color: "#475569", border: "1px solid rgba(0,0,0,0.08)",
            padding: "8px 16px", borderRadius: 999,
            fontWeight: 800, fontSize: 12, cursor: "pointer",
          }}>↻ Auf Standard zurücksetzen</button>
        </div>

        {/* Vorschau-Link */}
        <Link href="/heute" style={{
          display: "block", textAlign: "center",
          background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
          color: "#fff", padding: "14px 20px", borderRadius: 14,
          fontWeight: 900, fontSize: 15, textDecoration: "none",
          boxShadow: "0 6px 18px rgba(139,92,246,0.35)",
        }}>👁 Heute ansehen →</Link>

      </div>
    </div>
  );
}

const iconBtn = {
  background: "rgba(248,250,252,0.9)",
  color: "#475569",
  border: "1px solid rgba(0,0,0,0.08)",
  borderRadius: 6, width: 26, height: 22,
  fontSize: 11, fontWeight: 800,
  cursor: "pointer", padding: 0,
  display: "flex", alignItems: "center", justifyContent: "center",
};
