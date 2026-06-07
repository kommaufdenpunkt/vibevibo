"use client";

// 💎 Social Bar Loader (Adsterra) — sticky-Bar mit höchster CTR.
// Wird NICHT geladen wenn:
//   - User ist VIP
//   - User hat Werbung in Einstellungen abgeschaltet (ads_consent <= 0)
//   - Im Admin keine URL konfiguriert
//
// Konfigurierbar über /api/ads/status → config.socialBar = { enabled, scriptUrl }

import { useEffect } from "react";
import { useMe } from "@/lib/useMe";

export default function SocialBarScript() {
  const { me } = useMe();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (me?.vip) return;
    if (me && (me.adsConsent || 0) <= 0) return;
    if (document.getElementById("vv-socialbar-script")) return;

    fetch("/api/ads/status").then((r) => r.json()).then((d) => {
      const sb = d?.config?.socialBar;
      if (!sb?.enabled || !sb?.scriptUrl) return;
      if (!/^https:\/\//i.test(sb.scriptUrl)) return;
      const s = document.createElement("script");
      s.id = "vv-socialbar-script";
      s.async = true;
      s.src = sb.scriptUrl;
      document.body.appendChild(s);
    }).catch(() => {});
  }, [me]);

  return null;
}
