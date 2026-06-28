"use client";

// 📱 S8-Edge-Style Slide-out-Panels.
// LINKS: Navigation (Hauptmenue, gefuellt)
// RECHTS: PWA-Install + Schnellzugriff

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMe } from "@/lib/useMe";
import { api } from "@/lib/api";
import NotificationsBell from "@/components/NotificationsBell";
import DraggableBell from "@/components/DraggableBell";
import ChangelogPanel from "@/components/ChangelogPanel";

// 🎯 Aufgeräumte Navigation (Phase 1): nur 8 Haupt-Punkte sichtbar.
// Alles andere ist weiter erreichbar via /apps (Launcher) oder Direkt-URL.
const NAV_GROUPS = [
  {
    title: "👤 Persönlich",
    headerBg: "linear-gradient(135deg, #ec4899, #a855f7)",
    items: [
      { href: "/",          label: "Startseite",  icon: "🏠", bg: "linear-gradient(135deg, #dc2626, #991b1b)" },
      { href: "/profile",   label: "Mein Profil", icon: "🪪", bg: "linear-gradient(135deg, #ec4899, #be185d)" },
      { href: "/vibo",      label: "Mein VIBO",   icon: "🥚", bg: "linear-gradient(135deg, #a855f7, #6d28d9)" },
      { href: "/messenger", label: "Messenger",   icon: "💬", bg: "linear-gradient(135deg, #f97316, #3b82f6)" },
      { href: "/freunde",   label: "Freunde",     icon: "👯", bg: "linear-gradient(135deg, #f43f5e, #ec4899)" },
    ],
  },
  {
    title: "🌍 Community",
    headerBg: "linear-gradient(135deg, #06b6d4, #3b82f6)",
    items: [
      { href: "/coms",       label: "Coms",       icon: "🌐", bg: "linear-gradient(135deg, #06b6d4, #0891b2)" },
      { href: "/mitglieder", label: "Mitglieder", icon: "👥", bg: "linear-gradient(135deg, #3b82f6, #1d4ed8)" },
      { href: "/tipp", label: "Tippspiel WM", icon: "⚽", bg: "linear-gradient(135deg, #141414, #DD0000)" },
      { href: "/karte",      label: "Karte",      icon: "🗺️", bg: "linear-gradient(135deg, #10b981, #047857)" },
      { href: "/fotos",      label: "Fotos",      icon: "📸", bg: "linear-gradient(135deg, #8b5cf6, #5b21b6)" },
    ],
  },
  {
    title: "🛍️ Mehr",
    headerBg: "linear-gradient(135deg, #f59e0b, #d97706)",
    items: [
      { href: "/shop",            label: "Shop",            icon: "🛍️", bg: "linear-gradient(135deg, #f59e0b, #d97706)" },
      { href: "/vibes-verdienen", label: "Vibes verdienen", icon: "💰", bg: "linear-gradient(135deg, #eab308, #ca8a04)" },
    ],
  },
];

