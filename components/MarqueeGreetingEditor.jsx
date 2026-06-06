"use client";

// 🎀 Eigener Lauftext + Begrüßungs-HTML-Editor (Jappy-Style).
// Lauftext: einfacher Text-Input (200 Zeichen), Plain-Text + Emoji.
// Begrüßung: Textarea mit Toolbar (B/I/U, Farbe, Bild via URL, Link).
// Live-Vorschau zeigt sanitisiertes Ergebnis.

import { useEffect, useRef, useState } from "react";
import { useMe } from "@/lib/useMe";
import { api } from "@/lib/api";

const MARQUEE_DEFAULT_HINT = "Leer lassen für den Standard-Lauftext.";
const GREETING_MAX = 5000;
const MARQUEE_MAX = 200;

const COLOR_PRESETS = [
  "#ec4899", "#be185d", "#a855f7", "#7c3aed",
  "#2d7dd2", "#1e40af", "#06b6d4", "#0e7490",
  "#22c55e", "#15803d", "#fbbf24", "#f59e0b",
  "#ef4444", "#b91c1c", "#1c1c1e", "#ffffff",
];

export default function MarqueeGreetingEditor() {
  const { me, refresh } = useMe();
  const [marquee, setMarquee] = useState("");
  const [greeting, setGreeting] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const taRef = useRef(null);

  useEffect(() => {
    if (!me) return;
    setMarquee(me.marqueeText || "");
    setGreeting(me.greetingHtml || "");
  }, [me]);

  if (!me) return null;

  function showFlash(msg, ms = 3500) {
    setFlash(msg);
    setTimeout(() => setFlash(""), ms);
  }

  // === Toolbar-Helfer: setzt einen Tag um die markierte Selektion ===
  function wrap(beforeTag, afterTag) {
    const el = taRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const v = greeting;
    const selected = v.slice(start, end) || "Text";
    const next = v.slice(0, start) + beforeTag + selected + afterTag + v.slice(end);
    setGreeting(next.slice(0, GREETING_MAX));
    setTimeout(() => {
      el.focus();
      const pos = start + beforeTag.length + selected.length + afterTag.length;
      el.setSelectionRange(pos, pos);
    }, 0);
  }

  function insertAtCursor(snippet) {
    const el = taRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const v = greeting;
    const next = (v.slice(0, start) + snippet + v.slice(start)).slice(0, GREETING_MAX);
    setGreeting(next);
    setTimeout(() => {
      el.focus();
      const pos = start + snippet.length;
      el.setSelectionRange(pos, pos);
    }, 0);
  }

  function insertImage() {
    const url = prompt("Bild-URL (https://…):", "");
    if (!url) return;
    const alt = prompt("Beschreibung (Alt-Text, optional):", "") || "";
    insertAtCursor(`<img src="${url}" alt="${alt}" style="max-width:100%;border-radius:8px" />`);
  }

  function insertLink() {
    const el = taRef.current;
    const sel = el ? greeting.slice(el.selectionStart, el.selectionEnd) : "";
    const url = prompt("Link-URL (https://…):", "https://");
    if (!url) return;
    const txt = prompt("Sichtbarer Text:", sel || "Hier klicken") || "Hier klicken";
    insertAtCursor(`<a href="${url}" target="_blank">${txt}</a>`);
  }

  function insertColor(color) {
    wrap(`<span style="color:${color}">`, `</span>`);
  }

  async function save() {
    setBusy(true);
    try {
      await api.updateMe(me.username, {
        marqueeText: marquee.slice(0, MARQUEE_MAX),
        greetingHtml: greeting.slice(0, GREETING_MAX),
      });
      await refresh();
      showFlash("✅ Gespeichert!");
    } catch (e) {
      showFlash(`⚠ ${e.message}`, 5000);
    } finally { setBusy(false); }
  }

  function clearGreeting() {
    if (!confirm("Begrüßungstext leeren?")) return;
    setGreeting("");
  }

  return (
    <>
      {/* 🎢 Lauftext */}
      <div className="vv-edit-card" data-tone="pink">
        <div className="vv-edit-card-title">🎢 EIGENER LAUFTEXT</div>
        <div className="vv-edit-card-body">
          <div className="vv-edit-hint">
            Wird oben auf deinem Profil als Marquee angezeigt. Plain-Text + Emoji, max 200 Zeichen. {MARQUEE_DEFAULT_HINT}
          </div>
          {flash && (
            <div className="vv-edit-flash" data-tone={flash.startsWith("⚠") ? "warn" : "ok"} style={{ marginBottom: 10 }}>
              {flash}
            </div>
          )}
          <input className="vv-edit-input"
            value={marquee}
            onChange={(e) => setMarquee(e.target.value.slice(0, MARQUEE_MAX))}
            placeholder="★ ✿ Willkommen auf meinem Profil! ♡ ..." />
          <div className="vv-edit-counter">{marquee.length} / {MARQUEE_MAX}</div>

          {/* Live-Vorschau */}
          {marquee.trim() && (
            <>
              <label className="vv-edit-spaced">👁 Vorschau (so läuft's auf deinem Profil)</label>
              <div className="vv-mge-marquee-preview">
                <div className="vv-mge-marquee-inner">
                  <span>{marquee}</span>
                  <span>&nbsp;&nbsp;&nbsp;★&nbsp;&nbsp;&nbsp;</span>
                  <span>{marquee}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 🌸 Begrüßungs-Editor */}
      <div className="vv-edit-card" data-tone="violet">
        <div className="vv-edit-card-title">🌸 EIGENER BEGRÜSSUNGSTEXT (HTML)</div>
        <div className="vv-edit-card-body">
          <div className="vv-edit-hint">
            Wie früher bei Jappy/MySpace: gestalte deinen Begrüßungstext frei.
            Mit B/I/U/Farbe, Bild-URLs einfügen, Links setzen. Bilder werden über
            URL eingebunden (z.B. von Imgur, Postimg, deiner Cloud).
          </div>

          {/* Toolbar */}
          <div className="vv-mge-toolbar">
            <button type="button" onClick={() => wrap("<b>", "</b>")} title="Fett" style={{ fontWeight: 900 }}>B</button>
            <button type="button" onClick={() => wrap("<i>", "</i>")} title="Kursiv" style={{ fontStyle: "italic" }}>I</button>
            <button type="button" onClick={() => wrap("<u>", "</u>")} title="Unterstrichen" style={{ textDecoration: "underline" }}>U</button>
            <button type="button" onClick={() => wrap("<s>", "</s>")} title="Durchgestrichen" style={{ textDecoration: "line-through" }}>S</button>
            <span className="vv-mge-tb-sep" />
            <button type="button" onClick={() => wrap("<h3>", "</h3>")} title="Überschrift">H</button>
            <button type="button" onClick={() => insertAtCursor("<br />")} title="Zeilenumbruch">↵</button>
            <button type="button" onClick={() => wrap("<center>", "</center>")} title="Zentriert">≡</button>
            <button type="button" onClick={() => insertAtCursor("<hr />")} title="Trennlinie">⎯</button>
            <span className="vv-mge-tb-sep" />
            <button type="button" onClick={() => wrap("<marquee>", "</marquee>")} title="Eigener Lauftext-Block">📜</button>
            <button type="button" onClick={insertImage} title="Bild per URL">🖼</button>
            <button type="button" onClick={insertLink} title="Link einfügen">🔗</button>
            <span className="vv-mge-tb-sep" />
            <details className="vv-mge-colorpicker">
              <summary title="Schriftfarbe">🎨</summary>
              <div className="vv-mge-colors">
                {COLOR_PRESETS.map((c) => (
                  <button key={c} type="button" onClick={() => insertColor(c)}
                    style={{ background: c }} title={c} />
                ))}
              </div>
            </details>
          </div>

          <textarea
            ref={taRef}
            className="vv-edit-input vv-edit-textarea vv-mge-textarea"
            value={greeting}
            onChange={(e) => setGreeting(e.target.value.slice(0, GREETING_MAX))}
            placeholder={`<center>\n  <h3>Hi! Schön dass du da bist 💖</h3>\n  <img src="https://imgur.com/dein-banner.gif" />\n  <p>Mein Lieblingssong: <a href="https://...">Tokio Hotel</a></p>\n</center>`}
            rows={10}
            spellCheck={false}
          />
          <div className="vv-edit-counter">{greeting.length} / {GREETING_MAX}</div>

          {/* Live-Vorschau */}
          <label className="vv-edit-spaced">👁 Live-Vorschau (sicher gerendert)</label>
          <div className="vv-mge-preview">
            {greeting.trim()
              ? <div dangerouslySetInnerHTML={{ __html: greeting }} />
              : <div style={{ color: "#9a9aa8", fontStyle: "italic", textAlign: "center", padding: 20 }}>Noch nichts geschrieben — leg los!</div>
            }
          </div>

          <div className="vv-edit-hint" style={{ marginTop: 10 }}>
            🛡 Sicherheits-Hinweis: Skripte, iframes & gefährliche URLs werden automatisch entfernt.
            Erlaubt: B/I/U/S, P, DIV, SPAN, H1-H6, BR, HR, IMG, A, FONT, MARQUEE, CENTER, LISTEN.
          </div>

          <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
            <button type="button" onClick={clearGreeting} className="vv-edit-savebar-cancel">
              🧹 Begrüßung leeren
            </button>
            <button type="button" onClick={save} disabled={busy} className="vv-edit-savebar-save" style={{ flex: 1 }}>
              {busy ? "Speichert…" : "💾 Lauftext & Begrüßung speichern"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
