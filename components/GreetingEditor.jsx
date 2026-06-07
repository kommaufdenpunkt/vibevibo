"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

const MAX_LEN = 1200;

const TEXT_COLORS = [
  ["#ec4899", "Pink"], ["#db2777", "Hot-Pink"], ["#be185d", "Rose"], ["#9d174d", "Magenta"],
  ["#a855f7", "Violett"], ["#7c3aed", "Lila"], ["#c084fc", "Lavendel"],
  ["#06b6d4", "Cyan"], ["#0891b2", "Tuerkis"], ["#2563eb", "Blau"],
  ["#22c55e", "Gruen"], ["#10b981", "Mint"], ["#84cc16", "Limette"],
  ["#f59e0b", "Gold"], ["#f97316", "Orange"], ["#ef4444", "Rot"], ["#991b1b", "Bordeaux"],
  ["#1c1c1e", "Schwarz"], ["#6b7280", "Grau"], ["#ffffff", "Weiss"],
];

const HIGHLIGHT_COLORS = [
  ["#fef08a", "Gelb-Marker"], ["#fbcfe8", "Rosa-Marker"], ["#bfdbfe", "Blau-Marker"],
  ["#bbf7d0", "Gruen-Marker"], ["#fed7aa", "Orange-Marker"], ["#e9d5ff", "Lila-Marker"],
];

const FONT_SIZES = [
  ["6px","6"],["8px","8"],["10px","10"],["11px","11"],["12px","12"],["14px","14"],["16px","16"],["18px","18"],["20px","20"],["22px","22"],["24px","24"],["26px","26"],["28px","28"],["32px","32"],["36px","36"],["40px","40"],["48px","48"],["56px","56"],["64px","64"],["72px","72"],
];

const EMOJIS = [
  "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇",
  "🥰","😍","🤩","😘","😗","😙","😚","😋","😛","😜","🤪","😝","🤑",
  "🤗","🤭","🤫","🤔","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬",
  "😌","😔","😪","🤤","😴","😷","🤒","🤕","🥺","😢","😭","😤","😠",
  "🥳","😎","🤓","🧐","🤠","🤡","👻","💀","👽","👾","🤖","💩",
  "❤️","🧡","💛","💚","💙","💜","🖤","🤍","💔","💕","💞","💖",
  "✨","⭐","🌟","💫","🌈","🔥","💯","💢","💥","💦","💨",
  "🎉","🎊","🎁","🎂","🍰","🍕","🍔","🍟","🌮","🍩","🍪",
  "☕","🍺","🍷","🥂","🍾","🍹","🍸",
  "🌸","🌺","🌻","🌷","🌹","🥀","🍀","🌿","🌱","🌳","🌲",
  "🐶","🐱","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵",
];

