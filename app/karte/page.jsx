"use client";

import { useState } from "react";
import Link from "next/link";
import { useMe } from "@/lib/useMe";
import WorldMap from "@/components/WorldMap";
import WorldInventory from "@/components/WorldInventory";

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
        <button type="button" onClick={() => setTab("map")}
          style={{
            flex: 1, padding: "12px", border: "none",
            background: tab === "map" ? "var(--vv-card,#fff)" : "transparent",
            fontWeight: tab === "map" ? 700 : 500,
            cursor: "pointer", borderBottom: tab === "map" ? "3px solid #ec4899" : "3px solid transparent",
            fontFamily: "inherit", fontSize: 14,
          }}>🗺️ Karte</button>
        <button type="button" onClick={() => setTab("inv")}
          style={{
            flex: 1, padding: "12px", border: "none",
            background: tab === "inv" ? "var(--vv-card,#fff)" : "transparent",
            fontWeight: tab === "inv" ? 700 : 500,
            cursor: "pointer", borderBottom: tab === "inv" ? "3px solid #ec4899" : "3px solid transparent",
            fontFamily: "inherit", fontSize: 14,
          }}>🎒 Inventar</button>
      </div>
      {tab === "map" && <WorldMap />}
      {tab === "inv" && <WorldInventory />}
    </div>
  );
}
