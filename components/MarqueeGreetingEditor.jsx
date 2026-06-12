"use client";

// 🎀 Lauftext + Begruessungs-Editor — uebersichtlich, zwei Modi:
//   - "Einfach": Formular mit Titel/Text/Bild/Lieblings-Song/Zitat,
//                generiert sauberes HTML im Hintergrund.
//   - "Profi":   Textarea mit Toolbar + Templates, Inline-Modals
//                statt prompt(), Live-Vorschau side-by-side.
// Speichert beides als HTML in greetingHtml — am Profil identisch
// gerendert wie bisher.

import { useEffect, useMemo, useRef, useState } from "react";
import { useMe } from "@/lib/useMe";
import { api } from "@/lib/api";

const MARQUEE_MAX = 200;
const GREETING_MAX = 5000;

const COLOR_PRESETS = [
  "#ec4899", "#be185d", "#a855f7", "#7c3aed",
  "#2d7dd2", "#1e40af", "#06b6d4", "#0e7490",
  "#22c55e", "#15803d", "#fbbf24", "#f59e0b",
  "#ef4444", "#b91c1c", "#1c1c1e", "#ffffff",
];

const TEMPLATES = [
  {
    id: "klassik",
    label: "Klassiker",
    emoji: "💖",
    html: `<center>
  <h3>★ Welcome to my page ★</h3>
  <p>Schön dass du <b>vorbeischaust</b>! 💖<br/>
  Lass mir gerne was an der Pinnwand da ✿</p>
</center>`,
  },
  {
    id: "glitter",
    label: "Y2K-Glitter",
    emoji: "✨",
    html: `<center>
  <h2><span style="color:#ec4899">✿</span> <span style="color:#a855f7">x</span><span style="color:#ec4899">X</span><span style="color:#a855f7">o</span><span style="color:#ec4899">X</span> <span style="color:#a855f7">✿</span></h2>
  <p style="font-family:'Comic Sans MS',cursive"><b>Hii sweetie 🌸</b></p>
  <hr/>
  <p>Wenn du das hier liest bist du <u>krass cool</u>.<br/>
  Schreib mir gerne eine Nachricht 💌</p>
</center>`,
  },
  {
    id: "minimal",
    label: "Minimal",
    emoji: "🤍",
    html: `<p style="text-align:center;font-size:15px;line-height:1.6">
  <b>Hi.</b><br/>
  Schön dass du da bist. ✿<br/>
  <i>— Schreib gern was an die Pinnwand.</i>
</p>`,
  },
  {
    id: "bling",
    label: "Bling-Bling",
    emoji: "💎",
    html: `<center>
  <marquee scrollamount="4"><b>★ ✿ ♡ HERZLICH WILLKOMMEN ♡ ✿ ★</b></marquee>
  <h3 style="color:#a855f7">Schön dass du auf meinem Profil bist 🌸</h3>
  <p>Ich freu mich riesig über jede Pinnwand-Nachricht 💕<br/>
  <b>Hinterlasse mir was Süßes ✿</b></p>
  <hr/>
</center>`,
  },
];

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildSimpleHtml({ title, body, imageUrl, quote, songLabel, songUrl, signature }) {
  const parts = [];
  parts.push("<center>");
  if (title.trim()) parts.push(`  <h3>${escapeHtml(title.trim())}</h3>`);
  if (imageUrl.trim()) {
    parts.push(`  <img src="${escapeHtml(imageUrl.trim())}" alt="" style="max-width:100%;border-radius:10px" />`);
  }
  if (body.trim()) {
    const lines = body.trim().split(/\n+/).map((l) => escapeHtml(l)).join("<br/>");
    parts.push(`  <p>${lines}</p>`);
  }
  if (quote.trim()) {
    parts.push(`  <blockquote><em>„${escapeHtml(quote.trim())}"</em></blockquote>`);
  }
  if (songUrl.trim()) {
    const lbl = songLabel.trim() || songUrl.trim();
    parts.push(`  <p>🎵 <a href="${escapeHtml(songUrl.trim())}" target="_blank">${escapeHtml(lbl)}</a></p>`);
  }
  if (signature.trim()) {
    parts.push(`  <hr/>`);
    parts.push(`  <p><b>${escapeHtml(signature.trim())}</b></p>`);
  }
  parts.push("</center>");
  return parts.join("\n");
}

