"use client";

// 📢 Globaler AdSense-Loader.
// Lädt das adsbygoogle.js-Script EINMAL, sobald folgende Bedingungen erfüllt sind:
//   • DISPLAY_PROVIDER = "adsense"
//   • ADSENSE_PUB_ID gesetzt
//   • User hat Consent gegeben (ads_consent > 0)
//   • User ist KEIN VIP
//
// Setzt zusätzlich Google Consent Mode v2 Defaults entsprechend der Wahl.

import { useEffect, useState } from "react";
import { useMe } from "@/lib/useMe";

const SCRIPT_ID = "vv-adsense-script";

function loadOnce(src, id, attrs = {}) {
  if (typeof window === "undefined") return;
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id;
  s.async = true;
  s.src = src;
  Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
  document.head.appendChild(s);
}

function applyConsentMode(consent) {
  if (typeof window === "undefined") return;
  // Google Consent Mode v2 — vor jedem Ads-Script setzen
  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;
  // Defaults setzen falls noch nicht passiert
  const denied = "denied", granted = "granted";
  // 1 = personalisiert, 2 = generisch, -1 = nur essenziell
  const adStorage      = consent === 1 ? granted : denied;
  const adUserData     = consent === 1 ? granted : denied;
  const adPersonal     = consent === 1 ? granted : denied;
  const analyticsStor  = consent >= 1 ? granted : denied;
  gtag("consent", "update", {
    ad_storage:           adStorage,
    ad_user_data:         adUserData,
    ad_personalization:   adPersonal,
    analytics_storage:    analyticsStor,
  });
}

export default function AdSenseLoader() {
  const { me } = useMe();
  const [config, setConfig] = useState(null);

  // 1) Config holen sobald User da
  useEffect(() => {
    if (!me) return;
    if ((me.adsConsent || 0) <= 0) return;
    if (me.vip) return;
    fetch("/api/ads/status").then((r) => r.json()).then((d) => {
      setConfig(d?.config?.display || null);
    }).catch(() => {});
  }, [me]);

  // 2) Consent Mode + AdSense laden
  useEffect(() => {
    if (!me) return;
    applyConsentMode(me.adsConsent);
    if (!config?.enabled) return;
    if (config.provider !== "adsense" || !config.pubId) return;
    loadOnce(
      `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(config.pubId)}`,
      SCRIPT_ID,
      { "crossorigin": "anonymous" },
    );
    if (config.autoAds) {
      // Auto-Ads aktivieren — Google entscheidet selbst wo Anzeigen sinnvoll sind
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({
          google_ad_client: config.pubId,
          enable_page_level_ads: true,
        });
      } catch {}
    }
  }, [me, config]);

  return null;
}
