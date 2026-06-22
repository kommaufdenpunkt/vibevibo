"use client";

// 🚫 /blockierte — Verwaltung der eigenen Block-Liste

import { useState, useEffect } from "react";
import Link from "next/link";
import { useMe } from "@/lib/useMe";

export default function BlockierteSeite() {
  const { me, loading } = useMe();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(0);

  async function refresh() {
    const r = await fetch("/api/me/blocks");
    if (r.ok) setData(await r.json());
    else setData({ error: (await r.json().catch(() => ({}))).error || "Fehler" });
  }

  useEffect(() => { if (me) refresh(); }, [me]);

  async function unblock(id, username) {
    if (!confirm(`@${username} entblockieren? Ihr seht euch danach wieder.`)) return;
    setBusy(id);
    try {
      const r = await fetch(`/api/me/blocks/${id}`, { method: "DELETE" });
      if (r.ok) setData(await r.json());
    } finally { setBusy(0); }
  }

  if (loading) return null;
  if (!me) {
    return (
      <div style={{ maxWidth: 500, margin: "40px auto", padding: 20, textAlign: "center" }}>
        <h2 style={{ color: "#1c1c1e" }}>🚫 Blockierte User</h2>
        <p style={{ color: "#475569" }}>
          <Link href="/login?next=/blockierte" style={{ color: "#a855f7" }}>Bitte einloggen</Link>
        </p>
      </div>
    );
  }
  if (!data) return <div style={{ padding: 30, textAlign: "center", color: "#475569" }}>Lädt…</div>;

  const blocks = data.blocks || [];

  return (
    <div style={{ maxWidth: 760, margin: "20px auto", padding: 14 }}>
      <h1 style={{
        fontSize: 24, fontWeight: 900, color: "#1c1c1e",
        textShadow: "0 1px 2px rgba(255,255,255,0.5)", margin: "0 0 4px",
      }}>
        🚫 Blockierte User
      </h1>
      <p style={{ fontSize: 13, color: "#334155", lineHeight: 1.5, margin: "0 0 18px", fontWeight: 500 }}>
        {blocks.length === 0
          ? "Du hast aktuell niemanden blockiert."
          : `${blocks.length} User blockiert. Ihr seht euch nirgendwo auf VibeVibo — kein Buschfunk, keine Kommentare, keine DMs.`}
      </p>

      {blocks.length === 0 ? (
        <div style={{
          background: "rgba(255,255,255,0.85)", padding: 30, borderRadius: 14,
          border: "1px dashed rgba(0,0,0,0.08)", textAlign: "center",
        }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>🌸</div>
          <div style={{ color: "#475569", fontSize: 13 }}>
            Alles ruhig. Falls dich mal jemand stört: auf dem Profil findest du den 🚫-Knopf.
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {blocks.map((b) => (
            <div key={b.id} style={{
              background: "rgba(255,255,255,0.95)", borderRadius: 12, padding: 12,
              display: "flex", alignItems: "center", gap: 12,
              border: "1px solid rgba(220,38,38,0.15)",
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: "50%",
                background: "linear-gradient(135deg, #fecaca, #fca5a5)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, flexShrink: 0,
              }}>
                {b.emoji || "👤"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#1c1c1e" }}>
                  {b.displayName || b.username}
                </div>
                <div style={{ fontSize: 11.5, color: "#64748b" }}>
                  @{b.username} · blockiert am {new Date(b.blockedAt || b.createdAt || 0).toLocaleDateString("de-DE")}
                </div>
                {b.reason && (
                  <div style={{
                    marginTop: 4, fontSize: 11.5, color: "#475569",
                    fontStyle: "italic",
                  }}>
                    „{b.reason}"
                  </div>
                )}
              </div>
              <button
                onClick={() => unblock(b.id, b.username)}
                disabled={busy === b.id}
                style={{
                  padding: "8px 14px", borderRadius: 999, fontSize: 12, fontWeight: 800,
                  background: "rgba(34,197,94,0.12)", color: "#15803d",
                  border: "1px solid rgba(34,197,94,0.35)",
                  cursor: busy === b.id ? "wait" : "pointer", fontFamily: "inherit",
                }}
              >
                {busy === b.id ? "⏳" : "✓ Entblocken"}
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 20, textAlign: "center" }}>
        <Link href="/profile" style={{ color: "#475569", fontSize: 13, textDecoration: "none" }}>
          ← Zurück zum Profil
        </Link>
      </div>
    </div>
  );
}