export default function MarqueeGreetingEditor() {
  const { me, refresh } = useMe();
  const [mode, setMode] = useState("simple"); // simple | pro
  const [marquee, setMarquee] = useState("");
  const [greeting, setGreeting] = useState("");

  // Simple-Mode Felder
  const [s_title, setSTitle] = useState("");
  const [s_body, setSBody] = useState("");
  const [s_image, setSImage] = useState("");
  const [s_quote, setSQuote] = useState("");
  const [s_songLabel, setSSongLabel] = useState("");
  const [s_songUrl, setSSongUrl] = useState("");
  const [s_signature, setSSignature] = useState("");

  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const [linkModal, setLinkModal] = useState(null); // { text, url } | null
  const [imageModal, setImageModal] = useState(null); // { url, alt } | null
  const taRef = useRef(null);

  useEffect(() => {
    if (!me) return;
    setMarquee(me.marqueeText || "");
    setGreeting(me.greetingHtml || "");
    // Initial Simple-Mode wenn noch kein HTML vorhanden, sonst Profi
    if ((me.greetingHtml || "").trim().length > 0) setMode("pro");
  }, [me]);

  // Simple → HTML live aktualisieren
  const simpleHtml = useMemo(() => buildSimpleHtml({
    title: s_title, body: s_body, imageUrl: s_image, quote: s_quote,
    songLabel: s_songLabel, songUrl: s_songUrl, signature: s_signature,
  }), [s_title, s_body, s_image, s_quote, s_songLabel, s_songUrl, s_signature]);

  if (!me) return null;

  function showFlash(msg, ms = 3500) {
    setFlash(msg);
    setTimeout(() => setFlash(""), ms);
  }

  function wrap(beforeTag, afterTag) {
    const el = taRef.current;
    if (!el) return;
    const start = el.selectionStart, end = el.selectionEnd;
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
  function insertColor(color) {
    wrap(`<span style="color:${color}">`, `</span>`);
  }
  function applyTemplate(tpl) {
    if (greeting.trim() && !confirm("Aktuellen Begrüßungstext durch Vorlage ersetzen?")) return;
    setGreeting(tpl.html);
  }

  async function save() {
    setBusy(true);
    try {
      const html = mode === "simple" ? simpleHtml : greeting;
      await api.updateMe(me.username, {
        marqueeText: marquee.slice(0, MARQUEE_MAX),
        greetingHtml: html.slice(0, GREETING_MAX),
      });
      // Simple-Mode auch in greeting reinspiegeln, damit Wechsel zu Profi-Mode den Code zeigt
      if (mode === "simple") setGreeting(html);
      await refresh();
      showFlash("✅ Gespeichert!");
    } catch (e) {
      showFlash(`⚠ ${e.message}`, 5000);
    } finally { setBusy(false); }
  }

  function clearAll() {
    if (!confirm("Begrüßung wirklich leeren?")) return;
    setGreeting("");
    setSTitle(""); setSBody(""); setSImage(""); setSQuote("");
    setSSongLabel(""); setSSongUrl(""); setSSignature("");
  }

  return (
    <>
      {/* Lauftext */}
      <div className="vv-edit-card" data-tone="pink">
        <div className="vv-edit-card-title">🎢 LAUFTEXT</div>
        <div className="vv-edit-card-body">
          <div className="vv-edit-hint">
            Erscheint oben auf deinem Profil als Marquee. Plain-Text + Emoji, max {MARQUEE_MAX} Zeichen. Leer lassen = Standard-Lauftext.
          </div>
          <input
            className="vv-edit-input"
            value={marquee}
            onChange={(e) => setMarquee(e.target.value.slice(0, MARQUEE_MAX))}
            placeholder="★ ✿ Willkommen auf meinem Profil ♡ ..."
          />
          <div className="vv-edit-counter">{marquee.length} / {MARQUEE_MAX}</div>
          {marquee.trim() && (
            <div className="vv-mge-marquee-preview" style={{ marginTop: 8 }}>
              <div className="vv-mge-marquee-inner">
                <span>{marquee}</span>
                <span>&nbsp;&nbsp;&nbsp;★&nbsp;&nbsp;&nbsp;</span>
                <span>{marquee}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Begruessung */}
      <div className="vv-edit-card vv-mge2-card" data-tone="violet">
        <div className="vv-edit-card-title">🌸 BEGRÜSSUNGSTEXT</div>

        {/* Modus-Switch */}
        <div className="vv-mge2-modeswitch">
          <button
            type="button"
            className={`vv-mge2-mode${mode === "simple" ? " active" : ""}`}
            onClick={() => setMode("simple")}
          >📝 Einfach</button>
          <button
            type="button"
            className={`vv-mge2-mode${mode === "pro" ? " active" : ""}`}
            onClick={() => setMode("pro")}
          >🛠 Profi-Modus (HTML)</button>
        </div>

        {flash && (
          <div className="vv-edit-flash" data-tone={flash.startsWith("⚠") ? "warn" : "ok"} style={{ margin: "8px 14px 0" }}>
            {flash}
          </div>
        )}

        <div className="vv-edit-card-body">
          {/* SIMPLE-MODUS */}
          {mode === "simple" && (
            <div className="vv-mge2-split">
              <div className="vv-mge2-form">
                <div className="vv-edit-hint">
                  Fülle nur aus, was du brauchst. Leere Felder werden weggelassen.
                </div>

                <label className="vv-mge2-label">📌 Überschrift</label>
                <input className="vv-edit-input"
                  value={s_title} maxLength={80}
                  onChange={(e) => setSTitle(e.target.value)}
                  placeholder="z.B. ★ Welcome to my page ★" />

                <label className="vv-mge2-label">💬 Begrüßungstext (mehrzeilig)</label>
                <textarea className="vv-edit-input vv-edit-textarea"
                  rows={4} maxLength={800}
                  value={s_body}
                  onChange={(e) => setSBody(e.target.value)}
                  placeholder="z.B. Schön dass du vorbeischaust 💖
Lass mir gerne was an der Pinnwand da ✿" />

                <label className="vv-mge2-label">🖼 Banner-Bild (optional)</label>
                <input className="vv-edit-input"
                  value={s_image} type="url"
                  onChange={(e) => setSImage(e.target.value)}
                  placeholder="https://imgur.com/dein-banner.gif" />
                <div className="vv-mge2-hint">Lade dein Bild bei imgur.com / postimages.org hoch und kopier die URL hier rein.</div>

                <label className="vv-mge2-label">💭 Lieblingszitat (optional)</label>
                <input className="vv-edit-input"
                  value={s_quote} maxLength={200}
                  onChange={(e) => setSQuote(e.target.value)}
                  placeholder="z.B. Live as if you'd die tomorrow." />

                <label className="vv-mge2-label">🎵 Lieblingssong (optional)</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input className="vv-edit-input" style={{ flex: 1 }}
                    value={s_songLabel} maxLength={80}
                    onChange={(e) => setSSongLabel(e.target.value)}
                    placeholder="Tokio Hotel – Durch den Monsun" />
                  <input className="vv-edit-input" style={{ flex: 1 }}
                    value={s_songUrl} type="url"
                    onChange={(e) => setSSongUrl(e.target.value)}
                    placeholder="https://youtu.be/..." />
                </div>

                <label className="vv-mge2-label">✍ Signatur (optional)</label>
                <input className="vv-edit-input"
                  value={s_signature} maxLength={60}
                  onChange={(e) => setSSignature(e.target.value)}
                  placeholder="— dein Name" />
              </div>

              <div className="vv-mge2-preview-col">
                <div className="vv-mge2-preview-label">👁 Live-Vorschau</div>
                <div className="vv-mge-preview">
                  {simpleHtml.replace(/<center>|<\/center>|\s/g, "").length > 16
                    ? <div dangerouslySetInnerHTML={{ __html: simpleHtml }} />
                    : <div className="vv-mge2-empty">Fülle links Felder aus, hier siehst du wie's auf deinem Profil aussieht.</div>}
                </div>
              </div>
            </div>
          )}

          {/* PROFI-MODUS */}
          {mode === "pro" && (
            <div className="vv-mge2-split">
              <div>
                <div className="vv-edit-hint">
                  Direkter HTML-Editor (Jappy-/MySpace-Style). Skripte/iframes werden serverseitig entfernt.
                </div>

                {/* Templates */}
                <label className="vv-mge2-label">🎨 Schnellstart-Vorlagen</label>
                <div className="vv-mge2-tpls">
                  {TEMPLATES.map((t) => (
                    <button key={t.id} type="button" onClick={() => applyTemplate(t)} className="vv-mge2-tpl">
                      <span style={{ fontSize: 18 }}>{t.emoji}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>

                {/* Toolbar */}
                <div className="vv-mge-toolbar vv-mge2-toolbar">
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
                  <button type="button" onClick={() => wrap("<marquee>", "</marquee>")} title="Lauftext-Block">📜</button>
                  <button type="button" onClick={() => setImageModal({ url: "", alt: "" })} title="Bild einfügen">🖼</button>
                  <button type="button" onClick={() => setLinkModal({ text: "", url: "https://" })} title="Link einfügen">🔗</button>
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
                  placeholder="<center>&#10;  <h3>Hi!</h3>&#10;  <p>Schön dass du da bist 💖</p>&#10;</center>"
                  rows={12}
                  spellCheck={false}
                />
                <div className="vv-edit-counter">{greeting.length} / {GREETING_MAX}</div>
              </div>

              <div className="vv-mge2-preview-col">
                <div className="vv-mge2-preview-label">👁 Live-Vorschau</div>
                <div className="vv-mge-preview">
                  {greeting.trim()
                    ? <div dangerouslySetInnerHTML={{ __html: greeting }} />
                    : <div className="vv-mge2-empty">Schreib oder wähle eine Vorlage — hier siehst du das Ergebnis.</div>}
                </div>
              </div>
            </div>
          )}

          {/* Aktionen */}
          <div className="vv-mge2-actions">
            <button type="button" onClick={clearAll} className="vv-edit-savebar-cancel">
              🧹 Leeren
            </button>
            <button type="button" onClick={save} disabled={busy} className="vv-edit-savebar-save" style={{ flex: 1 }}>
              {busy ? "Speichert…" : "💾 Lauftext & Begrüßung speichern"}
            </button>
          </div>

          <div className="vv-edit-hint" style={{ marginTop: 10 }}>
            🛡 Skripte, iframes & gefährliche URLs werden automatisch entfernt.
          </div>
        </div>
      </div>

      {/* Link-Modal */}
      {linkModal && (
        <div className="vv-mge2-modal-overlay" onClick={() => setLinkModal(null)}>
          <div className="vv-mge2-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vv-mge2-modal-title">🔗 Link einfügen</div>
            <label className="vv-mge2-label">Sichtbarer Text</label>
            <input className="vv-edit-input" value={linkModal.text}
              onChange={(e) => setLinkModal({ ...linkModal, text: e.target.value })}
              placeholder="z.B. Mein Lieblingssong" autoFocus />
            <label className="vv-mge2-label">URL</label>
            <input className="vv-edit-input" type="url" value={linkModal.url}
              onChange={(e) => setLinkModal({ ...linkModal, url: e.target.value })}
              placeholder="https://..." />
            <div className="vv-mge2-actions">
              <button type="button" onClick={() => setLinkModal(null)} className="vv-edit-savebar-cancel">Abbrechen</button>
              <button type="button" className="vv-edit-savebar-save" style={{ flex: 1 }}
                disabled={!linkModal.url.trim()}
                onClick={() => {
                  const t = linkModal.text.trim() || linkModal.url.trim();
                  const u = linkModal.url.trim();
                  insertAtCursor(`<a href="${escapeHtml(u)}" target="_blank">${escapeHtml(t)}</a>`);
                  setLinkModal(null);
                }}>Einfügen</button>
            </div>
          </div>
        </div>
      )}

      {/* Bild-Modal */}
      {imageModal && (
        <div className="vv-mge2-modal-overlay" onClick={() => setImageModal(null)}>
          <div className="vv-mge2-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vv-mge2-modal-title">🖼 Bild einfügen</div>
            <label className="vv-mge2-label">Bild-URL</label>
            <input className="vv-edit-input" type="url" value={imageModal.url}
              onChange={(e) => setImageModal({ ...imageModal, url: e.target.value })}
              placeholder="https://imgur.com/dein-bild.gif" autoFocus />
            <label className="vv-mge2-label">Beschreibung (Alt-Text, optional)</label>
            <input className="vv-edit-input" value={imageModal.alt}
              onChange={(e) => setImageModal({ ...imageModal, alt: e.target.value })}
              placeholder="z.B. Mein Bandlogo" />
            {imageModal.url.trim() && (
              <div className="vv-mge2-img-preview">
                <img src={imageModal.url} alt="" />
              </div>
            )}
            <div className="vv-mge2-actions">
              <button type="button" onClick={() => setImageModal(null)} className="vv-edit-savebar-cancel">Abbrechen</button>
              <button type="button" className="vv-edit-savebar-save" style={{ flex: 1 }}
                disabled={!imageModal.url.trim()}
                onClick={() => {
                  const u = imageModal.url.trim();
                  const a = imageModal.alt.trim();
                  insertAtCursor(`<img src="${escapeHtml(u)}" alt="${escapeHtml(a)}" style="max-width:100%;border-radius:10px" />`);
                  setImageModal(null);
                }}>Einfügen</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
