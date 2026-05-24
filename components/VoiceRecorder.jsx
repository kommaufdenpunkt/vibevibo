"use client";

import { useRef, useState } from "react";

// Nimmt eine Sprachnachricht via MediaRecorder auf und gibt sie als
// Base64-data-URL zurück. Maximal 60 Sekunden.
export default function VoiceRecorder({ onSend, disabled }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [onceOnly, setOnceOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  async function start() {
    if (disabled) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = finish;
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s >= 59) { stop(); return 60; }
          return s + 1;
        });
      }, 1000);
    } catch {
      alert("Kein Mikrofon-Zugriff. Bitte erlauben.");
    }
  }

  function stop() {
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    }
    clearInterval(timerRef.current);
    setRecording(false);
  }

  function cleanup() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  async function finish() {
    cleanup();
    const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || "audio/webm" });
    if (blob.size < 800) return; // zu kurz / leer
    setBusy(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        await onSend(reader.result, onceOnly);
        setOnceOnly(false);
      } catch (e) {
        alert(e.message || "Senden fehlgeschlagen");
      } finally {
        setBusy(false);
      }
    };
    reader.readAsDataURL(blob);
  }

  return (
    <div className="vv-voice-rec">
      <label className="vv-voice-once" title="Nur einmal anhörbar - danach für immer weg">
        <input type="checkbox" checked={onceOnly} onChange={(e) => setOnceOnly(e.target.checked)} disabled={recording} />
        🔥 1x
      </label>
      {recording ? (
        <button type="button" className="vv-btn vv-voice-stop" onClick={stop}>
          ⏺ {seconds}s · Stop
        </button>
      ) : (
        <button type="button" className="vv-btn" onClick={start} disabled={disabled || busy} title="Sprachnachricht aufnehmen">
          {busy ? "…" : "🎤"}
        </button>
      )}
    </div>
  );
}
