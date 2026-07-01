// 📝 Fügt den Zeitkapsel-Eintrag oben in MANUAL_CHANGELOG ein. Idempotent.

import fs from "node:fs";
import path from "node:path";

const F = path.join(process.cwd(), "lib", "changelog-manual.js");
if (!fs.existsSync(F)) { console.error("⚠ lib/changelog-manual.js nicht gefunden."); process.exit(0); }

let src = fs.readFileSync(F, "utf8");
if (src.includes("zeitkapsel-launch")) {
  console.log("ℹ Zeitkapsel-Changelog bereits vorhanden — nichts zu tun.");
  process.exit(0);
}

const marker = "export const MANUAL_CHANGELOG = [";
if (!src.includes(marker)) { console.error("⚠ MANUAL_CHANGELOG-Anfang nicht gefunden."); process.exit(1); }

const entry = `
  {
    id: "zeitkapsel-launch",
    at: "2026-07-01T21:00+02:00",
    emoji: "⏳",
    title: "Neu: Zeitkapsel — schreib deinem zukünftigen Ich! Deine Nachricht wird versiegelt und öffnet sich erst am Zieldatum (in 1 Monat, 6 Monaten, 1 Jahr oder eigenem Datum). Jetzt ausprobieren unter /zeitkapsel.",
  },`;

src = src.replace(marker, marker + entry);
fs.writeFileSync(F, src, "utf8");
console.log("✅ /neu-Eintrag ergänzt: Zeitkapsel");
