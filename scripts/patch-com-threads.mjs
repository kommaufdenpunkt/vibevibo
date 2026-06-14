#!/usr/bin/env node
// 💬 Coms-Forum DB-Patch — idempotent.
// Fuegt com_threads + com_thread_replies in den db().exec()-Block ein,
// haengt Helper-Funktionen am Ende von db.js an.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARKER_TABLES = "/* 💬 COM_FORUM_TABLES_V1 */";
const MARKER_FN = "// 💬 COM_FORUM_FN_V1";

let src = readFileSync(DB_PATH, "utf-8");
let changed = false;

// 1) Tabellen einfuegen — Anker = idx_group_posts (existiert sicher)
if (!src.includes(MARKER_TABLES)) {
  const ANCHOR = "CREATE INDEX IF NOT EXISTS idx_group_posts ON group_posts(group_id, created_at DESC);";
  if (!src.includes(ANCHOR)) {
    console.error("✗ Anker idx_group_posts nicht gefunden.");
    process.exit(1);
  }
  const INJECT = `${ANCHOR}

    ${MARKER_TABLES}
    CREATE TABLE IF NOT EXISTS com_threads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      locked INTEGER NOT NULL DEFAULT 0,
      pinned INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      last_reply_at INTEGER NOT NULL,
      reply_count INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_com_threads_group ON com_threads(group_id, pinned DESC, last_reply_at DESC);

    CREATE TABLE IF NOT EXISTS com_thread_replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id INTEGER NOT NULL REFERENCES com_threads(id) ON DELETE CASCADE,
      author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
      body TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_com_replies_thread ON com_thread_replies(thread_id, created_at ASC);`;
  src = src.replace(ANCHOR, INJECT);
  changed = true;
  console.log("✓ Coms-Forum-Tabellen ergänzt.");
} else {
  console.log("✓ Tabellen schon da — skip.");
}

// 2) Helper-Funktionen
if (!src.includes(MARKER_FN)) {
  const FN = `

${MARKER_FN}
// 💬 Coms-Forum-Helpers

export function createComThread({ groupId, authorId, title, body }) {
  const now = Date.now();
  const cleanTitle = String(title || "").trim().slice(0, 160);
  const cleanBody = String(body || "").trim().slice(0, 8000);
  if (!cleanTitle) throw new Error("Titel fehlt.");
  if (!cleanBody) throw new Error("Beitragstext fehlt.");
  const info = db().prepare(\`
    INSERT INTO com_threads (group_id, author_id, title, body, created_at, last_reply_at)
    VALUES (?, ?, ?, ?, ?, ?)
  \`).run(Number(groupId), Number(authorId), cleanTitle, cleanBody, now, now);
  return info.lastInsertRowid;
}

export function getComThreads(groupId, { limit = 30, offset = 0 } = {}) {
  return db().prepare(\`
    SELECT t.id, t.title, t.body, t.locked, t.pinned, t.created_at AS createdAt,
           t.last_reply_at AS lastReplyAt, t.reply_count AS replyCount,
           u.username AS authorUsername, u.display_name AS authorDisplayName,
           u.emoji AS authorEmoji
      FROM com_threads t
      LEFT JOIN users u ON u.id = t.author_id
     WHERE t.group_id = ?
     ORDER BY t.pinned DESC, t.last_reply_at DESC
     LIMIT ? OFFSET ?
  \`).all(Number(groupId), Number(limit), Number(offset));
}

export function getComThread(threadId) {
  return db().prepare(\`
    SELECT t.id, t.group_id AS groupId, t.title, t.body, t.locked, t.pinned,
           t.created_at AS createdAt, t.last_reply_at AS lastReplyAt,
           t.reply_count AS replyCount, t.author_id AS authorId,
           u.username AS authorUsername, u.display_name AS authorDisplayName,
           u.emoji AS authorEmoji
      FROM com_threads t
      LEFT JOIN users u ON u.id = t.author_id
     WHERE t.id = ?
  \`).get(Number(threadId));
}

export function getComThreadReplies(threadId, { limit = 200, offset = 0 } = {}) {
  return db().prepare(\`
    SELECT r.id, r.body, r.created_at AS createdAt, r.author_id AS authorId,
           u.username AS authorUsername, u.display_name AS authorDisplayName,
           u.emoji AS authorEmoji
      FROM com_thread_replies r
      LEFT JOIN users u ON u.id = r.author_id
     WHERE r.thread_id = ?
     ORDER BY r.created_at ASC
     LIMIT ? OFFSET ?
  \`).all(Number(threadId), Number(limit), Number(offset));
}

export function addComThreadReply({ threadId, authorId, body }) {
  const now = Date.now();
  const cleanBody = String(body || "").trim().slice(0, 4000);
  if (!cleanBody) throw new Error("Antwort-Text fehlt.");
  const t = db().prepare("SELECT locked FROM com_threads WHERE id = ?").get(Number(threadId));
  if (!t) throw new Error("Thread nicht gefunden.");
  if (t.locked) throw new Error("Thread ist gesperrt.");
  const tx = db().transaction(() => {
    const info = db().prepare(\`
      INSERT INTO com_thread_replies (thread_id, author_id, body, created_at)
      VALUES (?, ?, ?, ?)
    \`).run(Number(threadId), Number(authorId), cleanBody, now);
    db().prepare(\`
      UPDATE com_threads SET reply_count = reply_count + 1, last_reply_at = ?
       WHERE id = ?
    \`).run(now, Number(threadId));
    return info.lastInsertRowid;
  });
  return tx();
}

export function setComThreadLocked(threadId, locked) {
  db().prepare("UPDATE com_threads SET locked = ? WHERE id = ?").run(locked ? 1 : 0, Number(threadId));
  return true;
}

export function setComThreadPinned(threadId, pinned) {
  db().prepare("UPDATE com_threads SET pinned = ? WHERE id = ?").run(pinned ? 1 : 0, Number(threadId));
  return true;
}

export function deleteComThread(threadId) {
  db().prepare("DELETE FROM com_threads WHERE id = ?").run(Number(threadId));
  return true;
}

export function deleteComThreadReply(replyId) {
  const r = db().prepare("SELECT thread_id FROM com_thread_replies WHERE id = ?").get(Number(replyId));
  if (!r) return false;
  const tx = db().transaction(() => {
    db().prepare("DELETE FROM com_thread_replies WHERE id = ?").run(Number(replyId));
    db().prepare(\`
      UPDATE com_threads SET reply_count = MAX(0, reply_count - 1)
       WHERE id = ?
    \`).run(r.thread_id);
  });
  tx();
  return true;
}
`;
  src += FN;
  changed = true;
  console.log("✓ Coms-Forum-Helper angehängt.");
} else {
  console.log("✓ Helper schon da — skip.");
}

if (changed) {
  writeFileSync(DB_PATH, src);
  console.log("\n✓ db.js gepatched. Server-Restart nötig (Coolify-Build).");
} else {
  console.log("\n✓ Nichts zu tun.");
}
