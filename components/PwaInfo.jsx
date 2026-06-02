"use client";

// Erklärung was eine PWA ist + wie man sie installiert.
// Erkennt selbst ob iOS/Android, ob schon installiert, ob installierbar.

import { useEffect, useState } from "react";
import HelpCard from "./HelpCard";

export default function PwaInfo({
  appName = "VibeVibo",            // Anzeige-Name
  appEmoji = "📱",                  // Header-Emoji
  appPurpose = "deine Community",  // „… damit du XY immer dabei hast"
  id = "pwa-info",
}) {
  const [info, setInfo] = useState({ ios: false, installed: false });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent || "";
    const ios = /iPhone|iPad|iPod/.test(ua);
    const installed = window.matchMedia?.("(display-mode: standalone)").matches
      || window.navigator?.standalone === true;
    setInfo({ ios, installed });
  }, []);

  if (info.installed) {
    return (
      <HelpCard id={`${id}-installed`} title={`${appName} ist installiert ✅`} emoji={appEmoji} color="#22c55e">
        Du nutzt {appName} gerade als App — alles bleibt auf dem Home-Bildschirm.
        Du brauchst nicht jedes Mal den Browser zu öffnen.
      </HelpCard>
    );
  }

  return (
    <HelpCard id={id} title={`${appName} als App installieren`} emoji={appEmoji} color="#ec4899">
      <b>Was ist das?</b> {appName} kann wie eine ganz normale App auf deinem Handy laufen —
      mit eigenem Icon, ohne Adressleiste, schneller als der Browser. {appPurpose
        ? <>So hast du {appPurpose} immer mit einem Tap dabei.</>
        : null}
      <br/><br/>
      <b>Wie geht's?</b>
      {info.ios ? (
        <>
          <br/>
          1. Tippe unten in Safari auf das <b>Teilen-Symbol</b> (📤 Quadrat mit Pfeil nach oben).
          <br/>
          2. Scrolle runter, tippe auf <b>„Zum Home-Bildschirm"</b>.
          <br/>
          3. Bestätige mit <b>„Hinzufügen"</b> — fertig!
        </>
      ) : (
        <>
          <br/>
          1. Tippe oben in Chrome auf das <b>Menü</b> (⋮ drei Punkte).
          <br/>
          2. Wähle <b>„App installieren"</b> (oder „Zum Startbildschirm").
          <br/>
          3. Bestätige — fertig!
        </>
      )}
      <br/><br/>
      <b>Hinweis:</b> Du kannst auch <b>mehrere VibeVibo-Apps</b> nebeneinander installieren:
      <br/>
      💬 <b>VV Messenger</b> (auf <i>/messenger</i>) · 🐾 <b>Mein VIBO</b> (auf <i>/karte</i>) ·
      🎨 <b>VibeVibo Community</b> (Startseite). Jede hat ihr eigenes Icon.
    </HelpCard>
  );
}
