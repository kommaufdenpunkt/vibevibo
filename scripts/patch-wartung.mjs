#!/usr/bin/env node
// 🛡 Wartungs- und Hacker-Schutz-Schema — idempotent.
// • permabans (lebenslange IP-Sperren)
// • attack_log (was wann von wem versucht wurde)
// • maintenance_log (welche Wartung wann gelaufen)

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_TABLES = "/* 🛡 WARTUNG_TABLES_V1 */";
const MARK_FN = "// 🛡 WARTUNG_FN_V1";

let src = readFileSync(DB_PATH, "utf-8");
let changed = false;

if (!src.includes(MARK_TABLES)) {
  const ANCHOR = "CREATE INDEX IF NOT EXISTS idx_com_reactions_target ON com_reactions(target_type, target_id);";
  if (!src.includes(ANCHOR)) {
    console.error("✗ Anker idx_com_reactions_target nicht gefunden — erst patch-coms-batch-a ausführen.");
    process.exit(1);
  }
  const INJECT = `${ANCHOR}

    ${MARK_TABLES}
    CREATE TABLE IF NOT EXISTS permabans (
      ip TEXT PRIMARY KEY,
      banned_at INTEGER NOT NULL,
      reason TEXT NOT NULL,
      pattern TEXT,
      attack_payload TEXT,
      method TEXT,
      path TEXT,
      user_agent TEXT
    );

    CREATE TABLE IF NOT EXISTS attack_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT NOT NULL,
      ts INTEGER NOT NULL,
      pattern TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'high',
      payload TEXT,
      method TEXT,
      path TEXT,
      user_agent TEXT,
      banned INTEGER NOT NULL DEFAULT 1
    );
    CREATE INDEX IF NOT EXISTS idx_attack_log_ts ON attack_log(ts DESC);
    CREATE INDEX IF NOT EXISTS idx_attack_log_ip ON attack_log(ip);

    CREATE TABLE IF NOT EXISTS maintenance_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      action TEXT NOT NULL,
      result TEXT NOT NULL,
      details TEXT,
      duration_ms INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_maintenance_log_ts ON maintenance_log(ts DESC);`;
  src = src.replace(ANCHOR, INJECT);
  changed = true;
  console.log("✓ Wartungs-Tabellen ergänzt.");
}

