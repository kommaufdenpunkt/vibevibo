#!/usr/bin/env node
// DB-Patch: Bildertool — 3 Tabellen + Default-Ablehnungs-Templates.
// Idempotent.

import Database from "better-sqlite3";
import { resolve, dirname } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
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
if (!dbPath) { console.error("❌ DB nicht gefunden."); process.exit(1); }

console.log("📦 DB:", dbPath);
const db = new Database(dbPath);

function tableExists(name) {
  return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name);
}

// 1) image_moderation_queue
if (!tableExists("image_moderation_queue")) {
  db.exec(`
    CREATE TABLE image_moderation_queue (
      id                      INTEGER PRIMARY KEY AUTOINCREMENT,
      image_url               TEXT NOT NULL,
      thumbnail_url           TEXT DEFAULT NULL,
      source_type             TEXT NOT NULL DEFAULT 'other',
      source_ref              TEXT DEFAULT NULL,
      uploaded_by_user_id     INTEGER NOT NULL,
      uploaded_at             INTEGER NOT NULL,
      status                  TEXT NOT NULL DEFAULT 'pending',
      reviewed_by_mod_id      INTEGER DEFAULT NULL,
      reviewed_at             INTEGER DEFAULT NULL,
      rejection_reason_code   TEXT DEFAULT NULL,
      rejection_reason_text   TEXT DEFAULT NULL,
      fidolin_auto            INTEGER DEFAULT 0
    );
    CREATE INDEX idx_imgq_status_uploaded ON image_moderation_queue(status, uploaded_at DESC);
    CREATE INDEX idx_imgq_user            ON image_moderation_queue(uploaded_by_user_id, uploaded_at DESC);
    CREATE INDEX idx_imgq_reviewed        ON image_moderation_queue(reviewed_at DESC);
  `);
  console.log("✅ Tabelle 'image_moderation_queue' + 3 Indizes.");
} else console.log("ℹ image_moderation_queue existiert.");

// 2) image_akte_entries
if (!tableExists("image_akte_entries")) {
  db.exec(`
    CREATE TABLE image_akte_entries (
      id                      INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id                 INTEGER NOT NULL,
      queue_id                INTEGER DEFAULT NULL,
      image_url               TEXT NOT NULL,
      thumbnail_url           TEXT DEFAULT NULL,
      source_type             TEXT DEFAULT NULL,
      rejection_reason_code   TEXT DEFAULT NULL,
      rejection_reason_text   TEXT DEFAULT NULL,
      rejected_by_mod_id      INTEGER DEFAULT NULL,
      rejected_at             INTEGER NOT NULL,
      fidolin_auto            INTEGER DEFAULT 0
    );
    CREATE INDEX idx_imgakte_user ON image_akte_entries(user_id, rejected_at DESC);
  `);
  console.log("✅ Tabelle 'image_akte_entries' + 1 Index.");
} else console.log("ℹ image_akte_entries existiert.");

// 3) image_rejection_templates
if (!tableExists("image_rejection_templates")) {
  db.exec(`
    CREATE TABLE image_rejection_templates (
      code         TEXT PRIMARY KEY,
      label        TEXT NOT NULL,
      dm_subject   TEXT NOT NULL,
      dm_body      TEXT NOT NULL,
      category     TEXT NOT NULL DEFAULT 'warning',
      order_index  INTEGER DEFAULT 100
    );
  `);
  console.log("✅ Tabelle 'image_rejection_templates'.");
} else console.log("ℹ image_rejection_templates existiert.");

// 4) Default-Templates einfügen (nur wenn leer)
const tplCount = db.prepare("SELECT COUNT(*) as c FROM image_rejection_templates").get().c;
if (tplCount === 0) {
  const ins = db.prepare(
    `INSERT INTO image_rejection_templates (code, label, dm_subject, dm_body, category, order_index)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const templates = [
    {
      code: "too_revealing",
      label: "🍑 Zu freizügig",
      dm_subject: "Dein Bild wurde abgelehnt",
      dm_body: "Hi! Dein hochgeladenes Bild war für unsere Plattform zu freizügig. Bitte beachte unsere AGB und lade ein angemessenes Bild hoch.\n\n— Das VibeVibo-Team",
      category: "warning",
      order_index: 10,
    },
    {
      code: "unrecognizable",
      label: "🌫 Unkennbar / unscharf",
      dm_subject: "Dein Bild ist nicht erkennbar",
      dm_body: "Hi! Wir konnten dich auf dem hochgeladenen Bild nicht klar erkennen. Bitte lade ein schärferes Bild hoch, auf dem du gut sichtbar bist.\n\n— Das VibeVibo-Team",
      category: "info",
      order_index: 20,
    },
    {
      code: "fake_stock",
      label: "🤖 Fake / Stock-Foto / aus dem Internet",
      dm_subject: "Bitte nur eigene Bilder hochladen",
      dm_body: "Hi! Dein Bild scheint kein eigenes Foto zu sein (z.B. Stock-Foto, aus dem Internet, KI-generiert). Bitte lade nur Bilder hoch, die wirklich dich zeigen.\n\n— Das VibeVibo-Team",
      category: "warning",
      order_index: 30,
    },
    {
      code: "wrong_age",
      label: "🚸 Alter passt nicht",
      dm_subject: "Bitte aktuelles Bild hochladen",
      dm_body: "Hi! Auf dem hochgeladenen Bild ist eine Person zu sehen, die nicht zu deinem angegebenen Alter passt. Bitte lade ein aktuelles Bild von dir hoch.\n\n— Das VibeVibo-Team",
      category: "warning",
      order_index: 40,
    },
    {
      code: "identity_fraud",
      label: "🎭 Identitätsbetrug",
      dm_subject: "Verdacht auf Identitätsbetrug",
      dm_body: "Hi! Es gibt Hinweise darauf, dass das hochgeladene Bild eine andere Person zeigt, als die du vorgibst zu sein. Bei wiederholtem Verstoß folgt ein Permabann.\n\n— Das VibeVibo-Team",
      category: "danger",
      order_index: 50,
    },
    {
      code: "inappropriate",
      label: "⛔ Unangemessen",
      dm_subject: "Dein Bild verstößt gegen die Community-Regeln",
      dm_body: "Hi! Das hochgeladene Bild verstößt gegen unsere Community-Regeln (z.B. Gewalt, Diskriminierung, illegale Inhalte). Bitte lies unsere AGB.\n\n— Das VibeVibo-Team",
      category: "danger",
      order_index: 60,
    },
    {
      code: "drugs",
      label: "💊 Drogen / Waffen sichtbar",
      dm_subject: "Verbotene Inhalte erkannt",
      dm_body: "Hi! Auf deinem Bild sind Drogen, Waffen oder andere verbotene Inhalte zu sehen. Solche Bilder sind auf VibeVibo nicht erlaubt.\n\n— Das VibeVibo-Team",
      category: "danger",
      order_index: 70,
    },
    {
      code: "other",
      label: "✏️ Sonstiges (eigener Text)",
      dm_subject: "Dein Bild wurde abgelehnt",
      dm_body: "Hi! Dein Bild wurde abgelehnt. Grund:\n\n{custom}\n\n— Das VibeVibo-Team",
      category: "info",
      order_index: 999,
    },
  ];
  for (const t of templates) {
    ins.run(t.code, t.label, t.dm_subject, t.dm_body, t.category, t.order_index);
  }
  console.log(`✅ ${templates.length} Default-Ablehnungs-Templates eingefügt.`);
} else {
  console.log(`ℹ ${tplCount} Templates existieren bereits.`);
}

db.close();
console.log("\n🚀 Fertig.");
