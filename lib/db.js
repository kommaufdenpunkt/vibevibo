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
  seedIfEmpty(_db);
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
  `);
}

function seedIfEmpty(d) {
  const count = d.prepare("SELECT COUNT(*) AS n FROM users").get().n;
  if (count > 0) return;
  const now = Date.now();
  const hash = bcrypt.hashSync("vibe123", 10);
  const insertUser = d.prepare(`
    INSERT INTO users (username, display_name, password_hash, emoji, mood, about_me, interests, bg_music, created_at, last_seen)
    VALUES (@username, @displayName, @hash, @emoji, @mood, @aboutMe, @interests, @bgMusic, @now, @now)
  `);
  const users = [
    {
      username: "anna_2003", displayName: "Anna* °·.¸", emoji: "🌸", mood: "verliebt 💘",
      aboutMe: "Hey du! Ich bin Anna, 19, aus Hamburg. Ich liebe Tokio Hotel, lange Strandspaziergänge & Erdbeermilch 🍓.",
      interests: ["Tokio Hotel", "Strandspaziergänge", "Eis essen"], bgMusic: "Tokio Hotel - Durch den Monsun",
    },
    {
      username: "kevin_skater", displayName: "Kev°§kater", emoji: "🛹", mood: "chillig",
      aboutMe: "Yo, ich bin Kev. Skaten, Punk Rock und Cola Mix - mehr brauch ich nich.",
      interests: ["Skaten", "Punk Rock", "Bier"], bgMusic: "Blink 182 - All The Small Things",
    },
    {
      username: "lisa_princess", displayName: "♛Lisa♛", emoji: "👑", mood: "happy :)",
      aboutMe: "Lisa, 17, aus Köln. Shoppen, Mädels, Tokio Hotel ♥. Pink ist mein Leben!",
      interests: ["Shoppen", "Pink", "Pferde"], bgMusic: "Avril Lavigne - Sk8er Boi",
    },
    {
      username: "max_zocker", displayName: "MaXxX_Zocker", emoji: "🎮", mood: "zocken",
      aboutMe: "Counter-Strike, WoW und alles mit Pixeln. PC > Konsole. Diskussion zwecklos. 1337",
      interests: ["Counter-Strike", "WoW", "LAN-Partys"], bgMusic: "Linkin Park - In The End",
    },
    {
      username: "julia_diva", displayName: "Juli ♥", emoji: "💅", mood: "diva mode",
      aboutMe: "Mode, Lipgloss, Boygroups. Mehr muss man nicht wissen :*",
      interests: ["Mode", "Boygroups", "Make-Up"], bgMusic: "Britney Spears - Toxic",
    },
    {
      username: "tom_dj", displayName: "DJ Tom", emoji: "🎧", mood: "Beats raushauen",
      aboutMe: "Dein DJ für jede Party. Anfragen per PN. House, Techno, 90er.",
      interests: ["Auflegen", "Plattenladen"], bgMusic: "Darude - Sandstorm",
    },
  ];
  const idMap = {};
  d.transaction(() => {
    for (const u of users) {
      const info = insertUser.run({
        username: u.username, displayName: u.displayName, hash,
        emoji: u.emoji, mood: u.mood, aboutMe: u.aboutMe,
        interests: JSON.stringify(u.interests), bgMusic: u.bgMusic, now,
      });
      idMap[u.username] = info.lastInsertRowid;
    }

    const insertPin = d.prepare("INSERT INTO pinnwand (target_user_id, from_user_id, text, created_at) VALUES (?, ?, ?, ?)");
    insertPin.run(idMap.anna_2003, idMap.kevin_skater, "Hdl du knuddelmaus 🥰", now - 86400000);
    insertPin.run(idMap.anna_2003, idMap.lisa_princess, "Ey, sehen wir uns morgen am Bahnhof?? :*", now - 28800000);
    insertPin.run(idMap.kevin_skater, idMap.anna_2003, "Schatzi <3", now - 93600000);

    const insertGift = d.prepare("INSERT INTO gifts (target_user_id, from_user_id, gift_id, created_at) VALUES (?, ?, ?, ?)");
    insertGift.run(idMap.anna_2003, idMap.kevin_skater, "rose", now - 172800000);
    insertGift.run(idMap.anna_2003, idMap.lisa_princess, "heart", now - 18000000);
    insertGift.run(idMap.anna_2003, idMap.julia_diva, "unicorn", now - 43200000);
    insertGift.run(idMap.kevin_skater, idMap.max_zocker, "beer", now - 10800000);
    insertGift.run(idMap.kevin_skater, idMap.anna_2003, "fire", now - 252000000);
    insertGift.run(idMap.lisa_princess, idMap.anna_2003, "diamond", now - 180000000);
    insertGift.run(idMap.max_zocker, idMap.tom_dj, "gameboy", now - 32400000);
    insertGift.run(idMap.julia_diva, idMap.lisa_princess, "ring", now - 288000000);

    const insertMsg = d.prepare("INSERT INTO messages (from_user_id, to_user_id, text, created_at) VALUES (?, ?, ?, ?)");
    insertMsg.run(idMap.anna_2003, idMap.kevin_skater, "Hey schatzi *knuddel*", now - 18000000);
    insertMsg.run(idMap.kevin_skater, idMap.anna_2003, "hi du <3 was machste?", now - 17640000);
    insertMsg.run(idMap.anna_2003, idMap.kevin_skater, "lag im bett und denk an dich :*", now - 17280000);
    insertMsg.run(idMap.kevin_skater, idMap.anna_2003, "süß. ich brenn dir gleich ne cd 😎", now - 16920000);
    insertMsg.run(idMap.lisa_princess, idMap.anna_2003, "ey morgen bahnhof 14 uhr?", now - 28800000);

    const insertGroup = d.prepare(`
      INSERT INTO groups (slug, name, description, emoji, owner_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertMember = d.prepare("INSERT INTO group_members (group_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)");
    const insertPost = d.prepare("INSERT INTO group_posts (group_id, user_id, text, created_at) VALUES (?, ?, ?, ?)");

    const g1 = insertGroup.run("tokio-hotel-fans", "Tokio Hotel Fans 4 Ever ♥", "Für alle die Bill & Tom lieben! 💕", "🎸", idMap.anna_2003, now - 100000000).lastInsertRowid;
    insertMember.run(g1, idMap.anna_2003, "owner", now - 100000000);
    insertMember.run(g1, idMap.lisa_princess, "member", now - 90000000);
    insertMember.run(g1, idMap.julia_diva, "member", now - 80000000);
    insertPost.run(g1, idMap.anna_2003, "Wer war auf dem letzten Konzert?! 😍😍😍", now - 50000000);
    insertPost.run(g1, idMap.lisa_princess, "ICH ICH ICH war so geil!!! 🎤", now - 49000000);

    const g2 = insertGroup.run("zocker-treff", "Zocker-Treff", "LAN-Partys, Tipps & Tricks rund ums Zocken.", "🎮", idMap.max_zocker, now - 80000000).lastInsertRowid;
    insertMember.run(g2, idMap.max_zocker, "owner", now - 80000000);
    insertMember.run(g2, idMap.tom_dj, "member", now - 70000000);
    insertMember.run(g2, idMap.kevin_skater, "member", now - 60000000);
    insertPost.run(g2, idMap.max_zocker, "LAN-Party bei mir, Samstag, bringt Mate mit!", now - 20000000);

    const g3 = insertGroup.run("club-rosa", "Club Rosa 💗", "Mädels-Talk, Mode, Liebeskummer.", "💗", idMap.julia_diva, now - 60000000).lastInsertRowid;
    insertMember.run(g3, idMap.julia_diva, "owner", now - 60000000);
    insertMember.run(g3, idMap.lisa_princess, "member", now - 50000000);
    insertMember.run(g3, idMap.anna_2003, "member", now - 40000000);
  })();
}

