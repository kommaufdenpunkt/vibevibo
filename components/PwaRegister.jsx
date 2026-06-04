"use client";

// Headless: registriert den Service Worker, prüft alle 30 Min auf Updates,
// und zeigt einen dezenten "Neue Version verfügbar"-Toast.
// Kein automatischer Install-Dialog — der wird vom InstallNow-Button im UI getriggert.

import { useEffect, useState } from "react";

export default function PwaRegister() {
  const [updateReady, setUpdateReady] = useState(false);
  const [waitingReg, setWaitingReg] = useState(null);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let reg = null;
    let intervalId = null;

    // EINMALIGE SELBSTHEILUNG: alte Service-Worker-Versionen (v3, v4, v5) hatten
    // kaputte Cache-Strategien — die JS-Bundles + Karten-Tiles wurden mit Muell
    // zwischengespeichert (z.B. wurde "/" als Fallback fuer 404 zurueckgegeben).
    // Wenn der Heal-Marker noch nicht "v6" ist, einmal komplett aufraeumen und neuladen.
    async function heal() {
      try {
        // NIEMALS auf /login heilen — der Reload mitten im Formular wuerde Login killen.
        // Genauso wenig auf POST-aehnlichen Pfaden.
        const path = location.pathname || "";
        if (path.startsWith("/login") || path.startsWith("/api/")) return false;

        const marker = localStorage.getItem("vv-sw-heal");
        if (marker === "v6") return false; // schon geheilt
        // Pruefe ob ueberhaupt ein alter SW aktiv ist
        const regs = await navigator.serviceWorker.getRegistrations();
        const had = regs.length > 0;
        if (!had) {
          // Frischer Browser, nichts zu heilen
          localStorage.setItem("vv-sw-heal", "v6");
          return false;
        }
        // Alle SW unregistrieren + alle Caches loeschen
        for (const r of regs) { try { await r.unregister(); } catch {} }
        if ("caches" in window) {
          const ks = await caches.keys();
          await Promise.all(ks.map((k) => caches.delete(k)));
        }
        // Karten-Stil-Praeferenz auf neuen Default zuruecksetzen
        try { localStorage.removeItem("vv-tile-style"); } catch {}
        localStorage.setItem("vv-sw-heal", "v6");
        // Sanft neu laden — der frische SW v6 wird beim naechsten Visit gezogen
        location.reload();
        return true;
      } catch { return false; }
    }

    async function setup() {
      try {
        // ZUERST: Selbstheilung. Bei Reload kommt useEffect erneut — dann ist Marker gesetzt.
        const healed = await heal();
        if (healed) return; // Reload laeuft, kein register noetig

        reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

        // Update-Erkennung: wenn ein neuer SW im "waiting"-Zustand sitzt, Toast zeigen
        if (reg.waiting) {
          setUpdateReady(true);
          setWaitingReg(reg);
        }
        reg.addEventListener("updatefound", () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener("statechange", () => {
            if (nw.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateReady(true);
              setWaitingReg(reg);
            }
          });
        });

        // Alle 30 Min auf Updates checken (während App offen ist)
        intervalId = setInterval(() => { reg?.update().catch(() => {}); }, 30 * 60_000);
      } catch {}
    }
    setup();

    // Beim Reload nach skipWaiting: einmal Seite neu laden
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    return () => { if (intervalId) clearInterval(intervalId); };
  }, []);

  function applyUpdate() {
    if (waitingReg?.waiting) {
      waitingReg.waiting.postMessage({ type: "vv-skip-waiting" });
    } else {
      window.location.reload();
    }
  }

  if (!updateReady) return null;

  return (
    <div style={{
      position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)",
      zIndex: 9999, background: "#0a0420", color: "#fff",
      border: "1px solid #ff3e9d", borderRadius: 12,
      padding: "10px 14px",
      boxShadow: "0 10px 24px rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", gap: 10,
      fontFamily: "Arial, sans-serif", fontSize: 13,
      maxWidth: "94vw",
    }}>
      <span style={{ fontSize: 20 }}>✨</span>
      <span style={{ flex: 1 }}>Neue Version verfügbar</span>
      <button type="button" onClick={applyUpdate}
        style={{
          padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
          background: "linear-gradient(135deg, #ff3e9d, #be185d)",
          color: "#fff", fontWeight: 700, fontSize: 12,
        }}>
        Aktualisieren
      </button>
      <button type="button" onClick={() => setUpdateReady(false)}
        title="Später"
        style={{
          background: "transparent", border: "none", color: "rgba(255,255,255,0.5)",
          cursor: "pointer", fontSize: 18, padding: 0,
        }}>
        ✖
      </button>
    </div>
  );
}
