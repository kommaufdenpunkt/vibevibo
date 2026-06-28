"use client";

// 👥 Öffentliche Mitglieder-Page — Discovery mit Suche + Filter
//    Respektiert alle Block-Filter automatisch via API.
//    Farben auf Theme-Variablen umgestellt → dunkel im Dark-Mode, hell im Light-Mode.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import FriendButton from "@/components/FriendButton";
import BlockButton from "@/components/BlockButton";
import { useMe } from "@/lib/useMe";

const FILTERS = [
  { id: "all",      label: "👥 Alle" },
  { id: "online",   label: "🟢 Online" },
  { id: "new",      label: "🆕 Neu" },
  { id: "vip",      label: "👑 VIP" },
  { id: "birthday", label: "🎂 Geburtstag heute" },
];

function ageFrom(bd) {
  if (!bd) return null;
  const d = new Date(bd);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const thisYear = new Date(now.getFullYear(), d.getMonth(), d.getDate());
  if (now < thisYear) a--;
  return a > 0 ? a : null;
}

export default function MitgliederPage() {
  const { me, loading } = useMe();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const params = new URLSearchParams({ q, filter, page: String(page) });
      const r = await fetch(`/api/members?${params.toString()}`);
      if (r.ok) setData(await r.json());
      else setData({ error: (await r.json().catch(() => ({}))).error || "Fehler" });
    } finally { setBusy(false); }
  }, [q, filter, page]);

  useEffect(() => { if (me) refresh(); }, [me, refresh]);
  useEffect(() => { setPage(1); }, [q, filter]);

  if (loading) return null;
  if (!me) {
    return (
      <div style={{ maxWidth: 500, margin: "40px auto", padding: 20, textAlign: "center" }}>
        <h2 style={{ color: "#ffffff" }}>👥 Mitglieder</h2>
        <p style={{ color: "rgba(255,255,255,0.85)" }}>
          <Link href="/login?next=/mitglieder" style={{ color: "#a855f7", fontWeight: 700 }}>
            Bitte einloggen
          </Link>
          {" — Mitglieder-Liste ist nur für eingeloggte Nutzer sichtbar."}
        </p>
      </div>
    );
  }

  const totalPages = data?.total ? Math.ceil(data.total / data.pageSize) : 0;

  return (
    <div style={{ maxWidth: 1100, margin: "20px auto", padding: 14 }}>
      {/* Header (Text auf dunklem Body → hell) */}
      <h1 style={{
        fontSize: 26, fontWeight: 900, color: "#ffffff", margin: "0 0 4px",
        textShadow: "0 2px 4px rgba(0,0,0,0.6)",
      }}>
        👥 Mitglieder
      </h1>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", margin: "0 0 14px", fontWeight: 500, lineHeight: 1.5 }}>
        Alle aktiven Mitglieder — sortiert nach letzter Aktivität.
        {data?.total != null && (
          <strong> {data.total} gesamt</strong>
        )}
      </p>

      {/* Search */}
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="🔍 Name, @username, Stadt oder Schule…"
        style={{
          width: "100%", padding: "12px 16px", borderRadius: 12,
          border: "1.5px solid var(--vv-border, #cbd5e1)", fontSize: 14,
          fontFamily: "inherit", boxSizing: "border-box",
          background: "var(--vv-card, rgba(255,255,255,0.95))",
          color: "var(--vv-text, #1c1c1e)",
          marginBottom: 10,
        }}
      />

      {/* Filter Pills */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16,
      }}>
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              padding: "8px 14px", borderRadius: 999, fontSize: 12, fontWeight: 800,
              background: active ? "linear-gradient(135deg, #ec4899, #a855f7)" : "var(--vv-card, rgba(255,255,255,0.85))",
              color: active ? "#fff" : "var(--vv-text, #475569)",
              border: active ? "1.5px ridge #fff" : "1.5px solid var(--vv-border, rgba(0,0,0,0.08))",
              cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
              boxShadow: active ? "0 2px 6px rgba(236,72,153,0.3)" : "none",
            }}>{f.label}</button>
          );
        })}
      </div>

      {/* Grid */}
      {data?.error ? (
        <div style={{
          padding: 20, background: "rgba(239,68,68,0.1)", color: "#991b1b",
          borderRadius: 12, fontSize: 13, fontWeight: 700,
        }}>⚠ {data.error}</div>
      ) : !data ? (
        <div style={{ padding: 30, textAlign: "center", color: "rgba(255,255,255,0.7)" }}>Lädt…</div>
      ) : data.members.length === 0 ? (
        <div style={{
          padding: 40, textAlign: "center", color: "var(--vv-text, #475569)",
          background: "var(--vv-card, rgba(255,255,255,0.7))", borderRadius: 14,
          border: "1px dashed var(--vv-border, rgba(0,0,0,0.08))",
        }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🌸</div>
          <strong>Keine Mitglieder gefunden</strong>
          <div style={{ fontSize: 12, marginTop: 6 }}>
            Versuch eine andere Suche oder einen anderen Filter.
          </div>
        </div>
      ) : (
        <>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 12,
            opacity: busy ? 0.6 : 1,
            transition: "opacity 0.15s",
          }}>
            {data.members.map((m) => <MemberCard key={m.id} m={m} />)}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: "flex", justifyContent: "center", alignItems: "center",
              gap: 12, marginTop: 24,
            }}>
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1 || busy}
                style={pgBtn(page > 1 && !busy)}
              >← Zurück</button>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: 800 }}>
                Seite {page} von {totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={!data.hasMore || busy}
                style={pgBtn(data.hasMore && !busy)}
              >Weiter →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function pgBtn(enabled) {
  return {
    padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 800,
    background: enabled ? "linear-gradient(135deg, #ec4899, #a855f7)" : "#64748b",
    color: "#fff", border: "none",
    cursor: enabled ? "pointer" : "not-allowed",
    fontFamily: "inherit",
  };
}

function MemberCard({ m }) {
  const age = ageFrom(m.birthdate);
  const online = m.lastSeen && (Date.now() - m.lastSeen < 5 * 60 * 1000);
  const showAvatar = m.avatarStatus === "approved" && m.avatarUrl;
  const hasVIP = m.premiumBadges && m.premiumBadges !== "" && m.premiumBadges !== "[]";

  return (
    <div style={{
      background: "var(--vv-card, rgba(255,255,255,0.95))", borderRadius: 14, padding: 14,
      border: "1.5px solid var(--vv-border, rgba(0,0,0,0.06))",
      display: "flex", flexDirection: "column", gap: 10,
      boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
    }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {/* Avatar */}
        <Link href={`/u/${m.username}`} style={{
          position: "relative", flexShrink: 0,
          width: 56, height: 56, borderRadius: "50%",
          background: showAvatar
            ? `url(${m.avatarUrl}) center/cover no-repeat`
            : "linear-gradient(135deg, #5b21b6, #be185d)",
          border: "2px solid rgba(255,255,255,0.15)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 26, textDecoration: "none",
        }}>
          {!showAvatar && <span>{m.emoji || "👤"}</span>}
          {online && (
            <span style={{
              position: "absolute", bottom: 0, right: 0,
              width: 14, height: 14, borderRadius: "50%",
              background: "#22c55e", border: "2px solid #0c0d0f",
            }} title="Online" />
          )}
          {hasVIP && (
            <span style={{
              position: "absolute", top: -4, right: -4,
              fontSize: 14,
            }} title="VIP">👑</span>
          )}
        </Link>

        {/* Name + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link href={`/u/${m.username}`} style={{
            fontSize: 14, fontWeight: 800, color: "var(--vv-text, #1c1c1e)",
            textDecoration: "none", display: "block",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {m.displayName || m.username}
          </Link>
          <div style={{ fontSize: 11, color: "var(--vv-muted, #94a3b8)", marginTop: 2 }}>
            @{m.username}
            {age && (
              <> · {m.gender === "w" ? "♀" : m.gender === "m" ? "♂" : ""} {age}</>
            )}
          </div>
          {m.city && (
            <div style={{ fontSize: 11, color: "var(--vv-muted, #94a3b8)", marginTop: 2,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              📍 {m.city}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{
        display: "flex", gap: 6, alignItems: "center", justifyContent: "space-between",
        paddingTop: 8, borderTop: "1px solid var(--vv-border, rgba(0,0,0,0.06))",
      }}>
        <FriendButton username={m.username} />
        <BlockButton username={m.username} compact />
      </div>
    </div>
  );
}
