"use client";

// Klappbares Erklär-Panel. Zeigt einen Frage-Button, der bei Klick einen
// erklärenden Block aufklappt. Persistiert "gelesen" in localStorage, sodass
// es nach einmaligem Schließen klein bleibt.

import { useEffect, useState } from "react";

export default function HelpCard({
  id,                        // eindeutige Kennung für localStorage
  title,                     // "Wie funktioniert das VIBO?"
  emoji = "💡",
  children,                  // erklärender Inhalt
  defaultOpen = true,        // beim ersten Mal offen
  color = "#fbbf24",
}) {
  const lsKey = `vv-help-${id}-closed`;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const closed = window.localStorage.getItem(lsKey) === "1";
    setOpen(defaultOpen && !closed);
  }, [lsKey, defaultOpen]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (typeof window !== "undefined") {
      if (next) window.localStorage.removeItem(lsKey);
      else window.localStorage.setItem(lsKey, "1");
    }
  }

  return (
    <div style={{
      background: `${color}14`,
      border: `2px solid ${color}55`,
      borderRadius: 12,
      marginBottom: 12,
      overflow: "hidden",
    }}>
      {/* Titelbalken im Menü-/Header-Look: pink → violett Verlauf, weiße Schrift */}
      <button type="button" onClick={toggle}
        style={{
          width: "100%", padding: "10px 14px",
          background: "linear-gradient(90deg, var(--vv-pink, #ff3e9d), var(--vv-violet, #b300ff))",
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          fontFamily: "inherit", color: "#fff",
          fontSize: 14, fontWeight: 800, textAlign: "left",
          textShadow: "1px 1px 0 rgba(0,0,0,0.45)",
        }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>{emoji}</span>
          {title}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, background: "rgba(255,255,255,0.22)", padding: "3px 9px", borderRadius: 999 }}>
          {open ? "▲ verstanden" : "▼ erklären"}
        </span>
      </button>
      {open && (
        <div style={{
          padding: "12px 14px", fontSize: 13, lineHeight: 1.55,
          color: "var(--vv-text,#1c1c1e)",
        }}>
          {children}
        </div>
      )}
    </div>
  );
}
