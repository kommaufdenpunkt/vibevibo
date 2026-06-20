"use client";

// 🆘 SOS-Knopf — klein, dezent, auf jedem Profil.
// "Sorgst du dich um diesen User?" → triggert Hilfe-Banner für User + Mod-Alarm.

import { useState } from "react";
import { useMe } from "@/lib/useMe";

export default function SosButton({ username }) {
  const { me } = useMe();
  const [showModal, setShowModal] = useState(false);
  const [concern, setConcern] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (!me || !username || me.username === username) return null;

  async function trigger() {
    setBusy(true);
    try {
      await fetch("/api/safety/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUsername: username, concern }),
      });
      setDone(true);
      setTimeout(() => { setShowModal(false); setDone(false); setConcern(""); }, 3000);
    } finally { setBusy(false); }
  }

  return (
    <>
      <button onClick={() => setShowModal(true)} title="Sorgst du dich um diesen User?"
        style={{
          padding: "6px 12px", borderRadius: 999,
          background: "rgba(255,255,255,0.95)",
          color: "#a855f7",
          border: "1px solid rgba(168,85,247,0.3)",
          fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
          display: "inline-flex", alignItems: "center", gap: 4,
        }}>
        💛 Sorge dich
      </button>

      {showModal && (
        <div onClick={() => !done && setShowModal(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: "#fff", padding: 22, borderRadius: 18, maxWidth: 460, width: "100%",
          }}>
            {done ? (
              <div style={{ textAlign: "center", padding: 16 }}>
                <div style={{ fontSize: 52 }}>💛</div>
                <h3 style={{ margin: "8px 0 4px", fontSize: 18, fontWeight: 900 }}>
                  Danke, dass du dich sorgst.
                </h3>
                <p style={{ fontSize: 13, color: "#64748b" }}>
                  @{username} bekommt diskret Hilfe-Angebote angezeigt. Unsere Mods sind informiert.
                </p>
              </div>
            ) : (
              <>
                <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 900 }}>
                  💛 Sorgst du dich um @{username}?
                </h3>
                <p style={{ fontSize: 12.5, color: "#64748b", margin: "0 0 12px", lineHeight: 1.5 }}>
                  Wir zeigen ihm/ihr <b>diskret</b> Hilfe-Angebote (Telefonseelsorge etc.) —
                  ohne zu sagen wer's gemeldet hat. Mods werden informiert.
                </p>
                <label style={{ fontSize: 11, color: "#94a3b8", fontWeight: 800, textTransform: "uppercase" }}>
                  Was beobachtest du? (optional)
                </label>
                <textarea value={concern} onChange={(e) => setConcern(e.target.value)} maxLength={500} rows={3}
                  placeholder="z.B. Posts klingen seit Tagen niedergeschlagen"
                  style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #cbd5e1", fontFamily: "inherit", fontSize: 13, boxSizing: "border-box", marginTop: 4 }} />
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <button onClick={() => setShowModal(false)} style={{
                    flex: 1, padding: 11, borderRadius: 10, background: "#f5f5f7",
                    border: "1px solid #e5e5e7", fontFamily: "inherit", fontWeight: 700, cursor: "pointer",
                  }}>Abbrechen</button>
                  <button onClick={trigger} disabled={busy} style={{
                    flex: 2, padding: 11, borderRadius: 10,
                    background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "#fff",
                    border: "none", fontFamily: "inherit", fontWeight: 800, cursor: "pointer",
                  }}>{busy ? "⏳…" : "💛 Hilfe diskret senden"}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
