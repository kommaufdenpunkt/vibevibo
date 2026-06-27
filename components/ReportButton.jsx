"use client";

// 🚩 Wiederverwendbarer Melden-Button — überall einsetzbar, wo User Inhalt sehen.
//
// <ReportButton targetType="pinnwand" targetId={post.id} targetOwnerId={post.userId}
//               contentSnapshot={post.text} />
//
// Öffnet einen Dialog mit Notfall- + Normal-Kategorien. Notfall (Suizid/Gewalt/
// Minderjährige) zeigt dem Melder SOFORT Hilfe-Ressourcen und wird im Mod-Tool
// priorisiert. Alles wird via /api/reports protokolliert.

import { useState } from "react";

const NOTFALL = [
  { id: "suizid", e: "🆘", label: "Suizid / Selbstgefährdung" },
  { id: "gewalt", e: "⚠️", label: "Gewalt / Drohung" },
  { id: "minderjaehrige", e: "🧒", label: "Minderjährige / Missbrauch" },
];
const NORMAL = [
  { id: "beleidigung", e: "💬", label: "Beleidigung / Mobbing" },
  { id: "nsfw", e: "🔞", label: "Sexuell / NSFW" },
  { id: "spam", e: "🚯", label: "Spam / Werbung" },
  { id: "drogen", e: "💊", label: "Drogen" },
  { id: "betrug", e: "🎭", label: "Betrug / Fake" },
  { id: "sonstiges", e: "📌", label: "Sonstiges" },
];

export default function ReportButton({
  targetType, targetId, targetOwnerId = null, contentSnapshot = "",
  variant = "icon", title = "Melden", style = {},
}) {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null); // { critical, help }
  const [err, setErr] = useState("");

  function reset() {
    setCat(null); setReason(""); setBusy(false); setDone(null); setErr("");
  }
  function close() { setOpen(false); setTimeout(reset, 200); }

  async function submit(catId) {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/reports", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, targetOwnerId, category: catId, reason: reason.trim() || null, contentSnapshot }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Melden fehlgeschlagen.");
      setDone({ critical: !!d.critical, help: d.help || null });
    } catch (e) {
      setErr(e.message);
    } finally { setBusy(false); }
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        title={title} aria-label={title}
        style={variant === "text" ? {
          background: "none", border: "none", color: "var(--vv-muted, #94a3b8)",
          cursor: "pointer", fontSize: 12, fontFamily: "inherit", display: "inline-flex",
          alignItems: "center", gap: 4, padding: "2px 4px", ...style,
        } : {
          background: "none", border: "none", color: "#bbb", cursor: "pointer",
          fontSize: 13, padding: 2, lineHeight: 1, ...style,
        }}
      >🚩{variant === "text" ? " Melden" : ""}</button>

      {open && (
        <div onClick={close} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100000,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            maxWidth: 420, width: "100%", maxHeight: "88vh", overflowY: "auto",
            background: "#14182e", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 18, padding: 18, color: "#fff",
            boxShadow: "0 24px 70px rgba(0,0,0,0.6)",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
          }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900 }}>🚩 Melden</h3>
              <button type="button" onClick={close} style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(255,255,255,0.6)", fontSize: 24, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>

            {done ? (
              <div style={{ textAlign: "center", padding: "8px 4px" }}>
                <div style={{ fontSize: 44, marginBottom: 8 }}>{done.critical ? "🆘" : "✅"}</div>
                <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>
                  {done.critical ? "Danke, dass du das gemeldet hast." : "Danke! Wurde gemeldet."}
                </div>
                <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.75)", lineHeight: 1.5, marginBottom: done.help ? 14 : 0 }}>
                  Unser Team prüft das. {done.critical ? "Notfälle werden sofort bearbeitet." : ""}
                </div>
                {done.help && (
                  <div style={{ textAlign: "left", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.4)", borderRadius: 12, padding: 14, marginBottom: 14 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>💚 {done.help.title}</div>
                    {done.help.lines.map((l, i) => (
                      <div key={i} style={{ fontSize: 12.5, color: "rgba(255,255,255,0.9)", lineHeight: 1.6 }}>{l}</div>
                    ))}
                  </div>
                )}
                <button type="button" onClick={close} style={{
                  width: "100%", padding: 12, borderRadius: 11, border: "none",
                  background: "linear-gradient(135deg, #ec4899, #7c3aed)", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
                }}>Schließen</button>
              </div>
            ) : (
              <>
                {/* Notfall */}
                <div style={{ fontSize: 11, fontWeight: 800, color: "#fca5a5", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>🆘 Notfall — sofort</div>
                <div style={{ display: "grid", gap: 6, marginBottom: 14 }}>
                  {NOTFALL.map((c) => (
                    <button key={c.id} type="button" disabled={busy} onClick={() => { setCat(c.id); submit(c.id); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", borderRadius: 11,
                        background: "rgba(239,68,68,0.14)", border: "1px solid rgba(239,68,68,0.45)",
                        color: "#fff", fontWeight: 800, fontSize: 13.5, cursor: busy ? "wait" : "pointer",
                        textAlign: "left", fontFamily: "inherit",
                      }}>
                      <span style={{ fontSize: 20 }}>{c.e}</span>{c.label}
                    </button>
                  ))}
                </div>

                {/* Normal */}
                <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Grund wählen</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14 }}>
                  {NORMAL.map((c) => (
                    <button key={c.id} type="button" disabled={busy} onClick={() => { setCat(c.id); submit(c.id); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "10px 11px", borderRadius: 11,
                        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)",
                        color: "#fff", fontWeight: 700, fontSize: 12.5, cursor: busy ? "wait" : "pointer",
                        textAlign: "left", fontFamily: "inherit",
                      }}>
                      <span style={{ fontSize: 17 }}>{c.e}</span>{c.label}
                    </button>
                  ))}
                </div>

                <textarea
                  value={reason} onChange={(e) => setReason(e.target.value)}
                  maxLength={300} rows={2} placeholder="Optional: kurz beschreiben, was los ist…"
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 11, boxSizing: "border-box",
                    background: "rgba(12,16,36,0.6)", border: "1px solid rgba(140,170,255,0.22)",
                    color: "#fff", fontSize: 13, fontFamily: "inherit", resize: "vertical", marginBottom: 8,
                  }}
                />

                {err && <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#fecaca", borderRadius: 10, padding: "8px 11px", fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>⚠ {err}</div>}
                {busy && <div style={{ textAlign: "center", color: "rgba(255,255,255,0.6)", fontSize: 12.5 }}>Sende…</div>}

                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", textAlign: "center", marginTop: 4 }}>
                  Tippe auf einen Grund — Meldung geht sofort raus.
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
