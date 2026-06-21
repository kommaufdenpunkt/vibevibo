"use client";

// 💌 ComplimentsPanel — auf Profil-Seite einbinden:
//   <ComplimentsPanel username="sunlite" />
// Zeigt Komplimente, Owner kann ausblenden, Andere können neue senden.

import { useEffect, useState } from "react";
import { useMe } from "@/lib/useMe";

const EMOJIS = ["💌","💕","💖","💗","💜","🌹","🌟","✨","🎈","🦋","🌈","☀️","🍀"];

export default function ComplimentsPanel({ username }) {
  const { me } = useMe();
  const [data, setData] = useState(null);
  const [showSend, setShowSend] = useState(false);

  function refresh() {
    fetch(`/api/users/${encodeURIComponent(username)}/compliments`)
      .then((r) => r.ok ? r.json() : { compliments: [], isOwner: false })
      .then(setData)
      .catch(() => {});
  }

  useEffect(() => { if (username) refresh(); }, [username]);

  if (!data) return null;
  const { compliments, isOwner } = data;
  const visible = compliments; // Hide-Feature deaktiviert (bestehendes System hat's nicht)
  const canSend = me && me.username !== username;

  return (
    <div style={{
      background: "rgba(255,255,255,0.95)", borderRadius: 14, padding: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 900, flex: 1 }}>
          💌 Anonyme Komplimente ({visible.length})
        </h3>
        {canSend && (
          <button onClick={() => setShowSend(true)} style={{
            padding: "7px 14px", borderRadius: 999,
            background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "#fff",
            border: "none", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
          }}>+ Senden</button>
        )}
      </div>

      {visible.length === 0 ? (
        <div style={{
          padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13,
          background: "#fafafa", borderRadius: 10,
        }}>
          <div style={{ fontSize: 28, marginBottom: 4 }}>💭</div>
          {isOwner ? "Noch keine Komplimente. Aber das ändert sich!" : `Sei der erste, der @${username} ein Kompliment schickt!`}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {visible.map((c) => (
            <ComplimentCard key={c.id} c={c} />
          ))}
        </div>
      )}

      {showSend && <SendModal username={username} onClose={() => setShowSend(false)} onSent={() => { setShowSend(false); refresh(); }} />}
    </div>
  );
}

function ComplimentCard({ c }) {
  return (
    <div style={{
      padding: 12, borderRadius: 10, position: "relative",
      background: "linear-gradient(135deg, rgba(236,72,153,0.06), rgba(168,85,247,0.04))",
      border: "1px solid rgba(236,72,153,0.15)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{c.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: "#1c1c1e", lineHeight: 1.45, whiteSpace: "pre-wrap" }}>
            {c.body}
          </div>
          <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 4 }}>
            anonym · {new Date(c.createdAt).toLocaleDateString("de-DE")}
          </div>
        </div>
      </div>
    </div>
  );
}

function SendModal({ username, onClose, onSent }) {
  const [body, setBody]   = useState("");
  const [emoji, setEmoji] = useState("💌");
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const r = await fetch(`/api/users/${encodeURIComponent(username)}/compliments`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, emoji }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      onSent();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} style={{
        background: "#fff", padding: 22, borderRadius: 18,
        width: "100%", maxWidth: "min(460px, calc(100vw - 32px))",
        maxHeight: "calc(100dvh - 32px)", overflowY: "auto",
        boxSizing: "border-box",
      }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 900 }}>💌 Kompliment an @{username}</h3>
        <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, marginBottom: 14 }}>
          Komplett anonym — auch der Empfänger sieht nicht wer es geschickt hat.
        </p>
        {err && <div style={{ color: "#991b1b", marginBottom: 10, fontSize: 12, fontWeight: 700 }}>⚠ {err}</div>}

        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
          {EMOJIS.map((e) => (
            <button key={e} type="button" onClick={() => setEmoji(e)} style={{
              width: 36, height: 36, borderRadius: 10,
              background: emoji === e ? "linear-gradient(135deg, rgba(236,72,153,0.2), rgba(168,85,247,0.15))" : "#fafafa",
              border: emoji === e ? "2px solid #ec4899" : "1px solid #e5e5e7",
              fontSize: 18, cursor: "pointer",
            }}>{e}</button>
          ))}
        </div>

        <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={400} rows={4} required
          placeholder="Was findest du an dieser Person toll?"
          style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #cbd5e1", fontFamily: "inherit", fontSize: 13, boxSizing: "border-box", resize: "vertical" }} />
        <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "right", marginTop: 4 }}>{body.length}/400</div>

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button type="button" onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 10, background: "#f5f5f7", border: "1px solid #e5e5e7", fontFamily: "inherit", fontWeight: 700, cursor: "pointer" }}>Abbrechen</button>
          <button type="submit" disabled={busy || !body.trim()} style={{ flex: 2, padding: 12, borderRadius: 10, background: "linear-gradient(135deg,#ec4899,#a855f7)", color: "#fff", border: "none", fontFamily: "inherit", fontWeight: 800, cursor: "pointer" }}>
            {busy ? "⏳…" : "💌 Anonym senden"}
          </button>
        </div>
      </form>
    </div>
  );
}
