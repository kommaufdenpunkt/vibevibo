"use client";

// ✿ ComWelcomePost — gepinnter Begrüßungs-Text vom Owner.
// Owner kann inline editieren mit Markdown-Toolbar (B/I/Strike/Link/Bild).

import { useEffect, useState } from "react";
import RichTextEditor from "@/components/RichTextEditor";
import RichTextDisplay from "@/components/RichTextDisplay";

export default function ComWelcomePost({ slug, isOwner, initialText, themeColor = "#ec4899" }) {
  const [text, setText] = useState(initialText || "");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { setText(initialText || ""); }, [initialText]);

  async function save() {
    setBusy(true);
    try {
      const r = await fetch(`/api/groups/${slug}/welcome`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: draft }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Fehler");
      setText(draft);
      setEditing(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!text && !isOwner) return null;

  if (editing) {
    return (
      <div style={{
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(12px)",
        borderRadius: 14, padding: 14, marginBottom: 12,
        border: `2px solid ${themeColor}`,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 800, color: themeColor,
          letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6,
        }}>✿ Willkommens-Post bearbeiten</div>
        <RichTextEditor
          value={draft}
          onChange={setDraft}
          placeholder="Schreib was Neuen zur Begrüßung — was ist diese Com, was machen wir hier, Regeln in kurz…"
          maxLength={4000}
          minHeight={140}
          themeColor={themeColor}
        />
        <div style={{ display: "flex", alignItems: "center", marginTop: 8, gap: 8 }}>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>{draft.length}/4000</div>
          <div style={{ flex: 1 }} />
          <button onClick={() => setEditing(false)} disabled={busy} style={{
            background: "#f1f5f9", color: "#475569", border: "none",
            padding: "7px 14px", borderRadius: 999,
            fontWeight: 700, fontSize: 12, cursor: "pointer",
          }}>Abbrechen</button>
          <button onClick={save} disabled={busy} style={{
            background: `linear-gradient(135deg, ${themeColor}, ${shade(themeColor, -20)})`,
            color: "#fff", border: "none",
            padding: "7px 16px", borderRadius: 999,
            fontWeight: 800, fontSize: 12,
            cursor: busy ? "wait" : "pointer",
            boxShadow: `0 2px 8px ${themeColor}66`,
            opacity: busy ? 0.6 : 1,
          }}>{busy ? "Speichern…" : "✓ Speichern"}</button>
        </div>
      </div>
    );
  }

  if (!text) {
    return (
      <div style={{
        background: "rgba(255,255,255,0.55)",
        backdropFilter: "blur(10px)",
        borderRadius: 14, padding: 14, marginBottom: 12,
        border: `2px dashed ${themeColor}66`,
        textAlign: "center",
      }}>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>
          ✿ Noch kein Willkommens-Post. Begrüße neue Mitglieder mit ein paar Worten!
        </div>
        <button onClick={() => { setDraft(""); setEditing(true); }} style={{
          background: `linear-gradient(135deg, ${themeColor}, ${shade(themeColor, -20)})`,
          color: "#fff", border: "none",
          padding: "7px 16px", borderRadius: 999,
          fontWeight: 800, fontSize: 12, cursor: "pointer",
          boxShadow: `0 2px 8px ${themeColor}66`,
        }}>+ Willkommens-Post anlegen</button>
      </div>
    );
  }

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85))",
      backdropFilter: "blur(12px)",
      borderRadius: 14, padding: 14, marginBottom: 12,
      border: `2px solid ${themeColor}66`,
      boxShadow: `0 4px 12px ${themeColor}25`,
      position: "relative",
    }}>
      <div style={{
        display: "flex", alignItems: "center", marginBottom: 6, gap: 8,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 800, color: themeColor,
          letterSpacing: 0.8, textTransform: "uppercase",
        }}>✿ Willkommen</span>
        {isOwner && (
          <>
            <div style={{ flex: 1 }} />
            <button onClick={() => { setDraft(text); setEditing(true); }} style={{
              background: "transparent", color: themeColor,
              border: `1px solid ${themeColor}`,
              padding: "3px 10px", borderRadius: 999,
              fontWeight: 700, fontSize: 10.5, cursor: "pointer",
            }}>✎ Bearbeiten</button>
          </>
        )}
      </div>
      <RichTextDisplay text={text} />
    </div>
  );
}

function shade(hex, percent) {
  const f = parseInt(hex.slice(1), 16);
  const t = percent < 0 ? 0 : 255;
  const p = Math.abs(percent) / 100;
  const R = f >> 16, G = (f >> 8) & 0xff, B = f & 0xff;
  return "#" + (
    0x1000000 +
    (Math.round((t - R) * p) + R) * 0x10000 +
    (Math.round((t - G) * p) + G) * 0x100 +
    (Math.round((t - B) * p) + B)
  ).toString(16).slice(1);
}
