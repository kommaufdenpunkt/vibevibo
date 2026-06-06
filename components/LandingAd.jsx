"use client";

// 📺 Public AdSlot für die Landing-Page (vor Login).
// Lädt Ezoic / Adsterra-Banner ohne useMe-Check (auf der Landing gibt's keinen Consent-Cookie).
// Ohne Provider-Config zeigt nur einen Hinweis-Platzhalter.

import { useEffect, useRef, useState } from "react";

function loadOnce(src, id, attrs = {}) {
  if (typeof window === "undefined") return;
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id; s.async = true; s.src = src;
  Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
  document.head.appendChild(s);
}

export default function LandingAd({ slot = "landing", minHeight = 100, style, label = "Werbung" }) {
  const ref = useRef(null);
  const [display, setDisplay] = useState(null);
  const [pushed, setPushed] = useState(false);

  useEffect(() => {
    fetch("/api/ads/status")
      .then((r) => r.json())
      .then((d) => setDisplay(d?.config?.display || null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!display?.enabled || !ref.current || pushed) return;
    if (display.provider === "ezoic" && display.siteId) {
      loadOnce(`https://www.ezojs.com/ezoic/sa.min.js?id=${display.siteId}`, "vv-ezoic-script-landing");
      setPushed(true);
    } else if (display.provider === "adsterra" && display.zoneId) {
      const w = window;
      w.atOptions = {
        key: display.zoneId,
        format: "iframe",
        height: display.height || 50,
        width: display.width || 320,
        params: {},
      };
      const domain = (display.domain || "www.highperformanceformat.com").replace(/^https?:\/\//i, "").replace(/\/+$/, "");
      loadOnce(`https://${domain}/${display.zoneId}/invoke.js`, "vv-adsterra-l-" + display.zoneId);
      setPushed(true);
    }
  }, [display, pushed]);

  if (!display || !display.enabled) {
    return (
      <div style={{
        background: "rgba(255,255,255,0.85)",
        border: "2px dashed rgba(168,85,247,0.4)",
        borderRadius: 12,
        padding: 18,
        textAlign: "center",
        color: "#581c87",
        fontSize: 12,
        fontFamily: "Arial, sans-serif",
        ...style,
      }}>
        📦 {label} · <a href="/admin" style={{ color: "#7c3aed" }}>Display-Provider im Admin-Panel konfigurieren</a>
      </div>
    );
  }

  return (
    <div style={{ ...style }}>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", textAlign: "right", marginBottom: 2 }}>
        {label}
      </div>
      {display.provider === "ezoic" && (
        <div ref={ref} id={`ezoic-pub-ad-placeholder-${slot}`} style={{ minHeight }} />
      )}
      {display.provider === "adsterra" && (
        <div ref={ref} style={{
          minHeight: Math.max(minHeight, (display.height || 50) + 10),
          display: "flex", justifyContent: "center", alignItems: "center",
        }}>
          <div id={`adsterra-l-${display.zoneId}`} style={{
            width: display.width || 320,
            height: display.height || 50,
          }} />
        </div>
      )}
    </div>
  );
}
