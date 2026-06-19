#!/usr/bin/env node
// ⚡ MCP-Foundation — DB-Schema für Moderator Control Panel.
// Tabellen, Helpers, Bootstrap (eyfahrlehrer → Admin).

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_REPAIR = "/* ⚡ MCP_REPAIR_V1 */";
const MARK_REPAIR_FEMALE = "/* ⚡ MCP_REPAIR_FEMALE_V1 */";
const MARK_TABLE = "/* ⚡ MCP_TABLE_V1 */";
const MARK_FN = "// ⚡ MCP_FN_V1";

let src = readFileSync(DB_PATH, "utf-8");
let changed = false;

// 1) users.role-Spalte ergänzen via Schema-Repair-Block
if (!src.includes(MARK_REPAIR)) {
  const ANCHORS = [
    `_ensureCol("group_posts", "fidolin_action", "TEXT DEFAULT 'none'");`,
  ];
  let anchor = null;
  for (const a of ANCHORS) { if (src.includes(a)) { anchor = a; break; } }
  if (!anchor) {
    console.error("✗ Schema-Repair-Block nicht gefunden.");
    process.exit(1);
  }
  const INJECT = `${anchor}

  ${MARK_REPAIR}
  // ⚡ MCP — Mod-Rolle pro User
  _ensureCol("users", "role", "TEXT DEFAULT 'user'");

  ${MARK_REPAIR_FEMALE}
  // ⚡ MCP — Frauen-Filter: reporter_gender in mcp_reports nachrüsten
  // (für DBs, die mcp_reports bereits ohne Spalte angelegt haben)
  try { _ensureCol("mcp_reports", "reporter_gender", "TEXT DEFAULT ''"); } catch {}

  // ⚡ MCP — Bootstrap-Admin: eyfahrlehrer wird automatisch Admin, falls noch kein Admin existiert
  try {
    const _adminCnt = _db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'").get().c || 0;
    if (_adminCnt === 0) {
      const _target = _db.prepare("SELECT id FROM users WHERE username = ?").get("eyfahrlehrer");
      if (_target) {
        _db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(_target.id);
        console.log("⚡ MCP-Bootstrap: eyfahrlehrer als Admin gesetzt.");
      }
    }
  } catch {}`;
  src = src.replace(anchor, INJECT);
  changed = true;
  console.log("✓ users.role Spalten-Repair eingefügt.");
}

// 2) MCP-Tabellen
if (!src.includes(MARK_TABLE)) {
  const ANCHOR = "CREATE TABLE IF NOT EXISTS group_posts (";
  if (!src.includes(ANCHOR)) { console.error("✗ Anker group_posts fehlt"); process.exit(1); }
  const INJECT = `${MARK_TABLE}
    CREATE TABLE IF NOT EXISTS mcp_sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      last_seen INTEGER NOT NULL,
      ip TEXT DEFAULT '',
      user_agent TEXT DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_mcp_sessions_user ON mcp_sessions(user_id);

    CREATE TABLE IF NOT EXISTS mcp_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter_id INTEGER NOT NULL,
      reporter_gender TEXT DEFAULT '',
      target_type TEXT NOT NULL,
      target_id INTEGER NOT NULL,
      target_owner_id INTEGER,
      category TEXT NOT NULL DEFAULT 'sonstiges',
      content_snapshot TEXT DEFAULT '',
      reason TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open',
      claimed_by INTEGER,
      claimed_at INTEGER,
      resolved_by INTEGER,
      resolved_at INTEGER,
      resolved_action TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_mcp_reports_gender ON mcp_reports(reporter_gender, status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_mcp_reports_status ON mcp_reports(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_mcp_reports_claimed ON mcp_reports(claimed_by);
    CREATE INDEX IF NOT EXISTS idx_mcp_reports_owner ON mcp_reports(target_owner_id);

    CREATE TABLE IF NOT EXISTS mcp_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'sonstiges',
      status TEXT NOT NULL DEFAULT 'open',
      claimed_by INTEGER,
      claimed_at INTEGER,
      created_at INTEGER NOT NULL,
      last_response_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_mcp_tickets_status ON mcp_tickets(status, created_at DESC);

    CREATE TABLE IF NOT EXISTS mcp_ticket_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      sender_user_id INTEGER NOT NULL,
      sender_anonymous INTEGER NOT NULL DEFAULT 0,
      message TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_mcp_ticket_messages ON mcp_ticket_messages(ticket_id, created_at);

    CREATE TABLE IF NOT EXISTS mcp_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mod_id INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      target_type TEXT,
      target_id INTEGER,
      details TEXT DEFAULT '',
      viewed_only INTEGER NOT NULL DEFAULT 0,
      ts INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_mcp_audit_mod ON mcp_audit_log(mod_id, ts DESC);
    CREATE INDEX IF NOT EXISTS idx_mcp_audit_target ON mcp_audit_log(target_type, target_id);

    CREATE TABLE IF NOT EXISTS mcp_changelog (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      body TEXT DEFAULT '',
      pinned INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_mcp_changelog_recent ON mcp_changelog(pinned DESC, created_at DESC);

    CREATE TABLE IF NOT EXISTS mcp_team_chat (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_mcp_team_chat_recent ON mcp_team_chat(created_at DESC);

    ${ANCHOR}`;
  src = src.replace(ANCHOR, INJECT);
  changed = true;
  console.log("✓ 7 MCP-Tabellen ergänzt.");
}

