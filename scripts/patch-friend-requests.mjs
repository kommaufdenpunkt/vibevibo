#!/usr/bin/env node
// 🤝 Friend Requests — sauberer Workflow: senden → annehmen / ablehnen / zurückziehen.
//
// Tabelle:
//   • friend_requests — (id, from_id, to_id, message, status, decision_reason, created_at, decided_at)
//                       UNIQUE pending pro (from, to)
// Helpers:
//   • sendFriendRequest(fromId, toId, message?)
//   • acceptFriendRequest(reqId, userId, replyMsg?)
//   • declineFriendRequest(reqId, userId, reason?)
//   • cancelFriendRequest(reqId, userId)
//   • listIncomingRequests(userId), listOutgoingRequests(userId)
//   • friendRequestStatus(meId, otherId)  → "none"|"outgoing"|"incoming"|"accepted"|"declined-by-me"|"declined-by-them"
//   • countPendingIncoming(userId)

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_TABLE = "/* 🤝 FRIEND_REQ_TABLE_V1 */";
const MARK_FN    = "// 🤝 FRIEND_REQ_FN_V1";

let src = readFileSync(DB_PATH, "utf-8");
let changed = false;

// 1) Tabelle — Anker: top_friends-Tabelle existiert schon
if (!src.includes(MARK_TABLE)) {
  const ANCHOR = "CREATE TABLE IF NOT EXISTS top_friends (";
  if (!src.includes(ANCHOR)) { console.error("✗ Anker top_friends fehlt"); process.exit(1); }
  const INJECT = `${MARK_TABLE}
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
  changed = true;
  console.log("✓ friend_requests Tabelle ergänzt.");
}

if (!src.includes(MARK_FN)) {
  const FN = `

${MARK_FN}
// 🤝 Friend-Request Helpers

export function sendFriendRequest(fromId, toId, message = "") {
  const f = Number(fromId), t = Number(toId);
  if (!f || !t) throw new Error("Ungültige IDs");
  if (f === t) throw new Error("Du kannst dich nicht selbst hinzufügen.");
  // Bestehende pending Anfrage? → blocken
  const existing = db().prepare(
    "SELECT id FROM friend_requests WHERE from_id = ? AND to_id = ? AND status = 'pending'"
  ).get(f, t);
  if (existing) throw new Error("Anfrage läuft schon.");
  // Eingehende Anfrage von dem User? → Auto-Accept (beide wollen sich)
  const incoming = db().prepare(
    "SELECT id FROM friend_requests WHERE from_id = ? AND to_id = ? AND status = 'pending'"
  ).get(t, f);
  if (incoming) {
    db().prepare("UPDATE friend_requests SET status='accepted', decision_reason=?, decided_at=? WHERE id=?")
      .run("Auto-Match!", Date.now(), incoming.id);
    return { id: incoming.id, autoAccepted: true };
  }
  // Sonst neue Anfrage
  const info = db().prepare(\`
    INSERT INTO friend_requests (from_id, to_id, message, status, created_at)
    VALUES (?, ?, ?, 'pending', ?)
  \`).run(f, t, String(message || "").slice(0, 400), Date.now());
  return { id: info.lastInsertRowid, autoAccepted: false };
}

export function acceptFriendRequest(reqId, userId, replyMsg = "") {
  const r = db().prepare("SELECT * FROM friend_requests WHERE id = ?").get(Number(reqId));
  if (!r) throw new Error("Anfrage nicht gefunden");
  if (Number(r.to_id) !== Number(userId)) throw new Error("Nicht für dich");
  if (r.status !== "pending") throw new Error("Schon entschieden");
  db().prepare("UPDATE friend_requests SET status='accepted', decision_reason=?, decided_at=? WHERE id=?")
    .run(String(replyMsg || "").slice(0, 300), Date.now(), Number(reqId));
  return true;
}

export function declineFriendRequest(reqId, userId, reason = "") {
  const r = db().prepare("SELECT * FROM friend_requests WHERE id = ?").get(Number(reqId));
  if (!r) throw new Error("Anfrage nicht gefunden");
  if (Number(r.to_id) !== Number(userId)) throw new Error("Nicht für dich");
  if (r.status !== "pending") throw new Error("Schon entschieden");
  db().prepare("UPDATE friend_requests SET status='declined', decision_reason=?, decided_at=? WHERE id=?")
    .run(String(reason || "").slice(0, 300), Date.now(), Number(reqId));
  return true;
}

export function cancelFriendRequest(reqId, userId) {
  const r = db().prepare("SELECT * FROM friend_requests WHERE id = ?").get(Number(reqId));
  if (!r) throw new Error("Anfrage nicht gefunden");
  if (Number(r.from_id) !== Number(userId)) throw new Error("Nicht deine Anfrage");
  if (r.status !== "pending") throw new Error("Schon entschieden");
  db().prepare("DELETE FROM friend_requests WHERE id = ?").run(Number(reqId));
  return true;
}

export function listIncomingRequests(userId, { status = "pending", limit = 50 } = {}) {
  try {
    return db().prepare(\`
      SELECT fr.id, fr.from_id AS fromId, fr.message, fr.status,
             fr.decision_reason AS decisionReason,
             fr.created_at AS createdAt, fr.decided_at AS decidedAt,
             u.username, u.display_name AS displayName, u.emoji,
             u.avatar_url AS avatarUrl, u.avatar_status AS avatarStatus
        FROM friend_requests fr
        LEFT JOIN users u ON u.id = fr.from_id
        WHERE fr.to_id = ? AND fr.status = ?
        ORDER BY fr.created_at DESC LIMIT ?
    \`).all(Number(userId), String(status), Number(limit));
  } catch { return []; }
}

export function listOutgoingRequests(userId, { status = "pending", limit = 50 } = {}) {
  try {
    return db().prepare(\`
      SELECT fr.id, fr.to_id AS toId, fr.message, fr.status,
             fr.decision_reason AS decisionReason,
             fr.created_at AS createdAt, fr.decided_at AS decidedAt,
             u.username, u.display_name AS displayName, u.emoji,
             u.avatar_url AS avatarUrl, u.avatar_status AS avatarStatus
        FROM friend_requests fr
        LEFT JOIN users u ON u.id = fr.to_id
        WHERE fr.from_id = ? AND fr.status = ?
        ORDER BY fr.created_at DESC LIMIT ?
    \`).all(Number(userId), String(status), Number(limit));
  } catch { return []; }
}

export function friendRequestStatus(meId, otherId) {
  const m = Number(meId), o = Number(otherId);
  if (!m || !o || m === o) return "none";
  try {
    const out = db().prepare(
      "SELECT status FROM friend_requests WHERE from_id=? AND to_id=? ORDER BY created_at DESC LIMIT 1"
    ).get(m, o);
    const inc = db().prepare(
      "SELECT status FROM friend_requests WHERE from_id=? AND to_id=? ORDER BY created_at DESC LIMIT 1"
    ).get(o, m);
    if (out?.status === "accepted" || inc?.status === "accepted") return "accepted";
    if (out?.status === "pending") return "outgoing";
    if (inc?.status === "pending") return "incoming";
    if (inc?.status === "declined") return "declined-by-me";
    if (out?.status === "declined") return "declined-by-them";
  } catch {}
  return "none";
}

export function countPendingIncoming(userId) {
  try {
    return db().prepare("SELECT COUNT(*) AS c FROM friend_requests WHERE to_id=? AND status='pending'")
      .get(Number(userId)).c || 0;
  } catch { return 0; }
}

export function getFriendRequest(reqId) {
  return db().prepare("SELECT * FROM friend_requests WHERE id = ?").get(Number(reqId));
}
`;
  src += FN;
  changed = true;
  console.log("✓ Friend-Request Helpers angefügt.");
}

if (changed) {
  writeFileSync(DB_PATH, src);
  console.log("\\n✓ db.js gepatched (Friend-Requests).");
} else {
  console.log("\\n✓ Nichts zu tun.");
}
