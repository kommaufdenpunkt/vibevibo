#!/usr/bin/env node
// 🔧 Fix: db() exportieren für direkten Zugriff (für performance/route.js).
// Idempotent — fügt nur an wenn noch nicht vorhanden.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK = "/* 🔧 EXPORT_DB_V1 */";

let src = readFileSync(DB_PATH, "utf-8");

if (src.includes(MARK)) {
  console.log("✓ db-Export bereits vorhanden.");
  process.exit(0);
}

src += `

${MARK}
// 🔧 db() für externe Zugriffe exportieren (Performance-Diagnose etc.)
export { db };
`;

writeFileSync(DB_PATH, src);
console.log("✓ export { db } an db.js angehängt.");
