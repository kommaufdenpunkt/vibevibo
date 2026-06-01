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
      background: `${color}18`,
      border: `2px solid ${color}55`,
      borderRadius: 12,
      marginBottom: 12,
      overflow: "hidden",
    }}>
      <button type="button" onClick={toggle}
        style={{
          width: "100%", padding: "10px 14px",
          background: "transparent", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          fontFamily: "inherit", color: "var(--vv-text,#1c1c1e)",
          fontSize: 13, fontWeight: 700, textAlign: "left",
        }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>{emoji}</span>
          {title}
        </span>
        <span style={{ fontSize: 12, opacity: 0.65 }}>
          {open ? "▲ verstanden" : "▼ erklären"}
        </span>
      </button>
      {open && (
        <div style={{
          padding: "0 14px 12px", fontSize: 12.5, lineHeight: 1.5,
          color: "var(--vv-text,#1c1c1e)",
        }}>
          {children}
        </div>
      )}
    </div>
  );
}
