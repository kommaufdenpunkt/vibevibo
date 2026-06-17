#!/usr/bin/env node
// 🩹 Schema-Repair — ensure-Spalten direkt, robust gegen vorherige Failures.
// Jede addColumn ist eigenständig try/catched, damit eine fehlschlagende nicht
// die anderen blockiert.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK = "/* 🩹 SCHEMA_REPAIR_V1 */";

let src = readFileSync(DB_PATH, "utf-8");

if (src.includes(MARK)) {
  console.log("✓ Schema-Repair schon drin.");
  process.exit(0);
}

// Wir hängen einen Block direkt nach `_db.pragma("foreign_keys = ON");` ein.
// Diese Stelle ist garantiert vor allen Tabellen-Aktionen und läuft pro Init.
const ANCHOR = `_db.pragma("foreign_keys = ON");`;
if (!src.includes(ANCHOR)) {
  console.error("✗ Anker pragma foreign_keys nicht gefunden");
  process.exit(1);
}

const REPAIR = `${ANCHOR}

  ${MARK}
  // 🩹 Schema-Repair — JEDE Spalten-Ergänzung in eigenem try-Block,
  // damit eine fehlschlagende (z.B. wenn Tabelle nicht existiert)
  // die anderen NICHT blockiert.
  const _ensureCol = (table, col, type) => {
    try {
      const cols = _db.prepare(\`PRAGMA table_info(\${table})\`).all();
      if (cols.length === 0) return; // Tabelle existiert nicht — skip
      if (cols.some((c) => c.name === col)) return; // Spalte schon da
      _db.exec(\`ALTER TABLE \${table} ADD COLUMN \${col} \${type}\`);
    } catch (e) {
      // schweigend ignorieren — Hauptsache nichts crasht
    }
  };
  // groups
  _ensureCol("groups", "category", "TEXT DEFAULT 'sonstiges'");
  _ensureCol("groups", "sparkles", "TEXT DEFAULT '[]'");
  _ensureCol("groups", "boost_total", "INTEGER DEFAULT 0");
  _ensureCol("groups", "boost_until", "INTEGER DEFAULT 0");
  _ensureCol("groups", "welcome_post", "TEXT DEFAULT ''");
  _ensureCol("groups", "motto", "TEXT DEFAULT ''");
  _ensureCol("groups", "rules", "TEXT DEFAULT ''");
  _ensureCol("groups", "cover_emoji", "TEXT DEFAULT ''");
  _ensureCol("groups", "join_mode", "TEXT DEFAULT 'open'");
  _ensureCol("groups", "theme_color", "TEXT DEFAULT '#ec4899'");
  // group_members
  _ensureCol("group_members", "officer_perms", "TEXT DEFAULT '[]'");
  // com_threads (wenn da)
  _ensureCol("com_threads", "fidolin_score", "INTEGER DEFAULT 0");
  _ensureCol("com_threads", "fidolin_action", "TEXT DEFAULT 'none'");
  // com_thread_replies
  _ensureCol("com_thread_replies", "fidolin_score", "INTEGER DEFAULT 0");
  _ensureCol("com_thread_replies", "fidolin_action", "TEXT DEFAULT 'none'");
  // group_posts
  _ensureCol("group_posts", "fidolin_score", "INTEGER DEFAULT 0");
  _ensureCol("group_posts", "fidolin_action", "TEXT DEFAULT 'none'");`;

src = src.replace(ANCHOR, REPAIR);
writeFileSync(DB_PATH, src);
console.log("✓ Schema-Repair-Block in db() Init eingefügt.");
console.log("  Beim nächsten Server-Start werden alle fehlenden Spalten ergänzt.");
