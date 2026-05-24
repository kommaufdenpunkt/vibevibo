"use client";

import { useState } from "react";

// Erkennt YouTube-Links/IDs in verschiedenen Formaten
function parseYouTube(input) {
  if (!input) return null;
  const s = String(input).trim();
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = s.match(p);
    if (m) return m[1];
  }
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  return null;
}

// MySpace-Style Hintergrundmusik.
// - track: Anzeigename des Songs
// - url:   YouTube-URL/ID (optional). Wenn vorhanden, spielt echte Musik.
// Autoplay ist im Browser ohne Klick verboten -> Play-Button startet die Musik.
export default function MusicPlayer({ track, url }) {
  const [playing, setPlaying] = useState(false);
  const ytId = parseYouTube(url);

  if (!track && !ytId) return null;

  const label = track || "Lieblingslied";

  function toggle() {
    setPlaying((p) => !p);
  }

  return (
    <div className={`vv-music-player${playing ? "" : " vv-paused"}`}>
      <span className="vv-music-equalizer" aria-hidden="true">
        <span /><span /><span /><span /><span />
      </span>
      <span className="vv-music-title">
        ♪ {playing ? "now playing" : "Profil-Song"}: {label}
      </span>

      {ytId ? (
        <>
          <button type="button" className="vv-btn vv-btn-cyan" onClick={toggle}>
            {playing ? "❚❚ Stop" : "▶ Play"}
          </button>
          {playing && (
            <iframe
              title="Profil-Hintergrundmusik"
              width="1"
              height="1"
              style={{ position: "absolute", left: "-9999px", width: 1, height: 1, border: 0 }}
              src={`https://www.youtube.com/embed/${ytId}?autoplay=1&loop=1&playlist=${ytId}`}
              allow="autoplay; encrypted-media"
            />
          )}
        </>
      ) : (
        <button type="button" className="vv-btn vv-btn-cyan" onClick={toggle}>
          {playing ? "❚❚ Pause" : "▶ Play"}
        </button>
      )}
    </div>
  );
}
