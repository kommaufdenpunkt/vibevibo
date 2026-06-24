// 🖼 Image-Moderation Helpers
//   • enqueueImageForReview()       — beim Upload aus Upload-Endpoints aufrufen
//   • listPendingImages()           — Queue für MCP-Feed
//   • listFidolinAutoRejects()      — Bilder die Fidolin direkt geblockt hat
//   • revertAutoReject()            — Mod überstimmt Fidolin: Akte raus + Korrektur-DM
//   • approveImage() / rejectImage()  — Mod-Aktionen
//   • listAkteForUser()             — Bild-Akte pro User
//   • listRejectionTemplates()      — Dropdown-Inhalt
//
// Bei Reject: System-DM geht automatisch an den User raus (via lib/systemDms.js)
// und Bild wandert in image_akte_entries.
//
// 🔧 Schema wird LAZY beim ersten DB-Zugriff erstellt (idempotent).

import Database from "better-sqlite3";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { sendSystemDM } from "./systemDms.js";

function findDbPath() {
  const env = process.env.DB_PATH || process.env.VV_DB_PATH;
  if (env && existsSync(env)) return env;
  const cwd = process.cwd();
  const candidates = [
    resolve(cwd, "data/db.sqlite"),
    resolve(cwd, "data/vibevibo.db"),
    "/data/db.sqlite",
    "/data/vibevibo.db",
    "/app/data/db.sqlite",
  ];
  for (const p of candidates) if (existsSync(p)) return p;
  throw new Error("imageModeration: DB nicht gefunden.");
}

let _db = null;
let _schemaReady = false;

function db() {
  if (!_db) _db = new Database(findDbPath());
  if (!_schemaReady) {
    ensureImageModerationSchema(_db);
    _schemaReady = true;
  }
  return _db;
}

function tableExists(database, name) {
  return !!database.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
  ).get(name);
}

