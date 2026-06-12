"use client";

// 🌸 Inline-Editor fuer den Begruessungstext direkt im Profil.
// Klick auf "✎ Bearbeiten" → kleine Toolbar + Textarea inline,
// Live-Vorschau darunter, Speichern ohne Seitenwechsel.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMe } from "@/lib/useMe";
import { api } from "@/lib/api";

const GREETING_MAX = 5000;

const COLOR_PRESETS = [
  "#ec4899", "#a855f7", "#06b6d4", "#22c55e",
  "#fbbf24", "#ef4444", "#1c1c1e", "#ffffff",
];

const QUICK_SNIPPETS = [
  { label: "💖 Klassiker", html: `<center><h3>★ Welcome to my page ★</h3><p>Schön dass du <b>vorbeischaust</b>! 💖<br/>Lass mir gerne was an der Pinnwand da ✿</p></center>` },
  { label: "✨ Glitter", html: `<center><h2><span style="color:#ec4899">✿</span> <span style="color:#a855f7">xOx</span> <span style="color:#ec4899">✿</span></h2><p><b>Hii sweetie 🌸</b><br/>Schreib mir was Süßes 💌</p></center>` },
  { label: "🤍 Minimal", html: `<p style="text-align:center"><b>Hi.</b><br/>Schön dass du da bist. ✿</p>` },
];

