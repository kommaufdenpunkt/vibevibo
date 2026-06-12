"use client";

// ♬ Profil-Musik-Player mit Playlist-Support
// - track: Anzeigename / Playlist-Titel
// - url:   eine oder mehrere YouTube-URLs (eine pro Zeile)
//
// Spielt im versteckten Iframe. Auto-Next bei Songende.
// "📌 An Mini-Player anheften" -> Musik wandert in den floating Dock,
//   laeuft beim Browsen durch die Seite weiter.

import { useEffect, useMemo, useRef, useState } from "react";

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

function parsePlaylist(url) {
  if (!url) return [];
  return String(url)
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(parseYouTube)
    .filter(Boolean);
}

export default function MusicPlayer({ track, url, owner }) {
  const playlist = useMemo(() => parsePlaylist(url), [url]);
  const [playing, setPlaying] = useState(false);
  const [idx, setIdx] = useState(0);
  const iframeRef = useRef(null);

  if (!track && playlist.length === 0) return null;

  const label = track || "Lieblings-Playlist";
  const current = playlist[idx];
  const multi = playlist.length > 1;

  function toggle() { setPlaying((p) => !p); }
  function next() { setIdx((i) => (i + 1) % playlist.length); }
  function prev() { setIdx((i) => (i - 1 + playlist.length) % playlist.length); }

  // YouTube-Iframe-API laedt nur „onStateChange" wenn enablejsapi=1
  // Wir hoeren auf postMessage vom Iframe (Endevent) per Polling-Fallback.
  // Einfacher: nach 1 Song nutzen wir die Playlist-Wiederholung via loop=1+playlist=
  // Fuer Multi-Songs aktiviere YT-API + onStateChange.
  useEffect(() => {
    if (!playing || playlist.length === 0) return;
    if (typeof window === "undefined") return;
    const onMsg = (ev) => {
      if (typeof ev.data !== "string") return;
      try {
        const m = JSON.parse(ev.data);
        // YT player events kommen als {event:"infoDelivery", info:{playerState: 0}} = Ended
        if (m.event === "infoDelivery" && m.info?.playerState === 0) {
          if (multi) next();
        }
      } catch {}
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [playing, multi, playlist.length]);

  function pinToDock() {
    if (typeof window === "undefined") return;
    const dockState = {
      ids: playlist,
      idx: idx,
      title: label,
      owner: owner || "",
      pinnedAt: Date.now(),
    };
    try {
      localStorage.setItem("vv_mini_music_dock", JSON.stringify(dockState));
      window.dispatchEvent(new CustomEvent("vv-mini-music-update"));
    } catch {}
    setPlaying(false);
  }

  return (
    <div className={`vv-music-player${playing ? "" : " vv-paused"}`}>
      <span className="vv-music-equalizer" aria-hidden="true">
        <span /><span /><span /><span /><span />
      </span>
      <span className="vv-music-title">
        ♪ {playing ? "now playing" : "Profil-Song"}: {label}
        {multi && <span style={{ opacity: 0.7, fontSize: 11, marginLeft: 6 }}>· {idx + 1}/{playlist.length}</span>}
      </span>

      {playlist.length > 0 ? (
        <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
          {multi && (
            <button type="button" className="vv-btn vv-btn-sm" onClick={prev} title="Vorheriger Song">⏮</button>
          )}
          <button type="button" className="vv-btn vv-btn-cyan" onClick={toggle}>
            {playing ? "❚❚ Stop" : "▶ Play"}
          </button>
          {multi && (
            <button type="button" className="vv-btn vv-btn-sm" onClick={next} title="Naechster Song">⏭</button>
          )}
          <button type="button" className="vv-btn vv-btn-sm" onClick={pinToDock}
            title="An den Mini-Player unten rechts anheften — laeuft weiter beim Browsen">
            📌 Mini-Dock
          </button>

          {playing && current && (
            <iframe
              ref={iframeRef}
              title="Profil-Hintergrundmusik"
              width="1"
              height="1"
              style={{ position: "absolute", left: "-9999px", width: 1, height: 1, border: 0 }}
              src={`https://www.youtube.com/embed/${current}?autoplay=1&enablejsapi=1${multi ? "" : `&loop=1&playlist=${current}`}`}
              allow="autoplay; encrypted-media"
            />
          )}
        </div>
      ) : (
        <button type="button" className="vv-btn vv-btn-cyan" onClick={toggle}>
          {playing ? "❚❚ Pause" : "▶ Play"}
        </button>
      )}
    </div>
  );
}
