#!/usr/bin/env node
// 💬 Chat-Overlay-Politur: der große weiße Leerbereich (IMG_0713) kam von der
// fixen Höhe "min(78dvh, 620px)" in der Listen-Ansicht. Bei wenigen Freunden
// blieb darunter ein riesiges leeres Feld.
//
// Fix (idempotent):
//   • Listen-Ansicht: height "auto" (fit-content) statt fix 620px → kein Loch mehr.
//     Deckel bleibt durch das vorhandene maxHeight; minHeight gibt einen sauberen Boden.
//   • Chat-Ansicht bleibt unverändert (braucht feste Höhe fürs Nachrichten-Scrollfeld).

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const FILE = join(ROOT, "components", "ChatOverlay.jsx");

let src = readFileSync(FILE, "utf-8");
let changed = false;

const OLD = `          height: view === "chat" ? "78dvh" : "min(78dvh, 620px)",`;
const NEW = `          /* vv-overlay-autoheight */
          height: view === "chat" ? "78dvh" : "auto",
          minHeight: view === "chat" ? undefined : 240,`;

if (src.includes("/* vv-overlay-autoheight */")) {
  console.log("• Chat-Overlay-Höhe schon gepatcht.");
} else if (src.includes(OLD)) {
  src = src.replace(OLD, NEW);
  changed = true;
  console.log("✓ Listen-Höhe → auto (weißer Leerbereich entfernt).");
} else {
  console.error("✗ Anker für Overlay-Höhe nicht gefunden — Abbruch (keine Änderung).");
  process.exit(1);
}

if (changed) {
  writeFileSync(FILE, src);
  console.log("\n✅ ChatOverlay.jsx gepatcht.");
} else {
  console.log("\n✓ Nichts zu tun.");
}
