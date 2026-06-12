"use client";

// Misst, ob die App als PWA (standalone) laeuft, und meldet
// das einmal pro Session an den Server. So sieht der Admin
// welcher User welche PWA installiert hat.

import { useEffect } from "react";
import { useMe } from "@/lib/useMe";

function detectPlatform() {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return "ipados";
  if (/Windows/.test(ua)) return "windows";
  if (/Macintosh|Mac OS X/.test(ua)) return "mac";
  if (/Linux/.test(ua)) return "linux";
  return "desktop";
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  if (window.navigator?.standalone) return true; // iOS
  return false;
}

export default function PwaInstallTracker() {
  const { me } = useMe();

  useEffect(() => {
    if (!me) return;
    if (typeof window === "undefined") return;

    const REPORT_KEY = "vv_pwa_reported";

    async function report(platform) {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const last = localStorage.getItem(REPORT_KEY);
        if (last === `${platform}:${today}`) return; // 1x pro Tag pro Platform
        await fetch("/api/me/pwa-install", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform, userAgent: navigator.userAgent || "" }),
        });
        localStorage.setItem(REPORT_KEY, `${platform}:${today}`);
      } catch {}
    }

    // Bereits standalone? -> sofort melden
    if (isStandalone()) {
      report(detectPlatform());
    }

    // Wenn der User die App jetzt installiert (Chrome/Edge feuert appinstalled)
    const onInstalled = () => report(detectPlatform());
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, [me]);

  return null;
}
