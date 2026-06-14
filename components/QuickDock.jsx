"use client";

// 🚀 QuickDock — schwebende Mini-Tab-Bar unten.
// Vier Sprungbretter immer sichtbar: Heute · Buschfunk · VIBO · Apps.
// User kann's via Toggle ausblenden (vv_quickdock_off in localStorage).

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const DOCK_ITEMS = [
  { href: "/heute",     icon: "🏠", label: "Startseite" },
  { href: "/buschfunk", icon: "📣", label: "Buschfunk" },
  { href: "/vibo",      icon: "🥚", label: "VIBO" },
  { href: "/coms",      icon: "🏘️", label: "Coms" },
];

const HIDE_KEY = "vv_quickdock_off";

// Auf diesen Routen NICHT anzeigen (Login, Vollbild-Karte etc.)
const HIDE_ON = ["/login", "/karte", "/live"];

export default function QuickDock() {
  const path = usePathname();
  const [hidden, setHidden] = useState(true); // erst nach Mount aktivieren (SSR-safe)

  useEffect(() => {
    try {
      const off = localStorage.getItem(HIDE_KEY) === "1";
      setHidden(off);
    } catch { /* ignore */ }
  }, []);

  // Auf Login + Karte ausblenden
  if (HIDE_ON.some((p) => path === p || path?.startsWith(p + "/"))) return null;
  if (hidden) return <ToggleButton onClick={() => {
    try { localStorage.removeItem(HIDE_KEY); } catch {}
    setHidden(false);
  }} />;

  return (
    <>
      <nav style={{
        position: "fixed", bottom: 8, left: 0, right: 0,
        zIndex: 90, pointerEvents: "none",
        display: "flex", justifyContent: "center",
      }}>
        <div style={{
          pointerEvents: "auto",
          display: "flex", gap: 4,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          padding: "6px 6px",
          borderRadius: 999,
          boxShadow: "0 4px 20px rgba(0,0,0,0.15), 0 1px 4px rgba(0,0,0,0.1)",
          border: "1px solid rgba(0,0,0,0.06)",
        }}>
          {DOCK_ITEMS.map((it) => {
            const active = path === it.href;
            return (
              <Link key={it.href} href={it.href} title={it.label}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: 2, padding: "6px 10px",
                  borderRadius: 999, textDecoration: "none",
                  background: active ? "linear-gradient(135deg, #ec4899, #8b5cf6)" : "transparent",
                  color: active ? "#fff" : "#475569",
                  minWidth: 50,
                  transition: "all 0.15s",
                }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>{it.icon}</span>
                <span style={{ fontSize: 9, fontWeight: 700, lineHeight: 1 }}>{it.label}</span>
              </Link>
            );
          })}
          {/* Ausblenden-Button */}
          <button type="button"
            onClick={() => {
              try { localStorage.setItem(HIDE_KEY, "1"); } catch {}
              setHidden(true);
            }}
            title="QuickDock ausblenden"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 28, padding: 0, marginLeft: 2,
              borderRadius: 999, border: "none",
              background: "transparent", color: "#94a3b8",
              fontSize: 12, cursor: "pointer",
            }}>×</button>
        </div>
      </nav>
    </>
  );
}

function ToggleButton({ onClick }) {
  return (
    <button type="button" onClick={onClick}
      title="QuickDock einblenden"
      style={{
        position: "fixed", bottom: 10, right: 10, zIndex: 90,
        width: 36, height: 36, borderRadius: 999,
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: "1px solid rgba(0,0,0,0.08)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        fontSize: 18, cursor: "pointer", padding: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>📲</button>
  );
}
