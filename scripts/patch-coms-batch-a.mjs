#!/usr/bin/env node
// 💝 Coms Batch A DB-Patch — idempotent.
// • com_reactions Tabelle (universal für threads + replies)
// • groups.welcome_post Spalte
// • Helpers für react/unreact + welcome + activity feed

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARKER_TABLES = "/* 💝 COM_BATCH_A_TABLES_V1 */";
const MARKER_COL = "/* 💝 COM_BATCH_A_COL_V1 */";
const MARKER_FN = "// 💝 COM_BATCH_A_FN_V1";

let src = readFileSync(DB_PATH, "utf-8");
let changed = false;

// 1) com_reactions Tabelle
if (!src.includes(MARKER_TABLES)) {
  const ANCHOR = "CREATE INDEX IF NOT EXISTS idx_com_replies_thread ON com_thread_replies(thread_id, created_at ASC);";
  if (!src.includes(ANCHOR)) {
    console.error("✗ Anker idx_com_replies_thread nicht gefunden — erst patch-com-threads ausführen.");
    process.exit(1);
  }
  const INJECT = `${ANCHOR}

    ${MARKER_TABLES}
    CREATE TABLE IF NOT EXISTS com_reactions (
      target_type TEXT NOT NULL,    -- 'thread' oder 'reply'
      target_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      emoji TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (target_type, target_id, user_id, emoji)
    );
    CREATE INDEX IF NOT EXISTS idx_com_reactions_target ON com_reactions(target_type, target_id);`;
  src = src.replace(ANCHOR, INJECT);
  changed = true;
  console.log("✓ com_reactions Tabelle ergänzt.");
}

// 2) welcome_post Spalte auf groups
if (!src.includes(MARKER_COL)) {
  const ANCHOR = `addColumnIfMissing(d, "groups", "theme_color", "TEXT DEFAULT '#ec4899'");`;
  if (!src.includes(ANCHOR)) {
    console.error("✗ Anker theme_color nicht gefunden — erst patch-coms ausführen.");
    process.exit(1);
  }
  const INJECT = `${ANCHOR}
  ${MARKER_COL}
  addColumnIfMissing(d, "groups", "welcome_post", "TEXT DEFAULT ''");`;
  src = src.replace(ANCHOR, INJECT);
  changed = true;
  console.log("✓ groups.welcome_post Spalte ergänzt.");
}

// 3) Helper-Funktionen
if (!src.includes(MARKER_FN)) {
  const FN = `

${MARKER_FN}
// 💝 Coms Batch A — Reactions, Welcome-Post, Activity-Feed

export function toggleComReaction({ targetType, targetId, userId, emoji }) {
  if (!["thread", "reply"].includes(targetType)) throw new Error("Ungültiger Target-Typ.");
  if (!emoji || emoji.length > 8) throw new Error("Ungültiges Emoji.");
  const existing = db().prepare(\`
    SELECT 1 FROM com_reactions
     WHERE target_type = ? AND target_id = ? AND user_id = ? AND emoji = ?
  \`).get(targetType, Number(targetId), Number(userId), emoji);
  if (existing) {
    db().prepare(\`
      DELETE FROM com_reactions
       WHERE target_type = ? AND target_id = ? AND user_id = ? AND emoji = ?
    \`).run(targetType, Number(targetId), Number(userId), emoji);
    return { added: false };
  }
  db().prepare(\`
    INSERT INTO com_reactions (target_type, target_id, user_id, emoji, created_at)
    VALUES (?, ?, ?, ?, ?)
  \`).run(targetType, Number(targetId), Number(userId), emoji, Date.now());
  return { added: true };
}

export function getComReactions(targetType, targetIds) {
  if (!Array.isArray(targetIds) || targetIds.length === 0) return {};
  const placeholders = targetIds.map(() => "?").join(",");
  const rows = db().prepare(\`
    SELECT target_id AS targetId, emoji, COUNT(*) AS count,
           GROUP_CONCAT(user_id) AS userIds
      FROM com_reactions
     WHERE target_type = ? AND target_id IN (\${placeholders})
     GROUP BY target_id, emoji
  \`).all(targetType, ...targetIds.map(Number));
  const out = {};
  for (const r of rows) {
    if (!out[r.targetId]) out[r.targetId] = {};
    out[r.targetId][r.emoji] = {
      count: r.count,
      userIds: (r.userIds || "").split(",").map(Number),
    };
  }
  return out;
}

export function setComWelcomePost(groupId, text) {
  db().prepare("UPDATE groups SET welcome_post = ? WHERE id = ?")
    .run(String(text || "").slice(0, 4000), Number(groupId));
  return true;
}

// Activity Feed — gemergte Liste aus Threads, Joins, Wall-Posts
export function getComActivity(groupId, { limit = 12 } = {}) {
  const lim = Math.max(1, Math.min(50, Number(limit)));
  const rows = db().prepare(\`
    SELECT * FROM (
      -- Neue Threads
      SELECT 'thread' AS kind, t.id AS targetId, t.title AS title,
             t.author_id AS actorId, t.created_at AS at,
             u.username AS actorUsername, u.display_name AS actorDisplayName, u.emoji AS actorEmoji
        FROM com_threads t
        LEFT JOIN users u ON u.id = t.author_id
       WHERE t.group_id = ?
      UNION ALL
      -- Neue Member
      SELECT 'join' AS kind, NULL AS targetId, NULL AS title,
             gm.user_id AS actorId, gm.joined_at AS at,
             u.username AS actorUsername, u.display_name AS actorDisplayName, u.emoji AS actorEmoji
        FROM group_members gm
        JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = ?
      UNION ALL
      -- Wall-Posts
      SELECT 'post' AS kind, gp.id AS targetId,
             SUBSTR(gp.text, 1, 80) AS title,
             gp.user_id AS actorId, gp.created_at AS at,
             u.username AS actorUsername, u.display_name AS actorDisplayName, u.emoji AS actorEmoji
        FROM group_posts gp
        JOIN users u ON u.id = gp.user_id
       WHERE gp.group_id = ?
    ) ORDER BY at DESC LIMIT ?
  \`).all(Number(groupId), Number(groupId), Number(groupId), lim);
  return rows;
}
`;
  src += FN;
  changed = true;
  console.log("✓ Helper-Funktionen angehängt.");
}

if (changed) {
  writeFileSync(DB_PATH, src);
  console.log("\\n✓ db.js gepatched. Server-Restart nötig.");
} else {
  console.log("\\n✓ Nichts zu tun (alle Marker schon drin).");
}
