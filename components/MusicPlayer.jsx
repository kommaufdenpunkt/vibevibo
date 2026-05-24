"use client";

import { useState } from "react";

// MySpace-Style Music Player. Da wir keine Songs hosten, ist es ein
// stilisierter "Equalizer" der den aktuell auf der Profilseite hinterlegten
// Titel "abspielt". Ein Klick auf den Button schaltet Play/Pause.
export default function MusicPlayer({ track }) {
  const [playing, setPlaying] = useState(true);

  if (!track) return null;

  return (
    <div className={`vv-music-player${playing ? "" : " vv-paused"}`}>
      <span className="vv-music-equalizer" aria-hidden="true">
        <span /><span /><span /><span /><span />
      </span>
      <span className="vv-music-title">
        ♪ now playing: {track}
      </span>
      <button
        type="button"
        className="vv-btn vv-btn-cyan"
        onClick={() => setPlaying((p) => !p)}
      >
        {playing ? "❚❚ Pause" : "▶ Play"}
      </button>
    </div>
  );
}
