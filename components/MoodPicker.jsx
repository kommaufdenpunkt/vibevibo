"use client";

// 🎭 MoodPicker — eingebbarer Status mit Emoji + Text.
// Erscheint im Profil-Header oder in Settings.

import { useState, useEffect } from "react";

const QUICK_MOODS = [
  { emoji: "😊", label: "Glücklich" },
  { emoji: "🥰", label: "Verliebt" },
  { emoji: "😎", label: "Chillig" },
  { emoji: "🎉", label: "Am Feiern" },
  { emoji: "😴", label: "Müde" },
  { emoji: "💪", label: "Motiviert" },
  { emoji: "🎵", label: "Mit Musik" },
  { emoji: "🌟", label: "Stolz" },
  { emoji: "🌈", label: "Bunt drauf" },
  { emoji: "💭", label: "Nachdenklich" },
  { emoji: "🔥", label: "Voll dabei" },
  { emoji: "☕", label: "Kaffee-Modus" },
];

export default function MoodPicker({ initialMood, onSaved }) {
  const [emoji, setEmoji] = useState(initialMood?.emoji || "");
  const [text, setText]   = useState(initialMood?.text || "");
  const [busy, setBusy]   = useState(false);
  const [savedAt, setSavedAt] = useState(initialMood?.setAt || 0);

  useEffect(() => {
    setEmoji(initialMood?.emoji || "");
    setText(initialMood?.text || "");
    setSavedAt(initialMood?.setAt || 0);
  }, [initialMood]);

  async function save() {
    setBusy(true);
    try {
      const r = await fetch("/api/me/mood", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji, text }),
      });
      const d = await r.json();
      if (r.ok) {
        setSavedAt(d.mood?.setAt || Date.now());
        onSaved?.(d.mood);
      }
    } finally { setBusy(false); }
  }

  async function clear() {
    setBusy(true);
    try {
      await fetch("/api/me/mood", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clear: true }),
      });
      setEmoji(""); setText(""); setSavedAt(0);
      onSaved?.({ emoji: "", text: "", setAt: 0 });
    } finally { setBusy(false); }
  }

  return (
    <div style={{
      background: "rgba(255,255,255,0.95)", borderRadius: 14, padding: 16,
    }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 900 }}>
        🎭 Wie geht's dir gerade?
      </h3>

      {/* Quick-Pick */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 6, marginBottom: 12 }}>
        {QUICK_MOODS.map((m) => (
          <button key={m.emoji} type="button" onClick={() => { setEmoji(m.emoji); setText(m.label); }}
            style={{
              padding: 10, borderRadius: 10, border: "1px solid #e5e5e7",
              background: emoji === m.emoji ? "linear-gradient(135deg, rgba(236,72,153,0.15), rgba(168,85,247,0.1))" : "#fafafa",
              cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 700,
              borderColor: emoji === m.emoji ? "#ec4899" : "#e5e5e7",
            }}>
            <div style={{ fontSize: 22 }}>{m.emoji}</div>
            <div style={{ color: "#475569", marginTop: 2 }}>{m.label}</div>
          </button>
        ))}
      </div>

      {/* Custom */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input value={emoji} onChange={(e) => setEmoji(e.target.value.slice(0, 4))}
          placeholder="😎" maxLength={4}
          style={{ width: 50, padding: 10, fontSize: 20, textAlign: "center", borderRadius: 10, border: "1px solid #cbd5e1", fontFamily: "inherit" }} />
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={160}
          placeholder="Was ist los? (max 160 Zeichen)"
          style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 13, fontFamily: "inherit" }} />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={save} disabled={busy || (!emoji && !text)}
          style={{
            flex: 1, padding: 11, borderRadius: 10,
            background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "#fff",
            border: "none", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
            opacity: (emoji || text) ? 1 : 0.5,
          }}>
          {busy ? "⏳…" : "💾 Status setzen"}
        </button>
        {(emoji || text || savedAt > 0) && (
          <button onClick={clear} disabled={busy} style={{
            padding: "11px 16px", borderRadius: 10,
            background: "#f5f5f7", color: "#475569", border: "1px solid #e5e5e7",
            fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          }}>✕ Löschen</button>
        )}
      </div>

      {savedAt > 0 && (
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>
          Zuletzt gesetzt: {new Date(savedAt).toLocaleString("de-DE")}
        </div>
      )}
    </div>
  );
}
