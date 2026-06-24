// 📢 Admin-Broadcast-Editor
// Schreibt Update-Posts die an alle User / Mods / Admins als System-DM gehen.
// Mit AI-Review (lokal Wort-Blacklist) vor dem Senden.

"use client";

import { useEffect, useState } from "react";

const CATEGORIES = [
  { value: "info",    label: "📢 Info",     color: "#fb923c" },
  { value: "success", label: "✅ Erfolg",   color: "#10b981" },
  { value: "warning", label: "⚠️ Warnung",  color: "#fbbf24" },
  { value: "danger",  label: "🚨 Wichtig",  color: "#ef4444" },
];

const TARGETS = [
  { value: "all",    label: "Alle aktiven User",      desc: "Größte Reichweite" },
  { value: "mods",   label: "Nur Mods + Teamleitung + Admins", desc: "Internes Team" },
  { value: "admins", label: "Nur Admins+ (Owner)",    desc: "Sehr klein" },
];

function timeAgo(ts) {
  if (!ts) return "—";
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return "gerade eben";
  if (min < 60) return `vor ${min} Min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `vor ${h}h`;
  const d = Math.floor(h / 24);
  return `vor ${d}d`;
}

export default function AdminBroadcastPage() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("info");
  const [target, setTarget] = useState("all");
  const [requiresAck, setRequiresAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [aiWarning, setAiWarning] = useState(null);
  const [recent, setRecent] = useState([]);

  async function loadRecent() {
    try {
      const r = await fetch("/api/adminpanel/broadcast/list", { credentials: "include" });
      const d = await r.json();
      if (r.ok) setRecent(d.broadcasts || []);
    } catch {}
  }
  useEffect(() => { loadRecent(); }, []);

  async function send(skipAiCheck = false) {
    setError("");
    setAiWarning(null);
    setResult(null);
    setBusy(true);
    try {
      const r = await fetch("/api/adminpanel/broadcast/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, category, target, requiresAck, skipAiCheck }),
      });
      const d = await r.json();
      if (r.status === 422 && d.aiReview) {
        setAiWarning(d.aiReview);
        return;
      }
      if (!r.ok) throw new Error(d?.error || "Senden fehlgeschlagen.");
      setResult(d);
      // Form leeren bei Erfolg
      setSubject("");
      setBody("");
      setRequiresAck(false);
      loadRecent();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const catColor = CATEGORIES.find(c => c.value === category)?.color || "#fb923c";
  const canSend = subject.trim().length >= 3 && body.trim().length >= 10;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px 80px" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          margin: 0, fontSize: 26, fontWeight: 800,
          background: "linear-gradient(135deg, #fb923c, #ef4444)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}>
          📢 Broadcast-Editor
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "rgba(241,241,245,0.6)", lineHeight: 1.5 }}>
          Schreibe Updates / Neuigkeiten — gehen als orange System-DM raus.
          Jeder Empfänger sieht's auf <code style={{ background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4 }}>vibevibo.de/system-nachrichten</code>.
        </p>
      </div>

      {/* Form */}
      <div style={cardStyle}>
        <label style={labelStyle}>Betreff <span style={{ opacity: 0.5 }}>({subject.length}/200)</span></label>
        <input
          type="text" value={subject} maxLength={200}
          onChange={(e) => setSubject(e.target.value)}
          disabled={busy}
          placeholder="z.B. Neue Funktion: Bundesliga-Tipps sind da!"
          style={inputStyle}
        />

        <label style={{ ...labelStyle, marginTop: 16 }}>Nachricht <span style={{ opacity: 0.5 }}>({body.length}/5000)</span></label>
        <textarea
          value={body} maxLength={5000} rows={8}
          onChange={(e) => setBody(e.target.value)}
          disabled={busy}
          placeholder={"Hi ihr Lieben,\n\nwir haben gerade folgendes Update für euch:\n\n— Funktion X ist neu\n— Funktion Y verbessert\n\nDanke fürs Dabeisein!\n— Das VibeVibo-Team"}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5, fontFamily: "inherit" }}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16 }}>
          <div>
            <label style={labelStyle}>Kategorie</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {CATEGORIES.map(c => (
                <button
                  key={c.value} type="button"
                  onClick={() => setCategory(c.value)}
                  disabled={busy}
                  style={{
                    padding: "8px 12px",
                    background: category === c.value ? c.color : "rgba(255,255,255,0.04)",
                    color: category === c.value ? "#fff" : "rgba(241,241,245,0.7)",
                    border: `1px solid ${category === c.value ? c.color : "rgba(255,255,255,0.1)"}`,
                    borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Empfänger</label>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              disabled={busy}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              {TARGETS.map(t => (
                <option key={t.value} value={t.value}>{t.label} — {t.desc}</option>
              ))}
            </select>
          </div>
        </div>

        <label style={{
          display: "flex", alignItems: "center", gap: 10, marginTop: 18,
          padding: "10px 12px",
          background: requiresAck ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.03)",
          border: `1px solid ${requiresAck ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.08)"}`,
          borderRadius: 10, cursor: "pointer",
        }}>
          <input
            type="checkbox" checked={requiresAck}
            onChange={(e) => setRequiresAck(e.target.checked)}
            disabled={busy}
            style={{ accentColor: "#ef4444", width: 18, height: 18 }}
          />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>
              ⚠ Acknowledge-Pflicht
            </div>
            <div style={{ fontSize: 11, color: "rgba(241,241,245,0.55)", marginTop: 2 }}>
              User muss "Gelesen und verstanden" klicken (für wichtige Updates wie AGB-Änderungen).
            </div>
          </div>
        </label>

        {/* Preview */}
        {(subject || body) && (
          <div style={{ marginTop: 22 }}>
            <div style={labelStyle}>Vorschau (so sieht's der User)</div>
            <div style={{
              padding: "16px 18px",
              background: `${catColor}1a`,
              border: `2px solid ${catColor}`,
              borderRadius: 12,
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: catColor,
                textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8,
              }}>
                {CATEGORIES.find(c => c.value === category)?.label} · von VibeVibo-Team
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f1f5", marginBottom: 6 }}>
                {subject || <span style={{ opacity: 0.4 }}>(Betreff)</span>}
              </div>
              <div style={{ fontSize: 13, color: "rgba(241,241,245,0.8)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {body || <span style={{ opacity: 0.4 }}>(Text)</span>}
              </div>
              {requiresAck && (
                <div style={{
                  marginTop: 12, padding: "8px 12px",
                  background: catColor, color: "#fff", borderRadius: 8,
                  fontSize: 12, fontWeight: 700, textAlign: "center",
                }}>
                  ✓ Gelesen und verstanden
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI-Warning */}
        {aiWarning && (
          <div style={{
            marginTop: 16, padding: "12px 14px",
            background: "rgba(251,191,36,0.12)",
            border: "1px solid rgba(251,191,36,0.4)",
            borderRadius: 10, color: "#fbbf24", fontSize: 13,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>🤖 AI-Review: Bedenken</div>
            <div style={{ color: "rgba(241,241,245,0.85)", lineHeight: 1.5 }}>
              {aiWarning.notes}
            </div>
            <button
              type="button"
              onClick={() => send(true)}
              disabled={busy}
              style={{
                marginTop: 10, padding: "8px 14px",
                background: "rgba(251,191,36,0.2)", color: "#fbbf24",
                border: "1px solid #fbbf24", borderRadius: 8,
                fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Trotzdem senden (ich hab's geprüft)
            </button>
          </div>
        )}

        {/* Errors */}
        {error && (
          <div style={{
            marginTop: 16, padding: "10px 12px",
            background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)",
            borderRadius: 10, color: "#fca5a5", fontSize: 13, fontWeight: 600,
          }}>
            ⚠ {error}
          </div>
        )}

        {/* Success */}
        {result?.ok && (
          <div style={{
            marginTop: 16, padding: "14px 16px",
            background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.35)",
            borderRadius: 10, color: "#10b981",
          }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              ✅ Broadcast #{result.broadcastId} gesendet
            </div>
            <div style={{ fontSize: 12, color: "rgba(241,241,245,0.7)", marginTop: 4 }}>
              {result.recipientCount} von {result.intendedCount} Empfängern erreicht
              {result.errors?.length > 0 && ` · ${result.errors.length} Fehler`}
            </div>
          </div>
        )}

        {/* Send Button */}
        <button
          type="button"
          onClick={() => send(false)}
          disabled={busy || !canSend}
          style={{
            marginTop: 20, width: "100%", padding: 14,
            background: canSend && !busy ? `linear-gradient(135deg, ${catColor}, ${catColor}dd)` : "rgba(255,255,255,0.06)",
            color: "#fff", border: "none", borderRadius: 12,
            fontSize: 15, fontWeight: 800, cursor: busy ? "wait" : (canSend ? "pointer" : "not-allowed"),
            opacity: canSend ? 1 : 0.5,
            fontFamily: "inherit",
            boxShadow: canSend ? `0 8px 24px ${catColor}55` : "none",
          }}
        >
          {busy ? "⏳ Sende …" : `📢 An "${TARGETS.find(t => t.value === target)?.label}" senden`}
        </button>
      </div>

      {/* Recent */}
      <div style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12, color: "#f1f1f5" }}>
          Letzte Broadcasts
        </h2>
        {recent.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: "rgba(241,241,245,0.5)", background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px dashed rgba(255,255,255,0.08)" }}>
            Noch keine Broadcasts gesendet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recent.map(b => {
              const c = CATEGORIES.find(c => c.value === b.category) || CATEGORIES[0];
              const ackRate = b.recipient_count > 0 ? Math.round((b.ack_count / b.recipient_count) * 100) : 0;
              return (
                <div key={b.id} style={{
                  padding: "12px 14px", background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10,
                  display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center",
                }}>
                  <div style={{
                    padding: "4px 8px", background: `${c.color}22`, color: c.color,
                    borderRadius: 6, fontSize: 10, fontWeight: 700,
                  }}>
                    {c.label}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f1f5" }}>
                      {b.subject}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(241,241,245,0.55)", marginTop: 2 }}>
                      {b.target === "all" ? "→ Alle" : b.target === "mods" ? "→ Mods+" : "→ Admins"}
                      {" · "}
                      {b.recipient_count} Empfänger
                      {b.requires_ack ? ` · ${ackRate}% bestätigt` : ""}
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(241,241,245,0.4)", textAlign: "right", whiteSpace: "nowrap" }}>
                    {timeAgo(b.sent_at)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const cardStyle = {
  padding: "24px 22px",
  background: "rgba(18,18,30,0.65)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 18,
};

const labelStyle = {
  display: "block",
  marginBottom: 6,
  fontSize: 11,
  fontWeight: 700,
  color: "rgba(241,241,245,0.7)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const inputStyle = {
  width: "100%",
  padding: "11px 13px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10,
  color: "#f1f1f5",
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
};
