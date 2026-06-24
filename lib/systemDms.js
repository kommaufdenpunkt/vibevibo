// 🔔 System-DMs — orange Nachrichten vom vibeviboteam
// Werden im normalen Nachrichten-Bereich angezeigt, müssen bestätigt werden.
// Verwendet von:
//   • app/api/system-dms/me/route.js
//   • app/api/system-dms/[id]/acknowledge/route.js
//   • app/system-nachrichten/page.jsx
//   • Bildertool (bei Bild-Ablehnung sendet automatisch)
//   • AGB-Update-System
//   • Mod-Permission-Changes

import Database from "better-sqlite3";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

const CATEGORIES = ["info", "warning", "danger", "success"];

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
  throw new Error("systemDms: SQLite-DB nicht gefunden. DB_PATH env var setzen.");
}

let _db = null;
function db() {
  if (!_db) _db = new Database(findDbPath());
  return _db;
}

// Sendet eine System-DM an einen User.
// Optionen:
//   recipientUserId  — Pflicht
//   subject          — Pflicht, max 200 Zeichen
//   body             — Pflicht, max 5000 Zeichen
//   category         — info | warning | danger | success (default: info)
//   requiresAck      — true (default) | false
//   senderLabel      — default 'VibeVibo-Team'
//   createdByModId   — Audit: welcher Mod/Admin hat geschickt
//   contextType      — optional: 'image_reject' | 'agb_update' | 'permission_change' | etc.
//   contextRef       — optional: ID-Referenz (z.B. Bild-ID, AGB-Version)
export function sendSystemDM({
  recipientUserId,
  subject,
  body,
  category = "info",
  requiresAck = true,
  senderLabel = "VibeVibo-Team",
  createdByModId = null,
  contextType = null,
  contextRef = null,
}) {
  if (!recipientUserId || !Number.isInteger(recipientUserId)) {
    throw new Error("recipientUserId Pflicht (integer).");
  }
  const s = String(subject || "").trim();
  const b = String(body || "").trim();
  if (!s) throw new Error("subject Pflicht.");
  if (!b) throw new Error("body Pflicht.");
  if (s.length > 200) throw new Error("subject max 200 Zeichen.");
  if (b.length > 5000) throw new Error("body max 5000 Zeichen.");
  const cat = CATEGORIES.includes(category) ? category : "info";

  const r = db()
    .prepare(
      `INSERT INTO system_dms
        (recipient_user_id, sender_label, category, subject, body,
         requires_ack, created_at, created_by_mod_id, context_type, context_ref)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      recipientUserId,
      String(senderLabel).slice(0, 64),
      cat,
      s,
      b,
      requiresAck ? 1 : 0,
      Date.now(),
      createdByModId,
      contextType,
      contextRef
    );
  return Number(r.lastInsertRowid);
}

// Liste DMs für einen User. Default: nur ungelesen.
export function listSystemDMs(userId, { onlyUnack = false, limit = 50, offset = 0 } = {}) {
  if (!userId) return [];
  let sql = "SELECT * FROM system_dms WHERE recipient_user_id = ?";
  const params = [userId];
  if (onlyUnack) {
    sql += " AND acknowledged_at IS NULL";
  }
  sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(Math.min(Math.max(limit, 1), 200), Math.max(offset, 0));
  return db().prepare(sql).all(...params);
}

// Anzahl ungelesener / nicht-bestätigter DMs für Badge.
export function countUnacknowledgedSystemDMs(userId) {
  if (!userId) return 0;
  const r = db()
    .prepare(
      "SELECT COUNT(*) as c FROM system_dms WHERE recipient_user_id = ? AND requires_ack = 1 AND acknowledged_at IS NULL"
    )
    .get(userId);
  return r?.c || 0;
}

// User bestätigt eine DM. Returns true wenn die DM tatsächlich diesem User
// gehört und noch nicht bestätigt war.
export function acknowledgeSystemDM(dmId, userId) {
  if (!dmId || !userId) return false;
  const r = db()
    .prepare(
      `UPDATE system_dms SET acknowledged_at = ?
       WHERE id = ? AND recipient_user_id = ? AND acknowledged_at IS NULL`
    )
    .run(Date.now(), dmId, userId);
  return r.changes > 0;
}

// Einzelne DM lesen — nur für Owner der DM.
export function getSystemDM(dmId, userId) {
  if (!dmId || !userId) return null;
  return db()
    .prepare("SELECT * FROM system_dms WHERE id = ? AND recipient_user_id = ?")
    .get(dmId, userId);
}
