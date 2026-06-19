"use client";

// 🎁 Vitrine — zeigt erhaltene Custom-Gifts auf einer Profilseite.
// Päckchen-Modus: Klick auf eingepacktes Geschenk → Auspack-Animation.

import { useState } from "react";

export default function GiftVitrine({ gifts = [], canUnwrap = false }) {
  const [unwrapping, setUnwrapping] = useState(null);
  const [unwrappedIds, setUnwrappedIds] = useState(new Set());

  async function unwrap(g) {
    if (!canUnwrap) return;
    if (!g.wrapped || g.unwrappedAt || unwrappedIds.has(g.id)) return;
    setUnwrapping(g.id);
    // Animation play
    await new Promise((r) => setTimeout(r, 1500));
    try {
      const r = await fetch("/api/gifts/unwrap", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ giftRowId: g.id }),
      });
      if (r.ok) {
        setUnwrappedIds((s) => new Set([...s, g.id]));
      }
    } finally {
      setTimeout(() => setUnwrapping(null), 300);
    }
  }

  if (gifts.length === 0) {
    return (
      <div style={{
        background: "rgba(255,255,255,0.95)", borderRadius: 14, padding: 24,
        textAlign: "center", color: "#94a3b8",
      }}>
        <div style={{ fontSize: 32, marginBottom: 6 }}>🎁</div>
        <b>Noch keine Geschenke</b>
      </div>
    );
  }

  return (
    <div style={{
      background: "rgba(255,255,255,0.95)", borderRadius: 14, padding: 14,
    }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 900 }}>
        🎁 Geschenke ({gifts.length})
      </h3>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
        gap: 10,
      }}>
        {gifts.map((g) => {
          const isWrapped = g.wrapped && !g.unwrappedAt && !unwrappedIds.has(g.id);
          const isUnwrapping = unwrapping === g.id;
          return (
            <button key={g.id}
              onClick={() => isWrapped && unwrap(g)}
              title={isWrapped ? "Klick zum Auspacken!" : `${g.name} — von @${g.fromUsername || "?"}`}
              style={{
                background: "transparent", border: "none", cursor: isWrapped ? "pointer" : "default",
                padding: 4, fontFamily: "inherit",
              }}>
              <div style={{
                width: "100%", aspectRatio: "1/1", borderRadius: 10, position: "relative",
                background: isWrapped
                  ? "linear-gradient(135deg, #fbbf24, #f59e0b)"
                  : g.imageUrl ? `url(${g.imageUrl}) center/contain no-repeat #fafafa`
                  : "#fafafa",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 28,
                transform: isUnwrapping ? "scale(1.4) rotate(720deg)" : "scale(1)",
                transition: "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
                boxShadow: isWrapped ? "0 4px 12px rgba(251,191,36,0.4)" : "none",
              }}>
                {isWrapped ? "📦" : !g.imageUrl && "🎁"}
              </div>
              <div style={{
                fontSize: 9.5, color: "#475569", marginTop: 4,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {isWrapped ? `von @${g.fromUsername}` : (g.name || "Geschenk")}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
