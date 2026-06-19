// 🎁 Custom-Gift-Katalog mit Beschenken-Flow.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMe } from "@/lib/useMe";
import GiftBeschenkenFlow from "@/components/GiftBeschenkenFlow";

export default function CatalogPage() {
  const { me } = useMe();
  const [gifts, setGifts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const url = `/api/gifts/catalog?q=${encodeURIComponent(search)}&cat=${encodeURIComponent(cat)}&filter=${filter}`;
    fetch(url).then((r) => r.json()).then((d) => {
      setGifts(d.gifts || []);
      setCategories(d.categories || []);
    }).finally(() => setLoading(false));
  }, [search, cat, filter]);

  if (!me) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <Link href="/login?next=/geschenke/neu" style={{ color: "#ec4899" }}>Bitte einloggen</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", textShadow: "0 2px 4px rgba(0,0,0,0.4)" }}>
        🎁 Geschenke-Katalog
      </h1>

      {/* Filter-Pills */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginTop: 14, marginBottom: 14 }}>
        {[
          { id: "all", label: "Alle" },
          { id: "limited", label: "✨ Limitiert" },
          { id: "seasonal", label: "🎄 Saison" },
        ].map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            style={pillStyle(filter === f.id)}>{f.label}</button>
        ))}
        {categories.slice(0, 8).map((c) => (
          <button key={c.code} onClick={() => setCat(cat === c.code ? "" : c.code)}
            style={pillStyle(cat === c.code)}>{c.emoji} {c.label.replace(/^[^\s]+\s/, "")}</button>
        ))}
      </div>

      {/* Suche */}
      <input
        value={search} onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 Suchen…"
        style={{
          width: "100%", padding: 12, borderRadius: 12,
          background: "rgba(255,255,255,0.95)", border: "1px solid rgba(255,255,255,0.3)",
          fontSize: 14, fontFamily: "inherit", outline: "none",
        }}
      />

      {/* Grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        gap: 12, marginTop: 18,
      }}>
        {loading ? (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 40, color: "#fff" }}>⏳…</div>
        ) : gifts.length === 0 ? (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 40, color: "rgba(255,255,255,0.7)" }}>
            🎁 Noch keine Geschenke in dieser Auswahl
          </div>
        ) : gifts.map((g) => (
          <button key={g.id} onClick={() => setSelected(g)} style={{
            background: "rgba(255,255,255,0.95)", borderRadius: 14, padding: 12,
            border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "center",
            transition: "transform 0.1s",
          }}>
            <div style={{
              width: "100%", aspectRatio: "1/1",
              background: g.imageUrl ? `url(${g.imageUrl}) center/contain no-repeat #fafafa` : "#fafafa",
              borderRadius: 10, marginBottom: 8, position: "relative",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36,
            }}>
              {!g.imageUrl && "🎁"}
              {g.isLimited && (
                <span style={{
                  position: "absolute", top: 4, right: 4,
                  background: "linear-gradient(135deg,#fbbf24,#d97706)",
                  color: "#fff", fontSize: 9, fontWeight: 800,
                  padding: "2px 6px", borderRadius: 999, letterSpacing: 0.3,
                }}>✨ {g.limitSold}/{g.limitQty || "∞"}</span>
              )}
              {g.isSeasonal && (
                <span style={{
                  position: "absolute", top: 4, left: 4,
                  background: "linear-gradient(135deg,#a855f7,#ec4899)",
                  color: "#fff", fontSize: 11, padding: "2px 6px", borderRadius: 999,
                }}>🎄</span>
              )}
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#1c1c1e", lineHeight: 1.2 }}>{g.name}</div>
            <div style={{ fontSize: 11, color: "#ec4899", fontWeight: 800, marginTop: 4 }}>{g.price} Vibes</div>
          </button>
        ))}
      </div>

      {/* Beschenken-Modal */}
      {selected && (
        <GiftBeschenkenFlow gift={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function pillStyle(active) {
  return {
    padding: "7px 14px", borderRadius: 999,
    background: active ? "linear-gradient(135deg,#ec4899,#a855f7)" : "rgba(255,255,255,0.15)",
    color: "#fff", border: active ? "none" : "1px solid rgba(255,255,255,0.25)",
    fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
    fontFamily: "inherit",
  };
}
