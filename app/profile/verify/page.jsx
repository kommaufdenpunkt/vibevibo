"use client";

export const dynamic = "force-dynamic";

// 🛡 Stimm-Verifikation — User reicht Sprachprobe ein, Fidolin schätzt Geschlecht.
// Bei Match → ✓ Verifiziert-Badge dauerhaft am Profil.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function VerifyPage() {
  const [status, setStatus] = useState(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const mediaRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    fetch("/api/me/verification", { credentials: "include" })
      .then((r) => r.json()).then(setStatus).catch(() => {});
  }, []);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        const reader = new FileReader();
        reader.onload = () => setAudioUrl(String(reader.result || ""));
        reader.readAsDataURL(blob);
        streamRef.current?.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s >= 14) { stop(); return 15; }
          return s + 1;
        });
      }, 1000);
    } catch {
      alert("Kein Mikrofon-Zugriff. Bitte erlauben.");
    }
  }
  function stop() {
    clearInterval(timerRef.current);
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    }
    setRecording(false);
  }
  function reset() {
    setAudioBlob(null);
    setAudioUrl("");
    setResult(null);
  }

  async function submit() {
    if (!audioUrl) return;
    setBusy(true); setResult(null);
    try {
      const r = await fetch("/api/me/verify-gender", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceSample: audioUrl }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Fehler");
      setResult(d);
      // Status neu laden
      const s = await fetch("/api/me/verification", { credentials: "include" }).then((x) => x.json());
      setStatus(s);
    } catch (e) {
      setResult({ ok: false, message: e.message });
    } finally {
      setBusy(false);
    }
  }

  const isVerified = status?.status === "verified" && status?.verifiedGender;
  const isRejected = status?.status === "rejected";
  const isPending = status?.status === "pending";
  const isSuspicious = status?.status === "suspicious";

  return (
    <div style={{ maxWidth: 600, margin: "20px auto", padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", textShadow: "0 2px 6px rgba(0,0,0,0.4)" }}>
        🛡 Stimm-Verifikation
      </h1>
      <p style={{ color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.3)", fontSize: 14 }}>
        Beweise mit einer kurzen Sprachprobe, dass dein angegebenes Geschlecht stimmt.
        Du kriegst dafür ein <b>✓ Verifiziert-Badge</b> am Profil, und kannst andere
        Verifizierte priorisieren.
      </p>

      {status && (
        <div style={{
          background: isVerified ? "#dcfce7" : isRejected ? "#fee2e2" : isSuspicious ? "#fef3c7" : "#f1f5f9",
          color: isVerified ? "#166534" : isRejected ? "#991b1b" : isSuspicious ? "#92400e" : "#475569",
          padding: 12, borderRadius: 12, marginBottom: 12, fontWeight: 700, fontSize: 14,
        }}>
          {isVerified && <>✓ Du bist verifiziert (Stimm-Score: {status.voiceScore}/100)</>}
          {isRejected && <>✗ Verifizierung abgelehnt — Stimme passt nicht zum angegebenen Geschlecht.</>}
          {isPending && <>⏳ Verifizierung ausstehend — versuch's nochmal.</>}
          {isSuspicious && <>⚠ Auffällig — bitte verifiziere dich.</>}
          {(!isVerified && !isRejected && !isPending && !isSuspicious) && <>Noch nicht verifiziert.</>}
        </div>
      )}

      <div style={{
        background: "rgba(255,255,255,0.96)", borderRadius: 14, padding: 16, marginBottom: 12,
      }}>
        <h3 style={{ marginTop: 0 }}>So geht's:</h3>
        <ol style={{ paddingLeft: 18, color: "#475569", fontSize: 13.5, lineHeight: 1.6 }}>
          <li>Klick „🎤 Aufnehmen" und sprich 5-15 Sekunden, ruhige Umgebung.</li>
          <li>Du kannst irgendwas sagen — am besten ein paar normale Sätze (kein Flüstern, nichts Verstelltes).</li>
          <li>Klick „Senden" — Fidolin analysiert die Stimme.</li>
          <li>Bei Match kriegst du sofort das Badge. Bei Fehler kannst du's nochmal versuchen.</li>
        </ol>

        {!audioBlob && (
          <button onClick={recording ? stop : start} disabled={busy}
            style={{
              width: "100%", padding: 14, borderRadius: 12, marginTop: 10,
              border: "none", cursor: "pointer",
              background: recording ? "#dc2626" : "#ec4899", color: "#fff",
              fontWeight: 800, fontSize: 15, fontFamily: "inherit",
            }}>
            {recording ? `⏹ Stop (${seconds}s)` : "🎤 Aufnehmen"}
          </button>
        )}

        {audioBlob && !result && (
          <div style={{ marginTop: 10 }}>
            <audio controls src={audioUrl} style={{ width: "100%", marginBottom: 8 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={reset} disabled={busy} className="vv-btn" style={{ flex: 1 }}>
                ↻ Nochmal
              </button>
              <button onClick={submit} disabled={busy}
                style={{
                  flex: 2, padding: 12, borderRadius: 10, border: "none", cursor: "pointer",
                  background: "#ec4899", color: "#fff",
                  fontWeight: 800, fontSize: 14, fontFamily: "inherit",
                }}>
                {busy ? "⏳ Analysiere…" : "✓ Zur Verifikation senden"}
              </button>
            </div>
          </div>
        )}

        {result && (
          <div style={{
            marginTop: 12, padding: 12, borderRadius: 10,
            background: result.status === "verified" ? "#dcfce7" : result.status === "rejected" ? "#fee2e2" : "#fef3c7",
            color: result.status === "verified" ? "#166534" : result.status === "rejected" ? "#991b1b" : "#92400e",
            fontWeight: 700, fontSize: 14,
          }}>
            {result.message}
            {result.detectedGender && result.confidence != null && (
              <div style={{ fontSize: 11, marginTop: 6, opacity: 0.8 }}>
                Erkannt: {result.detectedGender} · Konfidenz: {Math.round((result.confidence || 0) * 100)}%
              </div>
            )}
            {result.status !== "verified" && (
              <button onClick={reset} style={{
                marginTop: 8, padding: "6px 12px", borderRadius: 8,
                border: "1px solid currentColor", background: "transparent",
                color: "inherit", cursor: "pointer", fontWeight: 700,
              }}>↻ Nochmal versuchen</button>
            )}
          </div>
        )}
      </div>

      <Link href="/profile/privacy" style={{
        display: "inline-block", color: "#fff", textDecoration: "underline",
        fontSize: 13, fontWeight: 600,
      }}>← Zurück zu Privatsphäre-Einstellungen</Link>
    </div>
  );
}
