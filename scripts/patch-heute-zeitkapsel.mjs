// ⏳ Fügt die Zeitkapsel-Kachel ins /heute-Dashboard ein (Default-Tiles + APP_TILES). Idempotent.

import fs from "node:fs";
import path from "node:path";

const F = path.join(process.cwd(), "app", "heute", "page.jsx");
if (!fs.existsSync(F)) { console.error("⚠ app/heute/page.jsx nicht gefunden."); process.exit(0); }

let src = fs.readFileSync(F, "utf8");
if (src.includes('"/zeitkapsel"')) {
  console.log("ℹ Zeitkapsel-Kachel bereits vorhanden — nichts zu tun.");
  process.exit(0);
}

let changed = 0;

// 1) In die Default-Kacheln (fallback) nach „Freunde“ einfügen
const anchor1 = 'icon: "👯", title: "Freunde", sub: "Wer ist online?" },';
if (src.includes(anchor1)) {
  src = src.replace(anchor1, anchor1 + '\n            { href: "/zeitkapsel", color1: "#a855f7", color2: "#6d28d9", icon: "⏳", title: "Zeitkapsel", sub: "Brief ans Ich" },');
  changed++;
}

// 2) In die pinnbare App-Liste (APP_TILES) aufnehmen
const anchor2 = 'const APP_TILES = {';
if (src.includes(anchor2)) {
  src = src.replace(anchor2, anchor2 + '\n    zeitkapsel:  { href: "/zeitkapsel", icon: "⏳", title: "Zeitkapsel", sub: "Brief ans Ich", color1: "#a855f7", color2: "#6d28d9" },');
  changed++;
}

if (!changed) { console.error("⚠ Anker nicht gefunden — nichts geändert."); process.exit(1); }
fs.writeFileSync(F, src, "utf8");
console.log(`✅ /heute: Zeitkapsel-Kachel eingefügt (${changed} Stelle${changed > 1 ? "n" : ""}).`);
