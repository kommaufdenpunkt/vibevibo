"use client";

// 📝 RichTextEditor — Textarea mit Markdown-Toolbar.
// Speichert Markdown, gerendert via RichTextDisplay.

import { useRef, useState, useEffect } from "react";

const EMOJI_CATEGORIES = {
  "😀 Gesichter": [
    "😀","😁","😂","🤣","😊","😇","🙂","🙃","😉","😌","😍","🥰","😘","😗","😙","😚",
    "😋","😛","😝","😜","🤪","🤨","🧐","🤓","😎","🥳","🥹","🤩","🥸","😏","😒","😞",
    "😔","😟","😕","🙁","☹️","😣","😖","😫","😩","🥺","😢","😭","😤","😠","😡","🤬",
    "🤯","😳","🥵","🥶","😱","😨","😰","😥","😓","🤗","🤔","🤭","🤫","🤥","😶","😐",
    "😑","😬","🙄","😯","😦","😧","😮","😲","🥱","😴","🤤","😪","😵","🤐","🥴","🤢",
    "🤮","🤧","😷","🤒","🤕","🤑","🤠","😈","👿","👹","👺","🤡","💩","👻","💀","☠️",
    "👽","👾","🤖",
  ],
  "👋 Hände": [
    "👋","🤚","🖐","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆",
    "👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","✍️","💅",
    "🤳","💪","🦾","🦿",
  ],
  "❤️ Herzen & Liebe": [
    "❤️","🧡","💛","💚","💙","💜","🤎","🖤","🤍","💔","❣️","💕","💞","💓","💗","💖",
    "💘","💝","💟","💌","💋","💑","💏","👩‍❤️‍👨","👨‍❤️‍👨","👩‍❤️‍👩",
  ],
  "✨ Symbole": [
    "✨","⭐","🌟","💫","🔥","⚡","💥","☄️","☀️","🌈","☁️","⛅","☁","🌤","⛈","🌩",
    "❄️","☃","⛄","💨","💧","🌊","🎉","🎊","🎁","🎀","🎈","🪅","🎆","🎇","🧨","🪩",
    "✅","❌","⭕","❗","❓","‼️","⁉️","💯","🆙","🆒","🆕","🆓","🔝","🆗","🅾️","🚫",
  ],
  "🎵 Aktivitäten": [
    "🎮","🕹","🎯","🎲","🧩","🎰","🎨","🎭","🎬","📸","📷","🎤","🎧","🎵","🎶","🎼",
    "🎹","🥁","🎸","🎺","🎷","🎻","🪕","⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🎱",
    "🏓","🏸","🥅","🪁","🛷","⛷","🏂","🏄","🚴","🏃","💃","🕺","🤸","🤾","🤽","🏇",
  ],
  "🍕 Essen": [
    "☕","🍵","🧋","🥤","🍺","🍻","🍷","🍸","🍹","🥂","🍾","🍶","🥃","🧉","🍕","🍔",
    "🌭","🥪","🌮","🌯","🥙","🍝","🍜","🍲","🍛","🍣","🍱","🍤","🥟","🥗","🍿","🧈",
    "🥨","🥖","🍞","🥯","🧀","🥚","🍳","🥞","🧇","🥓","🥩","🍗","🍖","🍕","🍰","🎂",
    "🧁","🍮","🍭","🍬","🍫","🍩","🍪","🍯","🍓","🍇","🍉","🍊","🍌","🍍","🥭","🍎",
  ],
  "🐶 Tiere & Natur": [
    "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐻‍❄️","🐨","🐯","🦁","🐮","🐷","🐸","🐵",
    "🙈","🙉","🙊","🐒","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄",
    "🐝","🐛","🦋","🐌","🐞","🐜","🦗","🕷","🦂","🐢","🐍","🦎","🦖","🦕","🐙","🦑",
    "🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🐊","🐅","🐆","🦓","🦍","🦧","🐘",
    "🦛","🦏","🐪","🐫","🦒","🦘","🐃","🐂","🐄","🐎","🐖","🐏","🐑","🦙","🐐","🦌",
    "🌸","💐","🌹","🥀","🌺","🌻","🌷","🌼","🌱","🌿","☘","🍀","🍃","🍂","🍁","🌳",
    "🌲","🌴","🌵","🌾","🌎","🌍","🌏","🌕","🌖","🌗","🌘","🌑","🌒","🌓","🌔","🌚",
  ],
  "🚀 Reise & Orte": [
    "✈️","🚀","🛸","🚁","🛩","🛫","🛬","🪂","💺","🚆","🚄","🚅","🚈","🚉","🚊","🚝",
    "🚞","🚋","🚃","🚂","🛤","🚌","🚍","🚎","🚐","🚑","🚒","🚓","🚔","🚕","🚖","🚗",
    "🚙","🛻","🚚","🚛","🚜","🏎","🏍","🛵","🦽","🦼","🛴","🚲","⛵","🚤","🚢","⛴",
    "🛥","🚣","🏠","🏡","🏘","🏚","🏗","🏭","🏢","🏬","🏣","🏤","🏥","🏦","🏨","🏪",
    "🏫","🏩","💒","🏛","⛪","🕌","🕍","🛕","🕋","⛩","🗼","🗽","🎡","🎢","🎠",
  ],
  "📌 Objekte & Werkzeuge": [
    "📌","📍","📎","🖇","✏️","✒️","🖋","🖊","🖌","🖍","📝","💼","📁","📂","🗂","📅",
    "📆","🗒","🗓","📇","📈","📉","📊","📋","📌","📍","📎","🖇","📏","📐","✂️","🗃",
    "🗄","🗑","🔒","🔓","🔏","🔐","🔑","🗝","🔨","⛏","⚒","🛠","🗡","⚔","🔫","🪃",
    "🏹","🛡","🪚","🔧","🪛","🔩","⚙️","🪤","🧰","🧲","🧪","🧫","🧬","🔬","🔭","📡",
    "💉","🩸","💊","🩹","🩺","🚪","🛗","🪟","🛏","🛋","🪑","🚽","🪠","🚿","🛁","🪥",
  ],
};

