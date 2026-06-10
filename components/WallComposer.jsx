"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import SmileyPicker from "./SmileyPicker";
import MentionTextarea from "./MentionTextarea";
import InlineToolbar from "./InlineToolbar";
import { parseMediaUrl } from "@/lib/media";

// Bild im Browser auf 600px verkleinern -> kleines JPEG
function fileToPostImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = reject;
      img.onload = () => {
        const maxDim = 600;
        let { width, height } = img;
        const ratio = Math.min(1, maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

const MAX_TEXT = 1000;

export default function WallComposer({ targetUsername, onPosted, placeholder = "Was machst du gerade?" }) {
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [audio, setAudio] = useState(null);     // data:audio/... base64
  const [audioSec, setAudioSec] = useState(0);
  const [musicUrl, setMusicUrl] = useState("");
  const [showMusic, setShowMusic] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef(null);
  const taRef = useRef(null);

  // Voice-Recording-State
  const [recording, setRecording] = useState(false);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const [recSec, setRecSec] = useState(0);

  useEffect(() => () => stopStream(), []);

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    clearInterval(timerRef.current);
  }

  async function onPickImage(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { setMsg("⚠ Bitte ein Bild auswählen."); return; }
    try { setImage(await fileToPostImage(file)); }
    catch { setMsg("⚠ Bild konnte nicht geladen werden."); }
  }

  async function startRec() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = finishRec;
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      setRecSec(0);
      timerRef.current = setInterval(() => {
        setRecSec((s) => {
          if (s >= 59) { stopRec(); return 60; }
          return s + 1;
        });
      }, 1000);
    } catch {
      setMsg("⚠ Kein Mikrofon-Zugriff. Bitte erlauben.");
    }
  }

  function stopRec() {
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    }
    clearInterval(timerRef.current);
    setRecording(false);
  }

  function finishRec() {
    stopStream();
    const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || "audio/webm" });
    if (blob.size < 800) { setMsg("⚠ Aufnahme zu kurz."); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      setAudio(reader.result);
      setAudioSec(recSec);
    };
    reader.readAsDataURL(blob);
  }

  async function submit(e) {
    e?.preventDefault?.();
    const t = text.trim();
    if (!t && !image && !audio && !musicUrl) return;
    setBusy(true); setMsg("");
    try {
      const res = await api.postPinnwand(targetUsername, t, image, audio, musicUrl);
      setText(""); setImage(null); setAudio(null); setMusicUrl(""); setShowMusic(false);
      const notes = [res?.imageNote, res?.audioNote, res?.musicNote].filter(Boolean).join(" · ");
      setMsg(notes ? "⏳ " + notes : "✅ Gepostet!");
      onPosted?.();
      setTimeout(() => setMsg(""), 4000);
    } catch (err) {
      setMsg("⚠ " + (err.message || "Fehler"));
    } finally {
      setBusy(false);
    }
  }

  const charsLeft = MAX_TEXT - text.length;
  const musicPreview = musicUrl ? parseMediaUrl(musicUrl) : null;
  const hasAttachment = !!image || !!audio || !!musicPreview;

  return (
    <form onSubmit={submit}>
      <InlineToolbar taRef={taRef} value={text} onChange={setText} maxLength={MAX_TEXT} />
      <MentionTextarea
        rows={3}
        value={text}
        maxLength={MAX_TEXT}
        onChange={setText}
        placeholder={placeholder}
        innerRef={taRef}
      />

      {/* Char-Counter */}
      <div style={{
        textAlign: "right", fontSize: 11,
        color: charsLeft < 50 ? "#dc2626" : "var(--vv-muted, #888)",
        marginTop: 2,
      }}>
        {text.length}/{MAX_TEXT}
      </div>

      {/* Image-Vorschau */}
      {image && (
        <div style={{ position: "relative", marginTop: 8, display: "inline-block" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" style={{ maxHeight: 160, maxWidth: "100%", borderRadius: 10 }} />
          <button type="button" onClick={() => setImage(null)} aria-label="Bild entfernen"
            style={{ position: "absolute", top: -8, right: -8, width: 22, height: 22, borderRadius: "50%", border: "none", background: "#222", color: "#fff", cursor: "pointer", padding: 0 }}>×</button>
        </div>
      )}

      {/* Audio-Vorschau */}
      {audio && (
        <div className="vv-mt-8" style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "var(--vv-surface, #f5f5f7)", borderRadius: 10, padding: 8,
          border: "1px solid var(--vv-border, #ddd)",
        }}>
          <span style={{ fontSize: 18 }}>🎤</span>
          <audio src={audio} controls style={{ flex: 1, height: 32 }} />
          <span style={{ fontSize: 11, color: "var(--vv-muted, #888)" }}>{audioSec}s</span>
          <button type="button" onClick={() => { setAudio(null); setAudioSec(0); }}
            aria-label="Audio entfernen"
            style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 18 }}>×</button>
        </div>
      )}

      {/* Aufnahme laeuft - Stop-Button */}
      {recording && (
        <div className="vv-mt-8" style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "linear-gradient(135deg, #fee2e2, #fecaca)",
          borderRadius: 10, padding: 10, border: "2px solid #dc2626",
        }}>
          <span style={{ fontSize: 18, animation: "vv-pop 0.8s ease-in-out infinite" }}>🔴</span>
          <span style={{ flex: 1, fontWeight: 800, color: "#7f1d1d" }}>Aufnahme läuft… {recSec}s / 60s</span>
          <button type="button" onClick={stopRec}
            style={{
              background: "#dc2626", color: "#fff", border: "none",
              borderRadius: 8, padding: "6px 14px", fontWeight: 800, cursor: "pointer", fontSize: 13,
            }}>⏹ Stop</button>
        </div>
      )}

      {/* Musik-URL Eingabe */}
      {showMusic && (
        <div className="vv-mt-8" style={{
          background: "linear-gradient(135deg, #fae8ff, #fce7f3)",
          borderRadius: 10, padding: 10, border: "1px solid #ec4899",
        }}>
          <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 4, color: "#831843" }}>
            🎵 Musik-Link (YouTube oder Spotify)
          </div>
          <input type="url" value={musicUrl} onChange={(e) => setMusicUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=… oder https://open.spotify.com/track/…"
            className="vv-input" style={{ fontSize: 12 }} />
          {musicUrl && !musicPreview && (
            <div style={{ fontSize: 11, color: "#dc2626", marginTop: 4 }}>
              ⚠ Link nicht erkannt — nur YouTube/Spotify werden unterstützt.
            </div>
          )}
          {musicPreview && (
            <div style={{ fontSize: 11, color: "#15803d", marginTop: 4, fontWeight: 700 }}>
              ✅ {musicPreview.provider === "youtube" ? "YouTube-Video" : "Spotify"} erkannt — wird mit Autoplay eingebettet.
            </div>
          )}
        </div>
      )}

      {/* Buttons-Leiste */}
      <div className="vv-row vv-mt-8" style={{ alignItems: "center", flexWrap: "wrap", gap: 6 }}>
        <SmileyPicker onPick={(s) => setText((t) => t + s)} />
        <button type="button" className="vv-btn" onClick={() => fileRef.current?.click()}
          disabled={busy || !!image} title="Foto anhängen">📷</button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickImage} />
        <button type="button" className="vv-btn" onClick={recording ? stopRec : startRec}
          disabled={busy || !!audio} title="Sprachnachricht aufnehmen"
          style={recording ? { background: "#dc2626", color: "#fff" } : undefined}>
          {recording ? "⏹" : "🎤"}
        </button>
        <button type="button" className="vv-btn"
          onClick={() => setShowMusic((v) => !v)}
          disabled={busy} title="Musik anhängen (YouTube/Spotify)"
          style={showMusic ? { background: "#ec4899", color: "#fff" } : undefined}>
          🎵
        </button>
        <div className="vv-spacer" />
        <button type="submit" className="vv-btn vv-btn-pink"
          disabled={busy || recording || (!text.trim() && !hasAttachment)}>
          {busy ? "…" : "📢 Posten"}
        </button>
      </div>

      {msg && <div className="vv-mt-8" style={{
        fontWeight: "bold", fontSize: 13,
        color: msg.startsWith("⚠") ? "#dc2626" : "#15803d",
      }}>{msg}</div>}

      <div className="vv-muted vv-mt-8" style={{ fontSize: 11 }}>
        🤖 Fidolin prüft Text, Bild &amp; Sprachnachricht streng · @user markiert Personen · 🎵 YouTube/Spotify spielt automatisch
      </div>
    </form>
  );
}
