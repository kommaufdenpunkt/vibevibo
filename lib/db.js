import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "vibevibo.db");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let _db = null;
function db() {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  migrate(_db);
  return _db;
}

function migrate(d) {
  d.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      emoji TEXT DEFAULT '🙂',
      mood TEXT DEFAULT '',
      about_me TEXT DEFAULT '',
      interests TEXT DEFAULT '[]',
      bg_music TEXT DEFAULT '',
      custom_css TEXT DEFAULT '',
      created_at INTEGER NOT NULL,
      last_seen INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pinnwand (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_pinnwand_target ON pinnwand(target_user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS gifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      gift_id TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_gifts_target ON gifts(target_user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      read_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages(from_user_id, to_user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_messages_to ON messages(to_user_id, created_at);

    CREATE TABLE IF NOT EXISTS albums (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      album_id INTEGER REFERENCES albums(id) ON DELETE SET NULL,
      data_url TEXT NOT NULL,
      caption TEXT DEFAULT '',
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_photos_user ON photos(user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      emoji TEXT DEFAULT '👥',
      owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS group_members (
      group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at INTEGER NOT NULL,
      PRIMARY KEY (group_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS group_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_group_posts ON group_posts(group_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS profile_visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      visitor_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      visited_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_visits_target ON profile_visits(target_user_id, visited_at DESC);

    CREATE TABLE IF NOT EXISTS blocked_ips (
      ip TEXT PRIMARY KEY,
      reason TEXT DEFAULT '',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      username TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      ip TEXT DEFAULT '',
      created_at INTEGER NOT NULL,
      last_seen INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS device_bans (
      device_id TEXT PRIMARY KEY,
      reason TEXT DEFAULT '',
      until INTEGER,
      by TEXT DEFAULT 'admin',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sanctions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      until INTEGER,
      reason TEXT DEFAULT '',
      by TEXT DEFAULT 'admin',
      active INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sanctions_user ON sanctions(user_id, active);

    CREATE TABLE IF NOT EXISTS mod_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      content TEXT DEFAULT '',
      decision TEXT DEFAULT '',
      reason TEXT DEFAULT '',
      by TEXT DEFAULT 'fidolin',
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_modlog_user ON mod_log(user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS profile_pics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      reason TEXT DEFAULT '',
      is_primary INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_pics_user ON profile_pics(user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS pic_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pic_id INTEGER NOT NULL REFERENCES profile_pics(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      parent_id INTEGER,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_piccomments_pic ON pic_comments(pic_id, created_at);

    CREATE TABLE IF NOT EXISTS status_updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_status_user ON status_updates(created_at DESC);

    CREATE TABLE IF NOT EXISTS reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_type TEXT NOT NULL,
      target_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL DEFAULT 'like',
      created_at INTEGER NOT NULL,
      UNIQUE (target_type, target_id, user_id, kind)
    );
    CREATE INDEX IF NOT EXISTS idx_reactions_target ON reactions(target_type, target_id);

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      type TEXT NOT NULL,
      target_type TEXT DEFAULT '',
      target_id INTEGER,
      preview TEXT DEFAULT '',
      read INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS guestbook (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_guestbook_target ON guestbook(target_user_id, created_at DESC);
  `);

  // Nachträgliche Spalten (idempotent) - für bestehende DBs
  addColumnIfMissing(d, "users", "bg_music_url", "TEXT DEFAULT ''");
  // status: pending | approved | blocked. Bestehende User -> approved (waren ja schon da)
  addColumnIfMissing(d, "users", "status", "TEXT DEFAULT 'approved'");
  addColumnIfMissing(d, "users", "reg_ip", "TEXT DEFAULT ''");
  addColumnIfMissing(d, "messages", "kind", "TEXT DEFAULT 'text'");
  addColumnIfMissing(d, "messages", "audio_url", "TEXT");
  addColumnIfMissing(d, "messages", "once_only", "INTEGER DEFAULT 0");
  addColumnIfMissing(d, "messages", "consumed", "INTEGER DEFAULT 0");
  // Profilbilder mit Moderation: none | pending | approved | rejected
  addColumnIfMissing(d, "users", "avatar_url", "TEXT DEFAULT ''");
  addColumnIfMissing(d, "users", "avatar_status", "TEXT DEFAULT 'none'");
  addColumnIfMissing(d, "users", "avatar_submitted_at", "INTEGER DEFAULT 0");
  addColumnIfMissing(d, "users", "avatar_reason", "TEXT DEFAULT ''");
  // Jappy-Style Profilkopf: Geschlecht (m/w) + Geburtsdatum (Alter wird berechnet)
  addColumnIfMissing(d, "users", "gender", "TEXT DEFAULT ''");
  addColumnIfMissing(d, "users", "birthdate", "TEXT DEFAULT ''");
  // Album-Fotos mit Moderation. Bestehende Fotos -> approved (waren schon sichtbar)
  addColumnIfMissing(d, "photos", "status", "TEXT DEFAULT 'approved'");
  addColumnIfMissing(d, "photos", "reason", "TEXT DEFAULT ''");
  // Status-Posts koennen ein Bild haben (nur approved Bilder werden gespeichert)
  addColumnIfMissing(d, "status_updates", "image_url", "TEXT DEFAULT ''");
  // Wall: Pinnwand kann ein Bild haben (Fidolin-gepruefte Bilder)
  addColumnIfMissing(d, "pinnwand", "image_url", "TEXT DEFAULT ''");

  // Migration: bestehendes Einzel-Profilbild in die neue Galerie übernehmen
  d.exec(`
    INSERT INTO profile_pics (user_id, url, status, reason, is_primary, created_at)
    SELECT id, avatar_url, avatar_status, COALESCE(avatar_reason, ''), 1, COALESCE(NULLIF(avatar_submitted_at, 0), created_at)
      FROM users
     WHERE avatar_url <> '' AND avatar_status IN ('approved', 'pending', 'rejected')
       AND id NOT IN (SELECT user_id FROM profile_pics)
  `);
}

function addColumnIfMissing(d, table, column, definition) {
  const cols = d.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    d.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}


// ============================================================
// User-Helpers
// ============================================================
export function ageFromBirthdate(bd) {
  if (!bd) return null;
  const d = new Date(bd);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

export function userRow(u) {
  if (!u) return null;
  let interests = [];
  try { interests = JSON.parse(u.interests || "[]"); } catch {}
  return {
    id: u.id,
    username: u.username,
    displayName: u.display_name,
    emoji: u.emoji,
    mood: u.mood,
    aboutMe: u.about_me,
    interests,
    bgMusic: u.bg_music,
    bgMusicUrl: u.bg_music_url || "",
    customCss: u.custom_css,
    status: u.status || "approved",
    gender: u.gender === "m" || u.gender === "w" ? u.gender : "",
    birthdate: u.birthdate || "",
    age: ageFromBirthdate(u.birthdate),
    // Öffentlich nur freigeschaltete Profilbilder zeigen
    avatarUrl: u.avatar_status === "approved" ? (u.avatar_url || "") : "",
    avatarStatus: u.avatar_status || "none",
    createdAt: u.created_at,
    lastSeen: u.last_seen,
  };
}

export function getUserById(id) {
  return userRow(db().prepare("SELECT * FROM users WHERE id = ?").get(id));
}

export function getUserByUsername(username) {
  if (!username) return null;
  return userRow(db().prepare("SELECT * FROM users WHERE username = ?").get(String(username).toLowerCase()));
}

export function listUsers() {
  // Nur freigeschaltete User sind öffentlich sichtbar
  return db().prepare("SELECT * FROM users WHERE status = 'approved' ORDER BY display_name COLLATE NOCASE").all().map(userRow);
}

export function touchUser(id) {
  db().prepare("UPDATE users SET last_seen = ? WHERE id = ?").run(Date.now(), id);
}

export function isOnline(lastSeen) {
  // ICQ-Style: nur als online zählen wenn in den letzten 90 Sekunden aktiv
  return Date.now() - (lastSeen || 0) < 90 * 1000;
}

// ============================================================
// Auth
// ============================================================
export function createUser({ username, displayName, password, emoji, regIp, gender, birthdate }) {
  const cleaned = String(username || "").trim().toLowerCase().replace(/[^a-z0-9_.]/g, "_");
  if (!cleaned) throw new Error("Ungültiger Benutzername.");
  if (cleaned.length < 3) throw new Error("Benutzername zu kurz (mind. 3 Zeichen).");
  if (!password || password.length < 4) throw new Error("Passwort zu kurz (mind. 4 Zeichen).");
  const g = gender === "m" || gender === "w" ? gender : "";
  if (!g) throw new Error("Bitte Geschlecht angeben (m oder w).");
  const age = ageFromBirthdate(birthdate);
  if (age == null) throw new Error("Bitte ein gültiges Geburtsdatum angeben.");
  if (age < 18) throw new Error("VibeVibo ist ab 18 – du musst mindestens 18 Jahre alt sein.");
  const existing = getUserByUsername(cleaned);
  if (existing) throw new Error("Username schon vergeben.");
  const hash = bcrypt.hashSync(password, 10);
  const now = Date.now();
  // Neue User landen auf der Warteliste (pending)
  const info = db().prepare(`
    INSERT INTO users (username, display_name, password_hash, emoji, mood, about_me, interests, bg_music, created_at, last_seen, status, reg_ip, gender, birthdate)
    VALUES (?, ?, ?, ?, '', 'Heyhey, ich bin neu bei VibeVibo!', '[]', '', ?, ?, 'pending', ?, ?, ?)
  `).run(cleaned, displayName || cleaned, hash, emoji || "🙂", now, now, regIp || "", g, String(birthdate));
  return getUserById(info.lastInsertRowid);
}

// Liefert auch den Status zurück, damit die Login-Route entscheiden kann
export function verifyPassword(username, password) {
  const row = db().prepare("SELECT * FROM users WHERE username = ?").get(String(username).toLowerCase());
  if (!row) return null;
  if (!bcrypt.compareSync(password, row.password_hash)) return null;
  return { ...userRow(row), status: row.status || "approved" };
}

// ============================================================
// Warteliste & Zugangskontrolle (Admin)
// ============================================================
export function listUsersByStatus(status) {
  return db().prepare(
    "SELECT * FROM users WHERE status = ? ORDER BY created_at DESC"
  ).all(status).map((u) => ({ ...userRow(u), regIp: u.reg_ip || "" }));
}

export function setUserStatus(userId, status) {
  if (!["pending", "approved", "blocked"].includes(status)) return false;
  db().prepare("UPDATE users SET status = ? WHERE id = ?").run(status, userId);
  return true;
}

export function deleteUser(userId) {
  db().prepare("DELETE FROM users WHERE id = ?").run(userId);
}

export function countRecentRegistrationsByIp(ip, sinceMs) {
  if (!ip) return 0;
  return db().prepare(
    "SELECT COUNT(*) AS n FROM users WHERE reg_ip = ? AND created_at > ?"
  ).get(ip, Date.now() - sinceMs).n;
}

export function isIpBlocked(ip) {
  if (!ip) return false;
  return !!db().prepare("SELECT 1 FROM blocked_ips WHERE ip = ?").get(ip);
}

export function blockIp(ip, reason) {
  if (!ip) return;
  db().prepare(
    "INSERT OR REPLACE INTO blocked_ips (ip, reason, created_at) VALUES (?, ?, ?)"
  ).run(ip, reason || "", Date.now());
}

export function unblockIp(ip) {
  db().prepare("DELETE FROM blocked_ips WHERE ip = ?").run(ip);
}

export function listBlockedIps() {
  return db().prepare("SELECT ip, reason, created_at AS at FROM blocked_ips ORDER BY created_at DESC").all();
}

// ============================================================
// Moderation: Geräte, Bann-System, Userakte (Fidolin)
// ============================================================
export function recordDevice(id, { userId, username, userAgent, ip } = {}) {
  if (!id) return;
  const now = Date.now();
  const ex = db().prepare("SELECT id FROM devices WHERE id = ?").get(id);
  if (ex) {
    db().prepare("UPDATE devices SET user_id = ?, username = ?, user_agent = ?, ip = ?, last_seen = ? WHERE id = ?")
      .run(userId || null, username || "", userAgent || "", ip || "", now, id);
  } else {
    db().prepare("INSERT INTO devices (id, user_id, username, user_agent, ip, created_at, last_seen) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(id, userId || null, username || "", userAgent || "", ip || "", now, now);
  }
}

export function listDevices(limit = 200) {
  return db().prepare(`
    SELECT d.*, EXISTS(SELECT 1 FROM device_bans b WHERE b.device_id = d.id) AS banned
    FROM devices d ORDER BY d.last_seen DESC LIMIT ?
  `).all(limit);
}

export function isDeviceBanned(id) {
  if (!id) return false;
  const b = db().prepare("SELECT until FROM device_bans WHERE device_id = ?").get(id);
  if (!b) return false;
  if (b.until && b.until < Date.now()) {
    db().prepare("DELETE FROM device_bans WHERE device_id = ?").run(id);
    return false;
  }
  return true;
}

export function banDevice(id, reason, until, by) {
  if (!id) return;
  db().prepare("INSERT OR REPLACE INTO device_bans (device_id, reason, until, by, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(id, reason || "", until || null, by || "admin", Date.now());
}

export function unbanDevice(id) {
  db().prepare("DELETE FROM device_bans WHERE device_id = ?").run(id);
}

export function listDeviceBans() {
  return db().prepare(`
    SELECT b.device_id AS id, b.reason, b.until, b.by, b.created_at AS at, d.username, d.ip
    FROM device_bans b LEFT JOIN devices d ON d.id = b.device_id
    ORDER BY b.created_at DESC
  `).all();
}

// Sanktionen: type = comm | profile | full
export function addSanction(userId, type, until, reason, by) {
  if (!["comm", "profile", "full"].includes(type)) return;
  db().prepare("INSERT INTO sanctions (user_id, type, until, reason, by, active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)")
    .run(userId, type, until || null, reason || "", by || "admin", Date.now());
}

export function activeSanctions(userId) {
  const now = Date.now();
  // Abgelaufene deaktivieren
  db().prepare("UPDATE sanctions SET active = 0 WHERE user_id = ? AND active = 1 AND until IS NOT NULL AND until < ?")
    .run(userId, now);
  return db().prepare("SELECT * FROM sanctions WHERE user_id = ? AND active = 1 ORDER BY created_at DESC").all(userId);
}

// Liefert ein Set der aktiven Sanktions-Typen; 'full' impliziert comm + profile
export function sanctionTypes(userId) {
  const set = new Set(activeSanctions(userId).map((s) => s.type));
  if (set.has("full")) { set.add("comm"); set.add("profile"); }
  return set;
}

export function liftSanction(id) {
  db().prepare("UPDATE sanctions SET active = 0 WHERE id = ?").run(id);
}

export function liftAllSanctions(userId) {
  db().prepare("UPDATE sanctions SET active = 0 WHERE user_id = ?").run(userId);
}

export function listActiveSanctions() {
  const now = Date.now();
  db().prepare("UPDATE sanctions SET active = 0 WHERE active = 1 AND until IS NOT NULL AND until < ?").run(now);
  return db().prepare(`
    SELECT s.*, u.username, u.display_name AS displayName, u.emoji
    FROM sanctions s JOIN users u ON u.id = s.user_id
    WHERE s.active = 1 ORDER BY s.created_at DESC
  `).all();
}

// Userakte / Protokoll
export function logMod({ userId, kind, content, decision, reason, by }) {
  db().prepare("INSERT INTO mod_log (user_id, kind, content, decision, reason, by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(userId || null, kind, String(content || "").slice(0, 600), decision || "", reason || "", by || "fidolin", Date.now());
}

export function getUserDossier(userId, limit = 100) {
  return db().prepare("SELECT * FROM mod_log WHERE user_id = ? ORDER BY created_at DESC LIMIT ?").all(userId, limit);
}

export function listRecentModLog(limit = 100) {
  return db().prepare(`
    SELECT m.*, u.username, u.display_name AS displayName
    FROM mod_log m LEFT JOIN users u ON u.id = m.user_id
    ORDER BY m.created_at DESC LIMIT ?
  `).all(limit);
}

// ============================================================
// Profilbilder-Galerie (mehrere Slots) + Moderation
// ============================================================
export const MAX_PROFILE_PICS = 9;

export function listProfilePics(userId, { approvedOnly = false } = {}) {
  const where = approvedOnly ? "AND status = 'approved'" : "";
  return db().prepare(
    `SELECT id, url, status, reason, is_primary AS isPrimary, created_at AS at
       FROM profile_pics WHERE user_id = ? ${where}
      ORDER BY is_primary DESC, created_at DESC`
  ).all(userId);
}

export function countProfilePics(userId) {
  return db().prepare("SELECT COUNT(*) AS n FROM profile_pics WHERE user_id = ?").get(userId).n;
}

export function getProfilePic(id) {
  return db().prepare("SELECT * FROM profile_pics WHERE id = ?").get(id);
}

export function addProfilePic(userId, url, status, reason) {
  const first = countProfilePics(userId) === 0;
  const info = db().prepare(
    "INSERT INTO profile_pics (user_id, url, status, reason, is_primary, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(userId, url, status || "pending", reason || "", first && status === "approved" ? 1 : 0, Date.now());
  syncPrimaryAvatar(userId);
  return info.lastInsertRowid;
}

export function setPicStatus(picId, status, reason) {
  if (!["pending", "approved", "rejected"].includes(status)) return;
  const pic = getProfilePic(picId);
  if (!pic) return;
  db().prepare("UPDATE profile_pics SET status = ?, reason = ? WHERE id = ?").run(status, reason || "", picId);
  syncPrimaryAvatar(pic.user_id);
}

export function deleteProfilePic(picId, byUserId) {
  const pic = getProfilePic(picId);
  if (!pic) return false;
  if (byUserId != null && pic.user_id !== byUserId) return false;
  db().prepare("DELETE FROM profile_pics WHERE id = ?").run(picId);
  syncPrimaryAvatar(pic.user_id);
  return true;
}

export function setPrimaryPic(picId, byUserId) {
  const pic = getProfilePic(picId);
  if (!pic || pic.status !== "approved") return false;
  if (byUserId != null && pic.user_id !== byUserId) return false;
  db().prepare("UPDATE profile_pics SET is_primary = 0 WHERE user_id = ?").run(pic.user_id);
  db().prepare("UPDATE profile_pics SET is_primary = 1 WHERE id = ?").run(picId);
  syncPrimaryAvatar(pic.user_id);
  return true;
}

// Hält users.avatar_url/avatar_status synchron mit dem primären, freigegebenen Bild.
// So funktioniert die bestehende Avatar-Anzeige (Profil, Navbar) unverändert weiter.
function syncPrimaryAvatar(userId) {
  let primary = db().prepare("SELECT * FROM profile_pics WHERE user_id = ? AND is_primary = 1 AND status = 'approved'").get(userId);
  if (!primary) {
    primary = db().prepare("SELECT * FROM profile_pics WHERE user_id = ? AND status = 'approved' ORDER BY created_at DESC LIMIT 1").get(userId);
    if (primary) db().prepare("UPDATE profile_pics SET is_primary = 1 WHERE id = ?").run(primary.id);
  }
  if (primary) {
    db().prepare("UPDATE users SET avatar_url = ?, avatar_status = 'approved' WHERE id = ?").run(primary.url, userId);
  } else {
    db().prepare("UPDATE users SET avatar_url = '', avatar_status = 'none' WHERE id = ?").run(userId);
  }
}

// Admin-Moderation (über alle Nutzer)
export function listPendingPics() {
  return db().prepare(`
    SELECT p.id, p.url, p.created_at AS at, u.username, u.display_name AS displayName, u.emoji
      FROM profile_pics p JOIN users u ON u.id = p.user_id
     WHERE p.status = 'pending' ORDER BY p.created_at ASC
  `).all();
}

export function listRejectedPics() {
  return db().prepare(`
    SELECT p.id, p.url, p.reason, u.username, u.display_name AS displayName, u.emoji
      FROM profile_pics p JOIN users u ON u.id = p.user_id
     WHERE p.status = 'rejected' ORDER BY p.created_at DESC LIMIT 60
  `).all();
}

export function listApprovedPics(limit = 80) {
  return db().prepare(`
    SELECT p.id, p.url, p.reason, p.is_primary AS isPrimary, p.created_at AS at,
           u.username, u.display_name AS displayName, u.emoji
      FROM profile_pics p JOIN users u ON u.id = p.user_id
     WHERE p.status = 'approved' ORDER BY p.created_at DESC LIMIT ?
  `).all(limit);
}

// Bilder, die seit > maxAgeMs in Prüfung hängen, automatisch freigeben (Fidolin-SLA)
export function autoApproveStalePics(maxAgeMs) {
  const cutoff = Date.now() - maxAgeMs;
  const rows = db().prepare("SELECT id, user_id FROM profile_pics WHERE status = 'pending' AND created_at < ?").all(cutoff);
  for (const r of rows) {
    db().prepare("UPDATE profile_pics SET status = 'approved', reason = 'Auto-Freigabe (Fidolin-Frist abgelaufen)' WHERE id = ?").run(r.id);
    syncPrimaryAvatar(r.user_id);
    logMod({ userId: r.user_id, kind: "avatar", decision: "approved", reason: "Auto-Freigabe nach Frist", by: "fidolin" });
  }
  return rows.length;
}

// ---- Kommentare an Profilbildern (mit 1 Antwort-Ebene) ----
export function addPicComment(picId, userId, text, parentId) {
  const info = db().prepare(
    "INSERT INTO pic_comments (pic_id, user_id, parent_id, text, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(picId, userId, parentId || null, text, Date.now());
  return info.lastInsertRowid;
}

export function getPicComments(picId) {
  return db().prepare(`
    SELECT c.id, c.parent_id AS parentId, c.text, c.created_at AS at,
           u.username, u.display_name AS displayName, u.emoji, u.avatar_url AS avatarUrl
      FROM pic_comments c JOIN users u ON u.id = c.user_id
     WHERE c.pic_id = ? ORDER BY c.created_at ASC
  `).all(picId);
}

export function deletePicComment(id, byUserId) {
  const row = db().prepare("SELECT pic_id, user_id FROM pic_comments c WHERE c.id = ?").get(id);
  if (!row) return false;
  // Eigentümer des Kommentars ODER des Bildes darf löschen; Admin (byUserId null) immer
  if (byUserId != null) {
    const pic = getProfilePic(row.pic_id);
    if (row.user_id !== byUserId && (!pic || pic.user_id !== byUserId)) return false;
  }
  db().prepare("DELETE FROM pic_comments WHERE id = ?").run(id);
  return true;
}

export function adminStats() {
  const d = db();
  return {
    pending: d.prepare("SELECT COUNT(*) AS n FROM users WHERE status = 'pending'").get().n,
    approved: d.prepare("SELECT COUNT(*) AS n FROM users WHERE status = 'approved'").get().n,
    blocked: d.prepare("SELECT COUNT(*) AS n FROM users WHERE status = 'blocked'").get().n,
    blockedIps: d.prepare("SELECT COUNT(*) AS n FROM blocked_ips").get().n,
    sanctions: d.prepare("SELECT COUNT(*) AS n FROM sanctions WHERE active = 1").get().n,
    deviceBans: d.prepare("SELECT COUNT(*) AS n FROM device_bans").get().n,
    pendingAvatars: d.prepare("SELECT COUNT(*) AS n FROM profile_pics WHERE status = 'pending'").get().n,
    pendingPhotos: d.prepare("SELECT COUNT(*) AS n FROM photos WHERE status = 'pending'").get().n,
  };
}

export function createSession(userId) {
  const token = randomToken();
  db().prepare("INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)").run(token, userId, Date.now());
  return token;
}

export function deleteSession(token) {
  if (!token) return;
  db().prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export function getUserBySession(token) {
  if (!token) return null;
  const row = db().prepare(`
    SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?
  `).get(token);
  return userRow(row);
}

function randomToken() {
  const arr = new Uint8Array(32);
  // Node 20+ hat globalThis.crypto
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ============================================================
// Profile updates
// ============================================================
export function updateUser(id, patch) {
  const allowed = {
    displayName: "display_name",
    emoji: "emoji",
    mood: "mood",
    aboutMe: "about_me",
    bgMusic: "bg_music",
    bgMusicUrl: "bg_music_url",
    customCss: "custom_css",
    gender: "gender",
    birthdate: "birthdate",
  };
  const sets = [];
  const vals = [];
  for (const [k, col] of Object.entries(allowed)) {
    if (k in patch) {
      sets.push(`${col} = ?`);
      vals.push(patch[k]);
    }
  }
  if ("interests" in patch) {
    sets.push("interests = ?");
    vals.push(JSON.stringify(patch.interests || []));
  }
  if (sets.length === 0) return getUserById(id);
  vals.push(id);
  db().prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
  return getUserById(id);
}

// ============================================================
// Pinnwand
// ============================================================
export function getPinnwand(targetUserId, { byUserId } = {}) {
  return db().prepare(`
    SELECT p.id, p.text, p.image_url AS imageUrl, p.created_at AS at,
           u.username AS from_username, u.display_name AS from_display_name, u.emoji AS from_emoji,
           u.gender AS from_gender, u.birthdate AS from_birthdate,
           u.avatar_url AS from_avatar_url, u.avatar_status AS from_avatar_status,
           (SELECT COUNT(*) FROM reactions r WHERE r.target_type='pinnwand' AND r.target_id=p.id AND r.kind='like') AS likeCount,
           CASE WHEN EXISTS(SELECT 1 FROM reactions r WHERE r.target_type='pinnwand' AND r.target_id=p.id AND r.user_id=? AND r.kind='like') THEN 1 ELSE 0 END AS iLiked
      FROM pinnwand p
      JOIN users u ON u.id = p.from_user_id
     WHERE p.target_user_id = ?
     ORDER BY p.created_at DESC
  `).all(byUserId || 0, targetUserId).map((r) => ({
    ...r,
    imageUrl: r.imageUrl || "",
    from_gender: r.from_gender === "m" || r.from_gender === "w" ? r.from_gender : "",
    from_age: ageFromBirthdate(r.from_birthdate),
    from_avatar: r.from_avatar_status === "approved" ? (r.from_avatar_url || "") : "",
    iLiked: !!r.iLiked,
  }));
}

export function addPinnwand(targetUserId, fromUserId, text, imageUrl = "") {
  const info = db().prepare(`
    INSERT INTO pinnwand (target_user_id, from_user_id, text, image_url, created_at) VALUES (?, ?, ?, ?, ?)
  `).run(targetUserId, fromUserId, text, imageUrl, Date.now());
  return info.lastInsertRowid;
}

export function addGuestbookEntry(targetUserId, fromUserId, text) {
  const info = db().prepare(`
    INSERT INTO guestbook (target_user_id, from_user_id, text, created_at) VALUES (?, ?, ?, ?)
  `).run(targetUserId, fromUserId, text, Date.now());
  return info.lastInsertRowid;
}

export function getGuestbookEntries(targetUserId) {
  return db().prepare(`
    SELECT g.id, g.text, g.created_at AS at,
           u.username AS from_username, u.display_name AS from_display_name,
           u.gender AS from_gender, u.birthdate AS from_birthdate,
           u.avatar_url AS from_avatar_url, u.avatar_status AS from_avatar_status
      FROM guestbook g JOIN users u ON u.id = g.from_user_id
     WHERE g.target_user_id = ? ORDER BY g.created_at DESC
  `).all(targetUserId).map((r) => ({
    ...r,
    from_gender: r.from_gender === "m" || r.from_gender === "w" ? r.from_gender : "",
    from_age: ageFromBirthdate(r.from_birthdate),
    from_avatar: r.from_avatar_status === "approved" ? (r.from_avatar_url || "") : "",
  }));
}

export function deleteGuestbookEntry(id, byUserId) {
  const row = db().prepare("SELECT from_user_id, target_user_id FROM guestbook WHERE id = ?").get(id);
  if (!row) return false;
  if (row.from_user_id !== byUserId && row.target_user_id !== byUserId) return false;
  db().prepare("DELETE FROM guestbook WHERE id = ?").run(id);
  return true;
}

export function deletePinnwandEntry(id, byUserId) {
  // Erlaubt: Verfasser ODER Profilbesitzer
  const row = db().prepare("SELECT * FROM pinnwand WHERE id = ?").get(id);
  if (!row) return false;
  if (row.from_user_id !== byUserId && row.target_user_id !== byUserId) return false;
  db().prepare("DELETE FROM pinnwand WHERE id = ?").run(id);
  return true;
}

// ============================================================
// Gifts
// ============================================================
export function getGifts(targetUserId) {
  return db().prepare(`
    SELECT g.id, g.gift_id, g.created_at AS at,
           u.username AS from_username, u.display_name AS from_display_name, u.emoji AS from_emoji
      FROM gifts g
      JOIN users u ON u.id = g.from_user_id
     WHERE g.target_user_id = ?
     ORDER BY g.created_at DESC
  `).all(targetUserId);
}

export function addGift(targetUserId, fromUserId, giftId) {
  db().prepare(`
    INSERT INTO gifts (target_user_id, from_user_id, gift_id, created_at) VALUES (?, ?, ?, ?)
  `).run(targetUserId, fromUserId, giftId, Date.now());
}

// ============================================================
// Messages
// ============================================================
export function getConversation(userIdA, userIdB) {
  const rows = db().prepare(`
    SELECT id, from_user_id, to_user_id, text, created_at AS at,
           kind, audio_url, once_only, consumed
      FROM messages
     WHERE (from_user_id = ? AND to_user_id = ?)
        OR (from_user_id = ? AND to_user_id = ?)
     ORDER BY created_at ASC
  `).all(userIdA, userIdB, userIdB, userIdA);
  return rows.map(shapeMessage);
}

// Audio einer einmalig-anhörbaren & schon konsumierten Nachricht NICHT mehr ausliefern.
function shapeMessage(m) {
  const out = {
    id: m.id,
    from_user_id: m.from_user_id,
    to_user_id: m.to_user_id,
    text: m.text,
    at: m.at,
    kind: m.kind || "text",
    onceOnly: !!m.once_only,
    consumed: !!m.consumed,
  };
  if (out.kind === "voice") {
    out.audioUrl = (out.onceOnly && out.consumed) ? null : m.audio_url;
  }
  return out;
}

export function consumeMessage(messageId, byUserId) {
  // Nur der Empfänger einer einmalig-anhörbaren Nachricht kann sie "verbrauchen"
  const m = db().prepare("SELECT * FROM messages WHERE id = ?").get(messageId);
  if (!m || m.to_user_id !== byUserId || !m.once_only || m.consumed) return false;
  // Audio physisch löschen + als verbraucht markieren
  db().prepare("UPDATE messages SET consumed = 1, audio_url = NULL WHERE id = ?").run(messageId);
  return true;
}

export function getConversationsForUser(userId) {
  return db().prepare(`
    SELECT
      partner.id AS partner_id,
      partner.username AS partner_username,
      partner.display_name AS partner_display_name,
      partner.emoji AS partner_emoji,
      partner.avatar_url AS partner_avatar_url,
      partner.avatar_status AS partner_avatar_status,
      partner.last_seen AS partner_last_seen,
      CASE WHEN m.kind = 'voice' THEN '🎤 Sprachnachricht' ELSE m.text END AS last_text,
      m.created_at AS at,
      m.from_user_id AS last_from
    FROM (
      SELECT
        CASE WHEN from_user_id = ? THEN to_user_id ELSE from_user_id END AS partner_id,
        MAX(created_at) AS max_at
      FROM messages
      WHERE from_user_id = ? OR to_user_id = ?
      GROUP BY partner_id
    ) c
    JOIN users partner ON partner.id = c.partner_id
    JOIN messages m ON m.created_at = c.max_at
                  AND ((m.from_user_id = ? AND m.to_user_id = partner.id)
                    OR (m.to_user_id = ? AND m.from_user_id = partner.id))
    ORDER BY c.max_at DESC
  `).all(userId, userId, userId, userId, userId);
}

export function sendMessage(fromUserId, toUserId, text, opts = {}) {
  const at = Date.now();
  const kind = opts.kind === "voice" ? "voice" : "text";
  const audioUrl = kind === "voice" ? (opts.audioUrl || null) : null;
  const onceOnly = opts.onceOnly ? 1 : 0;
  const info = db().prepare(`
    INSERT INTO messages (from_user_id, to_user_id, text, created_at, kind, audio_url, once_only, consumed)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0)
  `).run(fromUserId, toUserId, text || "", at, kind, audioUrl, onceOnly);
  return { id: info.lastInsertRowid, fromUserId, toUserId, text: text || "", at, kind, onceOnly: !!onceOnly };
}

export function getMessagesSince(userId, sinceId) {
  const rows = db().prepare(`
    SELECT id, from_user_id, to_user_id, text, created_at AS at,
           kind, audio_url, once_only, consumed
      FROM messages
     WHERE id > ?
       AND (from_user_id = ? OR to_user_id = ?)
     ORDER BY id ASC
  `).all(sinceId, userId, userId);
  return rows.map(shapeMessage);
}

// ============================================================
// Albums & Photos
// ============================================================
export function listAlbums(userId) {
  return db().prepare(`
    SELECT a.id, a.name, a.created_at AS at,
           (SELECT COUNT(*) FROM photos p WHERE p.album_id = a.id) AS photo_count,
           (SELECT data_url FROM photos p WHERE p.album_id = a.id ORDER BY created_at DESC LIMIT 1) AS cover
      FROM albums a
     WHERE a.user_id = ?
     ORDER BY a.created_at DESC
  `).all(userId);
}

export function createAlbum(userId, name) {
  const info = db().prepare(`
    INSERT INTO albums (user_id, name, created_at) VALUES (?, ?, ?)
  `).run(userId, name, Date.now());
  return info.lastInsertRowid;
}

export function getAlbum(id) {
  return db().prepare("SELECT id, user_id, name, created_at AS at FROM albums WHERE id = ?").get(id);
}

export function listPhotos(userId, albumId, { approvedOnly = false } = {}) {
  const cond = approvedOnly ? "AND status = 'approved'" : "";
  if (albumId) {
    return db().prepare(`
      SELECT id, data_url, caption, status, reason, created_at AS at FROM photos
      WHERE user_id = ? AND album_id = ? ${cond} ORDER BY created_at DESC
    `).all(userId, albumId);
  }
  return db().prepare(`
    SELECT id, album_id, data_url, caption, status, reason, created_at AS at FROM photos
    WHERE user_id = ? ${cond} ORDER BY created_at DESC
  `).all(userId);
}

export function addPhoto(userId, albumId, dataUrl, caption, status, reason) {
  const info = db().prepare(`
    INSERT INTO photos (user_id, album_id, data_url, caption, status, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(userId, albumId || null, dataUrl, caption || "", status || "approved", reason || "", Date.now());
  return info.lastInsertRowid;
}

export function deletePhoto(id, byUserId) {
  const row = db().prepare("SELECT user_id FROM photos WHERE id = ?").get(id);
  if (!row || (byUserId != null && row.user_id !== byUserId)) return false;
  db().prepare("DELETE FROM photos WHERE id = ?").run(id);
  return true;
}

// Foto-Moderation (Album-Fotos)
export function getPhoto(id) {
  return db().prepare("SELECT * FROM photos WHERE id = ?").get(id);
}
export function setPhotoStatus(id, status, reason) {
  if (!["pending", "approved", "rejected"].includes(status)) return;
  db().prepare("UPDATE photos SET status = ?, reason = ? WHERE id = ?").run(status, reason || "", id);
}
export function listPendingPhotos() {
  return db().prepare(`
    SELECT p.id, p.data_url AS url, p.caption, p.created_at AS at, u.username, u.display_name AS displayName
      FROM photos p JOIN users u ON u.id = p.user_id
     WHERE p.status = 'pending' ORDER BY p.created_at ASC
  `).all();
}
export function listRejectedPhotos() {
  return db().prepare(`
    SELECT p.id, p.data_url AS url, p.caption, p.reason, u.username, u.display_name AS displayName
      FROM photos p JOIN users u ON u.id = p.user_id
     WHERE p.status = 'rejected' ORDER BY p.created_at DESC LIMIT 60
  `).all();
}
export function autoApproveStalePhotos(maxAgeMs) {
  const cutoff = Date.now() - maxAgeMs;
  const rows = db().prepare("SELECT id, user_id FROM photos WHERE status = 'pending' AND created_at < ?").all(cutoff);
  for (const r of rows) {
    db().prepare("UPDATE photos SET status = 'approved', reason = 'Auto-Freigabe (Fidolin-Frist abgelaufen)' WHERE id = ?").run(r.id);
    logMod({ userId: r.user_id, kind: "foto", decision: "approved", reason: "Auto-Freigabe nach Frist", by: "fidolin" });
  }
  return rows.length;
}

// ============================================================
// Groups
// ============================================================
export function listGroups() {
  return db().prepare(`
    SELECT g.id, g.slug, g.name, g.description, g.emoji, g.created_at AS at,
           (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) AS member_count,
           (SELECT COUNT(*) FROM group_posts WHERE group_id = g.id) AS post_count
      FROM groups g
     ORDER BY g.created_at DESC
  `).all();
}

export function getGroup(slug) {
  return db().prepare(`
    SELECT g.id, g.slug, g.name, g.description, g.emoji, g.owner_id, g.created_at AS at
      FROM groups g WHERE g.slug = ?
  `).get(slug);
}

export function createGroup({ slug, name, description, emoji, ownerId }) {
  const cleanedSlug = String(slug || "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!cleanedSlug) throw new Error("Ungültiger Gruppen-Slug.");
  const now = Date.now();
  try {
    const info = db().prepare(`
      INSERT INTO groups (slug, name, description, emoji, owner_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(cleanedSlug, name, description || "", emoji || "👥", ownerId, now);
    db().prepare(`
      INSERT INTO group_members (group_id, user_id, role, joined_at) VALUES (?, ?, 'owner', ?)
    `).run(info.lastInsertRowid, ownerId, now);
    return getGroup(cleanedSlug);
  } catch (e) {
    if (String(e).includes("UNIQUE")) throw new Error("Gruppen-Slug existiert schon.");
    throw e;
  }
}

export function getGroupMembers(groupId) {
  return db().prepare(`
    SELECT u.id, u.username, u.display_name AS displayName, u.emoji, u.last_seen AS lastSeen,
           gm.role, gm.joined_at AS joinedAt
      FROM group_members gm
      JOIN users u ON u.id = gm.user_id
     WHERE gm.group_id = ?
     ORDER BY gm.joined_at ASC
  `).all(groupId);
}

export function isMember(groupId, userId) {
  return !!db().prepare("SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?").get(groupId, userId);
}

export function joinGroup(groupId, userId) {
  const now = Date.now();
  try {
    db().prepare(`
      INSERT INTO group_members (group_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)
    `).run(groupId, userId, now);
  } catch {}
}

export function leaveGroup(groupId, userId) {
  db().prepare(`
    DELETE FROM group_members WHERE group_id = ? AND user_id = ? AND role != 'owner'
  `).run(groupId, userId);
}

export function getGroupPosts(groupId) {
  return db().prepare(`
    SELECT gp.id, gp.text, gp.created_at AS at,
           u.username, u.display_name AS displayName, u.emoji
      FROM group_posts gp
      JOIN users u ON u.id = gp.user_id
     WHERE gp.group_id = ?
     ORDER BY gp.created_at DESC
  `).all(groupId);
}

export function addGroupPost(groupId, userId, text) {
  db().prepare(`
    INSERT INTO group_posts (group_id, user_id, text, created_at) VALUES (?, ?, ?, ?)
  `).run(groupId, userId, text, Date.now());
}

export function getMyGroups(userId) {
  return db().prepare(`
    SELECT g.id, g.slug, g.name, g.emoji, gm.role
      FROM group_members gm JOIN groups g ON g.id = gm.group_id
     WHERE gm.user_id = ?
     ORDER BY gm.joined_at DESC
  `).all(userId);
}

// ============================================================
// Profilbesucher (SchülerVZ/Jappy "Wer war auf meinem Profil?")
// ============================================================
export function recordVisit(targetUserId, visitorUserId) {
  if (!targetUserId || !visitorUserId || targetUserId === visitorUserId) return;
  // Nur 1x pro Stunde pro Besucher zählen
  const recent = db().prepare(`
    SELECT 1 FROM profile_visits
     WHERE target_user_id = ? AND visitor_user_id = ? AND visited_at > ?
     LIMIT 1
  `).get(targetUserId, visitorUserId, Date.now() - 3600 * 1000);
  if (recent) return;
  db().prepare(`
    INSERT INTO profile_visits (target_user_id, visitor_user_id, visited_at) VALUES (?, ?, ?)
  `).run(targetUserId, visitorUserId, Date.now());
}

export function getVisitCount(targetUserId) {
  return db().prepare("SELECT COUNT(*) AS n FROM profile_visits WHERE target_user_id = ?").get(targetUserId).n;
}

// Reaktionen (Like) – polymorph: target_type kann 'pinnwand', 'status', 'grouppost' sein
// Benachrichtigungen
export function addNotification({ userId, actorId, type, targetType = "", targetId = null, preview = "" }) {
  if (!userId || !type) return;
  if (actorId && actorId === userId) return; // keine Selbst-Benachrichtigung
  db().prepare("INSERT INTO notifications (user_id, actor_id, type, target_type, target_id, preview, read, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)")
    .run(userId, actorId || null, type, targetType, targetId, String(preview || "").slice(0, 200), Date.now());
}
export function listNotifications(userId, limit = 30) {
  return db().prepare(`
    SELECT n.id, n.type, n.target_type AS targetType, n.target_id AS targetId,
           n.preview, n.read, n.created_at AS at,
           a.username AS actorUsername, a.display_name AS actorName,
           a.gender AS actorGender, a.birthdate AS actorBirthdate,
           a.avatar_url AS actorAvatarUrl, a.avatar_status AS actorAvatarStatus
      FROM notifications n LEFT JOIN users a ON a.id = n.actor_id
     WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT ?
  `).all(userId, limit).map((r) => ({
    ...r,
    read: !!r.read,
    actorGender: r.actorGender === "m" || r.actorGender === "w" ? r.actorGender : "",
    actorAge: ageFromBirthdate(r.actorBirthdate),
    actorAvatar: r.actorAvatarStatus === "approved" ? (r.actorAvatarUrl || "") : "",
  }));
}
export function countUnreadNotifications(userId) {
  return db().prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read = 0").get(userId).n;
}
export function markNotificationsRead(userId) {
  db().prepare("UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0").run(userId);
}

// @-Markierungen aus Text extrahieren -> Liste eindeutiger usernames (lowercase)
export function extractMentions(text) {
  const out = new Set();
  const re = /@([a-z0-9_.]{3,30})/gi;
  const s = String(text || "");
  let m;
  while ((m = re.exec(s)) !== null) out.add(m[1].toLowerCase());
  return [...out];
}

// Mention-Benachrichtigungen erzeugen (fuer alle existierenden, nicht-Author-User)
export function notifyMentions(authorId, text, targetType, targetId) {
  const names = extractMentions(text);
  if (!names.length) return;
  for (const name of names) {
    const u = getUserByUsername(name);
    if (!u || u.id === authorId) continue;
    addNotification({ userId: u.id, actorId: authorId, type: "mention", targetType, targetId, preview: text });
  }
}

export function getPinnwandAuthorId(pinnwandId) {
  const r = db().prepare("SELECT from_user_id FROM pinnwand WHERE id = ?").get(pinnwandId);
  return r ? r.from_user_id : null;
}

export function toggleReaction(targetType, targetId, userId, kind = "like") {
  const ex = db().prepare("SELECT id FROM reactions WHERE target_type=? AND target_id=? AND user_id=? AND kind=?").get(targetType, targetId, userId, kind);
  if (ex) {
    db().prepare("DELETE FROM reactions WHERE id=?").run(ex.id);
    return false;
  }
  db().prepare("INSERT INTO reactions (target_type, target_id, user_id, kind, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(targetType, targetId, userId, kind, Date.now());
  return true;
}
export function countReaction(targetType, targetId, kind = "like") {
  return db().prepare("SELECT COUNT(*) AS n FROM reactions WHERE target_type=? AND target_id=? AND kind=?").get(targetType, targetId, kind).n;
}

export function addStatusUpdate(userId, text, imageUrl) {
  const t = String(text || "").trim().slice(0, 280);
  const img = String(imageUrl || "");
  if (!t && !img) return;
  db().prepare("INSERT INTO status_updates (user_id, text, image_url, created_at) VALUES (?, ?, ?, ?)")
    .run(userId, t, img, Date.now());
}

export function getRecentVisitors(targetUserId, limit = 6) {
  // Letzter Besuch pro Besucher, neueste zuerst (rollierende Liste)
  return db().prepare(`
    SELECT u.username, u.display_name AS displayName, u.emoji, u.last_seen AS lastSeen, u.mood,
           u.gender, u.birthdate, u.avatar_url AS avatarUrlRaw, u.avatar_status AS avatarStatus,
           MAX(v.visited_at) AS at
      FROM profile_visits v
      JOIN users u ON u.id = v.visitor_user_id
     WHERE v.target_user_id = ?
     GROUP BY v.visitor_user_id
     ORDER BY at DESC
     LIMIT ?
  `).all(targetUserId, limit).map((v) => ({
    username: v.username,
    displayName: v.displayName,
    emoji: v.emoji,
    lastSeen: v.lastSeen,
    at: v.at,
    mood: v.mood || "",
    gender: v.gender === "m" || v.gender === "w" ? v.gender : "",
    age: ageFromBirthdate(v.birthdate),
    avatarUrl: v.avatarStatus === "approved" ? (v.avatarUrlRaw || "") : "",
  }));
}

// ============================================================
// Buschfunk - Aktivitäts-Feed (wer-kennt-wen Style)
// ============================================================
export function getBuschfunk(limit = 30) {
  const d = db();
  const events = [];

  for (const p of d.prepare(`
    SELECT p.created_at AS at, f.username AS au, f.display_name AS an, f.gender AS ag, f.birthdate AS abd,
           t.username AS tu, t.display_name AS tn, p.text AS detail
      FROM pinnwand p
      JOIN users f ON f.id = p.from_user_id
      JOIN users t ON t.id = p.target_user_id
     ORDER BY p.created_at DESC LIMIT ?
  `).all(limit)) {
    events.push({ type: "pinnwand", at: p.at, actor: { username: p.au, displayName: p.an, gender: p.ag, age: ageFromBirthdate(p.abd) },
      target: { username: p.tu, displayName: p.tn }, detail: p.detail });
  }

  for (const g of d.prepare(`
    SELECT g.created_at AS at, g.gift_id AS gift, f.username AS au, f.display_name AS an, f.gender AS ag, f.birthdate AS abd,
           t.username AS tu, t.display_name AS tn
      FROM gifts g
      JOIN users f ON f.id = g.from_user_id
      JOIN users t ON t.id = g.target_user_id
     ORDER BY g.created_at DESC LIMIT ?
  `).all(limit)) {
    events.push({ type: "gift", at: g.at, gift: g.gift, actor: { username: g.au, displayName: g.an, gender: g.ag, age: ageFromBirthdate(g.abd) },
      target: { username: g.tu, displayName: g.tn } });
  }

  for (const gp of d.prepare(`
    SELECT gp.created_at AS at, u.username AS au, u.display_name AS an, u.gender AS ag, u.birthdate AS abd,
           gr.slug AS gslug, gr.name AS gname, gp.text AS detail
      FROM group_posts gp
      JOIN users u ON u.id = gp.user_id
      JOIN groups gr ON gr.id = gp.group_id
     ORDER BY gp.created_at DESC LIMIT ?
  `).all(limit)) {
    events.push({ type: "grouppost", at: gp.at, actor: { username: gp.au, displayName: gp.an, gender: gp.ag, age: ageFromBirthdate(gp.abd) },
      group: { slug: gp.gslug, name: gp.gname }, detail: gp.detail });
  }

  for (const u of d.prepare(`
    SELECT created_at AS at, username AS au, display_name AS an, gender AS ag, birthdate AS abd
      FROM users ORDER BY created_at DESC LIMIT 10
  `).all()) {
    events.push({ type: "newuser", at: u.at, actor: { username: u.au, displayName: u.an, gender: u.ag, age: ageFromBirthdate(u.abd) } });
  }

  for (const p of d.prepare(`
    SELECT p.id AS picId, p.url AS picUrl, p.created_at AS at,
           u.username AS au, u.display_name AS an, u.gender AS ag, u.birthdate AS abd
      FROM profile_pics p JOIN users u ON u.id = p.user_id
     WHERE p.status = 'approved' ORDER BY p.created_at DESC LIMIT ?
  `).all(limit)) {
    events.push({ type: "newpic", at: p.at, picId: p.picId, picUrl: p.picUrl,
      actor: { username: p.au, displayName: p.an, gender: p.ag, age: ageFromBirthdate(p.abd) } });
  }

  for (const s of d.prepare(`
    SELECT s.text AS detail, s.image_url AS picUrl, s.created_at AS at,
           u.username AS au, u.display_name AS an, u.emoji AS ae, u.gender AS ag, u.birthdate AS abd
      FROM status_updates s JOIN users u ON u.id = s.user_id
     ORDER BY s.created_at DESC LIMIT ?
  `).all(limit)) {
    events.push({ type: "status", at: s.at, detail: s.detail, picUrl: s.picUrl || "",
      actor: { username: s.au, displayName: s.an, emoji: s.ae, gender: s.ag, age: ageFromBirthdate(s.abd) } });
  }

  return events.sort((a, b) => b.at - a.at).slice(0, limit);
}

// ============================================================
// Pub-Sub für SSE (in-process)
// ============================================================
const listeners = new Map(); // userId -> Set<callback>

export function subscribe(userId, cb) {
  if (!listeners.has(userId)) listeners.set(userId, new Set());
  listeners.get(userId).add(cb);
  return () => {
    const set = listeners.get(userId);
    if (set) {
      set.delete(cb);
      if (set.size === 0) listeners.delete(userId);
    }
  };
}

export function publishMessage(msg) {
  // Sender + Empfänger erhalten Event
  for (const uid of [msg.fromUserId, msg.toUserId]) {
    const set = listeners.get(uid);
    if (set) for (const cb of set) try { cb(msg); } catch {}
  }
}
