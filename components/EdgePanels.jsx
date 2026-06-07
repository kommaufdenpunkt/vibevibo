"use client";

// 📱 Samsung-Galaxy-S8-Style Edge-Panels: schmale Griffe links & rechts am
// Bildschirmrand. Antippen → Panel fährt rein mit Schnell-Shortcuts.
// Ersetzt die alte Navbar — darum hier auch Logout.

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMe } from "@/lib/useMe";

const LEFT = [
  { href: "/",          emoji: "🏠", label: "Start" },
  { href: "/profile",   emoji: "👤", label: "Profil" },
  { href: "/messenger", emoji: "✉️", label: "Messages" },
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
  { href: "/profile/transactions", emoji: "💰", label: "Vibes" },
  { href: "/profile/skin",         emoji: "🎨", label: "Skin" },
  { href: "/profile/edit",         emoji: "⚙️", label: "Profil bearb." },
];

export default function EdgePanels() {
  const [open, setOpen] = useState(null); // null | "left" | "right"
  const pathname = usePathname();
  const router = useRouter();
  const { me, logout } = useMe();

  useEffect(() => { setOpen(null); }, [pathname]);

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
            <Link key={it.href} href={it.href} className="vv-edge-item" onClick={() => setOpen(null)}>
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
