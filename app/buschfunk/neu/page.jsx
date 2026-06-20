"use client";

// 📌 Buschfunk-Compose mit Typ-Picker — 7 Post-Typen.
//
// Jeder Typ hat: Icon, Label, Beispiel-Placeholder, optional Prefix-Template.
// User wählt Typ → Text eingeben → Post.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMe } from "@/lib/useMe";

const POST_TYPES = [
  {
    id: "free",
    label: "💬 Frei",
    description: "Einfacher Statuspost — was läuft?",
    placeholder: "Was läuft gerade so?",
    color: "#6366f1",
  },
  {
    id: "quote",
    label: "🌹 Zitat",
    description: "Lieblings-Spruch, Filmzitat, Songzeile",
    placeholder: "„Das Leben ist wie Schokolade …\" — Forrest Gump",
    color: "#ec4899",
  },
  {
    id: "feeling",
    label: "💭 Gefühl",
    description: "Wie geht's dir gerade?",
    placeholder: "Fühl mich heute mega motiviert 💪",
    color: "#a855f7",
  },
  {
    id: "mention",
    label: "👯 Mit @",
    description: "Markiere Freunde — wer war dabei?",
    placeholder: "War mit @sarah_92 + @kevin_lol auf dem Sommerfest 🌞",
    color: "#06b6d4",
  },
  {
    id: "memory",
    label: "📅 Erinnerung",
    description: "Tag-Erinnerung an früher",
    placeholder: "Vor 2 Jahren: ICQ-Sound im Ohr, Sommer 2003 🍦",
    color: "#f97316",
  },
  {
    id: "now_playing",
    label: "🎵 Now-Playing",
    description: "Was hörst du gerade?",
    placeholder: "🎵 Hört gerade „Mr. Brightside\" von The Killers",
    color: "#10b981",
  },
  {
    id: "never_forget",
    label: "💔 Nie vergessen",
    description: "Ein Tag, den du nie vergisst",
    placeholder: "Der Tag als … — ich saß in Mathe, als der Lehrer reinkam …",
    color: "#475569",
  },
];

const MAX_LEN = 280;

export default function BuschfunkComposePage() {
  const { me } = useMe();
  const router = useRouter();
  const [selected, setSelected] = useState(POST_TYPES[0]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (!me) {
    return (
      <div style={{ padding: 24, maxWidth: 480, margin: "40px auto 0", textAlign: "center" }}>
        <div style={{ fontSize: 50 }}>📌</div>
        <h1>Neuer Buschfunk-Post</h1>
        <p>Bitte einloggen.</p>
        <Link href="/login?next=/buschfunk/neu" className="vv-btn">🔑 Einloggen</Link>
      </div>
    );
  }

  async function submit() {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/buschfunk/post", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postType: selected.id, text }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Fehler");
      router.push("/buschfunk");
    } catch (e) {
      setErr(e.message);
    } finally { setBusy(false); }
  }

  const remaining = MAX_LEN - text.length;
  const canSubmit = text.trim().length >= 2 && remaining >= 0 && !busy;

  return (
    <div style={{ maxWidth: 600, margin: "20px auto", padding: 12 }}>
      <div style={{
        background: "linear-gradient(135deg, rgba(236,72,153,0.15), rgba(168,85,247,0.12))",
        border: "1px solid rgba(236,72,153,0.3)",
        borderRadius: 16, padding: 16, marginBottom: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 28 }}>📌</span>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>Neuer Buschfunk-Post</h1>
        </div>
        <p style={{ fontSize: 13, color: "#475569", margin: 0, lineHeight: 1.5 }}>
          Wähle einen Typ und teile was — Zitat, Gefühl, Erinnerung, Now-Playing …
        </p>
      </div>

      {/* Typ-Picker */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        gap: 8, marginBottom: 14,
      }}>
        {POST_TYPES.map((t) => {
          const active = selected.id === t.id;
          return (
            <button key={t.id} type="button" onClick={() => setSelected(t)} style={{
              padding: "10px 8px", borderRadius: 12, textAlign: "center",
              background: active
                ? `linear-gradient(135deg, ${t.color}, ${t.color}cc)`
                : "rgba(255,255,255,0.85)",
              color: active ? "#fff" : "#1c1c1e",
              border: active ? `2px solid ${t.color}` : "1.5px solid rgba(0,0,0,0.1)",
              cursor: "pointer", fontFamily: "inherit", fontWeight: active ? 800 : 600,
              fontSize: 13, transition: "all 0.18s",
              boxShadow: active ? `0 4px 12px ${t.color}55` : "none",
            }}>
              <div style={{ fontSize: 18, marginBottom: 2 }}>{t.label.split(" ")[0]}</div>
              <div style={{ fontSize: 11 }}>{t.label.split(" ").slice(1).join(" ")}</div>
            </button>
          );
        })}
      </div>

      {/* Description */}
      <div style={{
        fontSize: 12, color: "#64748b", marginBottom: 8, fontStyle: "italic",
        padding: "0 4px",
      }}>
        {selected.description}
      </div>

      {/* Text-Area */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={selected.placeholder}
        maxLength={MAX_LEN + 50}
        rows={5}
        style={{
          width: "100%", padding: 14, borderRadius: 12,
          border: `2px solid ${selected.color}55`,
          fontFamily: "inherit", fontSize: 15, lineHeight: 1.5,
          background: "#fff", boxSizing: "border-box", resize: "vertical",
          outline: "none",
        }}
      />
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginTop: 6, padding: "0 4px", fontSize: 11,
      }}>
        <span style={{ color: "#94a3b8" }}>
          {selected.id === "mention" && "Tipp: @user erwähnt Freunde + benachrichtigt sie"}
        </span>
        <span style={{ color: remaining < 20 ? "#dc2626" : "#94a3b8", fontWeight: remaining < 20 ? 800 : 400 }}>
          {remaining} Zeichen
        </span>
      </div>

      {err && (
        <div style={{
          background: "rgba(239,68,68,0.1)", color: "#991b1b",
          padding: 10, borderRadius: 10, marginTop: 12, fontSize: 13, fontWeight: 700,
        }}>⚠ {err}</div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <Link href="/buschfunk" style={{
          flex: 1, padding: 14, borderRadius: 12, textAlign: "center",
          background: "#f5f5f7", color: "#475569",
          textDecoration: "none", fontFamily: "inherit", fontWeight: 700,
          border: "1.5px solid rgba(0,0,0,0.05)",
        }}>← Abbrechen</Link>
        <button onClick={submit} disabled={!canSubmit} style={{
          flex: 2, padding: 14, borderRadius: 12,
          background: canSubmit
            ? `linear-gradient(135deg, ${selected.color}, ${selected.color}cc)`
            : "#cbd5e1",
          color: "#fff", border: "none", fontFamily: "inherit",
          fontWeight: 900, fontSize: 15,
          cursor: canSubmit ? "pointer" : "not-allowed",
          boxShadow: canSubmit ? `0 4px 14px ${selected.color}55` : "none",
        }}>
          {busy ? "⏳…" : `📤 ${selected.label.split(" ").slice(1).join(" ") || "Posten"}`}
        </button>
      </div>
    </div>
  );
}
