#!/usr/bin/env node
// 📲 QuickDock: "Apps"-Eintrag (→ /apps App-Center) als 5. Sprungbrett ergänzen.
// Idempotent.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const FILE = join(ROOT, "components", "QuickDock.jsx");

let src = readFileSync(FILE, "utf-8");

if (src.includes('href: "/apps"')) {
  console.log("• QuickDock-Apps-Eintrag schon vorhanden.");
  console.log("\n✓ Nichts zu tun.");
  process.exit(0);
}

const ANCHOR = `  { href: "/coms",      icon: "🌐", label: "Coms" },`;
if (!src.includes(ANCHOR)) {
  console.error("✗ Anker (Coms-Eintrag) nicht gefunden — Abbruch.");
  process.exit(1);
}

src = src.replace(
  ANCHOR,
  `${ANCHOR}\n  { href: "/apps",      icon: "📲", label: "Apps" },`
);

writeFileSync(FILE, src);
console.log("✓ QuickDock: 📲 Apps → /apps ergänzt.");
console.log("\n✅ QuickDock.jsx gepatcht.");
