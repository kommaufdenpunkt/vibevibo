"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

// Cache der Mitgliederliste pro Tab (max 60 Sek)
let usersCache = null;
let usersCacheAt = 0;
async function loadUsers() {
  const now = Date.now();
  if (usersCache && (now - usersCacheAt) < 60_000) return usersCache;
  try {
    const d = await api.listUsers();
    usersCache = d.users || [];
    usersCacheAt = now;
    return usersCache;
  } catch {
    return usersCache || [];
  }
}

// Findet einen @-Tag direkt vor der Caret-Position. Liefert {start, end, query} oder null.
function findMention(text, caret) {
  let i = caret - 1;
  while (i >= 0 && /[a-z0-9_.]/i.test(text[i])) i--;
  if (i < 0 || text[i] !== "@") return null;
  const prev = i === 0 ? "" : text[i - 1];
  if (prev && !/\s/.test(prev)) return null; // kein E-Mail-At
  return { start: i, end: caret, query: text.slice(i + 1, caret).toLowerCase() };
}

export default function MentionTextarea({
  value, onChange,
  placeholder, rows = 2, maxLength = 1000,
  className = "vv-textarea",
  innerRef,
  ...rest
}) {
  const localRef = useRef(null);
  const ref = innerRef || localRef;
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState(null);
  const [queryRange, setQueryRange] = useState(null);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => { loadUsers().then(setUsers); }, []);

  function handleChange(e) {
    const newText = e.target.value;
    onChange(newText);
    const caret = e.target.selectionStart || newText.length;
    const m = findMention(newText, caret);
    if (m) {
      setQuery(m.query);
      setQueryRange({ start: m.start, end: m.end });
      setActiveIdx(0);
    } else {
      setQuery(null);
      setQueryRange(null);
    }
  }

  function pickUser(username) {
    if (!queryRange) return;
    const newText = value.slice(0, queryRange.start) + "@" + username + " " + value.slice(queryRange.end);
    onChange(newText);
    setQuery(null);
    setQueryRange(null);
    setTimeout(() => {
      const el = ref.current;
      if (el) {
        const pos = queryRange.start + username.length + 2;
        el.focus();
        try { el.setSelectionRange(pos, pos); } catch { /* ignore */ }
      }
    }, 0);
  }

  const suggestions = query === null ? [] : users.filter((u) => {
    const uname = u.username.toLowerCase();
    const dname = (u.displayName || "").toLowerCase();
    return uname.startsWith(query) || (query.length > 0 && (uname.includes(query) || dname.includes(query)));
  }).slice(0, 6);

  function handleKeyDown(e) {
    if (query === null || suggestions.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => (i + 1) % suggestions.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => (i - 1 + suggestions.length) % suggestions.length); }
    else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pickUser(suggestions[activeIdx].username); }
    else if (e.key === "Escape") { setQuery(null); setQueryRange(null); }
  }

  return (
    <div style={{ position: "relative" }}>
      <textarea
        ref={ref}
        className={className}
        rows={rows}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        {...rest}
      />
      {suggestions.length > 0 && (
        <div style={{
          position: "absolute", left: 0, top: "100%", zIndex: 20,
          width: "min(320px, 100%)", background: "#fff", borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.22)", padding: 4, marginTop: 4,
          fontFamily: "Arial, sans-serif",
        }}>
          <div style={{ fontSize: 10, color: "#888", padding: "2px 8px 4px" }}>↑/↓ wählen · ↵ einfügen · Esc</div>
          {suggestions.map((u, idx) => (
            <button
              key={u.username}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pickUser(u.username)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 8,
                padding: "6px 8px", border: "none",
                background: idx === activeIdx ? "#ffe6f2" : "transparent",
                cursor: "pointer", borderRadius: 6, fontSize: 13, textAlign: "left",
              }}
            >
              <span style={{ color: "#c2185b", fontWeight: "bold" }}>@{u.username}</span>
              <span style={{ color: "#666", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.displayName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
