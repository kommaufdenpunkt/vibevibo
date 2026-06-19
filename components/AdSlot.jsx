"use client";

// Display-Banner mit Multi-Provider Support.
// Provider wird im Admin-Panel ausgewaehlt (Ezoic / Adsterra / Aus).
//
// Banner laden nur wenn:
//   - User hat Consent gegeben (ads_consent > 0)
//   - User ist KEIN VIP
//   - Im Admin ein Display-Provider konfiguriert ist

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMe } from "@/lib/useMe";

const SCRIPT_ID = "vv-display-script";

function loadOnce(src, id = SCRIPT_ID, attrs = {}) {
  if (typeof window === "undefined") return;
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id;
  s.async = true;
  s.src = src;
  Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
  document.head.appendChild(s);
}

export default function AdSlot({ slot, format = "auto", style, label = "Werbung" }) {
  const { me } = useMe();
  const ref = useRef(null);
  const [pushed, setPushed] = useState(false);
  const [display, setDisplay] = useState(null);

  useEffect(() => {
    if (!me) return;
    if ((me.adsConsent || 0) <= 0) return;
    if (me.vip) return;
    fetch("/api/ads/status")
      .then((r) => r.json())
      .then((d) => setDisplay(d?.config?.display || null))
      .catch(() => {});
  }, [me]);

  useEffect(() => {
    if (!display?.enabled || !ref.current || pushed) return;
    if (display.provider === "adsense" && display.pubId) {
      // AdSense loader script (idempotent: idempotent guard im loadOnce)
      loadOnce(
        `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(display.pubId)}`,
        "vv-adsense-script",
        { "crossorigin": "anonymous" },
      );
      // adsbygoogle.push für manuelle Slots
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        setPushed(true);
      } catch {}
    } else if (display.provider === "ezoic" && display.siteId) {
      loadOnce(`https://www.ezojs.com/ezoic/sa.min.js?id=${display.siteId}`, "vv-ezoic-script");
      setPushed(true);
    } else if (display.provider === "adsterra" && display.zoneId) {
      // Adsterra-Banner-Embed: kapseln in eigenes Container-Div mit Zone-ID
      const w = window;
      w.atOptions = w.atOptions || {};
      w.atOptions[display.zoneId] = { key: display.zoneId, format: "iframe", height: 250, width: 300 };
      loadOnce(`https://www.profitableratecpm.com/${display.zoneId}/invoke.js`, "vv-adsterra-" + display.zoneId);
      setPushed(true);
    }
  }, [display, pushed]);

  // Nichts rendern wenn kein Consent / VIP / kein Account
  if (!me || (me.adsConsent || 0) <= 0 || me.vip) return null;

  // Provider noch nicht konfiguriert -> Hinweis-Platzhalter
  if (!display || !display.enabled) {
    return (
      <div style={{
        background: "var(--vv-surface, #f5f5f7)",
        border: "1px dashed var(--vv-border, #ccc)",
        borderRadius: 10, padding: 14, textAlign: "center",
        color: "var(--vv-muted, #888)", fontSize: 11, ...style,
      }}>
        📦 {label} (Display-Provider im Admin-Panel konfigurieren)
      </div>
    );
  }

  return (
    <div style={{ ...style }}>
      <div style={{ fontSize: 10, color: "var(--vv-muted, #888)", textAlign: "right", marginBottom: 2 }}>
        {label}
      </div>
      {display.provider === "adsense" && (
        <ins
          ref={ref}
          className="adsbygoogle"
          style={{ display: "block", minHeight: 90 }}
          data-ad-client={display.pubId}
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      )}
      {display.provider === "ezoic" && (
        <div ref={ref} id={`ezoic-pub-ad-placeholder-${slot}`} style={{ minHeight: 90 }} />
      )}
      {display.provider === "adsterra" && (
        <div ref={ref} style={{ minHeight: 90, display: "flex", justifyContent: "center" }}>
          <div id={`adsterra-${display.zoneId}`} />
        </div>
      )}

      {/* 🌟 Premium-CTA — dezenter Hinweis "Werbefrei werden".
          Konvertiert Free → Premium ohne aufdringliche Banner. */}
      <div style={{
        marginTop: 4,
        textAlign: "right",
        fontSize: 10,
        color: "var(--vv-muted, #999)",
        lineHeight: 1.3,
      }}>
        <Link
          href="/shop"
          style={{
            color: "var(--vv-muted, #999)",
            textDecoration: "none",
            opacity: 0.65,
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.65)}
        >
          🌟 <u>Werbefrei mit Premium</u> · ab 2,99 €/Monat
        </Link>
      </div>
    </div>
  );
}
