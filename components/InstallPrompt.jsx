"use client";

import { useEffect, useState } from "react";

// Registriert den Service Worker und zeigt einen freundlichen
// "Zur Startseite hinzufügen"-Hinweis (Android) bzw. iOS-Anleitung.
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // Schon installiert? Dann nichts zeigen.
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    if (standalone) return;

    if (sessionStorage.getItem("vv_install_dismissed")) return;

    // Android / Chrome: beforeinstallprompt abfangen
    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    // Manueller Trigger (z.B. vom Messenger-Button)
    const onManual = () => { setShow(true); try { sessionStorage.removeItem("vv_install_dismissed"); } catch {} };
    window.addEventListener("vv-pwa-install", onManual);

    // iOS Safari: kein beforeinstallprompt -> eigene Anleitung
    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    const isSafari = /safari/i.test(window.navigator.userAgent) && !/crios|fxios/i.test(window.navigator.userAgent);
    if (isIos && isSafari) {
      const t = setTimeout(() => { setIosHint(true); setShow(true); }, 2500);
      return () => { clearTimeout(t); window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("vv-pwa-install", onManual); };
    }

    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("vv-pwa-install", onManual); };
  }, []);

  function dismiss() {
    setShow(false);
    try { sessionStorage.setItem("vv_install_dismissed", "1"); } catch {}
  }

  async function install() {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  }

  if (!show) return null;

  return (
    <div className="vv-install">
      <span className="vv-install-icon">📲</span>
      <div className="vv-install-text">
        {iosHint ? (
          <>
            <strong>VibeVibo aufs Handy holen!</strong>
            <span>Tippe unten auf <b>Teilen</b> ⬆️ → „<b>Zum Home-Bildschirm</b>"</span>
          </>
        ) : (
          <>
            <strong>VibeVibo als App?</strong>
            <span>Fügs deinem Startbildschirm hinzu – wie eine echte App!</span>
          </>
        )}
      </div>
      {!iosHint && deferred && (
        <button type="button" className="vv-install-btn" onClick={install}>Hinzufügen</button>
      )}
      <button type="button" className="vv-install-close" onClick={dismiss} aria-label="Schließen">×</button>
    </div>
  );
}
