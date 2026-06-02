"use client";

// NSFW-Guard für Live-Hosts: Lädt nsfwjs + TensorFlow.js per CDN und prüft
// alle 3 Sekunden ein Frame des eigenen Streams.
// Klassen: Drawing | Neutral | Sexy | Porn | Hentai.
// Action-Schwellen:
//   any "Porn" + "Hentai" > HARD_THRESHOLD → sofort BLACKOUT + Auto-Report
//   "Sexy" > 0.85 nur Warnung im UI
// Läuft komplett im Browser, kein Server-Traffic.

import { useEffect, useRef, useState } from "react";

const TFJS_URL  = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/dist/tf.min.js";
const NSFWJS_URL = "https://cdn.jsdelivr.net/npm/nsfwjs@4.2.1/dist/nsfwjs.min.js";

const HARD_THRESHOLD = 0.7;
const SOFT_THRESHOLD = 0.85;
const CHECK_INTERVAL_MS = 3000;
const CONSECUTIVE_HITS_TO_TRIGGER = 2;

function loadScript(url) {
  return new Promise((res, rej) => {
    if (typeof document === "undefined") return rej(new Error("ssr"));
    const existing = document.querySelector(`script[src="${url}"]`);
    if (existing) { existing.addEventListener("load", () => res(true)); if (existing.dataset.loaded) return res(true); return; }
    const s = document.createElement("script");
    s.src = url; s.async = true;
    s.onload = () => { s.dataset.loaded = "1"; res(true); };
    s.onerror = () => rej(new Error("load failed: " + url));
    document.head.appendChild(s);
  });
}

export function useNsfwGuard({ stream, enabled, onHardHit, onSoftHit, onModelReady }) {
  const modelRef = useRef(null);
  const videoRef = useRef(null);
  const consecRef = useRef(0);
  const [state, setState] = useState({ ready: false, lastScores: null, error: "" });

  useEffect(() => {
    if (!enabled || !stream) return;
    let alive = true;
    (async () => {
      try {
        await loadScript(TFJS_URL);
        await loadScript(NSFWJS_URL);
        if (!alive) return;
        // nsfwjs ist als window.nsfwjs verfügbar
        const ns = window.nsfwjs;
        if (!ns) throw new Error("nsfwjs nicht verfügbar");
        const model = await ns.load();
        if (!alive) return;
        modelRef.current = model;
        // Hidden Video-Element für Frames
        const v = document.createElement("video");
        v.srcObject = stream; v.muted = true; v.playsInline = true; v.autoplay = true;
        v.style.position = "fixed"; v.style.left = "-9999px"; v.width = 224; v.height = 224;
        document.body.appendChild(v);
        videoRef.current = v;
        await new Promise((r) => { v.onloadedmetadata = () => r(); });
        await v.play().catch(() => {});
        setState({ ready: true, lastScores: null, error: "" });
        onModelReady?.();
      } catch (e) {
        setState({ ready: false, lastScores: null, error: e.message || "NSFW-Guard nicht ladbar" });
      }
    })();
    return () => {
      alive = false;
      if (videoRef.current) { try { videoRef.current.remove(); } catch {} videoRef.current = null; }
    };
  }, [enabled, stream, onModelReady]);

  useEffect(() => {
    if (!state.ready || !modelRef.current || !videoRef.current) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      try {
        const preds = await modelRef.current.classify(videoRef.current);
        const map = {};
        for (const p of preds) map[p.className] = p.probability;
        const hard = (map.Porn || 0) + (map.Hentai || 0);
        const soft = map.Sexy || 0;
        setState((s) => ({ ...s, lastScores: { ...map, hard, soft } }));
        if (hard > HARD_THRESHOLD) {
          consecRef.current += 1;
          if (consecRef.current >= CONSECUTIVE_HITS_TO_TRIGGER) {
            consecRef.current = 0;
            onHardHit?.({ map, hard });
          }
        } else {
          consecRef.current = 0;
          if (soft > SOFT_THRESHOLD) onSoftHit?.({ map, soft });
        }
      } catch (e) { /* swallow */ }
    };
    const t = setInterval(tick, CHECK_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(t); };
  }, [state.ready, onHardHit, onSoftHit]);

  return state;
}
