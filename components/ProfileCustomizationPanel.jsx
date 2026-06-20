"use client";

// 🎨 ProfileCustomizationPanel — Mood + Musik + Glitter in einer Settings-Karte.
// User bindet es z.B. auf /profile/edit ein.

import { useEffect, useState } from "react";
import MoodPicker from "./MoodPicker";

export default function ProfileCustomizationPanel({ initialCustomization = {} }) {
  const [mood, setMood] = useState({
    emoji: initialCustomization.moodEmoji || "",
    text:  initialCustomization.moodText  || "",
    setAt: initialCustomization.moodSetAt || 0,
  });
  const [music, setMusic]     = useState(initialCustomization.profileMusicUrl || "");
  const [glitter, setGlitter] = useState(!!initialCustomization.glitterStatus);
  const [busy, setBusy]   = useState(false);
  const [flash, setFlash] = useState("");

  useEffect(() => {
    // Wenn keine Initial-Daten → vom Server laden
    if (!initialCustomization.moodSetAt) {
      fetch("/api/me/mood").then((r) => r.ok ? r.json() : null).then((d) => {
        if (d) setMood(d);
      }).catch(() => {});
    }
  }, []);

  async function saveMusic() {
    setBusy(true); setFlash("");
    try {
      const r = await fetch("/api/me/profile-music", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: music }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setFlash("✓ Musik gespeichert");
      setTimeout(() => setFlash(""), 3000);
    } catch (e) {
      setFlash(`⚠ ${e.message}`);
    } finally { setBusy(false); }
  }

  async function toggleGlitter() {
    setBusy(true);
    const next = !glitter;
    setGlitter(next);
    try {
      await fetch("/api/me/glitter", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
    } finally { setBusy(false); }
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* Mood */}
      <MoodPicker initialMood={mood} onSaved={setMood} />

      {/* Profil-Musik */}
      <div style={{
        background: "rgba(255,255,255,0.95)", borderRadius: 14, padding: 16,
      }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 900 }}>
          🎵 Profil-Musik
        </h3>
        <div style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.5, marginBottom: 10 }}>
          YouTube-Video-ID (11 Zeichen, z.B. <code>dQw4w9WgXcQ</code>) oder HTTPS-Audio-URL.
          Besucher sehen einen ▶ Play-Button auf deinem Profil.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={music} onChange={(e) => setMusic(e.target.value)}
            placeholder="dQw4w9WgXcQ oder https://…"
            style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #cbd5e1", fontFamily: "inherit", fontSize: 13 }} />
          <button onClick={saveMusic} disabled={busy}
            style={{ padding: "10px 16px", borderRadius: 10, background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "#fff", border: "none", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            💾
          </button>
        </div>
        {flash && <div style={{ fontSize: 12, fontWeight: 700, marginTop: 8, color: flash.startsWith("⚠") ? "#991b1b" : "#059669" }}>{flash}</div>}
      </div>

      {/* Glitter */}
      <div style={{
        background: "rgba(255,255,255,0.95)", borderRadius: 14, padding: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>✨ Glitter-Status</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              Animierter Glitter-Effekt um deinen Status-Display. Pures 2008-Feeling.
            </div>
          </div>
          <button onClick={toggleGlitter} disabled={busy} style={{
            width: 56, height: 30, borderRadius: 999, border: "none",
            background: glitter ? "linear-gradient(135deg, #ec4899, #a855f7)" : "#cbd5e1",
            position: "relative", cursor: "pointer",
          }}>
            <div style={{
              position: "absolute", top: 3, left: glitter ? 28 : 3,
              width: 24, height: 24, borderRadius: "50%", background: "#fff",
              transition: "left 0.18s",
            }} />
          </button>
        </div>
      </div>
    </div>
  );
}
