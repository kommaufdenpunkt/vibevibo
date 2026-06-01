"use client";

import { useEffect } from "react";

// Abschreckungs-Maßnahmen gegen Screenshots/Mitschnitte.
// WICHTIG: Im Web technisch NICHT 100% verhinderbar - das hier erschwert es nur.
// Der echte Schutz für Sprachnachrichten ist das serverseitige Löschen nach Anhören.
export default function ScreenshotGuard() {
  useEffect(() => {
    // Bei Tab-Wechsel / App-Hintergrund sensiblen Inhalt verwischen
    // (fängt viele automatische Screenshot-Vorschauen ab)
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        document.body.classList.add("vv-hide-sensitive");
      } else {
        document.body.classList.remove("vv-hide-sensitive");
      }
    };
    document.addEventListener("visibilitychange", onVis);

    // Rechtsklick / "Bild speichern" auf Chat erschweren
    const onContext = (e) => {
      if (e.target.closest && e.target.closest(".vv-chat-messages")) {
        e.preventDefault();
      }
    };
    document.addEventListener("contextmenu", onContext);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      document.removeEventListener("contextmenu", onContext);
    };
  }, []);

  return null;
}
