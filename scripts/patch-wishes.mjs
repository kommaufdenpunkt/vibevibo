#!/usr/bin/env node
// 💡 Wunschseite — User reichen Feature-Wünsche / Bug-Meldungen ein, andere voten.
//
// Tabellen:
//   • wishes — id, user_id, title, body, category (feature|bug|idea|other),
//              status (open|planned|in_progress|done|declined), pinned,
//              upvotes (counter), admin_reply, admin_reply_at,
//              created_at, updated_at
//   • wish_votes — (wish_id, user_id) PK
//
// Helpers:
//   • createWish, listWishes({ status?, category?, sort?, limit?, offset?, search?, currentUserId? })
//   • voteWish(wishId, userId)  → toggle
//   • adminUpdateWish(wishId, { status?, adminReply?, pinned? })
//   • getWish(wishId, currentUserId?)
//   • countOpenWishes()

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_TABLE = "/* 💡 WISHES_TABLE_V1 */";
const MARK_FN    = "// 💡 WISHES_FN_V1";

let src = readFileSync(DB_PATH, "utf-8");
let changed = false;

if (!src.includes(MARK_TABLE)) {
  const ANCHOR = "CREATE TABLE IF NOT EXISTS top_friends (";
  if (!src.includes(ANCHOR)) { console.error("✗ Anker top_friends fehlt"); process.exit(1); }
  const INJECT = `${MARK_TABLE}
    CREATE TABLE IF NOT EXISTS wishes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT DEFAULT '',
      category TEXT NOT NULL DEFAULT 'feature',
      status TEXT NOT NULL DEFAULT 'open',
      pinned INTEGER NOT NULL DEFAULT 0,
      upvotes INTEGER NOT NULL DEFAULT 0,
      admin_reply TEXT DEFAULT '',
      admin_reply_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_wishes_status ON wishes(status, pinned DESC, upvotes DESC, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_wishes_user ON wishes(user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS wish_votes (
      wish_id INTEGER NOT NULL REFERENCES wishes(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (wish_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_wishvotes_user ON wish_votes(user_id);

    ${ANCHOR}`;
  src = src.replace(ANCHOR, INJECT);
  changed = true;
  console.log("✓ wishes + wish_votes Tabellen ergänzt.");
}

