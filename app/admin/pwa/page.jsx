"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const PLATFORM_LABEL = {
  ios: { name: "iOS", emoji: "🍎", color: "#1e293b" },
  ipados: { name: "iPadOS", emoji: "🍎", color: "#0f172a" },
  android: { name: "Android", emoji: "🤖", color: "#16a34a" },
  windows: { name: "Windows", emoji: "🪟", color: "#0078d4" },
  mac: { name: "macOS", emoji: "💻", color: "#6b7280" },
  linux: { name: "Linux", emoji: "🐧", color: "#475569" },
  desktop: { name: "Desktop", emoji: "🖥️", color: "#475569" },
  unknown: { name: "Unbekannt", emoji: "❓", color: "#9ca3af" },
};

function fmtDate(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtSince(ts) {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "Gerade eben";
  if (h < 24) return `${h}h`;
  return `vor ${Math.floor(h / 24)}d`;
}

export default function AdminPwaPage() {
  const [installs, setInstalls] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch("/api/admin/pwa-installs")
      .then((r) => r.ok ? r.json() : Promise.reject(new Error("nicht autorisiert")))
      .then((d) => setInstalls(d.installs || []))
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div style={{ padding: 24, maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
        <h1>📲 PWA-Installs</h1>
        <p style={{ color: "#dc2626" }}>⚠ {error}</p>
        <Link href="/admin">← Zurück</Link>
      </div>
    );
  }

  if (!installs) {
    return <div style={{ padding: 24, textAlign: "center" }}>Lade…</div>;
  }

  // Statistik
  const byPlatform = {};
  for (const i of installs) {
    const key = i.platform || "unknown";
    byPlatform[key] = (byPlatform[key] || 0) + 1;
  }
  const uniqueUsers = new Set(installs.map((i) => i.userId)).size;

  const filtered = filter === "all" ? installs : installs.filter((i) => i.platform === filter);

  return (
    <div style={{ padding: 16, maxWidth: 920, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>📲 PWA-Installationen</h1>
        <Link href="/admin" style={{ fontSize: 13 }}>← Admin</Link>
      </div>

      {/* Stat-Kacheln */}
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", marginBottom: 18 }}>
        <div style={{ padding: 14, background: "linear-gradient(135deg, #ec4899, #8b5cf6)", color: "#fff", borderRadius: 12, textAlign: "center" }}>
          <div style={{ fontSize: 30, fontWeight: 900 }}>{installs.length}</div>
          <div style={{ fontSize: 11, opacity: 0.9, fontWeight: 700 }}>Installationen gesamt</div>
        </div>
        <div style={{ padding: 14, background: "linear-gradient(135deg, #06b6d4, #3b82f6)", color: "#fff", borderRadius: 12, textAlign: "center" }}>
          <div style={{ fontSize: 30, fontWeight: 900 }}>{uniqueUsers}</div>
          <div style={{ fontSize: 11, opacity: 0.9, fontWeight: 700 }}>Eindeutige User</div>
        </div>
        {Object.entries(byPlatform).sort((a, b) => b[1] - a[1]).map(([plat, n]) => {
          const lbl = PLATFORM_LABEL[plat] || PLATFORM_LABEL.unknown;
          return (
            <div key={plat} style={{ padding: 14, background: "#fff", border: `2px solid ${lbl.color}`, borderRadius: 12, textAlign: "center" }}>
              <div style={{ fontSize: 24 }}>{lbl.emoji}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: lbl.color }}>{n}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: lbl.color }}>{lbl.name}</div>
            </div>
          );
        })}
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto", paddingBottom: 4 }}>
        <FilterChip label="Alle" active={filter === "all"} onClick={() => setFilter("all")} />
        {Object.keys(byPlatform).sort().map((p) => {
          const lbl = PLATFORM_LABEL[p] || PLATFORM_LABEL.unknown;
          return (
            <FilterChip key={p} label={`${lbl.emoji} ${lbl.name}`} active={filter === p} onClick={() => setFilter(p)} />
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: 30, textAlign: "center", color: "#9ca3af" }}>
          Noch keine Installationen
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", border: "1px solid #e5e7eb" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f3f4f6", color: "#374151", textAlign: "left" }}>
                <th style={th}>User</th>
                <th style={th}>Plattform</th>
                <th style={th}>Installiert</th>
                <th style={th}>Zuletzt aktiv</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i, idx) => {
                const lbl = PLATFORM_LABEL[i.platform] || PLATFORM_LABEL.unknown;
                return (
                  <tr key={idx} style={{ borderTop: "1px solid #e5e7eb" }}>
                    <td style={td}>
                      <Link href={`/u/${i.username}`} style={{ fontWeight: 700, color: "#1f2937", textDecoration: "none" }}>
                        {i.displayName || i.username}
                      </Link>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>@{i.username}</div>
                    </td>
                    <td style={td}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "3px 10px", borderRadius: 999,
                        background: `${lbl.color}22`, color: lbl.color, fontWeight: 700, fontSize: 11,
                      }}>{lbl.emoji} {lbl.name}</span>
                    </td>
                    <td style={td}>{fmtDate(i.installedAt)}</td>
                    <td style={td}>{fmtSince(i.lastSeen)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th = { padding: "10px 12px", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 };
const td = { padding: "10px 12px" };

function FilterChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0,
        padding: "6px 12px",
        borderRadius: 999,
        border: "1.5px solid #ddd",
        background: active ? "linear-gradient(135deg, #ec4899, #8b5cf6)" : "#fff",
        color: active ? "#fff" : "#374151",
        fontWeight: 700,
        fontSize: 12,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >{label}</button>
  );
}
