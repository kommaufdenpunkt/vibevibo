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

function tone(ctx, t0, freq, start, dur, gain = 0.3, type = "sine") {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0 + start);
  g.gain.setValueAtTime(0.0001, t0 + start);
  g.gain.exponentialRampToValueAtTime(gain, t0 + start + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
  o.connect(g); g.connect(ctx.destination);
  o.start(t0 + start);
  o.stop(t0 + start + dur + 0.03);
}

// ICQ-Style "Oh-Oh" fuer eingehende 1:1-Chat-Nachrichten
export function playUhOh() {
  const ctx = ensureCtx(); if (!ctx) return;
  const t0 = ctx.currentTime;
  tone(ctx, t0, 700, 0, 0.13);
  tone(ctx, t0, 560, 0.17, 0.22);
}

// MSN-Style Dreiton "Pling" fuer Gruppen-Nachrichten
export function playMsnDing() {
  const ctx = ensureCtx(); if (!ctx) return;
  const t0 = ctx.currentTime;
  tone(ctx, t0, 1320, 0,    0.10, 0.28);
  tone(ctx, t0, 1760, 0.09, 0.12, 0.25);
  tone(ctx, t0, 1175, 0.18, 0.22, 0.22);
}

// AIM-Style Tür-Schwung (Auf-/Zumachen) — angedeutet
export function playAimDoor() {
  const ctx = ensureCtx(); if (!ctx) return;
  const t0 = ctx.currentTime;
  // kurzer "creak" mit Sägezahn
  tone(ctx, t0, 200, 0, 0.18, 0.18, "sawtooth");
  tone(ctx, t0, 320, 0.18, 0.14, 0.16, "sawtooth");
}

// MSN-Nudge "PLOP" – kurz, tief, mit schnellem Pitch-Drop
export function playPlop() {
  const ctx = ensureCtx(); if (!ctx) return;
  const t0 = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(380, t0);
  o.frequency.exponentialRampToValueAtTime(110, t0 + 0.18);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
  o.connect(g); g.connect(ctx.destination);
  o.start(t0); o.stop(t0 + 0.25);
}

// Sanftes Glocken-Ping fuer Benachrichtigungen (Pinnwand, Like, Geschenk, Mention)
export function playPing() {
  const ctx = ensureCtx(); if (!ctx) return;
  const t0 = ctx.currentTime;
  tone(ctx, t0, 880, 0, 0.18, 0.2);
  tone(ctx, t0, 1320, 0.05, 0.22, 0.15);
}

// Eingehende 1:1-Nachricht – respektiert das User-Sound-Pack
export function playIncomingSound(pack) {
  switch (pack) {
    case "msn": return playMsnDing();
    case "aim": return playAimDoor();
    case "silent": return;
    case "icq":
    default: return playUhOh();
  }
}

// Eingehende Gruppen-Nachricht – immer MSN-Ding (Wunsch des Nutzers),
// außer Sound-Pack ist auf "silent" gestellt.
export function playGroupSound(pack) {
  if (pack === "silent") return;
  return playMsnDing();
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
