// 📢 Broadcast — Admin schickt Update-Posts an alle / Mod-Gruppen.
// Erstellt unter der Haube für jeden Recipient eine System-DM (siehe lib/systemDms.js)
// und trackt den Broadcast in der `broadcasts` Tabelle für Stats.
//
// AI-Review (Phase 2): einfacher lokaler Check (Wort-Blacklist) — kann später
// durch Perspective API ersetzt werden wenn API-Key vorhanden.

import Database from "better-sqlite3";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { sendSystemDM } from "./systemDms";

const TARGETS = ["all", "mods", "admins"];
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
  throw new Error("broadcast: SQLite-DB nicht gefunden.");
}

let _db = null;
function db() {
  if (!_db) _db = new Database(findDbPath());
  return _db;
}

// Einfacher lokaler Toxizitäts-Check (Wort-Blacklist).
// Phase 2: Perspective API integrieren (gratis bis 1 req/sec).
const TOXIC_PATTERNS = [
  /\barschloch\b/i, /\bidiot\b/i, /\bdumm(es?|kopf)?\b/i, /\bspasti\b/i,
  /\bn[i!1]gger\b/i, /\bs[c|k]hlamp[ae]\b/i, /\bhure\b/i, /\bfick\b/i,
  /\bk(_|\.)*ill\b/i, /\bsuizid/i,
];

function localToxicityCheck(text) {
  const issues = [];
  for (const pattern of TOXIC_PATTERNS) {
    const m = text.match(pattern);
    if (m) issues.push(m[0].toLowerCase());
  }
  return {
    flagged: issues.length > 0,
    issues: [...new Set(issues)],
    note: issues.length > 0
      ? `Achtung: Möglicherweise problematische Wörter erkannt: ${issues.join(", ")}. Bitte vor dem Senden prüfen.`
      : "Lokaler Check OK. (Echte AI-Review kommt in Phase 2 via Perspective API)",
  };
}

export function reviewBroadcastText({ subject = "", body = "" }) {
  const combined = `${subject}\n${body}`;
  const local = localToxicityCheck(combined);
  return {
    status: local.flagged ? "warning" : "ok",
    notes: local.note,
    issues: local.issues,
  };
}

// Recipients ermitteln je nach target.
// Greift auf existing users-Tabelle zu (kein eigenes Schema-Patch nötig).
function getRecipientUserIds(target) {
  if (!TARGETS.includes(target)) target = "all";
  // Status-Filter: ignoriere blockierte/gelöschte falls Spalten existieren
  const cols = db().prepare("PRAGMA table_info(users)").all().map(c => c.name);
  let statusFilter = "";
  if (cols.includes("status")) {
    statusFilter = " AND (status IS NULL OR status NOT IN ('blocked', 'deleted'))";
  }

  if (target === "all") {
    const rows = db().prepare(`SELECT id FROM users WHERE 1=1 ${statusFilter}`).all();
    return rows.map(r => r.id);
  }

  // mods/admins: filter via role-Spalte (falls vorhanden)
  if (!cols.includes("role")) {
    // Fallback: leer wenn keine role-Spalte
    return [];
  }
  const roleSet = target === "mods"
    ? "('moderator', 'teamleitung', 'admin', 'owner')"
    : "('admin', 'owner')";
  const rows = db().prepare(
    `SELECT id FROM users WHERE role IN ${roleSet} ${statusFilter}`
  ).all();
  return rows.map(r => r.id);
}

// Sendet einen Broadcast.
// Returns: { broadcastId, recipientCount, errors[] }
export function sendBroadcast({
  subject,
  body,
  category = "info",
  target = "all",
  requiresAck = false,
  sentByAdminId,
  aiReview = null,
}) {
  if (!subject || !body) throw new Error("subject und body Pflicht.");
  if (!sentByAdminId) throw new Error("sentByAdminId Pflicht (Admin-User-ID).");
  if (!CATEGORIES.includes(category)) category = "info";
  if (!TARGETS.includes(target)) target = "all";

  const recipientIds = getRecipientUserIds(target);
  if (recipientIds.length === 0) {
    throw new Error(`Keine Empfänger für target='${target}' gefunden.`);
  }

  // 1) Broadcast-Record anlegen
  const r = db().prepare(
    `INSERT INTO broadcasts
      (subject, body, category, target, requires_ack, sent_by_admin_id,
       sent_at, recipient_count, ai_review_status, ai_review_notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    subject.slice(0, 200),
    body.slice(0, 5000),
    category,
    target,
    requiresAck ? 1 : 0,
    sentByAdminId,
    Date.now(),
    recipientIds.length,
    aiReview?.status || null,
    aiReview?.notes ? aiReview.notes.slice(0, 1000) : null,
  );
  const broadcastId = Number(r.lastInsertRowid);

  // 2) Pro Recipient eine System-DM erstellen
  const errors = [];
  let okCount = 0;
  for (const userId of recipientIds) {
    try {
      sendSystemDM({
        recipientUserId: userId,
        subject,
        body,
        category,
        requiresAck,
        senderLabel: "VibeVibo-Team",
        createdByModId: sentByAdminId,
        contextType: "broadcast",
        contextRef: String(broadcastId),
      });
      okCount += 1;
    } catch (e) {
      errors.push({ userId, error: e.message });
    }
  }

  // 3) Update recipient_count auf tatsächlich erfolgreich gesendete
  if (okCount !== recipientIds.length) {
    db().prepare("UPDATE broadcasts SET recipient_count = ? WHERE id = ?")
      .run(okCount, broadcastId);
  }

  return {
    broadcastId,
    recipientCount: okCount,
    intendedCount: recipientIds.length,
    errors,
  };
}

// Listet die letzten Broadcasts (für Admin-Übersicht).
export function listRecentBroadcasts({ limit = 50 } = {}) {
  const rows = db().prepare(
    `SELECT * FROM broadcasts ORDER BY sent_at DESC LIMIT ?`
  ).all(Math.min(Math.max(limit, 1), 200));

  // Für jeden Broadcast: Anzahl bereits acked aus system_dms zählen
  const ackStmt = db().prepare(
    `SELECT COUNT(*) as c FROM system_dms
     WHERE context_type = 'broadcast' AND context_ref = ? AND acknowledged_at IS NOT NULL`
  );
  return rows.map(b => ({
    ...b,
    ack_count: ackStmt.get(String(b.id))?.c || 0,
  }));
}
