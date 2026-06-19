"use client";

// 📢 Globaler AdSense-Loader — JETZT MIT LAZY-LOAD.
// Lädt das adsbygoogle.js-Script erst wenn der Browser idle ist (requestIdleCallback)
// oder nach max 2 s. Spart 200-500 ms LCP weil der Main-Thread frei bleibt.
//
// Bedingungen wie vorher:
//   • DISPLAY_PROVIDER = "adsense"
//   • ADSENSE_PUB_ID gesetzt
//   • Consent gegeben (ads_consent > 0 ODER anon-cookie > 0)
//   • KEIN VIP

import { useEffect, useState } from "react";
import { useMe } from "@/lib/useMe";
import { readAnonConsent, effectiveAdsConsent, effectiveVip } from "@/lib/anonConsent";

const SCRIPT_ID = "vv-adsense-script";

// Lazy-Load Helper — wartet auf requestIdleCallback (max 2 s Fallback)
function whenIdle(cb) {
  if (typeof window === "undefined") return;
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(cb, { timeout: 2000 });
  } else {
    setTimeout(cb, 1500);
  }
}

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
  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;
  const denied = "denied", granted = "granted";
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
  const { me, loading } = useMe();
  const [config, setConfig] = useState(null);
  const [anonConsent, setAnonConsent] = useState(0);

  useEffect(() => {
    setAnonConsent(readAnonConsent());
  }, []);

  useEffect(() => {
    if (me) return;
    const iv = setInterval(() => {
      const v = readAnonConsent();
      if (v !== anonConsent) setAnonConsent(v);
    }, 1500);
    return () => clearInterval(iv);
  }, [me, anonConsent]);

  // Config holen sobald Consent steht
  useEffect(() => {
    const consent = me ? (me.adsConsent || 0) : anonConsent;
    if (consent <= 0) return;
    if (effectiveVip(me)) return;
    const endpoint = me ? "/api/ads/status" : "/api/ads/public-status";
    fetch(endpoint).then((r) => r.json()).then((d) => {
      setConfig(d?.config?.display || null);
    }).catch(() => {});
  }, [me, anonConsent]);

  // Consent Mode + AdSense LAZY laden (whenIdle)
  useEffect(() => {
    if (loading) return;
    const consent = me ? (me.adsConsent || 0) : anonConsent;
    if (consent === 0) return;
    applyConsentMode(consent);
    if (consent <= 0) return;
    if (effectiveVip(me)) return;
    if (!config?.enabled) return;
    if (config.provider !== "adsense" || !config.pubId) return;

    // 🚀 LAZY-LOAD: erst wenn Browser idle → spart LCP
    whenIdle(() => {
      loadOnce(
        `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(config.pubId)}`,
        SCRIPT_ID,
        { "crossorigin": "anonymous" },
      );
      if (config.autoAds) {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({
            google_ad_client: config.pubId,
            enable_page_level_ads: true,
          });
        } catch {}
      }
    });
  }, [loading, me, anonConsent, config]);

  return null;
}
