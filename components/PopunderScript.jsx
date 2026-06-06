"use client";

// 💰 Popunder-Loader für Adsterra (oder kompatible Anbieter).
// Lädt das Popunder-Script GLOBAL — beim ersten User-Click ploppt ein Tab auf.
//
// Wird NICHT geladen wenn:
//   - User ist VIP (vip_until > Date.now())
//   - User hat Werbung in Einstellungen abgeschaltet (ads_consent <= 0 fuer eingeloggte)
//   - Im Admin kein Popunder-Provider konfiguriert
//
// Konfigurierbar über /api/ads/status → config.popunder = { enabled, scriptUrl }

import { useEffect } from "react";
import { useMe } from "@/lib/useMe";

export default function PopunderScript() {
  const { me } = useMe();

  useEffect(() => {
    if (typeof window === "undefined") return;
    // VIP / kein Consent → kein Popunder
    if (me?.vip) return;
    if (me && (me.adsConsent || 0) <= 0) return;
    // Schon geladen?
    if (document.getElementById("vv-popunder-script")) return;

    fetch("/api/ads/status").then((r) => r.json()).then((d) => {
      const p = d?.config?.popunder;
      if (!p?.enabled || !p?.scriptUrl) return;
      // Sicherheits-Check: nur https erlauben
      if (!/^https:\/\//i.test(p.scriptUrl)) return;
      const s = document.createElement("script");
      s.id = "vv-popunder-script";
      s.async = true;
      s.src = p.scriptUrl;
      document.body.appendChild(s);
    }).catch(() => {});
  }, [me]);

  return null;
}
