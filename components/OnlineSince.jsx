"use client";

// ⏱️ „Online seit X" — ICQ-Nostalgie. Tickt jede Minute weiter.

import { useEffect, useState } from "react";

function fmt(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const rest = m - h * 60;
  if (h < 24) return rest ? `${h}h ${rest}min` : `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}T ${h - d * 24}h`;
}

export default function OnlineSince({ onlineSince, online }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!online) return;
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [online]);
  if (!online || !onlineSince) return null;
  return (
    <span title="Online seit" style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: "#dcfce7", color: "#166534",
      padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700,
      border: "1px solid #86efac",
    }}>
      ⏱ {fmt(now - onlineSince)}
    </span>
  );
}
