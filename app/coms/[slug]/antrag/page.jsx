"use client";

// 🏘 Com-Owner: Namensänderung beantragen.
// URL: /coms/<slug>/antrag
// Schickt einen Antrag ans Team. 400 ✨ werden ERST bei Genehmigung abgezogen.

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const COST = 400;

export default function ComRenameRequestPage() {
  const params = useParams();
  const slug = params?.slug || "";
  const [newName, setNewName] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr("");
    const v = newName.trim();
    if (v.length < 2) { setErr("Neuer Name min. 2 Zeichen."); return; }
    if (v.length > 40) { setErr("Neuer Name max. 40 Zeichen."); return; }
    setBusy(true);
    try {
      const r = await fetch(`/api/coms/${encodeURIComponent(slug)}/request-name`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newName: v, reason: reason.trim() || null }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Antrag fehlgeschlagen.");
      setDone(true);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div style={{ maxWidth: 520, margin: "30px auto", padding: 16, textAlign: "center" }}>
        <div style={{
          background: "linear-gradient(135deg, rgba(34,197,94,0.18), rgba(16,163,74,0.12))",
          border: "1px solid rgba(34,197,94,0.45)", borderRadius: 18, padding: 26,
          color: "#fff", boxShadow: "0 12px 40px rgba(34,197,94,0.2)",
        }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>📨</div>
          <h1 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 900 }}>Antrag eingereicht!</h1>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "rgba(255,255,255,0.9)", margin: "0 0 6px" }}>
            Dein Wunschname <b style={{ color: "#bbf7d0" }}>„{newName.trim()}"</b> für <b>/{slug}</b> wird vom Team geprüft.
          </p>
          <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.7)", margin: "0 0 16px" }}>
            Die <b>{COST} ✨</b> werden erst abgezogen, wenn der Antrag genehmigt wird. Du bekommst eine Nachricht.
          </p>
          <Link href={`/coms/${slug}`} style={{
            display: "inline-block", padding: "10px 20px", borderRadius: 999,
            background: "rgba(255,255,255,0.95)", color: "#065f46", fontWeight: 800, textDecoration: "none", fontSize: 14,
          }}>← Zurück zur Com</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 520, margin: "24px auto", padding: 16 }}>
      <div style={{
        background: "linear-gradient(135deg, rgba(236,72,153,0.22), rgba(124,58,237,0.18))",
        border: "1px solid rgba(244,114,182,0.4)", borderRadius: 18, padding: 20,
        boxShadow: "0 12px 40px rgba(124,58,237,0.2), inset 0 1px 0 rgba(255,255,255,0.12)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 40 }}>🏘</div>
          <h1 style={{ margin: "6px 0 4px", fontSize: 21, fontWeight: 900, color: "#fff" }}>Com umbenennen</h1>
          <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.82)" }}>
            für <b style={{ color: "#ffd9ee" }}>/{slug}</b> · kostet <b style={{ color: "#ffd9ee" }}>{COST} ✨</b> (erst bei Genehmigung)
          </div>
        </div>

        <form onSubmit={submit}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.85)", marginBottom: 4 }}>
            Neuer Com-Name
          </label>
          <input
            value={newName} onChange={(e) => setNewName(e.target.value)}
            maxLength={40} autoFocus placeholder="z. B. Retro Gamer Lounge"
            style={{
              width: "100%", padding: "11px 13px", borderRadius: 11, marginBottom: 4,
              background: "rgba(12,16,36,0.6)", border: "1px solid rgba(140,170,255,0.25)",
              color: "#fff", fontSize: 15, fontFamily: "inherit", boxSizing: "border-box",
            }}
          />
          <div style={{ textAlign: "right", fontSize: 10.5, color: "rgba(255,255,255,0.45)", marginBottom: 12 }}>
            {newName.length}/40
          </div>

          <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.85)", marginBottom: 4 }}>
            Begründung <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional, hilft dem Team)</span>
          </label>
          <textarea
            value={reason} onChange={(e) => setReason(e.target.value)}
            maxLength={500} rows={3} placeholder="Warum soll die Com umbenannt werden?"
            style={{
              width: "100%", padding: "11px 13px", borderRadius: 11, marginBottom: 12,
              background: "rgba(12,16,36,0.6)", border: "1px solid rgba(140,170,255,0.25)",
              color: "#fff", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", resize: "vertical",
            }}
          />

          {err && (
            <div style={{
              background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)",
              color: "#fecaca", borderRadius: 10, padding: "9px 12px", fontSize: 12.5, fontWeight: 700, marginBottom: 12,
            }}>⚠ {err}</div>
          )}

          <button type="submit" disabled={busy} style={{
            width: "100%", padding: "13px 16px", borderRadius: 12, border: "none",
            background: "linear-gradient(135deg, #ec4899, #7c3aed)", color: "#fff",
            fontWeight: 900, fontSize: 15, cursor: busy ? "wait" : "pointer", fontFamily: "inherit",
            boxShadow: "0 8px 20px rgba(124,58,237,0.4)",
          }}>{busy ? "Sende…" : "📨 Antrag ans Team senden"}</button>

          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", textAlign: "center", marginTop: 10, lineHeight: 1.5 }}>
            Das Team prüft jeden Antrag. Erst bei Genehmigung werden {COST} ✨ abgezogen und die Com umbenannt.
          </div>
        </form>
      </div>

      <div style={{ textAlign: "center", marginTop: 14 }}>
        <Link href={`/coms/${slug}`} style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, textDecoration: "none" }}>
          ← Zurück zur Com
        </Link>
      </div>
    </div>
  );
}
