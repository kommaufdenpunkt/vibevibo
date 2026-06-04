"use client";

// Pro-Typ-Toggle für Push-Benachrichtigungen + Sound + Presence (Online-Status).
// Settings sind sofort gespeichert.

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";

const TYPES = [
  { id: "message",      emoji: "💬", label: "Chat-Nachrichten",     desc: "Wenn dir jemand schreibt" },
  { id: "nudge",        emoji: "👋", label: "Anklopfen",             desc: "Kurzes Anschubsen aus dem Chat" },
  { id: "call",         emoji: "📞", label: "Anrufe",                desc: "Eingehende Sprach-/Video-Calls" },
  { id: "gift",         emoji: "🎁", label: "Geschenke",             desc: "Wenn dir jemand ein Profil-Geschenk schickt" },
  { id: "pinnwand",     emoji: "📌", label: "Pinnwand-Posts",        desc: "Wenn jemand auf deine Wand schreibt / gruschelt" },
  { id: "live_started", emoji: "🔴", label: "Fan ist live!",         desc: "Wenn ein User den du in Top-5 hast live geht" },
  { id: "mod",          emoji: "🛡", label: "Mod- / Cohost-Status",  desc: "Wenn du zum Mod / Cohost gemacht wirst" },
];

const SOUNDS = [
  { v: "icq",    label: 'ICQ „Oh-Oh"' },
  { v: "msn",    label: 'MSN „Pling"' },
  { v: "aim",    label: "AIM Tür" },
  { v: "silent", label: "Stille" },
];

const PRESENCES = [
  { v: "online",    label: "🟢 Online" },
  { v: "away",      label: "🟡 Abwesend" },
  { v: "busy",      label: "🔴 Beschäftigt" },
  { v: "invisible", label: "⚪ Unsichtbar" },
];

export default function PushPrefsSettings() {
  const { me, refresh } = useMe();
  const [prefs, setPrefs] = useState(null);
  const [flash, setFlash] = useState("");
  const [sound, setSound] = useState(null);
  const [presence, setPresence] = useState(null);

  const load = useCallback(() => {
    api.pushPrefs().then((r) => setPrefs(r.prefs)).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!me) return;
    setSound(me.soundPack || "icq");
    setPresence(me.presence || "online");
  }, [me]);

  async function setSoundPack(v) {
    setSound(v);
    try { await api.updateMyPrefs({ soundPack: v }); await refresh?.(); }
    catch (e) { setFlash(`⚠ ${e.message}`); setTimeout(() => setFlash(""), 3000); }
  }
  async function setPresenceVal(v) {
    setPresence(v);
    try { await api.updateMyPrefs({ presence: v }); await refresh?.(); }
    catch (e) { setFlash(`⚠ ${e.message}`); setTimeout(() => setFlash(""), 3000); }
  }

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

      {/* Benachrichtigungs-Sound */}
      {sound && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>🔊 Benachrichtigungs-Sound</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 6, marginBottom: 10 }}>
            {SOUNDS.map((o) => (
              <label key={o.v} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 10px",
                border: `1px solid ${sound === o.v ? "#ec4899" : "var(--vv-border,#ddd)"}`,
                borderRadius: 10,
                background: sound === o.v ? "#fff5fb" : "var(--vv-card,#fff)",
                color: "var(--vv-text,#1c1c1e)",
                cursor: "pointer", fontSize: 13,
              }}>
                <input type="radio" name="vv-sound" value={o.v}
                  checked={sound === o.v} onChange={() => setSoundPack(o.v)} />
                {o.label}
              </label>
            ))}
          </div>
          <div className="vv-muted" style={{ fontSize: 11, marginBottom: 12 }}>
            Gruppen-Nachrichten kommen immer im MSN-Pling — außer du wählst „Stille".
          </div>
        </>
      )}

      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Welche Push-Typen?</div>
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
