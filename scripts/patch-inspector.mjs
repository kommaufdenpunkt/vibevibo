#!/usr/bin/env node
// 🔍 Admin-Inspector-Helpers — umfassende User-Diagnose.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK = "// 🔍 INSPECTOR_V1";

let src = readFileSync(DB_PATH, "utf-8");
if (src.includes(MARK)) {
  console.log("✓ Inspector schon da — skip.");
  process.exit(0);
}

const FN = `

${MARK}
// 🔍 Admin-Inspector — umfassende User-Diagnose

export function searchUsers({ q = "", limit = 50 } = {}) {
  const query = String(q || "").trim();
  if (!query) {
    return db().prepare(\`
      SELECT id, username, display_name AS displayName, email, emoji,
             status, gender, birthdate, created_at AS createdAt,
             last_seen AS lastSeen
        FROM users
       ORDER BY id DESC
       LIMIT ?
    \`).all(Number(limit));
  }
  const like = "%" + query.replace(/[%_]/g, "\\\\$&") + "%";
  return db().prepare(\`
    SELECT id, username, display_name AS displayName, email, emoji,
           status, gender, birthdate, created_at AS createdAt,
           last_seen AS lastSeen
      FROM users
     WHERE username LIKE ? OR display_name LIKE ? OR email LIKE ?
        OR CAST(id AS TEXT) = ?
     ORDER BY id DESC
     LIMIT ?
  \`).all(like, like, like, query, Number(limit));
}

export function getUserInspection(userId) {
  const u = db().prepare(\`
    SELECT id, username, display_name AS displayName, email, emoji,
           status, gender, birthdate, created_at AS createdAt,
           last_seen AS lastSeen, avatar_url AS avatarUrl,
           avatar_status AS avatarStatus, mood, bio
      FROM users
     WHERE id = ?
  \`).get(Number(userId));
  if (!u) return null;

  // Credits + Tx-Verlauf
  let credits = null;
  try { credits = getCredits(Number(userId)); } catch {}
  let txLog = [];
  try { txLog = listCreditTx(Number(userId), 30); } catch {}

  // Achievements
  let achievements = [];
  try {
    achievements = db().prepare(\`
      SELECT slug, earned_at AS earnedAt
        FROM user_achievements
       WHERE user_id = ?
       ORDER BY earned_at DESC
       LIMIT 30
    \`).all(Number(userId));
  } catch {}

  // Aktivitäts-Zähler
  const counts = {
    pinnwand: safe(() => db().prepare("SELECT COUNT(*) AS c FROM pinnwand WHERE author_id = ?").get(userId).c),
    buschfunkPosts: safe(() => db().prepare("SELECT COUNT(*) AS c FROM buschfunk_events WHERE user_id = ?").get(userId).c),
    giftsSent: safe(() => db().prepare("SELECT COUNT(*) AS c FROM gifts WHERE from_user_id = ?").get(userId).c),
    giftsReceived: safe(() => db().prepare("SELECT COUNT(*) AS c FROM gifts WHERE to_user_id = ?").get(userId).c),
    messagesSent: safe(() => db().prepare("SELECT COUNT(*) AS c FROM messages WHERE from_user_id = ?").get(userId).c),
    photos: safe(() => db().prepare("SELECT COUNT(*) AS c FROM photos WHERE user_id = ?").get(userId).c),
    friends: safe(() => db().prepare("SELECT COUNT(*) AS c FROM friendships WHERE (user_a = ? OR user_b = ?) AND status = 'accepted'").get(userId, userId).c),
    coms: safe(() => db().prepare("SELECT COUNT(*) AS c FROM group_members WHERE user_id = ?").get(userId).c),
    visits: safe(() => db().prepare("SELECT COUNT(*) AS c FROM profile_visits WHERE visitor_id = ?").get(userId).c),
    visitedBy: safe(() => db().prepare("SELECT COUNT(*) AS c FROM profile_visits WHERE visited_id = ?").get(userId).c),
  };

  // Coms-Mitgliedschaften
  let coms = [];
  try {
    coms = db().prepare(\`
      SELECT g.slug, g.name, g.emoji, gm.role, gm.joined_at AS joinedAt
        FROM group_members gm
        JOIN groups g ON g.id = gm.group_id
       WHERE gm.user_id = ?
       ORDER BY gm.joined_at DESC
       LIMIT 20
    \`).all(Number(userId));
  } catch {}

  // Sessions / Login-Historie
  let sessions = [];
  try {
    sessions = db().prepare(\`
      SELECT id, ip, user_agent AS userAgent, created_at AS createdAt, expires_at AS expiresAt
        FROM sessions
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 20
    \`).all(Number(userId));
  } catch {}

  // Sanctions (aktive Strafen)
  let sanctions = [];
  try {
    sanctions = db().prepare(\`
      SELECT id, kind, reason, created_at AS createdAt, expires_at AS expiresAt, lifted_at AS liftedAt
        FROM sanctions
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 20
    \`).all(Number(userId));
  } catch {}

  // Mod-Log (was Admin/Mod über diesen User gemacht haben)
  let modLog = [];
  try {
    modLog = db().prepare(\`
      SELECT id, action, by_admin AS byAdmin, details, created_at AS createdAt
        FROM mod_log
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 30
    \`).all(Number(userId));
  } catch {}

  // Rang/XP
  let rank = null;
  try {
    rank = db().prepare(\`
      SELECT xp, last_xp_at AS lastXpAt
        FROM user_rank
       WHERE user_id = ?
    \`).get(Number(userId));
  } catch {}

  return {
    user: u,
    credits,
    txLog,
    achievements,
    counts,
    coms,
    sessions,
    sanctions,
    modLog,
    rank,
  };
}

function safe(fn) { try { return fn() || 0; } catch { return 0; } }

export function listAllAchievementsWithEarners({ slug = null, limit = 50 } = {}) {
  if (slug) {
    return db().prepare(\`
      SELECT ua.user_id AS userId, ua.earned_at AS earnedAt,
             u.username, u.display_name AS displayName, u.emoji
        FROM user_achievements ua
        JOIN users u ON u.id = ua.user_id
       WHERE ua.slug = ?
       ORDER BY ua.earned_at DESC
       LIMIT ?
    \`).all(slug, Number(limit));
  }
  return [];
}
`;

src += FN;
writeFileSync(DB_PATH, src);
console.log("✓ Inspector-Helpers angefügt.");
console.log("  searchUsers, getUserInspection, listAllAchievementsWithEarners");
