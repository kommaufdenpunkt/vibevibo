"use client";

// DSGVO-Cookie-Banner.
// Eingeloggte User: Wahl wird in users.ads_consent gespeichert (DB).
// Anonyme Besucher: Wahl im Browser-Cookie vv_anon_consent (Client).
// Beide Varianten benutzen die gleiche Skala: 1 / 2 / -1.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMe } from "@/lib/useMe";
import { readAnonConsent, writeAnonConsent } from "@/lib/anonConsent";

export default function CookieConsentBanner() {
  const { me, refresh } = useMe();
  const [busy, setBusy] = useState(false);
  const [openDetails, setOpenDetails] = useState(false);
  const [anonConsent, setAnonConsent] = useState(0);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    setAnonConsent(readAnonConsent());
  }, []);

  if (!mounted) return null;

  // Wer hat schon entschieden?
  if (me && (me.adsConsent || 0) !== 0) return null;        // eingeloggt: DB-Wert
  if (!me && anonConsent !== 0) return null;                // anon: Cookie-Wert

  async function set(consent) {
    setBusy(true);
    try {
      if (me) {
        await fetch("/api/ads/consent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ consent }),
        });
        await refresh?.();
      } else {
        // Anonym: nur Browser-Cookie setzen
        writeAnonConsent(consent);
        setAnonConsent(consent);
      }
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
        VibeVibo ist gratis — wir refinanzieren das über <b>Werbung</b>
        {me ? " und deine Käufe im Shop" : ""}. Damit Werbung halbwegs
        relevant ist, brauchen wir eine Einwilligung von dir (DSGVO).
      </p>
      {openDetails && (
        <div style={{ background: "var(--vv-surface, #f5f5f7)", padding: 10, borderRadius: 8, marginBottom: 8, fontSize: 12 }}>
          <strong>Was passiert wann?</strong>
          <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
            <li><b>Alle Cookies</b> — du siehst zielgerichtete Werbung (höchster Auszahl-Wert für uns).</li>
            <li><b>Nur essenziell</b> — keine Werbung, kein Tracking. Wir verdienen nichts an dir.</li>
            <li><b>Generische Werbung</b> — Mittelweg: Werbung ja, aber nicht-personalisiert.</li>
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
