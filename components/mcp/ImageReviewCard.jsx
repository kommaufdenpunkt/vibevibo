// 🖼 ImageReviewCard
// Instagram-Style Bild-Karte für die Mod-Moderation.
// Großes Bild + Approve-Button + Reject-Dropdown mit Templates.

"use client";

import { useState } from "react";

const SOURCE_LABELS = {
  profile: "👤 Profilbild",
  buschfunk: "📢 Buschfunk",
  feed: "📰 Feed",
  comment: "💬 Kommentar",
  album: "📷 Fotoalbum",
  avatar: "🎭 Avatar",
  other: "📌 Sonstiges",
};

function timeAgo(ts) {
  if (!ts) return "";
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return "gerade";
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export default function ImageReviewCard({ image, templates, onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [rejectMode, setRejectMode] = useState(false);
  const [selectedTpl, setSelectedTpl] = useState("");
  const [customText, setCustomText] = useState("");

  async function callAction(action, extra = {}) {
    setError("");
    setBusy(true);
    try {
      const r = await fetch(`/api/mcp/images/${image.id}/action`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Aktion fehlgeschlagen.");
      if (typeof onDone === "function") onDone(image.id, action);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  async function handleApprove() {
    if (!confirm("Bild freigeben?")) return;
    callAction("approve");
  }

  async function handleReject() {
    if (!selectedTpl) {
      setError("Bitte Ablehnungsgrund wählen.");
      return;
    }
    if (selectedTpl === "other" && customText.trim().length < 5) {
      setError("Bei 'Sonstiges' brauchst du einen Begründungs-Text (min 5 Zeichen).");
      return;
    }
    callAction("reject", { reasonCode: selectedTpl, customText });
  }

  return (
    <div style={{
      maxWidth: 520, margin: "0 auto 24px",
      background: "var(--mcp-bg-card, rgba(255,255,255,0.04))",
      border: "1px solid var(--mcp-border, rgba(255,255,255,0.08))",
      borderRadius: 18, overflow: "hidden",
      boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 14px",
        display: "flex", alignItems: "center", gap: 10,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "linear-gradient(135deg, #fb923c, #ef4444)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 800, color: "#fff",
        }}>
          {(image.uploader_username || "?").slice(0, 1).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--mcp-text-strong, #f1f1f5)" }}>
            @{image.uploader_username || `user_${image.uploaded_by_user_id}`}
          </div>
          <div style={{ fontSize: 11, color: "var(--mcp-text-mid, rgba(241,241,245,0.55))" }}>
            {SOURCE_LABELS[image.source_type] || SOURCE_LABELS.other} · vor {timeAgo(image.uploaded_at)}
          </div>
        </div>
        <div style={{
          padding: "3px 8px", background: "rgba(251,146,60,0.15)",
          color: "#fb923c", borderRadius: 6, fontSize: 10, fontWeight: 700,
          letterSpacing: "0.05em",
        }}>
          #{image.id}
        </div>
      </div>

      {/* Image */}
      <div style={{
        width: "100%", aspectRatio: "3/4",
        background: "#000", display: "flex",
        alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}>
        <img
          src={image.image_url}
          alt={`Bild #${image.id}`}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
            e.currentTarget.parentElement.insertAdjacentHTML(
              "beforeend",
              `<div style="color:#ef4444;padding:20px;text-align:center;">⚠ Bild konnte nicht geladen werden:<br/><code style="font-size:11px;opacity:0.7;word-break:break-all;">${image.image_url}</code></div>`
            );
          }}
        />
      </div>

      {/* Actions */}
      <div style={{ padding: 14 }}>
        {error && (
          <div style={{
            marginBottom: 12, padding: "8px 10px",
            background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 8, color: "#fca5a5", fontSize: 12, fontWeight: 600,
          }}>
            ⚠ {error}
          </div>
        )}

        {!rejectMode ? (
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={handleApprove}
              disabled={busy}
              style={{
                flex: 1, padding: 12,
                background: busy ? "rgba(0,0,0,0.1)" : "linear-gradient(135deg, #10b981, #059669)",
                color: "#fff", border: "none", borderRadius: 10,
                fontSize: 14, fontWeight: 800, cursor: busy ? "wait" : "pointer",
                fontFamily: "inherit",
                boxShadow: "0 4px 12px rgba(16,185,129,0.3)",
              }}
            >
              ✓ Freigeben
            </button>
            <button
              type="button"
              onClick={() => setRejectMode(true)}
              disabled={busy}
              style={{
                flex: 1, padding: 12,
                background: "linear-gradient(135deg, #ef4444, #dc2626)",
                color: "#fff", border: "none", borderRadius: 10,
                fontSize: 14, fontWeight: 800, cursor: busy ? "wait" : "pointer",
                fontFamily: "inherit",
                boxShadow: "0 4px 12px rgba(239,68,68,0.3)",
              }}
            >
              ✗ Ablehnen
            </button>
          </div>
        ) : (
          <div>
            <label style={{
              display: "block", marginBottom: 6,
              fontSize: 11, fontWeight: 700,
              color: "var(--mcp-text-mid, rgba(241,241,245,0.7))",
              textTransform: "uppercase", letterSpacing: "0.05em",
            }}>
              Ablehnungsgrund
            </label>
            <select
              value={selectedTpl}
              onChange={(e) => setSelectedTpl(e.target.value)}
              disabled={busy}
              style={{
                width: "100%", padding: "10px 12px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8, color: "#f1f1f5", fontSize: 14,
                fontFamily: "inherit", outline: "none", cursor: "pointer",
                boxSizing: "border-box",
              }}
            >
              <option value="">— wählen —</option>
              {templates.map(t => (
                <option key={t.code} value={t.code}>{t.label}</option>
              ))}
            </select>

            {selectedTpl === "other" && (
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                disabled={busy}
                rows={3}
                placeholder="Begründungstext (wird in der DM an den User stehen, min 5 Zeichen) …"
                maxLength={500}
                style={{
                  width: "100%", marginTop: 8,
                  padding: "10px 12px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8, color: "#f1f1f5", fontSize: 13,
                  fontFamily: "inherit", outline: "none", resize: "vertical",
                  boxSizing: "border-box", lineHeight: 1.5,
                }}
              />
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button
                type="button"
                onClick={() => { setRejectMode(false); setError(""); setSelectedTpl(""); setCustomText(""); }}
                disabled={busy}
                style={{
                  flex: 1, padding: 11,
                  background: "rgba(255,255,255,0.04)",
                  color: "rgba(241,241,245,0.7)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8, fontSize: 13, fontWeight: 700,
                  cursor: busy ? "wait" : "pointer", fontFamily: "inherit",
                }}
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={busy || !selectedTpl}
                style={{
                  flex: 2, padding: 11,
                  background: selectedTpl && !busy ? "linear-gradient(135deg, #ef4444, #dc2626)" : "rgba(255,255,255,0.06)",
                  color: "#fff", border: "none", borderRadius: 8,
                  fontSize: 13, fontWeight: 800,
                  cursor: busy ? "wait" : (selectedTpl ? "pointer" : "not-allowed"),
                  opacity: selectedTpl ? 1 : 0.5, fontFamily: "inherit",
                  boxShadow: selectedTpl ? "0 4px 12px rgba(239,68,68,0.3)" : "none",
                }}
              >
                {busy ? "⏳ …" : "✗ Endgültig ablehnen + DM senden"}
              </button>
            </div>

            <div style={{
              marginTop: 10, padding: "8px 10px",
              background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)",
              borderRadius: 8, fontSize: 11, color: "var(--mcp-text-mid, rgba(241,241,245,0.7))",
              lineHeight: 1.5,
            }}>
              ℹ Bei Ablehnung: Bild kommt in Userakte + User bekommt eine orange System-DM mit Grund.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
