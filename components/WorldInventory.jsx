"use client";

// Welt-Inventar: was du in der Realität eingesammelt hast.
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function WorldInventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.worldInventory()
      .then((r) => setItems(r.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 20, textAlign: "center" }}>Lade Inventar…</div>;
  if (items.length === 0) {
    return (
      <div style={{ padding: 30, textAlign: "center", color: "var(--vv-muted,#666)" }}>
        <div style={{ fontSize: 50 }}>🎒</div>
        Noch nichts gefunden. Geh nach draußen und schnapp dir Items!
      </div>
    );
  }

  return (
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
  );
}
