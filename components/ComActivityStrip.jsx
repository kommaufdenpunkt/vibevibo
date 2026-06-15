"use client";

// 📊 ComActivityStrip — Mini-Timeline der letzten Events in einer Com.

import { useEffect, useState } from "react";
import Link from "next/link";

const KIND = {
  thread: { emoji: "📖", verb: "hat einen neuen Thread gestartet" },
  join:   { emoji: "✿", verb: "ist beigetreten" },
  post:   { emoji: "💬", verb: "hat an die Wand geschrieben" },
};

export default function ComActivityStrip({ slug, themeColor = "#ec4899" }) {
  const [items, setItems] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/groups/${slug}/activity`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (!cancelled) setItems(d?.activity || []); })
      .catch(() => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, [slug]);

  if (items === null || items.length === 0) return null;

  return (
    <div style={{
      background: "rgba(255,255,255,0.92)",
      backdropFilter: "blur(12px)",
      borderRadius: 14, padding: 12, marginBottom: 12,
      border: `1px solid ${themeColor}33`,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 800, color: themeColor,
        letterSpacing: 0.8, textTransform: "uppercase",
        marginBottom: 8,
      }}>📊 Was war los</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((it, i) => {
          const k = KIND[it.kind] || { emoji: "•", verb: "" };
          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8,
              fontSize: 12, color: "#475569",
              padding: "4px 0",
              borderBottom: i < items.length - 1 ? "1px dashed rgba(0,0,0,0.06)" : "none",
            }}>
              <span style={{ fontSize: 14 }}>{k.emoji}</span>
              <span style={{ fontSize: 16 }}>{it.actorEmoji || "👤"}</span>
              <Link href={`/u/${it.actorUsername}`} style={{
                color: themeColor, fontWeight: 800, textDecoration: "none",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                maxWidth: 120,
              }}>{it.actorDisplayName || it.actorUsername}</Link>
              <span style={{ color: "#64748b" }}>{k.verb}</span>
              {it.title && (
                <span style={{
                  color: "#1f2937", fontWeight: 700,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  flex: 1, minWidth: 0,
                }}>· {it.title}</span>
              )}
              <span style={{ marginLeft: "auto", color: "#94a3b8", fontSize: 10.5, whiteSpace: "nowrap" }}>
                {relTime(it.at)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function relTime(ms) {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  const s = Math.floor(diff / 1000);
  if (s < 60) return "eben";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(ms).toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
}
