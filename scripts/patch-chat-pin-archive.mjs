#!/usr/bin/env node
// 💬 Chat-Upgrade: Pin + Archiv
//
// Spalten:
//   • messages.pinned_at   — wann gepinnt (0 = nicht gepinnt)
//   • messages.archived_at — wann archiviert (0 = nicht archiviert)
//
// Verhalten:
//   • Archivierte Nachrichten erscheinen NICHT mehr im normalen Chat-Verlauf
//   • Pin/Archiv kann nur von Sender ODER Empfänger gemacht werden
//   • Beide Aktionen sind per-User pro Nachricht (nicht symmetrisch — wird im
//     API-Layer geprüft, aber DB hält's einfach: 1 Flag pro Nachricht)
//
// Helpers:
//   • togglePinMessage(messageId, byUserId)            — Pin an/aus
//   • toggleArchiveMessage(messageId, byUserId)        — Archiv an/aus
//   • listArchivedMessagesForUser(userId)              — User-Archiv
//   • listPinnedMessagesForPair(userIdA, userIdB)      — gepinnte zwischen 2 Usern
//   • shapeMessage erweitert um pinnedAt, archivedAt
//   • getConversation filtert archivierte raus

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_COL = "/* 💬 CHAT_PIN_ARCHIVE_COL_V1 */";
const MARK_FN  = "// 💬 CHAT_PIN_ARCHIVE_FN_V1";

let src = readFileSync(DB_PATH, "utf-8");
let changed = false;

if (!src.includes(MARK_COL)) {
  const ANCHOR = `addColumnIfMissing(d, "messages", "image_url", "TEXT DEFAULT ''");`;
  if (!src.includes(ANCHOR)) { console.error("✗ Anker messages.image_url fehlt"); process.exit(1); }
  const INJECT = `${ANCHOR}

  ${MARK_COL}
  addColumnIfMissing(d, "messages", "pinned_at",   "INTEGER DEFAULT 0");
  addColumnIfMissing(d, "messages", "archived_at", "INTEGER DEFAULT 0");`;
  src = src.replace(ANCHOR, INJECT);
  changed = true;
  console.log("✓ messages.pinned_at + archived_at ergänzt.");
}

// shapeMessage um pinnedAt + archivedAt erweitern
const OLD_SHAPE = `    readAt: m.read_at || 0,
    imageUrl: m.image_url || "",
  };`;
const NEW_SHAPE = `    readAt: m.read_at || 0,
    imageUrl: m.image_url || "",
    pinnedAt: m.pinned_at || 0,
    archivedAt: m.archived_at || 0,
  };`;

if (src.includes(OLD_SHAPE) && !src.includes("pinnedAt: m.pinned_at")) {
  src = src.replace(OLD_SHAPE, NEW_SHAPE);
  changed = true;
  console.log("✓ shapeMessage erweitert.");
}

// getConversation SELECT um pinned_at + archived_at, WHERE um Archiv-Filter
const OLD_CONV = `  const rows = db().prepare(\`
    SELECT id, from_user_id, to_user_id, text, created_at AS at,
           kind, audio_url, once_only, consumed, read_at, image_url
      FROM messages
     WHERE (from_user_id = ? AND to_user_id = ?)
        OR (from_user_id = ? AND to_user_id = ?)
     ORDER BY created_at ASC
  \`).all(userIdA, userIdB, userIdB, userIdA);`;
const NEW_CONV = `  const rows = db().prepare(\`
    SELECT id, from_user_id, to_user_id, text, created_at AS at,
           kind, audio_url, once_only, consumed, read_at, image_url,
           pinned_at, archived_at
      FROM messages
     WHERE ((from_user_id = ? AND to_user_id = ?)
         OR (from_user_id = ? AND to_user_id = ?))
       AND COALESCE(archived_at, 0) = 0
     ORDER BY created_at ASC
  \`).all(userIdA, userIdB, userIdB, userIdA);`;

if (src.includes(OLD_CONV) && !src.includes("AND COALESCE(archived_at")) {
  src = src.replace(OLD_CONV, NEW_CONV);
  changed = true;
  console.log("✓ getConversation um Archiv-Filter + Pin-Felder erweitert.");
}

