"use client";

// 📱 Samsung-Galaxy-S8-Style Edge-Panels: schmale Griffe links & rechts am
// Bildschirmrand. Antippen ODER vom Rand wischen → Panel fährt rein.
// Ersetzt die alte Navbar — darum hier auch Logout.

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMe } from "@/lib/useMe";

const LEFT = [
  { href: "/",          emoji: "🏠", label: "Start" },
  { href: "/profile",   emoji: "👤", label: "Profil" },
  { href: "/freunde",   emoji: "👯", label: "Freunde" },
  { href: "/karte",     emoji: "🗺️", label: "Karte" },
  { href: "/fotos",     emoji: "📸", label: "Fotos" },
  { href: "/gruppen",   emoji: "🏘️", label: "Gruppen" },
  { href: "/schulen",   emoji: "🏫", label: "Schulen" },
];

const RIGHT = [
  { href: "/profile/status",       emoji: "💭", label: "Status" },
  { href: "/vibo",                 emoji: "🥚", label: "VIBO" },
  { href: "/shop",                 emoji: "🛍", label: "Shop" },
  { href: "/geschenke",            emoji: "🎁", label: "Geschenke" },
  { href: "/rang",                 emoji: "🏅", label: "Rang" },
  { href: "/tipspiel",             emoji: "🏆", label: "Tippspiel" },
  { href: "/profile/transactions", emoji: "💰", label: "Vibes" },
  { href: "/profile/transactions", emoji: "📜", label: "Transaktionen" },
  { href: "/profile/skin",         emoji: "🎨", label: "Skin" },
  { href: "/profile/edit",         emoji: "⚙️", label: "Profil bearb." },
];

export default function EdgePanels() {
  const [open, setOpen] = useState(null); // null | "left" | "right"
  const pathname = usePathname();
  const router = useRouter();
  const { me, logout } = useMe();
  const touch = useRef(null);

  useEffect(() => { setOpen(null); }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Swipe-Gesten vom Bildschirmrand (Galaxy-S8-Feeling)
  useEffect(() => {
    if (!me) return;
    const EDGE = 30, DIST = 55;
    const onStart = (e) => {
      const t = e.touches[0];
      touch.current = { x: t.clientX, y: t.clientY, w: window.innerWidth };
    };
    const onEnd = (e) => {
      const s = touch.current; touch.current = null;
      if (!s) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - s.x, dy = t.clientY - s.y;
      if (Math.abs(dx) < DIST || Math.abs(dy) > Math.abs(dx)) return;
      if (open === "left")  { if (dx < 0) setOpen(null); return; }
      if (open === "right") { if (dx > 0) setOpen(null); return; }
      if (dx > 0 && s.x < EDGE) setOpen("left");
      else if (dx < 0 && s.x > s.w - EDGE) setOpen("right");
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [me, open]);

  if (pathname === "/login" || (pathname && pathname.startsWith("/messenger"))) return null;
  if (!me) return null;

  async function handleLogout() {
    setOpen(null);
    try { await logout(); } catch {}
    router.push("/login");
  }

  const renderPanel = (side, items) => (
    <>
      <button
        type="button"
        aria-label={side === "left" ? "Menü öffnen" : "Schnellzugriff öffnen"}
        className={`vv-edge-handle vv-edge-handle-${side}`}
        onClick={() => setOpen(open === side ? null : side)}
      >
        <span className="vv-edge-handle-grip" />
      </button>

      <div className={`vv-edge-panel vv-edge-panel-${side}${open === side ? " open" : ""}`}>
        <div className="vv-edge-panel-head">
          <span>{side === "left" ? "📂 Menü" : "⚡ Schnellzugriff"}</span>
          <button type="button" className="vv-edge-close" onClick={() => setOpen(null)} aria-label="schließen">✕</button>
        </div>
        <div className="vv-edge-grid">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={`vv-edge-item${pathname === it.href ? " active" : ""}`}
              onClick={() => setOpen(null)}
            >
              <span className="vv-edge-item-emoji">{it.emoji}</span>
              <span className="vv-edge-item-label">{it.label}</span>
            </Link>
          ))}
        </div>
        {side === "right" && (
          <button type="button" className="vv-edge-logout" onClick={handleLogout}>
            🚪 Logout
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className="vv-edge-root">
      {open && <div className="vv-edge-backdrop" onClick={() => setOpen(null)} />}
      {renderPanel("left", LEFT)}
      {renderPanel("right", RIGHT)}
    </div>
  );
}