const RECENT_KEY = "vv_recent_emojis";
const MAX_RECENT = 16;

export default function RichTextEditor({
  value, onChange, placeholder, maxLength = 4000, minHeight = 120,
  themeColor = "#ec4899",
}) {
  const ref = useRef(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [category, setCategory] = useState(Object.keys(EMOJI_CATEGORIES)[0]);
  const [recent, setRecent] = useState([]);
  const popoverRef = useRef(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
      if (Array.isArray(saved)) setRecent(saved.slice(0, MAX_RECENT));
    } catch {}
  }, []);

  // Klick außerhalb schließt Popover
  useEffect(() => {
    if (!emojiOpen) return;
    function onClick(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setEmojiOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [emojiOpen]);

  function pushRecent(emoji) {
    const next = [emoji, ...recent.filter((x) => x !== emoji)].slice(0, MAX_RECENT);
    setRecent(next);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
  }

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
    pushRecent(emoji);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s + emoji.length, s + emoji.length);
    });
  }

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
        <div style={{ position: "relative", display: "inline-block" }} ref={popoverRef}>
          <ToolBtn
            title="Emoji einfügen"
            onClick={() => setEmojiOpen((o) => !o)}
            active={emojiOpen}
          >
            <span style={{ fontSize: 15 }}>😀</span>
          </ToolBtn>
          {emojiOpen && (
            <div style={{
              position: "absolute", top: "100%", left: 0, marginTop: 4,
              background: "#fff", border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
              padding: 8, zIndex: 100,
              width: 320, maxWidth: "calc(100vw - 40px)",
            }}>
              {/* Kategorie-Tabs */}
              <div style={{
                display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap",
                paddingBottom: 6, borderBottom: "1px solid rgba(0,0,0,0.06)",
              }}>
                {recent.length > 0 && (
                  <CatTab active={category === "_recent"} onClick={() => setCategory("_recent")}>🕒</CatTab>
                )}
                {Object.keys(EMOJI_CATEGORIES).map((cat) => {
                  const emoji = cat.split(" ")[0];
                  return (
                    <CatTab key={cat} active={category === cat} onClick={() => setCategory(cat)} title={cat.slice(2)}>
                      {emoji}
                    </CatTab>
                  );
                })}
              </div>
              {/* Emoji-Grid */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(8, 1fr)",
                gap: 2, maxHeight: 220, overflowY: "auto",
              }}>
                {(category === "_recent" ? recent : EMOJI_CATEGORIES[category] || []).map((e, i) => (
                  <button
                    key={e + i}
                    type="button"
                    onClick={() => insertEmoji(e)}
                    style={{
                      background: "transparent", border: "none",
                      padding: 4, borderRadius: 6, cursor: "pointer",
                      fontSize: 20, lineHeight: 1,
                    }}
                    onMouseEnter={(ev) => ev.currentTarget.style.background = "#f1f5f9"}
                    onMouseLeave={(ev) => ev.currentTarget.style.background = "transparent"}
                  >{e}</button>
                ))}
              </div>
              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 6, textAlign: "center" }}>
                {category === "_recent" ? "Zuletzt verwendet" : category}
              </div>
            </div>
          )}
        </div>
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

function ToolBtn({ children, onClick, title, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        background: active ? "#fef3c7" : "#fff",
        border: active ? "1px solid #f59e0b" : "1px solid rgba(0,0,0,0.08)",
        padding: "4px 8px", borderRadius: 6,
        fontSize: 13, cursor: "pointer", color: "#475569",
        minWidth: 28, height: 26, display: "inline-flex",
        alignItems: "center", justifyContent: "center",
        fontWeight: 700,
      }}
    >{children}</button>
  );
}

function CatTab({ children, active, onClick, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        background: active ? "#fdf2f8" : "transparent",
        border: active ? "1px solid #ec4899" : "1px solid transparent",
        padding: "4px 7px", borderRadius: 6,
        fontSize: 16, cursor: "pointer",
        minWidth: 30, lineHeight: 1,
      }}
    >{children}</button>
  );
}

const sep = {
  width: 1, background: "rgba(0,0,0,0.08)",
  margin: "0 2px",
};
