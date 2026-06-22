#!/usr/bin/env node
// 🚑 Hotfix: Entfernt das in T1 versehentlich angefügte Duplikat-Block aus db.js
// (User-Block-Funktionen existierten bereits nativ ab Zeile ~1604!).
// Fügt nur die 2 wirklich fehlenden Helpers hinzu: countMyBlocks + getHiddenUsernames.
//
// Idempotent dank Marker.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_V1 = "// 🚫 USER_BLOCKS_FN_V1";
const MARK_TABLE = "/* 🚫 USER_BLOCKS_TABLE_V1 */";
const MARK_CLEANUP = "// 🚑 USER_BLOCKS_CLEANUP_V1";

let src = readFileSync(DB_PATH, "utf-8");

if (src.includes(MARK_CLEANUP)) {
  console.log("✓ Cleanup-Marker bereits drin — skip.");
  process.exit(0);
}

let changed = false;

// 1) V1-Block am Ende komplett entfernen (alles ab Marker)
const v1Idx = src.indexOf(MARK_V1);
if (v1Idx >= 0) {
  // Suche nach dem Anfang der V1-Section (vorhergehender Kommentar "// 🚫 User-Block Helpers")
  // Wir nehmen einfach alles ab Marker minus eventuelle umgebende Leerzeilen
  let cutFrom = v1Idx;
  // Etwas davor zurück um auch evtl. eingebaute Leerzeilen mit zu schneiden
  while (cutFrom > 0 && src[cutFrom - 1] === "\n") cutFrom--;
  src = src.slice(0, cutFrom) + "\n";
  changed = true;
  console.log("✓ V1-Duplikat-Block aus db.js entfernt.");
}

// 2) Tabellen-Marker (Kommentar im CREATE TABLE-Block) entfernen falls drin
if (src.includes(MARK_TABLE)) {
  const esc = MARK_TABLE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  src = src.replace(new RegExp(esc + "\\s*", "g"), "");
  changed = true;
  console.log("✓ V1-Tabellen-Marker entfernt.");
}

// 3) NEU: nur die wirklich fehlenden Helpers anfügen
const NEW_HELPERS = `

${MARK_CLEANUP}
// 🚑 Block-Helpers-Cleanup: ergänzt 2 fehlende Funktionen.
// (addUserBlock/removeUserBlock/hasUserBlocked/isBlockedBetween/blockedUserIdsFor/listMyBlocks
//  existieren bereits nativ ab Zeile ~1604.)

export function countMyBlocks(userId) {
  if (!userId) return 0;
  try {
    return db().prepare("SELECT COUNT(*) AS c FROM user_blocks WHERE blocker_id = ?")
      .get(Number(userId)).c || 0;
  } catch { return 0; }
}

// Verborgene IDs → Usernames (für Feed-Stellen die mit Username filtern)
export function getHiddenUsernames(userId) {
  const ids = blockedUserIdsFor(userId);
  if (!ids || ids.size === 0) return new Set();
  const arr = Array.from(ids);
  const ph = arr.map(() => "?").join(",");
  try {
    const rows = db().prepare(\`SELECT username FROM users WHERE id IN (\${ph})\`).all(...arr);
    return new Set(rows.map((r) => String(r.username || "").toLowerCase()));
  } catch { return new Set(); }
}
`;

src += NEW_HELPERS;
changed = true;
console.log("✓ countMyBlocks + getHiddenUsernames angefügt.");

if (changed) {
  writeFileSync(DB_PATH, src);
  console.log("\n✓ db.js bereinigt (User-Blocks Cleanup).");
} else {
  console.log("\n✓ Nichts zu tun.");
}
