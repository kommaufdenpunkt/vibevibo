"use client";

// Pro-Typ-Toggle für Push-Benachrichtigungen. Settings sind sofort gespeichert.

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

const TYPES = [
  { id: "message",      emoji: "💬", label: "Chat-Nachrichten",     desc: "Wenn dir jemand schreibt" },
  { id: "nudge",        emoji: "👋", label: "Anklopfen",             desc: "Kurzes Anschubsen aus dem Chat" },
  { id: "call",         emoji: "📞", label: "Anrufe",                desc: "Eingehende Sprach-/Video-Calls" },
  { id: "gift",         emoji: "🎁", label: "Geschenke",             desc: "Wenn dir jemand ein Profil-Geschenk schickt" },
  { id: "pinnwand",     emoji: "📌", label: "Pinnwand-Posts",        desc: "Wenn jemand auf deine Wand schreibt / gruschelt" },
  { id: "live_started", emoji: "🔴", label: "Fan ist live!",         desc: "Wenn ein User den du in Top-5 hast live geht" },
  { id: "mod",          emoji: "🛡", label: "Mod- / Cohost-Status",  desc: "Wenn du zum Mod / Cohost gemacht wirst" },
];

export default function PushPrefsSettings() {
  const [prefs, setPrefs] = useState(null);
  const [flash, setFlash] = useState("");

  const load = useCallback(() => {
    api.pushPrefs().then((r) => setPrefs(r.prefs)).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  async function toggle(id) {
    if (!prefs) return;
    const next = { ...prefs, [id]: !prefs[id] };
    setPrefs(next); // optimistisch
    try {
      const r = await api.pushPrefsSet(next);
      setPrefs(r.prefs);
    } catch (e) { setFlash(`⚠ ${e.message}`); setTimeout(() => setFlash(""), 3000); }
  }

  if (!prefs) return null;

  return (
    <div className="vv-card">
      <h3 style={{ margin: "0 0 4px" }}>🔔 Welche Benachrichtigungen willst du?</h3>
      <div className="vv-muted" style={{ fontSize: 12, marginBottom: 10 }}>
        Jeder Typ einzeln steuerbar. Wenn du Push grundsätzlich an hast, kannst du
        hier feiner einstellen was klingeln soll.
      </div>
      {flash && (
        <div style={{
          padding: 8, background: "#fef3c7", color: "#92400e",
          borderRadius: 8, fontWeight: 700, fontSize: 12, marginBottom: 8,
        }}>{flash}</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {TYPES.map((t) => {
          const on = prefs[t.id] !== false;
          return (
            <label key={t.id} style={{
              display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
              padding: "8px 10px", borderRadius: 10,
              background: "var(--vv-surface,#f5f5f7)",
            }}>
              <span style={{ fontSize: 22 }}>{t.emoji}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{t.label}</div>
                <div style={{ fontSize: 11, color: "var(--vv-muted,#666)" }}>{t.desc}</div>
              </span>
              <input type="checkbox" checked={on} onChange={() => toggle(t.id)}
                style={{ width: 18, height: 18, cursor: "pointer" }} />
            </label>
          );
        })}
      </div>
    </div>
  );
}
