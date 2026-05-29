// Gemeinsame Sound-Helfer fuer Notifications. Web-Audio (kein File noetig),
// funktioniert auch in der installierten PWA nach der ersten Nutzer-Interaktion.

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

function beep(ctx, t0, freq, start, dur, gain = 0.3) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(freq, t0 + start);
  g.gain.setValueAtTime(0.0001, t0 + start);
  g.gain.exponentialRampToValueAtTime(gain, t0 + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
  o.connect(g); g.connect(ctx.destination);
  o.start(t0 + start);
  o.stop(t0 + start + dur + 0.03);
}

// ICQ-Style "Oh-Oh" fuer eingehende Chat-Nachrichten
export function playUhOh() {
  const ctx = ensureCtx(); if (!ctx) return;
  const t0 = ctx.currentTime;
  beep(ctx, t0, 700, 0, 0.13);
  beep(ctx, t0, 560, 0.17, 0.22);
}

// Sanftes Glocken-Ping fuer Benachrichtigungen (Pinnwand, Like, Geschenk, Mention)
export function playPing() {
  const ctx = ensureCtx(); if (!ctx) return;
  const t0 = ctx.currentTime;
  beep(ctx, t0, 880, 0, 0.18, 0.2);
  beep(ctx, t0, 1320, 0.05, 0.22, 0.15);
}

// Im Layout aufrufen, damit Audio nach der ersten Interaktion entsperrt wird.
export function unlockSoundOnFirstInteraction() {
  if (typeof window === "undefined") return () => {};
  const unlock = () => ensureCtx();
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
  return () => {
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
}
