"use client";

// 📼 Throwback-Widget — zeigt alte Posts der Com, gruppiert nach "vor X Monaten/Jahren".

import { useEffect, useState } from "react";

export default function ComThrowback({ slug, themeColor = "#ec4899" }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/groups/${encodeURIComponent(slug)}/throwback`, { credentials: "include" });
        if (!r.ok) return;
        const d = await r.json();
        if (!cancelled) setPosts(d.throwbacks || []);
      } catch {}
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) return null;
  if (posts.length === 0) return null;

  // Gruppiert nach Zeit-Bucket
  const groups = {};
  const now = Date.now();
  for (const p of posts) {
    const bucket = ageBucket(now - p.at);
    if (!groups[bucket]) groups[bucket] = [];
    groups[bucket].push(p);
  }
  const bucketOrder = Object.keys(groups).sort((a, b) => bucketWeight(a) - bucketWeight(b));

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(255,255,255,0.96), rgba(254,243,199,0.96))",
      borderRadius: 14, padding: 12, marginBottom: 12,
      border: `2px dashed ${themeColor}55`,
      boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
        cursor: "pointer",
      }} onClick={() => setCollapsed((c) => !c)}>
        <span style={{ fontSize: 22 }}>📼</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#92400e" }}>
            Throwback {posts.length > 0 && `· ${posts.length}`}
          </div>
          <div style={{ fontSize: 11, color: "#a16207" }}>
            Damals, in dieser Com…
          </div>
        </div>
        <span style={{ fontSize: 18, color: "#a16207" }}>{collapsed ? "▸" : "▾"}</span>
      </div>

      {!collapsed && bucketOrder.map((bucket) => (
        <div key={bucket} style={{ marginBottom: 10 }}>
          <div style={{
            fontSize: 11, fontWeight: 800, color: "#92400e",
            letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4,
            padding: "0 2px",
          }}>
            🕰 {bucket}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {groups[bucket].map((p) => (
              <div key={p.id} style={{
                background: "rgba(255,255,255,0.85)",
                padding: 8, borderRadius: 8,
                border: "1px solid rgba(146,64,14,0.15)",
              }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3 }}>
                  <span style={{ fontSize: 14 }}>{p.emoji || "👤"}</span>
                  <span style={{ fontSize: 11, color: "#78350f", fontWeight: 700 }}>
                    {p.displayName || `@${p.username}`}
                  </span>
                  <span style={{ fontSize: 10, color: "#a16207", marginLeft: "auto" }}>
                    {fmtExact(p.at)}
                  </span>
                </div>
                <div style={{
                  fontSize: 12.5, color: "#451a03", lineHeight: 1.4,
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>
                  {(p.text || "").slice(0, 180)}
                  {(p.text || "").length > 180 && "…"}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ageBucket(deltaMs) {
  const days = Math.floor(deltaMs / (24 * 3600 * 1000));
  if (days < 60) return `Vor ${days} Tagen`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Vor ${months} Monaten`;
  const years = Math.floor(days / 365);
  return years === 1 ? "Vor 1 Jahr" : `Vor ${years} Jahren`;
}
function bucketWeight(b) {
  // sortiert: kürzeste Vergangenheit zuerst
  const m = b.match(/(\d+)/);
  const n = m ? Number(m[1]) : 0;
  if (b.includes("Tag")) return n;
  if (b.includes("Monat")) return 60 + n * 30;
  if (b.includes("Jahr")) return 1000 + n * 365;
  return 9999;
}
function fmtExact(ts) {
  return new Date(ts).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });
}