export default function InlineGreetingEditor({ initialHtml = "" }) {
  const { refresh, me } = useMe();
  const [editing, setEditing] = useState(false);
  const [html, setHtml] = useState(initialHtml);
  const [draft, setDraft] = useState(initialHtml);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const taRef = useRef(null);

  useEffect(() => {
    setHtml(initialHtml);
    setDraft(initialHtml);
  }, [initialHtml]);

  function flashMsg(msg, ms = 2500) {
    setFlash(msg);
    setTimeout(() => setFlash(""), ms);
  }

  function wrap(b, a) {
    const el = taRef.current;
    if (!el) return;
    const s = el.selectionStart, e = el.selectionEnd;
    const sel = draft.slice(s, e) || "Text";
    const next = (draft.slice(0, s) + b + sel + a + draft.slice(e)).slice(0, GREETING_MAX);
    setDraft(next);
    setTimeout(() => {
      el.focus();
      const pos = s + b.length + sel.length + a.length;
      el.setSelectionRange(pos, pos);
    }, 0);
  }
  function insertAt(snippet) {
    const el = taRef.current;
    if (!el) return;
    const s = el.selectionStart;
    const next = (draft.slice(0, s) + snippet + draft.slice(s)).slice(0, GREETING_MAX);
    setDraft(next);
    setTimeout(() => {
      el.focus();
      const pos = s + snippet.length;
      el.setSelectionRange(pos, pos);
    }, 0);
  }

  async function save() {
    if (!me) return;
    setBusy(true);
    try {
      await api.updateMe(me.username, { greetingHtml: draft.slice(0, GREETING_MAX) });
      await refresh();
      setHtml(draft);
      setEditing(false);
      flashMsg("✅ Gespeichert!");
    } catch (e) {
      flashMsg(`⚠ ${e.message}`, 4000);
    } finally { setBusy(false); }
  }

  function cancel() {
    if (draft !== html && !confirm("Änderungen verwerfen?")) return;
    setDraft(html);
    setEditing(false);
  }

  // ============ EDIT-MODUS ============
  if (editing) {
    return (
      <div className="vv-inline-greet-edit">
        {/* Toolbar */}
        <div className="vv-inline-greet-toolbar">
          <button type="button" onClick={() => wrap("<b>", "</b>")} title="Fett" style={{ fontWeight: 900 }}>B</button>
          <button type="button" onClick={() => wrap("<i>", "</i>")} title="Kursiv" style={{ fontStyle: "italic" }}>I</button>
          <button type="button" onClick={() => wrap("<u>", "</u>")} title="Unterstrichen" style={{ textDecoration: "underline" }}>U</button>
          <span className="vv-mge-tb-sep" />
          <button type="button" onClick={() => wrap("<h3>", "</h3>")} title="Überschrift">H</button>
          <button type="button" onClick={() => wrap("<center>", "</center>")} title="Zentriert">≡</button>
          <button type="button" onClick={() => insertAt("<br/>")} title="Zeilenumbruch">↵</button>
          <button type="button" onClick={() => insertAt("<hr/>")} title="Trennlinie">⎯</button>
          <span className="vv-mge-tb-sep" />
          <details className="vv-mge-colorpicker">
            <summary title="Farbe">🎨</summary>
            <div className="vv-mge-colors">
              {COLOR_PRESETS.map((c) => (
                <button key={c} type="button" onClick={() => wrap(`<span style="color:${c}">`, "</span>")}
                  style={{ background: c }} title={c} />
              ))}
            </div>
          </details>
        </div>

        {/* Quick-Snippets */}
        <div className="vv-inline-greet-snips">
          <span style={{ fontSize: 11, color: "#6b21a8", fontWeight: 700, marginRight: 4 }}>📋 Vorlage:</span>
          {QUICK_SNIPPETS.map((s) => (
            <button key={s.label} type="button" onClick={() => {
              if (draft.trim() && !confirm("Aktuellen Text ersetzen?")) return;
              setDraft(s.html);
            }} className="vv-inline-greet-snip">{s.label}</button>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          ref={taRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, GREETING_MAX))}
          placeholder="<center><h3>Hi!</h3><p>Schön dass du da bist 💖</p></center>"
          rows={6}
          spellCheck={false}
          className="vv-inline-greet-ta"
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#6b21a8", marginTop: 2 }}>
          <span>{draft.length} / {GREETING_MAX}</span>
          <Link href="/profile/edit#begruessung" style={{ color: "#7e22ce", textDecoration: "underline" }}>
            🛠 Voll-Editor öffnen
          </Link>
        </div>

        {/* Vorschau */}
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#7e22ce", marginBottom: 4 }}>👁 VORSCHAU</div>
          <div className="vv-inline-greet-preview">
            {draft.trim()
              ? <div dangerouslySetInnerHTML={{ __html: draft }} />
              : <div style={{ color: "#9a9aa8", fontStyle: "italic", textAlign: "center", padding: 12 }}>Hier siehst du sofort wie's aussieht.</div>}
          </div>
        </div>

        {/* Aktionen */}
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          <button type="button" onClick={cancel} className="vv-inline-greet-cancel">
            ✖ Abbrechen
          </button>
          <button type="button" onClick={save} disabled={busy} className="vv-inline-greet-save">
            {busy ? "Speichert…" : "💾 Speichern"}
          </button>
        </div>

        {flash && (
          <div className="vv-inline-greet-flash" data-tone={flash.startsWith("⚠") ? "warn" : "ok"}>
            {flash}
          </div>
        )}
      </div>
    );
  }

  // ============ VIEW-MODUS ============
  return (
    <div className="vv-inline-greet-view">
      <button type="button" onClick={() => { setDraft(html); setEditing(true); }}
        className="vv-inline-greet-edit-btn" title="Direkt hier bearbeiten">
        ✎ Bearbeiten
      </button>
      {html && html.trim() ? (
        <div className="vv-nost-greeting" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <div className="vv-jappy-greet-empty">
          <div style={{ fontSize: 38, marginBottom: 6 }}>💌</div>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6, color: "#7e22ce" }}>
            Noch kein Begrüßungstext!
          </div>
          <div style={{ fontSize: 13, color: "#6b21a8", marginBottom: 12, lineHeight: 1.5 }}>
            Schreib deinen Besuchern was Schönes — wie früher bei Jappy.
          </div>
          <button type="button" onClick={() => setEditing(true)} className="vv-jappy-greet-cta">
            ✎ Jetzt Begrüßungstext schreiben
          </button>
        </div>
      )}
    </div>
  );
}
