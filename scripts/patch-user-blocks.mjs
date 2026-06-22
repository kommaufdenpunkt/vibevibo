#!/usr/bin/env node
// 🚫 User-Blocks — User können andere blockieren.
// Block ist bilateral effektiv: beide sehen nichts mehr voneinander.
//
// Tabelle:
//   user_blocks (blocker_id, blocked_id, reason, created_at)
//   UNIQUE (blocker_id, blocked_id) — idempotenter Block
//
// Helpers (exportiert):
//   blockUser(blockerId, blockedId, reason?)  — Block + Friendship-Cleanup
//   unblockUser(blockerId, blockedId)         — entfernt nur den Block-Eintrag
//   hasBlocked(meId, otherId)                 — ICH habe andere blockiert?
//   isBlockedBy(meId, otherId)                — andere hat MICH blockiert?
//   isMutuallyHidden(a, b)                    — IRGENDEINE Richtung blockiert?
//   getBlockedIds(meId)                       — Set: IDs die ich blockiert habe
//   getBlockerIds(meId)                       — Set: IDs die mich blockiert haben
//   getHiddenIds(meId)                        — Set: Union → alle "unsichtbaren"
//   listMyBlocks(meId)                        — Detail-Liste mit User-Infos
//   countMyBlocks(meId)

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_TABLE = "/* 🚫 USER_BLOCKS_TABLE_V1 */";
const MARK_FN    = "// 🚫 USER_BLOCKS_FN_V1";

let src = readFileSync(DB_PATH, "utf-8");
let changed = false;

// Tabelle — Anker: top_friends existiert schon
if (!src.includes(MARK_TABLE)) {
  const ANCHOR = "CREATE TABLE IF NOT EXISTS top_friends (";
  if (!src.includes(ANCHOR)) { console.error("✗ Anker top_friends fehlt"); process.exit(1); }
  const INJECT = `${MARK_TABLE}
    CREATE TABLE IF NOT EXISTS user_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reason TEXT DEFAULT '',
      created_at INTEGER NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_ub_pair ON user_blocks(blocker_id, blocked_id);
    CREATE INDEX IF NOT EXISTS idx_ub_blocker ON user_blocks(blocker_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ub_blocked ON user_blocks(blocked_id);

    ${ANCHOR}`;
  src = src.replace(ANCHOR, INJECT);
  changed = true;
  console.log("✓ user_blocks Tabelle ergänzt.");
}

if (!src.includes(MARK_FN)) {
  const FN = `

${MARK_FN}
// 🚫 User-Block Helpers

export function blockUser(blockerId, blockedId, reason = "") {
  const a = Number(blockerId), b = Number(blockedId);
  if (!a || !b || a === b) throw new Error("Ungültige IDs");
  try {
    // 1) Block-Eintrag (idempotent dank UNIQUE)
    db().prepare(\`
      INSERT OR IGNORE INTO user_blocks (blocker_id, blocked_id, reason, created_at)
      VALUES (?, ?, ?, ?)
    \`).run(a, b, String(reason || "").slice(0, 200), Date.now());
    // 2) Bestehende Friendship / Friend-Request in BEIDE Richtungen entfernen
    try {
      db().prepare(\`
        DELETE FROM friend_requests
         WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)
      \`).run(a, b, b, a);
    } catch {}
    return true;
  } catch (e) {
    console.error("[blockUser]", e?.message);
    return false;
  }
}

export function unblockUser(blockerId, blockedId) {
  try {
    db().prepare("DELETE FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?")
      .run(Number(blockerId), Number(blockedId));
    return true;
  } catch { return false; }
}

export function hasBlocked(meId, otherId) {
  try {
    const r = db().prepare("SELECT 1 FROM user_blocks WHERE blocker_id = ? AND blocked_id = ? LIMIT 1")
      .get(Number(meId), Number(otherId));
    return !!r;
  } catch { return false; }
}

export function isBlockedBy(meId, otherId) {
  try {
    const r = db().prepare("SELECT 1 FROM user_blocks WHERE blocker_id = ? AND blocked_id = ? LIMIT 1")
      .get(Number(otherId), Number(meId));
    return !!r;
  } catch { return false; }
}

export function isMutuallyHidden(a, b) {
  return hasBlocked(a, b) || hasBlocked(b, a);
}

export function getBlockedIds(meId) {
  try {
    const rows = db().prepare("SELECT blocked_id AS id FROM user_blocks WHERE blocker_id = ?")
      .all(Number(meId));
    return new Set(rows.map((r) => Number(r.id)));
  } catch { return new Set(); }
}

export function getBlockerIds(meId) {
  try {
    const rows = db().prepare("SELECT blocker_id AS id FROM user_blocks WHERE blocked_id = ?")
      .all(Number(meId));
    return new Set(rows.map((r) => Number(r.id)));
  } catch { return new Set(); }
}

export function getHiddenIds(meId) {
  const a = getBlockedIds(meId);
  const b = getBlockerIds(meId);
  const out = new Set(a);
  for (const id of b) out.add(id);
  return out;
}

export function listMyBlocks(meId) {
  try {
    return db().prepare(\`
      SELECT ub.blocked_id AS id, ub.reason, ub.created_at AS createdAt,
             u.username, u.display_name AS displayName, u.emoji,
             u.avatar_url AS avatarUrl, u.avatar_status AS avatarStatus
        FROM user_blocks ub
        LEFT JOIN users u ON u.id = ub.blocked_id
       WHERE ub.blocker_id = ?
       ORDER BY ub.created_at DESC
    \`).all(Number(meId)) || [];
  } catch { return []; }
}

export function countMyBlocks(meId) {
  try {
    return db().prepare("SELECT COUNT(*) AS c FROM user_blocks WHERE blocker_id = ?")
      .get(Number(meId)).c || 0;
  } catch { return 0; }
}
`;
  src += FN;
  changed = true;
  console.log("✓ User-Block Helpers angefügt.");
}

if (changed) {
  writeFileSync(DB_PATH, src);
  console.log("\\n✓ db.js gepatched (User-Blocks).");
} else {
  console.log("\\n✓ Nichts zu tun.");
}
