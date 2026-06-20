#!/usr/bin/env node
// 🗑 finalizeAccountDeletion: SQLite-Syntax + N/A-Anzeige
//
// Fixes:
//   1. CONCAT(...) → ||  (SQLite kennt kein CONCAT)
//   2. display_name = 'N/A'  (statt "Gelöschter User #123")
//
// Gifts/Posts/DMs des gelöschten Users bleiben bestehen, weil User-Row nicht
// gelöscht wird → ON DELETE CASCADE auf gifts.from_user_id greift nicht.
// Empfänger sieht in Vitrine: 🌹 von N/A

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_FIX = "/* 🗑 DELETE_FINALIZE_SQLITE_FIX_V1 */";

let src = readFileSync(DB_PATH, "utf-8");

if (src.includes(MARK_FIX)) {
  console.log("✓ Finalize-Fix bereits drin — skip.");
  process.exit(0);
}

const OLD_DISPLAY  = `display_name = CONCAT('Gelöschter User #', id),`;
const NEW_DISPLAY  = `display_name = 'N/A', ${MARK_FIX}`;
const OLD_NOTES    = `admin_notes = CONCAT(admin_notes, ' [Account gelöscht ', ?, ']')`;
const NEW_NOTES    = `admin_notes = COALESCE(admin_notes, '') || ' [Account gelöscht ' || ? || ']'`;

if (!src.includes(OLD_DISPLAY)) {
  console.error("✗ display_name CONCAT-Pattern nicht gefunden. Vielleicht schon manuell gefixt?");
  process.exit(1);
}
src = src.replace(OLD_DISPLAY, NEW_DISPLAY);

if (src.includes(OLD_NOTES)) {
  src = src.replace(OLD_NOTES, NEW_NOTES);
}

writeFileSync(DB_PATH, src);
console.log("✓ finalizeAccountDeletion gefixt: CONCAT → ||, display_name → 'N/A'.");
