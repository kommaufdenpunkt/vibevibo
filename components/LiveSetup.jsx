"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export default function LiveSetup({ onClose, onCreated }) {
  const [mode, setMode] = useState("solo");
  const [hasVideo, setHasVideo] = useState(true);
  const [hasAudio, setHasAudio] = useState(true);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function go() {
    if (!hasVideo && !hasAudio) { setErr("Audio oder Video an."); return; }
    setBusy(true); setErr("");
    try {
      const r = await api.liveCreate({
        title: title.trim() || (mode === "solo" ? "🎙 Solo-Stream" : "🛋 Multi-Couch"),
        mode, hasVideo, hasAudio,
      });
      onCreated?.(r.id);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 420, background: "var(--vv-card,#fff)",
        color: "var(--vv-text,#1c1c1e)",
        borderRadius: 16, padding: 18, boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
      }}>
        <h3 style={{ margin: "0 0 10px" }}>🎥 Live gehen</h3>

        <label style={{ fontSize: 12, fontWeight: 700 }}>Titel</label>
        <input className="vv-input" placeholder="z.B. Quatsch-Runde mit Kaffee ☕"
          value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100}
          style={{ marginBottom: 12, width: "100%", boxSizing: "border-box" }} />

        <label style={{ fontSize: 12, fontWeight: 700 }}>Modus</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
          {[
            { v: "solo",  emoji: "🎙", label: "Solo",  desc: "Du allein vorne" },
            { v: "multi", emoji: "🛋", label: "Multi", desc: "Bis 4 Hosts auf der Couch" },
          ].map((o) => (
            <button key={o.v} type="button" onClick={() => setMode(o.v)}
              style={{
                padding: 10, borderRadius: 10, textAlign: "left", cursor: "pointer",
                border: `2px solid ${mode === o.v ? "#ec4899" : "var(--vv-border,#ddd)"}`,
                background: mode === o.v ? "#fdf2f8" : "var(--vv-card,#fff)",
                color: "var(--vv-text,#1c1c1e)",
                fontFamily: "inherit",
              }}>
              <div style={{ fontSize: 22 }}>{o.emoji}</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{o.label}</div>
              <div style={{ fontSize: 10, color: "var(--vv-muted,#666)" }}>{o.desc}</div>
            </button>
          ))}
        </div>

        <label style={{ fontSize: 12, fontWeight: 700 }}>Medien</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button type="button" onClick={() => setHasVideo((v) => !v)}
            style={{
              flex: 1, padding: 10, borderRadius: 10, cursor: "pointer",
              border: `2px solid ${hasVideo ? "#ec4899" : "var(--vv-border,#ddd)"}`,
              background: hasVideo ? "#fdf2f8" : "var(--vv-card,#fff)",
              color: "var(--vv-text,#1c1c1e)", fontFamily: "inherit", fontWeight: 600,
            }}>📹 Video {hasVideo ? "AN" : "AUS"}</button>
          <button type="button" onClick={() => setHasAudio((v) => !v)}
            style={{
              flex: 1, padding: 10, borderRadius: 10, cursor: "pointer",
              border: `2px solid ${hasAudio ? "#ec4899" : "var(--vv-border,#ddd)"}`,
              background: hasAudio ? "#fdf2f8" : "var(--vv-card,#fff)",
              color: "var(--vv-text,#1c1c1e)", fontFamily: "inherit", fontWeight: 600,
            }}>🎤 Audio {hasAudio ? "AN" : "AUS"}</button>
        </div>

        {err && <div style={{ color: "#b91c1c", fontSize: 12, marginBottom: 8 }}>⚠ {err}</div>}

        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={onClose} className="vv-btn" style={{ flex: 1 }}>Abbrechen</button>
          <button type="button" onClick={go} disabled={busy}
            className="vv-btn-big vv-btn-big-pink" style={{ flex: 2, padding: 10, fontSize: 14 }}>
            {busy ? "Starte…" : "🔴 Jetzt live!"}
          </button>
        </div>
      </div>
    </div>
  );
}