if (!src.includes(MARK_FN)) {
  const FN = `

${MARK_FN}
// 🛡 Wartungs- und Hacker-Schutz-Helpers

export function addPermaban({ ip, reason, pattern, payload, method, path, userAgent }) {
  if (!ip) return false;
  db().prepare(\`
    INSERT OR IGNORE INTO permabans (ip, banned_at, reason, pattern, attack_payload, method, path, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  \`).run(ip, Date.now(), reason, pattern || null, payload || null, method || null, path || null, userAgent || null);
  return true;
}

export function isPermabanned(ip) {
  if (!ip) return null;
  return db().prepare("SELECT ip, banned_at AS bannedAt, reason FROM permabans WHERE ip = ?").get(ip) || null;
}

export function removePermaban(ip) {
  return db().prepare("DELETE FROM permabans WHERE ip = ?").run(ip).changes > 0;
}

export function listPermabans({ limit = 200 } = {}) {
  return db().prepare(\`
    SELECT ip, banned_at AS bannedAt, reason, pattern, attack_payload AS attackPayload,
           method, path, user_agent AS userAgent
      FROM permabans
     ORDER BY banned_at DESC
     LIMIT ?
  \`).all(Number(limit));
}

export function countPermabans() {
  return db().prepare("SELECT COUNT(*) AS c FROM permabans").get().c || 0;
}

export function logAttack({ ip, pattern, severity = "high", payload, method, path, userAgent, banned = true }) {
  db().prepare(\`
    INSERT INTO attack_log (ip, ts, pattern, severity, payload, method, path, user_agent, banned)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  \`).run(
    String(ip || "?"), Date.now(), String(pattern),
    severity, payload || null, method || null,
    path || null, userAgent || null,
    banned ? 1 : 0
  );
}

export function listRecentAttacks({ limit = 50, sinceMs = null } = {}) {
  if (sinceMs) {
    return db().prepare(\`
      SELECT id, ip, ts, pattern, severity, payload, method, path, user_agent AS userAgent, banned
        FROM attack_log
       WHERE ts >= ?
       ORDER BY ts DESC
       LIMIT ?
    \`).all(Number(sinceMs), Number(limit));
  }
  return db().prepare(\`
    SELECT id, ip, ts, pattern, severity, payload, method, path, user_agent AS userAgent, banned
      FROM attack_log
     ORDER BY ts DESC
     LIMIT ?
  \`).all(Number(limit));
}

export function getAttackStats({ sinceMs = Date.now() - 86400_000 } = {}) {
  const s = db().prepare(\`
    SELECT COUNT(*) AS total,
           COUNT(DISTINCT ip) AS uniqueIps,
           SUM(CASE WHEN banned = 1 THEN 1 ELSE 0 END) AS bansCreated
      FROM attack_log
     WHERE ts >= ?
  \`).get(Number(sinceMs));
  const byPattern = db().prepare(\`
    SELECT pattern, COUNT(*) AS c
      FROM attack_log
     WHERE ts >= ?
     GROUP BY pattern
     ORDER BY c DESC
     LIMIT 10
  \`).all(Number(sinceMs));
  return { ...s, byPattern };
}

export function logMaintenance({ action, result, details, durationMs }) {
  db().prepare(\`
    INSERT INTO maintenance_log (ts, action, result, details, duration_ms)
    VALUES (?, ?, ?, ?, ?)
  \`).run(Date.now(), String(action), String(result), details || null, durationMs || null);
}

export function listMaintenanceLog({ limit = 30 } = {}) {
  return db().prepare(\`
    SELECT id, ts, action, result, details, duration_ms AS durationMs
      FROM maintenance_log
     ORDER BY ts DESC
     LIMIT ?
  \`).all(Number(limit));
}

// === System-Health Checks ===

export function dbIntegrityCheck() {
  try {
    const rows = db().prepare("PRAGMA integrity_check").all();
    const ok = rows.length === 1 && rows[0].integrity_check === "ok";
    return { ok, details: rows.map((r) => r.integrity_check).join(", ") };
  } catch (e) {
    return { ok: false, details: e.message };
  }
}

export function dbStats() {
  const pageCount = db().prepare("PRAGMA page_count").get()?.page_count || 0;
  const pageSize = db().prepare("PRAGMA page_size").get()?.page_size || 0;
  const sizeBytes = pageCount * pageSize;
  const tables = db().prepare(\`
    SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name
  \`).all();
  const counts = {};
  for (const t of tables) {
    try {
      counts[t.name] = db().prepare(\`SELECT COUNT(*) AS c FROM "\${t.name}"\`).get().c;
    } catch { counts[t.name] = "?"; }
  }
  return { sizeBytes, pageCount, pageSize, tableCount: tables.length, counts };
}

export function expiredSessionCount({ now = Date.now() } = {}) {
  try {
    return db().prepare(\`SELECT COUNT(*) AS c FROM sessions WHERE expires_at < ?\`).get(now).c || 0;
  } catch { return 0; }
}

export function cleanupExpiredSessions({ now = Date.now() } = {}) {
  try {
    const r = db().prepare(\`DELETE FROM sessions WHERE expires_at < ?\`).run(now);
    return r.changes;
  } catch { return 0; }
}

export function walCheckpoint() {
  try {
    const r = db().prepare("PRAGMA wal_checkpoint(TRUNCATE)").get();
    return { ok: true, busy: r.busy, log: r.log, checkpointed: r.checkpointed };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export function dbVacuum() {
  try {
    const before = dbStats().sizeBytes;
    db().exec("VACUUM");
    const after = dbStats().sizeBytes;
    return { ok: true, freedBytes: before - after, beforeBytes: before, afterBytes: after };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export function countOrphanPhotos() {
  try {
    return db().prepare(\`
      SELECT COUNT(*) AS c FROM photos
       WHERE user_id NOT IN (SELECT id FROM users)
    \`).get().c || 0;
  } catch { return 0; }
}

export function cleanupOrphanPhotos() {
  try {
    return db().prepare(\`
      DELETE FROM photos WHERE user_id NOT IN (SELECT id FROM users)
    \`).run().changes;
  } catch { return 0; }
}

export function countOrphanGroupMembers() {
  try {
    return db().prepare(\`
      SELECT COUNT(*) AS c FROM group_members
       WHERE user_id NOT IN (SELECT id FROM users)
          OR group_id NOT IN (SELECT id FROM groups)
    \`).get().c || 0;
  } catch { return 0; }
}

export function cleanupOrphanGroupMembers() {
  try {
    return db().prepare(\`
      DELETE FROM group_members
       WHERE user_id NOT IN (SELECT id FROM users)
          OR group_id NOT IN (SELECT id FROM groups)
    \`).run().changes;
  } catch { return 0; }
}
`;
  src += FN;
  changed = true;
  console.log("✓ Wartungs-Helper angehängt.");
}

if (changed) {
  writeFileSync(DB_PATH, src);
  console.log("\\n✓ db.js gepatched. Server-Restart nötig.");
} else {
  console.log("\\n✓ Nichts zu tun.");
}
