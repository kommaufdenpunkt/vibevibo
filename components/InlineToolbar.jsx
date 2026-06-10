"use client";

// 🎀 Formatierungs-Toolbar fuer Pinnwand / Gaestebuch / aehnliche Plaintext-Inputs.
// Operiert auf einem ueber Ref weitergegebenen Text-State (textareaRef + value + onChange).
// Setzt HTML-Tags um die aktuelle Selektion und merkt sich Cursor-Position.
//
// Erlaubt: B/I/U/S, Farbe, Link, Bild-URL, Emoji-Picker, Trennlinie.
// HTML wird beim Speichern serverseitig durch sanitizeHtml gejagt.

import { useRef, useState } from "react";

const COLORS = [
  "#ec4899", "#a855f7", "#3b82f6", "#0891b2",
  "#22c55e", "#f59e0b", "#ef4444", "#1c1c1e",
];

const QUICK_EMOJIS = [
  "😀", "😂", "🥰", "😎", "🤔", "😢", "🔥", "💖",
  "✨", "🎉", "🌸", "👍", "🙏", "💪", "🌈", "🎵",
];

export default function InlineToolbar({ taRef, value, onChange, maxLength = 1000 }) {
  const [colorOpen, setColorOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);

  function wrap(before, after = "") {
    const el = taRef?.current;
    if (!el) return;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || "Text";
    const next = (value.slice(0, start) + before + selected + after + value.slice(end)).slice(0, maxLength);
    onChange(next);
    setTimeout(() => {
      el.focus();
      const pos = start + before.length + selected.length + after.length;
      el.setSelectionRange(pos, pos);
    }, 0);
  }

  function insert(snippet) {
    const el = taRef?.current;
    if (!el) return;
    const start = el.selectionStart ?? value.length;
    const next = (value.slice(0, start) + snippet + value.slice(start)).slice(0, maxLength);
    onChange(next);
    setTimeout(() => {
      el.focus();
      const pos = start + snippet.length;
      el.setSelectionRange(pos, pos);
    }, 0);
  }

  function insertLink() {
    const url = prompt("Link-URL (https://…):", "https://");
    if (!url) return;
    wrap(`<a href="${url}" target="_blank">`, "</a>");
  }

  function insertImage() {
    const url = prompt("Bild-URL (https://…):", "");
    if (!url) return;
    insert(`<img src="${url}" alt="" style="max-width:100%;border-radius:8px" />`);
  }

  const btn = {
    background: "#fff", border: "1px solid #fbcfe8", borderRadius: 6,
    padding: "4px 8px", cursor: "pointer", fontSize: 13, fontWeight: 700,
    color: "#831843", minWidth: 28, fontFamily: "inherit",
  };

  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4,
      padding: 4, background: "rgba(252,231,243,0.4)", borderRadius: 8,
      position: "relative",
    }}>
      <button type="button" onMouseDown={(e) => e.preventDefault()}
        onClick={() => wrap("<b>", "</b>")} title="Fett" style={{ ...btn, fontWeight: 900 }}>B</button>
      <button type="button" onMouseDown={(e) => e.preventDefault()}
        onClick={() => wrap("<i>", "</i>")} title="Kursiv" style={{ ...btn, fontStyle: "italic" }}>I</button>
      <button type="button" onMouseDown={(e) => e.preventDefault()}
        onClick={() => wrap("<u>", "</u>")} title="Unterstrichen" style={{ ...btn, textDecoration: "underline" }}>U</button>
      <button type="button" onMouseDown={(e) => e.preventDefault()}
        onClick={() => wrap("<s>", "</s>")} title="Durchgestrichen" style={{ ...btn, textDecoration: "line-through" }}>S</button>

      <span style={{ width: 1, background: "#fbcfe8", margin: "2px 0" }} />

      <button type="button" onMouseDown={(e) => e.preventDefault()}
        onClick={() => setColorOpen((v) => !v)} title="Farbe" style={btn}>🎨</button>
      {colorOpen && (
        <div style={{
          position: "absolute", top: "100%", left: 4, zIndex: 50,
          background: "#fff", border: "1px solid #fbcfe8", borderRadius: 8,
          padding: 6, display: "flex", gap: 4, flexWrap: "wrap",
          boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
        }}>
          {COLORS.map((c) => (
            <button key={c} type="button" onMouseDown={(e) => e.preventDefault()}
              onClick={() => { wrap(`<span style="color:${c}">`, "</span>"); setColorOpen(false); }}
              style={{
                width: 22, height: 22, borderRadius: "50%",
                background: c, border: "2px solid #fff", cursor: "pointer",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} title={c} />
          ))}
        </div>
      )}

      <button type="button" onMouseDown={(e) => e.preventDefault()}
        onClick={() => setEmojiOpen((v) => !v)} title="Emoji" style={btn}>😀</button>
      {emojiOpen && (
        <div style={{
          position: "absolute", top: "100%", left: 4, zIndex: 50,
          background: "#fff", border: "1px solid #fbcfe8", borderRadius: 8,
          padding: 8, display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 4,
          boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
        }}>
          {QUICK_EMOJIS.map((e) => (
            <button key={e} type="button" onMouseDown={(ev) => ev.preventDefault()}
              onClick={() => { insert(e); setEmojiOpen(false); }}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, padding: 2 }}>{e}</button>
          ))}
        </div>
      )}

      <button type="button" onMouseDown={(e) => e.preventDefault()}
        onClick={insertLink} title="Link" style={btn}>🔗</button>
      <button type="button" onMouseDown={(e) => e.preventDefault()}
        onClick={insertImage} title="Bild-URL" style={btn}>🖼</button>
      <button type="button" onMouseDown={(e) => e.preventDefault()}
        onClick={() => insert("<hr />")} title="Trennlinie" style={btn}>⎯</button>
    </div>
  );
}
