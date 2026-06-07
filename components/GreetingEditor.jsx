"use client";

// 🌸 Inline-Editor für die Begrüßungs-Box direkt auf der eigenen Profilseite.
// Statt "Profil bearbeiten" → "Begrüßung" zu klicken kann man direkt
// per ✏️-Icon an der Box bearbeiten, mit Live-Vorschau & Quick-Format-Toolbar.

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

const QUICK_COLORS = [
  ["#ec4899", "Pink"], ["#a855f7", "Violett"], ["#06b6d4", "Cyan"],
  ["#22c55e", "Grün"], ["#f59e0b", "Gold"], ["#ef4444", "Rot"],
  ["#f5e8ff", "Hell"], ["#1c1c1e", "Dunkel"],
];

export default function GreetingEditor({ username, initialHtml, onSaved, onCancel }) {
  const taRef = useRef(null);
  const [html, setHtml] = useState(initialHtml || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { taRef.current?.focus(); }, []);

  function wrap(open, close) {
    const ta = taRef.current; if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const before = html.slice(0, s), sel = html.slice(s, e), after = html.slice(e);
    const next = before + open + (sel || "Text") + close + after;
    setHtml(next);
    requestAnimationFrame(() => {
      ta.focus();
      const caretEnd = s + open.length + (sel || "Text").length;
      ta.setSelectionRange(caretEnd, caretEnd);
    });
  }

  const tools = [
    { label: "B", title: "Fett",   fn: () => wrap("<b>", "</b>"),   bold: true },
    { label: "I", title: "Kursiv", fn: () => wrap("<i>", "</i>"),   italic: true },
    { label: "U", title: "Unterstrichen", fn: () => wrap("<u>", "</u>"), underline: true },
    { label: "H", title: "Überschrift", fn: () => wrap('<h3 style="color:#ec4899;margin:8px 0;">', "</h3>") },
    { label: "•", title: "Liste", fn: () => wrap("<ul><li>", "</li></ul>") },
    { label: "↵", title: "Zeilenumbruch", fn: () => wrap("<br>", "") },
  ];

  async function save() {
    setBusy(true); setErr("");
    try {
      await api.updateMe(username, { greetingHtml: html });
      onSaved?.();
    } catch (e) { setErr(e.message || "Speichern fehlgeschlagen"); }
    finally { setBusy(false); }
  }

  return (
    <div className="vv-greet-editor">
      <div className="vv-greet-editor-toolbar">
        {tools.map((t) => (
          <button key={t.label} type="button" title={t.title} onClick={t.fn}
            style={{
              fontWeight: t.bold ? 900 : 700,
              fontStyle: t.italic ? "italic" : "normal",
              textDecoration: t.underline ? "underline" : "none",
            }}>
            {t.label}
          </button>
        ))}
        <span className="vv-greet-editor-sep" />
        {QUICK_COLORS.map(([c, name]) => (
          <button key={c} type="button" title={name}
            onClick={() => wrap(`<span style="color:${c};">`, "</span>")}
            className="vv-greet-editor-color"
            style={{ background: c, border: c === "#f5e8ff" ? "1px solid #aaa" : "none" }} />
        ))}
      </div>

      <textarea
        ref={taRef}
        className="vv-greet-editor-textarea"
        value={html}
        onChange={(e) => setHtml(e.target.value)}
        placeholder="Schreib hier deinen Begrüßungstext — HTML erlaubt! Beispiel:&#10;<b>Willkommen!</b> 💖&#10;<span style='color:#ec4899'>Schön dass du da bist!</span>"
        rows={6}
      />

      <div className="vv-greet-editor-preview-label">Live-Vorschau:</div>
      <div className="vv-greet-editor-preview vv-nost-greeting"
        dangerouslySetInnerHTML={{ __html: html || "<em style='opacity:0.5'>Noch nichts geschrieben…</em>" }} />

      {err && <div className="vv-greet-editor-error">⚠ {err}</div>}

      <div className="vv-greet-editor-actions">
        <button type="button" onClick={onCancel} disabled={busy} className="vv-greet-editor-cancel">
          Abbrechen
        </button>
        <button type="button" onClick={save} disabled={busy} className="vv-greet-editor-save">
          {busy ? "Speichert…" : "💾 Speichern"}
        </button>
      </div>
    </div>
  );
}
