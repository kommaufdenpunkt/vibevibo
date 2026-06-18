#!/usr/bin/env node
// 📊 Com-Polls — Live-Umfragen mit Auto-Refresh.
// Owner/Members können Polls erstellen (wenn Feature freigeschaltet), alle Members voten.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_TABLE = "/* 📊 COM_POLLS_TABLE_V1 */";
const MARK_FN = "// 📊 COM_POLLS_FN_V1";

let src = readFileSync(DB_PATH, "utf-8");
let changed = false;

if (!src.includes(MARK_TABLE)) {
  const ANCHOR = "CREATE TABLE IF NOT EXISTS group_posts (";
  if (!src.includes(ANCHOR)) {
    console.error("✗ Anker group_posts nicht gefunden");
    process.exit(1);
  }
  const INJECT = `${MARK_TABLE}
    CREATE TABLE IF NOT EXISTS com_polls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      author_id INTEGER NOT NULL,
      question TEXT NOT NULL,
      options TEXT NOT NULL DEFAULT '[]',
      multi INTEGER NOT NULL DEFAULT 0,
      closed INTEGER NOT NULL DEFAULT 0,
      ends_at INTEGER,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_com_polls_group ON com_polls(group_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS com_poll_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poll_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      option_idx INTEGER NOT NULL,
      voted_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_com_poll_votes_poll ON com_poll_votes(poll_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_com_poll_votes_unique ON com_poll_votes(poll_id, user_id, option_idx);

    ${ANCHOR}`;
  src = src.replace(ANCHOR, INJECT);
  changed = true;
  console.log("✓ com_polls + com_poll_votes Tabellen ergänzt.");
}

if (!src.includes(MARK_FN)) {
  const FN = `

${MARK_FN}
// 📊 Com-Polls Helpers

function _parsePollRow(r, byUserId = null) {
  if (!r) return null;
  let options = [];
  try { options = JSON.parse(r.options || "[]"); } catch {}
  const counts = db().prepare(\`
    SELECT option_idx AS idx, COUNT(*) AS c FROM com_poll_votes WHERE poll_id = ? GROUP BY option_idx
  \`).all(r.id);
  const countMap = Object.fromEntries(counts.map((x) => [x.idx, x.c]));
  let total = 0;
  const optionsOut = options.map((text, idx) => {
    const count = countMap[idx] || 0;
    total += count;
    return { idx, text: String(text || "").slice(0, 100), count };
  });
  let myVotes = [];
  if (byUserId) {
    myVotes = db().prepare(\`
      SELECT option_idx FROM com_poll_votes WHERE poll_id = ? AND user_id = ?
    \`).all(Number(r.id), Number(byUserId)).map((x) => x.option_idx);
  }
  return {
    id: r.id,
    groupId: r.group_id,
    authorId: r.author_id,
    authorUsername: r.author_username || null,
    authorDisplayName: r.author_display_name || null,
    authorEmoji: r.author_emoji || null,
    question: r.question,
    options: optionsOut,
    totalVotes: total,
    multi: !!r.multi,
    closed: !!r.closed,
    endsAt: r.ends_at || null,
    createdAt: r.created_at,
    myVotes,
  };
}

export function createComPoll({ groupId, authorId, question, options, multi = false, endsAt = null }) {
  const opts = (Array.isArray(options) ? options : [])
    .map((s) => String(s || "").trim())
    .filter(Boolean)
    .slice(0, 6);
  if (opts.length < 2) throw new Error("Mindestens 2 Antwort-Optionen nötig.");
  const q = String(question || "").trim();
  if (!q) throw new Error("Frage fehlt.");
  if (q.length > 200) throw new Error("Frage zu lang (max 200 Zeichen).");
  const now = Date.now();
  const info = db().prepare(\`
    INSERT INTO com_polls (group_id, author_id, question, options, multi, ends_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  \`).run(Number(groupId), Number(authorId), q.slice(0, 200),
    JSON.stringify(opts), multi ? 1 : 0, endsAt ? Number(endsAt) : null, now);
  return info.lastInsertRowid;
}

export function getComPoll(pollId, { byUserId = null } = {}) {
  const r = db().prepare(\`
    SELECT p.*, u.username AS author_username, u.display_name AS author_display_name, u.emoji AS author_emoji
      FROM com_polls p LEFT JOIN users u ON u.id = p.author_id
     WHERE p.id = ?
  \`).get(Number(pollId));
  return _parsePollRow(r, byUserId);
}

export function listComPolls(groupId, { limit = 20, byUserId = null } = {}) {
  const rows = db().prepare(\`
    SELECT p.*, u.username AS author_username, u.display_name AS author_display_name, u.emoji AS author_emoji
      FROM com_polls p LEFT JOIN users u ON u.id = p.author_id
     WHERE p.group_id = ?
     ORDER BY p.created_at DESC
     LIMIT ?
  \`).all(Number(groupId), Number(limit));
  return rows.map((r) => _parsePollRow(r, byUserId));
}

// Vote toggle: wenn schon abgegeben → entfernen; sonst hinzufügen.
// Bei single-choice: vorher andere Stimmen des Users löschen.
export function voteComPoll(pollId, userId, optionIdx) {
  const p = db().prepare("SELECT id, multi, closed, ends_at, options FROM com_polls WHERE id = ?").get(Number(pollId));
  if (!p) throw new Error("Umfrage existiert nicht.");
  if (p.closed) throw new Error("Umfrage ist geschlossen.");
  if (p.ends_at && p.ends_at < Date.now()) throw new Error("Umfrage ist abgelaufen.");
  let options = [];
  try { options = JSON.parse(p.options || "[]"); } catch {}
  const idx = Number(optionIdx);
  if (!Number.isInteger(idx) || idx < 0 || idx >= options.length) {
    throw new Error("Ungültige Option.");
  }
  const now = Date.now();
  const existing = db().prepare("SELECT id FROM com_poll_votes WHERE poll_id = ? AND user_id = ? AND option_idx = ?")
    .get(Number(pollId), Number(userId), idx);
  if (existing) {
    db().prepare("DELETE FROM com_poll_votes WHERE id = ?").run(existing.id);
    return { added: false, idx };
  }
  if (!p.multi) {
    // Single-Choice: alte Stimmen des Users löschen
    db().prepare("DELETE FROM com_poll_votes WHERE poll_id = ? AND user_id = ?").run(Number(pollId), Number(userId));
  }
  db().prepare(\`
    INSERT INTO com_poll_votes (poll_id, user_id, option_idx, voted_at) VALUES (?, ?, ?, ?)
  \`).run(Number(pollId), Number(userId), idx, now);
  return { added: true, idx };
}

export function closeComPoll(pollId) {
  db().prepare("UPDATE com_polls SET closed = 1 WHERE id = ?").run(Number(pollId));
}

export function deleteComPoll(pollId) {
  const tx = db().transaction(() => {
    db().prepare("DELETE FROM com_poll_votes WHERE poll_id = ?").run(Number(pollId));
    db().prepare("DELETE FROM com_polls WHERE id = ?").run(Number(pollId));
  });
  tx();
}

export function getComPollAuthor(pollId) {
  const r = db().prepare("SELECT author_id, group_id FROM com_polls WHERE id = ?").get(Number(pollId));
  return r ? { authorId: r.author_id, groupId: r.group_id } : null;
}
`;
  src += FN;
  changed = true;
  console.log("✓ Poll-Helpers angefügt.");
}

if (changed) {
  writeFileSync(DB_PATH, src);
  console.log("\\n✓ db.js gepatched.");
} else {
  console.log("\\n✓ Nichts zu tun.");
}
