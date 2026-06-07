"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

const TEXT_COLORS = [
  ["#ec4899", "Pink"], ["#db2777", "Hot-Pink"], ["#be185d", "Rose"], ["#9d174d", "Magenta"],
  ["#a855f7", "Violett"], ["#7c3aed", "Lila"], ["#c084fc", "Lavendel"], ["#6b21a8", "Pflaume"],
  ["#06b6d4", "Cyan"], ["#0891b2", "Tuerkis"], ["#2563eb", "Blau"], ["#1e40af", "Marine"],
  ["#22c55e", "Gruen"], ["#10b981", "Mint"], ["#84cc16", "Limette"], ["#15803d", "Tann"],
  ["#f59e0b", "Gold"], ["#f97316", "Orange"], ["#ef4444", "Rot"], ["#991b1b", "Bordeaux"],
  ["#1c1c1e", "Schwarz"], ["#6b7280", "Grau"], ["#d1d5db", "Hellgrau"], ["#ffffff", "Weiss"],
];

const HIGHLIGHT_COLORS = [
  ["#fef08a", "Gelb"], ["#fbcfe8", "Rosa"], ["#bfdbfe", "Blau"],
  ["#bbf7d0", "Gruen"], ["#fed7aa", "Orange"], ["#e9d5ff", "Lila"],
];

const FONT_SIZES = [["12px", "S"], ["16px", "M"], ["20px", "L"], ["26px", "XL"]];

export default function GreetingEditor({ username, initialHtml, onSaved, onCancel }) {
  const taRef = useRef(null);
  const customColorRef = useRef(null);
  const [html, setHtml] = useState(initialHtml || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(function () { if (taRef.current) taRef.current.focus(); }, []);

  function wrap(open, close) {
    const ta = taRef.current; if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const before = html.slice(0, s), sel = html.slice(s, e), after = html.slice(e);
    const next = before + open + (sel || "Text") + close + after;
    setHtml(next);
    requestAnimationFrame(function () {
      ta.focus();
      const caretEnd = s + open.length + (sel || "Text").length;
      ta.setSelectionRange(caretEnd, caretEnd);
    });
  }

  function applyColor(c) { wrap('<span style="color:' + c + ';">', '</span>'); }
  function applyHL(c) { wrap('<span style="background:' + c + ';padding:1px 4px;border-radius:3px;">', '</span>'); }
  function applySize(sz) { wrap('<span style="font-size:' + sz + ';">', '</span>'); }

  async function save() {
    setBusy(true); setErr("");
    try { await api.updateMe(username, { greetingHtml: html }); if (onSaved) onSaved(); }
    catch (e) { setErr((e && e.message) || "Speichern fehlgeschlagen"); }
    finally { setBusy(false); }
  }

  return (
    <div className="vv-greet-editor">
      <div className="vv-greet-editor-toolbar">
        <button type="button" title="Fett" onClick={function () { wrap("<b>", "</b>"); }} style={{ fontWeight: 900 }}>B</button>
        <button type="button" title="Kursiv" onClick={function () { wrap("<i>", "</i>"); }} style={{ fontStyle: "italic" }}>I</button>
        <button type="button" title="Unterstrichen" onClick={function () { wrap("<u>", "</u>"); }} style={{ textDecoration: "underline" }}>U</button>
        <button type="button" title="Ueberschrift" onClick={function () { wrap('<h3 style="color:#ec4899;margin:8px 0;">', "</h3>"); }}>H</button>
        <button type="button" title="Liste" onClick={function () { wrap("<ul><li>", "</li></ul>"); }}>•</button>
        <button type="button" title="Zeilenumbruch" onClick={function () { wrap("<br>", ""); }}>↵</button>
        <button type="button" title="Mittig" onClick={function () { wrap("<center>", "</center>"); }}>≡</button>
        <button type="button" title="Link" onClick={function () { wrap('<a href="https://" style="color:#ec4899;">', "</a>"); }}>🔗</button>
      </div>

      <div className="vv-greet-editor-section-label">Schriftgroesse</div>
      <div className="vv-greet-editor-sizes">
        {FONT_SIZES.map(function (sz) {
          return (<button key={sz[0]} type="button" title={sz[1]} onClick={function () { applySize(sz[0]); }}>{sz[1]}</button>);
        })}
      </div>

      <div className="vv-greet-editor-section-label">Textfarbe</div>
      <div className="vv-greet-editor-colors">
        {TEXT_COLORS.map(function (c) {
          return (<button key={c[0]} type="button" title={c[1]}
            onClick={function () { applyColor(c[0]); }}
            className="vv-greet-editor-color"
            data-color={c[0]}
            style={{ "--vv-c": c[0] }} />);
        })}
        <button type="button" className="vv-greet-editor-color vv-greet-editor-color-custom" title="Eigene Farbe"
          onClick={function () { if (customColorRef.current) customColorRef.current.click(); }}>🎨</button>
        <input ref={customColorRef} type="color" style={{ display: "none" }}
          onChange={function (e) { applyColor(e.target.value); }} />
      </div>

      <div className="vv-greet-editor-section-label">Hintergrund-Highlight</div>
      <div className="vv-greet-editor-colors">
        {HIGHLIGHT_COLORS.map(function (c) {
          return (<button key={c[0]} type="button" title={c[1]}
            onClick={function () { applyHL(c[0]); }}
            className="vv-greet-editor-color"
            data-color={c[0]}
            style={{ "--vv-c": c[0] }} />);
        })}
      </div>

      <textarea ref={taRef} className="vv-greet-editor-textarea" value={html}
        onChange={function (e) { setHtml(e.target.value); }}
        placeholder="Schreib hier deinen Begruessungstext - HTML erlaubt!" rows={7} />

      <div className="vv-greet-editor-preview-label">Live-Vorschau:</div>
      <div className="vv-greet-editor-preview"
        dangerouslySetInnerHTML={{ __html: html || "<em style='opacity:0.5'>Noch nichts geschrieben...</em>" }} />

      {err && <div className="vv-greet-editor-error">⚠ {err}</div>}

      <div className="vv-greet-editor-actions">
        <button type="button" onClick={onCancel} disabled={busy} className="vv-greet-editor-cancel">Abbrechen</button>
        <button type="button" onClick={save} disabled={busy} className="vv-greet-editor-save">
          {busy ? "Speichert..." : "💾 Speichern"}
        </button>
      </div>
    </div>
  );
}
