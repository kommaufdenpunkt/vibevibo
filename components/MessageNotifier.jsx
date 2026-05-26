"use client";

import { useCallback, useEffect } from "react";
import { useMe } from "@/lib/useMe";
import { useMessageStream } from "@/lib/useEventStream";

// AudioContext erst nach erster Nutzer-Interaktion (Browser-Regel), dann wiederverwenden.
let audioCtx = null;
function ensureCtx() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { audioCtx = new AC(); } catch { return null; }
  }
  if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
  return audioCtx;
}

// ICQ-artiges "Oh-Oh" – zwei kurze Töne (hoch -> tief).
function playUhOh() {
  const ctx = ensureCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const beep = (freq, start, dur) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(freq, t0 + start);
    g.gain.setValueAtTime(0.0001, t0 + start);
    g.gain.exponentialRampToValueAtTime(0.3, t0 + start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t0 + start);
    o.stop(t0 + start + dur + 0.03);
  };
  beep(700, 0, 0.13);     // "Oh"
  beep(560, 0.17, 0.22);  // "Ohh"
}

export default function MessageNotifier() {
  const { me } = useMe();

  // Audio nach erster Interaktion freischalten (auch in der installierten PWA)
  useEffect(() => {
    const unlock = () => ensureCtx();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const onMsg = useCallback((data) => {
    // Nur bei EINGEHENDEN Nachrichten (nicht meine eigenen)
    if (data && data.fromMe === false) playUhOh();
  }, []);

  useMessageStream(!!me, onMsg);
  return null;
}
