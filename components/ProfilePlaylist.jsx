"use client";

// 🎵 Profil-Playlist — zeigt Songs eines Users + spielt sie ab.
//
// Browser BLOCKEN Autoplay → User muss EINMAL klicken. Danach Auto-Next bei
// Track-Ende. Shuffle optional.
//
// 🎲 Random-Start: Jeder Song startet an einer ZUFÄLLIGEN Stelle (10-60s rein
// bei YouTube, oder zwischen 5% und 50% bei Audio). So wird's nie langweilig.
//
// Akzeptiert YouTube-IDs (11 Zeichen) oder direkte Audio-URLs.

import { useEffect, useMemo, useRef, useState } from "react";

function isYouTubeId(s) {
  return /^[a-zA-Z0-9_-]{11}$/.test(String(s || ""));
}

// Generiert einen zufälligen Start-Offset für einen Track (in Sekunden).
// Für YouTube: 10-60s rein (wir kennen die Länge nicht — Heuristik: jeder Pop-Song
// hat dort schon Action). Für Audio wird's nach loadedmetadata neu berechnet.
function randomYTStart() {
  return 10 + Math.floor(Math.random() * 50);
}

export default function ProfilePlaylist({ username, ownerName }) {
  const [tracks, setTracks] = useState(null);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [randomStart, setRandomStart] = useState(true);
  const [ytStart, setYtStart] = useState(0);  // wird pro Track neu gewürfelt
  const audioRef = useRef(null);

  useEffect(() => {
    if (!username) return;
    fetch(`/api/users/${encodeURIComponent(username)}/playlist`)
      .then((r) => r.ok ? r.json() : { playlist: [] })
      .then((d) => setTracks(d.playlist || []))
      .catch(() => setTracks([]));
  }, [username]);

  // Bei Track-Wechsel: neuer Random-Start
  useEffect(() => {
    if (randomStart) setYtStart(randomYTStart());
    else setYtStart(0);
  }, [idx, randomStart]);

  if (!tracks) return null;
  if (tracks.length === 0) return null;

  const cur = tracks[idx];

  function next() {
    if (shuffle && tracks.length > 1) {
      let nextIdx;
      do { nextIdx = Math.floor(Math.random() * tracks.length); } while (nextIdx === idx);
      setIdx(nextIdx);
    } else {
      setIdx((i) => (i + 1) % tracks.length);
    }
  }
  function prev() {
    setIdx((i) => (i - 1 + tracks.length) % tracks.length);
  }
  function togglePlay() {
    setPlaying((p) => !p);
  }

  // Audio: nach Metadaten-Load zufällig in die ersten 50% springen
  function onAudioLoadedMeta(e) {
    if (!randomStart) return;
    const dur = e.target.duration;
    if (!dur || !isFinite(dur)) return;
    const start = Math.floor(dur * (0.05 + Math.random() * 0.45));
    try { e.target.currentTime = start; } catch {}
  }

  const isYT = isYouTubeId(cur.musicUrl);

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(0,0,0,0.85), rgba(15,23,42,0.92))",
      color: "#fff",
      borderRadius: 14, padding: 14,
      boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <button onClick={togglePlay} style={{
          width: 48, height: 48, borderRadius: "50%",
          background: "linear-gradient(135deg, #ec4899, #a855f7)",
          color: "#fff", border: "none", fontSize: 18, cursor: "pointer",
          flexShrink: 0,
        }}>{playing ? "⏸" : "▶"}</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 10, opacity: 0.6, letterSpacing: 1.2,
            textTransform: "uppercase", fontWeight: 800, marginBottom: 2,
          }}>
            🎵 {ownerName ? `@${ownerName}'s Playlist` : "Playlist"} · {idx + 1}/{tracks.length}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {cur.title || (isYT ? "YouTube-Track" : "Audio")}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <button onClick={prev} disabled={tracks.length < 2} style={btnStyle()}>⏮</button>
        <button onClick={next} disabled={tracks.length < 2} style={btnStyle()}>⏭</button>
        <button onClick={() => setShuffle((s) => !s)} title="Zufällige Reihenfolge" style={{
          ...btnStyle(),
          background: shuffle ? "rgba(168,85,247,0.4)" : "rgba(255,255,255,0.1)",
        }}>🔀</button>
        <button onClick={() => setRandomStart((r) => !r)} title="Random Start-Position" style={{
          ...btnStyle(),
          background: randomStart ? "rgba(236,72,153,0.4)" : "rgba(255,255,255,0.1)",
        }}>🎲</button>
      </div>

      {/* Track-Liste */}
      <div style={{ display: "grid", gap: 4, maxHeight: 160, overflowY: "auto" }}>
        {tracks.map((t, i) => (
          <button key={t.id} onClick={() => { setIdx(i); setPlaying(true); }} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 8px", borderRadius: 6,
            background: i === idx ? "rgba(236,72,153,0.25)" : "transparent",
            border: "none", color: "#fff", textAlign: "left", cursor: "pointer",
            fontFamily: "inherit", fontSize: 12,
          }}>
            <span style={{ width: 16, opacity: 0.6 }}>{i + 1}.</span>
            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {t.title || (isYouTubeId(t.musicUrl) ? "YT: " + t.musicUrl : "Audio")}
            </span>
          </button>
        ))}
      </div>

      {/* Player (versteckt) */}
      {playing && (
        isYT ? (
          <iframe
            key={`yt-${cur.id}-${idx}-${ytStart}`}
            width="0" height="0" frameBorder="0" allow="autoplay"
            src={`https://www.youtube-nocookie.com/embed/${cur.musicUrl}?autoplay=1&controls=0${ytStart > 0 ? `&start=${ytStart}` : ""}`}
            style={{ position: "absolute", left: -9999 }}
            title="Profil-Playlist"
          />
        ) : (
          <audio
            key={`audio-${cur.id}-${idx}`}
            ref={audioRef}
            src={cur.musicUrl}
            autoPlay
            onLoadedMetadata={onAudioLoadedMeta}
            onEnded={next}
            style={{ display: "none" }}
          />
        )
      )}
    </div>
  );
}

function btnStyle() {
  return {
    flex: 1, padding: "7px 8px", borderRadius: 8,
    background: "rgba(255,255,255,0.1)", color: "#fff",
    border: "1px solid rgba(255,255,255,0.15)",
    fontFamily: "inherit", fontWeight: 600, fontSize: 13, cursor: "pointer",
  };
}
