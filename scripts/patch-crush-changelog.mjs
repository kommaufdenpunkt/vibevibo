// 📝 /neu-Updates: „Heimlich verknallt" eintragen + alle neuen Einträge auf
//    „Neu bei VibeVibo!" umbenennen (statt „Neu:"). Idempotent.

import fs from "node:fs";
import path from "node:path";

const F = path.join(process.cwd(), "lib", "changelog-manual.js");
if (!fs.existsSync(F)) { console.error("⚠ lib/changelog-manual.js nicht gefunden."); process.exit(0); }

let src = fs.readFileSync(F, "utf8");
const marker = "export const MANUAL_CHANGELOG = [";
if (!src.includes(marker)) { console.error("⚠ MANUAL_CHANGELOG-Anfang nicht gefunden."); process.exit(1); }

let changed = 0;

// 1) Verknallt-Eintrag oben einfügen (Name: „Neu bei VibeVibo!")
if (!src.includes("verknallt-launch")) {
  const entry = `
  {
    id: "verknallt-launch",
    at: "2026-07-01T22:00+02:00",
    emoji: "💘",
    title: "Neu bei VibeVibo! Heimlich verknallt — wähl bis zu 5 Personen heimlich aus. Niemand erfährt es. Nur wenn ihr euch gegenseitig wählt, gibt's ein 💞 Match. Jetzt ausprobieren unter /verknallt.",
  },`;
  src = src.replace(marker, marker + entry);
  changed++;
  console.log("✅ /neu-Eintrag ergänzt: Heimlich verknallt");
} else {
  console.log("ℹ Verknallt-Eintrag bereits vorhanden.");
}

// 2) Namen umbenennen: „Neu:" → „Neu bei VibeVibo!" (nur in den Feature-Titeln)
const before = src;
src = src.replace(/title:\s*"Neu:\s*/g, 'title: "Neu bei VibeVibo! ');
if (src !== before) { changed++; console.log("✏️  Titel umbenannt auf „Neu bei VibeVibo!“"); }

if (changed === 0) { console.log("ℹ Nichts zu tun — alles schon aktuell."); process.exit(0); }
fs.writeFileSync(F, src, "utf8");
console.log("✅ lib/changelog-manual.js aktualisiert.");
