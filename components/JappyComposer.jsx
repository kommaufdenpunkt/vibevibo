"use client";

// 📝 Jappy-Style Inline-Composer für die Startseite.
// Smileys, Bold/Italic, Post-Typen, Char-Counter — alles inline ohne Seiten-Wechsel.
//
// Bold/Italic werden als Markdown gespeichert (**fett**, *kursiv*).
// Renderer-Seitige Anzeige bleibt v1 als Klartext — Markdown-Hooks kommen später.

import { useRef, useState } from "react";

const SMILEYS = [
  "😀","😃","😄","😁","😆","😅","🤣","😂",
  "🙂","😊","😍","🥰","😘","😎","🤩","🥳",
  "🤔","😏","😒","🙄","😴","😪","😭","😢",
  "😩","😤","😡","🤬","😱","😨","🥺","🤗",
  "💖","❤️","💔","💕","💞","✨","🌟","⭐",
  "☀️","🌈","🎉","🎊","🍀","🌸","🌹","🎵",
];

const POST_TYPES = [
  { id: "free",         label: "💬 Frei",     color: "#6366f1" },
  { id: "quote",        label: "🌹 Zitat",    color: "#ec4899" },
  { id: "feeling",      label: "💭 Gefühl",   color: "#a855f7" },
  { id: "mention",      label: "👯 Mit-@",    color: "#06b6d4" },
  { id: "memory",       label: "📅 Memory",   color: "#f97316" },
  { id: "now_playing",  label: "🎵 Musik",    color: "#10b981" },
  { id: "never_forget", label: "💔 Nie-vergessen", color: "#475569" },
];

const MAX_LEN = 280;

