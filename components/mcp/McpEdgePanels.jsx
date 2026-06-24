"use client";

// 📱 S8-Edge-Panels für MCP-Mod-Bereich.
// LINKS: Mod-Nav (Bilder, Akte, Tickets, Team, …)
// RECHTS: Quick-Actions (Logout, Profil-Wechsel, Stats)
//
// Eigenes Komponent (kein Wiederverwand von user-side EdgePanels), weil
// Mods andere Nav-Items brauchen + die mcp-app Overlay-z-index alles
// darüber verdecken würde.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const Z_BASE = 2147483648; // 1 über dem mcp-app/admin-body-root Overlay

const NAV_GROUPS_ALL = [
  {
    title: "🛠 Werkzeug",
    headerBg: "linear-gradient(135deg, #0ea5e9, #0369a1)",
    items: [
      { href: "/mcp",         label: "Start",        icon: "🏠", bg: "linear-gradient(135deg, #0ea5e9, #0369a1)" },
      { href: "/mcp/bilder",  label: "Bildertool",   icon: "🖼", bg: "linear-gradient(135deg, #ec4899, #be185d)" },
      { href: "/mcp/akte",    label: "Akte & Audit", icon: "📋", bg: "linear-gradient(135deg, #f59e0b, #d97706)" },
      { href: "/mcp/tickets", label: "Tickets",      icon: "🎫", bg: "linear-gradient(135deg, #10b981, #047857)" },
    ],
  },
  {
    title: "👥 Team",
    headerBg: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
    items: [
      { href: "/mcp/team-chat",    label: "Team-Chat",    icon: "💬", bg: "linear-gradient(135deg, #8b5cf6, #6d28d9)" },
      { href: "/mcp/team",         label: "Team-Übersicht", icon: "👥", bg: "linear-gradient(135deg, #a855f7, #7e22ce)" },
      { href: "/mcp/neuigkeiten",  label: "Neuigkeiten",  icon: "📰", bg: "linear-gradient(135deg, #f97316, #c2410c)" },
      { href: "/mcp/2fa",          label: "2-Faktor",     icon: "🔐", bg: "linear-gradient(135deg, #06b6d4, #0e7490)" },
    ],
  },
];

const NAV_GROUP_LEAD = {
  title: "🚨 Leitung",
  headerBg: "linear-gradient(135deg, #dc2626, #991b1b)",
  items: [
    { href: "/mcp/meldungen",      label: "Meldungen",      icon: "⚡", bg: "linear-gradient(135deg, #ef4444, #b91c1c)" },
    { href: "/mcp/multi-accounts", label: "Multi-Accounts", icon: "🕵", bg: "linear-gradient(135deg, #dc2626, #7f1d1d)" },
    { href: "/mcp/akte-audit",     label: "Akte-Audit",     icon: "📊", bg: "linear-gradient(135deg, #6366f1, #4338ca)" },
  ],
};

