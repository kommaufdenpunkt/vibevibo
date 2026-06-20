"use client";

// 🗑 Account-Lösch-Button — User klickt, kommt Modal, 24h-Countdown startet.
// Einfügen z.B. auf /profile/privacy oder Settings.

import { useState } from "react";

export default function AccountDeleteButton() {
  const [showModal, setShowModal] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  async function trigger() {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/me/delete-account", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request" }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setDone(true);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <>
      <button onClick={() => setShowModal(true)} style={{
        padding: "10px 18px", borderRadius: 10,
        background: "rgba(239,68,68,0.1)", color: "#b91c1c",
        border: "1px solid rgba(239,68,68,0.3)",
        fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
      }}>
        🗑 Mein Konto löschen
      </button>

      {showModal && (
        <div onClick={() => !done && !busy && setShowModal(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: "#fff", padding: 24, borderRadius: 18, maxWidth: 500, width: "100%",
          }}>
            {done ? (
              <div style={{ textAlign: "center", padding: 12 }}>
                <div style={{ fontSize: 60 }}>⏳</div>
                <h3 style={{ margin: "10px 0 6px", fontSize: 20, fontWeight: 900 }}>
                  Countdown läuft — 24 Stunden
                </h3>
                <p style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.5 }}>
                  Dein Account wird in 24 Stunden endgültig gelöscht.<br/>
                  Wenn du es dir anders überlegst, kannst du es jederzeit oben im Banner stoppen.<br/><br/>
                  <b style={{ color: "#b91c1c" }}>Wir hoffen, du bleibst! 💔</b>
                </p>
                <button onClick={() => setShowModal(false)} style={{
                  marginTop: 16, padding: "10px 22px", borderRadius: 10,
                  background: "#f5f5f7", color: "#475569", border: "none",
                  fontFamily: "inherit", fontWeight: 700, cursor: "pointer",
                }}>Schließen</button>
              </div>
            ) : (
              <>
                <h3 style={{ margin: "0 0 8px", fontSize: 19, fontWeight: 900, color: "#b91c1c" }}>
                  🗑 Account wirklich löschen?
                </h3>
                <p style={{ fontSize: 13, color: "#475569", margin: "0 0 14px", lineHeight: 1.6 }}>
                  Wir geben dir <b>24 Stunden Bedenkzeit</b>. Während der Zeit kannst du dich nochmal einloggen und die Löschung rückgängig machen.<br/><br/>
                  Nach 24 Stunden wird folgendes endgültig gelöscht:
                </p>
                <ul style={{ fontSize: 12.5, color: "#475569", lineHeight: 1.6, marginBottom: 14 }}>
                  <li>Dein Name, Profilbild, Adresse, Ausweis</li>
                  <li>Login-Daten (du kannst nicht mehr rein)</li>
                  <li>Alle persönlichen Einstellungen</li>
                </ul>
                <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 14px", lineHeight: 1.5, fontStyle: "italic" }}>
                  Aus rechtlichen Gründen (Forensik bei Vorfällen) bleiben Posts/Kommentare/DMs anonymisiert erhalten —
                  ohne deinen Namen oder Verknüpfung zu dir.
                </p>

                <label style={{
                  display: "flex", alignItems: "flex-start", gap: 8,
                  padding: 12, background: "#fafafa", borderRadius: 10, marginBottom: 14, cursor: "pointer",
                }}>
                  <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)}
                    style={{ marginTop: 2 }} />
                  <span style={{ fontSize: 13, color: "#1c1c1e" }}>
                    Ich habe verstanden und möchte mein Konto löschen.
                  </span>
                </label>

                {err && <div style={{ color: "#991b1b", marginBottom: 10, fontSize: 12, fontWeight: 700 }}>⚠ {err}</div>}

                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setShowModal(false)} style={{
                    flex: 1, padding: 12, borderRadius: 10,
                    background: "#10b981", color: "#fff",
                    border: "none", fontFamily: "inherit", fontWeight: 800, fontSize: 14, cursor: "pointer",
                  }}>💚 Doch bleiben</button>
                  <button onClick={trigger} disabled={!confirmed || busy} style={{
                    flex: 1, padding: 12, borderRadius: 10,
                    background: "linear-gradient(135deg, #ef4444, #b91c1c)", color: "#fff",
                    border: "none", fontFamily: "inherit", fontWeight: 800, fontSize: 14,
                    cursor: confirmed ? "pointer" : "not-allowed", opacity: confirmed ? 1 : 0.4,
                  }}>{busy ? "⏳…" : "🗑 24h-Countdown starten"}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
