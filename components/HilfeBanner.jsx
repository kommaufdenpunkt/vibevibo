"use client";

// 💛 HilfeBanner — sanftes Pop-up bei Krisen-Signalen oder SOS-Aktivierung.
// Zeigt Telefonseelsorge + Krisenchat + Notruf-Optionen.

import { useState, useEffect } from "react";

export default function HilfeBanner({ risk = "high", help, onClose }) {
  const [visible, setVisible] = useState(true);

  if (!visible || !help) return null;

  return (
    <div style={{
      position: "fixed", bottom: 20, left: 20, right: 20, zIndex: 9999,
      maxWidth: 480, margin: "0 auto",
      background: "linear-gradient(135deg, #fff, #fef3f5)",
      border: "2px solid #ec4899",
      borderRadius: 18,
      padding: 22,
      boxShadow: "0 20px 60px rgba(236,72,153,0.3)",
    }}>
      <button
        onClick={() => { setVisible(false); onClose?.(); }}
        style={{
          position: "absolute", top: 12, right: 14,
          background: "transparent", border: "none",
          fontSize: 20, cursor: "pointer", color: "#94a3b8",
        }}
      >×</button>

      <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 900, color: "#1c1c1e" }}>
        {help.title}
      </h3>
      <p style={{ fontSize: 13, color: "#475569", margin: "0 0 14px", lineHeight: 1.5 }}>
        Egal was los ist — du musst das nicht alleine durchstehen. Hier kannst du sofort mit jemand reden:
      </p>

      <div style={{ display: "grid", gap: 10 }}>
        {help.resources.map((r, i) => (
          <div key={i} style={{
            background: "#fff", padding: 12, borderRadius: 12,
            border: "1px solid rgba(236,72,153,0.2)",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#1c1c1e" }}>{r.name}</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{r.note}</div>
            </div>
            {r.contact.startsWith("→") ? (
              <a href={r.contact.slice(2)} style={btnLink()}>{r.contact.slice(2)}</a>
            ) : r.contact.includes(".") ? (
              <a href={`https://${r.contact.replace(/^https?:\/\//, "")}`} target="_blank" rel="noopener" style={btnLink()}>{r.contact}</a>
            ) : (
              <a href={`tel:${r.contact.replace(/[^0-9+]/g, "")}`} style={btnLink()}>{r.contact}</a>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 14, fontSize: 11, color: "#94a3b8", textAlign: "center" }}>
        💛 Du bist nicht alleine. VibeVibo ist da, aber Experten sind dafür da, um wirklich zu helfen.
      </div>
    </div>
  );
}

function btnLink() {
  return {
    padding: "8px 14px", borderRadius: 999,
    background: "linear-gradient(135deg, #ec4899, #a855f7)",
    color: "#fff", textDecoration: "none",
    fontWeight: 800, fontSize: 12, whiteSpace: "nowrap",
  };
}
