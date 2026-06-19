#!/usr/bin/env node
// 🛡 Security-Paket A — DB-Patch: Login-Audit, MCP-Throttle, CSRF-Token-Pool.
//
// Tabellen:
//   • mcp_login_audit — jeder MCP-Login-Versuch (success/fail) mit IP+UA+Grund
//   • mcp_failed_logins — DB-backed Fail-Counter (überlebt Worker-Restart)
//
// Helpers (idempotent angehängt):
//   • recordMcpLoginAttempt({ username, ip, ua, success, reason })
//   • countMcpFailsByUsername(username, windowMs)
//   • countMcpFailsByIp(ip, windowMs)
//   • clearMcpFails(username)
//   • listMcpLoginAudit({ username?, ip?, limit?, success? })

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_TABLE = "/* 🛡 SEC_A_TABLE_V1 */";
const MARK_FN = "// 🛡 SEC_A_FN_V1";

let src = readFileSync(DB_PATH, "utf-8");
let changed = false;

// 1) Tabellen ─────────────────────────────────────────────────────────────
if (!src.includes(MARK_TABLE)) {
  const ANCHOR = "CREATE TABLE IF NOT EXISTS mcp_sessions (";
  if (!src.includes(ANCHOR)) { console.error("✗ Anker mcp_sessions fehlt"); process.exit(1); }
  const INJECT = `${MARK_TABLE}
    CREATE TABLE IF NOT EXISTS mcp_login_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL DEFAULT '',
      user_id INTEGER,
      ip TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      success INTEGER NOT NULL DEFAULT 0,
      reason TEXT DEFAULT '',
      ts INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_mcp_login_audit_user ON mcp_login_audit(username, ts DESC);
    CREATE INDEX IF NOT EXISTS idx_mcp_login_audit_ip ON mcp_login_audit(ip, ts DESC);
    CREATE INDEX IF NOT EXISTS idx_mcp_login_audit_recent ON mcp_login_audit(ts DESC);

    CREATE TABLE IF NOT EXISTS mcp_failed_logins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL DEFAULT '',
      ip TEXT DEFAULT '',
      ts INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_mcp_failed_user ON mcp_failed_logins(username, ts);
    CREATE INDEX IF NOT EXISTS idx_mcp_failed_ip ON mcp_failed_logins(ip, ts);

    ${ANCHOR}`;
  src = src.replace(ANCHOR, INJECT);
  changed = true;
  console.log("✓ MCP-Login-Audit + Failed-Login-Tabellen ergänzt.");
}

