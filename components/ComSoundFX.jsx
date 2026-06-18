"use client";

// 🔊 Sound-FX beim ersten Öffnen einer Com (pro Browser-Session einmal).
// WebAudio API — keine Audio-Files nötig, alles programmatisch generiert.

import { useEffect } from "react";

function playPling(ctx) {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, t);
  osc.frequency.exponentialRampToValueAtTime(1320, t + 0.08);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t); osc.stop(t + 0.6);
}

function playChime(ctx) {
  // Dreiklang: C5, E5, G5
  const t = ctx.currentTime;
  [523.25, 659.25, 783.99].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.2, t + i * 0.08 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.08 + 0.6);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t + i * 0.08); osc.stop(t + i * 0.08 + 0.7);
  });
}

function playDoorbell(ctx) {
  // Klassisch "Ding-Dong": E5 dann C5
  const t = ctx.currentTime;
  [[659.25, 0], [523.25, 0.35]].forEach(([freq, delay]) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t + delay);
    gain.gain.exponentialRampToValueAtTime(0.3, t + delay + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.9);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t + delay); osc.stop(t + delay + 1);
  });
}

function playDrum(ctx) {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.18);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.45, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t); osc.stop(t + 0.4);
}

function playMagic(ctx) {
  // Aufsteigendes Glitzer: 4 schnelle Oktaven
  const t = ctx.currentTime;
  [523, 659, 784, 1047, 1319].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t + i * 0.05);
    gain.gain.exponentialRampToValueAtTime(0.18, t + i * 0.05 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.05 + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t + i * 0.05); osc.stop(t + i * 0.05 + 0.2);
  });
}

const PLAYERS = {
  pling: playPling,
  chime: playChime,
  doorbell: playDoorbell,
  drum: playDrum,
  magic: playMagic,
};

export default function ComSoundFX({ sound = "pling", slug }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!slug || !sound) return;
    // Pro Session + pro Com nur einmal
    const key = `vv:soundfx:${slug}`;
    try { if (sessionStorage.getItem(key)) return; } catch {}

    // Browser-Autoplay-Policy: erst nach erster User-Geste abspielen
    const player = PLAYERS[sound] || PLAYERS.pling;
    const fire = () => {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        // Wenn User-Geste schon stattgefunden hat: direkt spielen, sonst auf erste Geste warten
        const doPlay = () => {
          try {
            if (ctx.state === "suspended") ctx.resume();
            player(ctx);
            try { sessionStorage.setItem(key, "1"); } catch {}
            setTimeout(() => { try { ctx.close(); } catch {} }, 1500);
          } catch {}
        };
        if (ctx.state === "running") {
          doPlay();
        } else {
          const onGesture = () => {
            window.removeEventListener("pointerdown", onGesture);
            window.removeEventListener("keydown", onGesture);
            doPlay();
          };
          window.addEventListener("pointerdown", onGesture, { once: true });
          window.addEventListener("keydown", onGesture, { once: true });
        }
      } catch {}
    };
    fire();
  }, [sound, slug]);

  return null;
}
