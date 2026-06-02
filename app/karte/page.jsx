"use client";

import { useState } from "react";
import Link from "next/link";
import { useMe } from "@/lib/useMe";
import WorldMap from "@/components/WorldMap";
import WorldInventory from "@/components/WorldInventory";
import MarketPanel from "@/components/MarketPanel";

const TABS = [
  ["map", "🗺️ Karte"],
  ["inv", "🎒 Inventar"],
  ["market", "🏪 Basar"],
];

export default function KartePage() {
  const { me, loading } = useMe();
  const [tab, setTab] = useState("map");

  if (loading) return null;
  if (!me) return (
    <div className="vv-card" style={{ textAlign: "center", padding: 30 }}>
      <h2>🗺️ Realitätskarte</h2>
      <p>Du musst eingeloggt sein, um die Karte zu nutzen.</p>
      <Link href="/login" className="vv-btn-big vv-btn-big-pink">Zum Login</Link>
    </div>
  );

  return (
    <div className="vv-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", borderBottom: "1px solid var(--vv-border,#eee)" }}>
        {TABS.map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)}
            style={{
              flex: 1, padding: "12px", border: "none",
              background: tab === k ? "var(--vv-card,#fff)" : "transparent",
              color: "var(--vv-text,#1c1c1e)",
              fontWeight: tab === k ? 700 : 500,
              cursor: "pointer", borderBottom: tab === k ? "3px solid #ec4899" : "3px solid transparent",
              fontFamily: "inherit", fontSize: 14,
            }}>{label}</button>
        ))}
      </div>
      {tab === "map" && <WorldMap />}
      {tab === "inv" && <WorldInventory />}
      {tab === "market" && <MarketPanel />}
    </div>
  );
}
