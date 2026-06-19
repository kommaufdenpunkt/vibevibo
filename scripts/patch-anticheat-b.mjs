#!/usr/bin/env node
// 🕵 Anti-Cheat-Paket B — Multi-Account-Detection + Self-Like-Block + Bonus-IP-Lock.
//
// Tabellen:
//   • user_ip_history — pro User+IP: first_seen, last_seen, count
//
// Helpers:
//   • recordUserIp(userId, ip) — bei jedem Login/Action aufgerufen
//   • findAccountsByIp(ip) — listet alle User die diese IP genutzt haben
//   • findRelatedAccounts(userId) — Accounts die IP mit diesem User teilen
//   • canClaimDailyBonusFromIp(userId, ip) — true wenn IP noch keinen Bonus heute geclaimt hat
//   • markDailyBonusClaimedFromIp(userId, ip)
//   • countAccountsFromIp24h(ip) — wieviele verschiedene User von dieser IP in 24h

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_TABLE = "/* 🕵 ANTICHEAT_B_TABLE_V1 */";
const MARK_FN    = "// 🕵 ANTICHEAT_B_FN_V1";

let src = readFileSync(DB_PATH, "utf-8");
let changed = false;

// 1) Tabellen — Anker ist die existierende devices-Tabelle
if (!src.includes(MARK_TABLE)) {
  const ANCHOR = "CREATE TABLE IF NOT EXISTS devices (";
  if (!src.includes(ANCHOR)) { console.error("✗ Anker devices fehlt"); process.exit(1); }
  const INJECT = `${MARK_TABLE}
    CREATE TABLE IF NOT EXISTS user_ip_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ip TEXT NOT NULL,
      first_seen INTEGER NOT NULL,
      last_seen INTEGER NOT NULL,
      use_count INTEGER NOT NULL DEFAULT 1,
      UNIQUE(user_id, ip)
    );
    CREATE INDEX IF NOT EXISTS idx_user_ip_user ON user_ip_history(user_id, last_seen DESC);
    CREATE INDEX IF NOT EXISTS idx_user_ip_ip   ON user_ip_history(ip, last_seen DESC);

    CREATE TABLE IF NOT EXISTS daily_bonus_ip_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ip TEXT NOT NULL,
      day_key TEXT NOT NULL,
      claimed_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_bonus_ip_day ON daily_bonus_ip_log(ip, day_key);
    CREATE INDEX IF NOT EXISTS idx_bonus_user_day ON daily_bonus_ip_log(user_id, day_key);

    ${ANCHOR}`;
  src = src.replace(ANCHOR, INJECT);
  changed = true;
  console.log("✓ Anti-Cheat-B Tabellen ergänzt (user_ip_history, daily_bonus_ip_log).");
}

