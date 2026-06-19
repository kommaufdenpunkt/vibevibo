#!/usr/bin/env node
// 📋 Userakte — Owner-Felder für Mitglieder-Verwaltung im Admin.
//
// Erweitert users-Tabelle um:
//   • real_name      — Klarname (für Versand-Adresse / ID-Verifikation)
//   • addr_street    — Straße + Hausnummer
//   • addr_zip       — PLZ
//   • addr_city      — Wohnort
//   • addr_country   — Land (Default DE)
//   • id_verified    — Ausweis verifiziert (0/1)
//   • id_doc_url     — Pfad zu hochgeladenem Ausweis-Scan (admin-only)
//   • admin_notes    — interne Notizen vom Admin
//
// Helpers:
//   • listUsersByRole({ role, search, limit, offset })
//   • getFullUserAkte(userId) — komplettes Dossier
//   • updateUserAdminFields(userId, fields)
//   • setUserAdminNotes(userId, notes)

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_COL = "/* USERAKTE_COL_V1 */";
const MARK_FN  = "// USERAKTE_FN_V1";

let src = readFileSync(DB_PATH, "utf-8");
let changed = false;

// 1) Spalten — Anker ist die stabile Geschlecht-Spalte
if (!src.includes(MARK_COL)) {
  const ANCHOR = `addColumnIfMissing(d, "users", "gender", "TEXT DEFAULT ''");`;
  if (!src.includes(ANCHOR)) {
    console.error("✗ Anker (users.gender Spalte) nicht gefunden");
    process.exit(1);
  }
  const INJECT = `${ANCHOR}

  ${MARK_COL}
  // 📋 Userakte — Owner-Felder für Mitglieder-Verwaltung
  addColumnIfMissing(d, "users", "real_name",     "TEXT DEFAULT ''");
  addColumnIfMissing(d, "users", "addr_street",   "TEXT DEFAULT ''");
  addColumnIfMissing(d, "users", "addr_zip",      "TEXT DEFAULT ''");
  addColumnIfMissing(d, "users", "addr_city",     "TEXT DEFAULT ''");
  addColumnIfMissing(d, "users", "addr_country",  "TEXT DEFAULT 'DE'");
  addColumnIfMissing(d, "users", "id_verified",   "INTEGER DEFAULT 0");
  addColumnIfMissing(d, "users", "id_doc_url",    "TEXT DEFAULT ''");
  addColumnIfMissing(d, "users", "admin_notes",   "TEXT DEFAULT ''");`;
  src = src.replace(ANCHOR, INJECT);
  changed = true;
  console.log("✓ Userakte-Spalten ergänzt.");
}

