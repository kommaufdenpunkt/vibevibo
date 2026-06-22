"use client";

// 🚫 BlockButton — auf Profilseiten:
//   <BlockButton username="sunlite" />
// Lädt initial den Block-Status, zeigt Blockieren/Entblocken-Action mit Modal.

import { useState, useEffect } from "react";
import { useMe } from "@/lib/useMe";

export default function BlockButton({ username, compact = false }) {
  const { me } = useMe();
  const [blocked, setBlocked] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!me || !username || me.username === username) return;
    fetch(`/api/users/${encodeURIComponent(username)}/friend-status`)
      .then((r) => r.ok ? r.json() : { blocked: false, blockedById: 0 })
      .then((d) => setBlocked({ iBlock: !!d.iBlock, blockedById: d.blockedById || 0 }))
      .catch(() => setBlocked({ iBlock: false, blockedById: 0 }));
  }, [me, username]);

  if (!me || !username || me.username === username) return null;
  if (blocked === null) return null;

  async function doBlock() {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/me/blocks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, reason }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setBlocked({ iBlock: true, blockedById: 0 });
      setShowModal(false);
      setReason("");
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function doUnblock() {
    if (!confirm(`@${username} entblockieren? Ihr seht euch danach wieder.`)) return;
    setBusy(true);
    try {
      const meta = await fetch(`/api/users/${encodeURIComponent(username)}/friend-status`).then((r) => r.json());
      const targetId = meta?.userId;
      if (!targetId) throw new Error("User-ID nicht ermittelbar");
      const r = await fetch(`/api/me/blocks/${targetId}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setBlocked({ iBlock: false, blockedById: 0 });
    } catch (e) { alert("Fehler: " + e.message); }
    finally { setBusy(false); }
  }

  const baseStyle = compact ? {
    padding: "4px 10px", borderRadius: 999, border: "1px solid currentColor",
    fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
    background: "transparent",
  } : {
    padding: "10px 16px", borderRadius: 999, border: "1.5px solid currentColor",
    fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
    background: "transparent",
    display: "inline-flex", alignItems: "center", gap: 6,
  };

  if (blocked.iBlock) {
    return (
      <button onClick={doUnblock} disabled={busy} style={{ ...baseStyle, color: "#dc2626" }}>
        {busy ? "⏳" : "🚫 Blockiert · Entblocken"}
      </button>
    );
  }

  return (
    <>
      <button onClick={() => setShowModal(true)} disabled={busy}
        style={{ ...baseStyle, color: "#64748b" }} title="Diesen User blockieren">
        {compact ? "🚫" : "🚫 Blockieren"}
      </button>
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: "#fff", padding: 22, borderRadius: 18, maxWidth: 420, width: "100%",
          }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 900 }}>
              🚫 @{username} blockieren?
            </h3>
            <p style={{ fontSize: 12.5, color: "#475569", margin: "0 0 14px", lineHeight: 1.5 }}>
              Ihr seht euch danach <strong>nirgendwo mehr</strong> auf VibeVibo — kein Buschfunk, keine Kommentare, keine DMs, keine Erwähnungen. Bestehende Freundschaft wird aufgehoben. Du kannst jederzeit über deine <a href="/blockierte" style={{ color: "#a855f7" }}>Blockliste</a> entblocken.
            </p>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
              Notiz für dich (optional, nur du siehst sie)
            </div>
            {err && <div style={{ color: "#991b1b", marginBottom: 8, fontSize: 12, fontWeight: 700 }}>⚠ {err}</div>}
            <input
              value={reason} onChange={(e) => setReason(e.target.value)}
              maxLength={200}
              placeholder="z.B. Spam, Belästigung, …"
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button onClick={() => setShowModal(false)} disabled={busy} style={{
                flex: 1, padding: 12, borderRadius: 10, background: "#f5f5f7", color: "#475569",
                border: "1px solid #e5e5e7", fontFamily: "inherit", fontWeight: 700, cursor: "pointer",
              }}>Abbrechen</button>
              <button onClick={doBlock} disabled={busy} style={{
                flex: 2, padding: 12, borderRadius: 10,
                background: "linear-gradient(135deg, #dc2626, #b91c1c)", color: "#fff",
                border: "none", fontFamily: "inherit", fontWeight: 800,
                cursor: busy ? "wait" : "pointer",
              }}>
                {busy ? "⏳…" : "🚫 Blockieren"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