if (!src.includes(MARK_FN)) {
  const FN = `

${MARK_FN}
// 💬 Chat-Pin + Archiv Helpers

// Prüft ob User (sender oder receiver) Zugriff auf Message hat.
function canTouchMessage(messageId, userId) {
  try {
    const m = db().prepare("SELECT from_user_id AS f, to_user_id AS t FROM messages WHERE id = ?").get(Number(messageId));
    if (!m) return false;
    const uid = Number(userId);
    return m.f === uid || m.t === uid;
  } catch { return false; }
}

// Pin an/aus. Return: { pinned: bool }
export function togglePinMessage(messageId, byUserId) {
  if (!canTouchMessage(messageId, byUserId)) throw new Error("Keine Berechtigung");
  try {
    const cur = db().prepare("SELECT pinned_at FROM messages WHERE id = ?").get(Number(messageId));
    const isPinned = (cur?.pinned_at || 0) > 0;
    const newVal = isPinned ? 0 : Date.now();
    db().prepare("UPDATE messages SET pinned_at = ? WHERE id = ?").run(newVal, Number(messageId));
    return { pinned: !isPinned };
  } catch (e) { throw new Error(e.message); }
}

// Archiv an/aus. Return: { archived: bool }
export function toggleArchiveMessage(messageId, byUserId) {
  if (!canTouchMessage(messageId, byUserId)) throw new Error("Keine Berechtigung");
  try {
    const cur = db().prepare("SELECT archived_at FROM messages WHERE id = ?").get(Number(messageId));
    const isArchived = (cur?.archived_at || 0) > 0;
    const newVal = isArchived ? 0 : Date.now();
    db().prepare("UPDATE messages SET archived_at = ? WHERE id = ?").run(newVal, Number(messageId));
    return { archived: !isArchived };
  } catch (e) { throw new Error(e.message); }
}

// Liste der archivierten Nachrichten eines Users (egal ob Sender oder Empfänger).
export function listArchivedMessagesForUser(userId) {
  const uid = Number(userId);
  if (!uid) return [];
  try {
    return db().prepare(\`
      SELECT m.id, m.from_user_id AS fromId, m.to_user_id AS toId,
             m.text, m.created_at AS at, m.kind, m.audio_url AS audioUrl,
             m.image_url AS imageUrl, m.read_at AS readAt,
             m.pinned_at AS pinnedAt, m.archived_at AS archivedAt,
             uf.username AS fromUsername, uf.display_name AS fromDisplayName,
             uf.avatar_url AS fromAvatarUrl, uf.avatar_status AS fromAvatarStatus,
             ut.username AS toUsername, ut.display_name AS toDisplayName,
             ut.avatar_url AS toAvatarUrl, ut.avatar_status AS toAvatarStatus
        FROM messages m
        JOIN users uf ON uf.id = m.from_user_id
        JOIN users ut ON ut.id = m.to_user_id
       WHERE (m.from_user_id = ? OR m.to_user_id = ?)
         AND COALESCE(m.archived_at, 0) > 0
       ORDER BY m.archived_at DESC
       LIMIT 200
    \`).all(uid, uid) || [];
  } catch { return []; }
}

// Gepinnte Nachrichten zwischen 2 Usern.
export function listPinnedMessagesForPair(userIdA, userIdB) {
  const a = Number(userIdA), b = Number(userIdB);
  if (!a || !b) return [];
  try {
    return db().prepare(\`
      SELECT id, from_user_id AS fromId, to_user_id AS toId,
             text, created_at AS at, kind, image_url AS imageUrl,
             pinned_at AS pinnedAt
        FROM messages
       WHERE ((from_user_id = ? AND to_user_id = ?)
           OR (from_user_id = ? AND to_user_id = ?))
         AND COALESCE(pinned_at, 0) > 0
         AND COALESCE(archived_at, 0) = 0
       ORDER BY pinned_at DESC
    \`).all(a, b, b, a) || [];
  } catch { return []; }
}
`;
  src += FN;
  changed = true;
  console.log("✓ Chat-Pin+Archiv Helpers angefügt.");
}

if (changed) {
  writeFileSync(DB_PATH, src);
  console.log("\\n✓ db.js gepatched (Chat-Pin+Archiv).");
} else {
  console.log("\\n✓ Nichts zu tun.");
}