// 3) Helpers anhängen
if (!src.includes(MARK_FN)) {
  const FN = `

${MARK_FN}
// ⚡ MCP-Helpers — Mod-Rollen, Reports, Tickets, Audit, Team-Chat, Changelog
// (crypto ist bereits oben in db.js importiert)

const MCP_VALID_ROLES = new Set(["user", "moderator", "teamleitung", "admin"]);
const MCP_SESSION_TTL_MS = 30 * 24 * 3600 * 1000;
const MCP_CLAIM_TIMEOUT_MS = 15 * 60 * 1000;

// ─── Rollen ─────────────────────────────────────────────────────────────
export function getUserRole(userId) {
  const r = db().prepare("SELECT role FROM users WHERE id = ?").get(Number(userId));
  return r?.role || "user";
}
export function setUserRole(userId, role) {
  if (!MCP_VALID_ROLES.has(role)) throw new Error("Ungültige Rolle.");
  db().prepare("UPDATE users SET role = ? WHERE id = ?").run(String(role), Number(userId));
  return getUserRole(userId);
}
export function isModeratorRole(userId) {
  const r = getUserRole(userId);
  return r === "moderator" || r === "teamleitung" || r === "admin";
}
export function isTeamleitungRole(userId) {
  const r = getUserRole(userId);
  return r === "teamleitung" || r === "admin";
}
export function isAdminRole(userId) {
  return getUserRole(userId) === "admin";
}
export function listModTeam({ limit = 200 } = {}) {
  return db().prepare(\`
    SELECT u.id, u.username, u.display_name AS displayName, u.emoji,
           u.role, u.created_at AS createdAt, u.last_seen AS lastSeen
      FROM users u
     WHERE u.role IN ('moderator', 'teamleitung', 'admin')
     ORDER BY
       CASE u.role WHEN 'admin' THEN 0 WHEN 'teamleitung' THEN 1 WHEN 'moderator' THEN 2 ELSE 3 END,
       u.username ASC
     LIMIT ?
  \`).all(Number(limit));
}

// ─── Bootstrap-Admin ───────────────────────────────────────────────────
// Ernennt eyfahrlehrer (oder gegebenen Username) zum Admin, falls noch kein Admin existiert.
export function bootstrapMcpAdmin({ username = "eyfahrlehrer" } = {}) {
  const adminCount = db().prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'").get().c || 0;
  if (adminCount > 0) return { promoted: null, mode: "already-exists" };
  const target = db().prepare("SELECT id, role FROM users WHERE username = ?").get(String(username));
  if (target) {
    setUserRole(target.id, "admin");
    return { promoted: target.id, username, mode: "named-user" };
  }
  // Fallback: erster User wird Admin
  const first = db().prepare("SELECT id, username FROM users ORDER BY id ASC LIMIT 1").get();
  if (first) {
    setUserRole(first.id, "admin");
    return { promoted: first.id, username: first.username, mode: "first-user" };
  }
  return { promoted: null, mode: "no-users-yet" };
}

// ─── MCP-Sessions (separater Cookie für mcp.vibevibo.de) ───────────────
export function createMcpSession(userId, { ip = "", userAgent = "" } = {}) {
  const token = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  db().prepare(\`
    INSERT INTO mcp_sessions (token, user_id, created_at, last_seen, ip, user_agent)
    VALUES (?, ?, ?, ?, ?, ?)
  \`).run(token, Number(userId), now, now, String(ip || ""), String(userAgent || "").slice(0, 200));
  return token;
}
export function getMcpSessionUser(token) {
  if (!token) return null;
  const s = db().prepare("SELECT user_id, last_seen FROM mcp_sessions WHERE token = ?").get(String(token));
  if (!s) return null;
  const now = Date.now();
  if (now - s.last_seen > MCP_SESSION_TTL_MS) {
    deleteMcpSession(token);
    return null;
  }
  db().prepare("UPDATE mcp_sessions SET last_seen = ? WHERE token = ?").run(now, String(token));
  const user = db().prepare(\`
    SELECT id, username, display_name AS displayName, emoji, role, avatar_url AS avatarUrl, avatar_status AS avatarStatus
      FROM users WHERE id = ?
  \`).get(s.user_id);
  return user || null;
}
export function deleteMcpSession(token) {
  db().prepare("DELETE FROM mcp_sessions WHERE token = ?").run(String(token));
}
export function deleteMcpSessionsForUser(userId) {
  db().prepare("DELETE FROM mcp_sessions WHERE user_id = ?").run(Number(userId));
}

// ─── Reports (Meldungen) ───────────────────────────────────────────────
// ⚡ Frauen-Filter: reporterGender ('f', 'm', 'd', '') wird automatisch aus
// dem User-Profil ermittelt, falls nicht explizit übergeben.
function _resolveReporterGender(reporterId, override) {
  const raw = String(override ?? "").trim().toLowerCase();
  if (raw === "f" || raw === "w" || raw === "weiblich" || raw === "female") return "f";
  if (raw === "m" || raw === "männlich" || raw === "mannlich" || raw === "male") return "m";
  if (raw === "d" || raw === "divers" || raw === "diverse" || raw === "nonbinary") return "d";
  try {
    const u = db().prepare("SELECT gender FROM users WHERE id = ?").get(Number(reporterId));
    const g = String(u?.gender || "").trim().toLowerCase();
    if (g.startsWith("f") || g.startsWith("w")) return "f";
    if (g.startsWith("m")) return "m";
    if (g.startsWith("d") || g.startsWith("n")) return "d";
  } catch {}
  return "";
}
export function createMcpReport({ reporterId, reporterGender, targetType, targetId, targetOwnerId, category, contentSnapshot, reason }) {
  const now = Date.now();
  const gender = _resolveReporterGender(reporterId, reporterGender);
  const info = db().prepare(\`
    INSERT INTO mcp_reports
      (reporter_id, reporter_gender, target_type, target_id, target_owner_id, category, content_snapshot, reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  \`).run(
    Number(reporterId), gender, String(targetType), Number(targetId) || 0,
    targetOwnerId ? Number(targetOwnerId) : null,
    String(category || "sonstiges"),
    String(contentSnapshot || "").slice(0, 1000),
    String(reason || "").slice(0, 300),
    now
  );
  return info.lastInsertRowid;
}
function _autoExpireClaims() {
  const cutoff = Date.now() - MCP_CLAIM_TIMEOUT_MS;
  db().prepare(\`
    UPDATE mcp_reports SET status = 'open', claimed_by = NULL, claimed_at = NULL
     WHERE status = 'claimed' AND claimed_at < ?
  \`).run(cutoff);
  db().prepare(\`
    UPDATE mcp_tickets SET status = 'open', claimed_by = NULL, claimed_at = NULL
     WHERE status = 'claimed' AND claimed_at < ?
  \`).run(cutoff);
}
export function listMcpReports({ status = null, category = null, reporterGender = null, claimedBy = null, limit = 100, byModId = null } = {}) {
  _autoExpireClaims();
  const where = [];
  const params = [];
  if (status === "open") where.push("r.status = 'open'");
  else if (status === "mine" && byModId) { where.push("r.status = 'claimed' AND r.claimed_by = ?"); params.push(Number(byModId)); }
  else if (status === "claimed-others" && byModId) { where.push("r.status = 'claimed' AND r.claimed_by != ?"); params.push(Number(byModId)); }
  else if (status === "resolved") where.push("r.status = 'resolved'");
  if (category) { where.push("r.category = ?"); params.push(String(category)); }
  if (reporterGender) {
    const g = String(reporterGender).toLowerCase();
    if (g === "f" || g === "female" || g === "frauen") where.push("r.reporter_gender = 'f'");
    else if (g === "m") where.push("r.reporter_gender = 'm'");
    else if (g === "d") where.push("r.reporter_gender = 'd'");
  }
  const whereSql = where.length ? \`WHERE \${where.join(" AND ")}\` : "";
  params.push(Number(limit));
  return db().prepare(\`
    SELECT r.id, r.reporter_id AS reporterId, r.reporter_gender AS reporterGender,
           r.target_type AS targetType, r.target_id AS targetId,
           r.target_owner_id AS targetOwnerId, r.category, r.content_snapshot AS contentSnapshot,
           r.reason, r.status, r.claimed_by AS claimedBy, r.claimed_at AS claimedAt,
           r.resolved_by AS resolvedBy, r.resolved_at AS resolvedAt, r.resolved_action AS resolvedAction,
           r.created_at AS createdAt,
           u.username AS reporterUsername,
           tu.username AS targetUsername, tu.display_name AS targetDisplayName,
           cb.username AS claimedByUsername
      FROM mcp_reports r
      LEFT JOIN users u ON u.id = r.reporter_id
      LEFT JOIN users tu ON tu.id = r.target_owner_id
      LEFT JOIN users cb ON cb.id = r.claimed_by
     \${whereSql}
     ORDER BY r.created_at DESC
     LIMIT ?
  \`).all(...params);
}
export function getMcpReport(reportId) {
  return db().prepare(\`
    SELECT r.*,
           u.username AS reporter_username,
           cb.username AS claimed_by_username,
           rb.username AS resolved_by_username
      FROM mcp_reports r
      LEFT JOIN users u ON u.id = r.reporter_id
      LEFT JOIN users cb ON cb.id = r.claimed_by
      LEFT JOIN users rb ON rb.id = r.resolved_by
     WHERE r.id = ?
  \`).get(Number(reportId));
}
// Pull/Lock: nur erfolgreich wenn report = open ODER (claimed by mich)
export function claimMcpReport(reportId, modId) {
  const now = Date.now();
  const info = db().prepare(\`
    UPDATE mcp_reports SET status = 'claimed', claimed_by = ?, claimed_at = ?
     WHERE id = ? AND (status = 'open' OR (status = 'claimed' AND claimed_by = ?))
  \`).run(Number(modId), now, Number(reportId), Number(modId));
  if (info.changes === 0) {
    const r = db().prepare("SELECT claimed_by FROM mcp_reports WHERE id = ?").get(Number(reportId));
    if (!r) throw new Error("Meldung nicht gefunden.");
    throw new Error("Bereits in Bearbeitung durch anderen Mod.");
  }
  return getMcpReport(reportId);
}
export function releaseMcpReport(reportId, modId) {
  const info = db().prepare(\`
    UPDATE mcp_reports SET status = 'open', claimed_by = NULL, claimed_at = NULL
     WHERE id = ? AND claimed_by = ? AND status = 'claimed'
  \`).run(Number(reportId), Number(modId));
  return info.changes > 0;
}
export function resolveMcpReport(reportId, modId, action) {
  const now = Date.now();
  db().prepare(\`
    UPDATE mcp_reports SET status = 'resolved', resolved_by = ?, resolved_at = ?, resolved_action = ?
     WHERE id = ?
  \`).run(Number(modId), now, String(action || "").slice(0, 100), Number(reportId));
  return getMcpReport(reportId);
}

// ─── Tickets ───────────────────────────────────────────────────────────
export function createMcpTicket({ userId, subject, body, category = "sonstiges" }) {
  const now = Date.now();
  const info = db().prepare(\`
    INSERT INTO mcp_tickets (user_id, subject, body, category, created_at, last_response_at)
    VALUES (?, ?, ?, ?, ?, ?)
  \`).run(Number(userId), String(subject).slice(0, 160), String(body).slice(0, 5000),
    String(category), now, now);
  return info.lastInsertRowid;
}
export function listMcpTickets({ status = null, claimedBy = null, byModId = null, limit = 100 } = {}) {
  _autoExpireClaims();
  const where = [];
  const params = [];
  if (status === "open") where.push("t.status = 'open'");
  else if (status === "mine" && byModId) { where.push("t.status = 'claimed' AND t.claimed_by = ?"); params.push(Number(byModId)); }
  else if (status === "resolved") where.push("t.status = 'resolved'");
  const whereSql = where.length ? \`WHERE \${where.join(" AND ")}\` : "";
  params.push(Number(limit));
  return db().prepare(\`
    SELECT t.id, t.user_id AS userId, t.subject, t.body, t.category, t.status,
           t.claimed_by AS claimedBy, t.claimed_at AS claimedAt,
           t.created_at AS createdAt, t.last_response_at AS lastResponseAt,
           u.username, u.display_name AS displayName,
           cb.username AS claimedByUsername
      FROM mcp_tickets t
      LEFT JOIN users u ON u.id = t.user_id
      LEFT JOIN users cb ON cb.id = t.claimed_by
     \${whereSql}
     ORDER BY t.last_response_at DESC
     LIMIT ?
  \`).all(...params);
}
export function claimMcpTicket(ticketId, modId) {
  const now = Date.now();
  const info = db().prepare(\`
    UPDATE mcp_tickets SET status = 'claimed', claimed_by = ?, claimed_at = ?
     WHERE id = ? AND (status = 'open' OR (status = 'claimed' AND claimed_by = ?))
  \`).run(Number(modId), now, Number(ticketId), Number(modId));
  if (info.changes === 0) throw new Error("Bereits in Bearbeitung durch anderen Mod.");
  return true;
}
export function releaseMcpTicket(ticketId, modId) {
  const info = db().prepare(\`
    UPDATE mcp_tickets SET status = 'open', claimed_by = NULL, claimed_at = NULL
     WHERE id = ? AND claimed_by = ? AND status = 'claimed'
  \`).run(Number(ticketId), Number(modId));
  return info.changes > 0;
}
export function resolveMcpTicket(ticketId, modId) {
  db().prepare("UPDATE mcp_tickets SET status = 'resolved' WHERE id = ?").run(Number(ticketId));
  return true;
}

// ─── Audit-Log ─────────────────────────────────────────────────────────
export function logMcpAction({ modId, actionType, targetType = null, targetId = null, details = "", viewedOnly = false }) {
  db().prepare(\`
    INSERT INTO mcp_audit_log (mod_id, action_type, target_type, target_id, details, viewed_only, ts)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  \`).run(
    Number(modId), String(actionType), targetType ? String(targetType) : null,
    targetId ? Number(targetId) : null,
    String(details || "").slice(0, 500), viewedOnly ? 1 : 0, Date.now()
  );
}
export function listMcpAudit({ modId = null, targetType = null, targetId = null, limit = 100 } = {}) {
  const where = [];
  const params = [];
  if (modId) { where.push("a.mod_id = ?"); params.push(Number(modId)); }
  if (targetType) { where.push("a.target_type = ?"); params.push(String(targetType)); }
  if (targetId) { where.push("a.target_id = ?"); params.push(Number(targetId)); }
  const whereSql = where.length ? \`WHERE \${where.join(" AND ")}\` : "";
  params.push(Number(limit));
  return db().prepare(\`
    SELECT a.id, a.mod_id AS modId, a.action_type AS actionType, a.target_type AS targetType,
           a.target_id AS targetId, a.details, a.viewed_only AS viewedOnly, a.ts,
           u.username AS modUsername
      FROM mcp_audit_log a
      LEFT JOIN users u ON u.id = a.mod_id
      \${whereSql}
      ORDER BY a.ts DESC LIMIT ?
  \`).all(...params);
}

// ─── Changelog (MCP-intern) ────────────────────────────────────────────
export function postMcpChangelog({ authorId, title, body, pinned = false }) {
  const info = db().prepare(\`
    INSERT INTO mcp_changelog (author_id, title, body, pinned, created_at)
    VALUES (?, ?, ?, ?, ?)
  \`).run(Number(authorId), String(title).slice(0, 160), String(body || "").slice(0, 5000),
    pinned ? 1 : 0, Date.now());
  return info.lastInsertRowid;
}
export function listMcpChangelog({ limit = 30 } = {}) {
  return db().prepare(\`
    SELECT c.id, c.title, c.body, c.pinned, c.created_at AS createdAt,
           u.username AS authorUsername, u.role AS authorRole
      FROM mcp_changelog c
      LEFT JOIN users u ON u.id = c.author_id
      ORDER BY c.pinned DESC, c.created_at DESC
      LIMIT ?
  \`).all(Number(limit));
}

// ─── Team-Chat ─────────────────────────────────────────────────────────
export function postMcpTeamChat({ senderId, message }) {
  const info = db().prepare(\`
    INSERT INTO mcp_team_chat (sender_id, message, created_at) VALUES (?, ?, ?)
  \`).run(Number(senderId), String(message).slice(0, 2000), Date.now());
  return info.lastInsertRowid;
}
export function listMcpTeamChat({ limit = 100 } = {}) {
  return db().prepare(\`
    SELECT t.id, t.sender_id AS senderId, t.message, t.created_at AS createdAt,
           u.username, u.display_name AS displayName, u.emoji, u.role
      FROM mcp_team_chat t
      LEFT JOIN users u ON u.id = t.sender_id
      ORDER BY t.created_at DESC
      LIMIT ?
  \`).all(Number(limit));
}

// ─── Dashboard-Stats ───────────────────────────────────────────────────
export function getMcpDashboardStats() {
  const reportsOpen = db().prepare("SELECT COUNT(*) AS c FROM mcp_reports WHERE status = 'open'").get().c || 0;
  const reportsMine = 0; // wird in der Route gefüllt
  const reportsFemaleOpen = (() => {
    try { return db().prepare("SELECT COUNT(*) AS c FROM mcp_reports WHERE status = 'open' AND reporter_gender = 'f'").get().c || 0; }
    catch { return 0; }
  })();
  const ticketsOpen = db().prepare("SELECT COUNT(*) AS c FROM mcp_tickets WHERE status = 'open'").get().c || 0;
  const profilePicsPending = (() => {
    try { return db().prepare("SELECT COUNT(*) AS c FROM profile_pics WHERE status = 'pending'").get().c || 0; }
    catch { return 0; }
  })();
  const fidolinLast24h = (() => {
    const since = Date.now() - 24 * 3600 * 1000;
    let total = 0;
    try { total += db().prepare("SELECT COUNT(*) AS c FROM fidolin_com_log WHERE ts > ?").get(since).c || 0; } catch {}
    try { total += db().prepare("SELECT COUNT(*) AS c FROM mod_log WHERE created_at > ? AND by IN ('fidolin','fidolin-fallback','fidolin-offline')").get(since).c || 0; } catch {}
    return total;
  })();
  const modCounts = db().prepare(\`
    SELECT role, COUNT(*) AS c FROM users WHERE role IN ('moderator','teamleitung','admin') GROUP BY role
  \`).all();
  return {
    reportsOpen, reportsMine, reportsFemaleOpen,
    ticketsOpen, profilePicsPending, fidolinLast24h,
    teamCount: modCounts.reduce((acc, r) => { acc[r.role] = r.c; return acc; }, { moderator: 0, teamleitung: 0, admin: 0 }),
  };
}
`;
  src += FN;
  changed = true;
  console.log("✓ MCP-Helpers angefügt.");
}

if (changed) {
  writeFileSync(DB_PATH, src);
  console.log("\\n✓ db.js gepatched. Schema-Repair läuft beim nächsten DB-Init automatisch.");
} else {
  console.log("\\n✓ Nichts zu tun.");
}

// 4) Bootstrap-Admin nach dem Patch ausführen (separater Script-Step nötig wäre normal,
// aber wir machen es elegant: beim DB-Init wird bootstrapMcpAdmin() vom Server selbst geprüft).
console.log("ℹ️  Bootstrap: 'eyfahrlehrer' wird beim ersten Server-Start zum Admin ernannt.");
