#!/usr/bin/env node
// 🛡 Com-Bann-System + Fidolin-Log-Infrastruktur — idempotent.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_TABLES = "/* 🛡 COM_BAN_FIDOLIN_TABLES_V1 */";
const MARK_COL = "/* 🛡 COM_FIDOLIN_COL_V1 */";
const MARK_FN = "// 🛡 COM_BAN_FIDOLIN_FN_V1";

let src = readFileSync(DB_PATH, "utf-8");
let changed = false;

// 1) Neue Tabellen
if (!src.includes(MARK_TABLES)) {
  const ANCHOR = "CREATE INDEX IF NOT EXISTS idx_com_replies_thread ON com_thread_replies(thread_id, created_at ASC);";
  if (!src.includes(ANCHOR)) {
    console.error("✗ Anker idx_com_replies_thread nicht gefunden — erst patch-com-threads ausführen.");
    process.exit(1);
  }
  const INJECT = `${ANCHOR}

    ${MARK_TABLES}
    CREATE TABLE IF NOT EXISTS com_bans (
      group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      banned_at INTEGER NOT NULL,
      banned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      reason TEXT,
      PRIMARY KEY (group_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS fidolin_com_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      ts INTEGER NOT NULL,
      target_type TEXT NOT NULL,
      target_id INTEGER NOT NULL,
      author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      score INTEGER NOT NULL,
      action TEXT NOT NULL,
      reason TEXT,
      content_preview TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_fidolin_log_group ON fidolin_com_log(group_id, ts DESC);

    CREATE TABLE IF NOT EXISTS com_news (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      pinned INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      fidolin_score INTEGER DEFAULT 0,
      fidolin_action TEXT DEFAULT 'none'
    );
    CREATE INDEX IF NOT EXISTS idx_com_news_group ON com_news(group_id, pinned DESC, created_at DESC);`;
  src = src.replace(ANCHOR, INJECT);
  changed = true;
  console.log("✓ com_bans + fidolin_com_log Tabellen ergänzt.");
}

// 2) Spalten für Fidolin-Score + Mega-Features auf groups
if (!src.includes(MARK_COL)) {
  const ANCHOR = `addColumnIfMissing(d, "groups", "welcome_post", "TEXT DEFAULT ''");`;
  if (!src.includes(ANCHOR)) {
    console.error("✗ Anker welcome_post nicht gefunden — erst patch-coms-batch-a ausführen.");
    process.exit(1);
  }
  const INJECT = `${ANCHOR}
  ${MARK_COL}
  // Fidolin-Score-Spalten (0-100), action: 'none'|'hint'|'mark'|'hide'
  addColumnIfMissing(d, "com_threads", "fidolin_score", "INTEGER DEFAULT 0");
  addColumnIfMissing(d, "com_threads", "fidolin_action", "TEXT DEFAULT 'none'");
  addColumnIfMissing(d, "com_thread_replies", "fidolin_score", "INTEGER DEFAULT 0");
  addColumnIfMissing(d, "com_thread_replies", "fidolin_action", "TEXT DEFAULT 'none'");
  addColumnIfMissing(d, "group_posts", "fidolin_score", "INTEGER DEFAULT 0");
  addColumnIfMissing(d, "group_posts", "fidolin_action", "TEXT DEFAULT 'none'");
  // Mega-Features: Category, Sparkles, Hymne, Boost
  addColumnIfMissing(d, "groups", "category", "TEXT DEFAULT 'sonstiges'");
  addColumnIfMissing(d, "groups", "sparkles", "TEXT DEFAULT '[]'"); // JSON array of 3 emojis
  addColumnIfMissing(d, "groups", "boost_total", "INTEGER DEFAULT 0"); // total vibes spent boosting
  addColumnIfMissing(d, "groups", "boost_until", "INTEGER DEFAULT 0"); // active boost expires`;
  src = src.replace(ANCHOR, INJECT);
  changed = true;
  console.log("✓ Fidolin-Score + Mega-Spalten ergänzt.");
}

