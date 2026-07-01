// 💘 Fügt die „Heimlich verknallt"-Kachel ins /heute-Dashboard ein. Idempotent.

import fs from "node:fs";
import path from "node:path";

const F = path.join(process.cwd(), "app", "heute", "page.jsx");
if (!fs.existsSync(F)) { console.error("⚠ app/heute/page.jsx nicht gefunden."); process.exit(0); }

let src = fs.readFileSync(F, "utf8");
if (src.includes('"/verknallt"')) {
  console.log("ℹ Verknallt-Kachel bereits vorhanden — nichts zu tun.");
  process.exit(0);
}

let changed = 0;

// 1) Default-Kacheln (fallback) — nach „Freunde" einfügen
const anchor1 = 'icon: "👯", title: "Freunde", sub: "Wer ist online?" },';
if (src.includes(anchor1)) {
  src = src.replace(anchor1, anchor1 + '\n            { href: "/verknallt", color1: "#ec4899", color2: "#be123c", icon: "💘", title: "Verknallt", sub: "Heimlich wählen" },');
  changed++;
}

// 2) Pinnbare App-Liste (APP_TILES)
const anchor2 = 'const APP_TILES = {';
if (src.includes(anchor2)) {
  src = src.replace(anchor2, anchor2 + '\n    verknallt:   { href: "/verknallt", icon: "💘", title: "Verknallt", sub: "Heimlich wählen", color1: "#ec4899", color2: "#be123c" },');
  changed++;
}

if (!changed) { console.error("⚠ Anker nicht gefunden — nichts geändert."); process.exit(1); }
fs.writeFileSync(F, src, "utf8");
console.log(`✅ /heute: Verknallt-Kachel eingefügt (${changed} Stelle${changed > 1 ? "n" : ""}).`);