// 2) Helpers ──────────────────────────────────────────────────────────────
if (!src.includes(MARK_FN)) {
  const FN = `

${MARK_FN}
// 🛡 Security-Paket A — MCP-Login-Audit + Throttle-Helpers

const MCP_AUDIT_RETENTION_MS = 90 * 24 * 3600 * 1000;
const MCP_FAILS_RETENTION_MS = 24 * 3600 * 1000;

export function recordMcpLoginAttempt({ username = "", userId = null, ip = "", ua = "", success = false, reason = "" }) {
  try {
    db().prepare(\`
      INSERT INTO mcp_login_audit (username, user_id, ip, user_agent, success, reason, ts)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    \`).run(
      String(username || "").toLowerCase().slice(0, 64),
      userId ? Number(userId) : null,
      String(ip || "").slice(0, 64),
      String(ua || "").slice(0, 240),
      success ? 1 : 0,
      String(reason || "").slice(0, 80),
      Date.now()
    );
    if (!success) {
      db().prepare("INSERT INTO mcp_failed_logins (username, ip, ts) VALUES (?, ?, ?)").run(
        String(username || "").toLowerCase().slice(0, 64),
        String(ip || "").slice(0, 64),
        Date.now()
      );
    }
    // Opportunistic GC (1% Chance) — kein Cron nötig
    if (Math.random() < 0.01) {
      const auditCutoff = Date.now() - MCP_AUDIT_RETENTION_MS;
      const failsCutoff = Date.now() - MCP_FAILS_RETENTION_MS;
      try { db().prepare("DELETE FROM mcp_login_audit WHERE ts < ?").run(auditCutoff); } catch {}
      try { db().prepare("DELETE FROM mcp_failed_logins WHERE ts < ?").run(failsCutoff); } catch {}
    }
  } catch {}
}

export function countMcpFailsByUsername(username, windowMs = 15 * 60 * 1000) {
  if (!username) return 0;
  const since = Date.now() - Number(windowMs);
  try {
    return db().prepare("SELECT COUNT(*) AS c FROM mcp_failed_logins WHERE username = ? AND ts > ?")
      .get(String(username).toLowerCase(), since).c || 0;
  } catch { return 0; }
}

export function countMcpFailsByIp(ip, windowMs = 15 * 60 * 1000) {
  if (!ip) return 0;
  const since = Date.now() - Number(windowMs);
  try {
    return db().prepare("SELECT COUNT(*) AS c FROM mcp_failed_logins WHERE ip = ? AND ts > ?")
      .get(String(ip), since).c || 0;
  } catch { return 0; }
}

export function clearMcpFails(username) {
  if (!username) return;
  try { db().prepare("DELETE FROM mcp_failed_logins WHERE username = ?").run(String(username).toLowerCase()); } catch {}
}

export function getMcpSecurityOverview({ windowMs = 24 * 3600 * 1000 } = {}) {
  const since = Date.now() - Number(windowMs);
  let attemptsTotal = 0, attemptsSuccess = 0, attemptsFail = 0;
  let blockedRatelimit = 0, blockedBadIp = 0, blockedVpn = 0;
  let topFailingIps = [], topFailingUsernames = [];
  try {
    const rows = db().prepare(\`
      SELECT success, reason FROM mcp_login_audit WHERE ts > ?
    \`).all(since);
    for (const r of rows) {
      attemptsTotal++;
      if (r.success === 1) attemptsSuccess++;
      else {
        attemptsFail++;
        if (String(r.reason).startsWith("ratelimit") || String(r.reason).endsWith("lockout")) blockedRatelimit++;
        if (String(r.reason).startsWith("bad_ip")) blockedBadIp++;
        if (String(r.reason).startsWith("vpn")) blockedVpn++;
      }
    }
  } catch {}
  try {
    topFailingIps = db().prepare(\`
      SELECT ip, COUNT(*) AS c
        FROM mcp_failed_logins
       WHERE ts > ? AND ip != ''
       GROUP BY ip
       ORDER BY c DESC
       LIMIT 5
    \`).all(since);
  } catch {}
  try {
    topFailingUsernames = db().prepare(\`
      SELECT username, COUNT(*) AS c
        FROM mcp_failed_logins
       WHERE ts > ? AND username != ''
       GROUP BY username
       ORDER BY c DESC
       LIMIT 5
    \`).all(since);
  } catch {}
  return {
    windowMs, since,
    attemptsTotal, attemptsSuccess, attemptsFail,
    blockedRatelimit, blockedBadIp, blockedVpn,
    topFailingIps, topFailingUsernames,
  };
}

export function listMcpLoginAudit({ username = null, ip = null, success = null, limit = 100 } = {}) {
  const where = [];
  const params = [];
  if (username) { where.push("username = ?"); params.push(String(username).toLowerCase()); }
  if (ip) { where.push("ip = ?"); params.push(String(ip)); }
  if (success === true) where.push("success = 1");
  else if (success === false) where.push("success = 0");
  const whereSql = where.length ? \`WHERE \${where.join(" AND ")}\` : "";
  params.push(Number(limit));
  try {
    return db().prepare(\`
      SELECT id, username, user_id AS userId, ip, user_agent AS userAgent,
             success, reason, ts
        FROM mcp_login_audit
        \${whereSql}
        ORDER BY ts DESC LIMIT ?
    \`).all(...params);
  } catch { return []; }
}
`;
  src += FN;
  changed = true;
  console.log("✓ MCP-Audit-Helpers angefügt.");
}

if (changed) {
  writeFileSync(DB_PATH, src);
  console.log("\\n✓ db.js gepatched (Security-Paket A).");
} else {
  console.log("\\n✓ Nichts zu tun (Security-Paket A bereits installiert).");
}
