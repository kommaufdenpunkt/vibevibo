"use client";

// 🎁 Beschenken-Flow — Multi-Step Modal:
//   1. Empfänger wählen
//   2. Nachricht + Päckchen-Modus
//   3. Sofort/später
//   4. Confirm
//   5. Done!

import { useState } from "react";

export default function GiftBeschenkenFlow({ gift, onClose }) {
  const [step, setStep] = useState("recipient");
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [wrapped, setWrapped] = useState(true);
  const [scheduledFor, setScheduledFor] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/gifts/give", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUsername: recipient.trim().toLowerCase(),
          customGiftId: gift.id,
          message: message.trim(),
          wrapped,
          scheduledFor: scheduledFor ? new Date(scheduledFor).getTime() : null,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setStep("done");
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 22, padding: 24, maxWidth: 460, width: "100%",
        maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      }}>
        {/* Header mit Gift-Vorschau */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <div style={{
            width: 70, height: 70, borderRadius: 14,
            background: gift.imageUrl ? `url(${gift.imageUrl}) center/contain no-repeat #fafafa` : "#fafafa",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32,
          }}>{!gift.imageUrl && "🎁"}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#1c1c1e" }}>{gift.name}</div>
            <div style={{ fontSize: 13, color: "#ec4899", fontWeight: 700, marginTop: 2 }}>{gift.price} Vibes</div>
          </div>
          <button onClick={onClose} style={{
            background: "transparent", border: "none", fontSize: 22, cursor: "pointer", color: "#94a3b8",
          }}>✕</button>
        </div>

        {err && (
          <div style={{
            background: "rgba(239,68,68,0.1)", color: "#991b1b",
            padding: "10px 14px", borderRadius: 10, marginBottom: 14, fontSize: 13, fontWeight: 700,
          }}>⚠ {err}</div>
        )}

        {/* Step: Empfänger */}
        {step === "recipient" && (
          <>
            <Label>An wen?</Label>
            <input
              value={recipient} onChange={(e) => setRecipient(e.target.value)}
              placeholder="Username (z.B. sunlite)"
              style={inp()} autoFocus
            />
            <button onClick={() => recipient.trim() && setStep("message")}
              disabled={!recipient.trim()}
              style={{ ...btnPrimary({ marginTop: 14, width: "100%" }), opacity: recipient.trim() ? 1 : 0.5 }}>
              Weiter →
            </button>
          </>
        )}

        {/* Step: Nachricht */}
        {step === "message" && (
          <>
            <Label>Nachricht an {recipient} (optional)</Label>
            <textarea
              value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder='z.B. "Auf das du immer lächelst! 😊'
              rows={4} maxLength={400}
              style={{ ...inp(), resize: "vertical" }}
            />
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, textAlign: "right" }}>
              {message.length}/400
            </div>

            <Label>Lieferung</Label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <DeliveryOption icon="🎁" label="Päckchen" desc="Empfänger packt aus" active={wrapped} onClick={() => setWrapped(true)} />
              <DeliveryOption icon="✨" label="Direkt" desc="Sofort sichtbar" active={!wrapped} onClick={() => setWrapped(false)} />
            </div>

            <Label style={{ marginTop: 14 }}>Wann? (optional)</Label>
            <input
              type="datetime-local"
              value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)}
              style={inp()}
            />
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
              Leer lassen = sofort übergeben
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button onClick={() => setStep("recipient")} style={btnSecondary({ flex: 1 })}>← Zurück</button>
              <button onClick={() => setStep("confirm")} style={btnPrimary({ flex: 2 })}>Weiter →</button>
            </div>
          </>
        )}

        {/* Step: Confirm */}
        {step === "confirm" && (
          <>
            <div style={{
              background: "#fafafa", padding: 16, borderRadius: 12, marginBottom: 14,
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1c1c1e" }}>
                Geschenk an <b style={{ color: "#ec4899" }}>{recipient}</b>
              </div>
              {message && (
                <div style={{
                  marginTop: 10, fontSize: 13, color: "#475569", fontStyle: "italic",
                  padding: 10, background: "#fff", borderRadius: 8,
                }}>„{message}"</div>
              )}
              <div style={{ marginTop: 12, fontSize: 13, color: "#475569" }}>
                {wrapped ? "📦 Verpackt — Empfänger muss auspacken" : "✨ Direkt — sofort sichtbar"}
                {scheduledFor && <><br/>⏰ Geplant für {new Date(scheduledFor).toLocaleString("de-DE")}</>}
              </div>
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #e5e5e7", fontSize: 14, fontWeight: 800 }}>
                Kosten: <span style={{ color: "#ec4899" }}>{gift.price} Vibes</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setStep("message")} style={btnSecondary({ flex: 1 })}>← Zurück</button>
              <button onClick={submit} disabled={busy} style={btnPrimary({ flex: 2 })}>
                {busy ? "⏳…" : "✓ Verschenken"}
              </button>
            </div>
          </>
        )}

        {/* Step: Done */}
        {step === "done" && (
          <div style={{ textAlign: "center", padding: 20 }}>
            <div style={{ fontSize: 64 }}>🎉</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#1c1c1e", marginTop: 8 }}>
              Geschenk verschickt!
            </div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>
              {recipient} {wrapped ? "wird benachrichtigt und kann auspacken." : "sieht das Geschenk sofort."}
            </div>
            <button onClick={onClose} style={{ ...btnPrimary({ marginTop: 18, width: "100%" }) }}>
              Schließen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Label({ children, style }) {
  return (
    <div style={{
      fontSize: 11, color: "#64748b", fontWeight: 800, textTransform: "uppercase",
      letterSpacing: 1, marginBottom: 6, marginTop: 12, ...style,
    }}>{children}</div>
  );
}
function inp() {
  return {
    width: "100%", padding: "11px 14px", borderRadius: 10,
    border: "1px solid #cbd5e1", fontSize: 14, outline: "none", fontFamily: "inherit",
    boxSizing: "border-box",
  };
}
function btnPrimary(extra = {}) {
  return {
    padding: "12px 22px", borderRadius: 10,
    background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "#fff",
    border: "none", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
    ...extra,
  };
}
function btnSecondary(extra = {}) {
  return {
    padding: "12px 22px", borderRadius: 10,
    background: "#f5f5f7", color: "#1c1c1e",
    border: "1px solid #e5e5e7", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
    ...extra,
  };
}
function DeliveryOption({ icon, label, desc, active, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: 12, borderRadius: 12, textAlign: "center",
      background: active ? "linear-gradient(135deg,rgba(236,72,153,0.1),rgba(168,85,247,0.05))" : "#fafafa",
      border: active ? "2px solid #ec4899" : "2px solid transparent",
      cursor: "pointer", fontFamily: "inherit",
    }}>
      <div style={{ fontSize: 24 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 800, marginTop: 4, color: "#1c1c1e" }}>{label}</div>
      <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 2 }}>{desc}</div>
    </button>
  );
}