// ============================================================
// User-Helpers
// ============================================================
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
    customCss: u.custom_css,
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
  return db().prepare("SELECT * FROM users ORDER BY display_name COLLATE NOCASE").all().map(userRow);
}

export function touchUser(id) {
  db().prepare("UPDATE users SET last_seen = ? WHERE id = ?").run(Date.now(), id);
}

export function isOnline(lastSeen) {
  return Date.now() - (lastSeen || 0) < 5 * 60 * 1000;
}

// ============================================================
// Auth
// ============================================================
export function createUser({ username, displayName, password, emoji }) {
  const cleaned = String(username || "").trim().toLowerCase().replace(/[^a-z0-9_.]/g, "_");
  if (!cleaned) throw new Error("Ungültiger Benutzername.");
  if (cleaned.length < 3) throw new Error("Benutzername zu kurz (mind. 3 Zeichen).");
  if (!password || password.length < 4) throw new Error("Passwort zu kurz (mind. 4 Zeichen).");
  const existing = getUserByUsername(cleaned);
  if (existing) throw new Error("Username schon vergeben.");
  const hash = bcrypt.hashSync(password, 10);
  const now = Date.now();
  const info = db().prepare(`
    INSERT INTO users (username, display_name, password_hash, emoji, mood, about_me, interests, bg_music, created_at, last_seen)
    VALUES (?, ?, ?, ?, '', 'Heyhey, ich bin neu bei VibeVibo!', '[]', '', ?, ?)
  `).run(cleaned, displayName || cleaned, hash, emoji || "🙂", now, now);
  return getUserById(info.lastInsertRowid);
}

