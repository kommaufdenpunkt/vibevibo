"use client";

// 🤝 FriendButton — auf Profil-Seiten einbinden:
//   <FriendButton username="sunlite" />
// Zeigt je nach Status den passenden Button (Anfrage senden / Pending / Befreundet / …).

import { useState, useEffect } from "react";
import { useMe } from "@/lib/useMe";

export default function FriendButton({ username }) {
  const { me } = useMe();
  const [status, setStatus] = useState("loading");
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!me || !username || me.username === username) return;
    fetch(`/api/users/${encodeURIComponent(username)}/friend-status`)
      .then((r) => r.ok ? r.json() : { status: "none" })
      .then((d) => setStatus(d.status || "none"))
      .catch(() => setStatus("none"));
  }, [me, username]);

  if (!me || !username || me.username === username) return null;
  if (status === "loading") return null;

  async function send() {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/friends/request", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUsername: username, message }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setStatus(d.autoAccepted ? "accepted" : "outgoing");
      setShowModal(false);
      setMessage("");
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  const baseStyle = {
    padding: "10px 18px", borderRadius: 999, border: "none",
    fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
    display: "inline-flex", alignItems: "center", gap: 6,
  };

  if (status === "accepted") {
    return <span style={{ ...baseStyle, background: "rgba(16,185,129,0.15)", color: "#10b981" }}>✓ Befreundet</span>;
  }
  if (status === "outgoing") {
    return <span style={{ ...baseStyle, background: "rgba(168,85,247,0.15)", color: "#a855f7" }}>⏳ Anfrage gesendet</span>;
  }
  if (status === "incoming") {
    return (
      <a href="/freunde/anfragen" style={{ ...baseStyle, background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", textDecoration: "none" }}>
        🤝 Du hast Anfrage erhalten →
      </a>
    );
  }
  if (status === "declined-by-them") {
    return <span style={{ ...baseStyle, background: "rgba(148,163,184,0.15)", color: "#64748b" }}>—</span>;
  }

  return (
    <>
      <button onClick={() => setShowModal(true)}
        style={{ ...baseStyle, background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "#fff", boxShadow: "0 4px 12px rgba(168,85,247,0.35)" }}>
        🤝 Freund werden
      </button>
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: "#fff", padding: 22, borderRadius: 18, maxWidth: 420, width: "100%",
          }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 900 }}>
              🤝 Anfrage an @{username}
            </h3>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
              Nachricht (optional, max 400 Zeichen)
            </div>
            {err && <div style={{ color: "#991b1b", marginBottom: 10, fontSize: 12, fontWeight: 700 }}>⚠ {err}</div>}
            <textarea
              value={message} onChange={(e) => setMessage(e.target.value)}
              rows={4} maxLength={400}
              placeholder="Hi! Lass uns Freunde werden — wir haben uns letzten Sommer kurz geschrieben."
              style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", resize: "vertical" }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: 12, borderRadius: 10, background: "#f5f5f7", border: "1px solid #e5e5e7", fontFamily: "inherit", fontWeight: 700, cursor: "pointer" }}>Abbrechen</button>
              <button onClick={send} disabled={busy} style={{ flex: 2, padding: 12, borderRadius: 10, background: "linear-gradient(135deg,#ec4899,#a855f7)", color: "#fff", border: "none", fontFamily: "inherit", fontWeight: 800, cursor: "pointer" }}>
                {busy ? "⏳…" : "🤝 Anfrage senden"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
