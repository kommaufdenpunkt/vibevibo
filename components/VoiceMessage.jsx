"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/api";

// Spielt eine Sprachnachricht ab. Bei einmalig-anhörbaren Nachrichten:
// Empfänger kann genau 1x abspielen, danach wird das Audio serverseitig gelöscht.
export default function VoiceMessage({ message, fromMe, onConsumed }) {
  const [played, setPlayed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  const { onceOnly, consumed, audioUrl } = message;

  // Bereits verbraucht (oder vom Sender als once markiert -> Sender hört's nicht nochmal)
  if (onceOnly && (consumed || (!audioUrl && !fromMe))) {
    return (
      <div className="vv-voice-bubble vv-voice-gone">
        🔥 <em>Sprachnachricht abgehört &amp; vernichtet</em>
      </div>
    );
  }

  if (fromMe && onceOnly) {
    return (
      <div className="vv-voice-bubble">
        🎤 <em>Einmal-Sprachnachricht gesendet</em> 🔥
      </div>
    );
  }

  async function play() {
    if (!audioUrl || !audioRef.current) return;
    audioRef.current.play();
    setPlaying(true);
  }

  async function handleEnded() {
    setPlaying(false);
    setPlayed(true);
    // Einmal-Nachricht nach Abspielen vernichten
    if (onceOnly && !fromMe) {
      try { await api.consumeMessage(message.id); } catch {}
      onConsumed?.();
    }
  }

  return (
    <div className="vv-voice-bubble">
      <button
        type="button"
        className="vv-voice-play"
        onClick={play}
        disabled={playing || (onceOnly && played)}
      >
        {playing ? "▶▶" : "▶"}
      </button>
      <span className="vv-voice-wave" aria-hidden="true">
        <span /><span /><span /><span /><span /><span /><span />
      </span>
      <span className="vv-voice-label">
        {onceOnly ? "🔥 1x Sprachnachricht" : "🎤 Sprachnachricht"}
      </span>
      {audioUrl && <audio ref={audioRef} src={audioUrl} onEnded={handleEnded} />}
    </div>
  );
}
