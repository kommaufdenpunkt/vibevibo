// 📋 Userakte-Zugriff-Audit — wer schaut wann auf welche Akte und WARUM.
// Schreibt in eigene Tabelle akte_access_log (siehe scripts/patch-akte-audit.mjs).
// Genutzt von:
//   • app/api/mcp/akte/log-access/route.js    (Mod loggt Zugriff mit Grund)
//   • app/api/mcp/akte/check-access/route.js  (Frontend prüft ob schon geloggt)
//   • app/(mcp)/mcp/akte-audit/page.jsx       (Admin/Owner sieht Übersicht)

import Database from "better-sqlite3";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

const DEFAULT_WINDOW_MS = 30 * 60 * 1000; // 30 Minuten gilt ein Zugriff als "frisch"
const MIN_REASON_LEN = 10;

function findDbPath() {
  const env = process.env.DB_PATH || process.env.VV_DB_PATH;
  if (env && existsSync(env)) return env;
  const cwd = process.cwd();
  const candidates = [
    resolve(cwd, "data/db.sqlite"),
    resolve(cwd, "data/vibevibo.db"),
    "/data/db.sqlite",
    "/data/vibevibo.db",
    "/app/data/db.sqlite",
  ];
  for (const p of candidates) if (existsSync(p)) return p;
  throw new Error("akteAudit: SQLite-DB nicht gefunden. Setze DB_PATH env var.");
}

let _db = null;
function db() {
  if (!_db) _db = new Database(findDbPath());
  return _db;
}

// Loggt einen Akte-Zugriff. modId + targetUserId + reason (min 10 Zeichen) sind Pflicht.
export function logAkteAccess({ modId, targetUserId, reason, ip = "", ua = "" }) {
  if (!modId || !targetUserId) throw new Error("modId und targetUserId nötig.");
  const cleanReason = String(reason || "").trim();
  if (cleanReason.length < MIN_REASON_LEN) {
    throw new Error(`Begründung muss mindestens ${MIN_REASON_LEN} Zeichen lang sein.`);
  }
  const r = db()
    .prepare(
      `INSERT INTO akte_access_log (mod_id, target_user_id, reason, accessed_at, ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(modId, targetUserId, cleanReason.slice(0, 500), Date.now(), String(ip).slice(0, 64), String(ua).slice(0, 200));
  return r.lastInsertRowid;
}

// Prüft ob dieser Mod innerhalb des Zeitfensters bereits einen Zugriff auf diese Akte
// mit Begründung geloggt hat. True → Akte darf angezeigt werden ohne neuen Modal.
export function hasRecentAkteAccess(modId, targetUserId, windowMs = DEFAULT_WINDOW_MS) {
  if (!modId || !targetUserId) return false;
  const cutoff = Date.now() - windowMs;
  const row = db()
    .prepare(
      `SELECT id, reason, accessed_at FROM akte_access_log
       WHERE mod_id = ? AND target_user_id = ? AND accessed_at >= ?
       ORDER BY accessed_at DESC LIMIT 1`
    )
    .get(modId, targetUserId, cutoff);
  return row || null;
}

// Liste alle Zugriffe (für Admin-Übersicht).
// Filter: byModId, byTargetUserId, fromTs (default: 7 Tage), limit (default 200).
export function listAkteAccess({
  byModId = null,
  byTargetUserId = null,
  fromTs = Date.now() - 7 * 24 * 60 * 60 * 1000,
  limit = 200,
} = {}) {
  let sql = "SELECT * FROM akte_access_log WHERE accessed_at >= ?";
  const params = [fromTs];
  if (byModId) {
    sql += " AND mod_id = ?";
    params.push(byModId);
  }
  if (byTargetUserId) {
    sql += " AND target_user_id = ?";
    params.push(byTargetUserId);
  }
  sql += " ORDER BY accessed_at DESC LIMIT ?";
  params.push(Math.min(Math.max(limit, 1), 1000));
  return db().prepare(sql).all(...params);
}

// Zähle Akte-Zugriffe eines Mods seit Zeitpunkt (für Auffälligkeits-Check).
export function countAkteAccessByMod(modId, sinceTs) {
  if (!modId) return 0;
  const r = db()
    .prepare("SELECT COUNT(*) as c FROM akte_access_log WHERE mod_id = ? AND accessed_at >= ?")
    .get(modId, sinceTs);
  return r?.c || 0;
}

// Zähle wie oft eine bestimmte Akte in einem Zeitraum aufgerufen wurde
// (für Häufigkeits-Indikator pro User).
export function countAkteAccessByTarget(targetUserId, sinceTs) {
  if (!targetUserId) return 0;
  const r = db()
    .prepare("SELECT COUNT(*) as c FROM akte_access_log WHERE target_user_id = ? AND accessed_at >= ?")
    .get(targetUserId, sinceTs);
  return r?.c || 0;
}
