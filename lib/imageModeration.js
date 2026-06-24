// 🖼 Image-Moderation Helpers
//   • enqueueImageForReview()    — beim Upload aus deinen Upload-Endpoints aufrufen
//   • listPendingImages()        — Queue für MCP-Feed
//   • approveImage() / rejectImage()  — Mod-Aktionen
//   • listAkteForUser()          — Bild-Akte pro User
//   • listRejectionTemplates()   — Dropdown-Inhalt
//
// Bei Reject: System-DM geht automatisch an den User raus (via lib/systemDms.js)
// und Bild wandert in image_akte_entries.

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
function db() {
  if (!_db) _db = new Database(findDbPath());
  return _db;
}

const VALID_SOURCES = ["profile", "buschfunk", "feed", "comment", "album", "avatar", "other"];

// Bild in Review-Queue legen.
// → Wird aus deinen Upload-Endpoints aufgerufen (Profilbild, Buschfunk, etc.).
// Returns: queue.id
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

// Pending-Liste für Mod-Feed.
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

// Approve — Bild wird durchgewunken, raus aus Queue.
export function approveImage({ queueId, modId }) {
  const r = db().prepare(
    `UPDATE image_moderation_queue
     SET status='approved', reviewed_by_mod_id=?, reviewed_at=?
     WHERE id=? AND status='pending'`
  ).run(modId, Date.now(), queueId);
  return r.changes > 0;
}

// Reject — Bild abgelehnt, Akte-Eintrag, System-DM an User.
export function rejectImage({ queueId, modId, reasonCode, customReasonText = null }) {
  const tpl = db().prepare("SELECT * FROM image_rejection_templates WHERE code=?").get(reasonCode);
  if (!tpl) throw new Error(`Unbekannter Ablehnungsgrund: ${reasonCode}`);

  const img = db().prepare("SELECT * FROM image_moderation_queue WHERE id=?").get(queueId);
  if (!img) throw new Error("Bild nicht gefunden.");
  if (img.status !== "pending") throw new Error("Bild ist nicht mehr pending.");

  const finalReasonText = customReasonText && reasonCode === "other"
    ? customReasonText
    : tpl.label;

  // 1) Queue-Status auf rejected setzen
  db().prepare(
    `UPDATE image_moderation_queue
     SET status='rejected', reviewed_by_mod_id=?, reviewed_at=?,
         rejection_reason_code=?, rejection_reason_text=?
     WHERE id=?`
  ).run(modId, Date.now(), reasonCode, finalReasonText, queueId);

  // 2) In Akte des Users eintragen
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

  // 3) System-DM an User schicken
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
    // System-DM-Fehler darf den Reject-Vorgang nicht abbrechen
    console.error("[imageReject] System-DM fehlgeschlagen:", e.message);
  }

  return true;
}

// Bild-Akte eines Users (alle abgelehnten Bilder).
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

// Alle Ablehnungs-Templates für Dropdown.
export function listRejectionTemplates() {
  return db().prepare(
    "SELECT * FROM image_rejection_templates ORDER BY order_index ASC, label ASC"
  ).all();
}
