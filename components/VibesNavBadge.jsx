"use client";

// Vibes-Saldo-Pille für die Navbar. Pollt alle 60s leise.
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

export default function VibesNavBadge() {
  const [bal, setBal] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = () => api.credits()
      .then((d) => { if (alive) setBal(d.balance); })
      .catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  if (bal == null) return null;

  return (
    <Link
      href="/messenger?tab=vibo"
      title={`Du hast ${bal} Vibes – tippen für Details`}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "5px 10px", borderRadius: 999,
        background: "rgba(255,255,255,0.15)",
        border: "1px solid rgba(255,255,255,0.35)",
        color: "#fff", textDecoration: "none",
        fontSize: 13, fontWeight: 700, lineHeight: 1,
      }}
    >
      <span style={{ fontSize: 14 }}>✨</span>
      <span>{bal}</span>
    </Link>
  );
}