export function verifyPassword(username, password) {
  const row = db().prepare("SELECT * FROM users WHERE username = ?").get(String(username).toLowerCase());
  if (!row) return null;
  if (!bcrypt.compareSync(password, row.password_hash)) return null;
  return userRow(row);
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
    customCss: "custom_css",
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
export function getPinnwand(targetUserId) {
  return db().prepare(`
    SELECT p.id, p.text, p.created_at AS at,
           u.username AS from_username, u.display_name AS from_display_name, u.emoji AS from_emoji
      FROM pinnwand p
      JOIN users u ON u.id = p.from_user_id
     WHERE p.target_user_id = ?
     ORDER BY p.created_at DESC
  `).all(targetUserId);
}

export function addPinnwand(targetUserId, fromUserId, text) {
  const info = db().prepare(`
    INSERT INTO pinnwand (target_user_id, from_user_id, text, created_at) VALUES (?, ?, ?, ?)
  `).run(targetUserId, fromUserId, text, Date.now());
  return info.lastInsertRowid;
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
  return db().prepare(`
    SELECT id, from_user_id, to_user_id, text, created_at AS at
      FROM messages
     WHERE (from_user_id = ? AND to_user_id = ?)
        OR (from_user_id = ? AND to_user_id = ?)
     ORDER BY created_at ASC
  `).all(userIdA, userIdB, userIdB, userIdA);
}

export function getConversationsForUser(userId) {
  return db().prepare(`
    SELECT
      partner.id AS partner_id,
      partner.username AS partner_username,
      partner.display_name AS partner_display_name,
      partner.emoji AS partner_emoji,
      partner.last_seen AS partner_last_seen,
      m.text AS last_text,
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

export function sendMessage(fromUserId, toUserId, text) {
  const at = Date.now();
  const info = db().prepare(`
    INSERT INTO messages (from_user_id, to_user_id, text, created_at) VALUES (?, ?, ?, ?)
  `).run(fromUserId, toUserId, text, at);
  return { id: info.lastInsertRowid, fromUserId, toUserId, text, at };
}

export function getMessagesSince(userId, sinceId) {
  return db().prepare(`
    SELECT id, from_user_id, to_user_id, text, created_at AS at
      FROM messages
     WHERE id > ?
       AND (from_user_id = ? OR to_user_id = ?)
     ORDER BY id ASC
  `).all(sinceId, userId, userId);
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

export function listPhotos(userId, albumId) {
  if (albumId) {
    return db().prepare(`
      SELECT id, data_url, caption, created_at AS at FROM photos
      WHERE user_id = ? AND album_id = ? ORDER BY created_at DESC
    `).all(userId, albumId);
  }
  return db().prepare(`
    SELECT id, album_id, data_url, caption, created_at AS at FROM photos
    WHERE user_id = ? ORDER BY created_at DESC
  `).all(userId);
}

export function addPhoto(userId, albumId, dataUrl, caption) {
  const info = db().prepare(`
    INSERT INTO photos (user_id, album_id, data_url, caption, created_at) VALUES (?, ?, ?, ?, ?)
  `).run(userId, albumId || null, dataUrl, caption || "", Date.now());
  return info.lastInsertRowid;
}

export function deletePhoto(id, byUserId) {
  const row = db().prepare("SELECT user_id FROM photos WHERE id = ?").get(id);
  if (!row || row.user_id !== byUserId) return false;
  db().prepare("DELETE FROM photos WHERE id = ?").run(id);
  return true;
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
