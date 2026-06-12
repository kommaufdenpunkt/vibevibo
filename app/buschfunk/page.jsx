"use client";

// 📣 Eigene Buschfunk-Seite — zeigt den Buschfunk-Stream standalone.
// Wird ueber EdgePanels (links Community / rechts Schnell-Aktionen)
// und ueber /spiele referenziert.

import Link from "next/link";
import Buschfunk from "@/components/Buschfunk";
import { useMe } from "@/lib/useMe";

export default function BuschfunkPage() {
  const { me } = useMe();

  if (!me) {
    return (
      <div style={{ padding: 24, maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
        <h1>📣 Buschfunk</h1>
        <p style={{ color: "#6b7280" }}>
          Logge dich ein, um den Buschfunk zu sehen — Freundes-News, Status & mehr.
        </p>
        <Link href="/login?next=/buschfunk"
          style={{
            display: "inline-block", padding: "10px 18px", borderRadius: 999,
            background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
            color: "#fff", fontWeight: 700, textDecoration: "none",
          }}>
          🔑 Einloggen
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 12, maxWidth: 760, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>📣 Buschfunk</h1>
        <Link href="/" style={{ fontSize: 13, color: "#6b7280" }}>← Start</Link>
      </div>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 14 }}>
        Hier laufen alle Neuigkeiten zusammen — von Freunden zuerst, danach aus dem Netz.
      </div>
      <Buschfunk />
    </div>
  );
}
