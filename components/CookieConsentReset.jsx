"use client";

// 🍪 Cookie-Consent zurücksetzen — DSGVO-Pflicht: User muss seine
// Einwilligung jederzeit ändern oder zurückziehen können.
//
// Setzt ads_consent zurück auf 0 → CookieConsentBanner erscheint wieder.
// Wird auf der Privatsphäre-Seite angezeigt.

import { useState } from "react";
import { useMe } from "@/lib/useMe";

const LABELS = {
  1:  { text: "Alle Cookies akzeptiert (personalisierte Werbung)", color: "#ec4899" },
  2:  { text: "Generische Werbung (nicht-personalisiert)",         color: "#a855f7" },
  [-1]: { text: "Nur essenzielle Cookies (keine Werbung)",        color: "#10b981" },
  0:  { text: "Noch nicht entschieden",                           color: "#888" },
};

export default function CookieConsentReset() {
  const { me, refresh } = useMe();
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");

  if (!me) return null;
  const current = me.adsConsent || 0;
  const label = LABELS[current] || LABELS[0];

  async function reset() {
    if (!confirm("Cookie-Einstellungen zurücksetzen? Du wirst beim nächsten Klick neu gefragt.")) return;
    setBusy(true);
    try {
      await fetch("/api/ads/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: 0 }),
      });
      await refresh?.();
      setFlash("✓ Zurückgesetzt — der Banner erscheint gleich wieder.");
      setTimeout(() => setFlash(""), 5000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      background: "var(--vv-card, #fff)",
      border: "1px solid var(--vv-border, #e5e5e7)",
      borderRadius: 14,
      padding: 16,
      marginTop: 16,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10, marginBottom: 8,
      }}>
        <span style={{ fontSize: 22 }}>🍪</span>
        <strong style={{ fontSize: 15 }}>Cookie- &amp; Werbe-Einstellungen</strong>
      </div>
      <div style={{ fontSize: 13, color: "var(--vv-muted, #666)", lineHeight: 1.5, marginBottom: 12 }}>
        Deine aktuelle Wahl:&nbsp;
        <span style={{
          color: label.color, fontWeight: 700,
        }}>{label.text}</span>
      </div>
      <p style={{ fontSize: 12, color: "var(--vv-muted, #888)", marginTop: 0, marginBottom: 12, lineHeight: 1.5 }}>
        Du kannst deine Einwilligung jederzeit ändern oder zurückziehen.
        Nach dem Zurücksetzen erscheint der Banner wieder und du kannst
        neu wählen.
      </p>
      <button
        type="button"
        onClick={reset}
        disabled={busy}
        style={{
          padding: "10px 18px", borderRadius: 10,
          background: "var(--vv-surface, #f5f5f7)",
          color: "var(--vv-text, #1c1c1e)",
          border: "1px solid var(--vv-border, #ddd)",
          fontWeight: 700, fontSize: 13, cursor: busy ? "wait" : "pointer",
          fontFamily: "inherit",
        }}
      >
        {busy ? "⏳…" : "🔄 Cookie-Einstellungen zurücksetzen"}
      </button>
      {flash && (
        <div style={{
          marginTop: 10, padding: "8px 12px", borderRadius: 8,
          background: "rgba(16,185,129,0.1)", color: "#059669",
          fontSize: 12, fontWeight: 600,
        }}>{flash}</div>
      )}
    </div>
  );
}