function extractYouTubeId(url) {
  if (!url) return null;
  const m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

export default function GreetingEditor({ username, initialHtml, onSaved, onCancel }) {
  const taRef = useRef(null);
  const customColorRef = useRef(null);
  const [html, setHtml] = useState(initialHtml || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showEmojis, setShowEmojis] = useState(false);

  useEffect(function () { if (taRef.current) taRef.current.focus(); }, []);

  function wrap(open, close) {
    const ta = taRef.current; if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const before = html.slice(0, s), sel = html.slice(s, e), after = html.slice(e);
    const inner = sel || "";
    const next = before + open + inner + close + after;
    if (next.length > MAX_LEN) return;
    setHtml(next);
    requestAnimationFrame(function () {
      ta.focus();
      const caretEnd = s + open.length + inner.length;
      ta.setSelectionRange(caretEnd, caretEnd);
    });
  }

  function insertAtCaret(text) {
    const ta = taRef.current; if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const next = html.slice(0, s) + text + html.slice(e);
    if (next.length > MAX_LEN) return;
    setHtml(next);
    requestAnimationFrame(function () {
      ta.focus();
      const caretEnd = s + text.length;
      ta.setSelectionRange(caretEnd, caretEnd);
    });
  }

  function applyColor(c) { wrap('<span style="color:' + c + ';">', '</span>'); }
  function applyHL(c) { wrap('<span style="background:' + c + ';padding:1px 4px;border-radius:3px;">', '</span>'); }
  function applySize(sz) { wrap('<span style="font-size:' + sz + ';">', '</span>'); }
  function applyAlign(side) { wrap('<div style="text-align:' + side + ';">', '</div>'); }

  function insertImage() {
    const url = window.prompt("Bild-URL einfuegen (z.B. von einem Foto-Hoster):");
    if (!url) return;
    const safe = String(url).replace(/"/g, "");
    insertAtCaret('<img src="' + safe + '" style="max-width:100%;border-radius:8px;margin:6px 0;" alt="" />');
  }

  function insertVideo() {
    const url = window.prompt("YouTube-Link einfuegen (z.B. https://youtu.be/...):");
    if (!url) return;
    const id = extractYouTubeId(url);
    if (!id) { alert("Konnte keine YouTube-ID erkennen."); return; }
    insertAtCaret('<iframe width="100%" height="240" src="https://www.youtube.com/embed/' + id + '" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border-radius:8px;margin:6px 0;"></iframe>');
  }

  function insertLink() {
    const url = window.prompt("Link-URL (z.B. https://...):");
    if (!url) return;
    const safe = String(url).replace(/"/g, "");
    wrap('<a href="' + safe + '" target="_blank" style="color:#ec4899;">', "</a>");
  }

  async function save() {
    setBusy(true); setErr("");
    try {
      await api.updateMe(username, { greetingHtml: html });
      if (onSaved) onSaved();
    } catch (e) { setErr((e && e.message) || "Speichern fehlgeschlagen"); }
    finally { setBusy(false); }
  }

  const left = MAX_LEN - html.length;
  const counterColor = left < 100 ? "#ef4444" : "#6b21a8";

  return (
    <div className="vv-greet-editor">
      <div className="vv-greet-editor-toolbar">
        <button type="button" title="Fett" onClick={function () { wrap("<b>", "</b>"); }} style={{ fontWeight: 900 }}>B</button>
        <button type="button" title="Kursiv" onClick={function () { wrap("<i>", "</i>"); }} style={{ fontStyle: "italic" }}>I</button>
        <button type="button" title="Unterstrichen" onClick={function () { wrap("<u>", "</u>"); }} style={{ textDecoration: "underline" }}>U</button>
        <button type="button" title="Ueberschrift" onClick={function () { wrap('<h3 style="color:#ec4899;margin:8px 0;">', "</h3>"); }}>H</button>
        <button type="button" title="Liste" onClick={function () { wrap("<ul><li>", "</li></ul>"); }}>•</button>
        <button type="button" title="Zeilenumbruch" onClick={function () { insertAtCaret("<br />"); }}>↵</button>
        <button type="button" title="Linksbuendig" onClick={function () { applyAlign("left"); }}>⬅</button>
        <button type="button" title="Mittig" onClick={function () { applyAlign("center"); }}>≡</button>
        <button type="button" title="Rechtsbuendig" onClick={function () { applyAlign("right"); }}>➡</button>
        <button type="button" title="Link" onClick={insertLink}>🔗</button>
        <button type="button" title="Bild einfuegen" onClick={insertImage}>📷</button>
        <button type="button" title="YouTube-Video einfuegen" onClick={insertVideo}>▶</button>
        <button type="button" title="Emojis" onClick={function () { setShowEmojis(function (v) { return !v; }); }}>😀</button>
      </div>

      <textarea ref={taRef} maxLength={MAX_LEN}
        className="vv-greet-editor-textarea"
        value={html}
        onChange={function (e) { setHtml(e.target.value); }}
        placeholder="Schreib hier deinen Begruessungstext - oder klick die Buttons!"
        rows={9} />

      <div className="vv-greet-editor-counter" style={{ color: counterColor }}>
        {html.length} / {MAX_LEN} Zeichen ({left} uebrig)
      </div>

      <div className="vv-greet-editor-section-label">Schriftgroesse</div>
      <select className="vv-greet-editor-size-select" defaultValue=""
        onChange={function (e) { if (e.target.value) { applySize(e.target.value); e.target.value = ""; } }}>
        <option value="" disabled>Groesse waehlen...</option>
        {FONT_SIZES.map(function (sz) {
          return (<option key={sz[0]} value={sz[0]}>{sz[1]} pt</option>);
        })}
      </select>

      <div className="vv-greet-editor-section-label">Textfarbe</div>
      <div className="vv-greet-editor-colors">
        {TEXT_COLORS.map(function (c) {
          return (<button key={c[0]} type="button" title={c[1]}
            onClick={function () { applyColor(c[0]); }}
            className="vv-greet-editor-color"
            style={{ background: c[0], border: c[0] === "#ffffff" ? "1px solid #aaa" : "1px solid rgba(0,0,0,0.15)" }} />);
        })}
        <button type="button" className="vv-greet-editor-color vv-greet-editor-color-custom" title="Eigene Farbe"
          onClick={function () { if (customColorRef.current) customColorRef.current.click(); }}>🎨</button>
        <input ref={customColorRef} type="color" style={{ display: "none" }}
          onChange={function (e) { applyColor(e.target.value); }} />
      </div>

      <div className="vv-greet-editor-section-label">Textmarker</div>
      <div className="vv-greet-editor-colors">
        {HIGHLIGHT_COLORS.map(function (c) {
          return (<button key={c[0]} type="button" title={c[1]}
            onClick={function () { applyHL(c[0]); }}
            className="vv-greet-editor-color"
            style={{ background: c[0], border: "1px solid rgba(0,0,0,0.15)" }} />);
        })}
      </div>

      {showEmojis && (
        <>
          <div className="vv-greet-editor-section-label">Emojis</div>
          <div className="vv-greet-editor-emojis">
            {EMOJIS.map(function (emo, i) {
              return (<button key={emo + "-" + i} type="button" onClick={function () { insertAtCaret(emo); }}>{emo}</button>);
            })}
          </div>
        </>
      )}

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
