"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import HelpCard from "./HelpCard";

export default function CardCollection() {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState("all"); // all|owned|missing

  useEffect(() => { api.cards().then(setData).catch(() => {}); }, []);
  if (!data) return null;

  const visible = data.cards.filter((c) => {
    if (filter === "owned") return c.owned;
    if (filter === "missing") return !c.owned;
    return true;
  });

  return (
    <div style={{ padding: 14 }}>
      <HelpCard id="cards-intro" title="Wie funktionieren Sammelkarten?" emoji="🎴" color="#8b5cf6">
        20 verschiedene Karten in 4 Seltenheiten: <b>gewöhnlich</b>,
        <b> ungewöhnlich</b>, <b>selten</b>, <b>legendär</b>.
        <br/><br/>
        Karten kommen aus dem <b>Sammelkarten-Pack</b> im Shop (25 ✨ = 3
        zufällige Karten) oder als <b>seltener Fund</b> auf der
        Realitätskarte.
        <br/><br/>
        Filter oben (Alle/Meine/Fehlend) hilft beim Komplettieren.
      </HelpCard>
      <h3 style={{ margin: "0 0 4px" }}>🎴 Sammelkarten</h3>
      <div style={{ fontSize: 12, color: "var(--vv-muted,#666)", marginBottom: 10 }}>
        {data.stats.owned} / {data.stats.total} gesammelt ·
        {" "}gewöhnlich {data.stats.byRarity.common}/5
        {" "}· ungewöhnlich {data.stats.byRarity.uncommon}/5
        {" "}· selten {data.stats.byRarity.rare}/5
        {" "}· legendär {data.stats.byRarity.legendary}/5
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {[["all", "Alle"], ["owned", "Meine"], ["missing", "Fehlend"]].map(([k, l]) => (
          <button key={k} type="button" onClick={() => setFilter(k)}
            style={{
              padding: "6px 12px", borderRadius: 10, border: "none", cursor: "pointer",
              background: filter === k ? "#ec4899" : "rgba(120,120,128,0.15)",
              color: filter === k ? "#fff" : "var(--vv-text,#1c1c1e)",
              fontSize: 12, fontWeight: 700, fontFamily: "inherit",
            }}>{l}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8 }}>
        {visible.map((c) => (
          <div key={c.id} style={{
            position: "relative",
            background: c.owned ? `linear-gradient(135deg, ${c.color}40, ${c.color}10)` : "rgba(120,120,128,0.10)",
            border: `2px solid ${c.owned ? c.color : "rgba(120,120,128,0.25)"}`,
            borderRadius: 12, padding: 10, textAlign: "center",
            aspectRatio: "3/4", display: "flex", flexDirection: "column", justifyContent: "center",
            opacity: c.owned ? 1 : 0.6, filter: c.owned ? "none" : "grayscale(1)",
          }}>
            <div style={{ fontSize: 36, marginBottom: 4 }}>{c.emoji}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: c.owned ? "var(--vv-text,#1c1c1e)" : "var(--vv-muted,#888)" }}>{c.name}</div>
            <div style={{ fontSize: 9, color: c.rarityColor, fontWeight: 700, textTransform: "uppercase" }}>
              {c.rarityLabel}
            </div>
            {c.count > 1 && (
              <div style={{
                position: "absolute", top: 4, right: 4,
                background: c.color, color: "#fff",
                borderRadius: 999, padding: "2px 6px", fontSize: 10, fontWeight: 800,
                border: "2px solid #fff",
              }}>×{c.count}</div>
            )}
            {!c.owned && (
              <div style={{ position: "absolute", top: 4, left: 4, fontSize: 14 }}>🔒</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