// 3) Helpers
if (!src.includes(MARK_FN)) {
  const FN = `

${MARK_FN}
// 🛡 Com-Bann + Fidolin-Log Helpers

// === Com-Bann ===

export function addComBan({ groupId, userId, bannedBy, reason }) {
  db().prepare(\`
    INSERT OR REPLACE INTO com_bans (group_id, user_id, banned_at, banned_by, reason)
    VALUES (?, ?, ?, ?, ?)
  \`).run(Number(groupId), Number(userId), Date.now(), Number(bannedBy) || null, reason || null);
  // Auch aus Members rauswerfen
  db().prepare("DELETE FROM group_members WHERE group_id = ? AND user_id = ?")
    .run(Number(groupId), Number(userId));
  return true;
}

export function removeComBan(groupId, userId) {
  const r = db().prepare("DELETE FROM com_bans WHERE group_id = ? AND user_id = ?")
    .run(Number(groupId), Number(userId));
  return r.changes > 0;
}

export function isComBanned(groupId, userId) {
  return db().prepare("SELECT 1 FROM com_bans WHERE group_id = ? AND user_id = ?")
    .get(Number(groupId), Number(userId)) ? true : false;
}

export function listComBans(groupId, { limit = 100 } = {}) {
  return db().prepare(\`
    SELECT cb.user_id AS userId, cb.banned_at AS bannedAt, cb.banned_by AS bannedBy, cb.reason,
           u.username, u.display_name AS displayName, u.emoji,
           bu.username AS bannedByUsername, bu.display_name AS bannedByDisplayName
      FROM com_bans cb
      JOIN users u ON u.id = cb.user_id
      LEFT JOIN users bu ON bu.id = cb.banned_by
     WHERE cb.group_id = ?
     ORDER BY cb.banned_at DESC
     LIMIT ?
  \`).all(Number(groupId), Number(limit));
}

// === Fidolin-Score-Helpers ===

// 0-49: 'none', 50-69: 'hint', 70-89: 'mark', 90+: 'hide'
export function fidolinActionFromScore(score) {
  const s = Math.max(0, Math.min(100, Number(score) || 0));
  if (s >= 90) return "hide";
  if (s >= 70) return "mark";
  if (s >= 50) return "hint";
  return "none";
}

export function setFidolinScore({ targetType, targetId, score, reason, contentPreview, groupId, authorId }) {
  const action = fidolinActionFromScore(score);
  const table = targetType === "thread" ? "com_threads"
    : targetType === "reply" ? "com_thread_replies"
    : targetType === "post" ? "group_posts"
    : null;
  if (!table) throw new Error("Unbekannter target_type: " + targetType);

  db().prepare(\`UPDATE \${table} SET fidolin_score = ?, fidolin_action = ? WHERE id = ?\`)
    .run(Number(score), action, Number(targetId));

  // Log-Eintrag bei action != 'none'
  if (action !== "none") {
    db().prepare(\`
      INSERT INTO fidolin_com_log (group_id, ts, target_type, target_id, author_id, score, action, reason, content_preview)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    \`).run(
      Number(groupId), Date.now(), targetType, Number(targetId),
      Number(authorId) || null, Number(score), action,
      reason || null, (contentPreview || "").slice(0, 280)
    );
  }
  return { action, score };
}

export function listFidolinLog(groupId, { limit = 50 } = {}) {
  return db().prepare(\`
    SELECT fl.id, fl.ts, fl.target_type AS targetType, fl.target_id AS targetId,
           fl.author_id AS authorId, fl.score, fl.action, fl.reason,
           fl.content_preview AS contentPreview,
           u.username AS authorUsername, u.display_name AS authorDisplayName, u.emoji AS authorEmoji
      FROM fidolin_com_log fl
      LEFT JOIN users u ON u.id = fl.author_id
     WHERE fl.group_id = ?
     ORDER BY fl.ts DESC
     LIMIT ?
  \`).all(Number(groupId), Number(limit));
}

export function clearFidolinAction({ targetType, targetId }) {
  const table = targetType === "thread" ? "com_threads"
    : targetType === "reply" ? "com_thread_replies"
    : targetType === "post" ? "group_posts"
    : targetType === "news" ? "com_news" : null;
  if (!table) return false;
  db().prepare(\`UPDATE \${table} SET fidolin_action = 'none' WHERE id = ?\`).run(Number(targetId));
  return true;
}

// === COM_NEWS ===

export function createComNews({ groupId, authorId, title, body }) {
  const t = String(title || "").trim().slice(0, 160);
  const b = String(body || "").trim().slice(0, 4000);
  if (!t) throw new Error("Titel fehlt.");
  if (!b) throw new Error("Text fehlt.");
  const r = db().prepare(\`
    INSERT INTO com_news (group_id, author_id, title, body, created_at)
    VALUES (?, ?, ?, ?, ?)
  \`).run(Number(groupId), Number(authorId), t, b, Date.now());
  return r.lastInsertRowid;
}

export function listComNews(groupId, { limit = 20 } = {}) {
  return db().prepare(\`
    SELECT n.id, n.title, n.body, n.pinned, n.created_at AS createdAt,
           n.fidolin_score AS fidolinScore, n.fidolin_action AS fidolinAction,
           u.username AS authorUsername, u.display_name AS authorDisplayName, u.emoji AS authorEmoji
      FROM com_news n
      LEFT JOIN users u ON u.id = n.author_id
     WHERE n.group_id = ?
     ORDER BY n.pinned DESC, n.created_at DESC
     LIMIT ?
  \`).all(Number(groupId), Number(limit));
}

export function deleteComNews(newsId) {
  db().prepare("DELETE FROM com_news WHERE id = ?").run(Number(newsId));
  return true;
}

export function pinComNews(newsId, pinned) {
  db().prepare("UPDATE com_news SET pinned = ? WHERE id = ?").run(pinned ? 1 : 0, Number(newsId));
  return true;
}

// === Mega-Features: Category, Sparkles, Boost ===

export const COM_CATEGORIES = [
  { id: "musik",    label: "🎵 Musik" },
  { id: "sport",    label: "⚽ Sport" },
  { id: "gaming",   label: "🎮 Gaming" },
  { id: "kunst",    label: "🎨 Kunst" },
  { id: "lokal",    label: "📍 Lokal" },
  { id: "hobby",    label: "🛠 Hobby" },
  { id: "wissen",   label: "📚 Wissen" },
  { id: "lifestyle", label: "✨ Lifestyle" },
  { id: "tv",       label: "📺 TV/Film" },
  { id: "tiere",    label: "🐾 Tiere" },
  { id: "essen",    label: "🍕 Essen" },
  { id: "humor",    label: "😂 Humor" },
  { id: "support",  label: "💞 Support" },
  { id: "sonstiges", label: "🌐 Sonstiges" },
];

export function setComMetaExtended(groupId, { category, sparkles } = {}) {
  const patches = [];
  const args = [];
  if (typeof category === "string" && COM_CATEGORIES.find((c) => c.id === category)) {
    patches.push("category = ?"); args.push(category);
  }
  if (Array.isArray(sparkles) && sparkles.length <= 3) {
    const clean = sparkles.map((s) => String(s || "").slice(0, 6)).filter(Boolean);
    patches.push("sparkles = ?"); args.push(JSON.stringify(clean));
  }
  if (patches.length === 0) return false;
  args.push(Number(groupId));
  db().prepare(\`UPDATE groups SET \${patches.join(", ")} WHERE id = ?\`).run(...args);
  return true;
}

// Vibes spenden für Boost — verlängert boost_until
export function boostCom({ groupId, userId, vibes }) {
  const v = Math.max(1, Math.min(10000, Number(vibes) || 0));
  const spend = spendCredits(Number(userId), v, "com_boost", { groupId });
  if (!spend.ok) {
    return { ok: false, missing: spend.missing };
  }
  // 1 Vibe = 1 Sekunde Boost. 100 Vibes = ~1.6 min, 1000 = ~16 min, 10000 = ~2.7h
  const now = Date.now();
  const cur = db().prepare("SELECT boost_until, boost_total FROM groups WHERE id = ?").get(Number(groupId));
  const baseUntil = cur && cur.boost_until > now ? cur.boost_until : now;
  const newUntil = baseUntil + v * 1000;
  db().prepare("UPDATE groups SET boost_until = ?, boost_total = boost_total + ? WHERE id = ?")
    .run(newUntil, v, Number(groupId));
  return { ok: true, boostUntil: newUntil, totalBoost: (cur?.boost_total || 0) + v };
}

export function listGroupsExtended({ category = null, sort = "new", limit = 100 } = {}) {
  let where = "";
  let args = [];
  if (category) {
    where = "WHERE g.category = ?";
    args.push(category);
  }
  const orderBy =
    sort === "trending" ? "(boost_until > strftime('%s','now')*1000) DESC, post_count_24h DESC, g.created_at DESC"
    : sort === "members" ? "member_count DESC, g.created_at DESC"
    : sort === "active"  ? "post_count_24h DESC, g.created_at DESC"
    : "g.created_at DESC";

  return db().prepare(\`
    SELECT g.id, g.slug, g.name, g.description, g.emoji, g.created_at AS at,
           g.category, g.boost_until AS boostUntil,
           (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) AS member_count,
           (SELECT COUNT(*) FROM group_posts WHERE group_id = g.id) AS post_count,
           (SELECT COUNT(*) FROM com_threads WHERE group_id = g.id AND created_at > (strftime('%s','now')-86400)*1000) AS post_count_24h,
           u.username AS owner_username,
           u.display_name AS owner_display_name,
           u.emoji AS owner_emoji
      FROM groups g
      LEFT JOIN users u ON u.id = g.owner_id
      \${where}
     ORDER BY \${orderBy}
     LIMIT ?
  \`).all(...args, Number(limit));
}
`;
  src += FN;
  changed = true;
  console.log("✓ Com-Bann + Fidolin-Log Helpers angefügt.");
}

if (changed) {
  writeFileSync(DB_PATH, src);
  console.log("\\n✓ db.js gepatched.");
} else {
  console.log("\\n✓ Nichts zu tun.");
}
