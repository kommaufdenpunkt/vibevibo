"use client";

// 💬 Archiv — alle archivierten Chat-Nachrichten in einer Liste.
// User kann Nachrichten wieder zurückholen (Unarchive) oder dauerhaft löschen.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { useMe } from "@/lib/useMe";

export default function ArchivPage() {
  const { me } = useMe();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(null);
  const [filter, setFilter] = useState("all"); // all | from-me | to-me

  const refresh = useCallback(() => {
    fetch("/api/me/message-archive")
      .then((r) => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => {});
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  if (!me) {
    return (
      <div style={{ padding: 24, maxWidth: 480, margin: "40px auto 0", textAlign: "center" }}>
        <div style={{ fontSize: 50 }}>📂</div>
        <h1>Archiv</h1>
        <p>Bitte einloggen.</p>
        <Link href="/login?next=/messenger/archiv" className="vv-btn">🔑 Einloggen</Link>
      </div>
    );
  }

  if (!data) return <div className="vv-card" style={{ maxWidth: 720, margin: "20px auto" }}>Lädt...</div>;

  const all = data.messages || [];
  const filtered = filter === "from-me"
    ? all.filter((m) => m.fromId === data.myUserId)
    : filter === "to-me"
      ? all.filter((m) => m.toId === data.myUserId)
      : all;

  async function unarchive(id) {
    setBusy(id);
    try {
      await fetch(`/api/messages/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unarchive" }),
      });
      refresh();
    } finally { setBusy(null); }
  }

  return (
    <div style={{ maxWidth: 760, margin: "20px auto", padding: 12 }}>
      <div style={{
        background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.12))",
        border: "1px solid rgba(99,102,241,0.3)",
        borderRadius: 16, padding: 18, marginBottom: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 32 }}>📂</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>Chat-Archiv</h1>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#475569" }}>
              Hier sind die Nachrichten, die du aus dem Chat-Verlauf archiviert hast.
            </p>
          </div>
          <Link href="/messenger" style={{
            background: "#fff", color: "#475569",
            padding: "8px 14px", borderRadius: 999,
            fontWeight: 700, fontSize: 12, textDecoration: "none",
            border: "1px solid rgba(0,0,0,0.08)",
          }}>← Messenger</Link>
        </div>
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {[
          { id: "all", label: `Alle (${all.length})` },
          { id: "from-me", label: "Von mir" },
          { id: "to-me", label: "An mich" },
        ].map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: "8px 12px", borderRadius: 999,
            background: filter === f.id
              ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
              : "rgba(255,255,255,0.85)",
            color: filter === f.id ? "#fff" : "#475569",
            border: "none", fontWeight: 700, fontSize: 12,
            cursor: "pointer", fontFamily: "inherit",
          }}>{f.label}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{
          background: "rgba(255,255,255,0.85)", padding: 30, borderRadius: 16,
          textAlign: "center", color: "#64748b",
        }}>
          <div style={{ fontSize: 40, marginBottom: 6 }}>📭</div>
          <h3 style={{ margin: "0 0 6px" }}>Noch nichts archiviert.</h3>
          <p style={{ fontSize: 13 }}>
            Im Chat kannst du wichtige Nachrichten archivieren — dann landen sie hier
            und nicht mehr im normalen Verlauf.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map((m) => {
            const fromMe = m.fromId === data.myUserId;
            const partner = fromMe
              ? { username: m.toUsername, displayName: m.toDisplayName, avatarUrl: m.toAvatarUrl, avatarStatus: m.toAvatarStatus }
              : { username: m.fromUsername, displayName: m.fromDisplayName, avatarUrl: m.fromAvatarUrl, avatarStatus: m.fromAvatarStatus };
            return (
              <div key={m.id} style={{
                background: "rgba(255,255,255,0.92)", borderRadius: 12, padding: 14,
                border: "1px solid rgba(99,102,241,0.15)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <Avatar
                    url={partner.avatarStatus === "approved" ? partner.avatarUrl : ""}
                    name={partner.displayName}
                    className="vv-avatar vv-avatar-sm"
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800 }}>
                      {fromMe ? `Du → ${partner.displayName}` : `${partner.displayName} → Du`}
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>
                      {new Date(m.at).toLocaleString("de-DE", {
                        day: "2-digit", month: "2-digit", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <button onClick={() => unarchive(m.id)} disabled={busy === m.id} style={{
                    padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                    background: "rgba(34,197,94,0.12)", color: "#15803d",
                    border: "1px solid rgba(34,197,94,0.3)",
                    cursor: busy === m.id ? "wait" : "pointer", fontFamily: "inherit",
                  }}>↩ Zurück</button>
                </div>
                <div style={{
                  fontSize: 14, color: "#1c1c1e",
                  whiteSpace: "pre-wrap", lineHeight: 1.5,
                  padding: "8px 12px", borderRadius: 8,
                  background: fromMe ? "rgba(99,102,241,0.06)" : "rgba(236,72,153,0.06)",
                }}>
                  {m.text || (m.kind === "voice" ? "🎤 Sprachnachricht" : "📷 Bild")}
                </div>
                {m.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.imageUrl} alt="" style={{
                    maxWidth: "100%", maxHeight: 200, borderRadius: 8, marginTop: 8,
                  }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
