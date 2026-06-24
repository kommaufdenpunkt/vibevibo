"use client";

// 📱 S8-Edge-Panels für admin.vibevibo.de.
// LINKS: Admin-Nav (Dashboard, Broadcast, Sicherheit, …)
// RECHTS: Quick-Actions (Logout, Wechsel zu MCP/User-View)
//
// z-index liegt 1 über dem admin-body-root Overlay (2147483647).

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const Z_BASE = 2147483648;

const NAV_GROUPS = [
  {
    title: "🛡 Admin",
    headerBg: "linear-gradient(135deg, #dc2626, #7f1d1d)",
    items: [
      { href: "/",           label: "Dashboard",         icon: "🏠", bg: "linear-gradient(135deg, #dc2626, #991b1b)" },
      { href: "/broadcast",  label: "Broadcast-Editor",  icon: "📢", bg: "linear-gradient(135deg, #fb923c, #c2410c)" },
      { href: "/sicherheit", label: "Sicherheits-Analyse", icon: "🛡", bg: "linear-gradient(135deg, #7c3aed, #4c1d95)" },
    ],
  },
];

export default function AdminEdgePanels({ user }) {
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setLeftOpen(false);
    setRightOpen(false);
  }, [pathname]);

  async function handleLogout() {
    try {
      await fetch("/api/adminpanel/auth", { method: "DELETE", credentials: "include" });
    } catch {}
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* HANDLES */}
      <button
        type="button"
        onClick={() => setLeftOpen(true)}
        aria-label="Admin-Navigation öffnen"
        style={{
          position: "fixed", left: 0, top: "50%", transform: "translateY(-50%)",
          width: 28, height: 90, zIndex: Z_BASE,
          background: "linear-gradient(135deg, #dc2626, #7f1d1d)",
          color: "#fff", border: "none",
          borderRadius: "0 14px 14px 0",
          fontSize: 18, cursor: "pointer",
          boxShadow: "2px 2px 8px rgba(0,0,0,0.4)",
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
          background: "linear-gradient(135deg, #f59e0b, #d97706)",
          color: "#fff", border: "none",
          borderRadius: "14px 0 0 14px",
          fontSize: 18, cursor: "pointer",
          boxShadow: "-2px 2px 8px rgba(0,0,0,0.4)",
          fontFamily: "inherit",
          display: rightOpen ? "none" : "flex",
          alignItems: "center", justifyContent: "center",
        }}
      >⚡</button>

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
            <div style={{ fontSize: 16, fontWeight: 800 }}>🛡️ ADMIN</div>
            <div style={{ fontSize: 11, color: "rgba(241,241,245,0.55)" }}>
              @{user?.username} ·{" "}
              <span style={{
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                padding: "1px 6px", borderRadius: 4, color: "#fff",
                fontSize: 10, fontWeight: 800, letterSpacing: "0.05em",
              }}>ADMIN</span>
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

        {NAV_GROUPS.map((group, gi) => (
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
              const active = pathname === item.href
                || (item.href !== "/" && pathname.startsWith(item.href));
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

      {/* RECHTES PANEL — Wechsel zu anderen Bereichen */}
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
            <div style={{ fontSize: 11, color: "rgba(241,241,245,0.55)" }}>Bereiche wechseln</div>
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
          <a href="https://vibevibo.de/" style={tileStyle("linear-gradient(135deg, #ec4899, #be185d)")}>
            <span style={{ fontSize: 22 }}>🏠</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13 }}>VibeVibo (User)</div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>Hauptseite</div>
            </div>
          </a>

          <a href="https://mcp.vibevibo.de/mcp" style={tileStyle("linear-gradient(135deg, #8b5cf6, #6d28d9)")}>
            <span style={{ fontSize: 22 }}>🔧</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13 }}>MCP (Mod-Panel)</div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>mcp.vibevibo.de</div>
            </div>
          </a>

          <Link href="/sicherheit" style={tileStyle("linear-gradient(135deg, #7c3aed, #4c1d95)")}>
            <span style={{ fontSize: 22 }}>🛡</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13 }}>Sicherheits-Analyse</div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>Live-Login-Stats</div>
            </div>
          </Link>
        </div>

        <div style={{
          marginTop: 18, padding: "10px 12px",
          background: "rgba(220,38,38,0.08)",
          border: "1px dashed rgba(220,38,38,0.3)",
          borderRadius: 10,
          fontSize: 11, color: "rgba(241,241,245,0.65)",
          lineHeight: 1.5,
        }}>
          🔐 Jeder Bereich hat ein eigenes Cookie. MCP- und Admin-Login sind getrennt — Wechsel ggf. erneut einloggen.
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