// 2) Helpers
if (!src.includes(MARK_FN)) {
  const FN = `

${MARK_FN}
// 🕵 Anti-Cheat-Paket B — Helpers

function _dayKeyAntiCheat(ts = Date.now()) {
  const d = new Date(ts);
  return d.getUTCFullYear() + "-" + (d.getUTCMonth() + 1) + "-" + d.getUTCDate();
}

// Tracking: bei jedem Login aufrufen
export function recordUserIp(userId, ip) {
  if (!userId || !ip) return;
  const now = Date.now();
  try {
    db().prepare(\`
      INSERT INTO user_ip_history (user_id, ip, first_seen, last_seen, use_count)
      VALUES (?, ?, ?, ?, 1)
      ON CONFLICT(user_id, ip) DO UPDATE SET
        last_seen = excluded.last_seen,
        use_count = use_count + 1
    \`).run(Number(userId), String(ip).slice(0, 64), now, now);
  } catch {}
}

// Alle Accounts die jemals von dieser IP kamen
export function findAccountsByIp(ip, { limit = 50 } = {}) {
  if (!ip) return [];
  try {
    return db().prepare(\`
      SELECT u.id, u.username, u.display_name AS displayName,
             u.created_at AS createdAt, u.status,
             COALESCE(u.role, 'user') AS role,
             h.first_seen AS firstSeen, h.last_seen AS lastSeen, h.use_count AS useCount
        FROM user_ip_history h
        LEFT JOIN users u ON u.id = h.user_id
        WHERE h.ip = ?
        ORDER BY h.last_seen DESC
        LIMIT ?
    \`).all(String(ip), Number(limit));
  } catch { return []; }
}

// Accounts die mit diesem User mind. eine IP teilen
export function findRelatedAccounts(userId, { limit = 50 } = {}) {
  if (!userId) return [];
  try {
    return db().prepare(\`
      SELECT DISTINCT u.id, u.username, u.display_name AS displayName,
             u.created_at AS createdAt, u.status,
             COALESCE(u.role, 'user') AS role,
             h2.ip AS sharedIp, h2.last_seen AS sharedLastSeen
        FROM user_ip_history h1
        JOIN user_ip_history h2 ON h2.ip = h1.ip AND h2.user_id != h1.user_id
        LEFT JOIN users u ON u.id = h2.user_id
        WHERE h1.user_id = ?
        ORDER BY h2.last_seen DESC
        LIMIT ?
    \`).all(Number(userId), Number(limit));
  } catch { return []; }
}

// Wieviele unterschiedliche User-Accounts kamen in den letzten N ms von dieser IP?
export function countAccountsFromIp(ip, windowMs = 24 * 3600 * 1000) {
  if (!ip) return 0;
  const since = Date.now() - Number(windowMs);
  try {
    return db().prepare(\`
      SELECT COUNT(DISTINCT user_id) AS c
        FROM user_ip_history
        WHERE ip = ? AND last_seen > ?
    \`).get(String(ip), since).c || 0;
  } catch { return 0; }
}

// Daily-Bonus IP-Lock: pro IP pro Tag nur EIN Bonus
export function canClaimDailyBonusFromIp(userId, ip) {
  if (!userId || !ip) return true; // Wenn IP unknown → erlauben (Edge case)
  const dayKey = _dayKeyAntiCheat();
  try {
    const exists = db().prepare(\`
      SELECT user_id FROM daily_bonus_ip_log
       WHERE ip = ? AND day_key = ?
       LIMIT 1
    \`).get(String(ip), dayKey);
    if (!exists) return true;
    // Gleicher User darf nochmal (z.B. Re-Login) — schon vom claimDailyBonus geblockt
    return Number(exists.user_id) === Number(userId);
  } catch { return true; }
}

export function markDailyBonusClaimedFromIp(userId, ip) {
  if (!userId || !ip) return;
  try {
    db().prepare(\`
      INSERT INTO daily_bonus_ip_log (user_id, ip, day_key, claimed_at)
      VALUES (?, ?, ?, ?)
    \`).run(Number(userId), String(ip), _dayKeyAntiCheat(), Date.now());
  } catch {}
}

// Self-Reaction-Block: User darf nicht auf seinen eigenen Content reagieren
export function canReactToContent({ targetType, targetId, userId }) {
  if (!userId) return false;
  try {
    let ownerId = null;
    if (targetType === "pinnwand") {
      const r = db().prepare("SELECT user_id FROM pinnwand WHERE id = ?").get(Number(targetId));
      ownerId = r?.user_id;
    } else if (targetType === "status") {
      const r = db().prepare("SELECT user_id FROM statuses WHERE id = ?").get(Number(targetId));
      ownerId = r?.user_id;
    } else if (targetType === "grouppost") {
      const r = db().prepare("SELECT author_id FROM group_posts WHERE id = ?").get(Number(targetId));
      ownerId = r?.author_id;
    } else if (targetType === "buschfunk_comment") {
      const r = db().prepare("SELECT author_id FROM buschfunk_comments WHERE id = ?").get(Number(targetId));
      ownerId = r?.author_id;
    }
    if (ownerId && Number(ownerId) === Number(userId)) return false; // Self-Reaction blockiert
  } catch {}
  return true;
}
`;
  src += FN;
  changed = true;
  console.log("✓ Anti-Cheat-B Helpers angefügt.");
}

if (changed) {
  writeFileSync(DB_PATH, src);
  console.log("\\n✓ db.js gepatched (Anti-Cheat-B).");
} else {
  console.log("\\n✓ Nichts zu tun.");
}
