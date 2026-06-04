"use client";

// 🎁 Anonymes Kompliment senden — vordef. Spruch (10 ✨) oder eigener Text (50 ✨).
// Anti-Spam: 5/Tag (server-side, gibt eindeutige Fehler).

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function ComplimentModal({ toUsername, toDisplayName, onClose, onSent }) {
  const [data, setData] = useState(null);     // { presets, cost, costCustom, dailyCap }
  const [mode, setMode] = useState("preset"); // "preset" | "custom"
  const [selectedId, setSelectedId] = useState(0);
  const [customText, setCustomText] = useState("");
  const [customEmoji, setCustomEmoji] = useState("💖");
  const [anonymous, setAnonymous] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.complimentPresets().then(setData).catch(() => setData({ presets: [], cost: 10, costCustom: 50, dailyCap: 5 }));
  }, []);

  async function send() {
    setBusy(true); setErr("");
    try {
      const body = mode === "preset"
        ? { presetId: selectedId, anonymous }
        : { text: customText, emoji: customEmoji, anonymous };
      const res = await api.sendCompliment(toUsername, body);
      onSent?.(res);
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!data) return null;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 4000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--vv-card,#fff)", color: "var(--vv-text,#1c1c1e)",
        borderRadius: 16, padding: 18, maxWidth: 460, width: "100%",
        maxHeight: "85vh", overflowY: "auto",
        boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>💖 Kompliment an {toDisplayName || toUsername}</h3>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--vv-muted,#888)" }}>✕</button>
        </div>
        <div className="vv-muted" style={{ fontSize: 12, marginBottom: 12 }}>
          {anonymous ? "Wird anonym verschickt." : "Dein Name wird angezeigt."}
          {" "}Max. {data.dailyCap} Komplimente pro Tag.
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <button type="button" onClick={() => setMode("preset")}
            style={tabStyle(mode === "preset")}>
            🎁 Vorlage ({data.cost} ✨)
          </button>
          <button type="button" onClick={() => setMode("custom")}
            style={tabStyle(mode === "custom")}>
            ✏️ Eigener Text ({data.costCustom} ✨)
          </button>
        </div>

        {mode === "preset" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 6 }}>
            {data.presets.map((p, i) => (
              <button key={i} type="button" onClick={() => setSelectedId(i)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                  textAlign: "left", borderRadius: 10, cursor: "pointer",
                  background: selectedId === i ? "linear-gradient(135deg,#fbcfe8,#f9a8d4)" : "rgba(0,0,0,0.04)",
                  border: selectedId === i ? "2px solid #ec4899" : "1px solid rgba(0,0,0,0.1)",
                  color: "inherit", fontFamily: "inherit",
                }}>
                <span style={{ fontSize: 22 }}>{p.emoji}</span>
                <span style={{ flex: 1, fontSize: 13 }}>{p.text}</span>
              </button>
            ))}
          </div>
        )}

        {mode === "custom" && (
          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
              {["💖","✨","🌸","🌟","🦋","🌈","🌻","🔥","😄","🎵"].map((e) => (
                <button key={e} type="button" onClick={() => setCustomEmoji(e)}
                  style={{
                    width: 36, height: 36, borderRadius: 8, cursor: "pointer",
                    background: customEmoji === e ? "#fce7f3" : "rgba(0,0,0,0.04)",
                    border: customEmoji === e ? "2px solid #ec4899" : "1px solid rgba(0,0,0,0.1)",
                    fontSize: 18,
                  }}>{e}</button>
              ))}
            </div>
            <textarea
              className="vv-textarea"
              rows={3}
              value={customText}
              onChange={(e) => setCustomText(e.target.value.slice(0, 200))}
              placeholder="Schreib was Liebes (max 200 Zeichen, mind. 6)"
              maxLength={200}
            />
            <div className="vv-muted" style={{ fontSize: 11, textAlign: "right" }}>
              {customText.length}/200
            </div>
          </div>
        )}

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
          <span>🕶 Anonym schicken (Empfänger sieht nicht von wem)</span>
        </label>

        {err && <div style={{ color: "#b91c1c", fontSize: 13, marginTop: 8, fontWeight: 700 }}>⚠ {err}</div>}

        <button type="button" disabled={busy || (mode === "custom" && customText.trim().length < 6)}
          onClick={send}
          style={{
            marginTop: 14, width: "100%", padding: "12px 14px", border: "none",
            borderRadius: 12, fontWeight: 800, fontSize: 14, cursor: "pointer",
            background: "linear-gradient(135deg,#ec4899,#be185d)", color: "#fff",
            opacity: busy ? 0.6 : 1,
          }}>
          {busy ? "Wird gesendet…" : `Für ${mode === "preset" ? data.cost : data.costCustom} ✨ senden`}
        </button>
      </div>
    </div>
  );
}

function tabStyle(active) {
  return {
    flex: 1, padding: "8px 10px", border: "none", cursor: "pointer",
    borderRadius: 8, fontWeight: 700, fontSize: 13, fontFamily: "inherit",
    background: active ? "linear-gradient(135deg,#ec4899,#be185d)" : "rgba(0,0,0,0.06)",
    color: active ? "#fff" : "inherit",
  };
}
