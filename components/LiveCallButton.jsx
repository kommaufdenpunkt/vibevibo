"use client";

// 📞 Live-Call-Button — sensationelle Buttons für Anrufe + Video.
// Triggert das globale "vv-start-call"-Event, das von LiveCallShell behandelt wird.

import { useState } from "react";

export default function LiveCallButton({ partnerUsername, partnerDisplayName }) {
  const [busy, setBusy] = useState(false);

  function call(withVideo) {
    if (busy) return;
    setBusy(true);
    try {
      window.dispatchEvent(new CustomEvent("vv-start-call", {
        detail: { type: "direct", partnerUsername, withVideo },
      }));
    } finally {
      setTimeout(() => setBusy(false), 1500);
    }
  }

  return (
    <div style={{
      display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center",
      margin: "12px 0",
    }}>
      <button
        type="button"
        disabled={busy}
        onClick={() => call(false)}
        title={`${partnerDisplayName} anrufen (nur Audio)`}
        style={{
          padding: "10px 18px", borderRadius: 999,
          background: "linear-gradient(135deg, #8b6f47, #6e5837)",
          color: "#fff", border: "3px ridge #fff",
          cursor: busy ? "wait" : "pointer", fontFamily: "inherit",
          fontWeight: 900, fontSize: 13, letterSpacing: 0.5,
          textShadow: "0 1px 2px rgba(0,0,0,0.3)",
          display: "inline-flex", alignItems: "center", gap: 6,
          boxShadow: "0 4px 12px rgba(139,111,71,0.4)",
          animation: !busy ? "vv-call-pulse 2.4s ease-in-out infinite" : "none",
        }}
      >
        <span style={{ fontSize: 16 }}>📞</span>
        <span>{busy ? "📡 Verbinde…" : "Anrufen"}</span>
      </button>

      <button
        type="button"
        disabled={busy}
        onClick={() => call(true)}
        title={`${partnerDisplayName} per Video anrufen`}
        style={{
          padding: "10px 18px", borderRadius: 999,
          background: "linear-gradient(135deg, #a3473d, #7a2e26)",
          color: "#fff", border: "3px ridge #fff",
          cursor: busy ? "wait" : "pointer", fontFamily: "inherit",
          fontWeight: 900, fontSize: 13, letterSpacing: 0.5,
          textShadow: "0 1px 2px rgba(0,0,0,0.3)",
          display: "inline-flex", alignItems: "center", gap: 6,
          boxShadow: "0 4px 12px rgba(163,71,61,0.4)",
          animation: !busy ? "vv-call-pulse 2.4s ease-in-out infinite 0.3s" : "none",
        }}
      >
        <span style={{ fontSize: 16 }}>🎥</span>
        <span>Video-Call</span>
      </button>

      <style>{`
        @keyframes vv-call-pulse {
          0%, 100% { transform: translateY(0); box-shadow: 0 4px 12px rgba(139,111,71,0.4); }
          50%      { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(139,111,71,0.55); }
        }
      `}</style>
    </div>
  );
}
