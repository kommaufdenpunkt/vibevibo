"use client";

// 🤝 Freundschaftsanfragen — Eingang + Ausgang + bearbeitete
// Annehmen mit optionaler Antwort, Ablehnen mit optionalem Grund.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMe } from "@/lib/useMe";

export default function FriendRequestsPage() {
  const { me, loading } = useMe();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("incoming");
  const [busy, setBusy] = useState(null);
  const [replyFor, setReplyFor] = useState(null); // {id, kind: "accept"|"decline"}
  const [replyText, setReplyText] = useState("");

  function refresh() {
    fetch("/api/friends/requests").then((r) => r.json()).then(setData).catch(() => {});
  }

  useEffect(() => { if (me) refresh(); }, [me]);

  async function act(id, action, payload) {
    setBusy(id);
    try {
      await fetch(`/api/friends/${id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      refresh();
      setReplyFor(null); setReplyText("");
    } finally { setBusy(null); }
  }
  async function cancel(id) {
    if (!confirm("Anfrage zurückziehen?")) return;
    setBusy(id);
    try {
      await fetch(`/api/friends/${id}`, { method: "DELETE" });
      refresh();
    } finally { setBusy(null); }
  }

  if (loading) return null;
  if (!me) return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <Link href="/login?next=/freunde/anfragen" style={{ color: "#ec4899" }}>Bitte einloggen</Link>
    </div>
  );

  const incoming = data?.incoming || [];
  const outgoing = data?.outgoing || [];
  const history = data?.incomingHistory || [];

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
      <h1 style={{
        fontSize: 24, fontWeight: 900, color: "#fff", marginTop: 14,
        textShadow: "0 2px 4px rgba(0,0,0,0.4)",
      }}>🤝 Freundschaftsanfragen</h1>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginTop: 14, borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
        {[
          { id: "incoming", label: `📥 Eingang (${incoming.length})` },
          { id: "outgoing", label: `📤 Ausgang (${outgoing.length})` },
          { id: "history",  label: "📋 Verlauf" },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "10px 16px", borderRadius: "12px 12px 0 0",
            background: tab === t.id ? "linear-gradient(135deg, #ec4899, #a855f7)" : "transparent",
            color: tab === t.id ? "#fff" : "rgba(255,255,255,0.7)",
            border: "none", fontFamily: "inherit", fontSize: 13, fontWeight: 800, cursor: "pointer",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        {tab === "incoming" && (
          incoming.length === 0 ? <Empty icon="🎉" text="Keine offenen Anfragen" /> :
          incoming.map((r) => (
            <RequestCard key={r.id} r={r} kind="incoming">
              {replyFor?.id === r.id ? (
                <div style={{ marginTop: 10 }}>
                  <textarea
                    placeholder={replyFor.kind === "accept" ? 'Antwort (optional, z.B. "Klar, gerne!")' : 'Grund (optional, z.B. "Kenne dich nicht")'}
                    value={replyText} onChange={(e) => setReplyText(e.target.value)}
                    maxLength={300} rows={2}
                    style={txt()}
                  />
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <button onClick={() => { setReplyFor(null); setReplyText(""); }} style={btnGhost()}>Abbrechen</button>
                    <button onClick={() => act(r.id, replyFor.kind, replyFor.kind === "accept" ? { reply: replyText } : { reason: replyText })}
                      disabled={busy === r.id}
                      style={replyFor.kind === "accept" ? btnGreen({ flex: 1 }) : btnRed({ flex: 1 })}>
                      {busy === r.id ? "⏳…" : replyFor.kind === "accept" ? "✓ Annehmen" : "✕ Ablehnen"}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  <button onClick={() => { setReplyFor({ id: r.id, kind: "accept" }); setReplyText(""); }}
                    style={btnGreen({ flex: 1 })}>✓ Annehmen</button>
                  <button onClick={() => { setReplyFor({ id: r.id, kind: "decline" }); setReplyText(""); }}
                    style={btnRed({ flex: 1 })}>✕ Ablehnen</button>
                </div>
              )}
            </RequestCard>
          ))
        )}

        {tab === "outgoing" && (
          outgoing.length === 0 ? <Empty icon="📭" text="Keine ausgehenden Anfragen" /> :
          outgoing.map((r) => (
            <RequestCard key={r.id} r={r} kind="outgoing">
              <button onClick={() => cancel(r.id)} disabled={busy === r.id}
                style={btnGhost({ width: "100%", marginTop: 8 })}>
                {busy === r.id ? "⏳…" : "✕ Anfrage zurückziehen"}
              </button>
            </RequestCard>
          ))
        )}

        {tab === "history" && (
          history.length === 0 ? <Empty icon="📋" text="Verlauf ist leer" /> :
          history.map((r) => (
            <RequestCard key={r.id} r={r} kind="history" />
          ))
        )}
      </div>
    </div>
  );
}

function RequestCard({ r, kind, children }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.95)", borderRadius: 14, padding: 14, marginBottom: 10,
      border: "1px solid rgba(255,255,255,0.3)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link href={`/u/${r.username}`} style={{
          width: 48, height: 48, borderRadius: 12, flexShrink: 0,
          background: r.avatarUrl ? `url(${r.avatarUrl}) center/cover` : "linear-gradient(135deg, #ec4899, #a855f7)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 22, textDecoration: "none",
        }}>{!r.avatarUrl && (r.emoji || "👤")}</Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link href={`/u/${r.username}`} style={{ color: "#1c1c1e", textDecoration: "none" }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{r.displayName || r.username}</div>
            <div style={{ fontSize: 11.5, color: "#94a3b8" }}>@{r.username}</div>
          </Link>
        </div>
        <div style={{ fontSize: 10.5, color: "#94a3b8", whiteSpace: "nowrap" }}>
          {relTime(r.createdAt)}
        </div>
      </div>
      {r.message && (
        <div style={{
          marginTop: 10, padding: 10, background: "#fafafa", borderRadius: 10,
          fontSize: 12.5, color: "#475569", fontStyle: "italic", lineHeight: 1.4,
        }}>„{r.message}"</div>
      )}
      {r.decisionReason && (
        <div style={{
          marginTop: 8, padding: "6px 10px", borderRadius: 8, fontSize: 11.5,
          background: r.status === "accepted" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.08)",
          color: r.status === "accepted" ? "#065f46" : "#991b1b",
        }}>
          <b>{r.status === "accepted" ? "Antwort" : "Grund"}:</b> „{r.decisionReason}"
        </div>
      )}
      {children}
    </div>
  );
}

function Empty({ icon, text }) {
  return (
    <div style={{
      padding: 40, textAlign: "center", color: "rgba(255,255,255,0.7)",
      background: "rgba(255,255,255,0.05)", borderRadius: 14,
    }}>
      <div style={{ fontSize: 36, marginBottom: 6 }}>{icon}</div>
      {text}
    </div>
  );
}

function relTime(ts) {
  if (!ts) return "—";
  const m = Math.max(1, Math.round((Date.now() - ts) / 60000));
  if (m < 60) return `${m} Min`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h`;
  return `${Math.round(h / 24)} T`;
}

function txt() { return { width: "100%", padding: 10, borderRadius: 10, border: "1px solid #cbd5e1", fontFamily: "inherit", fontSize: 13, boxSizing: "border-box", resize: "vertical" }; }
function btnGhost(x = {}) { return { padding: "10px 14px", borderRadius: 10, background: "#f5f5f7", color: "#475569", border: "1px solid #e5e5e7", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer", ...x }; }
function btnGreen(x = {}) { return { padding: "10px 14px", borderRadius: 10, background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", border: "none", fontFamily: "inherit", fontSize: 13, fontWeight: 800, cursor: "pointer", ...x }; }
function btnRed(x = {}) { return { padding: "10px 14px", borderRadius: 10, background: "linear-gradient(135deg,#ef4444,#b91c1c)", color: "#fff", border: "none", fontFamily: "inherit", fontSize: 13, fontWeight: 800, cursor: "pointer", ...x }; }
