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
          background: "linear-gradient(180deg, #2563eb, #1e40af)",
          color: "#fff", border: "2px solid #1e3a8a",
          cursor: busy ? "wait" : "pointer", fontFamily: "Tahoma, Verdana, sans-serif",
          fontWeight: 800, fontSize: 13, letterSpacing: 0.3,
          textShadow: "0 1px 1px rgba(0,0,0,0.3)",
          display: "inline-flex", alignItems: "center", gap: 6,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), 0 3px 10px rgba(30,64,175,0.45)",
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
          background: "linear-gradient(180deg, #f97316, #ea580c)",
          color: "#fff", border: "2px solid #c2410c",
          cursor: busy ? "wait" : "pointer", fontFamily: "Tahoma, Verdana, sans-serif",
          fontWeight: 800, fontSize: 13, letterSpacing: 0.3,
          textShadow: "0 1px 1px rgba(0,0,0,0.3)",
          display: "inline-flex", alignItems: "center", gap: 6,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), 0 3px 10px rgba(234,88,12,0.45)",
          animation: !busy ? "vv-call-pulse 2.4s ease-in-out infinite 0.3s" : "none",
        }}
      >
        <span style={{ fontSize: 16 }}>🎥</span>
        <span>Video-Call</span>
      </button>

      <style>{`
        @keyframes vv-call-pulse {
          0%, 100% { transform: translateY(0); box-shadow: inset 0 1px 0 rgba(255,255,255,0.3), 0 3px 10px rgba(30,64,175,0.45); }
          50%      { transform: translateY(-2px); box-shadow: inset 0 1px 0 rgba(255,255,255,0.3), 0 6px 16px rgba(30,64,175,0.6); }
        }
      `}</style>
    </div>
  );
}
