"use client";

// Broadcast-Tab im Admin-Panel: schickt eine Nachricht von "system" (anonym/offiziell)
// per DM an alle aktiven User. Push wird vom Server parallel ausgelöst.

import { useState } from "react";
import { api } from "@/lib/api";

const PRESETS = [
  "🚀 GROSSES UPDATE! Frauen-Schutz mit Stimm-Verifikation, KI-moderierte Sprachnachrichten überall, 8 neue Com-Funktionen (Live-Polls, Quiz, Throwback, Geburtstage, Meetups uvm.). Details unter /neu — viel Spaß beim Stöbern! ✨",
  "🛡 Neu: Stimm-Verifikation! Mit einer kurzen Sprachprobe holst du dir das ✓-Verifiziert-Badge. Frauen können „nur verifizierte schreiben mir" aktivieren. Mehr in den Privatsphäre-Einstellungen.",
  "🎤 Sprachnachrichten überall — und Fidolin hört zu! Beleidigung in Voice-Comments? Wird automatisch geblockt. Danke an alle die uns ein freundlicheres VibeVibo gewünscht haben.",
  "🔓 Coms-Tipp: Im 🔓-Tab kannst du als Owner jetzt 8 Funktionen freischalten — von Schnee-Theme über Quiz-Night bis Meetup-Planer. Mit Vibes aus eurer Com-Kasse.",
  "🎉 Neues Feature live! Schaut mal rein — wir haben gerade etwas eingebaut.",
  "🔧 Kurze Wartung steht an. Alles bleibt erhalten, manchmal ist die Seite ein paar Minuten weg.",
  "📜 Erinnerung: Bitte respektiert die Chatiquette. Wer pöbelt, fliegt — wer nett ist, hat mehr Spaß.",
  "💡 Wusstest du? Mit Vibes kannst du im Shop Account-Features freischalten (Badges, Custom-Status, +Pic-Slots).",
];

export default function AdminBroadcast({ pw }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function submit(e) {
    e?.preventDefault?.();
    const t = text.trim();
    if (!t) { setError("Text fehlt."); return; }
    if (t.length > 1000) { setError("Max. 1000 Zeichen."); return; }
    if (!confirm(`Wirklich an ALLE aktiven User schicken?\n\n„${t.slice(0, 200)}${t.length > 200 ? "…" : ""}"`)) return;
    setError(""); setBusy(true);
    try {
      const r = await api.adminBroadcast(pw, t);
      setResult({ at: Date.now(), recipients: r.recipients, text: t });
      setText("");
    } catch (err) {
      setError(err.message || "Fehler");
    } finally { setBusy(false); }
  }

  return (
    <>
      <div className="vv-card">
        <h3>📢 System-Broadcast verschicken</h3>
        <p className="vv-muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
          Der Text geht als anonyme <b>DM von „VibeVibo" (system)</b> an
          jeden aktiven User. Push-Benachrichtigungen werden parallel
          rausgeschickt (sofern abonniert). Empfänger sehen den Chat im
          Messenger neben den anderen — sie können dir nicht antworten
          (system ist kein echter Account).
        </p>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Was sollen alle User wissen?"
            maxLength={1000}
            rows={5}
            className="vv-input"
            style={{ width: "100%", resize: "vertical", fontFamily: "inherit", fontSize: 14, lineHeight: 1.4 }}
            required
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "#666" }}>
            <span>{text.length}/1000 Zeichen</span>
            {error && <span style={{ color: "#c2185b", fontWeight: 700 }}>⚠ {error}</span>}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="submit" disabled={busy || !text.trim()} className="vv-btn vv-btn-pink">
              {busy ? "Wird versandt…" : "🚀 An alle senden"}
            </button>
            <button type="button" onClick={() => setText("")} className="vv-btn" disabled={busy || !text}>
              ✕ Leeren
            </button>
          </div>
        </form>

        {result && (
          <div className="vv-mt-12" style={{
            background: "#e8fff0", border: "1px solid #86efac",
            borderRadius: 8, padding: 10, fontSize: 13,
          }}>
            ✅ Versandt an <b>{result.recipients}</b> Empfänger
            <div style={{ fontSize: 11, color: "#0d8a3f", marginTop: 4, fontStyle: "italic" }}>
              „{result.text.slice(0, 200)}{result.text.length > 200 ? "…" : ""}"
            </div>
          </div>
        )}
      </div>

      <div className="vv-card">
        <h3>💡 Vorlagen (zum Übernehmen klicken)</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {PRESETS.map((p) => (
            <button key={p} type="button"
              onClick={() => setText(p)}
              style={{
                textAlign: "left", padding: "9px 12px", border: "1px solid #d8def0",
                borderRadius: 8, background: "#fafafd", cursor: "pointer",
                fontSize: 13, lineHeight: 1.4, fontFamily: "inherit",
              }}>
              {p}
            </button>
          ))}
        </div>
        <div className="vv-muted" style={{ fontSize: 11, marginTop: 8, fontStyle: "italic" }}>
          ⚠ Bitte sparsam einsetzen — jeder Broadcast erzeugt Push-Notifications.
          Spam frustriert die User und führt zu Push-Opt-Outs.
        </div>
      </div>
    </>
  );
}
