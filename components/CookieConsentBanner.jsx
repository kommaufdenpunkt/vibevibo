"use client";

// DSGVO-Cookie-Banner. Erstmals sichtbar wenn user.adsConsent === 0 (unbestimmt).
// 3 Optionen: Alle akzeptieren / Nur essenzielle / Nicht-personalisierte Werbung.
//
// Speichert die Wahl im User-Konto (ads_consent) - damit Fidolin + Audit
// nachvollziehen koennen, wann ein User wozu eingewilligt hat.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMe } from "@/lib/useMe";

export default function CookieConsentBanner() {
  const { me, refresh } = useMe();
  const [busy, setBusy] = useState(false);
  const [openDetails, setOpenDetails] = useState(false);

  // Erst nach Hydration anzeigen, sonst SSR-Mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted || !me) return null;
  if ((me.adsConsent || 0) !== 0) return null; // schon entschieden

  async function set(consent) {
    setBusy(true);
    try {
      await fetch("/api/ads/consent", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent }),
      });
      await refresh?.();
    } finally { setBusy(false); }
  }

  return (
    <div style={{
      position: "fixed", left: 8, right: 8, bottom: 8, zIndex: 9999,
      maxWidth: 720, margin: "0 auto",
      background: "var(--vv-card, #fff)", color: "var(--vv-text, #1c1c1e)",
      border: "2px solid #ec4899", borderRadius: 14, padding: 14,
      boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
      fontFamily: "Arial, sans-serif", fontSize: 13, lineHeight: 1.45,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 22 }}>🍪</span>
        <strong style={{ fontSize: 14 }}>Cookies &amp; Werbung</strong>
      </div>
      <p style={{ margin: "0 0 8px" }}>
        VibeVibo ist gratis — wir refinanzieren das über <b>Werbung</b> und
        deine Käufe im Shop. Damit Werbung halbwegs relevant ist, brauchen wir
        eine Einwilligung von dir (DSGVO).
      </p>
      {openDetails && (
        <div style={{ background: "var(--vv-surface, #f5f5f7)", padding: 10, borderRadius: 8, marginBottom: 8, fontSize: 12 }}>
          <strong>Was passiert wann?</strong>
          <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
            <li><b>Alle Cookies</b> — du siehst zielgerichtete Werbung (Höchster Auszahl-Wert für uns; du kannst mehr Vibes mit „Video gucken" verdienen).</li>
            <li><b>Nur essenziell</b> — keine Werbung, kein Tracking. Wir verdienen nichts an dir. „Video gucken" für Vibes ist deaktiviert.</li>
            <li><b>Nicht-personalisierte Werbung</b> — Mittelweg: Werbung ja, aber generisch (z.B. Brot statt deinen Lieblingsschuhen). Du kannst Vibes verdienen.</li>
          </ul>
          <div style={{ marginTop: 6 }}>
            Mehr in unserer{" "}
            <Link href="/datenschutz" style={{ color: "#ec4899" }}>Datenschutzerklärung</Link>.
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
        <button type="button" disabled={busy} onClick={() => set(-1)}
          style={btnStyle("ghost")}>
          Nur essenziell
        </button>
        <button type="button" disabled={busy} onClick={() => set(2)}
          style={btnStyle("mid")}>
          Generische Werbung
        </button>
        <button type="button" disabled={busy} onClick={() => set(1)}
          style={btnStyle("pink")}>
          Alle Cookies ✓
        </button>
      </div>
      <button type="button" onClick={() => setOpenDetails((v) => !v)}
        style={{
          marginTop: 6, width: "100%", padding: 6, border: "none", background: "transparent",
          color: "var(--vv-muted, #888)", cursor: "pointer", fontSize: 11,
        }}>
        {openDetails ? "← Details ausblenden" : "Details / Was passiert wann?"}
      </button>
    </div>
  );
}

function btnStyle(variant) {
  const base = {
    padding: "10px 8px", borderRadius: 10, border: "none",
    fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
    lineHeight: 1.2,
  };
  if (variant === "pink") return { ...base, background: "linear-gradient(135deg, #ec4899, #be185d)", color: "#fff" };
  if (variant === "mid")  return { ...base, background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", color: "#fff" };
  return { ...base, background: "var(--vv-surface, #f5f5f7)", color: "var(--vv-text, #1c1c1e)", border: "1px solid var(--vv-border, #ddd)" };
}
