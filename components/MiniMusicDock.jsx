"use client";

// 📌 Mini-Player-Dock — floating bottom-right.
// Liest seinen State aus localStorage "vv_mini_music_dock":
//   { ids: ["yt-id", ...], idx: 0, title: "...", owner: "username", pinnedAt }
// Spielt Songs als versteckter YouTube-Iframe, ueberlebt Page-Navigation
// (weil der Dock in app/layout.jsx gemountet ist).

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

const STORAGE_KEY = "vv_mini_music_dock";

function loadState() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s?.ids || !Array.isArray(s.ids) || s.ids.length === 0) return null;
    return { ids: s.ids, idx: s.idx || 0, title: s.title || "Musik", owner: s.owner || "", muted: !!s.muted, collapsed: !!s.collapsed };
  } catch { return null; }
}
function saveState(s) {
  if (typeof window === "undefined") return;
  try {
    if (!s) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

export default function MiniMusicDock() {
  const [state, setState] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const iframeRef = useRef(null);

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  // Auf Pin-Events lauschen (von MusicPlayer ausgeloest)
  useEffect(() => {
    function onUpdate() { setState(loadState()); }
    function onStorage(e) { if (e.key === STORAGE_KEY) setState(loadState()); }
    window.addEventListener("vv-mini-music-update", onUpdate);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("vv-mini-music-update", onUpdate);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // YouTube-Iframe-API Song-Ende-Detection
  useEffect(() => {
    if (!state?.ids?.length) return;
    function onMsg(ev) {
      if (typeof ev.data !== "string") return;
      try {
        const m = JSON.parse(ev.data);
        if (m.event === "infoDelivery" && m.info?.playerState === 0) {
          // Song ended → next
          next();
        }
      } catch {}
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [state]);

  function update(patch) {
    setState((s) => {
      const next = { ...s, ...patch };
      saveState(next);
      return next;
    });
  }
  function next() {
    setState((s) => {
      if (!s?.ids?.length) return s;
      const ni = (s.idx + 1) % s.ids.length;
      const u = { ...s, idx: ni };
      saveState(u);
      return u;
    });
  }
  function prev() {
    setState((s) => {
      if (!s?.ids?.length) return s;
      const pi = (s.idx - 1 + s.ids.length) % s.ids.length;
      const u = { ...s, idx: pi };
      saveState(u);
      return u;
    });
  }
  function close() {
    saveState(null);
    setState(null);
  }
  function toggleMute() {
    update({ muted: !state.muted });
  }
  function toggleCollapsed() {
    update({ collapsed: !state.collapsed });
  }

  if (!hydrated || !state || !state.ids?.length) return null;

  const current = state.ids[state.idx];
  const multi = state.ids.length > 1;
  const ownerHref = state.owner ? `/u/${state.owner}` : null;

  return (
    <>
      {/* Versteckter YouTube-Iframe (1×1) — laeuft, weil im RootLayout gemountet */}
      <iframe
        ref={iframeRef}
        title="Mini-Player Hintergrundmusik"
        width="1" height="1"
        style={{ position: "fixed", left: -9999, top: -9999, width: 1, height: 1, border: 0, pointerEvents: "none" }}
        src={`https://www.youtube.com/embed/${current}?autoplay=1&enablejsapi=1${state.muted ? "&mute=1" : ""}${multi ? "" : `&loop=1&playlist=${current}`}`}
        allow="autoplay; encrypted-media"
      />

      {/* Floating-Dock */}
      <div className={`vv-mini-dock${state.collapsed ? " collapsed" : ""}`} role="region" aria-label="Mini-Musik-Player">
        <div className="vv-mini-dock-bar" onClick={(e) => {
          if (e.target.closest("button") || e.target.closest("a")) return;
          toggleCollapsed();
        }}>
          <span className="vv-mini-dock-eq" aria-hidden="true">
            <span/><span/><span/>
          </span>
          <div className="vv-mini-dock-info">
            <div className="vv-mini-dock-title">{state.title}</div>
            {ownerHref ? (
              <Link href={ownerHref} className="vv-mini-dock-owner">
                @{state.owner}
                {multi && <span> · {state.idx + 1}/{state.ids.length}</span>}
              </Link>
            ) : multi && (
              <div className="vv-mini-dock-owner">{state.idx + 1} / {state.ids.length}</div>
            )}
          </div>
          {!state.collapsed && (
            <div className="vv-mini-dock-controls" onClick={(e) => e.stopPropagation()}>
              {multi && (
                <button type="button" onClick={prev} title="Zurueck" aria-label="Zurueck">⏮</button>
              )}
              {multi && (
                <button type="button" onClick={next} title="Weiter" aria-label="Weiter">⏭</button>
              )}
              <button type="button" onClick={toggleMute} title={state.muted ? "Ton an" : "Stumm"} aria-label="Stumm">
                {state.muted ? "🔇" : "🔊"}
              </button>
              <button type="button" onClick={close} title="Mini-Player schliessen" aria-label="Schliessen">✕</button>
            </div>
          )}
          <button type="button" className="vv-mini-dock-collapse" onClick={toggleCollapsed}
            title={state.collapsed ? "Aufklappen" : "Einklappen"}>
            {state.collapsed ? "▴" : "▾"}
          </button>
        </div>
      </div>
    </>
  );
}
