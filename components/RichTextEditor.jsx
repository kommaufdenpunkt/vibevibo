"use client";

// 📝 RichTextEditor — Textarea mit Markdown-Toolbar.
// Speichert Markdown, gerendert via RichTextDisplay.

import { useRef } from "react";

export default function RichTextEditor({
  value, onChange, placeholder, maxLength = 4000, minHeight = 120,
  themeColor = "#ec4899",
}) {
  const ref = useRef(null);

  function wrap(before, after = before) {
    const ta = ref.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const selected = value.slice(s, e);
    const newText = value.slice(0, s) + before + selected + after + value.slice(e);
    if (newText.length > maxLength) return;
    onChange(newText);
    // Cursor zurücksetzen nach State-Update
    requestAnimationFrame(() => {
      ta.focus();
      const pos = s + before.length + selected.length + after.length;
      ta.setSelectionRange(s + before.length, pos - after.length);
    });
  }

  function prefix(linePrefix) {
    const ta = ref.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const lineStart = value.lastIndexOf("\n", s - 1) + 1;
    const newText = value.slice(0, lineStart) + linePrefix + value.slice(lineStart);
    if (newText.length > maxLength) return;
    onChange(newText);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s + linePrefix.length, s + linePrefix.length);
    });
  }

  function insertLink() {
    const ta = ref.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const selected = value.slice(s, e);
    let label = selected;
    if (!label) {
      label = prompt("Beschriftung des Links (was im Text steht):", "");
      if (label === null) return;
      if (!label.trim()) label = "Link";
    }
    const url = prompt("URL eingeben (http:// oder https://):", "https://");
    if (!url || !url.trim()) return;
    const md = "[" + label + "](" + url.trim() + ")";
    const newText = value.slice(0, s) + md + value.slice(e);
    if (newText.length > maxLength) return;
    onChange(newText);
    requestAnimationFrame(() => ta.focus());
  }

  function insertImage() {
    const ta = ref.current;
    if (!ta) return;
    const url = prompt("Bild-URL eingeben (https://…):", "https://");
    if (!url || !url.trim()) return;
    const alt = prompt("Bild-Beschreibung (alt-Text, für Screenreader):", "Bild");
    const md = "![" + (alt || "Bild") + "](" + url.trim() + ")";
    const s = ta.selectionStart;
    const newText = value.slice(0, s) + md + value.slice(s);
    if (newText.length > maxLength) return;
    onChange(newText);
    requestAnimationFrame(() => ta.focus());
  }

  function insertEmoji(emoji) {
    const ta = ref.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const newText = value.slice(0, s) + emoji + value.slice(s);
    if (newText.length > maxLength) return;
    onChange(newText);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s + emoji.length, s + emoji.length);
    });
  }

  const QUICK_EMOJIS = ["✨", "🎉", "❤️", "🔥", "👋", "🌟", "💡", "🚀", "📌"];

  return (
    <div>
      {/* Toolbar */}
      <div style={{
        display: "flex", gap: 4, flexWrap: "wrap",
        padding: 6, borderRadius: "10px 10px 0 0",
        background: "#f8fafc",
        border: "1px solid rgba(0,0,0,0.1)",
        borderBottom: "none",
      }}>
        <ToolBtn title="Fett (Strg+B)" onClick={() => wrap("**")}>
          <b>B</b>
        </ToolBtn>
        <ToolBtn title="Kursiv (Strg+I)" onClick={() => wrap("*")}>
          <i>I</i>
        </ToolBtn>
        <ToolBtn title="Durchgestrichen" onClick={() => wrap("~~")}>
          <s>S</s>
        </ToolBtn>
        <ToolBtn title="Code" onClick={() => wrap("`")}>
          <code style={{ fontSize: 12 }}>{"</>"}</code>
        </ToolBtn>
        <span style={sep} />
        <ToolBtn title="Liste" onClick={() => prefix("- ")}>•</ToolBtn>
        <ToolBtn title="Zitat" onClick={() => prefix("> ")}>❝</ToolBtn>
        <ToolBtn title="Überschrift" onClick={() => prefix("## ")}>H</ToolBtn>
        <span style={sep} />
        <ToolBtn title="Link einfügen (mit Beschriftung)" onClick={insertLink}>🔗</ToolBtn>
        <ToolBtn title="Bild einfügen (per URL)" onClick={insertImage}>🖼</ToolBtn>
        <span style={sep} />
        {QUICK_EMOJIS.map((e) => (
          <ToolBtn key={e} title={"Emoji einfügen: " + e} onClick={() => insertEmoji(e)}>
            <span style={{ fontSize: 14 }}>{e}</span>
          </ToolBtn>
        ))}
      </div>

      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "b") { e.preventDefault(); wrap("**"); }
          if ((e.ctrlKey || e.metaKey) && e.key === "i") { e.preventDefault(); wrap("*"); }
        }}
        placeholder={placeholder}
        maxLength={maxLength}
        style={{
          width: "100%", minHeight, padding: "10px 12px",
          border: "1px solid rgba(0,0,0,0.1)",
          borderRadius: "0 0 10px 10px",
          fontSize: 14, fontFamily: "inherit", resize: "vertical",
          outline: "none",
        }}
        onFocus={(e) => e.target.style.borderColor = themeColor}
        onBlur={(e) => e.target.style.borderColor = "rgba(0,0,0,0.1)"}
      />
      <div style={{
        fontSize: 10.5, color: "#94a3b8", marginTop: 4,
        display: "flex", justifyContent: "space-between",
      }}>
        <span>{"Markdown: **fett** *kursiv* ~~strike~~ `code` [link](url)"}</span>
        <span>{value.length}/{maxLength}</span>
      </div>
    </div>
  );
}

function ToolBtn({ children, onClick, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        background: "#fff", border: "1px solid rgba(0,0,0,0.08)",
        padding: "4px 8px", borderRadius: 6,
        fontSize: 13, cursor: "pointer", color: "#475569",
        minWidth: 28, height: 26, display: "inline-flex",
        alignItems: "center", justifyContent: "center",
        fontWeight: 700,
      }}
    >{children}</button>
  );
}

const sep = {
  width: 1, background: "rgba(0,0,0,0.08)",
  margin: "0 2px",
};
