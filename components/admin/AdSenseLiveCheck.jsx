"use client";

// 🔬 Live-Browser-Check für AdSense.
// Läuft im Browser des Admins und prüft:
//   • Lädt adsbygoogle.js wirklich?
//   • Wurde Consent gesetzt (Cookie-Banner)?
//   • Ist der User VIP?
//   • Hat die Konfiguration die Slots erreicht?

import { useEffect, useState } from "react";
import { useMe } from "@/lib/useMe";

function statusDot(state) {
  if (state === "ok") return { bg: "#10b981", glyph: "✓" };
  if (state === "warn") return { bg: "#f59e0b", glyph: "!" };
  if (state === "err") return { bg: "#ef4444", glyph: "✗" };
  return { bg: "#cbd5e1", glyph: "?" };
}

export default function AdSenseLiveCheck({ pubId }) {
  const { me } = useMe();
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(false);
  const [pushArrayExists, setPushArrayExists] = useState(false);
  const [pushCount, setPushCount] = useState(0);
  const [adsTxtStatus, setAdsTxtStatus] = useState("...");
  const [robotsTxtStatus, setRobotsTxtStatus] = useState("...");
  const [adsTxtContent, setAdsTxtContent] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Script-Check (alle 500ms für 6 Sekunden)
    let attempts = 0;
    const iv = setInterval(() => {
      attempts++;
      const tag = document.querySelector('script[src*="adsbygoogle.js"]');
      if (tag) {
        setScriptLoaded(true);
        if (tag.dataset?.error) setScriptError(true);
      }
      if (Array.isArray(window.adsbygoogle)) {
        setPushArrayExists(true);
        setPushCount(window.adsbygoogle.length);
      }
      if (attempts >= 12) clearInterval(iv);
    }, 500);

    // ads.txt prüfen
    fetch("/ads.txt", { cache: "no-store" }).then((r) => r.text()).then((t) => {
      const trimmed = (t || "").trim();
      setAdsTxtContent(trimmed.slice(0, 200));
      if (trimmed.includes(pubId?.replace("ca-", "") || "pub-")) {
        setAdsTxtStatus("ok");
      } else if (trimmed.length > 0) {
        setAdsTxtStatus("warn");
      } else {
        setAdsTxtStatus("err");
      }
    }).catch(() => setAdsTxtStatus("err"));

    // robots.txt prüfen
    fetch("/robots.txt", { cache: "no-store" }).then((r) => r.text()).then((t) => {
      if (t && t.includes("Mediapartners-Google")) setRobotsTxtStatus("ok");
      else if (t && t.length > 0) setRobotsTxtStatus("warn");
      else setRobotsTxtStatus("err");
    }).catch(() => setRobotsTxtStatus("err"));

    return () => clearInterval(iv);
  }, [pubId]);

  const consentState = !me ? "?"
    : me.adsConsent === 1 ? "ok"
    : me.adsConsent === 2 ? "warn"
    : me.adsConsent === -1 ? "err"
    : "warn";

  const vipState = !me ? "?"
    : me.vip ? "warn" // VIP → keine Werbung (geplant, aber Test-Probleme)
    : "ok";

  const checks = [
    {
      label: "🍪 Consent gegeben",
      state: consentState,
      detail: !me ? "Nicht eingeloggt"
        : me.adsConsent === 1 ? "Personalisierte Werbung erlaubt"
        : me.adsConsent === 2 ? "Generische Werbung (nicht-personalisiert)"
        : me.adsConsent === -1 ? "Nur essenzielle Cookies — KEINE Werbung wird geladen!"
        : "Noch nicht entschieden — Banner sollte erscheinen",
    },
    {
      label: "👤 User-Status",
      state: vipState,
      detail: !me ? "Nicht eingeloggt"
        : me.vip ? "VIP/Premium — Werbung wird nicht geladen (zum Testen ohne Premium einloggen)"
        : `Free-User (@${me.username}) — Werbung wird geladen`,
    },
    {
      label: "📜 adsbygoogle.js-Script im DOM",
      state: scriptError ? "err" : scriptLoaded ? "ok" : "warn",
      detail: scriptError
        ? "Script-Tag vorhanden aber Fehler — Adblocker? Konsole prüfen."
        : scriptLoaded
          ? "Script-Tag gefunden im <head>"
          : "Noch nicht geladen — kann an Consent oder VIP-Status liegen",
    },
    {
      label: "🔄 adsbygoogle-Push-Array",
      state: pushArrayExists ? "ok" : "warn",
      detail: pushArrayExists
        ? `Array existiert, ${pushCount} Push-Befehle abgesetzt`
        : "Noch nicht initialisiert",
    },
    {
      label: "📄 ads.txt enthält Publisher-ID",
      state: adsTxtStatus,
      detail: adsTxtStatus === "ok"
        ? "✓ Publisher-ID in ads.txt gefunden"
        : adsTxtStatus === "warn"
          ? "Datei vorhanden aber Pub-ID nicht gefunden"
          : adsTxtStatus === "err"
            ? "ads.txt LEER oder NICHT ERREICHBAR — kritisch!"
            : "Wird geprüft…",
    },
    {
      label: "🤖 robots.txt erlaubt Mediapartners-Google",
      state: robotsTxtStatus,
      detail: robotsTxtStatus === "ok"
        ? "✓ AdsBot-Crawler hat Zugang"
        : robotsTxtStatus === "warn"
          ? "robots.txt da, aber AdsBot nicht explizit erlaubt"
          : robotsTxtStatus === "err"
            ? "robots.txt nicht erreichbar"
            : "Wird geprüft…",
    },
  ];

  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e5e7" }}>
      {checks.map((c, i) => {
        const d = statusDot(c.state);
        return (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "12px 16px",
            borderBottom: i < checks.length - 1 ? "1px solid #f1f5f9" : "none",
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: 999, background: d.bg,
              color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 900, flexShrink: 0, fontSize: 14,
            }}>{d.glyph}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#1c1c1e" }}>{c.label}</div>
              <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2, lineHeight: 1.4 }}>
                {c.detail}
              </div>
            </div>
          </div>
        );
      })}
      {adsTxtContent && (
        <div style={{
          padding: "10px 16px", background: "#f8fafc",
          fontSize: 11, fontFamily: "monospace", color: "#475569",
          borderTop: "1px solid #e5e5e7",
        }}>
          <b>ads.txt Inhalt:</b><br/>
          {adsTxtContent}
        </div>
      )}
    </div>
  );
}