export default function JappyComposer({ onPosted }) {
  const [text, setText] = useState("");
  const [postType, setPostType] = useState("free");
  const [showSmileys, setShowSmileys] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const textareaRef = useRef(null);

  function insertAtCursor(snippet) {
    const ta = textareaRef.current;
    if (!ta) {
      setText((t) => t + snippet);
      return;
    }
    const start = ta.selectionStart || 0;
    const end = ta.selectionEnd || 0;
    const next = text.slice(0, start) + snippet + text.slice(end);
    setText(next);
    // Cursor hinter eingefügten Snippet setzen
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + snippet.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  function wrapSelection(prefix, suffix = prefix) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart || 0;
    const end = ta.selectionEnd || 0;
    const selected = text.slice(start, end);
    const replacement = prefix + (selected || "Text") + suffix;
    const next = text.slice(0, start) + replacement + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      ta.focus();
      const innerStart = start + prefix.length;
      const innerEnd = innerStart + (selected || "Text").length;
      ta.setSelectionRange(innerStart, innerEnd);
    });
  }

  async function submit() {
    if (text.trim().length < 2) return;
    setBusy(true); setFlash("");
    try {
      const r = await fetch("/api/buschfunk/post", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postType, text }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Fehler");
      setText("");
      setPostType("free");
      setShowSmileys(false);
      setFlash("✓ Gepostet! Wird gleich im Feed sichtbar.");
      setTimeout(() => setFlash(""), 3500);
      onPosted?.();
    } catch (e) {
      setFlash("⚠ " + e.message);
      setTimeout(() => setFlash(""), 5000);
    } finally { setBusy(false); }
  }

  const remaining = MAX_LEN - text.length;
  const activeType = POST_TYPES.find((t) => t.id === postType) || POST_TYPES[0];
  const canSubmit = text.trim().length >= 2 && remaining >= 0 && !busy;

  return (
    <div style={{
      background: "rgba(255,255,255,0.96)",
      border: `3px ridge ${activeType.color}`,
      borderRadius: 14, padding: 14, marginBottom: 12,
      boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
    }}>
      {/* Post-Typ-Pillen */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
        {POST_TYPES.map((t) => {
          const active = postType === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setPostType(t.id)}
              style={{
                padding: "5px 10px", borderRadius: 999,
                background: active ? `linear-gradient(135deg, ${t.color}, ${t.color}cc)` : "rgba(0,0,0,0.04)",
                color: active ? "#fff" : "#475569",
                border: active ? `2px ridge ${t.color}` : "1.5px solid rgba(0,0,0,0.08)",
                fontSize: 11, fontWeight: active ? 900 : 700, cursor: "pointer",
                fontFamily: "inherit",
                textShadow: active ? "0 1px 1px rgba(0,0,0,0.25)" : "none",
              }}
            >{t.label}</button>
          );
        })}
      </div>

      {/* Toolbar: Bold / Italic / Smileys */}
      <div style={{ display: "flex", gap: 4, marginBottom: 6, alignItems: "center" }}>
        <button type="button" onClick={() => wrapSelection("**")} title="Fett (Markdown **text**)"
          style={tbtnStyle}><b>F</b></button>
        <button type="button" onClick={() => wrapSelection("*")} title="Kursiv (*text*)"
          style={{ ...tbtnStyle, fontStyle: "italic" }}>K</button>
        <button type="button" onClick={() => setShowSmileys((s) => !s)}
          title="Smileys"
          style={{
            ...tbtnStyle,
            background: showSmileys ? `linear-gradient(135deg, ${activeType.color}cc, ${activeType.color})` : "rgba(0,0,0,0.04)",
            color: showSmileys ? "#fff" : "#475569",
            fontSize: 16,
          }}>😀</button>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: remaining < 20 ? "#dc2626" : "#94a3b8", fontWeight: remaining < 20 ? 800 : 600 }}>
          {remaining}
        </span>
      </div>

      {/* Smiley-Picker */}
      {showSmileys && (
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 2,
          padding: 8, marginBottom: 8,
          background: "linear-gradient(135deg, #fce7f3, #f5d0fe)",
          border: `2px ridge ${activeType.color}`,
          borderRadius: 8,
        }}>
          {SMILEYS.map((s) => (
            <button key={s} type="button" onClick={() => insertAtCursor(s)} style={{
              padding: 4, fontSize: 22, background: "transparent",
              border: "none", cursor: "pointer", borderRadius: 4,
              transition: "background 0.12s, transform 0.12s",
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.7)"; e.currentTarget.style.transform = "scale(1.18)"; }}
            onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.transform = "scale(1)"; }}
            >{s}</button>
          ))}
        </div>
      )}

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, MAX_LEN + 50))}
        placeholder="Was läuft heute? — Smileys mit 😀, Fett mit **text**, Kursiv mit *text*"
        rows={3}
        style={{
          width: "100%", padding: 12, borderRadius: 10,
          border: `2px solid ${activeType.color}33`,
          fontFamily: "inherit", fontSize: 14, lineHeight: 1.5,
          background: "#fff", boxSizing: "border-box", resize: "vertical",
          outline: "none", minHeight: 80,
        }}
      />

      {/* Flash + Submit */}
      {flash && (
        <div style={{
          marginTop: 8, padding: 8, borderRadius: 8, fontSize: 12, fontWeight: 700,
          background: flash.startsWith("⚠") ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.12)",
          color: flash.startsWith("⚠") ? "#991b1b" : "#15803d",
          textAlign: "center",
        }}>{flash}</div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
        <span style={{ flex: 1, fontSize: 10.5, color: "#94a3b8", fontStyle: "italic" }}>
          Tipp: @username markiert Freunde + sendet ihnen eine Benachrichtigung.
        </span>
        <button onClick={submit} disabled={!canSubmit} style={{
          padding: "10px 22px", borderRadius: 999,
          background: canSubmit
            ? `linear-gradient(135deg, ${activeType.color}, ${activeType.color}cc)`
            : "#cbd5e1",
          color: "#fff", border: "2px ridge rgba(255,255,255,0.5)",
          fontWeight: 900, fontSize: 13,
          cursor: canSubmit ? "pointer" : "not-allowed",
          fontFamily: "inherit", letterSpacing: 0.5,
          textShadow: "0 1px 2px rgba(0,0,0,0.3)",
          boxShadow: canSubmit ? `0 4px 12px ${activeType.color}55` : "none",
        }}>
          {busy ? "⏳ …" : `📣 ${activeType.label.split(" ").slice(1).join(" ") || "Posten"}`}
        </button>
      </div>
    </div>
  );
}

const tbtnStyle = {
  width: 28, height: 28, borderRadius: 6,
  background: "rgba(0,0,0,0.04)", color: "#475569",
  border: "1.5px solid rgba(0,0,0,0.08)",
  cursor: "pointer", fontFamily: "inherit", fontSize: 13,
  display: "flex", alignItems: "center", justifyContent: "center",
};
