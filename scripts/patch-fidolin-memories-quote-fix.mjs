#!/usr/bin/env node
// 🎀 Hot-Fix: Fidolin-Memories — entfernt die zwei kaputten German-Quote-Pattern.
//
// Der ursprüngliche Patch hatte zwei Seed-Strings mit „...""-Mismatch
// (deutsches „ + ASCII " → schließt JS-String zu früh).
// Build crashed in db.js:11608. Dieser Patch ersetzt die zwei Zeilen direkt.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_FIX = "/* 🎀 FIDOLIN_MEMORIES_QUOTE_FIX_V1 */";

let src = readFileSync(DB_PATH, "utf-8");

if (src.includes(MARK_FIX)) {
  console.log("✓ Quote-Fix bereits drin — skip.");
  process.exit(0);
}

const REPLACEMENTS = [
  {
    bad:  `"Der iPod kam 2001 raus — „1000 Songs in deiner Tasche". Rad-Klick-Sound im Ohr 🤍"`,
    good: `"Der iPod kam 2001 raus — 1000 Songs in deiner Tasche. Rad-Klick-Sound im Ohr 🤍"`,
  },
  {
    bad:  `"1999: Britney Spears mit „Hit me baby one more time" 🎵 Welches Lied dudelt heute noch in eurem Kopf?"`,
    good: `"1999: Britney Spears mit Hit me baby one more time 🎵 Welches Lied dudelt heute noch in eurem Kopf?"`,
  },
];

let changed = 0;
for (const r of REPLACEMENTS) {
  if (src.includes(r.bad)) {
    src = src.replace(r.bad, r.good);
    changed++;
  }
}

if (changed === 0) {
  console.log("✓ Keine kaputten Pattern gefunden — vermutlich bereits gefixt.");
  // Marker trotzdem setzen, damit re-runs nicht nochmal suchen
  src = src.replace("// 🎀 FIDOLIN_MEMORIES_FN_V1", `// 🎀 FIDOLIN_MEMORIES_FN_V1\n${MARK_FIX}`);
} else {
  src = src.replace("// 🎀 FIDOLIN_MEMORIES_FN_V1", `// 🎀 FIDOLIN_MEMORIES_FN_V1\n${MARK_FIX}`);
}

writeFileSync(DB_PATH, src);
console.log(`✓ ${changed} kaputte Quote-Pattern korrigiert in db.js.`);