export default function EdgePanels() {
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [installable, setInstallable] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [vibes, setVibes] = useState(null);
  const pathname = usePathname();
  const router = useRouter();
  const { me, logout } = useMe();

  async function handleLogout() {
    setLeftOpen(false);
    try { await logout(); } catch {}
    router.push("/login");
    router.refresh();
  }

  // Vibes-Saldo nachladen, wenn das rechte Panel aufgeht oder me wechselt
  useEffect(() => {
    if (!me) return;
    api.credits().then((d) => setVibes(d.balance)).catch(() => {});
  }, [me, rightOpen]);

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

      {/* Floating Bell — verschiebbar (Drag + Snap to Corner) */}
      <DraggableBell />

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
              <div className="vv-edge-nav-grouptitle" style={{
                background: group.headerBg,
                color: "#fff",
                padding: "6px 12px",
                borderRadius: 999,
                fontWeight: 800,
                fontSize: 11,
                letterSpacing: 0.5,
                textTransform: "uppercase",
                textShadow: "0 1px 2px rgba(0,0,0,0.25)",
                display: "inline-block",
                marginBottom: 8,
                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              }}>{group.title}</div>
              {group.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`vv-edge-nav-item${active ? " active" : ""}`}
                    style={{
                      background: item.bg,
                      color: "#fff",
                      borderRadius: 12,
                      padding: "10px 14px",
                      marginBottom: 6,
                      fontWeight: 700,
                      textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                      boxShadow: active
                        ? "0 4px 12px rgba(0,0,0,0.25), inset 0 0 0 2px rgba(255,255,255,0.5)"
                        : "0 2px 6px rgba(0,0,0,0.12)",
                      transform: active ? "scale(1.02)" : "none",
                      transition: "transform 0.15s, box-shadow 0.15s",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      textDecoration: "none",
                    }}
                  >
                    <span className="vv-edge-nav-icon" style={{ fontSize: 18 }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
          <div className="vv-edge-nav-group">
            <button type="button" onClick={handleLogout} className="vv-edge-nav-item vv-edge-nav-logout" style={{
              background: "linear-gradient(135deg, #64748b, #334155)",
              color: "#fff",
              borderRadius: 12,
              padding: "10px 14px",
              fontWeight: 700,
              textShadow: "0 1px 2px rgba(0,0,0,0.3)",
              boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}>
              <span className="vv-edge-nav-icon" style={{ fontSize: 18 }}>↩</span>
              <span>Logout</span>
            </button>
          </div>
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

        {/* Status-Karte: Vibes + Status (Bell ist ausserhalb als Floating-Button) */}
        <div className="vv-edge-statuscard">
          <Link href="/profile/transactions" className="vv-edge-vibes" title="Vibes-Transaktionen">
            <span style={{ fontSize: 18 }}>✨</span>
            <span style={{ fontWeight: 800 }}>{vibes != null ? vibes : "—"}</span>
          </Link>
          <Link href="/profile/status" className="vv-edge-status" title="Status setzen">
            <span style={{ fontSize: 14 }}>💭</span>
            <span style={{
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              flex: 1, fontSize: 12, fontWeight: 700,
            }}>{me?.mood || "Status setzen"}</span>
            <span style={{ opacity: 0.6, fontSize: 11 }}>›</span>
          </Link>
        </div>

        <ChangelogPanel />

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

        {/* Aufgeräumte Schnell-Aktionen — keine Duplikate mit linkem Nav-Menü */}
        <div className="vv-edge-quick">
          <div className="vv-edge-nav-grouptitle">🚀 Schnell-Aktionen</div>
          <Link href="/crushes" className="vv-edge-quick-tile" style={{ background: "linear-gradient(135deg, #f43f5e, #e11d48)" }}>
            <span className="vv-edge-quick-emoji">💕</span>
            <span className="vv-edge-quick-label">Geheimer Schwarm</span>
          </Link>
          <Link href="/erinnerungen" className="vv-edge-quick-tile" style={{ background: "linear-gradient(135deg, #f97316, #8a4a23)" }}>
            <span className="vv-edge-quick-emoji">📅</span>
            <span className="vv-edge-quick-label">Heute vor X Jahren</span>
          </Link>
          <Link href="/live" className="vv-edge-quick-tile" style={{
            background: "linear-gradient(135deg, #dc2626, #991b1b, #dc2626)",
            backgroundSize: "200% 100%",
            animation: "vv-live-pulse 3s ease-in-out infinite",
            position: "relative",
          }}>
            <span className="vv-edge-quick-emoji">🔴</span>
            <span className="vv-edge-quick-label">LIVE</span>
            <style>{`
              @keyframes vv-live-pulse {
                0%, 100% { background-position: 0% 50%; }
                50%      { background-position: 100% 50%; }
              }
            `}</style>
          </Link>
          <Link href="/blockierte" className="vv-edge-quick-tile" style={{
            background: "linear-gradient(135deg, #475569, #1e293b)",
          }}>
            <span className="vv-edge-quick-emoji">🚫</span>
            <span className="vv-edge-quick-label">Blockliste</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
