"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const STATUSES = {
  open:        { label: "🆕 Offen",      bg: "rgba(168,85,247,0.15)", color: "#a855f7" },
  planned:     { label: "📌 Geplant",    bg: "rgba(59,130,246,0.15)", color: "#3b82f6" },
  in_progress: { label: "🔨 In Arbeit",  bg: "rgba(245,158,11,0.15)", color: "#f59e0b" },
  done:        { label: "✅ Fertig",     bg: "rgba(16,185,129,0.15)", color: "#10b981" },
  declined:    { label: "❌ Abgelehnt",  bg: "rgba(148,163,184,0.15)", color: "#64748b" },
};

export default function WishesAdminManager({ pw, initialWishes, counts, initialStatus }) {
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [wishes, setWishes] = useState(initialWishes);
  const [busy, setBusy] = useState(null);
  const [replyFor, setReplyFor] = useState(null);
  const [replyText, setReplyText] = useState("");
  const router = useRouter();

  function gotoStatus(s) {
    router.push(`/admin/wuensche?pw=${encodeURIComponent(pw)}${s ? `&status=${s}` : ""}`);
  }

  async function update(id, patch) {
    setBusy(id);
    try {
      const r = await fetch(`/api/wishes/${id}/admin?pw=${encodeURIComponent(pw)}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (r.ok) {
        const d = await r.json();
        if (patch.deletedWish) {
          setWishes((ws) => ws.filter((w) => w.id !== id));
        } else if (d.wish) {
          setWishes((ws) => ws.map((w) => w.id === id ? { ...w, ...d.wish, hasVoted: w.hasVoted } : w));
        }
        setReplyFor(null); setReplyText("");
      }
    } finally { setBusy(null); }
  }

  return (
    <div>
      {/* Filter */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 18 }}>
        <FilterPill active={statusFilter === "all"} onClick={() => gotoStatus("all")} label={`Alle ${counts.all || 0}`} />
        {Object.entries(STATUSES).map(([k, s]) => (
          <FilterPill key={k} active={statusFilter === k} onClick={() => gotoStatus(k)}
            label={`${s.label} ${counts[k] || 0}`} bg={s.bg} color={s.color} />
        ))}
      </div>

      {wishes.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.05)", borderRadius: 14 }}>
          Keine Wünsche in dieser Auswahl.
        </div>
      ) : wishes.map((w) => {
        const st = STATUSES[w.status] || STATUSES.open;
        return (
          <div key={w.id} style={{
            background: "#fff", borderRadius: 14, padding: 16, marginBottom: 12,
            borderLeft: `4px solid ${st.color}`,
          }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{
                minWidth: 60, padding: "10px 8px", textAlign: "center", borderRadius: 10,
                background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "#fff",
                fontWeight: 800,
              }}>
                <div style={{ fontSize: 18 }}>👍</div>
                <div style={{ fontSize: 14 }}>{w.upvotes}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={badge(st.bg, st.color)}>{st.label}</span>
                  <span style={{ ...badge("#f5f5f7", "#475569") }}>{w.category}</span>
                  {w.pinned > 0 && <span style={{ ...badge("rgba(245,158,11,0.15)", "#f59e0b") }}>📌 PINNED</span>}
                </div>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#1c1c1e" }}>{w.title}</div>
                {w.body && (
                  <div style={{ fontSize: 13, color: "#475569", marginTop: 6, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>
                    {w.body}
                  </div>
                )}
                {w.adminReply && (
                  <div style={{
                    marginTop: 10, padding: 10, borderRadius: 8,
                    background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)",
                    fontSize: 12.5, color: "#475569",
                  }}>
                    <b>👑 Deine Antwort:</b> {w.adminReply}
                  </div>
                )}
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
                  @{w.username} · {new Date(w.createdAt).toLocaleDateString("de-DE")}
                </div>

                {/* Admin-Actions */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                  <select value={w.status} onChange={(e) => update(w.id, { status: e.target.value })}
                    disabled={busy === w.id}
                    style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 12, fontFamily: "inherit" }}>
                    {Object.entries(STATUSES).map(([k, s]) => (
                      <option key={k} value={k}>{s.label}</option>
                    ))}
                  </select>
                  <button onClick={() => update(w.id, { pinned: !w.pinned })}
                    disabled={busy === w.id}
                    style={btn(w.pinned ? "#f59e0b" : "#94a3b8")}>
                    📌 {w.pinned ? "Unpinnen" : "Pinnen"}
                  </button>
                  <button onClick={() => { setReplyFor(w.id); setReplyText(w.adminReply || ""); }}
                    style={btn("#a855f7")}>
                    💬 {w.adminReply ? "Antwort bearbeiten" : "Antwort schreiben"}
                  </button>
                  <button onClick={() => {
                    if (confirm(`Wunsch "${w.title}" wirklich löschen? Kann nicht rückgängig gemacht werden.`)) {
                      update(w.id, { deletedWish: true });
                    }
                  }} disabled={busy === w.id} style={btn("#ef4444")}>🗑 Löschen</button>
                </div>

                {/* Reply-Form */}
                {replyFor === w.id && (
                  <div style={{ marginTop: 10, padding: 12, background: "#fafafa", borderRadius: 10 }}>
                    <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)}
                      maxLength={4000} rows={3}
                      placeholder="Öffentliche Antwort an alle User…"
                      style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #cbd5e1", fontFamily: "inherit", fontSize: 13, boxSizing: "border-box" }} />
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <button onClick={() => { setReplyFor(null); setReplyText(""); }}
                        style={btn("#94a3b8")}>Abbrechen</button>
                      <button onClick={() => update(w.id, { adminReply: replyText })}
                        disabled={busy === w.id}
                        style={btn("#10b981")}>{busy === w.id ? "⏳…" : "💾 Antwort speichern"}</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: 18, fontSize: 11.5, color: "rgba(255,255,255,0.6)", textAlign: "center" }}>
        Öffentliche Wunschseite: <Link href="/wuensche" style={{ color: "rgba(255,255,255,0.8)" }}>/wuensche</Link>
      </div>
    </div>
  );
}

function FilterPill({ active, onClick, label, bg, color }) {
  return (
    <button onClick={onClick} style={{
      padding: "7px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700,
      background: active ? (bg || "rgba(236,72,153,0.2)") : "rgba(255,255,255,0.95)",
      color: active ? (color || "#ec4899") : "#475569",
      border: active ? `1px solid ${color || "#ec4899"}` : "1px solid transparent",
      cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
    }}>{label}</button>
  );
}

function badge(bg, color) { return { display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 10.5, fontWeight: 800, letterSpacing: 0.3, background: bg, color }; }
function btn(color) {
  return {
    padding: "6px 12px", borderRadius: 8,
    background: color, color: "#fff", border: "none",
    fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
  };
}