if (!src.includes(MARK_FN)) {
  const FN = `

${MARK_FN}
// 💡 Wishes — Helpers für die Wunschseite

const WISH_CATEGORIES = new Set(["feature","bug","idea","other"]);
const WISH_STATUSES   = new Set(["open","planned","in_progress","done","declined"]);

export function createWish({ userId, title, body = "", category = "feature" }) {
  const cat = WISH_CATEGORIES.has(category) ? category : "feature";
  const t = String(title || "").trim().slice(0, 160);
  const b = String(body || "").trim().slice(0, 4000);
  if (!t) throw new Error("Titel fehlt");
  if (!userId) throw new Error("userId fehlt");
  const now = Date.now();
  const info = db().prepare(\`
    INSERT INTO wishes (user_id, title, body, category, status, pinned, upvotes, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'open', 0, 0, ?, ?)
  \`).run(Number(userId), t, b, cat, now, now);
  return info.lastInsertRowid;
}

export function listWishes({ status = null, category = null, sort = "top", limit = 50, offset = 0, search = "", currentUserId = null } = {}) {
  const where = [];
  const params = [];
  if (status && WISH_STATUSES.has(status)) { where.push("w.status = ?"); params.push(status); }
  if (category && WISH_CATEGORIES.has(category)) { where.push("w.category = ?"); params.push(category); }
  if (search) {
    where.push("(w.title LIKE ? OR w.body LIKE ?)");
    const q = "%" + String(search) + "%";
    params.push(q, q);
  }
  const whereSql = where.length ? \`WHERE \${where.join(" AND ")}\` : "";
  let order;
  switch (sort) {
    case "new":    order = "w.pinned DESC, w.created_at DESC"; break;
    case "votes":  order = "w.pinned DESC, w.upvotes DESC, w.created_at DESC"; break;
    case "trend":  order = "w.pinned DESC, (w.upvotes + 1.0) / ((? - w.created_at) / 86400000.0 + 2) DESC"; break;
    case "top":
    default:       order = "w.pinned DESC, w.upvotes DESC, w.created_at DESC"; break;
  }
  if (sort === "trend") params.push(Date.now());
  params.push(Number(limit), Number(offset));
  try {
    const rows = db().prepare(\`
      SELECT w.id, w.user_id AS userId, w.title, w.body, w.category, w.status, w.pinned,
             w.upvotes, w.admin_reply AS adminReply, w.admin_reply_at AS adminReplyAt,
             w.created_at AS createdAt, w.updated_at AS updatedAt,
             u.username, u.display_name AS displayName, u.emoji,
             u.avatar_url AS avatarUrl
        FROM wishes w
        LEFT JOIN users u ON u.id = w.user_id
        \${whereSql}
        ORDER BY \${order}
        LIMIT ? OFFSET ?
    \`).all(...params);
    // hasVoted für currentUser anreichern
    if (currentUserId && rows.length > 0) {
      const ids = rows.map((r) => r.id);
      const placeholders = ids.map(() => "?").join(",");
      const voted = db().prepare(\`SELECT wish_id FROM wish_votes WHERE user_id = ? AND wish_id IN (\${placeholders})\`)
        .all(Number(currentUserId), ...ids);
      const votedSet = new Set(voted.map((v) => v.wish_id));
      rows.forEach((r) => { r.hasVoted = votedSet.has(r.id); });
    } else {
      rows.forEach((r) => { r.hasVoted = false; });
    }
    return rows;
  } catch { return []; }
}

export function getWish(wishId, currentUserId = null) {
  try {
    const w = db().prepare(\`
      SELECT w.id, w.user_id AS userId, w.title, w.body, w.category, w.status, w.pinned,
             w.upvotes, w.admin_reply AS adminReply, w.admin_reply_at AS adminReplyAt,
             w.created_at AS createdAt, w.updated_at AS updatedAt,
             u.username, u.display_name AS displayName, u.emoji,
             u.avatar_url AS avatarUrl
        FROM wishes w
        LEFT JOIN users u ON u.id = w.user_id
        WHERE w.id = ?
    \`).get(Number(wishId));
    if (!w) return null;
    if (currentUserId) {
      const v = db().prepare("SELECT 1 FROM wish_votes WHERE wish_id = ? AND user_id = ?")
        .get(Number(wishId), Number(currentUserId));
      w.hasVoted = !!v;
    } else {
      w.hasVoted = false;
    }
    return w;
  } catch { return null; }
}

export function voteWish(wishId, userId) {
  const wid = Number(wishId), uid = Number(userId);
  if (!wid || !uid) throw new Error("ungültige id");
  const existing = db().prepare("SELECT 1 FROM wish_votes WHERE wish_id = ? AND user_id = ?").get(wid, uid);
  if (existing) {
    db().prepare("DELETE FROM wish_votes WHERE wish_id = ? AND user_id = ?").run(wid, uid);
    db().prepare("UPDATE wishes SET upvotes = MAX(0, upvotes - 1) WHERE id = ?").run(wid);
    return { hasVoted: false };
  }
  db().prepare("INSERT INTO wish_votes (wish_id, user_id, created_at) VALUES (?, ?, ?)").run(wid, uid, Date.now());
  db().prepare("UPDATE wishes SET upvotes = upvotes + 1 WHERE id = ?").run(wid);
  return { hasVoted: true };
}

export function adminUpdateWish(wishId, { status, adminReply, pinned, deletedWish } = {}) {
  if (deletedWish) {
    db().prepare("DELETE FROM wishes WHERE id = ?").run(Number(wishId));
    return true;
  }
  const sets = [], params = [];
  if (status !== undefined) {
    if (!WISH_STATUSES.has(status)) throw new Error("Ungültiger Status");
    sets.push("status = ?"); params.push(status);
  }
  if (adminReply !== undefined) {
    sets.push("admin_reply = ?"); params.push(String(adminReply).slice(0, 4000));
    sets.push("admin_reply_at = ?"); params.push(Date.now());
  }
  if (pinned !== undefined) {
    sets.push("pinned = ?"); params.push(pinned ? 1 : 0);
  }
  if (!sets.length) return false;
  sets.push("updated_at = ?"); params.push(Date.now());
  params.push(Number(wishId));
  db().prepare(\`UPDATE wishes SET \${sets.join(", ")} WHERE id = ?\`).run(...params);
  return true;
}

export function countOpenWishes() {
  try {
    return db().prepare("SELECT COUNT(*) AS c FROM wishes WHERE status = 'open'").get().c || 0;
  } catch { return 0; }
}

export function countWishesByStatus() {
  const out = { open: 0, planned: 0, in_progress: 0, done: 0, declined: 0, all: 0 };
  try {
    const rows = db().prepare("SELECT status, COUNT(*) AS c FROM wishes GROUP BY status").all();
    for (const r of rows) {
      if (out[r.status] !== undefined) out[r.status] = r.c;
      out.all += r.c;
    }
  } catch {}
  return out;
}
`;
  src += FN;
  changed = true;
  console.log("✓ Wishes-Helpers angefügt.");
}

if (changed) {
  writeFileSync(DB_PATH, src);
  console.log("\\n✓ db.js gepatched (Wishes).");
} else {
  console.log("\\n✓ Nichts zu tun.");
}
