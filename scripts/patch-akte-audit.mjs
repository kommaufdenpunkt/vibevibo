#!/usr/bin/env node
// DB-Patch: legt Tabelle `akte_access_log` an für Userakte-Zugriffs-Protokoll.
// Idempotent — überspringt wenn Tabelle existiert.

import Database from "better-sqlite3";
import { resolve, dirname } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");

function findDb() {
  const env = process.env.DB_PATH || process.env.VV_DB_PATH;
  if (env && existsSync(env)) return env;
  const candidates = [
    resolve(ROOT, "data/db.sqlite"),
    resolve(ROOT, "data/vibevibo.db"),
    "/data/db.sqlite",
    "/data/vibevibo.db",
    "/app/data/db.sqlite",
  ];
  for (const p of candidates) if (existsSync(p)) return p;
  return null;
}

const dbPath = findDb();
if (!dbPath) {
  console.error("❌ DB nicht gefunden. Setze DB_PATH env var.");
  process.exit(1);
}

console.log("📦 DB:", dbPath);
const db = new Database(dbPath);

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='akte_access_log'").all();

if (tables.length === 0) {
  db.exec(`
    CREATE TABLE akte_access_log (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      mod_id          INTEGER NOT NULL,
      target_user_id  INTEGER NOT NULL,
      reason          TEXT NOT NULL,
      accessed_at     INTEGER NOT NULL,
      ip              TEXT DEFAULT '',
      user_agent      TEXT DEFAULT ''
    );
    CREATE INDEX idx_akte_log_mod_time      ON akte_access_log(mod_id, accessed_at DESC);
    CREATE INDEX idx_akte_log_target_time   ON akte_access_log(target_user_id, accessed_at DESC);
    CREATE INDEX idx_akte_log_time          ON akte_access_log(accessed_at DESC);
  `);
  console.log("✅ Tabelle 'akte_access_log' angelegt + 3 Indizes.");
} else {
  console.log("ℹ Tabelle 'akte_access_log' existiert bereits — übersprungen.");
}

db.close();
console.log("\n🚀 Fertig. Patch ist idempotent — kann jederzeit wieder ausgeführt werden.");
