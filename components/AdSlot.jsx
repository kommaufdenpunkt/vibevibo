"use client";

// Display-Banner mit Multi-Provider Support.
// Provider wird im Admin-Panel ausgewaehlt (Ezoic / Adsterra / Aus).
//
// Banner laden nur wenn:
//   - User hat Consent gegeben (ads_consent > 0)
//   - User ist KEIN VIP
//   - Im Admin ein Display-Provider konfiguriert ist

import { useEffect, useRef, useState } from "react";
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
    if (display.provider === "ezoic" && display.siteId) {
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
      {display.provider === "ezoic" && (
        <div ref={ref} id={`ezoic-pub-ad-placeholder-${slot}`} style={{ minHeight: 90 }} />
      )}
      {display.provider === "adsterra" && (
        <div ref={ref} style={{ minHeight: 90, display: "flex", justifyContent: "center" }}>
          <div id={`adsterra-${display.zoneId}`} />
        </div>
      )}
    </div>
  );
}
