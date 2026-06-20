#!/usr/bin/env node
// 💌 Anonyme Komplimente — User schicken nette Worte an andere, Sender bleibt anonym.
//
// Tabelle:
//   • compliments — id, to_user_id, from_user_id (NULL = anonym), body, emoji,
//                   created_at, hidden_at (Empfänger kann ausblenden)
//
// Helpers:
//   • sendCompliment({ toUserId, fromUserId, body, emoji })
//   • listCompliments(userId, { limit, includeHidden })
//   • hideCompliment(id, userId) — nur Empfänger darf
//   • countCompliments(userId)

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_TABLE = "/* 💌 COMPLIMENTS_TABLE_V1 */";
const MARK_FN    = "// 💌 COMPLIMENTS_FN_V1";

let src = readFileSync(DB_PATH, "utf-8");
let changed = false;

if (!src.includes(MARK_TABLE)) {
  const ANCHOR = "CREATE TABLE IF NOT EXISTS top_friends (";
  if (!src.includes(ANCHOR)) { console.error("✗ Anker top_friends fehlt"); process.exit(1); }
  const INJECT = `${MARK_TABLE}
    CREATE TABLE IF NOT EXISTS compliments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      from_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      body TEXT NOT NULL,
      emoji TEXT DEFAULT '💌',
      created_at INTEGER NOT NULL,
      hidden_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_compl_to ON compliments(to_user_id, created_at DESC);

    ${ANCHOR}`;
  src = src.replace(ANCHOR, INJECT);
  changed = true;
  console.log("✓ compliments Tabelle ergänzt.");
}

if (!src.includes(MARK_FN)) {
  const FN = `

${MARK_FN}
// 💌 Komplimente Helpers

const COMPLIMENT_EMOJIS = new Set(["💌","💕","💖","💗","💜","🌹","🌟","✨","🎈","🦋","🌈","☀️","🍀"]);

export function sendCompliment({ toUserId, fromUserId = null, body, emoji = "💌" }) {
  const t = String(body || "").trim().slice(0, 400);
  if (!t) throw new Error("Kompliment ist leer");
  if (!toUserId) throw new Error("Empfänger fehlt");
  if (fromUserId && Number(fromUserId) === Number(toUserId)) {
    throw new Error("Du kannst dir selbst keins schicken");
  }
  const e = COMPLIMENT_EMOJIS.has(emoji) ? emoji : "💌";
  const info = db().prepare(\`
    INSERT INTO compliments (to_user_id, from_user_id, body, emoji, created_at)
    VALUES (?, ?, ?, ?, ?)
  \`).run(Number(toUserId), fromUserId ? Number(fromUserId) : null, t, e, Date.now());
  return info.lastInsertRowid;
}

export function listCompliments(userId, { limit = 30, includeHidden = false, viewerIsOwner = false } = {}) {
  try {
    const rows = db().prepare(\`
      SELECT id, body, emoji, created_at AS createdAt, hidden_at AS hiddenAt,
             from_user_id AS fromUserId
        FROM compliments
        WHERE to_user_id = ? \${includeHidden ? "" : "AND hidden_at IS NULL"}
        ORDER BY created_at DESC LIMIT ?
    \`).all(Number(userId), Number(limit));
    // from_user_id NIE an Frontend leaken — auch nicht zum Empfänger.
    // (Komplimente sind anonym, gilt auch für den Empfänger.)
    return rows.map((r) => ({
      id: r.id, body: r.body, emoji: r.emoji,
      createdAt: r.createdAt, hidden: !!r.hiddenAt,
    }));
  } catch { return []; }
}

export function hideCompliment(complimentId, userId) {
  const r = db().prepare("SELECT to_user_id FROM compliments WHERE id = ?").get(Number(complimentId));
  if (!r) throw new Error("Nicht gefunden");
  if (Number(r.to_user_id) !== Number(userId)) throw new Error("Nicht deins");
  db().prepare("UPDATE compliments SET hidden_at = ? WHERE id = ?").run(Date.now(), Number(complimentId));
  return true;
}

export function unhideCompliment(complimentId, userId) {
  const r = db().prepare("SELECT to_user_id FROM compliments WHERE id = ?").get(Number(complimentId));
  if (!r || Number(r.to_user_id) !== Number(userId)) throw new Error("Nicht erlaubt");
  db().prepare("UPDATE compliments SET hidden_at = NULL WHERE id = ?").run(Number(complimentId));
  return true;
}

export function countCompliments(userId) {
  try {
    return db().prepare("SELECT COUNT(*) AS c FROM compliments WHERE to_user_id = ? AND hidden_at IS NULL").get(Number(userId)).c || 0;
  } catch { return 0; }
}
`;
  src += FN;
  changed = true;
  console.log("✓ Komplimente-Helpers angefügt.");
}

if (changed) {
  writeFileSync(DB_PATH, src);
  console.log("\\n✓ db.js gepatched (Komplimente).");
} else {
  console.log("\\n✓ Nichts zu tun.");
}
