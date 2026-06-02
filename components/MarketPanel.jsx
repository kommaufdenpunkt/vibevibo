"use client";

// VIBO-Basar: 3 wöchentliche Händler mit schwankenden Preisen + Tagesgesuch.
// Du verkaufst deine Angel-Fänge — Vibes gibt's gedeckelt (Anti-Inflation).

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import HelpCard from "./HelpCard";

const CAT_LABEL = { fish: "🐟 Fisch", treasure: "💎 Wertvoll", junk: "🗑️ Müll", legendary: "🐉 Legendär" };

export default function MarketPanel() {
  const [data, setData] = useState(null);
  const [sel, setSel] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");

  const load = useCallback(async () => {
    try { setData(await api.market()); } catch (e) { setFlash(`⚠ ${e.message}`); }
  }, []);
  useEffect(() => { load(); }, [load]);

  function toggle(id) {
    setSel((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function sellTo(merchantId) {
    const ids = [...sel];
    if (!ids.length) { setFlash("⚠ Wähle erst Fänge zum Verkaufen aus."); setTimeout(() => setFlash(""), 2500); return; }
    setBusy(true);
    try {
      const r = await api.marketSell(merchantId, ids);
      setFlash(`💰 ${r.sold} verkauft für +${r.vibes} ✨${r.cappedSome ? " (Tageslimit erreicht)" : ""}`);
      setTimeout(() => setFlash(""), 4000);
      setSel(new Set());
      await load();
    } catch (e) {
      setFlash(`⚠ ${e.message}`);
      setTimeout(() => setFlash(""), 4000);
    } finally { setBusy(false); }
  }

  if (!data) return <div style={{ padding: 20, textAlign: "center" }}>Lade Basar…</div>;

  const openMerchants = data.week.filter((m) => m.open);
  const selItems = data.items.filter((i) => sel.has(i.id));
  const selValue = (mId) => {
    // grobe Vorschau: bester/aktueller Preis aus item.best (falls dieser Händler offen)
    return selItems.reduce((sum, i) => sum + (i.best?.merchantId === mId ? i.best.price : 0), 0);
  };

  return (
    <div style={{ padding: 14 }}>
      <HelpCard id="market-intro" title="Wie funktioniert der VIBO-Basar?" emoji="🏪" color="#f59e0b">
        Hier verkaufst du deine <b>Angel-Fänge</b> gegen Vibes ✨.
        <br/><br/>
        • <b>3 Händler pro Woche</b> — jeder mit eigenen Vorlieben + Öffnungszeiten<br/>
        • <b>Preise schwanken täglich</b> — vergleiche, wer am meisten zahlt<br/>
        • 🔥 <b>Tagesgesuch</b>: ein Fisch bringt heute doppelten Preis<br/>
        • Größere Fische = mehr wert<br/>
        • <b>Fair-Limit:</b> max {data.sellCap.max} ✨ Verkauf pro Tag — so bleibt die
          Währung wertvoll und niemand kann farmen.
      </HelpCard>

      {/* Tagesgesuch */}
      {data.hot && (
        <div style={{
          background: "linear-gradient(135deg, #fef08a, #f59e0b)", color: "#1c1c1e",
          borderRadius: 12, padding: 12, marginBottom: 12, textAlign: "center", fontWeight: 700,
        }}>
          🔥 Heute gesucht: {data.hot.emoji} <b>{data.hot.name}</b> — doppelter Preis!
        </div>
      )}

      {flash && (
        <div style={{
          background: flash.startsWith("⚠") ? "#fef3c7" : "#dcfce7",
          color: flash.startsWith("⚠") ? "#92400e" : "#166534",
          padding: 10, borderRadius: 10, marginBottom: 12, fontWeight: 700, textAlign: "center",
        }}>{flash}</div>
      )}

      {/* Tages-Cap-Anzeige */}
      <div style={{ fontSize: 12, color: "var(--vv-muted,#666)", marginBottom: 12, textAlign: "center" }}>
        Heute verkauft: <b>{data.sellCap.earnedToday}</b> / {data.sellCap.max} ✨
        · {data.sellCap.salesToday} Verkäufe
      </div>

      {/* Händler dieser Woche */}
      <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>🧑‍🌾 Händler diese Woche</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        {data.week.map((m) => (
          <div key={m.id} style={{
            background: "var(--vv-card,#fff)",
            border: `2px solid ${m.open ? "#22c55e" : "var(--vv-border,#e5e7eb)"}`,
            borderRadius: 12, padding: 12, opacity: m.open ? 1 : 0.7,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 30 }}>{m.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>
                  {m.name}
                  {m.open
                    ? <span style={{ marginLeft: 8, fontSize: 11, color: "#16a34a", fontWeight: 700 }}>● JETZT OFFEN</span>
                    : <span style={{ marginLeft: 8, fontSize: 11, color: "var(--vv-muted,#888)" }}>offen {m.openHours[0]}–{m.openHours[1]} Uhr</span>}
                </div>
                <div style={{ fontSize: 11, color: "var(--vv-muted,#666)" }}>{m.blurb}</div>
                <div style={{ fontSize: 10, color: "var(--vv-muted,#888)", marginTop: 3 }}>
                  🐟 ×{(m.mult.fish * m.factors.fish).toFixed(1)} · 💎 ×{(m.mult.treasure * m.factors.treasure).toFixed(1)} · 🗑️ ×{(m.mult.junk * m.factors.junk).toFixed(1)} · 🐉 ×{(m.mult.legendary * m.factors.legendary).toFixed(1)}
                </div>
              </div>
            </div>
            {m.open && (
              <button type="button" disabled={busy || sel.size === 0}
                onClick={() => sellTo(m.id)}
                className={sel.size > 0 ? "vv-btn-big vv-btn-big-green" : "vv-btn-big vv-btn-big-ghost"}
                style={{ width: "100%", marginTop: 10, padding: "10px", fontSize: 13 }}>
                {sel.size > 0 ? `${sel.size} Fänge an ${m.name} verkaufen (~${selValue(m.id)} ✨)` : "Erst Fänge unten auswählen"}
              </button>
            )}
          </div>
        ))}
        {openMerchants.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--vv-muted,#666)", fontSize: 13, padding: 8 }}>
            Gerade hat kein Händler offen. Schau zu ihren Öffnungszeiten wieder vorbei!
          </div>
        )}
      </div>

      {/* Deine Fänge */}
      <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>🎣 Deine Fänge ({data.items.length})</h3>
      {data.items.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--vv-muted,#666)", padding: 16, fontSize: 13 }}>
          Noch nichts gefangen. Geh ans Wasser und wirf die Angel aus! 🎣
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8 }}>
          {data.items.map((it) => {
            const selected = sel.has(it.id);
            return (
              <button key={it.id} type="button" onClick={() => toggle(it.id)}
                style={{
                  background: selected ? "linear-gradient(135deg,#bbf7d0,#86efac)" : "var(--vv-card,#fff)",
                  border: `2px solid ${selected ? "#16a34a" : (it.isHot ? "#f59e0b" : "var(--vv-border,#e5e7eb)")}`,
                  borderRadius: 12, padding: "10px 6px", textAlign: "center", cursor: "pointer",
                  position: "relative", fontFamily: "inherit",
                }}>
                {it.isHot && <span style={{ position: "absolute", top: 3, right: 4, fontSize: 11 }}>🔥</span>}
                <div style={{ fontSize: 26 }}>{it.emoji}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--vv-text,#1c1c1e)" }}>{it.label}</div>
                {it.sizeCm > 0 && <div style={{ fontSize: 10, color: "var(--vv-muted,#888)" }}>{it.sizeCm} cm</div>}
                <div style={{ fontSize: 11, fontWeight: 800, color: "#16a34a", marginTop: 2 }}>
                  {it.best ? `${it.best.price} ✨` : `~${it.baseValue} ✨`}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Rekorde */}
      {data.records.length > 0 && (
        <>
          <h3 style={{ margin: "16px 0 8px", fontSize: 15 }}>🏅 Deine Angel-Rekorde</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 6 }}>
            {data.records.map((r) => (
              <div key={r.itemId} style={{
                background: "var(--vv-card,#fff)", border: "1px solid var(--vv-border,#eee)",
                borderRadius: 10, padding: "8px 6px", textAlign: "center", fontSize: 11,
              }}>
                <div style={{ fontSize: 20 }}>{r.emoji}</div>
                <div style={{ fontWeight: 700 }}>{r.label}</div>
                <div style={{ color: "var(--vv-muted,#666)" }}>{r.bestSizeCm} cm</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
