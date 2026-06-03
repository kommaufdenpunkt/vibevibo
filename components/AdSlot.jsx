"use client";

// AdSense-Display-Werbung. Wird nur geladen wenn:
//   - User hat Consent gegeben (ads_consent > 0)
//   - User ist KEIN VIP
//   - ENV ADSENSE_CLIENT ist gesetzt (sonst zeigen wir nur einen Platzhalter)
//
// Pro Auslieferung wird "data-ad-format" + Slot-ID gesetzt.
// AdSense rendert selbst das Banner, wir laden nur das Script einmal.

import { useEffect, useRef, useState } from "react";
import { useMe } from "@/lib/useMe";

const ADSENSE_SCRIPT_ID = "vv-adsense-script";

function loadAdsense(client) {
  if (typeof window === "undefined") return;
  if (document.getElementById(ADSENSE_SCRIPT_ID)) return;
  const s = document.createElement("script");
  s.id = ADSENSE_SCRIPT_ID;
  s.async = true;
  s.crossOrigin = "anonymous";
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
  document.head.appendChild(s);
}

export default function AdSlot({ slot, format = "auto", style, label = "Werbung" }) {
  const { me } = useMe();
  const ref = useRef(null);
  const [pushed, setPushed] = useState(false);
  const [client, setClient] = useState("");

  // Frontend kennt die Provider-Config NICHT direkt aus ENV — wir holen sie vom Server,
  // wenn der Status gefragt wird. Hier reicht uns ein einfacher Lookup-Call.
  useEffect(() => {
    if (!me) return;
    if ((me.adsConsent || 0) <= 0) return;
    if (me.vip) return;
    fetch("/api/ads/status")
      .then((r) => r.json())
      .then((d) => setClient(d?.config?.adsenseClient || ""))
      .catch(() => {});
  }, [me]);

  useEffect(() => {
    if (!client || !ref.current || pushed) return;
    loadAdsense(client);
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      setPushed(true);
    } catch { /* silent */ }
  }, [client, pushed]);

  // Nichts rendern wenn kein Consent / VIP / kein Account
  if (!me || (me.adsConsent || 0) <= 0 || me.vip) return null;

  // Kein Publisher-ID gesetzt -> grauer Platzhalter (Dev/Staging-Hinweis)
  if (!client) {
    return (
      <div style={{
        background: "var(--vv-surface, #f5f5f7)",
        border: "1px dashed var(--vv-border, #ccc)",
        borderRadius: 10, padding: 14, textAlign: "center",
        color: "var(--vv-muted, #888)", fontSize: 11, ...style,
      }}>
        📦 {label} (AdSense noch nicht konfiguriert — setze ADSENSE_CLIENT in ENV)
      </div>
    );
  }

  // Klein als „Anzeige"-Tag drueber (DSGVO-Pflicht: Werbung muss gekennzeichnet sein)
  return (
    <div style={{ ...style }}>
      <div style={{ fontSize: 10, color: "var(--vv-muted, #888)", textAlign: "right", marginBottom: 2 }}>
        {label}
      </div>
      <ins
        ref={ref}
        className="adsbygoogle"
        style={{ display: "block", minHeight: 90 }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
