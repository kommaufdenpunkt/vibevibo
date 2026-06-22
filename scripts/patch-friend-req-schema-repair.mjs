#!/usr/bin/env node
// 🚑 Schema-Repair: stellt sicher dass friend_requests-Tabelle in migrate() vorhanden ist.
//
// Hintergrund: Live-Production hat manchmal `no such table: friend_requests`-Fehler.
// Der ursprüngliche patch-friend-requests.mjs sollte die Tabelle anlegen,
// aber irgendwo zwischen Schema-Drift und mehreren Patches kann sie fehlen.
//
// Verhalten:
//   - Wenn `CREATE TABLE IF NOT EXISTS friend_requests` schon in db.js → no-op
//   - Sonst: injiziert in migrate() vor top_friends-Anker
//
// Idempotent dank Marker-Check.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_REPAIR = "/* 🚑 FRIEND_REQ_SCHEMA_REPAIR_V1 */";

let src = readFileSync(DB_PATH, "utf-8");

if (src.includes(MARK_REPAIR)) {
  console.log("✓ Repair-Marker bereits drin — skip.");
  process.exit(0);
}

// Tabelle ist bereits in db.js → nur Marker setzen, kein Schaden
if (/CREATE TABLE IF NOT EXISTS friend_requests/i.test(src)) {
  console.log("✓ friend_requests-CREATE existiert bereits — nur Marker setzen.");
  writeFileSync(DB_PATH, src + `\n${MARK_REPAIR}\n`);
  process.exit(0);
}

// Tabelle FEHLT — injizieren in migrate() vor top_friends-Anker
const ANCHOR = "CREATE TABLE IF NOT EXISTS top_friends (";
if (!src.includes(ANCHOR)) {
  console.error("✗ Anker top_friends fehlt — kann nicht reparieren.");
  console.error("✗ Bitte db.js manuell prüfen.");
  process.exit(1);
}

const INJECT = `${MARK_REPAIR}
    CREATE TABLE IF NOT EXISTS friend_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      to_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      decision_reason TEXT DEFAULT '',
      created_at INTEGER NOT NULL,
      decided_at INTEGER
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_fr_pending_pair
      ON friend_requests(from_id, to_id) WHERE status = 'pending';
    CREATE INDEX IF NOT EXISTS idx_fr_to_status ON friend_requests(to_id, status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_fr_from_status ON friend_requests(from_id, status, created_at DESC);

    ${ANCHOR}`;

src = src.replace(ANCHOR, INJECT);
writeFileSync(DB_PATH, src);
console.log("✓ friend_requests-Tabelle in migrate() repariert.");
console.log("✓ Beim nächsten Coolify-Deploy wird die Tabelle automatisch angelegt (CREATE TABLE IF NOT EXISTS).");
