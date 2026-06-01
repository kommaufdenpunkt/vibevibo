"use client";

// Wartungsmodus: vollflächiger Block über die App, sobald Admin den Modus
// einschaltet. /admin bleibt erreichbar, damit man wieder rauskommt.

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function MaintenanceGate() {
  const pathname = usePathname() || "";
  const [state, setState] = useState(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const r = await fetch("/api/maintenance", { cache: "no-store" });
        if (!r.ok) return;
        const data = await r.json();
        if (alive) setState(data);
      } catch {}
    }
    load();
    const t = setInterval(load, 30_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  if (!state?.maintenance) return null;
  // Admin-Pfade nicht blockieren, sonst kommt niemand mehr ran
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/")) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "linear-gradient(180deg, #1a0a3e 0%, #0a0420 100%)",
      color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 30, textAlign: "center",
      fontFamily: "Arial, sans-serif",
    }}>
      <div style={{ fontSize: 80, marginBottom: 14 }}>🔧</div>
      <h1 style={{
        margin: 0, fontSize: 36, color: "#fff700",
        textShadow: "2px 2px 0 #ff3e9d, 4px 4px 0 #000",
        fontFamily: '"Comic Sans MS","Chalkboard SE", cursive',
      }}>Wartungs-Pause</h1>
      <div style={{ marginTop: 18, maxWidth: 540, fontSize: 16, lineHeight: 1.55 }}>
        {state.message || "Wir sind kurz weg — gleich wieder da."}
      </div>
      <div style={{ marginTop: 24, fontSize: 12, color: "#a9b0c0" }}>
        ✿ deine Erinnerungen, deine Community, dein Vibe ✿
      </div>
    </div>
  );
}
