"use client";

// 🔔 In-Page Push Loader (Adsterra) — Pseudo-Push-Notifications.
// Funktioniert auch ohne Browser-Push-Erlaubnis.
//
// Konfigurierbar über /api/ads/status → config.inPagePush = { enabled, scriptUrl }

import { useEffect } from "react";
import { useMe } from "@/lib/useMe";

export default function InPagePushScript() {
  const { me } = useMe();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (me?.vip) return;
    if (me && (me.adsConsent || 0) <= 0) return;
    if (document.getElementById("vv-inpagepush-script")) return;

    fetch("/api/ads/status").then((r) => r.json()).then((d) => {
      const ip = d?.config?.inPagePush;
      if (!ip?.enabled || !ip?.scriptUrl) return;
      if (!/^https:\/\//i.test(ip.scriptUrl)) return;
      const s = document.createElement("script");
      s.id = "vv-inpagepush-script";
      s.async = true;
      s.src = ip.scriptUrl;
      document.body.appendChild(s);
    }).catch(() => {});
  }, [me]);

  return null;
}
