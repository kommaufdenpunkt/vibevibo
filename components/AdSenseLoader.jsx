"use client";

// 📢 Globaler AdSense-Loader.
// Lädt das adsbygoogle.js-Script EINMAL, sobald folgende Bedingungen erfüllt sind:
//   • DISPLAY_PROVIDER = "adsense"
//   • ADSENSE_PUB_ID gesetzt
//   • User hat Consent gegeben (ads_consent > 0  ODER  anon-cookie > 0)
//   • User ist KEIN VIP
//
// Setzt zusätzlich Google Consent Mode v2 Defaults entsprechend der Wahl.
// Funktioniert auch für ANONYME Besucher (Public-Pages) via Cookie-Consent.

import { useEffect, useState } from "react";
import { useMe } from "@/lib/useMe";
import { readAnonConsent, effectiveAdsConsent, effectiveVip } from "@/lib/anonConsent";

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
  const { me, loading } = useMe();
  const [config, setConfig] = useState(null);
  const [anonConsent, setAnonConsent] = useState(0);

  // Anon-Cookie nach Mount lesen
  useEffect(() => {
    setAnonConsent(readAnonConsent());
  }, []);

  // Watch für Anon-Cookie-Änderungen (z.B. wenn Banner gerade akzeptiert wurde)
  useEffect(() => {
    if (me) return;
    const iv = setInterval(() => {
      const v = readAnonConsent();
      if (v !== anonConsent) setAnonConsent(v);
    }, 1500);
    return () => clearInterval(iv);
  }, [me, anonConsent]);

  // 1) Config holen sobald Consent steht
  useEffect(() => {
    const consent = me ? (me.adsConsent || 0) : anonConsent;
    if (consent <= 0) return;
    if (effectiveVip(me)) return;
    // Anonyme User: status-Endpoint ist auth-pflichtig → eigene Public-Variante
    const endpoint = me ? "/api/ads/status" : "/api/ads/public-status";
    fetch(endpoint).then((r) => r.json()).then((d) => {
      setConfig(d?.config?.display || null);
    }).catch(() => {});
  }, [me, anonConsent]);

  // 2) Consent Mode + AdSense laden
  useEffect(() => {
    if (loading) return;
    const consent = me ? (me.adsConsent || 0) : anonConsent;
    if (consent === 0) return; // noch nicht entschieden → kein Consent-Mode-Update
    applyConsentMode(consent);
    if (consent <= 0) return;
    if (effectiveVip(me)) return;
    if (!config?.enabled) return;
    if (config.provider !== "adsense" || !config.pubId) return;
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
  }, [loading, me, anonConsent, config]);

  return null;
}
