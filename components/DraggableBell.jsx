"use client";

// 🔔 Draggable-Bell — wrapped die NotificationsBell + macht sie verschiebbar.
// Doppelklick → zurück nach oben rechts. Position wird in localStorage gespeichert.
// Snap-to-Corner: bei Loslassen springt sie an die nächste Ecke.

import { useEffect, useRef, useState } from "react";
import NotificationsBell from "./NotificationsBell";

const STORAGE_KEY = "vv_bell_corner";
const VALID_CORNERS = ["tr", "tl", "br", "bl"];
const SAFE_MARGIN = 12;

export default function DraggableBell() {
  // Alle Hooks GANZ OBEN (kein Early-Return zwischendurch — siehe CLAUDE.md)
  const [corner, setCorner] = useState("tr");
  const [dragPos, setDragPos] = useState(null);
  const [mounted, setMounted] = useState(false);
  const startRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && VALID_CORNERS.includes(saved)) setCorner(saved);
    } catch {}
  }, []);

  function onPointerDown(e) {
    // Nur primary button (links / touch)
    if (e.button && e.button !== 0) return;
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    startRef.current = {
      pointerStart: { x: e.clientX, y: e.clientY },
      elStart: { x: rect.left, y: rect.top },
      moved: false,
      pointerId: e.pointerId,
    };
    try { wrapRef.current?.setPointerCapture?.(e.pointerId); } catch {}
  }

  function onPointerMove(e) {
    if (!startRef.current) return;
    const dx = e.clientX - startRef.current.pointerStart.x;
    const dy = e.clientY - startRef.current.pointerStart.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) {
      startRef.current.moved = true;
      e.preventDefault();
      setDragPos({
        x: startRef.current.elStart.x + dx,
        y: startRef.current.elStart.y + dy,
      });
    }
  }

  function onPointerUp(e) {
    if (!startRef.current) return;
    const moved = startRef.current.moved;
    const finalPos = dragPos;
    try { wrapRef.current?.releasePointerCapture?.(startRef.current.pointerId); } catch {}
    startRef.current = null;

    if (!moved) {
      // Nicht gedraggt → Bell-Klick durchlassen (Dropdown-Open)
      setDragPos(null);
      return;
    }

    // Snap zur nächsten Ecke basierend auf finalPos + Bell-Größe (~46px)
    if (finalPos && typeof window !== "undefined") {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const cx = finalPos.x + 23;
      const cy = finalPos.y + 23;
      const isLeft = cx < vw / 2;
      const isTop = cy < vh / 2;
      const newCorner = (isTop ? "t" : "b") + (isLeft ? "l" : "r");
      setCorner(newCorner);
      try { localStorage.setItem(STORAGE_KEY, newCorner); } catch {}
    }
    setDragPos(null);
    e.preventDefault();
  }

  function resetCorner() {
    setCorner("tr");
    try { localStorage.setItem(STORAGE_KEY, "tr"); } catch {}
  }

  // Auf Server / vor Hydration: nichts rendern (verhindert Drift)
  if (!mounted) return null;

  const isDragging = !!dragPos;
  const style = isDragging ? {
    position: "fixed",
    top: dragPos.y, left: dragPos.x,
    right: "auto", bottom: "auto",
    zIndex: 190,
    cursor: "grabbing",
    touchAction: "none",
    transition: "none",
    userSelect: "none",
  } : {
    position: "fixed",
    top:    corner.startsWith("t") ? `calc(${SAFE_MARGIN}px + env(safe-area-inset-top, 0px))` : "auto",
    bottom: corner.startsWith("b") ? `calc(${SAFE_MARGIN}px + env(safe-area-inset-bottom, 0px))` : "auto",
    left:   corner.endsWith("l") ? `calc(${SAFE_MARGIN}px + env(safe-area-inset-left, 0px))` : "auto",
    right:  corner.endsWith("r") ? `calc(${SAFE_MARGIN}px + env(safe-area-inset-right, 0px))` : "auto",
    zIndex: 190,
    cursor: "grab",
    touchAction: "none",
    transition: "top 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), left 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), right 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), bottom 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)",
    userSelect: "none",
  };

  return (
    <div
      ref={wrapRef}
      className="vv-edge-bell-float"
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={resetCorner}
      title="Halten + ziehen zum Verschieben · Doppelklick = oben rechts"
    >
      <NotificationsBell />
    </div>
  );
}
