"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

const TYPE_LABEL = { consumable: "Verbrauchen", booster: "Booster", cosmetic: "Kosmetik", furniture: "Möbel" };
const TYPE_COLOR = { consumable: "#10b981", booster: "#8b5cf6", cosmetic: "#ec4899", furniture: "#f59e0b" };

export default function ShopPanel() {
  const [items, setItems] = useState([]);
  const [balance, setBalance] = useState(null);
  const [flash, setFlash] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    const [s, c] = await Promise.all([api.shop(), api.credits().catch(() => null)]);
    setItems(s.items || []);
    if (c) setBalance(c.balance);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function buy(kind) {
    setBusy(kind);
    try {
      const r = await api.shopBuy(kind);
      let msg = `🎉 ${r.emoji} ${r.name} gekauft!`;
      if (r.cards) msg += ` 3 Karten: ${r.cards.map((c) => c.emoji).join(" ")}`;
      if (r.note) msg += ` (${r.note})`;
      setFlash(msg);
      setTimeout(() => setFlash(""), 4000);
      setBalance(r.balance);
    } catch (e) {
      setFlash(`⚠ ${e.message}`);
      setTimeout(() => setFlash(""), 3500);
    } finally { setBusy(""); }
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "linear-gradient(135deg, #ff3e9d 0%, #b91e7c 100%)",
        color: "#fff", padding: 14, borderRadius: 14, marginBottom: 14,
      }}>
        <div>
          <h3 style={{ margin: 0 }}>🛒 VIBO-Shop</h3>
          <div style={{ fontSize: 12, opacity: 0.95 }}>Gib deine Vibes für coole Sachen aus</div>
        </div>
        {balance !== null && (
          <div style={{ background: "rgba(255,255,255,0.2)", padding: "8px 14px", borderRadius: 999, fontWeight: 800, fontSize: 16 }}>
            ✨ {balance}
          </div>
        )}
      </div>

      {flash && (
        <div style={{
          background: flash.startsWith("⚠") ? "#fef3c7" : "#dcfce7",
          color: flash.startsWith("⚠") ? "#92400e" : "#166534",
          padding: 10, borderRadius: 10, marginBottom: 10, fontSize: 13, fontWeight: 600, textAlign: "center",
        }}>{flash}</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
        {items.map((it) => {
          const canAfford = balance == null || balance >= it.price;
          return (
            <div key={it.kind} style={{
              background: "var(--vv-card,#fff)",
              border: `2px solid ${TYPE_COLOR[it.type]}30`,
              borderRadius: 14, padding: 12, textAlign: "center",
              display: "flex", flexDirection: "column", gap: 4,
              position: "relative",
            }}>
              <div style={{
                position: "absolute", top: 6, right: 6,
                background: TYPE_COLOR[it.type], color: "#fff",
                padding: "2px 6px", borderRadius: 6, fontSize: 9, fontWeight: 700, textTransform: "uppercase",
              }}>{TYPE_LABEL[it.type]}</div>
              <div style={{ fontSize: 40, marginTop: 8 }}>{it.emoji}</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{it.name}</div>
              <div style={{ fontSize: 11, color: "var(--vv-muted,#666)", minHeight: 28 }}>{it.description}</div>
              <button type="button" disabled={busy === it.kind || !canAfford}
                onClick={() => buy(it.kind)}
                className={canAfford ? "vv-btn-big vv-btn-big-yellow" : "vv-btn-big vv-btn-big-ghost"}
                style={{ padding: "8px 10px", fontSize: 13, marginTop: 4 }}>
                ✨ {it.price}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
