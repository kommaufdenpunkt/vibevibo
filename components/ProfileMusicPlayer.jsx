"use client";

// 🎵 ProfileMusicPlayer — spielt Musik beim Profil-Besuch.
// Akzeptiert: YouTube-Video-ID (11 Zeichen) oder HTTPS-Audio-URL.
// Auto-Play ist NICHT default (Browser blocken's eh) — User muss klicken.

import { useState } from "react";

function isYouTubeId(s) {
  return /^[a-zA-Z0-9_-]{11}$/.test(s);
}

export default function ProfileMusicPlayer({ url, ownerName }) {
  const [playing, setPlaying] = useState(false);
  if (!url) return null;
  const isYT = isYouTubeId(url);

  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 10,
      padding: "10px 14px", borderRadius: 12,
      background: "linear-gradient(135deg, rgba(0,0,0,0.7), rgba(0,0,0,0.5))",
      backdropFilter: "blur(8px)",
      border: "1px solid rgba(255,255,255,0.1)",
      color: "#fff", maxWidth: "100%",
    }}>
      <button onClick={() => setPlaying(!playing)} style={{
        width: 36, height: 36, borderRadius: "50%",
        background: "linear-gradient(135deg, #ec4899, #a855f7)",
        color: "#fff", border: "none", fontSize: 14, cursor: "pointer",
      }}>{playing ? "⏸" : "▶"}</button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 }}>
          🎵 {ownerName ? `@${ownerName}'s Musik` : "Profil-Musik"}
        </div>
        <div style={{ fontSize: 12, color: "#fff", fontWeight: 600, opacity: 0.9, marginTop: 2 }}>
          {isYT ? "YouTube" : "Audio-Stream"}
        </div>
      </div>
      {playing && (isYT ? (
        <iframe
          width="0" height="0" frameBorder="0" allow="autoplay"
          src={`https://www.youtube-nocookie.com/embed/${url}?autoplay=1&controls=0&modestbranding=1&loop=1&playlist=${url}`}
          style={{ position: "absolute", left: -9999 }}
          title="Profil-Musik"
        />
      ) : (
        <audio src={url} autoPlay loop style={{ display: "none" }} />
      ))}
    </div>
  );
}
