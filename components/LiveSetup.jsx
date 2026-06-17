"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { MAX_HOSTS_MULTI, RECOMMEND_AUDIO_ONLY_ABOVE, HOST_POLICIES } from "@/lib/live";
import HelpCard from "./HelpCard";
import MediaPermissionNotice from "./MediaPermissionNotice";

export default function LiveSetup({ onClose, onCreated }) {
  const [mode, setMode] = useState("solo");
  const [hasVideo, setHasVideo] = useState(true);
  const [hasAudio, setHasAudio] = useState(true);
  const [title, setTitle] = useState("");
  const [maxHosts, setMaxHosts] = useState(4);
  const [hostPolicy, setHostPolicy] = useState("open");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function go() {
    if (!hasVideo && !hasAudio) { setErr("Audio oder Video an."); return; }
    setBusy(true); setErr("");
    try {
      const r = await api.liveCreate({
        title: title.trim() || (mode === "solo" ? "🎙 Solo-Stream" : "🛋 Multi-Couch"),
        mode, hasVideo, hasAudio,
        maxHosts: mode === "multi" ? maxHosts : 1,
        hostPolicy,
      });
      onCreated?.(r.id);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  const heavy = mode === "multi" && maxHosts > RECOMMEND_AUDIO_ONLY_ABOVE && hasVideo;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 440, maxHeight: "90vh", overflowY: "auto",
        background: "var(--vv-card,#fff)", color: "var(--vv-text,#1c1c1e)",
        borderRadius: 16, padding: 18, boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
      }}>
        <h3 style={{ margin: "0 0 10px" }}>🎥 Live gehen</h3>

        <MediaPermissionNotice />

        <HelpCard id="live-host-rules" title="Bevor du live gehst" emoji="📋" color="#ec4899">
          <b>Was geht:</b> Schwatzen, Musik teilen, Tutorials, Kunst, Spazieren, Show, Reaktionen.
          Alltagskleidung — auch knappe Sachen, BH/Slip wenn sportlich/legitim.
          <br/><br/>
          <b>Was NICHT geht:</b><br/>
          🚫 Nackte Tatsachen, Brustwarzen, Genitalien, sexuelle Handlungen<br/>
          🚫 Minderjährige in unangemessener Form<br/>
          🚫 Drogen, Gewalt, Hass, Hetze<br/>
          🚫 Persönliche Daten Dritter ohne Erlaubnis
          <br/><br/>
          <b>Wie wir prüfen:</b> Eine KI im Browser checkt dein Video alle 3 Sek. Bei
          Treffer wird sofort schwarzgeschaltet, du kriegst einen Strike.
          Nach <b>3 Strikes innerhalb 90 Tagen</b>: 24h-Sperre. Mehr: bis 7 Tage / permanent.
          <br/><br/>
          Streams können auch von Zuschauern gemeldet werden — bleib freundlich, alles wird angeschaut.
        </HelpCard>

        <label style={{ fontSize: 12, fontWeight: 700 }}>Titel</label>
        <input className="vv-input" placeholder="z.B. Quatsch-Runde mit Kaffee ☕"
          value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100}
          style={{ marginBottom: 12, width: "100%", boxSizing: "border-box" }} />

        <label style={{ fontSize: 12, fontWeight: 700 }}>Modus</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
          {[
            { v: "solo",  emoji: "🎙", label: "Solo",  desc: "Du allein vorne" },
            { v: "multi", emoji: "🛋", label: "Multi", desc: "Bis 16 Hosts auf der Couch" },
          ].map((o) => (
            <button key={o.v} type="button" onClick={() => setMode(o.v)}
              style={{
                padding: 10, borderRadius: 10, textAlign: "left", cursor: "pointer",
                border: `2px solid ${mode === o.v ? "#ec4899" : "var(--vv-border,#ddd)"}`,
                background: mode === o.v ? "#fdf2f8" : "var(--vv-card,#fff)",
                color: "var(--vv-text,#1c1c1e)", fontFamily: "inherit",
              }}>
              <div style={{ fontSize: 22 }}>{o.emoji}</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{o.label}</div>
              <div style={{ fontSize: 10, color: "var(--vv-muted,#666)" }}>{o.desc}</div>
            </button>
          ))}
        </div>

        {mode === "multi" && (
          <>
            <label style={{ fontSize: 12, fontWeight: 700 }}>
              Max Hosts: <span style={{ color: "#ec4899" }}>{maxHosts}</span>
            </label>
            <input type="range" min="2" max={MAX_HOSTS_MULTI} value={maxHosts}
              onChange={(e) => setMaxHosts(Number(e.target.value))}
              style={{ width: "100%", marginBottom: 4 }} />
            {heavy && (
              <div style={{ fontSize: 11, color: "#92400e", background: "#fef3c7",
                padding: 6, borderRadius: 8, marginBottom: 12 }}>
                ⚠ Über {RECOMMEND_AUDIO_ONLY_ABOVE} Hosts mit Video kann ruckeln — Audio-only läuft viel sauberer.
              </div>
            )}
            {!heavy && <div style={{ height: 8 }} />}

            <label style={{ fontSize: 12, fontWeight: 700 }}>Plätze-Regelung</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              {Object.entries(HOST_POLICIES).map(([k, v]) => (
                <button key={k} type="button" onClick={() => setHostPolicy(k)}
                  style={{
                    padding: 10, borderRadius: 10, textAlign: "left", cursor: "pointer",
                    border: `2px solid ${hostPolicy === k ? "#ec4899" : "var(--vv-border,#ddd)"}`,
                    background: hostPolicy === k ? "#fdf2f8" : "var(--vv-card,#fff)",
                    color: "var(--vv-text,#1c1c1e)", fontFamily: "inherit",
                  }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{v.label}</div>
                  <div style={{ fontSize: 10, color: "var(--vv-muted,#666)" }}>{v.desc}</div>
                </button>
              ))}
            </div>
          </>
        )}

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
