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

    CREATE TABLE IF NOT EXISTS message_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      reporter_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reason TEXT DEFAULT '',
      status TEXT DEFAULT 'open',
      created_at INTEGER NOT NULL,
      resolved_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_reports_status ON message_reports(status, created_at DESC);

    CREATE TABLE IF NOT EXISTS conversation_settings (
      user_min_id INTEGER NOT NULL,
      user_max_id INTEGER NOT NULL,
      retention_days INTEGER NOT NULL DEFAULT 0,
      set_by_user_id INTEGER,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_min_id, user_max_id)
    );

    CREATE TABLE IF NOT EXISTS chat_mutes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_type TEXT NOT NULL,        -- 'user' | 'room' | 'all'
      target_id INTEGER,                 -- user_id oder room_id; NULL bei 'all'
      until_at INTEGER NOT NULL,         -- 0 = unbegrenzt, sonst ms-Timestamp
      created_at INTEGER NOT NULL,
      UNIQUE(user_id, target_type, target_id)
    );
    CREATE INDEX IF NOT EXISTS idx_mutes_lookup ON chat_mutes(user_id, target_type, target_id);

    CREATE TABLE IF NOT EXISTS chat_rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      emoji TEXT DEFAULT '💬',
      owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_room_members (
      room_id INTEGER NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT DEFAULT 'member',         -- 'owner' | 'member'
      joined_at INTEGER NOT NULL,
      last_read_at INTEGER DEFAULT 0,
      PRIMARY KEY (room_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_room_member_user ON chat_room_members(user_id);

    CREATE TABLE IF NOT EXISTS live_calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,                          -- '1on1' | 'group'
      initiator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      partner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,   -- bei 1on1
      room_id INTEGER REFERENCES chat_rooms(id) ON DELETE CASCADE,  -- bei group
      with_video INTEGER DEFAULT 1,
      started_at INTEGER NOT NULL,
      ended_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_calls_active ON live_calls(ended_at);

    CREATE TABLE IF NOT EXISTS live_call_participants (
      call_id INTEGER NOT NULL REFERENCES live_calls(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      joined_at INTEGER NOT NULL,
      left_at INTEGER,
      PRIMARY KEY (call_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_call_part_user ON live_call_participants(user_id);

    CREATE TABLE IF NOT EXISTS chat_room_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
      from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      text TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      kind TEXT DEFAULT 'text',           -- 'text' | 'voice' | 'system' | 'nudge'
      audio_url TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_room_msg_room ON chat_room_messages(room_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS failed_logins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      ip TEXT DEFAULT '',
      at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_failed_user_at ON failed_logins(username, at DESC);
    CREATE INDEX IF NOT EXISTS idx_failed_ip_at ON failed_logins(ip, at DESC);

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      ip TEXT DEFAULT '',
      ua TEXT DEFAULT '',
      detail TEXT DEFAULT '',
      at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_audit_user_at ON audit_log(user_id, at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_action_at ON audit_log(action, at DESC);

    CREATE TABLE IF NOT EXISTS ip_intel (
      ip TEXT PRIMARY KEY,
      is_proxy INTEGER DEFAULT 0,
      is_vpn INTEGER DEFAULT 0,
      is_tor INTEGER DEFAULT 0,
      is_hosting INTEGER DEFAULT 0,
      risk_score INTEGER DEFAULT 0,
      country TEXT DEFAULT '',
      asn TEXT DEFAULT '',
      checked_at INTEGER NOT NULL
    );

    -- VIBO: das persönliche Pixel-Pet (Tamagotchi + Animal-Crossing-Mix).
    CREATE TABLE IF NOT EXISTS vibos (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      species TEXT NOT NULL DEFAULT 'sprout',     -- sprout|kitsune|drago|knuddi|stella
      hatched_at INTEGER NOT NULL,
      hunger INTEGER NOT NULL DEFAULT 80,         -- 0-100, hoch = satt
      fun INTEGER NOT NULL DEFAULT 80,            -- 0-100, hoch = glücklich
      hygiene INTEGER NOT NULL DEFAULT 80,        -- 0-100, hoch = sauber
      affection INTEGER NOT NULL DEFAULT 60,      -- 0-100, hoch = enge Bindung
      health INTEGER NOT NULL DEFAULT 100,        -- 0-100, hoch = gesund
      last_tick_at INTEGER NOT NULL,
      died_at INTEGER,
      death_reason TEXT DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_vibo_alive ON vibos(died_at);

    -- Friedhof: verstorbene VIBOs bleiben als Erinnerung
    CREATE TABLE IF NOT EXISTS vibo_cemetery (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      species TEXT NOT NULL,
      hatched_at INTEGER NOT NULL,
      died_at INTEGER NOT NULL,
      death_reason TEXT DEFAULT '',
      age_days INTEGER NOT NULL DEFAULT 0,
      epitaph TEXT DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_cemetery_user ON vibo_cemetery(user_id, died_at DESC);

    -- Credits: virtuelle Währung (Jappy-Stil).
    CREATE TABLE IF NOT EXISTS credits (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      balance INTEGER NOT NULL DEFAULT 0,
      total_earned INTEGER NOT NULL DEFAULT 0,
      daily_streak INTEGER NOT NULL DEFAULT 0,
      last_daily_at INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS credit_tx (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL,            -- positiv = Gutschrift, negativ = Ausgabe
      reason TEXT NOT NULL,                -- daily, gruscheln, pinnwand, gift_recv, like_recv, admin_grant, ...
      ref_type TEXT DEFAULT '',
      ref_id INTEGER,
      at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_credit_tx_user ON credit_tx(user_id, at DESC);

    -- Globale Settings (z.B. Credit-Multiplikator)
    CREATE TABLE IF NOT EXISTS settings_global (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at INTEGER NOT NULL
    );

    -- Saisonale Events (Admin-steuerbar)
    CREATE TABLE IF NOT EXISTS season_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      emoji TEXT DEFAULT '🎉',
      multiplier_x100 INTEGER DEFAULT 100,   -- 100 = 1.0x, 200 = 2.0x
      starts_at INTEGER NOT NULL,
      ends_at INTEGER NOT NULL,
      enabled INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );


    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      user_agent TEXT DEFAULT '',
      created_at INTEGER NOT NULL,
      last_used_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);

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
  addColumnIfMissing(d, "messages", "read_at", "INTEGER DEFAULT 0");
  addColumnIfMissing(d, "messages", "image_url", "TEXT DEFAULT ''");
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
  // Sound-Pack pro User: 'icq' | 'msn' | 'aim' | 'silent'
  addColumnIfMissing(d, "users", "sound_pack", "TEXT DEFAULT 'icq'");
  // MSN-Style Presence: 'online' | 'away' | 'busy' | 'invisible'
  addColumnIfMissing(d, "users", "presence", "TEXT DEFAULT 'online'");
  // TOTP-Geheimnis (Base32) für 2FA. Leer = 2FA deaktiviert.
  addColumnIfMissing(d, "users", "totp_secret", "TEXT DEFAULT ''");
  addColumnIfMissing(d, "credits", "earn_blocked_until", "INTEGER DEFAULT 0");
  addColumnIfMissing(d, "credits", "earn_block_reason", "TEXT DEFAULT ''");
  // Pending-Secret während des 2FA-Einrichtungsprozesses (vor erstem Verify).
  addColumnIfMissing(d, "users", "totp_pending", "TEXT DEFAULT ''");

  // Migration: alte Demo-Konten (Passwort öffentlich bekannt) entfernen
  const DEMO_USERNAMES = ['anna_2003', 'kevin_skater', 'lisa_princess', 'max_zocker', 'julia_diva', 'tom_dj'];
  for (const u of DEMO_USERNAMES) {
    d.prepare("DELETE FROM users WHERE username = ?").run(u);
  }

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
    soundPack: u.sound_pack || "icq",
    presence: u.presence || "online",
    has2fa: !!(u.totp_secret && u.totp_secret.length > 0),
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
// Mindestanforderungen an ein Passwort. Nutzt der Register- und Passwort-Ändern-Pfad.
// Akzeptiert auch lange Passphrasen (>= 12 Zeichen) als hinreichend.
export function validatePasswordStrength(password) {
  const p = String(password || "");
  if (p.length < 10) throw new Error("Passwort zu kurz (mind. 10 Zeichen).");
  if (p.length >= 12) return true; // lange Passphrase reicht
  const classes =
    (/[a-z]/.test(p) ? 1 : 0) +
    (/[A-Z]/.test(p) ? 1 : 0) +
    (/[0-9]/.test(p) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(p) ? 1 : 0);
  if (classes < 3) throw new Error("Passwort braucht Mix aus Klein-, Großbuchstaben, Zahlen oder Sonderzeichen (oder einfach 12+ Zeichen).");
  return true;
}

export function createUser({ username, displayName, password, emoji, regIp, gender, birthdate }) {
  const cleaned = String(username || "").trim().toLowerCase().replace(/[^a-z0-9_.]/g, "_");
  if (!cleaned) throw new Error("Ungültiger Benutzername.");
  if (cleaned.length < 3) throw new Error("Benutzername zu kurz (mind. 3 Zeichen).");
  if (cleaned.length > 24) throw new Error("Benutzername zu lang (max. 24 Zeichen).");
  validatePasswordStrength(password);
  const g = gender === "m" || gender === "w" ? gender : "";
  if (!g) throw new Error("Bitte Geschlecht angeben (m oder w).");
  const age = ageFromBirthdate(birthdate);
  if (age == null) throw new Error("Bitte ein gültiges Geburtsdatum angeben.");
  if (age < 18) throw new Error("VibeVibo ist ab 18 – du musst mindestens 18 Jahre alt sein.");
  const existing = getUserByUsername(cleaned);
  if (existing) throw new Error("Username schon vergeben.");
  const hash = bcrypt.hashSync(password, 12);
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
    openReports: d.prepare("SELECT COUNT(*) AS n FROM message_reports WHERE status='open'").get().n,
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

// Alle Sessions eines Users invalidieren (Logout überall, z.B. nach Verdacht).
// Optional kann eine Session erhalten bleiben (die aktuelle).
export function deleteAllSessionsForUser(userId, exceptToken = null) {
  if (!userId) return 0;
  const info = exceptToken
    ? db().prepare("DELETE FROM sessions WHERE user_id = ? AND token != ?").run(userId, exceptToken)
    : db().prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  return info.changes;
}

// ----- 2FA-Helfer -----
export function getUserTotpSecret(userId) {
  const r = db().prepare("SELECT totp_secret, totp_pending FROM users WHERE id = ?").get(userId);
  return { active: r?.totp_secret || "", pending: r?.totp_pending || "" };
}
export function setUserTotpPending(userId, secret) {
  db().prepare("UPDATE users SET totp_pending = ? WHERE id = ?").run(secret || "", userId);
}
export function activateUserTotp(userId) {
  db().prepare("UPDATE users SET totp_secret = totp_pending, totp_pending = '' WHERE id = ?").run(userId);
}
export function disableUserTotp(userId) {
  db().prepare("UPDATE users SET totp_secret = '', totp_pending = '' WHERE id = ?").run(userId);
}
export function isTotpEnabled(userId) {
  const r = db().prepare("SELECT totp_secret FROM users WHERE id = ?").get(userId);
  return !!(r?.totp_secret);
}

// Passwort prüfen ohne Session-Generation (für 2FA-Disable etc.)
export function checkUserPassword(userId, password) {
  const row = db().prepare("SELECT password_hash FROM users WHERE id = ?").get(userId);
  if (!row) return false;
  return bcrypt.compareSync(String(password || ""), row.password_hash);
}

// ============================================================
// VIBO – Pixel-Pet (Tamagotchi + Animal Crossing)
// ============================================================
const VIBO_HOUR = 3600_000;
const VIBO_ACTION_COOLDOWNS = (typeof globalThis.__viboCooldowns === "undefined")
  ? (globalThis.__viboCooldowns = new Map())
  : globalThis.__viboCooldowns;

function viboClamp(n) { return Math.max(0, Math.min(100, Math.round(n))); }

export function loadVibo(userId) {
  return db().prepare("SELECT * FROM vibos WHERE user_id = ?").get(userId) || null;
}

// Friedhof: alle verstorbenen VIBOs eines Users (oder global wenn null)
export function listCemetery(userId, limit = 50) {
  if (userId) {
    return db().prepare(`
      SELECT id, name, species, hatched_at AS hatchedAt, died_at AS diedAt,
             death_reason AS deathReason, age_days AS ageDays, epitaph
        FROM vibo_cemetery WHERE user_id = ?
       ORDER BY died_at DESC LIMIT ?
    `).all(userId, limit);
  }
  return db().prepare(`
    SELECT c.id, c.name, c.species, c.hatched_at AS hatchedAt, c.died_at AS diedAt,
           c.death_reason AS deathReason, c.age_days AS ageDays, c.epitaph,
           u.username, u.display_name AS displayName
      FROM vibo_cemetery c JOIN users u ON u.id = c.user_id
     ORDER BY c.died_at DESC LIMIT ?
  `).all(limit);
}
export function setEpitaph(userId, id, text) {
  db().prepare("UPDATE vibo_cemetery SET epitaph = ? WHERE id = ? AND user_id = ?")
    .run(String(text || "").slice(0, 140), id, userId);
}

export function hatchVibo(userId, name, species = "sprout") {
  const SP = ["sprout", "kitsune", "drago", "knuddi", "stella"];
  const sp = SP.includes(species) ? species : "sprout";
  const cleanName = String(name || "").trim().slice(0, 24) || "VIBO";

  // Verstorbenes wird ehrenvoll auf den Friedhof übertragen, dann gelöscht.
  const dead = db().prepare("SELECT * FROM vibos WHERE user_id = ? AND died_at IS NOT NULL").get(userId);
  if (dead) {
    const ageDays = Math.round((dead.died_at - dead.hatched_at) / (24 * 3600_000));
    db().prepare(`
      INSERT INTO vibo_cemetery (user_id, name, species, hatched_at, died_at, death_reason, age_days)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, dead.name, dead.species, dead.hatched_at, dead.died_at, dead.death_reason || "", ageDays);
    db().prepare("DELETE FROM vibos WHERE user_id = ? AND died_at IS NOT NULL").run(userId);
  }
  const existing = db().prepare("SELECT user_id FROM vibos WHERE user_id = ?").get(userId);
  if (existing) throw new Error("Du hast schon ein VIBO. Pflege es lieber.");
  const now = Date.now();
  db().prepare(`
    INSERT INTO vibos (user_id, name, species, hatched_at, last_tick_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, cleanName, sp, now, now);
  audit({ userId, action: "vibo.hatched", detail: `name=${cleanName},species=${sp}` });
  return loadVibo(userId);
}

// Wendet Zeitverfall an (lazy beim GET). Schreibt sofort zurück.
export function tickAndPersistVibo(userId) {
  const v = loadVibo(userId);
  if (!v || v.died_at) return v;
  const now = Date.now();
  const last = v.last_tick_at || v.hatched_at;
  const hours = (now - last) / VIBO_HOUR;
  if (hours <= 0) return v;

  const updated = { ...v };
  updated.hunger    = viboClamp(v.hunger    - hours * 4);
  updated.fun       = viboClamp(v.fun       - hours * 3);
  updated.hygiene   = viboClamp(v.hygiene   - hours * 2);
  updated.affection = viboClamp(v.affection - hours * 1);

  let healthLoss = 0;
  for (const k of ["hunger", "fun", "hygiene", "affection"]) {
    if (updated[k] < 20) healthLoss += hours * 1;
  }
  updated.health = viboClamp(v.health - healthLoss);
  updated.last_tick_at = now;

  if (updated.health <= 0 && v.health <= 0 && now - (v.last_tick_at || now) > 3 * VIBO_HOUR) {
    updated.died_at = now;
    updated.death_reason = "Vernachlässigung";
    audit({ userId, action: "vibo.died", detail: v.name });
  }

  db().prepare(`
    UPDATE vibos SET hunger=?, fun=?, hygiene=?, affection=?, health=?, last_tick_at=?, died_at=?, death_reason=?
    WHERE user_id=?
  `).run(
    updated.hunger, updated.fun, updated.hygiene, updated.affection, updated.health,
    updated.last_tick_at, updated.died_at || null, updated.death_reason || "", userId
  );
  return updated;
}

const VIBO_ACTIONS = {
  feed:  { hunger: +35, fun: +5,  hygiene: -3, affection: +3, health: 0,   cooldownMs: 30 * 60_000 },
  play:  { hunger: -5,  fun: +35, hygiene: -5, affection: +8, health: 0,   cooldownMs: 20 * 60_000 },
  clean: { hunger: 0,   fun: -5,  hygiene: +40, affection: +2, health: +5,  cooldownMs: 60 * 60_000 },
  pet:   { hunger: 0,   fun: +8,  hygiene: 0,   affection: +15, health: +2,  cooldownMs: 5  * 60_000 },
  heal:  { hunger: 0,   fun: -10, hygiene: 0,   affection: 0,   health: +30, cooldownMs: 4 * VIBO_HOUR },
};

// ============================================================
// Credits / Saison-Events
// ============================================================
function ensureCreditsRow(userId) {
  db().prepare(`INSERT OR IGNORE INTO credits (user_id) VALUES (?)`).run(userId);
}
export function getCredits(userId) {
  ensureCreditsRow(userId);
  return db().prepare("SELECT balance, total_earned AS totalEarned, daily_streak AS dailyStreak, last_daily_at AS lastDailyAt FROM credits WHERE user_id = ?").get(userId);
}
export function listCreditTx(userId, limit = 30) {
  return db().prepare(
    "SELECT id, amount, reason, ref_type AS refType, ref_id AS refId, at FROM credit_tx WHERE user_id = ? ORDER BY at DESC LIMIT ?"
  ).all(userId, limit);
}

// Anti-Inflation: harte Tagesgrenze für passiv verdiente Credits.
// Daily-Bonus und Admin-Grants zählen NICHT mit (eigener Bucket).
const DAILY_EARN_CAP = 60;     // max 60 Credits/Tag aus Aktivität
const SAME_REF_COOLDOWN_MS = 24 * 3600_000; // pro (reason, refType, refId) nur 1x in 24h
const DIMINISH_AFTER = 5;       // nach 5x gleicher Aktion: halber Wert
const PASSIVE_REASONS = new Set([
  "gruscheln_send", "gruscheln_recv", "pinnwand", "gift_send", "gift_recv",
  "like_recv", "photo_upload",
]);

function dayKeyUTC(ts) {
  return new Date(ts).toISOString().slice(0, 10);
}

function todayEarnedPassive(userId) {
  const since = Date.now() - 24 * 3600_000;
  const placeholders = Array.from(PASSIVE_REASONS).map(() => "?").join(",");
  const args = [userId, ...PASSIVE_REASONS, since];
  const r = db().prepare(`
    SELECT COALESCE(SUM(amount), 0) AS sum
      FROM credit_tx
     WHERE user_id = ? AND reason IN (${placeholders}) AND amount > 0 AND at > ?
  `).get(...args);
  return r?.sum || 0;
}

function countSameReasonToday(userId, reason) {
  const since = Date.now() - 24 * 3600_000;
  const r = db().prepare(`
    SELECT COUNT(*) AS c FROM credit_tx
     WHERE user_id = ? AND reason = ? AND amount > 0 AND at > ?
  `).get(userId, reason, since);
  return r?.c || 0;
}

function alreadyAwardedFor(userId, reason, refType, refId) {
  if (!refType && !refId) return false;
  const since = Date.now() - SAME_REF_COOLDOWN_MS;
  const r = db().prepare(`
    SELECT 1 FROM credit_tx
     WHERE user_id = ? AND reason = ? AND ref_type = ? AND ref_id = ? AND at > ?
     LIMIT 1
  `).get(userId, reason, refType || "", refId || 0, since);
  return !!r;
}

// Schreibt eine Transaktion und passt Saldo+total_earned an.
// Anti-Inflation-Mechaniken:
//   - DAILY_EARN_CAP: passive Earns nur bis 60/Tag
//   - SAME_REF_COOLDOWN: gleicher Ref (z.B. dieselbe Pinnwand-Reaktion) zählt nicht doppelt
//   - DIMINISH_AFTER: ab der N-ten gleichen Aktion nur noch halber Wert
// Gibt {balance, amount, blocked: reason} zurück.
export function awardCredits(userId, amount, reason, ref = {}) {
  if (!userId || !amount) return { balance: 0, amount: 0 };
  ensureCreditsRow(userId);
  const now = Date.now();
  reason = reason || "";

  // 0) KI-Earn-Block aktiv? Dann keine passiven Earns (admin_grant / spend gehen weiter)
  if (amount > 0 && PASSIVE_REASONS.has(reason)) {
    const blk = db().prepare("SELECT earn_blocked_until FROM credits WHERE user_id = ?").get(userId);
    if (blk?.earn_blocked_until && blk.earn_blocked_until > now) {
      return { balance: getCredits(userId).balance, amount: 0, blocked: "ai_earn_block" };
    }
  }

  // 1) Anti-Doppel: gleicher ref bekommt in 24h keine zweiten Credits
  if (amount > 0 && alreadyAwardedFor(userId, reason, ref.type || "", ref.id || 0)) {
    return { balance: getCredits(userId).balance, amount: 0, blocked: "duplicate" };
  }

  // 2) Diminishing Returns: ab Nx gleicher reason halber Wert, ab 2Nx gar nichts
  let working = amount;
  if (working > 0 && PASSIVE_REASONS.has(reason)) {
    const used = countSameReasonToday(userId, reason);
    if (used >= DIMINISH_AFTER * 2) {
      return { balance: getCredits(userId).balance, amount: 0, blocked: "saturation" };
    }
    if (used >= DIMINISH_AFTER) working = Math.max(1, Math.floor(working / 2));
  }

  // 3) Saison-Multiplier nur auf Positives
  const seasonM = currentSeasonMultiplier();
  working = working > 0 ? Math.round(working * seasonM) : working;

  // 4) Tages-Cap für passive Earns
  if (working > 0 && PASSIVE_REASONS.has(reason)) {
    const earnedToday = todayEarnedPassive(userId);
    const remaining = Math.max(0, DAILY_EARN_CAP - earnedToday);
    if (remaining <= 0) {
      return { balance: getCredits(userId).balance, amount: 0, blocked: "daily_cap" };
    }
    if (working > remaining) working = remaining;
  }

  if (working === 0) return { balance: getCredits(userId).balance, amount: 0, blocked: "zero" };

  db().prepare(`
    UPDATE credits
       SET balance = balance + ?,
           total_earned = total_earned + CASE WHEN ? > 0 THEN ? ELSE 0 END
     WHERE user_id = ?
  `).run(working, working, working, userId);
  db().prepare(`
    INSERT INTO credit_tx (user_id, amount, reason, ref_type, ref_id, at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, working, reason, ref.type || "", ref.id || null, now);
  const row = db().prepare("SELECT balance FROM credits WHERE user_id = ?").get(userId);

  // 🌱 Karma-Bindung: jeder positive Earn füttert auch dein VIBO (+1 Affection, capped 100).
  // Stille Aktion (keine Cooldown-Notification), nur wenn VIBO existiert + lebt.
  if (working > 0) {
    db().prepare(`
      UPDATE vibos SET affection = MIN(100, affection + 1)
       WHERE user_id = ? AND died_at IS NULL
    `).run(userId);
  }

  return { balance: row?.balance || 0, amount: working };
}

// Vibes-Earn-Block (gesetzt durch KI-Monitoring oder manuell)
export function blockEarnForUser(userId, untilTs, reason) {
  if (!userId) return;
  db().prepare(`
    UPDATE credits SET earn_blocked_until = ?, earn_block_reason = ?
     WHERE user_id = ?
  `).run(Math.max(0, Number(untilTs) || 0), String(reason || "").slice(0, 160), userId);
  audit({ userId, action: "vibes.earn_blocked", detail: reason || "" });
}
export function unblockEarnForUser(userId) {
  db().prepare("UPDATE credits SET earn_blocked_until = 0, earn_block_reason = '' WHERE user_id = ?").run(userId);
  audit({ userId, action: "vibes.earn_unblocked", detail: "manuell aufgehoben" });
}
export function listEarnBlockedUsers() {
  const now = Date.now();
  return db().prepare(`
    SELECT u.id AS userId, u.username, u.display_name AS displayName,
           c.earn_blocked_until AS until, c.earn_block_reason AS reason
      FROM credits c JOIN users u ON u.id = c.user_id
     WHERE c.earn_blocked_until > ?
     ORDER BY c.earn_blocked_until DESC
  `).all(now);
}
// Burst-Detection-Helfer für vibesAi
export function vibesBurstUsers(sinceMs = 60_000, minCount = 5) {
  return db().prepare(`
    SELECT user_id AS userId, COUNT(*) AS c
      FROM credit_tx
     WHERE amount > 0 AND at > ?
     GROUP BY user_id
    HAVING c > ?
  `).all(Date.now() - sinceMs, minCount);
}
export function getUserIdByUsername(username) {
  const r = db().prepare("SELECT id FROM users WHERE username = ?").get(String(username || "").toLowerCase());
  return r?.id || null;
}

// Admin-Direktbuchung: Limits + Cooldowns werden umgangen, immer durchgewunken.
// Positiv = gutschreiben, negativ = abziehen (kann unter 0 gehen? nein, gecappt bei 0).
export function adminGrantCredits(userId, amount, note) {
  if (!userId || !amount) return { balance: 0, amount: 0 };
  ensureCreditsRow(userId);
  const now = Date.now();
  const row = db().prepare("SELECT balance FROM credits WHERE user_id = ?").get(userId);
  const newBal = Math.max(0, (row?.balance || 0) + amount);
  const realAmount = newBal - (row?.balance || 0);
  db().prepare(`
    UPDATE credits
       SET balance = balance + ?,
           total_earned = total_earned + CASE WHEN ? > 0 THEN ? ELSE 0 END
     WHERE user_id = ?
  `).run(realAmount, realAmount, realAmount, userId);
  db().prepare(`
    INSERT INTO credit_tx (user_id, amount, reason, ref_type, ref_id, at)
    VALUES (?, ?, 'admin_grant', 'admin', 0, ?)
  `).run(userId, realAmount, now);
  audit({ userId, action: "vibes.admin_grant", detail: `amount=${realAmount},note=${String(note || "").slice(0, 80)}` });
  return { balance: newBal, amount: realAmount };
}

// Versucht Credits abzubuchen. Liefert {ok, balance, missing}.
export function spendCredits(userId, amount, reason, ref = {}) {
  if (amount <= 0) return { ok: true, balance: 0, missing: 0 };
  ensureCreditsRow(userId);
  const row = db().prepare("SELECT balance FROM credits WHERE user_id = ?").get(userId);
  const bal = row?.balance || 0;
  if (bal < amount) return { ok: false, balance: bal, missing: amount - bal };
  db().prepare("UPDATE credits SET balance = balance - ? WHERE user_id = ?").run(amount, userId);
  db().prepare(`
    INSERT INTO credit_tx (user_id, amount, reason, ref_type, ref_id, at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, -amount, reason || "", ref.type || "", ref.id || null, Date.now());
  return { ok: true, balance: bal - amount, missing: 0 };
}

// Tages-Bonus: einmal pro Kalendertag. Streak wird hochgezählt wenn gestern reklamiert,
// sonst auf 1 zurückgesetzt. Liefert {claimed, amount, streak, nextAt}.
export function claimDailyBonus(userId, calcAmount) {
  ensureCreditsRow(userId);
  const c = getCredits(userId);
  const now = Date.now();
  // Tagesgrenze: Mitternacht Europa/Berlin – einfache UTC-Annäherung reicht hier
  function dayKey(ts) {
    const d = new Date(ts);
    return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
  }
  const today = dayKey(now);
  const lastDay = c.lastDailyAt ? dayKey(c.lastDailyAt) : null;
  if (lastDay === today) {
    return { claimed: false, amount: 0, streak: c.dailyStreak, reason: "Schon heute abgeholt." };
  }
  // Streak fortführen wenn gestern claim, sonst zurück auf 1
  const yesterdayKey = dayKey(now - 24 * 3600_000);
  const streak = (lastDay === yesterdayKey) ? c.dailyStreak + 1 : 1;
  const amount = calcAmount({ totalEarned: c.totalEarned, streak });
  awardCredits(userId, amount, "daily", { type: "daily", id: null });
  db().prepare("UPDATE credits SET daily_streak = ?, last_daily_at = ? WHERE user_id = ?").run(streak, now, userId);
  return { claimed: true, amount, streak };
}

// ----- Saison-Events -----
export function currentSeasonMultiplier(now = Date.now()) {
  const r = db().prepare(`
    SELECT multiplier_x100 FROM season_events
     WHERE enabled = 1 AND starts_at <= ? AND ends_at >= ?
     ORDER BY multiplier_x100 DESC LIMIT 1
  `).get(now, now);
  return r ? (r.multiplier_x100 / 100) : 1;
}
export function listActiveSeasonEvents(now = Date.now()) {
  return db().prepare(`
    SELECT id, slug, name, description, emoji, multiplier_x100 AS multiplier,
           starts_at AS startsAt, ends_at AS endsAt, enabled
      FROM season_events
     WHERE enabled = 1 AND starts_at <= ? AND ends_at >= ?
     ORDER BY starts_at DESC
  `).all(now, now);
}
export function listAllSeasonEvents() {
  return db().prepare(`
    SELECT id, slug, name, description, emoji, multiplier_x100 AS multiplier,
           starts_at AS startsAt, ends_at AS endsAt, enabled, created_at AS createdAt
      FROM season_events
     ORDER BY created_at DESC
  `).all();
}
export function upsertSeasonEvent({ id, slug, name, description, emoji, multiplier, startsAt, endsAt, enabled }) {
  const now = Date.now();
  const m = Math.max(50, Math.min(500, Math.round(Number(multiplier) || 100)));
  if (id) {
    db().prepare(`
      UPDATE season_events SET
        slug = ?, name = ?, description = ?, emoji = ?,
        multiplier_x100 = ?, starts_at = ?, ends_at = ?, enabled = ?
      WHERE id = ?
    `).run(String(slug), String(name), String(description || ""), String(emoji || "🎉"),
           m, Number(startsAt), Number(endsAt), enabled ? 1 : 0, id);
    return id;
  }
  const r = db().prepare(`
    INSERT INTO season_events (slug, name, description, emoji, multiplier_x100, starts_at, ends_at, enabled, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(String(slug), String(name), String(description || ""), String(emoji || "🎉"),
         m, Number(startsAt), Number(endsAt), enabled ? 1 : 0, now);
  return r.lastInsertRowid;
}
export function deleteSeasonEvent(id) {
  db().prepare("DELETE FROM season_events WHERE id = ?").run(id);
}

export function applyViboAction(userId, action) {
  const cfg = VIBO_ACTIONS[action];
  if (!cfg) throw new Error("Unbekannte Aktion.");
  const v = tickAndPersistVibo(userId);
  if (!v) throw new Error("Du hast noch kein VIBO.");
  if (v.died_at) throw new Error("Dein VIBO ist verstorben. Schlüpfe ein neues.");

  const key = `${userId}:${action}`;
  const last = VIBO_ACTION_COOLDOWNS.get(key) || 0;
  const now = Date.now();
  if (now - last < cfg.cooldownMs) {
    const wait = Math.ceil((cfg.cooldownMs - (now - last)) / 60_000);
    throw new Error(`${action} geht erst wieder in ${wait} Min.`);
  }
  VIBO_ACTION_COOLDOWNS.set(key, now);

  const next = {
    ...v,
    hunger:    viboClamp(v.hunger    + (cfg.hunger    || 0)),
    fun:       viboClamp(v.fun       + (cfg.fun       || 0)),
    hygiene:   viboClamp(v.hygiene   + (cfg.hygiene   || 0)),
    affection: viboClamp(v.affection + (cfg.affection || 0)),
    health:    viboClamp(v.health    + (cfg.health    || 0)),
    last_tick_at: now,
  };
  db().prepare(`
    UPDATE vibos SET hunger=?, fun=?, hygiene=?, affection=?, health=?, last_tick_at=?
    WHERE user_id=?
  `).run(next.hunger, next.fun, next.hygiene, next.affection, next.health, next.last_tick_at, userId);
  return next;
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
  purgeExpiredForPair(userIdA, userIdB);
  const rows = db().prepare(`
    SELECT id, from_user_id, to_user_id, text, created_at AS at,
           kind, audio_url, once_only, consumed, read_at, image_url
      FROM messages
     WHERE (from_user_id = ? AND to_user_id = ?)
        OR (from_user_id = ? AND to_user_id = ?)
     ORDER BY created_at ASC
  `).all(userIdA, userIdB, userIdB, userIdA);
  return rows.map(shapeMessage);
}

// ----- Chat-Verlauf Auto-Löschung (24h / 7 Tage / 30 Tage) -----
const VALID_RETENTION_DAYS = new Set([0, 1, 7, 30]);

function pairKey(a, b) {
  const x = Math.min(a, b);
  const y = Math.max(a, b);
  return [x, y];
}

export function getConversationRetention(userIdA, userIdB) {
  const [x, y] = pairKey(userIdA, userIdB);
  const r = db().prepare(
    "SELECT retention_days, set_by_user_id, updated_at FROM conversation_settings WHERE user_min_id = ? AND user_max_id = ?"
  ).get(x, y);
  return {
    retentionDays: r?.retention_days || 0,
    setBy: r?.set_by_user_id || 0,
    updatedAt: r?.updated_at || 0,
  };
}

export function setConversationRetention(userIdA, userIdB, days, byUserId) {
  const d = Number(days) || 0;
  if (!VALID_RETENTION_DAYS.has(d)) {
    throw new Error("Ungültige Aufbewahrungsdauer (erlaubt: 0, 1, 7, 30 Tage).");
  }
  const [x, y] = pairKey(userIdA, userIdB);
  db().prepare(`
    INSERT INTO conversation_settings (user_min_id, user_max_id, retention_days, set_by_user_id, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_min_id, user_max_id) DO UPDATE SET
      retention_days = excluded.retention_days,
      set_by_user_id = excluded.set_by_user_id,
      updated_at = excluded.updated_at
  `).run(x, y, d, byUserId || null, Date.now());
  // Sofort aufräumen, damit der Nutzer den Effekt direkt sieht.
  purgeExpiredForPair(userIdA, userIdB);
  return { retentionDays: d };
}

function purgeExpiredForPair(userIdA, userIdB) {
  const [x, y] = pairKey(userIdA, userIdB);
  const r = db().prepare(
    "SELECT retention_days FROM conversation_settings WHERE user_min_id = ? AND user_max_id = ?"
  ).get(x, y);
  const days = r?.retention_days || 0;
  if (!days) return 0;
  const cutoff = Date.now() - days * 86_400_000;
  const info = db().prepare(`
    DELETE FROM messages
     WHERE ((from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?))
       AND created_at < ?
  `).run(x, y, y, x, cutoff);
  return info.changes;
}

// Globaler Sweeper (kann aus Cron/SSE aufgerufen werden) – räumt ALLE Paare mit Retention auf.
export function purgeAllExpiredMessages() {
  const now = Date.now();
  const pairs = db().prepare(
    "SELECT user_min_id, user_max_id, retention_days FROM conversation_settings WHERE retention_days > 0"
  ).all();
  let total = 0;
  const stmt = db().prepare(`
    DELETE FROM messages
     WHERE ((from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?))
       AND created_at < ?
  `);
  for (const p of pairs) {
    const cutoff = now - p.retention_days * 86_400_000;
    total += stmt.run(p.user_min_id, p.user_max_id, p.user_max_id, p.user_min_id, cutoff).changes;
  }
  return total;
}

// Markiert alle Nachrichten von partnerId an myUserId als gelesen.
export function markConversationRead(myUserId, partnerUserId) {
  if (!myUserId || !partnerUserId) return 0;
  const info = db().prepare(
    "UPDATE messages SET read_at = ? WHERE to_user_id = ? AND from_user_id = ? AND (read_at IS NULL OR read_at = 0)"
  ).run(Date.now(), myUserId, partnerUserId);
  return info.changes;
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
    readAt: m.read_at || 0,
    imageUrl: m.image_url || "",
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
      partner.gender AS partner_gender,
      partner.birthdate AS partner_birthdate,
      CASE WHEN m.kind = 'voice' THEN '🎤 Sprachnachricht' ELSE m.text END AS last_text,
      m.created_at AS at,
      m.from_user_id AS last_from,
      (SELECT COUNT(*) FROM messages mm WHERE mm.to_user_id = ? AND mm.from_user_id = partner.id AND (mm.read_at IS NULL OR mm.read_at = 0)) AS unread
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
  `).all(userId, userId, userId, userId, userId, userId).map((c) => ({
    ...c,
    partner_gender: c.partner_gender === "m" || c.partner_gender === "w" ? c.partner_gender : "",
    partner_age: ageFromBirthdate(c.partner_birthdate),
  }));
}

export function sendMessage(fromUserId, toUserId, text, opts = {}) {
  const at = Date.now();
  const kind = opts.kind === "voice" ? "voice" : "text";
  const audioUrl = kind === "voice" ? (opts.audioUrl || null) : null;
  const onceOnly = opts.onceOnly ? 1 : 0;
  const imageUrl = opts.imageUrl || "";
  const info = db().prepare(`
    INSERT INTO messages (from_user_id, to_user_id, text, created_at, kind, audio_url, once_only, consumed, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
  `).run(fromUserId, toUserId, text || "", at, kind, audioUrl, onceOnly, imageUrl);
  return { id: info.lastInsertRowid, fromUserId, toUserId, text: text || "", at, kind, onceOnly: !!onceOnly, imageUrl };
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

// Nachrichten-Meldungen
export function addMessageReport(messageId, reporterId, reason) {
  const ex = db().prepare("SELECT id FROM message_reports WHERE message_id=? AND reporter_user_id=? AND status='open'").get(messageId, reporterId);
  if (ex) return ex.id;
  const info = db().prepare("INSERT INTO message_reports (message_id, reporter_user_id, reason, status, created_at) VALUES (?, ?, ?, 'open', ?)")
    .run(messageId, reporterId, String(reason || "").slice(0, 200), Date.now());
  return info.lastInsertRowid;
}
export function listOpenReports(limit = 60) {
  return db().prepare(`
    SELECT r.id, r.reason, r.created_at AS at, r.message_id AS messageId,
           m.text AS messageText, m.kind AS messageKind, m.image_url AS messageImage, m.created_at AS messageAt,
           m.from_user_id AS senderId, m.to_user_id AS receiverId,
           rep.username AS reporterUsername, rep.display_name AS reporterDisplayName,
           sender.username AS senderUsername, sender.display_name AS senderDisplayName,
           receiver.username AS receiverUsername, receiver.display_name AS receiverDisplayName
      FROM message_reports r
      JOIN messages m ON m.id = r.message_id
      JOIN users rep ON rep.id = r.reporter_user_id
      JOIN users sender ON sender.id = m.from_user_id
      JOIN users receiver ON receiver.id = m.to_user_id
     WHERE r.status = 'open'
     ORDER BY r.created_at DESC LIMIT ?
  `).all(limit);
}
export function countOpenReports() {
  return db().prepare("SELECT COUNT(*) AS n FROM message_reports WHERE status='open'").get().n;
}
export function getReportSnippet(messageId, around = 6) {
  const m = db().prepare("SELECT from_user_id, to_user_id FROM messages WHERE id=?").get(messageId);
  if (!m) return [];
  const before = db().prepare(`
    SELECT id, from_user_id, to_user_id, text, kind, image_url AS imageUrl, created_at AS at
      FROM messages
     WHERE ((from_user_id=? AND to_user_id=?) OR (from_user_id=? AND to_user_id=?)) AND id < ?
     ORDER BY id DESC LIMIT ?
  `).all(m.from_user_id, m.to_user_id, m.to_user_id, m.from_user_id, messageId, around).reverse();
  const reported = db().prepare(`SELECT id, from_user_id, to_user_id, text, kind, image_url AS imageUrl, created_at AS at FROM messages WHERE id=?`).get(messageId);
  const after = db().prepare(`
    SELECT id, from_user_id, to_user_id, text, kind, image_url AS imageUrl, created_at AS at
      FROM messages
     WHERE ((from_user_id=? AND to_user_id=?) OR (from_user_id=? AND to_user_id=?)) AND id > ?
     ORDER BY id ASC LIMIT ?
  `).all(m.from_user_id, m.to_user_id, m.to_user_id, m.from_user_id, messageId, around);
  return [...before, reported, ...after];
}
export function resolveReport(reportId, status = "resolved") {
  if (!["resolved", "dismissed"].includes(status)) return;
  db().prepare("UPDATE message_reports SET status=?, resolved_at=? WHERE id=?").run(status, Date.now(), reportId);
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

// Niedrige Ebene: liefert eine "Envelope" {type, data} an alle SSE-Abonnenten eines Users.
export function publishToUser(userId, type, data) {
  const set = listeners.get(userId);
  if (!set) return;
  const envelope = { type, data };
  for (const cb of set) try { cb(envelope); } catch {}
}

export function publishMessage(msg) {
  // Sender + Empfänger erhalten Event (Envelope-Form)
  for (const uid of [msg.fromUserId, msg.toUserId]) {
    publishToUser(uid, "message", msg);
  }
}

export function publishRoomMessage(roomId, msg, memberIds) {
  const data = { ...msg, roomId };
  for (const uid of memberIds) publishToUser(uid, "room-message", data);
}

export function publishTyping({ fromUserId, toUserId, roomId }) {
  const data = { fromUserId, toUserId: toUserId || null, roomId: roomId || null, at: Date.now() };
  if (roomId) {
    const ids = listChatRoomMemberIds(roomId).filter((id) => id !== fromUserId);
    for (const uid of ids) publishToUser(uid, "typing", data);
  } else if (toUserId) {
    publishToUser(toUserId, "typing", data);
  }
}

export function publishNudge({ fromUserId, toUserId }) {
  publishToUser(toUserId, "nudge", { fromUserId, toUserId, at: Date.now() });
}

// Web-RTC Signaling-Envelope an einen einzelnen User
export function publishRtc(toUserId, payload) {
  publishToUser(toUserId, "rtc", payload);
}

// ============================================================
// Web Push Subscriptions (Lock-Screen Benachrichtigungen)
// ============================================================
export function addPushSubscription({ userId, endpoint, p256dh, auth, userAgent }) {
  if (!userId || !endpoint || !p256dh || !auth) return null;
  const now = Date.now();
  const ua = String(userAgent || "").slice(0, 240);

  // Falls Endpoint schon existiert (z.B. nach Browser-Refresh), nur Eigentümer/Zeit aktualisieren
  const existing = db().prepare("SELECT id FROM push_subscriptions WHERE endpoint = ?").get(endpoint);
  if (existing) {
    db().prepare(`
      UPDATE push_subscriptions
         SET user_id = ?, p256dh = ?, auth = ?, user_agent = ?, last_used_at = ?
       WHERE id = ?
    `).run(userId, p256dh, auth, ua, now, existing.id);
    return existing.id;
  }
  const r = db().prepare(`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, created_at, last_used_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(userId, endpoint, p256dh, auth, ua, now, now);
  return r.lastInsertRowid;
}

export function removePushSubscriptionByEndpoint(endpoint, userId) {
  if (!endpoint) return 0;
  if (userId) {
    return db().prepare("DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?").run(endpoint, userId).changes;
  }
  return db().prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").run(endpoint).changes;
}

export function listPushSubscriptionsForUser(userId) {
  if (!userId) return [];
  return db().prepare(`
    SELECT id, endpoint, p256dh, auth
      FROM push_subscriptions
     WHERE user_id = ?
  `).all(userId);
}

export function touchPushSubscription(id) {
  if (!id) return;
  db().prepare("UPDATE push_subscriptions SET last_used_at = ? WHERE id = ?").run(Date.now(), id);
}

export function deletePushSubscriptionById(id) {
  if (!id) return 0;
  return db().prepare("DELETE FROM push_subscriptions WHERE id = ?").run(id).changes;
}

// ============================================================
// Security: Failed Logins, Audit-Log, IP-Intel
// ============================================================
export function recordFailedLogin(username, ip) {
  db().prepare("INSERT INTO failed_logins (username, ip, at) VALUES (?, ?, ?)")
    .run(String(username || "").toLowerCase(), ip || "", Date.now());
}
export function countRecentFailedLogins(username, sinceMs) {
  return db().prepare(
    "SELECT COUNT(*) AS c FROM failed_logins WHERE username = ? AND at > ?"
  ).get(String(username || "").toLowerCase(), Date.now() - sinceMs).c;
}
export function countRecentFailedLoginsByIp(ip, sinceMs) {
  return db().prepare(
    "SELECT COUNT(*) AS c FROM failed_logins WHERE ip = ? AND at > ?"
  ).get(ip || "", Date.now() - sinceMs).c;
}
export function clearFailedLogins(username) {
  db().prepare("DELETE FROM failed_logins WHERE username = ?")
    .run(String(username || "").toLowerCase());
}
export function purgeOldFailedLogins(maxAgeMs = 7 * 24 * 3600_000) {
  db().prepare("DELETE FROM failed_logins WHERE at < ?").run(Date.now() - maxAgeMs);
}

export function audit({ userId = null, action, ip = "", ua = "", detail = "" }) {
  db().prepare(`
    INSERT INTO audit_log (user_id, action, ip, ua, detail, at) VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, action, ip, String(ua || "").slice(0, 240), String(detail || "").slice(0, 500), Date.now());
}
export function listAuditForUser(userId, limit = 200) {
  if (!userId) return [];
  return db().prepare(`
    SELECT id, action, ip, ua, detail, at FROM audit_log
     WHERE user_id = ? ORDER BY at DESC LIMIT ?
  `).all(userId, limit);
}

// Admin-Logs: alle Audit-Einträge, mit optionalem Filter
export function listAuditLog({ limit = 100, actionFilter = "", since = 0, search = "" } = {}) {
  const args = [];
  let where = "1=1";
  if (actionFilter) { where += " AND action LIKE ?"; args.push(`${actionFilter}%`); }
  if (since)        { where += " AND at >= ?";       args.push(since); }
  if (search) {
    where += " AND (detail LIKE ? OR ip LIKE ?)";
    args.push(`%${search}%`, `%${search}%`);
  }
  args.push(Math.min(limit, 1000));
  return db().prepare(`
    SELECT a.id, a.user_id AS userId, a.action, a.ip, a.ua, a.detail, a.at,
           u.username, u.display_name AS displayName
      FROM audit_log a LEFT JOIN users u ON u.id = a.user_id
     WHERE ${where}
     ORDER BY a.at DESC
     LIMIT ?
  `).all(...args);
}

// Admin-Vibes-Log: alle Transaktionen mit User-Info
export function listAllVibesTx({ limit = 100, userFilter = "", reasonFilter = "", since = 0 } = {}) {
  const args = [];
  let where = "1=1";
  if (userFilter)   { where += " AND (u.username LIKE ? OR u.display_name LIKE ?)"; args.push(`%${userFilter}%`, `%${userFilter}%`); }
  if (reasonFilter) { where += " AND t.reason = ?";   args.push(reasonFilter); }
  if (since)        { where += " AND t.at >= ?";      args.push(since); }
  args.push(Math.min(limit, 1000));
  return db().prepare(`
    SELECT t.id, t.user_id AS userId, t.amount, t.reason, t.ref_type AS refType, t.ref_id AS refId, t.at,
           u.username, u.display_name AS displayName
      FROM credit_tx t JOIN users u ON u.id = t.user_id
     WHERE ${where}
     ORDER BY t.at DESC
     LIMIT ?
  `).all(...args);
}

// Top-Vibes-Sammler / Ausgeber
export function topVibesEarners(limit = 25) {
  return db().prepare(`
    SELECT c.user_id AS userId, c.balance, c.total_earned AS totalEarned, c.daily_streak AS streak,
           u.username, u.display_name AS displayName
      FROM credits c JOIN users u ON u.id = c.user_id
     ORDER BY c.total_earned DESC LIMIT ?
  `).all(limit);
}

// Verdächtige Muster: User mit ungewöhnlich vielen Vibes-Earns in 24h
export function suspiciousVibesPatterns() {
  const since = Date.now() - 24 * 3600_000;
  return db().prepare(`
    SELECT t.user_id AS userId, u.username, u.display_name AS displayName,
           COUNT(*) AS earnCount,
           SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END) AS totalEarned24h,
           COUNT(DISTINCT t.ref_id) AS uniqueRefs
      FROM credit_tx t JOIN users u ON u.id = t.user_id
     WHERE t.amount > 0 AND t.at > ?
     GROUP BY t.user_id
    HAVING earnCount > 20
     ORDER BY totalEarned24h DESC
     LIMIT 50
  `).all(since);
}

// Top-Empfänger (von welchen Sendern) – Multi-Account-Detection
export function vibesGiftPairs(limit = 50) {
  const since = Date.now() - 7 * 24 * 3600_000;
  return db().prepare(`
    SELECT u.username AS recipient, t.ref_id AS senderId, ud.username AS sender,
           COUNT(*) AS gifts, SUM(t.amount) AS sumAmount
      FROM credit_tx t
      JOIN users u  ON u.id  = t.user_id
      JOIN users ud ON ud.id = t.ref_id
     WHERE t.reason IN ('gift_recv','gruscheln_recv') AND t.amount > 0
       AND t.at > ? AND t.ref_type = 'from'
     GROUP BY t.user_id, t.ref_id
    HAVING gifts >= 3
     ORDER BY sumAmount DESC
     LIMIT ?
  `).all(since, limit);
}
// Beweis-Paket für Strafanzeige: alles was zu einem User existiert
export function buildEvidence(userId) {
  if (!userId) return null;
  const user = db().prepare("SELECT id, username, display_name, reg_ip, created_at, last_seen, status FROM users WHERE id = ?").get(userId);
  if (!user) return null;
  const audit = db().prepare("SELECT * FROM audit_log WHERE user_id = ? ORDER BY at ASC").all(userId);
  const failed = db().prepare("SELECT * FROM failed_logins WHERE username = ? ORDER BY at ASC").all(user.username);
  const devices = db().prepare("SELECT * FROM devices WHERE user_id = ? ORDER BY last_seen DESC").all(userId);
  const sanctions = db().prepare("SELECT * FROM sanctions WHERE user_id = ? ORDER BY id ASC").all(userId);
  const reports = db().prepare(`
    SELECT r.id, r.reason, r.status, r.created_at, m.text, m.from_user_id, m.to_user_id, m.created_at AS msg_at
      FROM message_reports r JOIN messages m ON m.id = r.message_id
     WHERE m.from_user_id = ?
     ORDER BY r.created_at ASC
  `).all(userId);
  return {
    generatedAt: new Date().toISOString(),
    user, audit, failedLogins: failed, devices, sanctions, reports,
  };
}

// IP-Intel: gecached für 24h, Helfer schreibt/liest direkt
export function getCachedIpIntel(ip, maxAgeMs = 24 * 3600_000) {
  if (!ip) return null;
  const r = db().prepare("SELECT * FROM ip_intel WHERE ip = ?").get(ip);
  if (!r) return null;
  if (Date.now() - r.checked_at > maxAgeMs) return null;
  return {
    ip: r.ip,
    isProxy: !!r.is_proxy,
    isVpn: !!r.is_vpn,
    isTor: !!r.is_tor,
    isHosting: !!r.is_hosting,
    riskScore: r.risk_score || 0,
    country: r.country || "",
    asn: r.asn || "",
    checkedAt: r.checked_at,
  };
}
export function storeIpIntel(ip, data) {
  if (!ip) return;
  db().prepare(`
    INSERT INTO ip_intel (ip, is_proxy, is_vpn, is_tor, is_hosting, risk_score, country, asn, checked_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(ip) DO UPDATE SET
      is_proxy = excluded.is_proxy, is_vpn = excluded.is_vpn, is_tor = excluded.is_tor,
      is_hosting = excluded.is_hosting, risk_score = excluded.risk_score,
      country = excluded.country, asn = excluded.asn, checked_at = excluded.checked_at
  `).run(ip,
    data?.isProxy ? 1 : 0, data?.isVpn ? 1 : 0, data?.isTor ? 1 : 0, data?.isHosting ? 1 : 0,
    Number(data?.riskScore) || 0, data?.country || "", data?.asn || "", Date.now());
}

// ============================================================
// Stumm-Schaltung (pro Chat / pro Raum / global)
// targetType: 'user' (Partner-User-ID) | 'room' (Raum-ID) | 'all' (Globale Stille)
// untilAt: 0 = unbegrenzt, sonst ms-Timestamp wann es endet
// ============================================================
export function setChatMute(userId, targetType, targetId, untilAt) {
  if (!["user", "room", "all"].includes(targetType)) throw new Error("invalid target type");
  const tid = targetType === "all" ? null : (Number(targetId) || null);
  if (targetType !== "all" && !tid) throw new Error("target id required");
  const until = Math.max(0, Number(untilAt) || 0);
  const now = Date.now();
  if (tid === null) {
    db().prepare(`
      INSERT INTO chat_mutes (user_id, target_type, target_id, until_at, created_at)
      VALUES (?, ?, NULL, ?, ?)
      ON CONFLICT(user_id, target_type, target_id) DO UPDATE SET
        until_at = excluded.until_at, created_at = excluded.created_at
    `).run(userId, targetType, until, now);
  } else {
    db().prepare(`
      INSERT INTO chat_mutes (user_id, target_type, target_id, until_at, created_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, target_type, target_id) DO UPDATE SET
        until_at = excluded.until_at, created_at = excluded.created_at
    `).run(userId, targetType, tid, until, now);
  }
  return { ok: true };
}

export function removeChatMute(userId, targetType, targetId) {
  if (targetType === "all" || targetId == null) {
    return db().prepare("DELETE FROM chat_mutes WHERE user_id = ? AND target_type = ? AND target_id IS NULL")
      .run(userId, targetType).changes;
  }
  return db().prepare("DELETE FROM chat_mutes WHERE user_id = ? AND target_type = ? AND target_id = ?")
    .run(userId, targetType, targetId).changes;
}

// Prüft, ob ein User für eine bestimmte Quelle stummgeschaltet hat. Räumt abgelaufene Mutes auf.
export function isChatMuted(userId, { fromUserId = null, roomId = null } = {}) {
  if (!userId) return false;
  const now = Date.now();
  // Aufräumen abgelaufener
  db().prepare("DELETE FROM chat_mutes WHERE user_id = ? AND until_at > 0 AND until_at <= ?").run(userId, now);
  // Globale Stille gilt für alles, EXCEPT der Sender wurde explizit "freigeschaltet" (nicht im Schema, also strikt)
  const allMute = db().prepare(`
    SELECT 1 FROM chat_mutes WHERE user_id = ? AND target_type = 'all'
       AND (until_at = 0 OR until_at > ?) LIMIT 1
  `).get(userId, now);
  if (allMute) return true;
  if (fromUserId) {
    const m = db().prepare(`
      SELECT 1 FROM chat_mutes WHERE user_id = ? AND target_type = 'user' AND target_id = ?
         AND (until_at = 0 OR until_at > ?) LIMIT 1
    `).get(userId, fromUserId, now);
    if (m) return true;
  }
  if (roomId) {
    const m = db().prepare(`
      SELECT 1 FROM chat_mutes WHERE user_id = ? AND target_type = 'room' AND target_id = ?
         AND (until_at = 0 OR until_at > ?) LIMIT 1
    `).get(userId, roomId, now);
    if (m) return true;
  }
  return false;
}

export function listChatMutes(userId) {
  const now = Date.now();
  db().prepare("DELETE FROM chat_mutes WHERE user_id = ? AND until_at > 0 AND until_at <= ?").run(userId, now);
  return db().prepare(`
    SELECT target_type AS targetType, target_id AS targetId, until_at AS untilAt, created_at AS createdAt
      FROM chat_mutes WHERE user_id = ?
     ORDER BY created_at DESC
  `).all(userId);
}

// ============================================================
// Sound-Pack / Presence-Status
// ============================================================
const VALID_SOUND_PACKS = new Set(["icq", "msn", "aim", "silent"]);
const VALID_PRESENCE = new Set(["online", "away", "busy", "invisible"]);

export function setSoundPack(userId, pack) {
  const p = VALID_SOUND_PACKS.has(pack) ? pack : "icq";
  db().prepare("UPDATE users SET sound_pack = ? WHERE id = ?").run(p, userId);
  return p;
}
export function getSoundPack(userId) {
  const r = db().prepare("SELECT sound_pack FROM users WHERE id = ?").get(userId);
  return r?.sound_pack || "icq";
}
export function setPresence(userId, presence) {
  const p = VALID_PRESENCE.has(presence) ? presence : "online";
  db().prepare("UPDATE users SET presence = ? WHERE id = ?").run(p, userId);
  return p;
}

// ============================================================
// Chat-Räume (Gruppenchats)
// ============================================================
const MAX_ROOM_MEMBERS = 25;

export function createChatRoom({ ownerId, name, emoji, memberIds = [] }) {
  const cleanName = String(name || "").trim().slice(0, 60);
  if (!cleanName) throw new Error("Name fehlt.");
  const e = String(emoji || "💬").slice(0, 4);
  const now = Date.now();
  const info = db().prepare(`
    INSERT INTO chat_rooms (name, emoji, owner_id, created_at) VALUES (?, ?, ?, ?)
  `).run(cleanName, e, ownerId, now);
  const roomId = info.lastInsertRowid;
  db().prepare(`
    INSERT INTO chat_room_members (room_id, user_id, role, joined_at, last_read_at) VALUES (?, ?, 'owner', ?, ?)
  `).run(roomId, ownerId, now, now);
  const seen = new Set([ownerId]);
  for (const m of memberIds) {
    const uid = Number(m);
    if (!uid || seen.has(uid)) continue;
    if (seen.size >= MAX_ROOM_MEMBERS) break;
    if (!db().prepare("SELECT 1 FROM users WHERE id = ? AND status = 'approved'").get(uid)) continue;
    try {
      db().prepare(`
        INSERT INTO chat_room_members (room_id, user_id, role, joined_at, last_read_at) VALUES (?, ?, 'member', ?, 0)
      `).run(roomId, uid, now);
      seen.add(uid);
    } catch {}
  }
  return getChatRoom(roomId);
}

export function getChatRoom(roomId) {
  const r = db().prepare(`
    SELECT id, name, emoji, owner_id AS ownerId, created_at AS at FROM chat_rooms WHERE id = ?
  `).get(roomId);
  if (!r) return null;
  r.members = getChatRoomMembers(roomId);
  return r;
}

export function getChatRoomMembers(roomId) {
  return db().prepare(`
    SELECT u.id, u.username, u.display_name AS displayName, u.emoji, u.avatar_url AS avatarUrl,
           u.avatar_status AS avatarStatus, u.last_seen AS lastSeen, u.gender, u.birthdate,
           m.role, m.joined_at AS joinedAt, m.last_read_at AS lastReadAt
      FROM chat_room_members m JOIN users u ON u.id = m.user_id
     WHERE m.room_id = ?
     ORDER BY m.joined_at ASC
  `).all(roomId).map((u) => ({
    id: u.id, username: u.username, displayName: u.displayName, emoji: u.emoji,
    avatarUrl: u.avatarStatus === "approved" ? (u.avatarUrl || "") : "",
    lastSeen: u.lastSeen, gender: u.gender === "m" || u.gender === "w" ? u.gender : "",
    age: ageFromBirthdate(u.birthdate), role: u.role, joinedAt: u.joinedAt, lastReadAt: u.lastReadAt,
  }));
}

export function listChatRoomMemberIds(roomId) {
  return db().prepare("SELECT user_id FROM chat_room_members WHERE room_id = ?").all(roomId).map((r) => r.user_id);
}

export function isRoomMember(roomId, userId) {
  return !!db().prepare("SELECT 1 FROM chat_room_members WHERE room_id = ? AND user_id = ?").get(roomId, userId);
}

export function isRoomOwner(roomId, userId) {
  const r = db().prepare("SELECT owner_id FROM chat_rooms WHERE id = ?").get(roomId);
  return r?.owner_id === userId;
}

export function addRoomMember(roomId, userId) {
  const memberCount = db().prepare("SELECT COUNT(*) AS c FROM chat_room_members WHERE room_id = ?").get(roomId)?.c || 0;
  if (memberCount >= MAX_ROOM_MEMBERS) throw new Error(`Gruppe ist voll (max ${MAX_ROOM_MEMBERS}).`);
  if (!db().prepare("SELECT 1 FROM users WHERE id = ? AND status = 'approved'").get(userId)) throw new Error("User unbekannt.");
  try {
    db().prepare(`
      INSERT INTO chat_room_members (room_id, user_id, role, joined_at, last_read_at) VALUES (?, ?, 'member', ?, 0)
    `).run(roomId, userId, Date.now());
  } catch {}
}

export function removeRoomMember(roomId, userId) {
  // Owner kann nicht entfernt werden – nur Raum löschen oder Übergabe
  const owner = isRoomOwner(roomId, userId);
  if (owner) return false;
  db().prepare("DELETE FROM chat_room_members WHERE room_id = ? AND user_id = ?").run(roomId, userId);
  return true;
}

export function deleteChatRoom(roomId) {
  db().prepare("DELETE FROM chat_rooms WHERE id = ?").run(roomId);
}

export function listMyChatRooms(userId) {
  return db().prepare(`
    SELECT r.id, r.name, r.emoji, r.owner_id AS ownerId, r.created_at AS createdAt,
           (SELECT COUNT(*) FROM chat_room_members WHERE room_id = r.id) AS memberCount,
           (SELECT created_at FROM chat_room_messages WHERE room_id = r.id ORDER BY created_at DESC LIMIT 1) AS lastAt,
           (SELECT
              CASE WHEN kind = 'voice' THEN '🎤 Sprachnachricht'
                   WHEN kind = 'nudge' THEN '👋 Hat angeklopft!'
                   WHEN text = '' AND image_url <> '' THEN '📷 Bild'
                   ELSE text END
              FROM chat_room_messages WHERE room_id = r.id ORDER BY created_at DESC LIMIT 1) AS lastText,
           (SELECT COUNT(*) FROM chat_room_messages mm
             WHERE mm.room_id = r.id AND mm.created_at > m.last_read_at AND mm.from_user_id != ?) AS unread,
           m.last_read_at AS lastReadAt
      FROM chat_room_members m JOIN chat_rooms r ON r.id = m.room_id
     WHERE m.user_id = ?
     ORDER BY COALESCE((SELECT created_at FROM chat_room_messages WHERE room_id = r.id ORDER BY created_at DESC LIMIT 1), r.created_at) DESC
  `).all(userId, userId);
}

export function getRoomMessages(roomId, limit = 200) {
  return db().prepare(`
    SELECT m.id, m.from_user_id AS fromUserId, m.text, m.image_url AS imageUrl,
           m.kind, m.audio_url AS audioUrl, m.created_at AS at,
           u.username, u.display_name AS displayName, u.emoji, u.avatar_url AS avatarUrl,
           u.avatar_status AS avatarStatus, u.gender, u.birthdate
      FROM chat_room_messages m JOIN users u ON u.id = m.from_user_id
     WHERE m.room_id = ?
     ORDER BY m.created_at ASC
     LIMIT ?
  `).all(roomId, limit).map((r) => ({
    id: r.id, fromUserId: r.fromUserId, text: r.text, imageUrl: r.imageUrl,
    kind: r.kind || "text", audioUrl: r.audioUrl, at: r.at,
    from: {
      username: r.username, displayName: r.displayName, emoji: r.emoji,
      avatarUrl: r.avatarStatus === "approved" ? (r.avatarUrl || "") : "",
      gender: r.gender === "m" || r.gender === "w" ? r.gender : "",
      age: ageFromBirthdate(r.birthdate),
    },
  }));
}

export function sendRoomMessage(roomId, fromUserId, text, opts = {}) {
  const at = Date.now();
  const kind = opts.kind || "text";
  const imageUrl = opts.imageUrl || "";
  const audioUrl = kind === "voice" ? (opts.audioUrl || null) : null;
  const info = db().prepare(`
    INSERT INTO chat_room_messages (room_id, from_user_id, text, image_url, kind, audio_url, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(roomId, fromUserId, text || "", imageUrl, kind, audioUrl, at);
  // Sender markiert für sich selbst als gelesen
  db().prepare("UPDATE chat_room_members SET last_read_at = ? WHERE room_id = ? AND user_id = ?")
    .run(at, roomId, fromUserId);
  const user = getUserById(fromUserId);
  return {
    id: info.lastInsertRowid, roomId, fromUserId, text: text || "", imageUrl, kind,
    at, from: {
      username: user?.username, displayName: user?.displayName, emoji: user?.emoji,
      avatarUrl: user?.avatarUrl || "", gender: user?.gender || "", age: user?.age || null,
    },
  };
}

export function markRoomRead(roomId, userId) {
  db().prepare("UPDATE chat_room_members SET last_read_at = ? WHERE room_id = ? AND user_id = ?")
    .run(Date.now(), roomId, userId);
}

// ============================================================
// Live-Calls (WebRTC) – nur Metadaten + Teilnehmerliste
// ============================================================
const MAX_CALL_PARTICIPANTS = 6;

function _userPublic(u) {
  if (!u) return null;
  return {
    id: u.id, username: u.username, displayName: u.displayName,
    avatarUrl: u.avatarUrl || "", emoji: u.emoji || "",
    gender: u.gender || "", age: u.age || null,
  };
}

export function createCall({ initiatorId, type, partnerId = null, roomId = null, withVideo = true }) {
  const at = Date.now();
  if (type !== "1on1" && type !== "group") throw new Error("invalid call type");
  if (type === "1on1" && !partnerId) throw new Error("partner required");
  if (type === "group" && !roomId) throw new Error("room required");
  const info = db().prepare(`
    INSERT INTO live_calls (type, initiator_id, partner_id, room_id, with_video, started_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(type, initiatorId, partnerId, roomId, withVideo ? 1 : 0, at);
  const callId = info.lastInsertRowid;
  db().prepare(`
    INSERT INTO live_call_participants (call_id, user_id, joined_at) VALUES (?, ?, ?)
  `).run(callId, initiatorId, at);
  return getCall(callId);
}

export function getCall(callId) {
  const r = db().prepare(`
    SELECT id, type, initiator_id AS initiatorId, partner_id AS partnerId,
           room_id AS roomId, with_video AS withVideo,
           started_at AS startedAt, ended_at AS endedAt
      FROM live_calls WHERE id = ?
  `).get(callId);
  if (!r) return null;
  r.withVideo = !!r.withVideo;
  r.participants = getCallParticipants(callId);
  return r;
}

export function getCallParticipants(callId) {
  return db().prepare(`
    SELECT u.id, u.username, u.display_name AS displayName, u.emoji,
           u.avatar_url AS avatarUrl, u.avatar_status AS avatarStatus,
           u.gender, u.birthdate, p.joined_at AS joinedAt, p.left_at AS leftAt
      FROM live_call_participants p JOIN users u ON u.id = p.user_id
     WHERE p.call_id = ? AND p.left_at IS NULL
     ORDER BY p.joined_at ASC
  `).all(callId).map((u) => ({
    id: u.id, username: u.username, displayName: u.displayName, emoji: u.emoji,
    avatarUrl: u.avatarStatus === "approved" ? (u.avatarUrl || "") : "",
    gender: u.gender === "m" || u.gender === "w" ? u.gender : "",
    age: ageFromBirthdate(u.birthdate),
    joinedAt: u.joinedAt,
  }));
}

export function listMyActiveCalls(userId) {
  return db().prepare(`
    SELECT c.id FROM live_calls c
      JOIN live_call_participants p ON p.call_id = c.id
     WHERE p.user_id = ? AND p.left_at IS NULL AND c.ended_at IS NULL
  `).all(userId).map((r) => getCall(r.id));
}

export function joinCall(callId, userId) {
  const call = getCall(callId);
  if (!call || call.endedAt) throw new Error("Call beendet.");
  // Berechtigung
  if (call.type === "1on1") {
    if (userId !== call.partnerId && userId !== call.initiatorId) throw new Error("Kein Zugriff.");
  } else if (call.type === "group") {
    if (!isRoomMember(call.roomId, userId)) throw new Error("Kein Gruppenmitglied.");
  }
  if (call.participants.length >= MAX_CALL_PARTICIPANTS) throw new Error("Anruf ist voll.");
  const at = Date.now();
  // Wenn schon mal drin und wieder verlassen, reaktivieren
  const ex = db().prepare("SELECT 1 FROM live_call_participants WHERE call_id = ? AND user_id = ?").get(callId, userId);
  if (ex) {
    db().prepare("UPDATE live_call_participants SET left_at = NULL, joined_at = ? WHERE call_id = ? AND user_id = ?")
      .run(at, callId, userId);
  } else {
    db().prepare("INSERT INTO live_call_participants (call_id, user_id, joined_at) VALUES (?, ?, ?)")
      .run(callId, userId, at);
  }
  return getCall(callId);
}

// Markiert User als verlassen. Wenn keiner mehr aktiv: Call beenden.
export function leaveCall(callId, userId) {
  const at = Date.now();
  db().prepare("UPDATE live_call_participants SET left_at = ? WHERE call_id = ? AND user_id = ? AND left_at IS NULL")
    .run(at, callId, userId);
  const remaining = db().prepare(
    "SELECT COUNT(*) AS c FROM live_call_participants WHERE call_id = ? AND left_at IS NULL"
  ).get(callId).c;
  if (remaining === 0) {
    db().prepare("UPDATE live_calls SET ended_at = ? WHERE id = ? AND ended_at IS NULL").run(at, callId);
    return { ended: true };
  }
  return { ended: false, remaining };
}

export function endCall(callId) {
  const at = Date.now();
  db().prepare("UPDATE live_calls SET ended_at = ? WHERE id = ? AND ended_at IS NULL").run(at, callId);
  db().prepare("UPDATE live_call_participants SET left_at = ? WHERE call_id = ? AND left_at IS NULL")
    .run(at, callId);
}

export function isCallParticipant(callId, userId) {
  return !!db().prepare(
    "SELECT 1 FROM live_call_participants WHERE call_id = ? AND user_id = ? AND left_at IS NULL"
  ).get(callId, userId);
}
