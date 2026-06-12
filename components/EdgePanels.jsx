"use client";

// 📱 S8-Edge-Style Slide-out-Panels.
// LINKS: Navigation (Hauptmenue, gefuellt)
// RECHTS: PWA-Install + Schnellzugriff

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMe } from "@/lib/useMe";

const NAV_GROUPS = [
  {
    title: "👤 Persönlich",
    items: [
      { href: "/profile", label: "Mein Profil", icon: "🏠" },
      { href: "/profile/edit", label: "Profil bearbeiten", icon: "✏️" },
      { href: "/profile/skin", label: "Skin / Theme", icon: "🎨" },
      { href: "/messenger", label: "Messenger", icon: "💬" },
      { href: "/freunde", label: "Freunde", icon: "👯" },
    ],
  },
  {
    title: "🌍 Community",
    items: [
      { href: "/karte", label: "Realitätskarte", icon: "🗺️" },
      { href: "/buschfunk", label: "Buschfunk", icon: "📣" },
      { href: "/gruppen", label: "Gruppen", icon: "🏘️" },
      { href: "/live", label: "Live", icon: "📺" },
      { href: "/schulen", label: "Schulen", icon: "🎓" },
    ],
  },
  {
    title: "ℹ️ Info",
    items: [
      { href: "/datenschutz", label: "Datenschutz", icon: "🛡️" },
      { href: "/impressum", label: "Impressum", icon: "📄" },
      { href: "/installieren", label: "App installieren", icon: "📲" },
    ],
  },
];

export default function EdgePanels() {
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [installable, setInstallable] = useState(false);
  const [installed, setInstalled] = useState(false);
  const pathname = usePathname();
  const { me } = useMe();

  // Bei Routen-Wechsel Panels schliessen
  useEffect(() => {
    setLeftOpen(false);
    setRightOpen(false);
  }, [pathname]);

  // PWA-Install-Detect
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(display-mode: standalone)").matches) setInstalled(true);
    if (window.navigator?.standalone) setInstalled(true);
    const onPrompt = (e) => { e.preventDefault(); setInstallable(true); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  // ESC-Key schliesst Panels
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") { setLeftOpen(false); setRightOpen(false); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!me) return null;

  return (
    <>
      {/* Edge-Tabs (immer sichtbar am Rand) */}
      <button
        className="vv-edge-tab vv-edge-tab-left"
        onClick={() => setLeftOpen(true)}
        aria-label="Menue öffnen"
      ><span className="vv-edge-tab-icon">☰</span></button>

      <button
        className="vv-edge-tab vv-edge-tab-right"
        onClick={() => setRightOpen(true)}
        aria-label="Schnellzugriff öffnen"
      ><span className="vv-edge-tab-icon">⚡</span></button>

      {/* Overlay */}
      {(leftOpen || rightOpen) && (
        <div className="vv-edge-overlay" onClick={() => { setLeftOpen(false); setRightOpen(false); }} />
      )}

      {/* LINKES Panel — Navigation */}
      <aside className={`vv-edge-panel vv-edge-panel-left${leftOpen ? " open" : ""}`}>
        <div className="vv-edge-head">
          <div>
            <div className="vv-edge-title">★ VibeVibo</div>
            {me && <div className="vv-edge-sub">@{me.username}</div>}
          </div>
          <button onClick={() => setLeftOpen(false)} className="vv-edge-close" aria-label="Schliessen">×</button>
        </div>
        <nav className="vv-edge-nav">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="vv-edge-nav-group">
              <div className="vv-edge-nav-grouptitle">{group.title}</div>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`vv-edge-nav-item${pathname === item.href ? " active" : ""}`}
                >
                  <span className="vv-edge-nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* RECHTES Panel — Schnellzugriff + Install */}
      <aside className={`vv-edge-panel vv-edge-panel-right${rightOpen ? " open" : ""}`}>
        <div className="vv-edge-head">
          <div>
            <div className="vv-edge-title">⚡ Schnell</div>
            <div className="vv-edge-sub">Tipps & Apps</div>
          </div>
          <button onClick={() => setRightOpen(false)} className="vv-edge-close" aria-label="Schliessen">×</button>
        </div>

        <div className="vv-edge-pwa">
          <div className="vv-edge-pwa-icon">📲</div>
          <div className="vv-edge-pwa-title">App installieren</div>
          {installed ? (
            <div className="vv-edge-pwa-state ok">✅ Du nutzt bereits die App</div>
          ) : installable ? (
            <>
              <div className="vv-edge-pwa-desc">
                Dein Browser kann VibeVibo direkt zum Homescreen hinzufügen
              </div>
              <Link href="/installieren" className="vv-edge-pwa-btn">📲 Jetzt installieren</Link>
            </>
          ) : (
            <>
              <div className="vv-edge-pwa-desc">
                Hol dir VibeVibo als App auf dein Handy — mit eigenem Icon, Push-Notifications, offline-fähig
              </div>
              <Link href="/installieren" className="vv-edge-pwa-btn">📖 Anleitung ansehen</Link>
            </>
          )}
        </div>

        <div className="vv-edge-quick">
          <div className="vv-edge-nav-grouptitle">🎮 Spielen</div>
          <Link href="/spiele" className="vv-edge-quick-tile" style={{ background: "linear-gradient(135deg, #fbbf24, #f97316)" }}>
            <span className="vv-edge-quick-emoji">🎮</span>
            <span className="vv-edge-quick-label">Spiele-Sammlung</span>
          </Link>
          <Link href="/vibo" className="vv-edge-quick-tile" style={{ background: "linear-gradient(135deg, #ec4899, #db2777)" }}>
            <span className="vv-edge-quick-emoji">🥚</span>
            <span className="vv-edge-quick-label">Mein VIBO</span>
          </Link>
          <Link href="/rang" className="vv-edge-quick-tile" style={{ background: "linear-gradient(135deg, #a855f7, #7c3aed)" }}>
            <span className="vv-edge-quick-emoji">🏆</span>
            <span className="vv-edge-quick-label">Rang & XP</span>
          </Link>
          <Link href="/shop" className="vv-edge-quick-tile" style={{ background: "linear-gradient(135deg, #f43f5e, #be185d)" }}>
            <span className="vv-edge-quick-emoji">🛍️</span>
            <span className="vv-edge-quick-label">Shop</span>
          </Link>
        </div>

        <div className="vv-edge-quick">
          <div className="vv-edge-nav-grouptitle">🚀 Schnell-Aktionen</div>
          <Link href="/messenger" className="vv-edge-quick-tile" style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)" }}>
            <span className="vv-edge-quick-emoji">💬</span>
            <span className="vv-edge-quick-label">Messenger</span>
          </Link>
          <Link href="/buschfunk" className="vv-edge-quick-tile" style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}>
            <span className="vv-edge-quick-emoji">📣</span>
            <span className="vv-edge-quick-label">Buschfunk</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