export default function McpEdgePanels({ user }) {
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const isLead = user?.role === "admin" || user?.role === "teamleitung";
  const navGroups = isLead ? [...NAV_GROUPS_ALL, NAV_GROUP_LEAD] : NAV_GROUPS_ALL;

  // Auto-Close bei Routen-Wechsel
  useEffect(() => {
    setLeftOpen(false);
    setRightOpen(false);
  }, [pathname]);

  async function handleLogout() {
    try {
      await fetch("/api/mcp/auth", { method: "DELETE", credentials: "include" });
    } catch {}
    router.push("/mcp/login");
    router.refresh();
  }

  return (
    <>
      {/* HANDLES — links + rechts, immer sichtbar */}
      <button
        type="button"
        onClick={() => setLeftOpen(true)}
        aria-label="Mod-Navigation öffnen"
        style={{
          position: "fixed", left: 0, top: "50%", transform: "translateY(-50%)",
          width: 28, height: 90, zIndex: Z_BASE,
          background: "linear-gradient(135deg, #ec4899, #a855f7)",
          color: "#fff", border: "none",
          borderRadius: "0 14px 14px 0",
          fontSize: 18, cursor: "pointer",
          boxShadow: "2px 2px 8px rgba(0,0,0,0.3)",
          fontFamily: "inherit",
          display: leftOpen ? "none" : "flex",
          alignItems: "center", justifyContent: "center",
        }}
      >☰</button>

      <button
        type="button"
        onClick={() => setRightOpen(true)}
        aria-label="Schnellzugriff öffnen"
        style={{
          position: "fixed", right: 0, top: "50%", transform: "translateY(-50%)",
          width: 28, height: 90, zIndex: Z_BASE,
          background: "linear-gradient(135deg, #f59e0b, #ea580c)",
          color: "#fff", border: "none",
          borderRadius: "14px 0 0 14px",
          fontSize: 18, cursor: "pointer",
          boxShadow: "-2px 2px 8px rgba(0,0,0,0.3)",
          fontFamily: "inherit",
          display: rightOpen ? "none" : "flex",
          alignItems: "center", justifyContent: "center",
        }}
      >⚡</button>

      {/* BACKDROP wenn ein Panel offen ist */}
      {(leftOpen || rightOpen) && (
        <div
          onClick={() => { setLeftOpen(false); setRightOpen(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: Z_BASE,
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
          }}
        />
      )}

      {/* LINKES PANEL */}
      <aside
        style={{
          position: "fixed", top: 0, left: 0, bottom: 0,
          width: "min(320px, 88vw)", zIndex: Z_BASE + 1,
          background: "#0a0a14",
          borderRight: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "4px 0 24px rgba(0,0,0,0.5)",
          transform: leftOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          overflowY: "auto",
          padding: "16px 14px 24px",
          color: "#f1f1f5",
        }}
      >
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 16, paddingBottom: 12,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>🛡 MCP-Nav</div>
            <div style={{ fontSize: 11, color: "rgba(241,241,245,0.55)" }}>
              @{user?.username} ·{" "}
              <span style={{
                color: user?.role === "admin" ? "#fbbf24"
                  : user?.role === "teamleitung" ? "#a78bfa"
                  : "#86efac",
                fontWeight: 700,
              }}>
                {user?.role === "admin" ? "ADMIN" : user?.role === "teamleitung" ? "LEAD" : "MOD"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLeftOpen(false)}
            style={{
              background: "none", border: "none",
              color: "rgba(241,241,245,0.6)", fontSize: 24,
              cursor: "pointer", padding: 0, lineHeight: 1,
            }}
          >×</button>
        </div>

        {navGroups.map((group, gi) => (
          <div key={gi} style={{ marginBottom: 16 }}>
            <div style={{
              background: group.headerBg, color: "#fff",
              padding: "5px 11px", borderRadius: 10,
              fontSize: 10, fontWeight: 800, letterSpacing: "0.07em",
              textTransform: "uppercase",
              textShadow: "0 1px 2px rgba(0,0,0,0.25)",
              display: "inline-block", marginBottom: 8,
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
            }}>{group.title}</div>
            {group.items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    background: item.bg, color: "#fff",
                    borderRadius: 12, padding: "10px 14px",
                    marginBottom: 6,
                    fontWeight: 700, textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                    boxShadow: active
                      ? "0 4px 12px rgba(0,0,0,0.25), inset 0 0 0 2px rgba(255,255,255,0.5)"
                      : "0 2px 6px rgba(0,0,0,0.12)",
                    transform: active ? "scale(1.02)" : "none",
                    transition: "transform 0.15s, box-shadow 0.15s",
                    display: "flex", alignItems: "center", gap: 10,
                    textDecoration: "none",
                  }}
                >
                  <span style={{ fontSize: 18 }}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}

        <button
          type="button"
          onClick={handleLogout}
          style={{
            width: "100%",
            background: "linear-gradient(135deg, #64748b, #334155)",
            color: "#fff", borderRadius: 12, padding: "10px 14px",
            fontWeight: 700, fontFamily: "inherit",
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 10,
            marginTop: 12,
          }}
        >
          <span style={{ fontSize: 18 }}>↩</span>
          <span>Logout</span>
        </button>
      </aside>

      {/* RECHTES PANEL — Quick-Actions */}
      <aside
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: "min(300px, 88vw)", zIndex: Z_BASE + 1,
          background: "#0a0a14",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.5)",
          transform: rightOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          overflowY: "auto",
          padding: "16px 14px 24px",
          color: "#f1f1f5",
        }}
      >
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 16, paddingBottom: 12,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>⚡ Schnell</div>
            <div style={{ fontSize: 11, color: "rgba(241,241,245,0.55)" }}>Mod-Aktionen</div>
          </div>
          <button
            type="button"
            onClick={() => setRightOpen(false)}
            style={{
              background: "none", border: "none",
              color: "rgba(241,241,245,0.6)", fontSize: 24,
              cursor: "pointer", padding: 0, lineHeight: 1,
            }}
          >×</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Link href="/" style={tileStyle("linear-gradient(135deg, #ec4899, #be185d)")}>
            <span style={{ fontSize: 22 }}>🏠</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13 }}>Zurück zu VibeVibo</div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>Normale User-Ansicht</div>
            </div>
          </Link>

          {user?.role === "admin" && (
            <a href="https://admin.vibevibo.de/" style={tileStyle("linear-gradient(135deg, #dc2626, #7f1d1d)")}>
              <span style={{ fontSize: 22 }}>🛡️</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13 }}>Admin-Panel</div>
                <div style={{ fontSize: 11, opacity: 0.85 }}>admin.vibevibo.de</div>
              </div>
            </a>
          )}

          <Link href={`/profile/${user?.username || ""}`} style={tileStyle("linear-gradient(135deg, #06b6d4, #0e7490)")}>
            <span style={{ fontSize: 22 }}>🪪</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13 }}>Mein Profil</div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>als @{user?.username}</div>
            </div>
          </Link>

          <Link href="/system-nachrichten" style={tileStyle("linear-gradient(135deg, #f97316, #c2410c)")}>
            <span style={{ fontSize: 22 }}>📬</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13 }}>System-Nachrichten</div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>Vom vibeviboteam</div>
            </div>
          </Link>
        </div>

        <div style={{
          marginTop: 18, padding: "10px 12px",
          background: "rgba(124,58,237,0.08)",
          border: "1px dashed rgba(124,58,237,0.3)",
          borderRadius: 10,
          fontSize: 11, color: "rgba(241,241,245,0.65)",
          lineHeight: 1.5,
        }}>
          💡 Tipp: Wische vom Bildschirmrand ← oder → um die Panels schneller zu öffnen.
        </div>
      </aside>
    </>
  );
}

function tileStyle(bg) {
  return {
    background: bg, color: "#fff",
    borderRadius: 12, padding: "12px 14px",
    fontWeight: 700, textShadow: "0 1px 2px rgba(0,0,0,0.3)",
    boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
    textDecoration: "none",
    display: "flex", alignItems: "center", gap: 12,
  };
}