export function ensureImageModerationSchema(database) {
  if (!tableExists(database, "image_moderation_queue")) {
    database.exec(`
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
  }

  if (!tableExists(database, "image_akte_entries")) {
    database.exec(`
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
  }

  if (!tableExists(database, "image_rejection_templates")) {
    database.exec(`
      CREATE TABLE image_rejection_templates (
        code         TEXT PRIMARY KEY,
        label        TEXT NOT NULL,
        dm_subject   TEXT NOT NULL,
        dm_body      TEXT NOT NULL,
        category     TEXT NOT NULL DEFAULT 'warning',
        order_index  INTEGER DEFAULT 100
      );
    `);
  }

  const tplCount = database.prepare(
    "SELECT COUNT(*) as c FROM image_rejection_templates"
  ).get().c;
  if (tplCount === 0) {
    const ins = database.prepare(
      `INSERT INTO image_rejection_templates (code, label, dm_subject, dm_body, category, order_index)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    const templates = [
      { code: "too_revealing",  label: "🍑 Zu freizügig",
        dm_subject: "Dein Bild wurde abgelehnt",
        dm_body: "Hi! Dein hochgeladenes Bild war für unsere Plattform zu freizügig. Bitte beachte unsere AGB und lade ein angemessenes Bild hoch.\n\n— Das VibeVibo-Team",
        category: "warning", order_index: 10 },
      { code: "unrecognizable", label: "🌫 Unkennbar / unscharf",
        dm_subject: "Dein Bild ist nicht erkennbar",
        dm_body: "Hi! Wir konnten dich auf dem hochgeladenen Bild nicht klar erkennen. Bitte lade ein schärferes Bild hoch, auf dem du gut sichtbar bist.\n\n— Das VibeVibo-Team",
        category: "info", order_index: 20 },
      { code: "fake_stock",     label: "🤖 Fake / Stock-Foto / aus dem Internet",
        dm_subject: "Bitte nur eigene Bilder hochladen",
        dm_body: "Hi! Dein Bild scheint kein eigenes Foto zu sein (z.B. Stock-Foto, aus dem Internet, KI-generiert). Bitte lade nur Bilder hoch, die wirklich dich zeigen.\n\n— Das VibeVibo-Team",
        category: "warning", order_index: 30 },
      { code: "wrong_age",      label: "🚸 Alter passt nicht",
        dm_subject: "Bitte aktuelles Bild hochladen",
        dm_body: "Hi! Auf dem hochgeladenen Bild ist eine Person zu sehen, die nicht zu deinem angegebenen Alter passt. Bitte lade ein aktuelles Bild von dir hoch.\n\n— Das VibeVibo-Team",
        category: "warning", order_index: 40 },
      { code: "identity_fraud", label: "🎭 Identitätsbetrug",
        dm_subject: "Verdacht auf Identitätsbetrug",
        dm_body: "Hi! Es gibt Hinweise darauf, dass das hochgeladene Bild eine andere Person zeigt, als die du vorgibst zu sein. Bei wiederholtem Verstoß folgt ein Permabann.\n\n— Das VibeVibo-Team",
        category: "danger", order_index: 50 },
      { code: "inappropriate",  label: "⛔ Unangemessen",
        dm_subject: "Dein Bild verstößt gegen die Community-Regeln",
        dm_body: "Hi! Das hochgeladene Bild verstößt gegen unsere Community-Regeln (z.B. Gewalt, Diskriminierung, illegale Inhalte). Bitte lies unsere AGB.\n\n— Das VibeVibo-Team",
        category: "danger", order_index: 60 },
      { code: "drugs",          label: "💊 Drogen / Waffen sichtbar",
        dm_subject: "Verbotene Inhalte erkannt",
        dm_body: "Hi! Auf deinem Bild sind Drogen, Waffen oder andere verbotene Inhalte zu sehen. Solche Bilder sind auf VibeVibo nicht erlaubt.\n\n— Das VibeVibo-Team",
        category: "danger", order_index: 70 },
      { code: "other",          label: "✏️ Sonstiges (eigener Text)",
        dm_subject: "Dein Bild wurde abgelehnt",
        dm_body: "Hi! Dein Bild wurde abgelehnt. Grund:\n\n{custom}\n\n— Das VibeVibo-Team",
        category: "info", order_index: 999 },
    ];
    for (const t of templates) {
      ins.run(t.code, t.label, t.dm_subject, t.dm_body, t.category, t.order_index);
    }
  }
}

const VALID_SOURCES = ["profile", "buschfunk", "feed", "comment", "album", "avatar", "other"];

export function enqueueImageForReview({
  imageUrl,
  thumbnailUrl = null,
  sourceType = "other",
  sourceRef = null,
  uploadedByUserId,
  fidolinAuto = false,
}) {
  if (!imageUrl) throw new Error("imageUrl Pflicht.");
  if (!uploadedByUserId) throw new Error("uploadedByUserId Pflicht.");
  if (!VALID_SOURCES.includes(sourceType)) sourceType = "other";

  const r = db().prepare(
    `INSERT INTO image_moderation_queue
      (image_url, thumbnail_url, source_type, source_ref, uploaded_by_user_id,
       uploaded_at, status, fidolin_auto)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`
  ).run(imageUrl, thumbnailUrl, sourceType, sourceRef, uploadedByUserId, Date.now(), fidolinAuto ? 1 : 0);
  return Number(r.lastInsertRowid);
}

export function listPendingImages({ limit = 50, offset = 0 } = {}) {
  return db().prepare(
    `SELECT q.*, u.username as uploader_username, u.display_name as uploader_display
     FROM image_moderation_queue q
     LEFT JOIN users u ON u.id = q.uploaded_by_user_id
     WHERE q.status = 'pending'
     ORDER BY q.uploaded_at DESC
     LIMIT ? OFFSET ?`
  ).all(Math.min(Math.max(limit, 1), 200), Math.max(offset, 0));
}

export function getPendingImageById(id) {
  return db().prepare(
    `SELECT q.*, u.username as uploader_username, u.display_name as uploader_display
     FROM image_moderation_queue q
     LEFT JOIN users u ON u.id = q.uploaded_by_user_id
     WHERE q.id = ?`
  ).get(id);
}

export function countPendingImages() {
  return db().prepare("SELECT COUNT(*) as c FROM image_moderation_queue WHERE status='pending'").get().c;
}

// 🤖 Liste aller Fidolin-Auto-Rejects (Akte-Einträge mit fidolin_auto=1).
// Mod kann diese sichten und ggf. überstimmen.
export function listFidolinAutoRejects({ limit = 50, offset = 0 } = {}) {
  return db().prepare(
    `SELECT a.*, u.username as uploader_username, u.display_name as uploader_display
     FROM image_akte_entries a
     LEFT JOIN users u ON u.id = a.user_id
     WHERE a.fidolin_auto = 1
     ORDER BY a.rejected_at DESC
     LIMIT ? OFFSET ?`
  ).all(Math.min(Math.max(limit, 1), 200), Math.max(offset, 0));
}

export function countFidolinAutoRejects() {
  return db().prepare(
    "SELECT COUNT(*) as c FROM image_akte_entries WHERE fidolin_auto=1"
  ).get().c;
}

export function getAkteEntryById(id) {
  return db().prepare(
    `SELECT a.*, u.username as uploader_username, u.display_name as uploader_display
     FROM image_akte_entries a
     LEFT JOIN users u ON u.id = a.user_id
     WHERE a.id = ?`
  ).get(id);
}

// 🔄 Mod überstimmt Fidolin-Auto-Reject:
//   • Akte-Eintrag löschen (User ist „freigesprochen")
//   • Wenn ein Queue-Eintrag verlinkt ist: Status auf 'approved' setzen
//   • Orange Korrektur-System-DM an den User schicken
export function revertAutoReject({ akteId, modId, customMessage = null }) {
  const entry = getAkteEntryById(akteId);
  if (!entry) throw new Error("Akte-Eintrag nicht gefunden.");
  if (!entry.fidolin_auto) throw new Error("Nur Fidolin-Auto-Rejects können überstimmt werden.");

  const tx = db().transaction(() => {
    db().prepare("DELETE FROM image_akte_entries WHERE id = ?").run(akteId);
    if (entry.queue_id) {
      db().prepare(
        `UPDATE image_moderation_queue
         SET status='approved',
             reviewed_by_mod_id=?, reviewed_at=?,
             rejection_reason_code=NULL, rejection_reason_text=NULL
         WHERE id=?`
      ).run(modId, Date.now(), entry.queue_id);
    }
  });
  tx();

  // Korrektur-DM
  const body = customMessage
    ? `Hi! Wir haben uns dein zuvor abgelehntes Bild nochmal angesehen.\n\n${customMessage}\n\nEs ist freigegeben — kein weiterer Handlungsbedarf für dich.\n\n— Das VibeVibo-Team`
    : "Hi! Wir haben uns dein zuvor abgelehntes Bild nochmal angesehen. Die automatische Ablehnung war zu streng — dein Bild ist freigegeben. Sorry für den Schreck!\n\n— Das VibeVibo-Team";
  try {
    sendSystemDM({
      recipientUserId: entry.user_id,
      subject: "✅ Korrektur: Dein Bild ist doch okay",
      body,
      category: "success",
      requiresAck: false,
      senderLabel: "VibeVibo-Team",
      createdByModId: modId,
      contextType: "image_revert",
      contextRef: String(akteId),
    });
  } catch (e) {
    console.error("[revertAutoReject] System-DM fehlgeschlagen:", e.message);
  }

  return true;
}

export function approveImage({ queueId, modId }) {
  const r = db().prepare(
    `UPDATE image_moderation_queue
     SET status='approved', reviewed_by_mod_id=?, reviewed_at=?
     WHERE id=? AND status='pending'`
  ).run(modId, Date.now(), queueId);
  return r.changes > 0;
}

export function rejectImage({ queueId, modId, reasonCode, customReasonText = null }) {
  const tpl = db().prepare("SELECT * FROM image_rejection_templates WHERE code=?").get(reasonCode);
  if (!tpl) throw new Error(`Unbekannter Ablehnungsgrund: ${reasonCode}`);

  const img = db().prepare("SELECT * FROM image_moderation_queue WHERE id=?").get(queueId);
  if (!img) throw new Error("Bild nicht gefunden.");
  if (img.status !== "pending") throw new Error("Bild ist nicht mehr pending.");

  const finalReasonText = customReasonText && reasonCode === "other"
    ? customReasonText
    : tpl.label;

  db().prepare(
    `UPDATE image_moderation_queue
     SET status='rejected', reviewed_by_mod_id=?, reviewed_at=?,
         rejection_reason_code=?, rejection_reason_text=?
     WHERE id=?`
  ).run(modId, Date.now(), reasonCode, finalReasonText, queueId);

  db().prepare(
    `INSERT INTO image_akte_entries
      (user_id, queue_id, image_url, thumbnail_url, source_type,
       rejection_reason_code, rejection_reason_text, rejected_by_mod_id, rejected_at, fidolin_auto)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    img.uploaded_by_user_id, queueId,
    img.image_url, img.thumbnail_url, img.source_type,
    reasonCode, finalReasonText,
    modId, Date.now(), img.fidolin_auto
  );

  const dmBody = reasonCode === "other" && customReasonText
    ? tpl.dm_body.replace("{custom}", customReasonText)
    : tpl.dm_body;
  try {
    sendSystemDM({
      recipientUserId: img.uploaded_by_user_id,
      subject: tpl.dm_subject,
      body: dmBody,
      category: tpl.category || "warning",
      requiresAck: true,
      senderLabel: "VibeVibo-Team",
      createdByModId: modId,
      contextType: "image_reject",
      contextRef: String(queueId),
    });
  } catch (e) {
    console.error("[imageReject] System-DM fehlgeschlagen:", e.message);
  }

  return true;
}

export function listAkteForUser(userId, { limit = 100 } = {}) {
  if (!userId) return [];
  return db().prepare(
    `SELECT * FROM image_akte_entries
     WHERE user_id=?
     ORDER BY rejected_at DESC
     LIMIT ?`
  ).all(userId, Math.min(Math.max(limit, 1), 500));
}

export function countAkteForUser(userId) {
  if (!userId) return 0;
  return db().prepare("SELECT COUNT(*) as c FROM image_akte_entries WHERE user_id=?").get(userId).c;
}

export function listRejectionTemplates() {
  return db().prepare(
    "SELECT * FROM image_rejection_templates ORDER BY order_index ASC, label ASC"
  ).all();
}
