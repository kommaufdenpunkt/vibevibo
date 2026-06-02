"use client";

// Welt-Inventar: was du in der Realität eingesammelt hast.
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function WorldInventory() {
  const [items, setItems] = useState([]);
  const [dex, setDex] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.worldInventory().then((r) => setItems(r.items || [])).catch(() => {}),
      api.worldDex().then((r) => setDex(r)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 20, textAlign: "center" }}>Lade Inventar…</div>;

  const dexBlock = dex && (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>🐾 Wild-VIBO-Dex</h3>
        <span style={{ fontSize: 12, color: "var(--vv-muted,#666)" }}>
          {dex.caughtCount}/{dex.total} Arten · {dex.totalCatches} gefangen
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))", gap: 8 }}>
        {dex.dex.map((d) => (
          <div key={d.species} style={{
            background: d.caught ? "linear-gradient(135deg, #dcfce7, #bbf7d0)" : "rgba(120,120,128,0.12)",
            border: `2px solid ${d.caught ? "#22c55e" : "var(--vv-border,#e5e7eb)"}`,
            borderRadius: 12, padding: "10px 6px", textAlign: "center",
            opacity: d.caught ? 1 : 0.6, filter: d.caught ? "none" : "grayscale(0.9)", position: "relative",
          }}>
            <div style={{ fontSize: 28 }}>{d.caught ? d.emoji : "❔"}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: d.caught ? "#1c1c1e" : "var(--vv-muted,#888)" }}>
              {d.caught ? d.name : "???"}
            </div>
            {d.count > 0 && (
              <div style={{ position: "absolute", top: -8, right: -8, background: "#22c55e", color: "#fff", borderRadius: 999, padding: "2px 7px", fontSize: 11, fontWeight: 800, border: "2px solid #fff" }}>×{d.count}</div>
            )}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: "var(--vv-muted,#888)", marginTop: 8, fontStyle: "italic" }}>
        🐾 Wild-VIBOs erscheinen auf der Karte — komm ran & tippe zum Fangen. Das Wetter beeinflusst, welche Arten auftauchen!
      </div>
    </div>
  );

  if (items.length === 0) {
    return (
      <div>
        {dexBlock}
        <div style={{ padding: 30, textAlign: "center", color: "var(--vv-muted,#666)" }}>
          <div style={{ fontSize: 50 }}>🎒</div>
          Noch keine Items gefunden. Geh nach draußen und schnapp dir was!
        </div>
      </div>
    );
  }

  return (
    <div>
      {dexBlock}
    <div style={{ padding: 14 }}>
      <h3 style={{ marginTop: 0, textAlign: "center" }}>🎒 Mein Welt-Inventar</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
        {items.map((it) => (
          <div key={it.kind} style={{
            background: "var(--vv-card,#fff)",
            border: `2px solid ${it.color}40`,
            borderRadius: 12, padding: 12,
            textAlign: "center",
            position: "relative",
          }}>
            <div style={{ fontSize: 36, marginBottom: 4 }}>{it.emoji}</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{it.name}</div>
            <div style={{ fontSize: 11, color: "var(--vv-muted,#666)", marginTop: 2, minHeight: 14 }}>
              {it.description}
            </div>
            <div style={{
              position: "absolute", top: -8, right: -8,
              background: it.color, color: "#fff",
              borderRadius: 999, padding: "3px 9px",
              fontSize: 12, fontWeight: 800,
              border: "2px solid #fff", boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
            }}>×{it.count}</div>
          </div>
        ))}
      </div>
    </div>
    </div>
  );
}
