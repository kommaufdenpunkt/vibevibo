"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useMe } from "@/lib/useMe";

const LINKS = [
  { href: "/", icon: "🏠", label: "Start" },
  { href: "/profile", icon: "👤", label: "Mein Profil" },
  { href: "/freunde", icon: "👯", label: "Freunde" },
  { href: "/messenger", icon: "✉️", label: "Nachrichten" },
  { href: "/fotos", icon: "📸", label: "Fotos" },
  { href: "/gruppen", icon: "🏘️", label: "Gruppen" },
  { href: "/geschenke", icon: "🎁", label: "Geschenke" },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { me, logout } = useMe();
  const [open, setOpen] = useState(false);

  // Menü schließen bei Seitenwechsel
  useEffect(() => { setOpen(false); }, [pathname]);

  async function handleLogout() {
    setOpen(false);
    await logout();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="vv-nav2">
      <div className="vv-nav2-bar">
        <button
          type="button"
          className={`vv-burger${open ? " vv-burger-open" : ""}`}
          onClick={() => setOpen((o) => !o)}
          aria-label="Menü"
        >
          <span /><span /><span />
        </button>

        <Link href="/" className="vv-nav2-logo" onClick={() => setOpen(false)}>
          Vibe<span className="vv-logo-dot">★</span>Vibo
        </Link>

        <div className="vv-spacer" />

        {me ? (
          <span className="vv-nav2-user">
            <span className="vv-online-dot" />
            {me.emoji} {me.displayName}
          </span>
        ) : (
          <Link href="/login" className="vv-nav2-loginbtn">🔑 Login</Link>
        )}
      </div>

      {/* Aufklappendes Menü - wie damals das Startmenü */}
      <div className={`vv-nav2-panel${open ? " vv-open" : ""}`}>
        <div className="vv-nav2-panel-inner">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`vv-nav2-item${pathname === l.href ? " vv-active" : ""}`}
              onClick={() => setOpen(false)}
            >
              <span className="vv-nav2-icon">{l.icon}</span>
              <span className="vv-nav2-label">{l.label}</span>
            </Link>
          ))}
          {me && (
            <a
              href="#"
              className="vv-nav2-item vv-nav2-logout"
              onClick={(e) => { e.preventDefault(); handleLogout(); }}
            >
              <span className="vv-nav2-icon">↩</span>
              <span className="vv-nav2-label">Logout</span>
            </a>
          )}
        </div>
      </div>

      {/* Klick-Fänger zum Schließen */}
      {open && <div className="vv-nav2-backdrop" onClick={() => setOpen(false)} />}
    </nav>
  );
}
