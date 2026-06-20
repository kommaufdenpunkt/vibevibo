"use client";

// 🗑 Lösch-Countdown-Banner — wird im Layout angezeigt wenn User Lösch-Antrag laufen hat.
// Live-Countdown bis zur endgültigen Löschung. „Bleib doch!"-Button macht's rückgängig.

import { useEffect, useState } from "react";
import { useMe } from "@/lib/useMe";

function fmt(ms) {
  if (ms <= 0) return "0s";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export default function DeleteCountdownBanner() {
  const { me, refresh } = useMe();
  const [status, setStatus] = useState(null);
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!me) return;
    fetch("/api/me/delete-account").then((r) => r.ok ? r.json() : null).then(setStatus).catch(() => {});
  }, [me]);

  useEffect(() => {
    if (!status?.requested) return;
    const iv = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(iv);
  }, [status?.requested]);

  if (!status?.requested) return null;

  const remaining = Math.max(0, (status.scheduledFor || 0) - Date.now());

  async function cancel() {
    setBusy(true);
    try {
      await fetch("/api/me/delete-account", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      setStatus({ requested: false });
      await refresh?.();
    } finally { setBusy(false); }
  }

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 10000,
      background: "linear-gradient(135deg, #ef4444, #b91c1c)",
      color: "#fff",
      padding: "12px 16px",
      boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
      display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
      justifyContent: "center",
    }}>
      <span style={{ fontSize: 22 }}>🗑</span>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontSize: 14, fontWeight: 800 }}>
          Account wird gelöscht in <span style={{ fontFamily: "monospace", background: "rgba(0,0,0,0.2)", padding: "2px 8px", borderRadius: 6 }}>{fmt(remaining)}</span>
        </div>
        <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>
          Wir vermissen dich schon jetzt 💔 — wenn du bleiben willst, einfach klicken:
        </div>
      </div>
      <button onClick={cancel} disabled={busy} style={{
        padding: "10px 18px", borderRadius: 999,
        background: "#fff", color: "#b91c1c",
        border: "none", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
        whiteSpace: "nowrap",
      }}>
        {busy ? "⏳…" : "💚 Account behalten"}
      </button>
    </div>
  );
}