// 2) Helpers
if (!src.includes(MARK_FN)) {
  const FN = `

${MARK_FN}
// 📋 Userakte — Owner-Helpers für Mitglieder-Verwaltung

// Liste Mitglieder gefiltert nach Rolle / Suche
export function listUsersByRole({ role = "all", search = "", limit = 100, offset = 0 } = {}) {
  const where = [];
  const params = [];
  if (role === "admin")        { where.push("role = 'admin'"); }
  else if (role === "teamleitung") { where.push("role = 'teamleitung'"); }
  else if (role === "moderator")   { where.push("role = 'moderator'"); }
  else if (role === "team")    { where.push("role IN ('admin','teamleitung','moderator')"); }
  else if (role === "user")    { where.push("(role IS NULL OR role = 'user')"); }
  if (search) {
    where.push("(username LIKE ? OR display_name LIKE ? OR real_name LIKE ?)");
    const q = "%" + String(search) + "%";
    params.push(q, q, q);
  }
  const whereSql = where.length ? \`WHERE \${where.join(" AND ")}\` : "";
  params.push(Number(limit), Number(offset));
  try {
    return db().prepare(\`
      SELECT id, username, display_name AS displayName, emoji,
             COALESCE(role, 'user') AS role,
             status, gender, birthdate,
             created_at AS createdAt, last_seen AS lastSeen,
             avatar_url AS avatarUrl, avatar_status AS avatarStatus
        FROM users
        \${whereSql}
        ORDER BY
          CASE COALESCE(role, 'user')
            WHEN 'admin' THEN 0
            WHEN 'teamleitung' THEN 1
            WHEN 'moderator' THEN 2
            ELSE 3
          END,
          last_seen DESC NULLS LAST,
          username ASC
        LIMIT ? OFFSET ?
    \`).all(...params);
  } catch { return []; }
}

// Anzahl Mitglieder pro Rolle (für Tab-Badges)
export function countUsersByRole() {
  const out = { all: 0, admin: 0, teamleitung: 0, moderator: 0, user: 0 };
  try {
    out.all = db().prepare("SELECT COUNT(*) AS c FROM users").get().c || 0;
    const rows = db().prepare(\`
      SELECT COALESCE(role, 'user') AS r, COUNT(*) AS c
        FROM users GROUP BY COALESCE(role, 'user')
    \`).all();
    for (const r of rows) {
      if (out[r.r] !== undefined) out[r.r] = r.c;
    }
  } catch {}
  return out;
}

// Komplette Userakte — User + Sanktionen + Mod-Log + Pics + Devices + IPs
export function getFullUserAkte(userId) {
  const uid = Number(userId);
  if (!uid) return null;
  const user = db().prepare(\`
    SELECT id, username, display_name AS displayName, emoji, status,
           COALESCE(role, 'user') AS role,
           gender, birthdate, reg_ip AS regIp,
           real_name AS realName,
           addr_street AS addrStreet, addr_zip AS addrZip,
           addr_city AS addrCity, addr_country AS addrCountry,
           id_verified AS idVerified, id_doc_url AS idDocUrl,
           admin_notes AS adminNotes,
           avatar_url AS avatarUrl, avatar_status AS avatarStatus,
           created_at AS createdAt, last_seen AS lastSeen,
           ads_consent AS adsConsent,
           vip_until AS vipUntil
      FROM users WHERE id = ?
  \`).get(uid);
  if (!user) return null;

  const sanctions = (() => {
    try {
      return db().prepare(\`
        SELECT id, type, until, reason, by, created_at AS createdAt, lifted_at AS liftedAt
          FROM sanctions WHERE user_id = ?
          ORDER BY created_at DESC LIMIT 50
      \`).all(uid);
    } catch { return []; }
  })();

  const modLog = (() => {
    try {
      return db().prepare(\`
        SELECT id, kind, by, note, created_at AS createdAt
          FROM mod_log WHERE user_id = ?
          ORDER BY created_at DESC LIMIT 50
      \`).all(uid);
    } catch { return []; }
  })();

  const devices = (() => {
    try {
      return db().prepare(\`
        SELECT id, user_agent AS userAgent, ip, created_at AS createdAt, last_seen AS lastSeen
          FROM devices WHERE user_id = ?
          ORDER BY last_seen DESC LIMIT 20
      \`).all(uid);
    } catch { return []; }
  })();

  // IP-Historie (aus devices aggregiert)
  const ips = (() => {
    try {
      return db().prepare(\`
        SELECT ip, COUNT(*) AS uses, MAX(last_seen) AS lastSeen
          FROM devices WHERE user_id = ? AND ip != ''
          GROUP BY ip
          ORDER BY lastSeen DESC LIMIT 10
      \`).all(uid);
    } catch { return []; }
  })();

  // Reports gegen diesen User
  const reportsAgainst = (() => {
    try {
      return db().prepare(\`
        SELECT id, target_type AS targetType, category, status,
               created_at AS createdAt, resolved_action AS resolvedAction
          FROM mcp_reports WHERE target_owner_id = ?
          ORDER BY created_at DESC LIMIT 20
      \`).all(uid);
    } catch { return []; }
  })();

  return { user, sanctions, modLog, devices, ips, reportsAgainst };
}

// Owner-Update: Adresse, Klarname, Notes, ID-Status
export function updateUserAdminFields(userId, patch = {}) {
  const allowed = ["real_name", "addr_street", "addr_zip", "addr_city",
                   "addr_country", "id_verified", "id_doc_url", "admin_notes"];
  const setSql = [];
  const params = [];
  for (const k of allowed) {
    if (patch[k] !== undefined) {
      setSql.push(\`\${k} = ?\`);
      params.push(k === "id_verified" ? (patch[k] ? 1 : 0) : String(patch[k] || ""));
    }
  }
  if (!setSql.length) return false;
  params.push(Number(userId));
  db().prepare(\`UPDATE users SET \${setSql.join(", ")} WHERE id = ?\`).run(...params);
  return true;
}
`;
  src += FN;
  changed = true;
  console.log("✓ Userakte-Helpers angefügt.");
}

if (changed) {
  writeFileSync(DB_PATH, src);
  console.log("\\n✓ db.js gepatched (Userakte).");
} else {
  console.log("\\n✓ Nichts zu tun (Userakte bereits installiert).");
}
