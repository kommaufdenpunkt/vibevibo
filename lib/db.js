import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { checkNameAllowed } from "@/lib/fidolin";
import { rankFromXp, rankName, rankEmoji, rankColor, XP_REWARDS, XP_COOLDOWNS, XP_DAILY_CAPS } from "@/lib/rank";

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
    // 🏆 ACHIEVEMENTS_TABLES_V1
    CREATE TABLE IF NOT EXISTS user_achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      slug TEXT NOT NULL,
      earned_at INTEGER NOT NULL,
      claimed_at INTEGER DEFAULT 0,
      UNIQUE(user_id, slug)
    );
    CREATE INDEX IF NOT EXISTS idx_user_ach_user ON user_achievements(user_id, earned_at DESC);

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

    -- VibeVibo Realitätskarte: Items spawnen in der echten Welt
    CREATE TABLE IF NOT EXISTS items_world (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,            -- vibe_coin | apple | egg | card | crystal
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      spawned_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      picked_up_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      picked_up_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_items_world_active ON items_world(picked_up_by, expires_at);
    CREATE INDEX IF NOT EXISTS idx_items_world_geo ON items_world(lat, lng);

        CREATE TABLE IF NOT EXISTS changelog_reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_key TEXT NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      emoji TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE (entry_key, user_id, emoji)
    );
    CREATE INDEX IF NOT EXISTS idx_changelog_reactions_key ON changelog_reactions(entry_key);
    CREATE INDEX IF NOT EXISTS idx_changelog_reactions_user ON changelog_reactions(user_id);

    CREATE TABLE IF NOT EXISTS pwa_installs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      platform TEXT NOT NULL,
      user_agent TEXT,
      installed_at INTEGER NOT NULL,
      last_seen INTEGER NOT NULL,
      UNIQUE (user_id, platform)
    );
    CREATE INDEX IF NOT EXISTS idx_pwa_installs_user ON pwa_installs(user_id);

    CREATE TABLE IF NOT EXISTS user_inventory (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, kind)
    );

    CREATE TABLE IF NOT EXISTS user_location (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      lat REAL,
      lng REAL,
      accuracy_m INTEGER,
      updated_at INTEGER NOT NULL,
      last_pickup_at INTEGER DEFAULT 0,
      last_pickup_lat REAL,
      last_pickup_lng REAL,
      pickups_today INTEGER DEFAULT 0,
      pickups_day_key TEXT DEFAULT ''
    );

    -- Tagesquests: pro User + Tag werden 3 Quests gerollt (siehe lib/quests.js)
    CREATE TABLE IF NOT EXISTS quests_user (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      quest_id TEXT NOT NULL,
      progress INTEGER DEFAULT 0,
      target INTEGER NOT NULL,
      reward INTEGER NOT NULL,
      claimed INTEGER DEFAULT 0,
      UNIQUE(user_id, date, quest_id)
    );
    CREATE INDEX IF NOT EXISTS idx_quests_user_day ON quests_user(user_id, date);

    -- VIBO-Zuhause: platzierte Möbel pro User
    CREATE TABLE IF NOT EXISTS user_room (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      slot INTEGER NOT NULL,
      placed_at INTEGER NOT NULL,
      UNIQUE(user_id, slot)
    );
    CREATE INDEX IF NOT EXISTS idx_user_room ON user_room(user_id);

    -- VIBO-Achievements / Trophäen (einmal pro User + achievement_id)
    CREATE TABLE IF NOT EXISTS vibo_achievements (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      achievement_id TEXT NOT NULL,
      unlocked_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, achievement_id)
    );

    -- Wild-VIBO-Dex: auf der Realitätskarte eingefangene Spezies
    CREATE TABLE IF NOT EXISTS vibo_caught (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      species TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      first_at INTEGER NOT NULL,
      last_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, species)
    );

    -- Verkaufbare Fänge (Angeln) — einzeln mit Größe + Basiswert.
    CREATE TABLE IF NOT EXISTS sellables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      item_id TEXT NOT NULL,        -- fish-id
      label TEXT NOT NULL,
      emoji TEXT NOT NULL,
      category TEXT NOT NULL,       -- fish|treasure|junk|legendary
      size_cm INTEGER DEFAULT 0,
      base_value INTEGER NOT NULL,
      caught_at INTEGER NOT NULL,
      sold_at INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_sellables_user ON sellables(user_id, sold_at);

    -- Persönliche Angel-Rekorde (größter Fang je Fisch)
    CREATE TABLE IF NOT EXISTS fish_records (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      item_id TEXT NOT NULL,
      label TEXT NOT NULL,
      emoji TEXT NOT NULL,
      best_size_cm INTEGER NOT NULL,
      at INTEGER NOT NULL,
      PRIMARY KEY (user_id, item_id)
    );

    -- Tages-Verkaufs-Tracking (Anti-Inflation)
    CREATE TABLE IF NOT EXISTS sell_daily (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      day_key TEXT NOT NULL,
      vibes_earned INTEGER NOT NULL DEFAULT 0,
      sales_count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, day_key)
    );

    -- Wohnungs-Stage (1..4) pro User
    CREATE TABLE IF NOT EXISTS user_room_meta (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      level INTEGER NOT NULL DEFAULT 1,
      wallpaper TEXT DEFAULT 'classic',
      floor_style TEXT DEFAULT 'wood',
      created_at INTEGER NOT NULL
    );

    -- Sammelkarten — was hat der User
    CREATE TABLE IF NOT EXISTS user_cards (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      card_id TEXT NOT NULL,
      count INTEGER DEFAULT 0,
      first_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, card_id)
    );

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

    CREATE TABLE IF NOT EXISTS poi_uses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      poi_kind TEXT NOT NULL,
      poi_osm_id TEXT NOT NULL,
      used_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_poi_uses_user_kind ON poi_uses(user_id, poi_kind, used_at);

    -- Live-Streams: öffentliche Streams (Solo: 1 Host + N Viewers, Multi: bis 4 Hosts + N Viewers).
    CREATE TABLE IF NOT EXISTS live_streams (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title        TEXT NOT NULL,
      mode         TEXT NOT NULL DEFAULT 'solo',   -- 'solo' | 'multi'
      has_video    INTEGER NOT NULL DEFAULT 1,
      has_audio    INTEGER NOT NULL DEFAULT 1,
      max_hosts    INTEGER NOT NULL DEFAULT 1,
      status       TEXT NOT NULL DEFAULT 'live',   -- 'live' | 'ended'
      started_at   INTEGER NOT NULL,
      ended_at     INTEGER,
      viewer_peak  INTEGER NOT NULL DEFAULT 0,
      total_vibes  INTEGER NOT NULL DEFAULT 0      -- Summe aller Emote-Vibes
    );
    CREATE INDEX IF NOT EXISTS idx_live_streams_status ON live_streams(status, started_at);
    CREATE INDEX IF NOT EXISTS idx_live_streams_owner ON live_streams(owner_id);

    -- Hosts (Multi-Mode: bis zu max_hosts Hosts pro Stream, Solo = nur Owner)
    CREATE TABLE IF NOT EXISTS live_stream_hosts (
      stream_id  INTEGER NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role       TEXT NOT NULL DEFAULT 'cohost',  -- 'owner' | 'cohost'
      joined_at  INTEGER NOT NULL,
      left_at    INTEGER,
      PRIMARY KEY (stream_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_live_hosts_stream ON live_stream_hosts(stream_id, left_at);

    -- Aktive Zuschauer (Heartbeat-basiert, alle 30s erneuern)
    CREATE TABLE IF NOT EXISTS live_stream_viewers (
      stream_id   INTEGER NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      joined_at   INTEGER NOT NULL,
      last_seen   INTEGER NOT NULL,
      PRIMARY KEY (stream_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_live_viewers_stream ON live_stream_viewers(stream_id, last_seen);

    -- Chat im Stream
    CREATE TABLE IF NOT EXISTS live_stream_chat (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      stream_id   INTEGER NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      text        TEXT NOT NULL,
      created_at  INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_live_chat_stream ON live_stream_chat(stream_id, created_at);

    -- Live-Meldungen (Reports von Viewern, gehen ans Admin-Panel)
    CREATE TABLE IF NOT EXISTS live_reports (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      stream_id       INTEGER REFERENCES live_streams(id) ON DELETE SET NULL,
      target_user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reporter_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reason          TEXT NOT NULL,
      detail          TEXT DEFAULT '',
      kind            TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'nsfw' | 'chat'
      status          TEXT NOT NULL DEFAULT 'open',   -- 'open' | 'resolved' | 'dismissed'
      created_at      INTEGER NOT NULL,
      resolved_at     INTEGER,
      resolved_by     INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_live_reports_status ON live_reports(status, created_at DESC);

    -- Live-Strikes (3 Strikes → Live-Sperre)
    CREATE TABLE IF NOT EXISTS live_strikes (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reason       TEXT NOT NULL,
      kind         TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'nsfw' | 'report'
      stream_id    INTEGER,
      by_user_id   INTEGER,
      created_at   INTEGER NOT NULL,
      expires_at   INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_live_strikes_user ON live_strikes(user_id, expires_at);

    -- Live-Moderation: Mods (helfen dem Owner), Mutes (temp), Bans (raus + bleibt draußen).
    CREATE TABLE IF NOT EXISTS live_stream_mods (
      stream_id   INTEGER NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      by_user_id  INTEGER NOT NULL,
      at          INTEGER NOT NULL,
      PRIMARY KEY (stream_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS live_stream_mutes (
      stream_id   INTEGER NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      by_user_id  INTEGER NOT NULL,
      until_at    INTEGER NOT NULL,
      reason      TEXT DEFAULT '',
      PRIMARY KEY (stream_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS live_stream_bans (
      stream_id   INTEGER NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      by_user_id  INTEGER NOT NULL,
      at          INTEGER NOT NULL,
      reason      TEXT DEFAULT '',
      PRIMARY KEY (stream_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_live_mutes ON live_stream_mutes(stream_id);

    -- Cohost-Anfragen (Plätze-zu-Modus: Owner muss zulassen)
    CREATE TABLE IF NOT EXISTS live_stream_requests (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      stream_id    INTEGER NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
      user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status       TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
      requested_at INTEGER NOT NULL,
      decided_at   INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_live_req ON live_stream_requests(stream_id, status);
    CREATE UNIQUE INDEX IF NOT EXISTS uq_live_req_pending
      ON live_stream_requests(stream_id, user_id, status);

    -- Emotes (Vibes-Sink: jedes verschickte Emote zieht Vibes ab)
    CREATE TABLE IF NOT EXISTS live_stream_emotes (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      stream_id     INTEGER NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
      from_user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      emote_id      TEXT NOT NULL,
      vibes_cost    INTEGER NOT NULL,
      created_at    INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_live_emotes_stream ON live_stream_emotes(stream_id, created_at);

    -- Top-5-Freunde (MySpace „Top 8" Nostalgie). Bis zu 5 gepinnte Buddies.
    CREATE TABLE IF NOT EXISTS top_friends (
      user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      buddy_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      slot      INTEGER NOT NULL,
      pinned_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, slot)
    );
    CREATE INDEX IF NOT EXISTS idx_top_friends_user ON top_friends(user_id);

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
  // 🛡 PRIVACY_COLS_V1
  addColumnIfMissing(d, "users", "dm_policy", "TEXT DEFAULT 'open'");
  addColumnIfMissing(d, "users", "wall_policy", "TEXT DEFAULT 'open'");
  addColumnIfMissing(d, "users", "hide_visits", "INTEGER DEFAULT 0");
  addColumnIfMissing(d, "users", "shield_mode", "INTEGER DEFAULT 0");
  // 🛡 PRIVACY_COLS_V2
  // Ruhezeit fuer eingehende DMs (0-23 Stunde). NULL = keine Ruhezeit.
  // Beispiel: from=22, to=8 -> Ruhezeit 22-08 Uhr (ueber Mitternacht moeglich)
  addColumnIfMissing(d, "users", "quiet_from_hour", "INTEGER");
  addColumnIfMissing(d, "users", "quiet_to_hour", "INTEGER");
  // Fidolin prueft Erst-Nachrichten mit strengerem Schwellwert
  addColumnIfMissing(d, "users", "strict_first_msg", "INTEGER DEFAULT 0");
  addColumnIfMissing(d, "users", "birthdate", "TEXT DEFAULT ''");
  // Album-Fotos mit Moderation. Bestehende Fotos -> approved (waren schon sichtbar)
  addColumnIfMissing(d, "photos", "status", "TEXT DEFAULT 'approved'");
  addColumnIfMissing(d, "photos", "reason", "TEXT DEFAULT ''");
  // Status-Posts koennen ein Bild haben (nur approved Bilder werden gespeichert)
  addColumnIfMissing(d, "status_updates", "image_url", "TEXT DEFAULT ''");
  // Buschfunk-Boost: bis zu welchem Zeitpunkt steht dieser Post oben + glow?
  addColumnIfMissing(d, "status_updates", "boosted_until", "INTEGER DEFAULT 0");
  // Audio-Anhang (Sprachnachricht), nur freigegebene Audios werden gespeichert
  addColumnIfMissing(d, "status_updates", "audio_url", "TEXT DEFAULT ''");
  addColumnIfMissing(d, "pinnwand",       "audio_url", "TEXT DEFAULT ''");
  // Musik-Link (YouTube/Spotify) als Embed mit Autoplay
  // Format: { provider: 'youtube'|'spotify', id, title, originalUrl }
  addColumnIfMissing(d, "status_updates", "media_url", "TEXT DEFAULT ''");
  addColumnIfMissing(d, "pinnwand",       "media_url", "TEXT DEFAULT ''");
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
  addColumnIfMissing(d, "vibos", "last_birthday_at", "INTEGER DEFAULT 0");
  addColumnIfMissing(d, "vibos", "last_brief_at", "INTEGER DEFAULT 0");
  // Pokémon-Go-Style: Distanz zu Fuß bewegt seit Schlüpfen (in Metern)
  addColumnIfMissing(d, "vibos", "distance_walked_m", "INTEGER DEFAULT 0");
  // Paket „Lebendiges VIBO": Charakter-Eigenschaft + Krankheit
  addColumnIfMissing(d, "vibos", "trait", "TEXT DEFAULT ''");
  addColumnIfMissing(d, "vibos", "sick", "TEXT DEFAULT ''");
  addColumnIfMissing(d, "vibos", "sick_since", "INTEGER DEFAULT 0");
  addColumnIfMissing(d, "guestbook", "image_url", "TEXT DEFAULT ''");
  // Pending-Secret während des 2FA-Einrichtungsprozesses (vor erstem Verify).
  addColumnIfMissing(d, "users", "totp_pending", "TEXT DEFAULT ''");
  // Premium-Features (mit Vibes freigekauft)
  addColumnIfMissing(d, "users", "extra_pic_slots", "INTEGER DEFAULT 0");
  addColumnIfMissing(d, "users", "premium_badges", "TEXT DEFAULT ''"); // CSV: gold,diamond,rainbow,frame_neon,frame_gold,vanity,bio_xl,invisible, color_*, skin_*
  // 🏅 Rang-System: kumulierte XP. Rang wird daraus berechnet (siehe lib/rank.js).
  addColumnIfMissing(d, "users", "xp", "INTEGER DEFAULT 0");
  // 🎀 Eigener Lauftext (max 200) + Begrüßungs-HTML (max 5000) — wie bei Jappy/MySpace
  addColumnIfMissing(d, "users", "marquee_text", "TEXT DEFAULT ''");
  addColumnIfMissing(d, "users", "greeting_html", "TEXT DEFAULT ''");
  addColumnIfMissing(d, "users", "greeting_title", "TEXT DEFAULT ''");

  // 💑 Familienstand + Partner-Verlinkung (Konsens-basiert)
  // status: '' | single | taken | engaged | married | complicated | open
  addColumnIfMissing(d, "users", "relationship_status", "TEXT DEFAULT ''");
  // partner_user_id: vom User selbst gesetzt. Verlinkt wird nur wenn der andere
  // ebenfalls vergeben/verlobt/verheiratet ist (siehe partnerMutualLink).
  addColumnIfMissing(d, "users", "partner_user_id", "INTEGER DEFAULT 0");
  // 💕 Flirt-Modus (für Swipe/Match-Feature kommend) — wer das ausstellt,
  // taucht in Flirt-Vorschlägen nicht auf und kann nicht matchen.
  addColumnIfMissing(d, "users", "flirt_enabled", "INTEGER DEFAULT 1");
  // 📛 Generische Meldungen (Reports) für Buschfunk-Kommentare, Pinnwand, Gästebuch etc.
  d.exec(`
    CREATE TABLE IF NOT EXISTS generic_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_type TEXT NOT NULL,
      target_id INTEGER NOT NULL,
      reporter_user_id INTEGER NOT NULL,
      reason TEXT DEFAULT '',
      status TEXT DEFAULT 'open',
      created_at INTEGER NOT NULL,
      resolved_at INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_greports_target ON generic_reports (target_type, target_id);
    CREATE INDEX IF NOT EXISTS idx_greports_status ON generic_reports (status, created_at DESC);
  `);

  // 💬 Buschfunk-Kommentare (auf JEDES Event-Typ: status/pinnwand/gift/grouppost/newpic)
  // Mit Reply, Voice, Soft-Delete, Fidolin/Admin-Moderation.
  d.exec(`
    CREATE TABLE IF NOT EXISTS buschfunk_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      reply_to_id INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      deleted_at INTEGER DEFAULT 0,
      deleted_reason TEXT DEFAULT '',
      deleted_by INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_bcom_post ON buschfunk_comments (post_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_bcom_user ON buschfunk_comments (user_id, created_at DESC);
  `);
  // Generalisierung: target_type + audio_url für Voice-Comments
  addColumnIfMissing(d, "buschfunk_comments", "target_type", "TEXT DEFAULT 'status'");
  addColumnIfMissing(d, "buschfunk_comments", "audio_url", "TEXT DEFAULT ''");
  d.exec("CREATE INDEX IF NOT EXISTS idx_bcom_target ON buschfunk_comments (target_type, post_id, created_at);");

  // 💑 Partnerschafts-Anfragen (Pending/Accepted/Declined)
  d.exec(`
    CREATE TABLE IF NOT EXISTS partnership_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user_id INTEGER NOT NULL,
      to_user_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      kind TEXT DEFAULT 'taken',
      created_at INTEGER NOT NULL,
      decided_at INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_partnership_to ON partnership_requests (to_user_id, status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_partnership_from ON partnership_requests (from_user_id, status, created_at DESC);
  `);
  d.exec(`
    CREATE TABLE IF NOT EXISTS xp_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      source TEXT NOT NULL,
      amount INTEGER NOT NULL,
      at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_xp_user_at ON xp_log (user_id, at DESC);
    CREATE INDEX IF NOT EXISTS idx_xp_user_src ON xp_log (user_id, source, at DESC);
  `);
  addColumnIfMissing(d, "users", "last_username_change_at", "INTEGER DEFAULT 0");
  addColumnIfMissing(d, "users", "displayname_credits", "INTEGER DEFAULT 0"); // gespeicherte Anzeigenamen-Wechsel
  // Aktive Name-Color (eine der gekauften — z.B. 'pink','cyan','lila','rainbow','glitter','sparkle_fx')
  addColumnIfMissing(d, "users", "name_color", "TEXT DEFAULT ''");
  // Aktiver Profil-Skin (eine der gekauften — z.B. 'y2k','glitter','skater','anime','matrix','sailor')
  addColumnIfMissing(d, "users", "profile_skin", "TEXT DEFAULT ''");
  // Buschfunk-Boost-Guthaben (verbraucht beim Posten)
  addColumnIfMissing(d, "users", "buschfunk_boosts", "INTEGER DEFAULT 0");
  // Anti-Inflation: Boost-Verfall — Stock-Clock startet beim Kauf, neuer Kauf resettet sie.
  // Wenn Date.now() > buschfunk_boosts_expire_at, verfällt das Restguthaben.
  addColumnIfMissing(d, "users", "buschfunk_boosts_expire_at", "INTEGER DEFAULT 0");

  // ===== Werbung / AdSense / Rewarded =====
  // Consent-Status pro User: 0=unbestimmt, 1=ja personalisiert, 2=ja nicht-personalisiert, -1=nein
  addColumnIfMissing(d, "users", "ads_consent", "INTEGER DEFAULT 0");
  addColumnIfMissing(d, "users", "ads_consent_at", "INTEGER DEFAULT 0");
  // VIP-Status: VIP-User sehen keine Werbung, koennen aber auch nicht Rewarded-Ads abrufen.
  addColumnIfMissing(d, "users", "vip_until", "INTEGER DEFAULT 0");

  // Rewarded-Ad-Sessions: jede Ad-Anzeige bekommt einen Token,
  // der serverseitig validiert wird. Anti-Cheat + Audit.
  d.exec(`
    CREATE TABLE IF NOT EXISTS ad_impressions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      provider TEXT NOT NULL,
      slot TEXT NOT NULL,
      token TEXT NOT NULL,
      reward_amount INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending', -- pending|completed|invalid|expired
      started_at INTEGER NOT NULL,
      completed_at INTEGER,
      callback_payload TEXT,
      ip TEXT
    )
  `);
  d.exec("CREATE INDEX IF NOT EXISTS idx_ad_impressions_user ON ad_impressions(user_id, started_at DESC)");
  d.exec("CREATE INDEX IF NOT EXISTS idx_ad_impressions_token ON ad_impressions(token)");

  // Fidolin-Audit-Log: jedes als verdaechtig markierte Ereignis bekommt einen Eintrag.
  // kind: was wurde geprueft (ad_reward, profile_pic, status_post, ...)
  // severity: 1=Hinweis, 2=verdaechtig, 3=stark, 4=eindeutig Betrug
  d.exec(`
    CREATE TABLE IF NOT EXISTS fidolin_flags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      kind TEXT NOT NULL,
      severity INTEGER NOT NULL DEFAULT 1,
      reason TEXT NOT NULL DEFAULT '',
      ref_type TEXT,
      ref_id INTEGER,
      payload TEXT,
      at INTEGER NOT NULL,
      reviewed_at INTEGER,
      reviewed_by INTEGER,
      action TEXT
    )
  `);
  d.exec("CREATE INDEX IF NOT EXISTS idx_fidolin_user ON fidolin_flags(user_id, at DESC)");
  d.exec("CREATE INDEX IF NOT EXISTS idx_fidolin_kind ON fidolin_flags(kind, at DESC)");

  // Anti-Inflation: globaler Stock-Counter pro Item-Kind (für limited-stock Items)
  d.exec(`
    CREATE TABLE IF NOT EXISTS shop_stock (
      kind TEXT PRIMARY KEY,
      sold_count INTEGER NOT NULL DEFAULT 0
    )
  `);
  // Anti-Inflation: globale Sink-Statistik (Summe verbrannter Vibes durch Shop-Käufe)
  // Wird in spendCredits('premium:*') hochgezählt.
  d.exec(`
    CREATE TABLE IF NOT EXISTS shop_sink (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      total INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT 0
    )
  `);
  d.prepare("INSERT OR IGNORE INTO shop_sink (id, total, updated_at) VALUES (1, 0, ?)").run(Date.now());
  // VIBO-Basar: stabiler Anker-Punkt („Zuhause") für lokale Händler-Positionen.
  addColumnIfMissing(d, "user_location", "home_lat", "REAL");
  addColumnIfMissing(d, "user_location", "home_lng", "REAL");
  addColumnIfMissing(d, "user_location", "home_set_at", "INTEGER DEFAULT 0");
  // „Behalten"-Flag für Fänge (werden nicht im Verkauf gelistet, z.B. fürs Aquarium)
  addColumnIfMissing(d, "sellables", "kept", "INTEGER DEFAULT 0");
  // In-App-Einverständnis für Standort (zusätzlich zur Browser-Permission).
  addColumnIfMissing(d, "users", "location_consent", "INTEGER DEFAULT 0"); // 0=unbestimmt, 1=ja, -1=nein
  // ICQ-Nostalgie: „Online seit"-Ticker.
  addColumnIfMissing(d, "users", "online_since", "INTEGER DEFAULT 0");
  // Push-Präferenzen pro Typ als JSON {message,gift,live_started,nudge,call}
  addColumnIfMissing(d, "users", "push_prefs", "TEXT DEFAULT ''");
  // Live-Stream: Plätze-Policy ('open' = jeder rein bis voll, 'request' = Owner muss zulassen)
  addColumnIfMissing(d, "live_streams", "host_policy", "TEXT DEFAULT 'open'");
  // Live-Sperre: bis zu welchem Zeitpunkt darf User kein Live starten?
  addColumnIfMissing(d, "users", "live_blocked_until", "INTEGER DEFAULT 0");

  // 🏫 Schul-/Stadt-Verzeichnis: User koennen Schule/Uni + Stadt im Profil angeben,
  // andere koennen alle Mitglieder einer Schule/Stadt browsen (SchuelerVZ-Nostalgie).
  addColumnIfMissing(d, "users", "school", "TEXT DEFAULT ''");
  addColumnIfMissing(d, "users", "city", "TEXT DEFAULT ''");
  // 🎁 Komplimente: anonyme positive Spruchkarten — Vibes-Sink + flirten in sicher.
  // Anti-Spam via daily-cap im API-Handler.
  d.exec(`
    CREATE TABLE IF NOT EXISTS compliments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      from_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      anonymous INTEGER NOT NULL DEFAULT 1,
      text TEXT NOT NULL,
      emoji TEXT DEFAULT '💖',
      created_at INTEGER NOT NULL,
      seen_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_compliments_target ON compliments(target_user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_compliments_from ON compliments(from_user_id, created_at DESC);
  `);

  // 🎁 Profil-Geschenke (Jappy-Style): Spruchkarte + Pin-Feature + Vibes-Kosten.
  addColumnIfMissing(d, "gifts", "note", "TEXT DEFAULT ''");
  addColumnIfMissing(d, "gifts", "pinned", "INTEGER DEFAULT 0");
  addColumnIfMissing(d, "gifts", "vibes_cost", "INTEGER DEFAULT 0");
  // Sichtbarkeit (public|private) + Verpackung
  addColumnIfMissing(d, "gifts", "visibility", "TEXT DEFAULT 'public'");
  addColumnIfMissing(d, "gifts", "wrap", "TEXT DEFAULT ''");

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

  // User-Blocks (bidirektional ausgewertet), verknüpfte Social-Accounts, OAuth-States
  d.exec(`
    CREATE TABLE IF NOT EXISTS user_blocks (
      blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reason TEXT DEFAULT '',
      created_at INTEGER NOT NULL,
      PRIMARY KEY (blocker_id, blocked_id)
    );
    CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks (blocked_id);

    CREATE TABLE IF NOT EXISTS linked_accounts (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      provider_user_id TEXT NOT NULL DEFAULT '',
      display_name TEXT DEFAULT '',
      avatar_url TEXT DEFAULT '',
      access_token TEXT DEFAULT '',
      refresh_token TEXT DEFAULT '',
      expires_at INTEGER DEFAULT 0,
      scope TEXT DEFAULT '',
      raw_profile TEXT DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, provider)
    );
    CREATE INDEX IF NOT EXISTS idx_linked_provider ON linked_accounts (provider, provider_user_id);

    CREATE TABLE IF NOT EXISTS oauth_states (
      state TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      user_id INTEGER,
      next_url TEXT DEFAULT '/',
      created_at INTEGER NOT NULL
    );
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

// 💑 Familienstand setzen + optionalen Partner verlinken.
// Konsens-Logik:
//   - Setze meinen Status und ggf. partner_user_id zur ID des Partners.
//   - Partner-Link gilt aber NUR als "gegenseitig" wenn der Partner ebenfalls
//     einen entsprechenden Status hat UND auf mich zurück-verlinkt (oder
//     "single" — dann ist es einseitig + offen).
//   - Bei Status "single"/"" wird partner_user_id genullt.
export const RELATIONSHIP_STATUSES = new Set(["", "single", "taken", "engaged", "married", "complicated", "open"]);
const PARTNER_REQUIRED_STATUSES = new Set(["taken", "engaged", "married"]);

// Status setzen. Partner-Verlinkung läuft jetzt separat über Anfrage-Flow.
// Wechsel zu "single"/"" oder einem nicht-partner-fähigen Status hebt eine bestehende
// Partnerschaft automatisch beidseitig auf.
export function setRelationshipStatus(userId, status) {
  const cleaned = String(status || "").trim();
  if (!RELATIONSHIP_STATUSES.has(cleaned)) throw new Error("Ungültiger Familienstand.");
  const me = db().prepare("SELECT partner_user_id FROM users WHERE id = ?").get(userId);
  // Wenn Status nicht (mehr) partner-fähig: Partnerschaft auflösen
  if (!PARTNER_REQUIRED_STATUSES.has(cleaned)) {
    if (me?.partner_user_id) {
      const partnerId = me.partner_user_id;
      db().prepare("UPDATE users SET partner_user_id = 0 WHERE id = ?").run(userId);
      db().prepare("UPDATE users SET partner_user_id = 0 WHERE id = ? AND partner_user_id = ?").run(partnerId, userId);
    }
    db().prepare("UPDATE users SET relationship_status = ? WHERE id = ?").run(cleaned, userId);
  } else {
    db().prepare("UPDATE users SET relationship_status = ? WHERE id = ?").run(cleaned, userId);
  }
  return { status: cleaned, partnerUserId: me?.partner_user_id || 0 };
}

// Gibt {partner: userRow|null, mutual: boolean} zurück.
// mutual = beide haben sich gegenseitig als Partner eingetragen.
export function getPartnerInfo(userId) {
  const me = db().prepare("SELECT id, relationship_status, partner_user_id FROM users WHERE id = ?").get(userId);
  if (!me || !me.partner_user_id) return { partner: null, mutual: false };
  const p = db().prepare("SELECT * FROM users WHERE id = ?").get(me.partner_user_id);
  if (!p) return { partner: null, mutual: false };
  const mutual = p.partner_user_id === userId;
  return { partner: userRow(p), mutual };
}

export function setFlirtEnabled(userId, enabled) {
  db().prepare("UPDATE users SET flirt_enabled = ? WHERE id = ?").run(enabled ? 1 : 0, userId);
  return { enabled: !!enabled };
}

// 💑 Partnerschafts-Anfrage senden.
// Beide Seiten müssen vergeben/verlobt/verheiratet als Status haben.
// Wenn schon offen Anfrage existiert: kein Duplikat.
export function sendPartnershipRequest(fromUserId, targetUsername) {
  const me = db().prepare("SELECT id, relationship_status, partner_user_id FROM users WHERE id = ?").get(fromUserId);
  if (!me) throw new Error("Eingeloggter User nicht gefunden.");
  if (!PARTNER_REQUIRED_STATUSES.has(me.relationship_status || "")) {
    throw new Error("Du musst zuerst selbst vergeben/verlobt/verheiratet auswaehlen.");
  }
  const name = String(targetUsername || "").trim();
  if (!name) throw new Error("Bitte den Anzeigenamen oder @username des Partners eingeben.");
  const target = db().prepare(
    "SELECT id, relationship_status, partner_user_id, display_name, username FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(display_name) = LOWER(?)"
  ).get(name, name);
  if (!target) throw new Error(`„${name}" wurde nicht gefunden.`);
  if (target.id === fromUserId) throw new Error("Du kannst dich nicht mit dir selbst verlinken 😄");
  if (!PARTNER_REQUIRED_STATUSES.has(target.relationship_status || "")) {
    throw new Error(`${target.display_name} hat noch keinen passenden Status gesetzt. Bitte erst vergeben/verlobt/verheiratet eintragen lassen.`);
  }
  if (target.partner_user_id && target.partner_user_id !== fromUserId) {
    throw new Error(`${target.display_name} hat schon eine Partnerschaft eingetragen.`);
  }
  if (me.partner_user_id && me.partner_user_id !== target.id) {
    throw new Error("Du hast bereits eine Partnerschaft eingetragen. Bitte erst trennen.");
  }
  // Existiert schon eine pending-Anfrage?
  const existing = db().prepare(
    "SELECT id FROM partnership_requests WHERE from_user_id = ? AND to_user_id = ? AND status = 'pending'"
  ).get(fromUserId, target.id);
  if (existing) throw new Error(`Du hast schon eine offene Anfrage an ${target.display_name}.`);
  const now = Date.now();
  const info = db().prepare(
    "INSERT INTO partnership_requests (from_user_id, to_user_id, status, kind, created_at) VALUES (?, ?, 'pending', ?, ?)"
  ).run(fromUserId, target.id, me.relationship_status, now);
  return { ok: true, id: info.lastInsertRowid, targetUsername: target.username, targetDisplayName: target.display_name };
}

// Eingehende offene Partnerschafts-Anfragen.
export function listIncomingPartnershipRequests(userId) {
  return db().prepare(`
    SELECT pr.id, pr.from_user_id, pr.kind, pr.created_at AS at,
           u.username, u.display_name, u.avatar_url, u.avatar_status, u.gender, u.birthdate, u.relationship_status
      FROM partnership_requests pr
      JOIN users u ON u.id = pr.from_user_id
     WHERE pr.to_user_id = ? AND pr.status = 'pending'
     ORDER BY pr.created_at DESC
  `).all(userId).map((r) => ({
    id: r.id,
    kind: r.kind,
    at: r.at,
    from: {
      id: r.from_user_id,
      username: r.username,
      displayName: r.display_name,
      avatarUrl: r.avatar_status === "approved" ? (r.avatar_url || "") : "",
      gender: r.gender === "m" || r.gender === "w" ? r.gender : "",
      age: ageFromBirthdate(r.birthdate),
      relationshipStatus: r.relationship_status || "",
    },
  }));
}

// Ausgehende eigene Anfragen
export function listOutgoingPartnershipRequests(userId) {
  return db().prepare(`
    SELECT pr.id, pr.to_user_id, pr.kind, pr.status, pr.created_at AS at,
           u.username, u.display_name
      FROM partnership_requests pr
      JOIN users u ON u.id = pr.to_user_id
     WHERE pr.from_user_id = ? AND pr.status = 'pending'
     ORDER BY pr.created_at DESC
  `).all(userId);
}

// Antwort auf eine Anfrage (accept/decline). Nur Empfänger darf das.
export function respondPartnershipRequest(userId, requestId, accept) {
  const req = db().prepare(
    "SELECT id, from_user_id, to_user_id, status, kind FROM partnership_requests WHERE id = ?"
  ).get(requestId);
  if (!req) throw new Error("Anfrage nicht gefunden.");
  if (req.to_user_id !== userId) throw new Error("Diese Anfrage gehört nicht dir.");
  if (req.status !== "pending") throw new Error("Diese Anfrage wurde schon beantwortet.");
  const me = db().prepare("SELECT id, relationship_status, partner_user_id FROM users WHERE id = ?").get(userId);
  if (!me) throw new Error("Eingeloggter User nicht gefunden.");
  if (!PARTNER_REQUIRED_STATUSES.has(me.relationship_status || "")) {
    throw new Error("Du musst zuerst vergeben/verlobt/verheiratet eintragen, bevor du annehmen kannst.");
  }
  const now = Date.now();
  if (!accept) {
    db().prepare("UPDATE partnership_requests SET status = 'declined', decided_at = ? WHERE id = ?")
      .run(now, requestId);
    return { ok: true, accepted: false };
  }
  // Annahme: beidseitig partner_user_id setzen + alle anderen pending-Anfragen an mich ablehnen.
  if (me.partner_user_id && me.partner_user_id !== req.from_user_id) {
    throw new Error("Du hast bereits eine Partnerschaft. Bitte erst trennen.");
  }
  const partner = db().prepare("SELECT id, partner_user_id FROM users WHERE id = ?").get(req.from_user_id);
  if (!partner) throw new Error("Antragsteller nicht mehr verfügbar.");
  if (partner.partner_user_id && partner.partner_user_id !== userId) {
    throw new Error("Diese Person hat in der Zwischenzeit jemand anderen verlinkt.");
  }
  db().prepare("UPDATE users SET partner_user_id = ? WHERE id = ?").run(req.from_user_id, userId);
  db().prepare("UPDATE users SET partner_user_id = ? WHERE id = ?").run(userId, req.from_user_id);
  db().prepare("UPDATE partnership_requests SET status = 'accepted', decided_at = ? WHERE id = ?")
    .run(now, requestId);
  // Alle anderen pending-Anfragen an mich ablehnen
  db().prepare("UPDATE partnership_requests SET status = 'declined', decided_at = ? WHERE to_user_id = ? AND status = 'pending' AND id != ?")
    .run(now, userId, requestId);
  return { ok: true, accepted: true, partnerUserId: req.from_user_id };
}

// Bestehende Partnerschaft auflösen (beidseitig).
export function unlinkPartnership(userId) {
  const me = db().prepare("SELECT partner_user_id FROM users WHERE id = ?").get(userId);
  if (!me?.partner_user_id) return { ok: true, hadPartner: false };
  const partnerId = me.partner_user_id;
  db().prepare("UPDATE users SET partner_user_id = 0 WHERE id = ?").run(userId);
  db().prepare("UPDATE users SET partner_user_id = 0 WHERE id = ? AND partner_user_id = ?").run(partnerId, userId);
  return { ok: true, hadPartner: true };
}

// Anfrage zurückziehen (vom Sender).
export function cancelPartnershipRequest(userId, requestId) {
  const req = db().prepare(
    "SELECT id, from_user_id, status FROM partnership_requests WHERE id = ?"
  ).get(requestId);
  if (!req) throw new Error("Anfrage nicht gefunden.");
  if (req.from_user_id !== userId) throw new Error("Du kannst nur eigene Anfragen zurückziehen.");
  if (req.status !== "pending") throw new Error("Anfrage ist schon entschieden.");
  db().prepare("UPDATE partnership_requests SET status = 'cancelled', decided_at = ? WHERE id = ?")
    .run(Date.now(), requestId);
  return { ok: true };
}

// 🏅 XP gutschreiben — Cooldown + Tages-Cap werden beachtet.
// Gibt das neue XP-Total zurück (oder null wenn blockiert).
export function bumpXP(userId, source, customAmount = null) {
  if (!userId) return null;
  const amount = customAmount != null ? Number(customAmount) : Number(XP_REWARDS[source] || 0);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  // Cooldown-Check
  const cooldownSec = XP_COOLDOWNS[source];
  if (cooldownSec) {
    const since = Date.now() - cooldownSec * 1000;
    const r = db().prepare(
      "SELECT at FROM xp_log WHERE user_id = ? AND source = ? ORDER BY at DESC LIMIT 1"
    ).get(userId, source);
    if (r && r.at > since) return null;
  }

  // Tages-Cap-Check (verhindert Farming)
  const dailyCap = XP_DAILY_CAPS[source];
  if (dailyCap) {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const sumToday = db().prepare(
      "SELECT COALESCE(SUM(amount), 0) AS s FROM xp_log WHERE user_id = ? AND source = ? AND at >= ?"
    ).get(userId, source, startOfDay.getTime())?.s || 0;
    if (sumToday >= dailyCap) return null; // Cap erreicht
    // Falls die Aktion noch teilweise passt, auf Cap clampen
    const remaining = dailyCap - sumToday;
    if (remaining < amount) {
      const clamped = remaining;
      const now = Date.now();
      db().prepare("INSERT INTO xp_log (user_id, source, amount, at) VALUES (?, ?, ?, ?)")
        .run(userId, source, clamped, now);
      db().prepare("UPDATE users SET xp = COALESCE(xp,0) + ? WHERE id = ?").run(clamped, userId);
      const row = db().prepare("SELECT xp FROM users WHERE id = ?").get(userId);
      return { xp: row?.xp || 0, rank: rankFromXp(row?.xp || 0), gained: clamped, capped: true };
    }
  }

  const now = Date.now();
  db().prepare("INSERT INTO xp_log (user_id, source, amount, at) VALUES (?, ?, ?, ?)")
    .run(userId, source, amount, now);
  db().prepare("UPDATE users SET xp = COALESCE(xp,0) + ? WHERE id = ?").run(amount, userId);
  const row = db().prepare("SELECT xp FROM users WHERE id = ?").get(userId);
  return { xp: row?.xp || 0, rank: rankFromXp(row?.xp || 0), gained: amount };
}

export function getXpLog(userId, limit = 50, offset = 0) {
  return db().prepare(
    "SELECT id, source, amount, at FROM xp_log WHERE user_id = ? ORDER BY at DESC LIMIT ? OFFSET ?"
  ).all(userId, limit, offset);
}

// XP-Summen pro Quelle (für /rang-Statistik)
export function getXpSourceStats(userId) {
  return db().prepare(
    "SELECT source, SUM(amount) AS total, COUNT(*) AS n FROM xp_log WHERE user_id = ? GROUP BY source ORDER BY total DESC"
  ).all(userId);
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
    // Premium-Features (sichtbar)
    premiumBadges: u.premium_badges ? String(u.premium_badges).split(",").filter(Boolean) : [],
    // Aktiver Look (von ColoredName + ProfileView gelesen)
    nameColor: u.name_color || "",
    profileSkin: u.profile_skin || "",
    buschfunkBoosts: u.buschfunk_boosts || 0,
    // Werbung / VIP — fuer Frontend (ob Ads angezeigt werden, ob Reward-Buttons sichtbar)
    adsConsent: u.ads_consent || 0,
    vip: (u.vip_until || 0) > Date.now(),
    vipUntil: u.vip_until || 0,
    createdAt: u.created_at,
    lastSeen: u.last_seen,
    onlineSince: u.online_since || 0,
    school: u.school || "",
    city: u.city || "",
    // 🏅 Rang
    xp: u.xp || 0,
    rank: rankFromXp(u.xp || 0),
    rankName: rankName(rankFromXp(u.xp || 0)),
    rankEmoji: rankEmoji(rankFromXp(u.xp || 0)),
    rankColor: rankColor(rankFromXp(u.xp || 0)),
    // 💑 Familienstand + Flirt-Modus
    relationshipStatus: u.relationship_status || "",
    partnerUserId: u.partner_user_id || 0,
    flirtEnabled: u.flirt_enabled == null ? true : !!u.flirt_enabled,
    // 🎀 Eigener Marquee + Begrüßungs-HTML
    marqueeText: u.marquee_text || "",
    greetingHtml: u.greeting_html || "",
    greetingTitle: u.greeting_title || "",
  };
}

// Schneller Lookup: nur Username, ohne userRow-Overhead
export function getUsernameById(id) {
  if (!id) return null;
  const row = db().prepare("SELECT username FROM users WHERE id = ?").get(id);
  return row?.username || null;
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
  const now = Date.now();
  // „Online seit"-Ticker: war User > 5 Min weg, neuer Session-Start.
  const row = db().prepare("SELECT last_seen AS lastSeen, online_since AS onlineSince FROM users WHERE id = ?").get(id);
  const SESSION_GAP_MS = 5 * 60 * 1000;
  const wasOffline = !row?.lastSeen || (now - row.lastSeen) > SESSION_GAP_MS;
  if (wasOffline || !row?.onlineSince) {
    db().prepare("UPDATE users SET last_seen = ?, online_since = ? WHERE id = ?").run(now, now, id);
  } else {
    db().prepare("UPDATE users SET last_seen = ? WHERE id = ?").run(now, id);
  }
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

// ---- Namens-Regeln (zentral) ----
// Username: 3-17 Zeichen, klein, nur a-z 0-9 _ - (keine Leerzeichen)
export function validateUsername(name) {
  const v = String(name || "").trim().toLowerCase();
  if (!/^[a-z0-9_-]{3,17}$/.test(v)) {
    throw new Error("Username: 3-17 Zeichen, nur a-z, 0-9, _ oder - (keine Leerzeichen).");
  }
  const clean = checkNameAllowed(v);
  if (!clean.ok) throw new Error(clean.reason);
  return v;
}
// Anzeigename: 1-17 Zeichen, keine Leerzeichen, nur Buchstaben/Zahlen/_/-
export function validateDisplayName(name) {
  const v = String(name || "").trim();
  if (v.length < 1 || v.length > 17) throw new Error("Anzeigename: 1-17 Zeichen.");
  if (/\s/.test(v)) throw new Error("Anzeigename: keine Leerzeichen erlaubt (nutze _ oder -).");
  if (!/^[\p{L}\p{N}_-]+$/u.test(v)) throw new Error("Anzeigename: nur Buchstaben, Zahlen, _ oder -.");
  const clean = checkNameAllowed(v);
  if (!clean.ok) throw new Error(clean.reason);
  return v;
}

// Protokolliert eine Namensänderung in der Userakte (mod_log) — mit Datum/Uhrzeit
export function recordNameChange(userId, field, oldVal, newVal, by = "user") {
  const label = field === "username" ? "@username" : "Anzeigename";
  logMod({
    userId,
    kind: "namechange",
    content: `${oldVal || "—"} → ${newVal}`,
    decision: field,
    reason: `${label} geändert (${by})`,
    by,
  });
}

export function createUser({ username, displayName, password, emoji, regIp, gender, birthdate }) {
  const cleaned = validateUsername(username);
  validatePasswordStrength(password);
  const g = gender === "m" || gender === "w" ? gender : "";
  if (!g) throw new Error("Bitte Geschlecht angeben (m oder w).");
  const age = ageFromBirthdate(birthdate);
  if (age == null) throw new Error("Bitte ein gültiges Geburtsdatum angeben.");
  if (age < 18) throw new Error("VibeVibo ist ab 18 – du musst mindestens 18 Jahre alt sein.");
  const existing = getUserByUsername(cleaned);
  if (existing) throw new Error("Username schon vergeben.");
  // Anzeigename validieren (Default = Username, falls leer)
  const dn = validateDisplayName((displayName || "").trim() || cleaned);
  const hash = bcrypt.hashSync(password, 12);
  const now = Date.now();
  // Neue User landen auf der Warteliste (pending)
  const info = db().prepare(`
    INSERT INTO users (username, display_name, password_hash, emoji, mood, about_me, interests, bg_music, created_at, last_seen, status, reg_ip, gender, birthdate)
    VALUES (?, ?, ?, ?, '', 'Heyhey, ich bin neu bei VibeVibo!', '[]', '', ?, ?, 'pending', ?, ?, ?)
  `).run(cleaned, dn, hash, emoji || "🙂", now, now, regIp || "", g, String(birthdate));
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

// ===== User-zu-User-Blocks (bidirektional wirksam) =====
export function addUserBlock(blockerId, blockedId, reason = "") {
  if (!blockerId || !blockedId || blockerId === blockedId) return false;
  db().prepare(
    "INSERT OR REPLACE INTO user_blocks (blocker_id, blocked_id, reason, created_at) VALUES (?, ?, ?, ?)"
  ).run(blockerId, blockedId, String(reason || "").slice(0, 200), Date.now());
  return true;
}

export function removeUserBlock(blockerId, blockedId) {
  if (!blockerId || !blockedId) return;
  db().prepare("DELETE FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?").run(blockerId, blockedId);
}

export function hasUserBlocked(blockerId, blockedId) {
  if (!blockerId || !blockedId) return false;
  return !!db().prepare(
    "SELECT 1 FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?"
  ).get(blockerId, blockedId);
}

// Sperre in EINE der beiden Richtungen vorhanden?
export function isBlockedBetween(aId, bId) {
  if (!aId || !bId) return false;
  return !!db().prepare(
    "SELECT 1 FROM user_blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?) LIMIT 1"
  ).get(aId, bId, bId, aId);
}

// Set aller User-IDs, die fuer mich verborgen sind (ich blockiert sie ODER sie mich).
export function blockedUserIdsFor(userId) {
  if (!userId) return new Set();
  const rows = db().prepare(
    "SELECT blocked_id AS id FROM user_blocks WHERE blocker_id = ? " +
    "UNION SELECT blocker_id AS id FROM user_blocks WHERE blocked_id = ?"
  ).all(userId, userId);
  return new Set(rows.map((r) => r.id));
}

export function listMyBlocks(userId) {
  if (!userId) return [];
  return db().prepare(`
    SELECT u.id, u.username, u.display_name AS displayName, u.emoji,
           b.reason, b.created_at AS blockedAt
      FROM user_blocks b JOIN users u ON u.id = b.blocked_id
     WHERE b.blocker_id = ?
     ORDER BY b.created_at DESC
  `).all(userId);
}

// ===== Token-Verschluesselung (AES-256-GCM, Schluessel aus VV_TOKEN_KEY) =====
function tokenKey() {
  const raw = process.env.VV_TOKEN_KEY || "vibevibo-dev-token-key";
  return crypto.createHash("sha256").update(String(raw)).digest(); // 32 Byte
}

export function encryptToken(plain) {
  if (plain == null || plain === "") return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", tokenKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64url"), tag.toString("base64url"), enc.toString("base64url")].join(".");
}

export function decryptToken(token) {
  if (!token) return null;
  try {
    const [ivB, tagB, dataB] = String(token).split(".");
    if (!ivB || !tagB || !dataB) return null;
    const decipher = crypto.createDecipheriv("aes-256-gcm", tokenKey(), Buffer.from(ivB, "base64url"));
    decipher.setAuthTag(Buffer.from(tagB, "base64url"));
    const dec = Buffer.concat([decipher.update(Buffer.from(dataB, "base64url")), decipher.final()]);
    return dec.toString("utf8");
  } catch {
    return null;
  }
}

// ===== OAuth-State (CSRF-Schutz + Kontext durch den Redirect tragen) =====
export function createOAuthState(provider, userId, nextUrl) {
  const state = randomToken();
  // alte States aufraeumen (aelter als 1 Std)
  db().prepare("DELETE FROM oauth_states WHERE created_at < ?").run(Date.now() - 60 * 60 * 1000);
  db().prepare(
    "INSERT INTO oauth_states (state, provider, user_id, next_url, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(state, String(provider), userId || null, nextUrl || "/", Date.now());
  return state;
}

// Einmalig: liefert {provider, user_id, next_url} und loescht den State. null wenn ungueltig/abgelaufen.
export function consumeOAuthState(state) {
  if (!state) return null;
  const row = db().prepare(
    "SELECT state, provider, user_id, next_url, created_at FROM oauth_states WHERE state = ?"
  ).get(state);
  if (!row) return null;
  db().prepare("DELETE FROM oauth_states WHERE state = ?").run(state);
  if (Date.now() - row.created_at > 15 * 60 * 1000) return null; // 15 Min gueltig
  return { provider: row.provider, user_id: row.user_id, next_url: row.next_url };
}

// ===== Verknuepfte Social-Accounts =====
export function upsertLinkedAccount(userId, provider, data = {}) {
  if (!userId || !provider) return;
  const now = Date.now();
  db().prepare(`
    INSERT INTO linked_accounts
      (user_id, provider, provider_user_id, display_name, avatar_url,
       access_token, refresh_token, expires_at, scope, raw_profile, created_at, updated_at)
    VALUES (@user_id, @provider, @provider_user_id, @display_name, @avatar_url,
            @access_token, @refresh_token, @expires_at, @scope, @raw_profile, @now, @now)
    ON CONFLICT(user_id, provider) DO UPDATE SET
      provider_user_id = excluded.provider_user_id,
      display_name     = excluded.display_name,
      avatar_url       = excluded.avatar_url,
      access_token     = excluded.access_token,
      refresh_token    = excluded.refresh_token,
      expires_at       = excluded.expires_at,
      scope            = excluded.scope,
      raw_profile      = excluded.raw_profile,
      updated_at       = excluded.updated_at
  `).run({
    user_id: userId,
    provider: String(provider),
    provider_user_id: String(data.providerUserId || ""),
    display_name: data.displayName || "",
    avatar_url: data.avatarUrl || "",
    access_token: data.accessToken ? encryptToken(data.accessToken) : "",
    refresh_token: data.refreshToken ? encryptToken(data.refreshToken) : "",
    expires_at: data.expiresAt || 0,
    scope: data.scope || "",
    raw_profile: data.rawProfile ? JSON.stringify(data.rawProfile) : "",
    now,
  });
}

// User-ID zum verknuepften Provider-Account (oder null).
export function findUserByLinkedAccount(provider, providerUserId) {
  if (!provider || !providerUserId) return null;
  const row = db().prepare(
    "SELECT user_id FROM linked_accounts WHERE provider = ? AND provider_user_id = ? ORDER BY updated_at DESC LIMIT 1"
  ).get(String(provider), String(providerUserId));
  return row ? row.user_id : null;
}

// Verknuepfte Accounts eines Users – OHNE Tokens (nicht an den Client geben).
export function listLinkedAccounts(userId) {
  if (!userId) return [];
  return db().prepare(`
    SELECT provider, provider_user_id AS providerUserId, display_name AS displayName,
           avatar_url AS avatarUrl, created_at AS linkedAt, updated_at AS updatedAt
      FROM linked_accounts WHERE user_id = ? ORDER BY created_at ASC
  `).all(userId);
}

export function unlinkAccount(userId, provider) {
  if (!userId || !provider) return;
  db().prepare("DELETE FROM linked_accounts WHERE user_id = ? AND provider = ?").run(userId, String(provider));
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
  const now = Date.now();
  const onlineCutoff = now - 5 * 60_000;          // ~5 Min Aktivität = online
  const day = now - 24 * 3600_000;
  const week = now - 7 * 24 * 3600_000;
  return {
    // Moderation / Sicherheit
    pending: d.prepare("SELECT COUNT(*) AS n FROM users WHERE status = 'pending'").get().n,
    approved: d.prepare("SELECT COUNT(*) AS n FROM users WHERE status = 'approved'").get().n,
    blocked: d.prepare("SELECT COUNT(*) AS n FROM users WHERE status = 'blocked'").get().n,
    blockedIps: d.prepare("SELECT COUNT(*) AS n FROM blocked_ips").get().n,
    sanctions: d.prepare("SELECT COUNT(*) AS n FROM sanctions WHERE active = 1").get().n,
    deviceBans: d.prepare("SELECT COUNT(*) AS n FROM device_bans").get().n,
    pendingAvatars: d.prepare("SELECT COUNT(*) AS n FROM profile_pics WHERE status = 'pending'").get().n,
    pendingPhotos: d.prepare("SELECT COUNT(*) AS n FROM photos WHERE status = 'pending'").get().n,
    openReports: d.prepare("SELECT COUNT(*) AS n FROM message_reports WHERE status='open'").get().n,
    // Aktivität
    onlineNow: d.prepare("SELECT COUNT(*) AS n FROM users WHERE last_seen >= ? AND status='approved'").get(onlineCutoff).n,
    activeToday: d.prepare("SELECT COUNT(*) AS n FROM users WHERE last_seen >= ? AND status='approved'").get(day).n,
    newUsersToday: d.prepare("SELECT COUNT(*) AS n FROM users WHERE created_at >= ?").get(day).n,
    newUsersWeek: d.prepare("SELECT COUNT(*) AS n FROM users WHERE created_at >= ?").get(week).n,
    // Inhalte
    msgsToday: d.prepare("SELECT COUNT(*) AS n FROM messages WHERE created_at >= ?").get(day).n,
    pinnwandToday: d.prepare("SELECT COUNT(*) AS n FROM pinnwand WHERE created_at >= ?").get(day).n,
    giftsToday: d.prepare("SELECT COUNT(*) AS n FROM gifts WHERE created_at >= ?").get(day).n,
    photosToday: d.prepare("SELECT COUNT(*) AS n FROM photos WHERE created_at >= ?").get(day).n,
    // Vibes
    vibesEarnedToday: d.prepare("SELECT COALESCE(SUM(amount),0) AS n FROM credit_tx WHERE at >= ? AND amount > 0").get(day).n,
    vibesSpentToday: d.prepare("SELECT COALESCE(-SUM(amount),0) AS n FROM credit_tx WHERE at >= ? AND amount < 0").get(day).n,
    // VIBO-Welt
    activeVibos: d.prepare("SELECT COUNT(*) AS n FROM vibos WHERE died_at IS NULL").get().n,
    deadVibos: d.prepare("SELECT COUNT(*) AS n FROM vibo_cemetery").get().n,
    cardsCollected: d.prepare("SELECT COUNT(*) AS n FROM user_cards").get().n,
    worldPickupsToday: d.prepare("SELECT COUNT(*) AS n FROM items_world WHERE picked_up_at >= ?").get(day).n,
    pushSubs: d.prepare("SELECT COUNT(*) AS n FROM push_subscriptions").get().n,
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
const VIBO_EGG_HATCH_HOURS = 0;   // 0 = sofort aktiv, kein Warten
const VIBO_ACTION_COOLDOWNS = (typeof globalThis.__viboCooldowns === "undefined")
  ? (globalThis.__viboCooldowns = new Map())
  : globalThis.__viboCooldowns;

function viboClamp(n) { return Math.max(0, Math.min(100, Math.round(n))); }

// Verbleibende Cooldown-Sekunden pro Action für die UI
export function getViboCooldowns(userId) {
  const now = Date.now();
  const out = {};
  for (const action of Object.keys(VIBO_ACTIONS)) {
    const last = VIBO_ACTION_COOLDOWNS.get(`${userId}:${action}`) || 0;
    const left = (VIBO_ACTIONS[action].cooldownMs || 0) - (now - last);
    out[action] = left > 0 ? Math.ceil(left / 1000) : 0;
  }
  return out;
}

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

// Nachbarn-Modus: jemandes VIBO knuddeln. +5 Affection bei deren VIBO,
// +1 Vibe bei mir. Anti-Spam: 1× pro Person/Tag.
const NEIGHBOR_KNUDDEL_COOLDOWN = (typeof globalThis.__viboNeighborCD === "undefined")
  ? (globalThis.__viboNeighborCD = new Map())
  : globalThis.__viboNeighborCD;

// ============================================================
// Realitätskarte: Items in der Welt, User-Standort, Inventar
// ============================================================
export function updateUserLocation(userId, lat, lng, accuracyM) {
  if (!userId || typeof lat !== "number" || typeof lng !== "number") return { walked: 0 };
  const now = Date.now();
  const prev = db().prepare("SELECT lat, lng, updated_at FROM user_location WHERE user_id = ?").get(userId);

  // Distanz-Akkumulation (Pokémon-Go-Style)
  let stepM = 0;
  if (prev && typeof prev.lat === "number" && typeof prev.lng === "number") {
    const d = walkingDistanceMeters(prev.lat, prev.lng, lat, lng);
    const dtSec = Math.max(1, (now - prev.updated_at) / 1000);
    const speedMps = d / dtSec;
    // Anti-Cheat: nur Schritte zählen die plausibel sind
    // - max 55 m/s (~200 km/h)
    // - min 3m (Filter gegen GPS-Drift im Stehen)
    // - max 5000m am Stück (Teleport-Filter)
    if (d >= 3 && d <= 5000 && speedMps <= 55) {
      stepM = Math.round(d);
    }
  }

  if (prev) {
    db().prepare(`
      UPDATE user_location SET lat = ?, lng = ?, accuracy_m = ?, updated_at = ?
       WHERE user_id = ?
    `).run(lat, lng, Math.round(accuracyM || 0), now, userId);
  } else {
    db().prepare(`
      INSERT INTO user_location (user_id, lat, lng, accuracy_m, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, lat, lng, Math.round(accuracyM || 0), now);
  }

  // Distanz dem aktiven VIBO gutschreiben (für Ei-Schlüpfen)
  if (stepM > 0) {
    db().prepare(`
      UPDATE vibos SET distance_walked_m = COALESCE(distance_walked_m, 0) + ?
       WHERE user_id = ? AND died_at IS NULL
    `).run(stepM, userId);
  }

  return { walked: stepM };
}

// Haversine ohne /lib/world Import-Zyklus
function walkingDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
export function getUserLocation(userId) {
  return db().prepare(`
    SELECT lat, lng, accuracy_m AS accuracyM, updated_at AS updatedAt,
           last_pickup_at AS lastPickupAt, last_pickup_lat AS lastPickupLat,
           last_pickup_lng AS lastPickupLng,
           pickups_today AS pickupsToday, pickups_day_key AS pickupsDayKey,
           home_lat AS homeLat, home_lng AS homeLng, home_set_at AS homeSetAt
      FROM user_location WHERE user_id = ?
  `).get(userId);
}

// „Zuhause"-Anker für die lokalen Händler-Standorte. Wird beim ersten Map-Besuch
// gesetzt und bleibt stabil, damit die Händler nicht mit dir mitlaufen.
export function getUserHome(userId) {
  const row = db().prepare(
    "SELECT home_lat AS lat, home_lng AS lng, home_set_at AS setAt FROM user_location WHERE user_id = ?"
  ).get(userId);
  if (!row || row.lat == null || row.lng == null) return null;
  return { lat: row.lat, lng: row.lng, setAt: row.setAt || 0 };
}

export function setUserHome(userId, lat, lng) {
  const now = Date.now();
  const exists = db().prepare("SELECT user_id FROM user_location WHERE user_id = ?").get(userId);
  if (exists) {
    db().prepare(
      "UPDATE user_location SET home_lat = ?, home_lng = ?, home_set_at = ? WHERE user_id = ?"
    ).run(lat, lng, now, userId);
  } else {
    db().prepare(`
      INSERT INTO user_location (user_id, lat, lng, accuracy_m, updated_at, home_lat, home_lng, home_set_at)
      VALUES (?, ?, ?, 0, ?, ?, ?, ?)
    `).run(userId, lat, lng, now, lat, lng, now);
  }
  return { lat, lng, setAt: now };
}

export function listWorldItemsBox(latMin, latMax, lngMin, lngMax) {
  return db().prepare(`
    SELECT id, kind, lat, lng, spawned_at AS spawnedAt, expires_at AS expiresAt
      FROM items_world
     WHERE picked_up_by IS NULL
       AND expires_at > ?
       AND lat BETWEEN ? AND ?
       AND lng BETWEEN ? AND ?
     LIMIT 200
  `).all(Date.now(), latMin, latMax, lngMin, lngMax);
}

export function insertWorldItems(items) {
  if (!items.length) return 0;
  const stmt = db().prepare(`
    INSERT INTO items_world (kind, lat, lng, spawned_at, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const tx = db().transaction((rows) => {
    for (const it of rows) stmt.run(it.kind, it.lat, it.lng, it.spawned_at, it.expires_at);
  });
  tx(items);
  return items.length;
}

export function countActiveItemsNear(lat, lng, deltaDeg = 0.005) {
  return db().prepare(`
    SELECT COUNT(*) AS c FROM items_world
     WHERE picked_up_by IS NULL AND expires_at > ?
       AND lat BETWEEN ? AND ?
       AND lng BETWEEN ? AND ?
  `).get(Date.now(), lat - deltaDeg, lat + deltaDeg, lng - deltaDeg, lng + deltaDeg)?.c || 0;
}

export function getWorldItem(id) {
  return db().prepare(`
    SELECT id, kind, lat, lng, spawned_at AS spawnedAt, expires_at AS expiresAt,
           picked_up_by AS pickedUpBy, picked_up_at AS pickedUpAt
      FROM items_world WHERE id = ?
  `).get(id);
}

export function markItemPickedUp(itemId, userId) {
  const now = Date.now();
  const r = db().prepare(`
    UPDATE items_world SET picked_up_by = ?, picked_up_at = ?
     WHERE id = ? AND picked_up_by IS NULL AND expires_at > ?
  `).run(userId, now, itemId, now);
  return r.changes > 0;
}

function ensureInventoryRow(userId, kind) {
  db().prepare("INSERT OR IGNORE INTO user_inventory (user_id, kind, count) VALUES (?, ?, 0)").run(userId, kind);
}
export function incrementInventory(userId, kind, n = 1) {
  ensureInventoryRow(userId, kind);
  db().prepare("UPDATE user_inventory SET count = count + ? WHERE user_id = ? AND kind = ?")
    .run(n, userId, kind);
}
export function getInventory(userId) {
  return db().prepare("SELECT kind, count FROM user_inventory WHERE user_id = ? ORDER BY count DESC").all(userId);
}

// Wild-VIBO eingefangen → Dex-Eintrag hochzählen (oder anlegen)
export function recordCaughtVibo(userId, species) {
  const now = Date.now();
  const r = db().prepare("SELECT count FROM vibo_caught WHERE user_id = ? AND species = ?").get(userId, species);
  if (r) {
    db().prepare("UPDATE vibo_caught SET count = count + 1, last_at = ? WHERE user_id = ? AND species = ?").run(now, userId, species);
    return { firstTime: false, count: r.count + 1 };
  }
  db().prepare("INSERT INTO vibo_caught (user_id, species, count, first_at, last_at) VALUES (?, ?, 1, ?, ?)").run(userId, species, now, now);
  return { firstTime: true, count: 1 };
}

export function listCaughtVibos(userId) {
  return db().prepare(`
    SELECT species, count, first_at AS firstAt, last_at AS lastAt
      FROM vibo_caught WHERE user_id = ? ORDER BY count DESC, first_at ASC
  `).all(userId);
}

// ---- Angel-Fänge (verkaufbar) + Rekorde ----
export function addSellable(userId, { itemId, label, emoji, category, sizeCm, baseValue }) {
  const now = Date.now();
  const info = db().prepare(`
    INSERT INTO sellables (user_id, item_id, label, emoji, category, size_cm, base_value, caught_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, itemId, label, emoji, category, sizeCm || 0, baseValue, now);
  // Rekord aktualisieren
  if ((sizeCm || 0) > 0) {
    const rec = db().prepare("SELECT best_size_cm FROM fish_records WHERE user_id = ? AND item_id = ?").get(userId, itemId);
    if (!rec) {
      db().prepare("INSERT INTO fish_records (user_id, item_id, label, emoji, best_size_cm, at) VALUES (?, ?, ?, ?, ?, ?)")
        .run(userId, itemId, label, emoji, sizeCm, now);
      return { id: info.lastInsertRowid, newRecord: true };
    } else if (sizeCm > rec.best_size_cm) {
      db().prepare("UPDATE fish_records SET best_size_cm = ?, at = ? WHERE user_id = ? AND item_id = ?")
        .run(sizeCm, now, userId, itemId);
      return { id: info.lastInsertRowid, newRecord: true };
    }
  }
  return { id: info.lastInsertRowid, newRecord: false };
}

export function listSellables(userId, { includeKept = true } = {}) {
  return db().prepare(`
    SELECT id, item_id AS itemId, label, emoji, category, size_cm AS sizeCm, base_value AS baseValue,
           caught_at AS caughtAt, kept
      FROM sellables WHERE user_id = ? AND sold_at = 0 ${includeKept ? "" : "AND kept = 0"}
     ORDER BY caught_at DESC
  `).all(userId);
}

export function listFishRecords(userId) {
  return db().prepare(`
    SELECT item_id AS itemId, label, emoji, best_size_cm AS bestSizeCm, at
      FROM fish_records WHERE user_id = ? ORDER BY best_size_cm DESC
  `).all(userId);
}

export function getSellDaily(userId, dayKey) {
  return db().prepare("SELECT vibes_earned AS vibes, sales_count AS count FROM sell_daily WHERE user_id = ? AND day_key = ?")
    .get(userId, dayKey) || { vibes: 0, count: 0 };
}

function bumpSellDaily(userId, dayKey, vibes, count) {
  db().prepare(`
    INSERT INTO sell_daily (user_id, day_key, vibes_earned, sales_count) VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, day_key) DO UPDATE SET
      vibes_earned = vibes_earned + excluded.vibes_earned,
      sales_count  = sales_count  + excluded.sales_count
  `).run(userId, dayKey, vibes, count);
}

// Verkauft ausgewählte Fänge an einen Händler. Preisberechnung + Anti-Inflation
// (Tages-Cap, Diminishing) passieren in der API; hier wird gebucht.
// payouts: [{ id, vibes }] — bereits berechnet. Gibt {sold, vibes} zurück.
export function commitSale(userId, payouts) {
  if (!payouts.length) return { sold: 0, vibes: 0 };
  const dayKey = new Date().toISOString().slice(0, 10);
  let totalVibes = 0, sold = 0;
  const tx = db().transaction(() => {
    const now = Date.now();
    for (const p of payouts) {
      const r = db().prepare("UPDATE sellables SET sold_at = ? WHERE id = ? AND user_id = ? AND sold_at = 0")
        .run(now, p.id, userId);
      if (r.changes > 0) { totalVibes += p.vibes; sold += 1; }
    }
    if (totalVibes > 0) {
      adminGrantCredits(userId, totalVibes, `🏪 VIBO-Basar: ${sold} Fänge verkauft`);
      bumpSellDaily(userId, dayKey, totalVibes, sold);
    }
  });
  tx();
  return { sold, vibes: totalVibes };
}

export function getSellableByIds(userId, ids) {
  if (!ids.length) return [];
  const placeholders = ids.map(() => "?").join(",");
  // „Behalten"-Fänge können nicht verkauft werden — explizit ausgeschlossen.
  return db().prepare(`
    SELECT id, item_id AS itemId, label, emoji, category, size_cm AS sizeCm, base_value AS baseValue
      FROM sellables WHERE user_id = ? AND sold_at = 0 AND kept = 0 AND id IN (${placeholders})
  `).all(userId, ...ids);
}

export function recordPickup(userId, lat, lng) {
  const now = Date.now();
  const dayKey = new Date(now).toISOString().slice(0, 10);
  const loc = getUserLocation(userId);
  let pickupsToday = (loc?.pickupsToday || 0) + 1;
  if (loc?.pickupsDayKey !== dayKey) pickupsToday = 1;
  db().prepare(`
    UPDATE user_location SET
      last_pickup_at = ?, last_pickup_lat = ?, last_pickup_lng = ?,
      pickups_today = ?, pickups_day_key = ?
     WHERE user_id = ?
  `).run(now, lat, lng, pickupsToday, dayKey, userId);
  return pickupsToday;
}

// ============================================================
// Tagesquests
// ============================================================
import { rollQuestsForUser, QUEST_MAP, todayKey as questsTodayKey } from "@/lib/quests";
import { TRAITS, SICKNESSES, ACHIEVEMENTS, ACHIEVEMENT_MAP, pickTrait, traitInfo, getStage as viboGetStage, ageDaysFrom as viboAgeDays } from "@/lib/vibo";

export function ensureTodayQuests(userId) {
  const date = questsTodayKey();
  const existing = db().prepare("SELECT 1 FROM quests_user WHERE user_id = ? AND date = ? LIMIT 1").get(userId, date);
  if (existing) return;
  const quests = rollQuestsForUser(userId, date);
  const stmt = db().prepare(`
    INSERT OR IGNORE INTO quests_user (user_id, date, quest_id, progress, target, reward)
    VALUES (?, ?, ?, 0, ?, ?)
  `);
  const tx = db().transaction((rows) => {
    for (const q of rows) stmt.run(userId, date, q.id, q.target, q.reward);
  });
  tx(quests);
}

export function listTodayQuests(userId) {
  ensureTodayQuests(userId);
  const date = questsTodayKey();
  return db().prepare(`
    SELECT id, quest_id AS questId, progress, target, reward, claimed
      FROM quests_user
     WHERE user_id = ? AND date = ?
     ORDER BY id ASC
  `).all(userId, date).map((q) => {
    const def = QUEST_MAP[q.questId] || { label: q.questId, emoji: "🎯" };
    return { ...q, label: def.label, emoji: def.emoji };
  });
}

export function bumpQuestProgress(userId, questId, by = 1) {
  if (!userId || !questId) return;
  ensureTodayQuests(userId);
  const date = questsTodayKey();
  db().prepare(`
    UPDATE quests_user SET progress = MIN(target, progress + ?)
     WHERE user_id = ? AND date = ? AND quest_id = ? AND claimed = 0
  `).run(by, userId, date, questId);
}

export function claimQuest(userId, id) {
  const row = db().prepare(`
    SELECT id, quest_id AS questId, progress, target, reward, claimed
      FROM quests_user WHERE id = ? AND user_id = ?
  `).get(id, userId);
  if (!row) throw new Error("Quest nicht gefunden.");
  if (row.claimed) throw new Error("Schon abgeholt.");
  if (row.progress < row.target) throw new Error("Noch nicht abgeschlossen.");
  db().prepare("UPDATE quests_user SET claimed = 1 WHERE id = ?").run(id);
  adminGrantCredits(userId, row.reward, `Quest abgeschlossen: ${row.questId}`);
  return { ok: true, reward: row.reward };
}

// ============================================================
// VIBO-Zuhause
// ============================================================
import { FURNITURE_MAP, levelInfo as roomLevelInfo, nextLevelInfo as roomNextLevelInfo } from "@/lib/room";

function ensureRoomMeta(userId) {
  db().prepare(`
    INSERT OR IGNORE INTO user_room_meta (user_id, level, wallpaper, floor_style, created_at)
    VALUES (?, 1, 'classic', 'wood', ?)
  `).run(userId, Date.now());
}

export function getUserRoomMeta(userId) {
  ensureRoomMeta(userId);
  return db().prepare(`
    SELECT level, wallpaper, floor_style AS floorStyle FROM user_room_meta WHERE user_id = ?
  `).get(userId);
}

export function listUserRoom(userId) {
  ensureRoomMeta(userId);
  return db().prepare(`
    SELECT slot, kind, placed_at AS placedAt FROM user_room WHERE user_id = ? ORDER BY slot ASC
  `).all(userId);
}

// Platziere ein gekauftes Möbel auf einen Slot. Wenn slot=null, erster freier.
// Möbel kommt aus user_inventory (count >= 1) und wird dort dekrementiert.
export function placeFurniture(userId, kind, slot = null) {
  if (!FURNITURE_MAP[kind]) throw new Error("Unbekanntes Möbel.");
  ensureRoomMeta(userId);
  const meta = getUserRoomMeta(userId);
  const cap = roomLevelInfo(meta.level).capacity;

  const inv = db().prepare("SELECT count FROM user_inventory WHERE user_id = ? AND kind = ?").get(userId, kind);
  if (!inv || inv.count <= 0) throw new Error("Dieses Möbel hast du nicht im Inventar.");

  const taken = new Set(db().prepare("SELECT slot FROM user_room WHERE user_id = ?").all(userId).map((r) => r.slot));
  let target = slot;
  if (target === null || target === undefined) {
    for (let i = 0; i < cap; i++) if (!taken.has(i)) { target = i; break; }
    if (target === null) throw new Error("Kein freier Platz – Wohnung erweitern!");
  } else {
    if (target < 0 || target >= cap) throw new Error("Ungültiger Slot.");
    if (taken.has(target)) throw new Error("Slot belegt.");
  }

  const tx = db().transaction(() => {
    db().prepare("INSERT INTO user_room (user_id, kind, slot, placed_at) VALUES (?, ?, ?, ?)")
      .run(userId, kind, target, Date.now());
    db().prepare("UPDATE user_inventory SET count = count - 1 WHERE user_id = ? AND kind = ?").run(userId, kind);
  });
  tx();
  return { slot: target, kind };
}

// Möbel von Slot entfernen, kommt zurück ins Inventar
export function removeFurniture(userId, slot) {
  const row = db().prepare("SELECT id, kind FROM user_room WHERE user_id = ? AND slot = ?").get(userId, slot);
  if (!row) throw new Error("Slot ist leer.");
  const tx = db().transaction(() => {
    db().prepare("DELETE FROM user_room WHERE id = ?").run(row.id);
    db().prepare("INSERT OR IGNORE INTO user_inventory (user_id, kind, count) VALUES (?, ?, 0)").run(userId, row.kind);
    db().prepare("UPDATE user_inventory SET count = count + 1 WHERE user_id = ? AND kind = ?").run(userId, row.kind);
  });
  tx();
  return { kind: row.kind };
}

// Wohnung auf nächste Stufe upgraden — kostet Vibes
export function upgradeUserRoom(userId) {
  const meta = getUserRoomMeta(userId);
  const next = roomNextLevelInfo(meta.level);
  if (!next) throw new Error("Wohnung ist bereits maximal ausgebaut.");
  const spend = spendCredits(userId, next.upgradeCost, `room_upgrade:lvl${next.level}`, { type: "room", id: 0 });
  if (!spend.ok) throw new Error(`Zu wenig Vibes (fehlen ${spend.missing} ✨).`);
  db().prepare("UPDATE user_room_meta SET level = ? WHERE user_id = ?").run(next.level, userId);
  return { level: next.level, balance: spend.balance };
}

// ============================================================
// Sammelkarten
// ============================================================
export function addUserCard(userId, cardId) {
  const now = Date.now();
  const r = db().prepare("SELECT 1 FROM user_cards WHERE user_id = ? AND card_id = ?").get(userId, cardId);
  if (r) {
    db().prepare("UPDATE user_cards SET count = count + 1 WHERE user_id = ? AND card_id = ?").run(userId, cardId);
    return { firstTime: false };
  }
  db().prepare("INSERT INTO user_cards (user_id, card_id, count, first_at) VALUES (?, ?, 1, ?)")
    .run(userId, cardId, now);
  return { firstTime: true };
}

export function listUserCards(userId) {
  return db().prepare(`
    SELECT card_id AS cardId, count, first_at AS firstAt
      FROM user_cards WHERE user_id = ?
     ORDER BY first_at DESC
  `).all(userId);
}

export function knuddelNeighborVibo(fromUserId, toUserId) {
  if (!fromUserId || !toUserId || fromUserId === toUserId) {
    throw new Error("Ungültig.");
  }
  const key = `${fromUserId}->${toUserId}`;
  const last = NEIGHBOR_KNUDDEL_COOLDOWN.get(key) || 0;
  const now = Date.now();
  if (now - last < 24 * 3600_000) {
    const wait = Math.ceil((24 * 3600_000 - (now - last)) / 3600_000);
    throw new Error(`Knuddeln geht erst wieder in ${wait}h.`);
  }
  const target = tickAndPersistVibo(toUserId);
  if (!target) throw new Error("Hat noch kein VIBO.");
  if (target.died_at) throw new Error("Dieses VIBO ist verstorben.");
  NEIGHBOR_KNUDDEL_COOLDOWN.set(key, now);
  db().prepare(`UPDATE vibos SET affection = MIN(100, affection + 5) WHERE user_id = ?`).run(toUserId);
  awardCredits(fromUserId, 1, "vibo_knuddel", { type: "to", id: toUserId });
  audit({ userId: fromUserId, action: "vibo.knuddel", detail: `to=${toUserId}` });
  return { ok: true };
}

export function hatchVibo(userId, name, species = "sprout") {
  const SP = ["sprout", "kitsune", "drago", "knuddi", "stella", "maunzi", "boo", "robi"];
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
  const trait = pickTrait(userId + Math.floor(now / 1000));  // stabil ab Schlüpfen
  db().prepare(`
    INSERT INTO vibos (user_id, name, species, hatched_at, last_tick_at, trait)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, cleanName, sp, now, now, trait);
  audit({ userId, action: "vibo.hatched", detail: `name=${cleanName},species=${sp},trait=${trait}` });
  return loadVibo(userId);
}

// Schlaf-Modus 22:00 – 06:00 (Server-Zeit Europa/Berlin als UTC+1/+2).
// Vereinfacht: anteilig berechnet zwischen last und now.
function sleepFractionInRange(lastMs, nowMs) {
  if (nowMs <= lastMs) return 0;
  let asleep = 0;
  // gehe stundenweise durch — günstig genug für maximal 24h Spannweite
  let cursor = lastMs;
  const stepMs = Math.min(30 * 60_000, nowMs - lastMs);
  while (cursor < nowMs) {
    const next = Math.min(cursor + stepMs, nowMs);
    const mid = (cursor + next) / 2;
    const h = new Date(mid).getUTCHours();
    // Europa CET/CEST: meist UTC+1, im Sommer +2. Wir nehmen 22-6 (Berlin)
    // als UTC 21-5 (im Sommer 20-4). Vereinfacht: UTC 20-5 zählt als Nacht.
    const isNight = h >= 20 || h < 5;
    if (isNight) asleep += (next - cursor);
    cursor = next;
  }
  return asleep / (nowMs - lastMs); // 0..1
}

export function isViboSleepingNow() {
  const h = new Date().getUTCHours();
  return h >= 20 || h < 5;
}

const VIBO_BIRTHDAY_BONUS = 15;
const VIBO_BRIEF_AFTER_MS = 12 * 3600_000;

// Wendet Zeitverfall an (lazy beim GET). Schreibt sofort zurück.
export function tickAndPersistVibo(userId) {
  const v = loadVibo(userId);
  if (!v || v.died_at) return v;
  const now = Date.now();
  const last = v.last_tick_at || v.hatched_at;
  const hours = (now - last) / VIBO_HOUR;
  if (hours <= 0) return v;

  // Schlaf reduziert Decay um 70%
  const sleepFrac = sleepFractionInRange(last, now);
  const decayFactor = (1 - sleepFrac * 0.7);

  // Charakter-Eigenschaft: pro Wert eigener Decay-Multiplikator
  const tdecay = traitInfo(v.trait).decay;

  const updated = { ...v };
  updated.hunger    = viboClamp(v.hunger    - hours * 4 * decayFactor * (tdecay.hunger || 1));
  updated.fun       = viboClamp(v.fun       - hours * 3 * decayFactor * (tdecay.fun || 1));
  updated.hygiene   = viboClamp(v.hygiene   - hours * 2 * decayFactor * (tdecay.hygiene || 1));
  updated.affection = viboClamp(v.affection - hours * 1 * decayFactor * (tdecay.affection || 1));

  let healthLoss = 0;
  for (const k of ["hunger", "fun", "hygiene", "affection"]) {
    if (updated[k] < 20) healthLoss += hours * 1;
  }
  // Krankheit zieht zusätzlich Gesundheit
  if (v.sick) healthLoss += hours * 1.5;
  updated.health = viboClamp(v.health - healthLoss);
  updated.last_tick_at = now;

  // Krankwerden: bei längerer Vernachlässigung Chance pro Stunde.
  // Quelle bestimmt die Krankheit (Hygiene→Erkältung, Hunger→Bauchweh, …).
  updated.sick = v.sick || "";
  updated.sick_since = v.sick_since || 0;
  if (!updated.sick && hours >= 0.5) {
    let cause = "";
    if (updated.hygiene < 20) cause = "erkaeltung";
    else if (updated.hunger < 20) cause = "bauchweh";
    else if (updated.affection < 15) cause = "trübsal";
    else if (updated.health < 35) cause = "fieber";
    if (cause) {
      // ~25% Chance pro vergangener Stunde, gedeckelt
      const p = Math.min(0.6, hours * 0.25);
      if (Math.random() < p) { updated.sick = cause; updated.sick_since = now; }
    }
  }

  // Geburtstag: alle 7 Tage seit hatched_at
  const ageMs = now - v.hatched_at;
  const ageWeeks = Math.floor(ageMs / (7 * 24 * VIBO_HOUR));
  const lastBdayWeeks = Math.floor((v.last_birthday_at || 0) / (7 * 24 * VIBO_HOUR));
  let birthdayJustHappened = false;
  if (ageWeeks > 0 && ageWeeks > lastBdayWeeks) {
    // Bonus nur wenn last_birthday_at als Wochen-Stempel ein älteres Vielfaches war
    updated.last_birthday_at = now;
    // Bonus-Vibes über adminGrantCredits (umgeht Cap)
    try { adminGrantCredits(userId, VIBO_BIRTHDAY_BONUS, `🎂 VIBO-Geburtstag (${ageWeeks * 7} Tage)`); } catch {}
    birthdayJustHappened = true;
  }

  if (updated.health <= 0 && v.health <= 0 && now - (v.last_tick_at || now) > 3 * VIBO_HOUR) {
    updated.died_at = now;
    updated.death_reason = "Vernachlässigung";
    audit({ userId, action: "vibo.died", detail: v.name });
  }

  db().prepare(`
    UPDATE vibos SET hunger=?, fun=?, hygiene=?, affection=?, health=?, last_tick_at=?,
      died_at=?, death_reason=?, last_birthday_at=?, sick=?, sick_since=?
    WHERE user_id=?
  `).run(
    updated.hunger, updated.fun, updated.hygiene, updated.affection, updated.health,
    updated.last_tick_at, updated.died_at || null, updated.death_reason || "",
    updated.last_birthday_at || v.last_birthday_at || 0,
    updated.sick || "", updated.sick_since || 0, userId
  );
  updated._birthdayJustHappened = birthdayJustHappened;
  return updated;
}

// Vibo-Brief: User, dessen VIBO über 12h vernachlässigt wurde, bekommen Push.
// last_brief_at verhindert mehr als 1 Brief pro 24h.
export function listVibosNeedingBrief() {
  const now = Date.now();
  const cutoff = now - VIBO_BRIEF_AFTER_MS;
  const briefCooldown = now - 24 * 3600_000;
  return db().prepare(`
    SELECT v.user_id AS userId, v.name, v.species, v.last_tick_at AS lastTickAt,
           u.username, u.display_name AS displayName, u.last_seen AS lastSeen
      FROM vibos v JOIN users u ON u.id = v.user_id
     WHERE v.died_at IS NULL
       AND u.last_seen < ?
       AND v.last_brief_at < ?
       AND v.hatched_at < ?
  `).all(cutoff, briefCooldown, cutoff);
}
export function markBriefSent(userId) {
  db().prepare("UPDATE vibos SET last_brief_at = ? WHERE user_id = ?").run(Date.now(), userId);
}

const VIBO_ACTIONS = {
  feed:  { hunger: +35, fun: +5,  hygiene: -3, affection: +3, health: 0,   cooldownMs: 30 * 60_000 },
  play:  { hunger: -5,  fun: +35, hygiene: -5, affection: +8, health: 0,   cooldownMs: 20 * 60_000 },
  clean: { hunger: 0,   fun: -5,  hygiene: +40, affection: +2, health: +5,  cooldownMs: 60 * 60_000 },
  pet:   { hunger: 0,   fun: +8,  hygiene: 0,   affection: +15, health: +2,  cooldownMs: 5  * 60_000 },
  heal:  { hunger: 0,   fun: -10, hygiene: 0,   affection: 0,   health: +30, cooldownMs: 4 * VIBO_HOUR },
  sleep: { hunger: -5,  fun: +5,  hygiene: 0,   affection: +3,  health: +15, cooldownMs: 6 * VIBO_HOUR },
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
export function listCreditTx(userId, limit = 30, offset = 0) {
  return db().prepare(
    "SELECT id, amount, reason, ref_type AS refType, ref_id AS refId, at FROM credit_tx WHERE user_id = ? ORDER BY at DESC LIMIT ? OFFSET ?"
  ).all(userId, limit, offset);
}

export function countCreditTx(userId) {
  return db().prepare("SELECT COUNT(*) AS c FROM credit_tx WHERE user_id = ?").get(userId)?.c || 0;
}

// Anti-Inflation: harte Tagesgrenze für passiv verdiente Credits.
// Daily-Bonus und Admin-Grants zählen NICHT mit (eigener Bucket).
const DAILY_EARN_CAP = 60;     // max 60 Credits/Tag aus Aktivität
const SAME_REF_COOLDOWN_MS = 24 * 3600_000; // pro (reason, refType, refId) nur 1x in 24h
const DIMINISH_AFTER = 5;       // nach 5x gleicher Aktion: halber Wert
const PASSIVE_REASONS = new Set([
  "gruscheln_send", "gruscheln_recv", "pinnwand", "gift_send", "gift_recv",
  "like_recv", "photo_upload", "world_pickup", "world_pickup_crystal", "vibo_knuddel",
  "vibo_minigame",
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
  if (working > 0) {
    db().prepare(`
      UPDATE vibos SET affection = MIN(100, affection + 1)
       WHERE user_id = ? AND died_at IS NULL
    `).run(userId);
  }

  // 🥇 Quest-Tracking: passende Aktion → progress hochzählen
  if (working > 0) {
    try {
      const QUEST_FROM_REASON = {
        pinnwand: "pinnwand", gruscheln_send: "gruscheln",
        gift_send: "gift", world_pickup: "world_pickup",
        world_pickup_crystal: "world_pickup", vibo_knuddel: "knuddle",
        photo_upload: "photo",
      };
      const qid = QUEST_FROM_REASON[reason];
      if (qid) bumpQuestProgress(userId, qid);
    } catch {}
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
// ============================================================
// Premium-Features (mit Vibes freigekauft)
// ============================================================
import { PREMIUM_MAP, isInSeason } from "@/lib/premium";

// Anti-Inflation: globaler Stock-Verbrauch eines Items.
function getStockSold(kind) {
  const r = db().prepare("SELECT sold_count FROM shop_stock WHERE kind = ?").get(kind);
  return r?.sold_count || 0;
}

function incStockSold(kind) {
  db().prepare(`
    INSERT INTO shop_stock (kind, sold_count) VALUES (?, 1)
      ON CONFLICT(kind) DO UPDATE SET sold_count = sold_count + 1
  `).run(kind);
}

// Anti-Inflation: pro-Tag-Käufe eines Users zählen (Reset um Mitternacht lokal).
function countTodaysPurchases(userId, kind) {
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  return db().prepare(`
    SELECT COUNT(*) AS n FROM credit_tx
     WHERE user_id = ? AND reason = ? AND at >= ?
  `).get(userId, `premium:${kind}`, startOfDay.getTime())?.n || 0;
}

// Anti-Inflation: globaler Sink-Counter (Summe ALLER verbrannten Vibes durch Shop-Käufe).
function addToSink(amount) {
  db().prepare("UPDATE shop_sink SET total = total + ?, updated_at = ? WHERE id = 1").run(amount, Date.now());
}

export function getShopSinkTotal() {
  const r = db().prepare("SELECT total FROM shop_sink WHERE id = 1").get();
  return r?.total || 0;
}

// Anti-Inflation: Verfügbarkeits-Info für UI (Stock, Saison, Daily-Cap).
export function getShopAvailability(userId) {
  const out = {};
  for (const [kind, item] of Object.entries(PREMIUM_MAP)) {
    const sold = item.stock ? getStockSold(kind) : 0;
    const remaining = item.stock ? Math.max(0, item.stock - sold) : null;
    const todays = (item.dailyMax && userId) ? countTodaysPurchases(userId, kind) : 0;
    out[kind] = {
      stockRemaining: remaining,
      stockTotal: item.stock || null,
      todaysPurchases: todays,
      dailyMax: item.dailyMax || null,
      inSeason: isInSeason(item),
      seasonFrom: item.seasonFrom || null,
      seasonTo: item.seasonTo || null,
    };
  }
  return out;
}

function getPremiumBadges(userId) {
  const row = db().prepare("SELECT premium_badges FROM users WHERE id = ?").get(userId);
  if (!row?.premium_badges) return [];
  return String(row.premium_badges).split(",").filter(Boolean);
}

function setPremiumBadges(userId, badges) {
  db().prepare("UPDATE users SET premium_badges = ? WHERE id = ?").run(badges.join(","), userId);
}

// Kauft ein Premium-Feature. Wendet sofort an wenn permanent.
// Gibt {ok, balance, note} oder wirft Error.
// Slugs die als "premium_badges"-Flag persistiert werden (one-shot perm Items)
const PREMIUM_FLAG_MAP = {
  badge_gold:         "gold",
  badge_diamond:      "diamond",
  frame_rainbow:      "rainbow",
  frame_neon:         "frame_neon",
  frame_gold:         "frame_gold",
  vanity_url:         "vanity",
  bio_xl:             "bio_xl",
  presence_invisible: "invisible",
  status_slot:        "status_slot",
  // Profilbild-Slot-Tiers: jede Stufe nur 1x freischaltbar
  extra_pic_slots:      "pic_slots_s",
  extra_pic_slots_xl:   "pic_slots_m",
  extra_pic_slots_mega: "pic_slots_l",
  // Name-Colors (jede einzeln als Flag — User kann gekaufte später frei umschalten)
  name_color_pink:       "color_pink",
  name_color_cyan:       "color_cyan",
  name_color_lila:       "color_lila",
  name_color_rainbow:    "color_rainbow",
  name_color_glitter:    "color_glitter",
  name_color_sparkle_fx: "color_sparkle_fx",
  // Profil-Skins (jeder einzeln als Flag)
  skin_y2k:     "skin_y2k",
  skin_glitter: "skin_glitter",
  skin_skater:  "skin_skater",
  skin_anime:   "skin_anime",
  skin_matrix:  "skin_matrix",
  skin_sailor:  "skin_sailor",
  // Status-Packs (cascading) — Flag = "status_pack_<id>"
  status_pack_movie: "status_pack_movie",
  status_pack_party: "status_pack_party",
  status_pack_love:  "status_pack_love",
  status_pack_emo:   "status_pack_emo",
  status_pack_glam:  "status_pack_glam",
};

export function buyPremium(userId, kind, payload = {}) {
  const item = PREMIUM_MAP[kind];
  if (!item) throw new Error("Unbekanntes Premium-Item.");

  // ---- Anti-Inflation: Saison-Fenster ----
  if (!isInSeason(item)) {
    throw new Error(`Saison-Item — aktuell nicht verkäuflich (nur ${item.seasonFrom}..${item.seasonTo}).`);
  }
  // ---- Anti-Inflation: globales Stock-Limit ----
  if (item.stock) {
    const sold = getStockSold(kind);
    if (sold >= item.stock) {
      throw new Error(`Ausverkauft (${item.stock}/${item.stock}). Limited Edition.`);
    }
  }
  // ---- Anti-Inflation: Tagesmenge pro User ----
  if (item.dailyMax) {
    const todays = countTodaysPurchases(userId, kind);
    if (todays >= item.dailyMax) {
      throw new Error(`Tageslimit erreicht (${item.dailyMax}×/Tag). Komm morgen wieder.`);
    }
  }

  // ---- Validierungen vor Bezahlung ----
  if (kind === "username_change" || kind === "username_change_fast") {
    const newName = validateUsername(payload?.newUsername);  // 3-17, a-z0-9_-, Wortfilter
    const exists = db().prepare("SELECT 1 FROM users WHERE username = ? AND id != ?").get(newName, userId);
    if (exists) throw new Error("Username ist bereits vergeben.");
    const me = db().prepare("SELECT last_username_change_at, username FROM users WHERE id = ?").get(userId);
    if (me?.username === newName) throw new Error("Das ist schon dein aktueller Username.");
    if (kind === "username_change" && me?.last_username_change_at && Date.now() - me.last_username_change_at < 365 * 24 * 3600_000) {
      const days = Math.ceil((365 * 24 * 3600_000 - (Date.now() - me.last_username_change_at)) / (24 * 3600_000));
      throw new Error(`Erst wieder in ${days} Tagen änderbar — oder nimm „Sofort"-Variante.`);
    }
  }
  if (kind === "displayname_change") {
    const newDn = validateDisplayName(payload?.newDisplayName);  // 1-17, kein Space, Wortfilter
    const exists = db().prepare("SELECT 1 FROM users WHERE LOWER(display_name) = LOWER(?) AND id != ?").get(newDn, userId);
    if (exists) throw new Error("Anzeigename ist bereits vergeben.");
  }
  if (kind === "custom_status") {
    const text = String(payload?.text || "").trim();
    if (text.length < 1 || text.length > 80) throw new Error("Status 1-80 Zeichen.");
  }
  // Cascading-Lock: Status-Packs nur in Reihenfolge kaufbar
  if (item.requiresPack) {
    const ownedFlags = getPremiumBadges(userId);
    if (!ownedFlags.includes(`status_pack_${item.requiresPack}`)) {
      throw new Error(`Erst „${item.requiresPack}" freischalten — das hier braucht das vorherige Pack.`);
    }
  }
  // Permanent-Items: nicht doppelt verkaufen
  const flag = PREMIUM_FLAG_MAP[kind];
  if (flag && getPremiumBadges(userId).includes(flag)) {
    throw new Error("Hast du schon.");
  }

  // ---- Bezahlen ----
  const __econMult = Number(getSetting("ECONOMY_MULTIPLIER", "1.0")) || 1.0;
  const __adjustedPrice = Math.max(1, Math.round((item.price || 0) * __econMult));
  const spend = spendCredits(userId, __adjustedPrice, `premium:${kind}`, { type: "premium", id: 0 });
  if (!spend.ok) throw new Error(`Zu wenig Vibes (fehlen ${spend.missing} ✨).`);

  // ---- Anti-Inflation: Sink-Counter + Stock-Verbrauch ----
  // (default: 100% des Preises wandert ins Sink — kein Empfänger bei Shop-Käufen)
  const sinkShare = typeof item.sinkShare === "number" ? Math.max(0, Math.min(1, item.sinkShare)) : 1;
  addToSink(Math.round(__adjustedPrice * sinkShare));
  if (item.stock) incStockSold(kind);

  // ---- Anwenden ----
  let note = "";
  switch (kind) {
    case "extra_pic_slots":
    case "extra_pic_slots_xl":
    case "extra_pic_slots_mega":
      db().prepare("UPDATE users SET extra_pic_slots = COALESCE(extra_pic_slots,0) + ? WHERE id = ?").run(item.bonus, userId);
      note = `+${item.bonus} Slots freigeschaltet`;
      break;
    case "custom_status":
      db().prepare("UPDATE users SET mood = ? WHERE id = ?").run(payload.text, userId);
      note = "Status gesetzt";
      break;
    case "displayname_change": {
      const newDn = validateDisplayName(payload.newDisplayName);
      const old = db().prepare("SELECT display_name FROM users WHERE id = ?").get(userId)?.display_name;
      db().prepare("UPDATE users SET display_name = ? WHERE id = ?").run(newDn, userId);
      recordNameChange(userId, "displayname", old, newDn, "shop-kauf");
      note = "Anzeigename geändert";
      break;
    }
    case "displayname_3pack":
      db().prepare("UPDATE users SET displayname_credits = COALESCE(displayname_credits,0) + ? WHERE id = ?").run(item.pack || 3, userId);
      note = `${item.pack || 3} Anzeigenamen-Wechsel auf Vorrat gespeichert`;
      break;
    case "username_change":
    case "username_change_fast": {
      const newName = validateUsername(payload.newUsername);
      const old = db().prepare("SELECT username FROM users WHERE id = ?").get(userId)?.username;
      db().prepare("UPDATE users SET username = ?, last_username_change_at = ? WHERE id = ?")
        .run(newName, Date.now(), userId);
      recordNameChange(userId, "username", old, newName, kind === "username_change_fast" ? "shop-sofort" : "shop");
      note = "Username geändert — bitte neu einloggen.";
      break;
    }
    case "vip_30":
    case "vip_365": {
      // VIP-Laufzeit verlaengern (stapelbar) — werbefreier Modus
      const before = db().prepare("SELECT vip_until FROM users WHERE id = ?").get(userId);
      const base = (before?.vip_until || 0) > Date.now() ? before.vip_until : Date.now();
      const days = Math.max(1, item.durationDays || 30);
      const newUntil = base + days * 24 * 3600_000;
      db().prepare("UPDATE users SET vip_until = ? WHERE id = ?").run(newUntil, userId);
      const endDate = new Date(newUntil).toLocaleDateString("de-DE");
      note = `VIP aktiv bis ${endDate} — keine Werbung mehr!`;
      break;
    }
    case "buschfunk_boost_1":
    case "buschfunk_boost_3": {
      // Anti-Inflation: alten Stock erst auf Verfall prüfen, dann aufstocken.
      const before = db().prepare("SELECT buschfunk_boosts, buschfunk_boosts_expire_at FROM users WHERE id = ?").get(userId);
      const stillValid = before?.buschfunk_boosts_expire_at && Date.now() < before.buschfunk_boosts_expire_at
        ? (before.buschfunk_boosts || 0)
        : 0;
      const days = Math.max(1, item.expiresAfterDays || 30);
      const newExpire = Date.now() + days * 24 * 3600_000;
      db().prepare(`
        UPDATE users
           SET buschfunk_boosts = ?, buschfunk_boosts_expire_at = ?
         WHERE id = ?
      `).run(stillValid + (item.pack || 1), newExpire, userId);
      note = `${item.pack || 1} Buschfunk-Boost(s) auf Vorrat — verfallen in ${days} Tagen`;
      break;
    }
    default:
      if (flag) {
        setPremiumBadges(userId, [...getPremiumBadges(userId), flag]);
        // Name-Color / Profil-Skin: nach Kauf direkt aktivieren
        if (kind.startsWith("name_color_")) {
          const key = kind.slice("name_color_".length);
          db().prepare("UPDATE users SET name_color = ? WHERE id = ?").run(key, userId);
        } else if (kind.startsWith("skin_")) {
          const key = kind.slice("skin_".length);
          db().prepare("UPDATE users SET profile_skin = ? WHERE id = ?").run(key, userId);
        }
        note = `${item.name} freigeschaltet`;
      } else {
        note = "Gekauft";
      }
  }

  audit({ userId, action: `premium.buy`, detail: `kind=${kind}` });
  return { ok: true, balance: spend.balance, note };
}

// Anzeigename ändern mit Vorrats-Credit (kein Vibes-Abzug)
export function useDisplayNameCredit(userId, newDisplayName) {
  const newDn = validateDisplayName(newDisplayName);
  const exists = db().prepare("SELECT 1 FROM users WHERE LOWER(display_name) = LOWER(?) AND id != ?").get(newDn, userId);
  if (exists) throw new Error("Anzeigename ist bereits vergeben.");
  const row = db().prepare("SELECT displayname_credits, display_name FROM users WHERE id = ?").get(userId);
  const credits = row?.displayname_credits || 0;
  if (credits <= 0) throw new Error("Keine Anzeigenamen-Credits — kauf welche im Shop.");
  db().prepare("UPDATE users SET display_name = ?, displayname_credits = displayname_credits - 1 WHERE id = ?")
    .run(newDn, userId);
  recordNameChange(userId, "displayname", row?.display_name, newDn, "credit");
  return { ok: true, remaining: credits - 1 };
}

// Profil-Bild-Slots: Default + Premium-Erweiterung
export function getUserPicSlots(userId) {
  const row = db().prepare("SELECT extra_pic_slots FROM users WHERE id = ?").get(userId);
  return MAX_PROFILE_PICS + (row?.extra_pic_slots || 0);
}

// Für Profil-Anzeige: alle aktiven Premium-Badges
export function listPremiumBadges(userId) {
  return getPremiumBadges(userId);
}

export function spendCredits(userId, amount, reason, ref = {}) {
  if (amount <= 0) return { ok: true, balance: 0, missing: 0 };
  ensureCreditsRow(userId);
  // Atomare Transaktion gegen TOCTOU bei schnellen Doppelklicks
  const result = db().transaction(() => {
    const row = db().prepare("SELECT balance FROM credits WHERE user_id = ?").get(userId);
    const bal = row?.balance || 0;
    if (bal < amount) return { ok: false, balance: bal, missing: amount - bal };
    db().prepare("UPDATE credits SET balance = balance - ? WHERE user_id = ?").run(amount, userId);
    db().prepare(`
      INSERT INTO credit_tx (user_id, amount, reason, ref_type, ref_id, at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, -amount, reason || "", ref.type || "", ref.id || null, Date.now());
    return { ok: true, balance: bal - amount, missing: 0 };
  })();
  return result;
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

  // Ei-Phase ist aktuell deaktiviert (siehe lib/vibo.js EGG_HATCH_HOURS=0).
  // Wenn jemand sie wieder aktiviert, kommt der Check wieder zum Tragen.
  if (VIBO_EGG_HATCH_HOURS > 0) {
    const ageDays = (Date.now() - v.hatched_at) / (24 * 3600_000);
    const walked = v.distance_walked_m || 0;
    if (ageDays < VIBO_EGG_HATCH_HOURS / 24 && walked < 2000) {
      throw new Error("🥚 Dein VIBO ist noch ein Ei. Warte oder geh laufen!");
    }
  }

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
  // Heilen (💊) + Putzen (🧼) befreien von Krankheit
  let cured = false;
  if (v.sick && (action === "heal" || (action === "clean" && v.sick === "erkaeltung"))) {
    next.sick = "";
    next.sick_since = 0;
    cured = true;
  }
  db().prepare(`
    UPDATE vibos SET hunger=?, fun=?, hygiene=?, affection=?, health=?, last_tick_at=?, sick=?, sick_since=?
    WHERE user_id=?
  `).run(next.hunger, next.fun, next.hygiene, next.affection, next.health, next.last_tick_at,
    next.sick != null ? next.sick : (v.sick || ""), next.sick_since != null ? next.sick_since : (v.sick_since || 0), userId);
  // Quest: vibo_care
  try { bumpQuestProgress(userId, "vibo_care"); } catch {}
  next._cured = cured;
  return next;
}

// Direktes Buffen von VIBO-Stats (für Shop-Konsumierbare).
export function buffVibo(userId, effect = {}) {
  const fields = ["hunger", "fun", "hygiene", "affection", "health"];
  const updates = [];
  const args = [];
  for (const f of fields) {
    if (typeof effect[f] === "number") {
      updates.push(`${f} = MIN(100, MAX(0, ?))`);
      args.push(effect[f]);
    }
  }
  if (!updates.length) return;
  args.push(userId);
  db().prepare(`UPDATE vibos SET ${updates.join(", ")} WHERE user_id = ? AND died_at IS NULL`).run(...args);
}

// ============================================================
// VIBO-Achievements: prüfen + belohnen (idempotent, einmalig pro User)
// ============================================================
export function listViboAchievementIds(userId) {
  return db().prepare("SELECT achievement_id FROM vibo_achievements WHERE user_id = ?")
    .all(userId).map((r) => r.achievement_id);
}

// Prüft alle Achievements gegen den aktuellen Zustand, schaltet neue frei,
// vergibt die Vibes-Belohnung (umgeht Cap via adminGrantCredits).
// Gibt { unlocked: [...], newly: [...] } zurück.
export function checkAndAwardAchievements(userId, vibo) {
  if (!vibo) return { unlocked: listViboAchievementIds(userId), newly: [] };
  const already = new Set(listViboAchievementIds(userId));
  const ageDays = viboAgeDays(vibo.hatched_at);
  const stage = vibo.died_at ? "dead" : viboGetStage(ageDays, vibo.distance_walked_m || 0);
  const cardCount = db().prepare("SELECT COUNT(*) AS n FROM user_cards WHERE user_id = ?").get(userId).n;
  const furnitureCount = db().prepare("SELECT COUNT(*) AS n FROM user_room WHERE user_id = ?").get(userId).n;
  const ctx = {
    affection: vibo.affection, health: vibo.health,
    minStat: Math.min(vibo.hunger, vibo.fun, vibo.hygiene, vibo.affection),
    ageDays, stage,
    cardCount, furnitureCount,
    distanceWalkedM: vibo.distance_walked_m || 0,
  };
  const newly = [];
  const now = Date.now();
  for (const a of ACHIEVEMENTS) {
    if (already.has(a.id)) continue;
    let ok = false;
    try { ok = a.check(ctx); } catch { ok = false; }
    if (!ok) continue;
    db().prepare("INSERT OR IGNORE INTO vibo_achievements (user_id, achievement_id, unlocked_at) VALUES (?, ?, ?)")
      .run(userId, a.id, now);
    try { adminGrantCredits(userId, a.reward, `🏆 Achievement: ${a.name}`); } catch {}
    newly.push(a.id);
  }
  return { unlocked: [...already, ...newly], newly };
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
    school: "school",
    city: "city",
    marqueeText: "marquee_text",
    greetingHtml: "greeting_html",
    greetingTitle: "greeting_title",
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
  const rows = db().prepare(`
    SELECT p.id, p.text, p.image_url AS imageUrl, p.audio_url AS audioUrl,
           p.media_url AS mediaJson, p.created_at AS at,
           u.username AS from_username, u.display_name AS from_display_name, u.emoji AS from_emoji,
           u.gender AS from_gender, u.birthdate AS from_birthdate, u.last_seen AS from_last_seen,
           u.avatar_url AS from_avatar_url, u.avatar_status AS from_avatar_status,
           (SELECT COUNT(*) FROM reactions r WHERE r.target_type='pinnwand' AND r.target_id=p.id AND r.kind='like') AS likeCount,
           CASE WHEN EXISTS(SELECT 1 FROM reactions r WHERE r.target_type='pinnwand' AND r.target_id=p.id AND r.user_id=? AND r.kind='like') THEN 1 ELSE 0 END AS iLiked
      FROM pinnwand p
      JOIN users u ON u.id = p.from_user_id
     WHERE p.target_user_id = ?
     ORDER BY p.created_at DESC
  `).all(byUserId || 0, targetUserId);
  return rows.map((r) => {
    const stats = getReactionStats("pinnwand", r.id, byUserId || 0);
    return {
      ...r,
      imageUrl: r.imageUrl || "",
      audioUrl: r.audioUrl || "",
      media: r.mediaJson || "",
      from_gender: r.from_gender === "m" || r.from_gender === "w" ? r.from_gender : "",
      from_age: ageFromBirthdate(r.from_birthdate),
      from_avatar: r.from_avatar_status === "approved" ? (r.from_avatar_url || "") : "",
      iLiked: !!r.iLiked,
      reactionCounts: stats.counts,
      myReactions: stats.mine,
    };
  });
}

export function addPinnwand(targetUserId, fromUserId, text, imageUrl = "", audioUrl = "", mediaJson = "") {
  const info = db().prepare(`
    INSERT INTO pinnwand (target_user_id, from_user_id, text, image_url, audio_url, media_url, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(targetUserId, fromUserId, text, imageUrl, audioUrl, mediaJson, Date.now());
  return info.lastInsertRowid;
}

export function addGuestbookEntry(targetUserId, fromUserId, text, imageUrl = "") {
  const info = db().prepare(`
    INSERT INTO guestbook (target_user_id, from_user_id, text, image_url, created_at) VALUES (?, ?, ?, ?, ?)
  `).run(targetUserId, fromUserId, text, imageUrl || "", Date.now());
  return info.lastInsertRowid;
}

export function getGuestbookEntries(targetUserId) {
  return db().prepare(`
    SELECT g.id, g.text, g.image_url AS image, g.created_at AS at,
           u.username AS from_username, u.display_name AS from_display_name,
           u.gender AS from_gender, u.birthdate AS from_birthdate,
           u.avatar_url AS from_avatar_url, u.avatar_status AS from_avatar_status,
           u.last_seen AS from_last_seen
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
// viewerId = wer die Vitrine ansieht. Bei privaten Geschenken sieht nur
// Sender/Empfänger sie. Spruch wird bei "public" für andere ausgeblendet
// (laut Jappy-Doku: Spruch nur Sender/Empfänger sehen — vereinfacht).
export function getGifts(targetUserId, viewerId = null) {
  const rows = db().prepare(`
    SELECT g.id, g.gift_id, g.created_at AS at, g.note, g.pinned,
           g.vibes_cost AS vibesCost, g.visibility, g.wrap,
           g.from_user_id AS fromUserId,
           u.username AS from_username, u.display_name AS from_display_name, u.emoji AS from_emoji,
           u.gender AS from_gender, u.birthdate AS from_birthdate, u.last_seen AS from_last_seen
      FROM gifts g
      JOIN users u ON u.id = g.from_user_id
     WHERE g.target_user_id = ?
     ORDER BY g.pinned DESC, g.created_at DESC
  `).all(targetUserId);
  return rows
    .filter((r) => {
      if (r.visibility !== "private") return true;
      return viewerId && (viewerId === targetUserId || viewerId === r.fromUserId);
    })
    .map((r) => {
      // Spruch nur Sender/Empfänger zeigen
      const canSeeNote = viewerId && (viewerId === targetUserId || viewerId === r.fromUserId);
      return canSeeNote ? r : { ...r, note: "" };
    });
}

export function addGift(targetUserId, fromUserId, giftId, {
  note = "", vibesCost = 0, visibility = "public", wrap = "",
} = {}) {
  const v = visibility === "private" ? "private" : "public";
  const r = db().prepare(`
    INSERT INTO gifts (target_user_id, from_user_id, gift_id, note, vibes_cost, visibility, wrap, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(targetUserId, fromUserId, giftId, String(note || "").slice(0, 140), vibesCost, v, String(wrap || ""), Date.now());
  return Number(r.lastInsertRowid);
}

export function pinGift(targetUserId, giftId) {
  // Max 6 gepinnt — Owner kann nur eigene Vitrine pinnen.
  const cnt = db().prepare(
    "SELECT COUNT(*) AS c FROM gifts WHERE target_user_id = ? AND pinned = 1"
  ).get(targetUserId).c;
  if (cnt >= 6) throw new Error("Max 6 Geschenke gepinnt — vorher eins lösen.");
  const r = db().prepare(
    "UPDATE gifts SET pinned = 1 WHERE id = ? AND target_user_id = ?"
  ).run(giftId, targetUserId);
  return r.changes > 0;
}

export function unpinGift(targetUserId, giftId) {
  const r = db().prepare(
    "UPDATE gifts SET pinned = 0 WHERE id = ? AND target_user_id = ?"
  ).run(giftId, targetUserId);
  return r.changes > 0;
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

// ---- Globale Settings (Wartungsmodus, Marquee, Limits …) ----
export function getSetting(key, def = null) {
  const r = db().prepare("SELECT value FROM settings_global WHERE key = ?").get(String(key));
  return r ? r.value : def;
}
export function setSetting(key, value) {
  const now = Date.now();
  db().prepare(`
    INSERT INTO settings_global (key, value, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(String(key), value == null ? null : String(value), now);
}
export function listSettings() {
  return db().prepare("SELECT key, value, updated_at AS updatedAt FROM settings_global ORDER BY key").all();
}

// Bequeme Wrapper für die häufigsten Settings
export function getMaintenanceMode() {
  return getSetting("maintenance_mode", "") === "1";
}
export function getMaintenanceMessage() {
  return getSetting("maintenance_message", "Wir sind kurz weg — gleich wieder da.");
}
export function getMarqueeText() {
  return getSetting("marquee_text", "");
}

// Holt (oder erstellt) den System-Account, der Broadcast-Nachrichten verschickt.
// Username "system", Status approved, kein Passwort-Login möglich (zufälliger Hash).
export function ensureSystemUser() {
  const existing = db().prepare("SELECT * FROM users WHERE username = 'system'").get();
  if (existing) return userRow(existing);
  const now = Date.now();
  const randomHash = bcrypt.hashSync(crypto.randomBytes(32).toString("hex"), 12);
  db().prepare(`
    INSERT INTO users (username, display_name, password_hash, emoji, mood, about_me, interests, bg_music, created_at, last_seen, status, reg_ip, gender, birthdate)
    VALUES ('system', 'VibeVibo', ?, '⚙️', '', 'Offizielle Plattform-Nachrichten von VibeVibo.', '[]', '', ?, ?, 'approved', '', '', '')
  `).run(randomHash, now, now);
  return userRow(db().prepare("SELECT * FROM users WHERE username = 'system'").get());
}

// Versendet Broadcast als DM von "system" an alle aktiven (approved) User
// außer der Absender-Admin selbst. Push wird parallel ausgelöst (best-effort).
// Gibt {recipients, messageIds} zurück.
export function broadcastSystemMessage(text, excludeUserId = null) {
  const trimmed = String(text || "").trim();
  if (!trimmed) throw new Error("Leere Nachricht.");
  if (trimmed.length > 1000) throw new Error("Max. 1000 Zeichen.");
  const sys = ensureSystemUser();
  const recipients = db().prepare(`
    SELECT id FROM users
     WHERE status = 'approved' AND id != ? AND id != ?
  `).all(sys.id, excludeUserId || 0);
  const ids = [];
  const tx = db().transaction((rows) => {
    for (const r of rows) {
      const info = db().prepare(`
        INSERT INTO messages (from_user_id, to_user_id, text, created_at, kind, audio_url, once_only, consumed, image_url)
        VALUES (?, ?, ?, ?, 'text', NULL, 0, 0, '')
      `).run(sys.id, r.id, trimmed, Date.now());
      ids.push({ userId: r.id, messageId: info.lastInsertRowid });
    }
  });
  tx(recipients);
  audit({ userId: excludeUserId || 0, action: "admin.broadcast", detail: `recipients=${recipients.length},len=${trimmed.length}` });
  return { recipients: recipients.length, messageIds: ids, fromUserId: sys.id };
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
// Generic Report (Buschfunk-Comment, Pinnwand-Entry etc.). 1× pro Reporter+Target ist genug.
export function addGenericReport(targetType, targetId, reporterId, reason) {
  const ex = db().prepare(
    "SELECT id FROM generic_reports WHERE target_type=? AND target_id=? AND reporter_user_id=? AND status='open'"
  ).get(targetType, targetId, reporterId);
  if (ex) return ex.id;
  const info = db().prepare(
    "INSERT INTO generic_reports (target_type, target_id, reporter_user_id, reason, status, created_at) VALUES (?, ?, ?, ?, 'open', ?)"
  ).run(targetType, targetId, reporterId, String(reason || "").slice(0, 300), Date.now());
  return info.lastInsertRowid;
}

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
// =================================================================
// 💬 BUSCHFUNK-KOMMENTARE
// =================================================================

// Kommentar hinzufügen — für JEDES Buschfunk-Event-Typ.
// targetType: "status" | "pinnwand" | "gift" | "grouppost" | "newpic"
// text + optional audioUrl (Sprachnachricht)
const VALID_BCOM_TARGETS = new Set(["status", "pinnwand", "gift", "grouppost", "newpic"]);

export function addBuschfunkComment(targetType, postId, userId, text, replyToId = 0, audioUrl = "") {
  const ttype = String(targetType || "status");
  if (!VALID_BCOM_TARGETS.has(ttype)) throw new Error("Ungültiger Kommentar-Typ.");
  const t = String(text || "").trim().slice(0, 500);
  const audio = String(audioUrl || "").slice(0, 400);
  if (!t && !audio) throw new Error("Kommentar leer (weder Text noch Sprachnachricht).");

  // Existenz-Check je nach Typ
  let exists = false;
  if (ttype === "status") {
    exists = !!db().prepare("SELECT id FROM status_updates WHERE id = ?").get(postId);
  } else if (ttype === "pinnwand") {
    exists = !!db().prepare("SELECT id FROM pinnwand WHERE id = ?").get(postId);
  } else if (ttype === "gift") {
    exists = !!db().prepare("SELECT id FROM gifts WHERE id = ?").get(postId);
  } else if (ttype === "grouppost") {
    exists = !!db().prepare("SELECT id FROM group_posts WHERE id = ?").get(postId);
  } else if (ttype === "newpic") {
    exists = !!db().prepare("SELECT id FROM profile_pics WHERE id = ?").get(postId);
  }
  if (!exists) throw new Error("Buschfunk-Eintrag nicht gefunden.");

  // Reply muss zum gleichen Target gehören
  let r2 = 0;
  if (replyToId) {
    const parent = db().prepare(
      "SELECT post_id, target_type, deleted_at FROM buschfunk_comments WHERE id = ?"
    ).get(replyToId);
    if (parent && parent.post_id === Number(postId) && (parent.target_type || "status") === ttype && !parent.deleted_at) {
      r2 = Number(replyToId);
    }
  }
  const info = db().prepare(
    "INSERT INTO buschfunk_comments (post_id, target_type, user_id, text, reply_to_id, audio_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(postId, ttype, userId, t, r2, audio, Date.now());
  return info.lastInsertRowid;
}

// Liste aller Kommentare unter einem Buschfunk-Event (gefiltert nach targetType).
export function listBuschfunkComments(targetType, postId, { byUserId } = {}) {
  const ttype = String(targetType || "status");
  return db().prepare(`
    SELECT c.id, c.user_id, c.text, c.audio_url, c.reply_to_id, c.created_at AS at,
           c.deleted_at, c.deleted_reason,
           u.username, u.display_name, u.emoji, u.gender, u.birthdate,
           u.last_seen, u.avatar_url, u.avatar_status, u.premium_badges,
           u.name_color
      FROM buschfunk_comments c
      JOIN users u ON u.id = c.user_id
     WHERE c.post_id = ? AND COALESCE(c.target_type, 'status') = ?
     ORDER BY c.created_at ASC
  `).all(postId, ttype).map((r) => {
    const stats = getReactionStats("buschfunk_comment", r.id, byUserId || 0);
    return {
      id: r.id,
      userId: r.user_id,
      text: r.deleted_at ? "" : r.text,
      audioUrl: r.deleted_at ? "" : (r.audio_url || ""),
      replyToId: r.reply_to_id || 0,
      at: r.at,
      deleted: !!r.deleted_at,
      deletedReason: r.deleted_reason || "",
      isMine: byUserId ? r.user_id === byUserId : false,
      reactionCounts: stats.counts,
      myReactions: stats.mine,
      from: {
        username: r.username,
        displayName: r.display_name,
        emoji: r.emoji || "",
        gender: r.gender === "m" || r.gender === "w" ? r.gender : "",
        age: ageFromBirthdate(r.birthdate),
        lastSeen: r.last_seen,
        avatarUrl: r.avatar_status === "approved" ? (r.avatar_url || "") : "",
        premiumBadges: r.premium_badges ? String(r.premium_badges).split(",").filter(Boolean) : [],
        nameColor: r.name_color || "",
      },
    };
  });
}

// Soft-Delete: Owner darf eigenen löschen, Admin / Fidolin auch.
// reason: "user" | "owner_post" | "admin" | "fidolin"
export function deleteBuschfunkComment(commentId, byUserId, reason = "user") {
  const c = db().prepare(
    "SELECT id, user_id, post_id, deleted_at FROM buschfunk_comments WHERE id = ?"
  ).get(commentId);
  if (!c) throw new Error("Kommentar nicht gefunden.");
  if (c.deleted_at) return { ok: true, alreadyDeleted: true };
  // Owner des Posts darf auch löschen
  const post = db().prepare("SELECT user_id FROM status_updates WHERE id = ?").get(c.post_id);
  const isCommentAuthor = c.user_id === byUserId;
  const isPostOwner = post?.user_id === byUserId;
  const isAdmin = reason === "admin" || reason === "fidolin";
  if (!isCommentAuthor && !isPostOwner && !isAdmin) {
    throw new Error("Du darfst diesen Kommentar nicht löschen.");
  }
  db().prepare(
    "UPDATE buschfunk_comments SET deleted_at = ?, deleted_reason = ?, deleted_by = ? WHERE id = ?"
  ).run(Date.now(), reason, byUserId, commentId);
  return { ok: true };
}

// Zählt aktive Kommentare pro Post-ID (für Listenanzeige im Buschfunk-Feed).
export function countBuschfunkComments(postIds) {
  if (!postIds || !postIds.length) return {};
  const placeholders = postIds.map(() => "?").join(",");
  const rows = db().prepare(
    `SELECT post_id, COUNT(*) AS n FROM buschfunk_comments
     WHERE post_id IN (${placeholders}) AND deleted_at = 0 GROUP BY post_id`
  ).all(...postIds);
  const out = {};
  for (const r of rows) out[r.post_id] = r.n;
  return out;
}

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

// Liefert die Reaktions-Verteilung pro Eintrag + welche der User selbst gegeben hat.
// → { counts: { like: 3, love: 1, ... }, mine: ["like", "love"] }
export function getReactionStats(targetType, targetId, userId) {
  const rows = db().prepare(
    "SELECT kind, COUNT(*) AS n FROM reactions WHERE target_type=? AND target_id=? GROUP BY kind"
  ).all(targetType, targetId);
  const counts = {};
  for (const r of rows) counts[r.kind] = r.n;
  const mine = userId
    ? db().prepare("SELECT kind FROM reactions WHERE target_type=? AND target_id=? AND user_id=?").all(targetType, targetId, userId).map((r) => r.kind)
    : [];
  return { counts, mine };
}

export function addStatusUpdate(userId, text, imageUrl, { boostedHours = 0, audioUrl = "", mediaJson = "" } = {}) {
  const t = String(text || "").trim().slice(0, 280);
  const img = String(imageUrl || "");
  const audio = String(audioUrl || "");
  const media = String(mediaJson || "");
  if (!t && !img && !audio && !media) return null;
  const now = Date.now();
  const boosted = boostedHours > 0 ? now + boostedHours * 3600_000 : 0;
  const info = db().prepare(
    "INSERT INTO status_updates (user_id, text, image_url, audio_url, media_url, created_at, boosted_until) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(userId, t, img, audio, media, now, boosted);
  return { id: info.lastInsertRowid, boostedUntil: boosted };
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
// Premium-Badges aus CSV-String parsen — für Buschfunk-Actors
function parseBadges(csv) {
  return csv ? String(csv).split(",").filter(Boolean) : [];
}

export function getBuschfunk(limit = 30, viewerId = null) {
  const d = db();
  const events = [];

  for (const p of d.prepare(`
    SELECT p.id AS pid, p.created_at AS at, f.username AS au, f.display_name AS an, f.gender AS ag, f.birthdate AS abd, f.last_seen AS als, f.premium_badges AS abadges,
           t.username AS tu, t.display_name AS tn, t.gender AS tg, t.birthdate AS tbd, t.last_seen AS tls, t.premium_badges AS tbadges,
           p.text AS detail
      FROM pinnwand p
      JOIN users f ON f.id = p.from_user_id
      JOIN users t ON t.id = p.target_user_id
     ORDER BY p.created_at DESC LIMIT ?
  `).all(limit)) {
    events.push({ type: "pinnwand", postId: p.pid, at: p.at, actor: { username: p.au, displayName: p.an, gender: p.ag, age: ageFromBirthdate(p.abd), lastSeen: p.als, premiumBadges: parseBadges(p.abadges) },
      target: { username: p.tu, displayName: p.tn, gender: p.tg, age: ageFromBirthdate(p.tbd), lastSeen: p.tls, premiumBadges: parseBadges(p.tbadges) },
      detail: p.detail });
  }

  for (const g of d.prepare(`
    SELECT g.id AS gid, g.created_at AS at, g.gift_id AS gift, f.username AS au, f.display_name AS an, f.gender AS ag, f.birthdate AS abd, f.last_seen AS als, f.premium_badges AS abadges,
           t.username AS tu, t.display_name AS tn, t.gender AS tg, t.birthdate AS tbd, t.last_seen AS tls, t.premium_badges AS tbadges
      FROM gifts g
      JOIN users f ON f.id = g.from_user_id
      JOIN users t ON t.id = g.target_user_id
     ORDER BY g.created_at DESC LIMIT ?
  `).all(limit)) {
    events.push({ type: "gift", postId: g.gid, at: g.at, gift: g.gift, actor: { username: g.au, displayName: g.an, gender: g.ag, age: ageFromBirthdate(g.abd), lastSeen: g.als, premiumBadges: parseBadges(g.abadges) },
      target: { username: g.tu, displayName: g.tn, gender: g.tg, age: ageFromBirthdate(g.tbd), lastSeen: g.tls, premiumBadges: parseBadges(g.tbadges) } });
  }

  for (const gp of d.prepare(`
    SELECT gp.created_at AS at, u.username AS au, u.display_name AS an, u.gender AS ag, u.birthdate AS abd, u.last_seen AS als, u.premium_badges AS abadges,
           gr.slug AS gslug, gr.name AS gname, gp.text AS detail
      FROM group_posts gp
      JOIN users u ON u.id = gp.user_id
      JOIN groups gr ON gr.id = gp.group_id
     ORDER BY gp.created_at DESC LIMIT ?
  `).all(limit)) {
    events.push({ type: "grouppost", at: gp.at, actor: { username: gp.au, displayName: gp.an, gender: gp.ag, age: ageFromBirthdate(gp.abd), lastSeen: gp.als, premiumBadges: parseBadges(gp.abadges) },
      group: { slug: gp.gslug, name: gp.gname }, detail: gp.detail });
  }

  for (const u of d.prepare(`
    SELECT created_at AS at, username AS au, display_name AS an, gender AS ag, birthdate AS abd, last_seen AS als, premium_badges AS abadges
      FROM users ORDER BY created_at DESC LIMIT 10
  `).all()) {
    events.push({ type: "newuser", at: u.at, actor: { username: u.au, displayName: u.an, gender: u.ag, age: ageFromBirthdate(u.abd), lastSeen: u.als, premiumBadges: parseBadges(u.abadges) } });
  }

  for (const p of d.prepare(`
    SELECT p.id AS picId, p.url AS picUrl, p.created_at AS at,
           u.username AS au, u.display_name AS an, u.gender AS ag, u.birthdate AS abd, u.last_seen AS als, u.premium_badges AS abadges
      FROM profile_pics p JOIN users u ON u.id = p.user_id
     WHERE p.status = 'approved' ORDER BY p.created_at DESC LIMIT ?
  `).all(limit)) {
    events.push({ type: "newpic", postId: p.picId, at: p.at, picId: p.picId, picUrl: p.picUrl,
      actor: { username: p.au, displayName: p.an, gender: p.ag, age: ageFromBirthdate(p.abd), lastSeen: p.als, premiumBadges: parseBadges(p.abadges) } });
  }

  for (const s of d.prepare(`
    SELECT s.id AS postId, s.text AS detail, s.image_url AS picUrl, s.audio_url AS audioUrl,
           s.media_url AS mediaJson,
           s.created_at AS at, s.boosted_until AS boostedUntil,
           u.username AS au, u.display_name AS an, u.emoji AS ae, u.gender AS ag, u.birthdate AS abd, u.last_seen AS als, u.premium_badges AS abadges
      FROM status_updates s JOIN users u ON u.id = s.user_id
     ORDER BY s.created_at DESC LIMIT ?
  `).all(limit)) {
    events.push({ type: "status", postId: s.postId, at: s.at, detail: s.detail, picUrl: s.picUrl || "",
      audioUrl: s.audioUrl || "", media: s.mediaJson || "",
      boostedUntil: s.boostedUntil || 0,
      actor: { username: s.au, displayName: s.an, emoji: s.ae, gender: s.ag, age: ageFromBirthdate(s.abd), lastSeen: s.als, premiumBadges: parseBadges(s.abadges) } });
  }

  // Avatar-URLs nachladen (1 Query fuer alle beteiligten User)
  if (events.length > 0) {
    const unames = new Set();
    for (const ev of events) {
      if (ev.actor?.username) unames.add(ev.actor.username);
      if (ev.target?.username) unames.add(ev.target.username);
    }
    if (unames.size > 0) {
      const ph = Array.from(unames).map(() => "?").join(",");
      const avMap = new Map();
      for (const u of d.prepare(`SELECT username, avatar_url, avatar_status FROM users WHERE username IN (${ph})`).all(...unames)) {
        avMap.set(u.username, u.avatar_status === "approved" ? (u.avatar_url || "") : "");
      }
      for (const ev of events) {
        if (ev.actor?.username) ev.actor.avatarUrl = avMap.get(ev.actor.username) || "";
        if (ev.target?.username) ev.target.avatarUrl = avMap.get(ev.target.username) || "";
      }
    }
  }

  // Anti-Inflation: Boost wirkt nur fuer dauer-begrenzte Zeit (24h ab Post).
  const now = Date.now();

  // Freunde-Markierung VOR Sort: Eigene + Top-Friends + Messaging-Partner + Partner
  let friendSet = null;
  if (viewerId) {
    friendSet = friendUsernamesFor(viewerId);
    for (const ev of events) {
      ev.isFriend = !!(ev.actor && friendSet.has(ev.actor.username));
    }
  }

  // Sort: Boost > Friend > Zeit
  return events.sort((a, b) => {
    const ab = (a.boostedUntil || 0) > now;
    const bb = (b.boostedUntil || 0) > now;
    if (ab !== bb) return ab ? -1 : 1;
    if (friendSet) {
      if (!!a.isFriend !== !!b.isFriend) return a.isFriend ? -1 : 1;
    }
    return b.at - a.at;
  }).slice(0, limit);
}

// Username-Set fuer die "Freunde"-Trennlinie im Buschfunk-Feed.
function friendUsernamesFor(userId) {
  const d = db();
  const ids = new Set();
  ids.add(Number(userId)); // sich selbst zaehlt auch als "Freund" (eigene Posts bleiben oben)
  // Top-Friends (gepinnt von mir)
  for (const r of d.prepare("SELECT buddy_id FROM top_friends WHERE user_id = ?").all(userId)) ids.add(r.buddy_id);
  // Wer mich gepinnt hat
  for (const r of d.prepare("SELECT user_id FROM top_friends WHERE buddy_id = ?").all(userId)) ids.add(r.user_id);
  // Konversations-Partner (mind. 1 Nachricht in beide oder eine Richtung)
  for (const r of d.prepare("SELECT DISTINCT to_user_id AS id FROM messages WHERE from_user_id = ?").all(userId)) ids.add(r.id);
  for (const r of d.prepare("SELECT DISTINCT from_user_id AS id FROM messages WHERE to_user_id = ?").all(userId)) ids.add(r.id);
  // Partner (verlinkte Beziehung)
  const me = d.prepare("SELECT partner_user_id FROM users WHERE id = ?").get(userId);
  if (me?.partner_user_id) ids.add(me.partner_user_id);
  const usernames = new Set();
  for (const id of ids) {
    const u = d.prepare("SELECT username FROM users WHERE id = ?").get(id);
    if (u?.username) usernames.add(u.username);
  }
  return usernames;
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
// Name-Color + Profil-Skin (aktive Auswahl wechseln — nur gekauftes erlaubt)
// ============================================================
import { NAME_COLOR_KEYS, PROFILE_SKIN_KEYS } from "@/lib/premium";

export function setNameColor(userId, key) {
  const k = key === "" ? "" : (NAME_COLOR_KEYS.includes(key) ? key : null);
  if (k === null) throw new Error("Ungültige Name-Color.");
  if (k) {
    const flags = getPremiumBadges(userId);
    if (!flags.includes(`color_${k}`)) throw new Error("Diese Name-Color hast du noch nicht gekauft.");
  }
  db().prepare("UPDATE users SET name_color = ? WHERE id = ?").run(k, userId);
  return k;
}

export function setProfileSkin(userId, key) {
  const k = key === "" ? "" : (PROFILE_SKIN_KEYS.includes(key) ? key : null);
  if (k === null) throw new Error("Ungültiger Profil-Skin.");
  if (k) {
    const flags = getPremiumBadges(userId);
    if (!flags.includes(`skin_${k}`)) throw new Error("Diesen Skin hast du noch nicht gekauft.");
  }
  db().prepare("UPDATE users SET profile_skin = ? WHERE id = ?").run(k, userId);
  return k;
}

// Buschfunk-Boost beim Posten verbrauchen. Gibt true zurück wenn Boost angewendet wurde.
// Anti-Inflation: verfallener Stock wird hier auf 0 gezogen.
export function consumeBuschfunkBoost(userId) {
  const row = db().prepare(
    "SELECT buschfunk_boosts, buschfunk_boosts_expire_at FROM users WHERE id = ?"
  ).get(userId);
  const expired = !!(row?.buschfunk_boosts_expire_at && Date.now() >= row.buschfunk_boosts_expire_at);
  if (expired && (row?.buschfunk_boosts || 0) > 0) {
    db().prepare(
      "UPDATE users SET buschfunk_boosts = 0, buschfunk_boosts_expire_at = 0 WHERE id = ?"
    ).run(userId);
    return false;
  }
  const have = row?.buschfunk_boosts || 0;
  if (have <= 0) return false;
  db().prepare("UPDATE users SET buschfunk_boosts = buschfunk_boosts - 1 WHERE id = ?").run(userId);
  return true;
}

// ============================================================
// Werbung / Rewarded-Ads (Anti-Cheat)
// ============================================================
// Limits — alle prüfbar gegen credit_tx (single source of truth fuer Vibes-Bewegungen).
export const ADS_MAX_PER_DAY      = 5;     // max Anzahl Reward-Anzeigen pro User pro Tag
export const ADS_MAX_VIBES_PER_DAY= 75;    // max Vibes pro User pro Tag aus Werbung
export const ADS_COOLDOWN_MS      = 60_000; // min Pause zwischen zwei Rewards
export const ADS_REWARD_AMOUNT    = 15;     // Vibes pro vollendetem Rewarded-Video
export const ADS_TOKEN_TTL_MS     = 5 * 60_000; // Token gilt 5 Minuten
export const ADS_MIN_ACCOUNT_AGE_HOURS = 24;    // Neue Accounts: erst nach 24h Ads
export const ADS_IP_MAX_ACCOUNTS_24H = 5;       // IP-Sperre wenn > N Accounts/24h

// ============================================================
// Fidolin-Watchdog — generischer Flag-Mechanismus
// ============================================================
// Jedes System (Ads, Vibes-Spending, Live, ...) kann Verdachtsmomente
// hier ablegen. Admin-Panel kann sie sichten + bearbeiten.

export function flagFidolin({ userId, kind, severity = 1, reason = "", refType = null, refId = null, payload = null, action = null }) {
  const sev = Math.max(1, Math.min(4, Number(severity) || 1));
  db().prepare(`
    INSERT INTO fidolin_flags (user_id, kind, severity, reason, ref_type, ref_id, payload, at, action)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, String(kind || "unknown"), sev, String(reason || "").slice(0, 500),
         refType, refId, payload ? String(payload).slice(0, 2000) : null,
         Date.now(), action || null);
}

export function listFidolinFlags({ kind, userId, since, limit = 200 } = {}) {
  const conds = [];
  const args = [];
  if (kind)   { conds.push("kind = ?");      args.push(kind); }
  if (userId) { conds.push("user_id = ?");   args.push(userId); }
  if (since)  { conds.push("at >= ?");       args.push(since); }
  const where = conds.length ? "WHERE " + conds.join(" AND ") : "";
  args.push(Math.max(1, Math.min(500, Number(limit) || 200)));
  return db().prepare(`
    SELECT id, user_id AS userId, kind, severity, reason, ref_type AS refType,
           ref_id AS refId, payload, at, reviewed_at AS reviewedAt, action
      FROM fidolin_flags
      ${where}
     ORDER BY at DESC LIMIT ?
  `).all(...args);
}

// Heuristik fuer Ad-Reward: nach jedem grant prueft Fidolin Muster.
// Gibt {severity, reasons[]} zurueck. Bei severity >= 3 ruft completeAdImpression
// den Reward zurueck.
function fidolinReviewAdImpression(impressionId) {
  const imp = db().prepare("SELECT * FROM ad_impressions WHERE id = ?").get(impressionId);
  if (!imp) return { severity: 0, reasons: [] };
  const reasons = [];
  let severity = 0;
  const now = Date.now();

  // 1) Burst: 3+ Rewards in den letzten 5 Minuten von DIESEM User
  const burstCount = db().prepare(`
    SELECT COUNT(*) AS n FROM ad_impressions
     WHERE user_id = ? AND status = 'completed' AND completed_at >= ?
  `).get(imp.user_id, now - 5 * 60_000)?.n || 0;
  if (burstCount >= 3) {
    severity = Math.max(severity, 2);
    reasons.push(`Burst: ${burstCount} Rewards in 5 Min`);
  }

  // 2) IP-Cluster: gleiche IP nutzt >= 3 verschiedene Accounts in 24h
  if (imp.ip && imp.ip !== "unknown") {
    const distinct = db().prepare(`
      SELECT COUNT(DISTINCT user_id) AS n FROM ad_impressions
       WHERE ip = ? AND started_at >= ?
    `).get(imp.ip, now - 24 * 3600_000)?.n || 0;
    if (distinct >= 3) {
      severity = Math.max(severity, 3);
      reasons.push(`IP-Cluster: ${distinct} Accounts an dieser IP /24h`);
    }
  }

  // 3) Neues Konto + max Reward in 24h = sus
  const u = db().prepare("SELECT created_at FROM users WHERE id = ?").get(imp.user_id);
  const ageH = u?.created_at ? (now - u.created_at) / 3600_000 : 999;
  if (ageH < 48 && burstCount >= 2) {
    severity = Math.max(severity, 2);
    reasons.push(`Neuer Account (${ageH.toFixed(0)}h) mit ${burstCount} Rewards`);
  }

  // 4) Zu schnell vollendet (unter Min-Watch-Time + 1 Sek Tolerance)
  if (imp.completed_at && imp.started_at) {
    const elapsed = imp.completed_at - imp.started_at;
    if (elapsed < 10_000) {
      severity = Math.max(severity, 4);
      reasons.push(`Reward in ${elapsed}ms — eindeutig manipuliert`);
    }
  }

  return { severity, reasons };
}
// v: 1 = ja personalisiert, 2 = ja nicht-personalisiert, -1 = nein
export function setAdsConsent(userId, v) {
  if (![1, 2, -1].includes(Number(v))) throw new Error("Ungueltiger Consent-Wert.");
  db().prepare("UPDATE users SET ads_consent = ?, ads_consent_at = ? WHERE id = ?")
    .run(Number(v), Date.now(), userId);
  return { consent: Number(v), at: Date.now() };
}

export function getAdsConsent(userId) {
  const row = db().prepare(
    "SELECT ads_consent AS consent, ads_consent_at AS at FROM users WHERE id = ?"
  ).get(userId);
  return { consent: row?.consent || 0, at: row?.at || 0 };
}

// Aktuelle Reward-Stats des Users (heute).
export function getAdRewardStats(userId) {
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const todayKey = startOfDay.getTime();
  const row = db().prepare(`
    SELECT COUNT(*) AS n, COALESCE(SUM(reward_amount),0) AS vibes
      FROM ad_impressions
     WHERE user_id = ? AND status = 'completed' AND completed_at >= ?
  `).get(userId, todayKey);
  const lastDone = db().prepare(`
    SELECT completed_at FROM ad_impressions
     WHERE user_id = ? AND status = 'completed'
     ORDER BY completed_at DESC LIMIT 1
  `).get(userId)?.completed_at || 0;
  const pendingCount = db().prepare(`
    SELECT COUNT(*) AS n FROM ad_impressions
     WHERE user_id = ? AND status = 'pending' AND started_at >= ?
  `).get(userId, Date.now() - ADS_TOKEN_TTL_MS)?.n || 0;
  return {
    rewardsToday: row?.n || 0,
    vibesToday: row?.vibes || 0,
    maxRewardsPerDay: ADS_MAX_PER_DAY,
    maxVibesPerDay:   ADS_MAX_VIBES_PER_DAY,
    cooldownMs:       ADS_COOLDOWN_MS,
    nextRewardAt:     Math.max(0, (lastDone || 0) + ADS_COOLDOWN_MS),
    pendingCount,
    rewardAmount:     ADS_REWARD_AMOUNT,
  };
}

// VIP aktiv? VIPs sehen keine Werbung — koennen aber auch keine Rewards abgreifen.
export function isVipActive(userId) {
  const r = db().prepare("SELECT vip_until FROM users WHERE id = ?").get(userId);
  return (r?.vip_until || 0) > Date.now();
}

// Anti-Cheat: pruefen ob User aktuell Reward-Ad starten darf.
// Wirft Error bei Verletzung, gibt sonst {reason: null}.
export function checkCanStartAd(userId, ip) {
  if (isVipActive(userId)) return { allow: false, reason: "VIP-User bekommen keine Werbe-Rewards (du hast schon alles 😉)." };
  // Account-Alter
  const u = db().prepare("SELECT created_at FROM users WHERE id = ?").get(userId);
  if (u?.created_at && Date.now() - u.created_at < ADS_MIN_ACCOUNT_AGE_HOURS * 3600_000) {
    return { allow: false, reason: `Werbe-Rewards erst nach ${ADS_MIN_ACCOUNT_AGE_HOURS}h Account-Alter (Anti-Bot).` };
  }
  // Daily-Caps
  const s = getAdRewardStats(userId);
  if (s.rewardsToday >= ADS_MAX_PER_DAY) {
    return { allow: false, reason: `Tageslimit erreicht (${ADS_MAX_PER_DAY} Videos/Tag).` };
  }
  if (s.vibesToday >= ADS_MAX_VIBES_PER_DAY) {
    return { allow: false, reason: `Tages-Vibes-Limit aus Werbung erreicht (${ADS_MAX_VIBES_PER_DAY} ✨/Tag).` };
  }
  // Cooldown
  if (s.nextRewardAt > Date.now()) {
    const wait = Math.ceil((s.nextRewardAt - Date.now()) / 1000);
    return { allow: false, reason: `Cooldown — noch ${wait} Sek.` };
  }
  // Maximal 1 offene Session pro User
  if (s.pendingCount >= 1) {
    return { allow: false, reason: "Du hast schon eine laufende Werbung — beende sie erst." };
  }
  // IP-Sperre: gleiche IP > N verschiedene Accounts in 24h
  if (ip) {
    const since = Date.now() - 24 * 3600_000;
    const distinct = db().prepare(`
      SELECT COUNT(DISTINCT user_id) AS n FROM ad_impressions
       WHERE ip = ? AND started_at >= ?
    `).get(ip, since)?.n || 0;
    if (distinct > ADS_IP_MAX_ACCOUNTS_24H) {
      return { allow: false, reason: "Verdacht auf Mehrfach-Account — kontaktier das Team falls das ein Fehler ist." };
    }
  }
  return { allow: true };
}

// Ad-Impression-Lookup fuer Simulator-Endpoint (Wartezeit-Check).
export function getAdImpressionByToken(token) {
  return db().prepare("SELECT * FROM ad_impressions WHERE token = ?").get(String(token || ""));
}

// Neue Ad-Session anlegen, gibt Token zurueck.
export function createAdImpression(userId, slot, provider, ip) {
  const token = crypto.randomBytes(32).toString("hex");
  db().prepare(`
    INSERT INTO ad_impressions (user_id, provider, slot, token, reward_amount, status, started_at, ip)
    VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
  `).run(userId, provider, slot, token, ADS_REWARD_AMOUNT, Date.now(), ip || null);
  return { token, rewardAmount: ADS_REWARD_AMOUNT };
}

// Token-Validierung + Reward-Granting (atomic).
// payload = optionale Provider-Daten (signed callback body, etc.) zum Audit speichern.
// Gibt {ok, balance, rewarded} oder {ok:false, error}
export function completeAdImpression(token, { providerVerified = false, payload = null } = {}) {
  const tx = db().transaction(() => {
    const row = db().prepare(
      "SELECT * FROM ad_impressions WHERE token = ?"
    ).get(token);
    if (!row) return { ok: false, error: "Ungueltiger Token." };
    if (row.status !== "pending") return { ok: false, error: `Bereits ${row.status}.` };
    if (Date.now() - row.started_at > ADS_TOKEN_TTL_MS) {
      db().prepare("UPDATE ad_impressions SET status='expired' WHERE id = ?").run(row.id);
      return { ok: false, error: "Token abgelaufen." };
    }
    // Anti-Cheat: bei production muss providerVerified=true sein
    const requireProvider = process.env.ADS_PROVIDER && process.env.ADS_PROVIDER !== "simulator";
    if (requireProvider && !providerVerified) {
      db().prepare("UPDATE ad_impressions SET status='invalid' WHERE id = ?").run(row.id);
      return { ok: false, error: "Anbieter-Verifikation fehlgeschlagen." };
    }
    // Anti-Cheat: Vor Reward nochmal Tages-Cap pruefen (TOCTOU-sicher)
    const s = getAdRewardStats(row.user_id);
    if (s.rewardsToday >= ADS_MAX_PER_DAY || s.vibesToday + row.reward_amount > ADS_MAX_VIBES_PER_DAY) {
      db().prepare("UPDATE ad_impressions SET status='invalid' WHERE id = ?").run(row.id);
      return { ok: false, error: "Tages-Cap erreicht — Reward nicht gewaehrt." };
    }
    // Mark completed FIRST, dann Vibes gewähren (single source of truth).
    db().prepare(`
      UPDATE ad_impressions
         SET status='completed', completed_at=?, callback_payload=?
       WHERE id = ?
    `).run(Date.now(), payload ? String(payload).slice(0, 2000) : null, row.id);
    ensureCreditsRow(row.user_id);
    db().prepare("UPDATE credits SET balance = balance + ? WHERE user_id = ?").run(row.reward_amount, row.user_id);
    db().prepare(`
      INSERT INTO credit_tx (user_id, amount, reason, ref_type, ref_id, at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(row.user_id, row.reward_amount, `ad_reward:${row.slot}`, "ad_impression", row.id, Date.now());
    let newBal = db().prepare("SELECT balance FROM credits WHERE user_id = ?").get(row.user_id)?.balance || 0;

    // FIDOLIN-WATCHDOG: nach jedem Grant Muster pruefen
    const review = fidolinReviewAdImpression(row.id);
    if (review.severity > 0) {
      flagFidolin({
        userId: row.user_id, kind: "ad_reward", severity: review.severity,
        reason: review.reasons.join(" · "),
        refType: "ad_impression", refId: row.id,
        payload: JSON.stringify({ slot: row.slot, provider: row.provider, ip: row.ip }),
        action: review.severity >= 3 ? "rolled_back" : null,
      });
      // Bei hoher Schwere: Reward sofort wieder einkassieren
      if (review.severity >= 3) {
        db().prepare("UPDATE credits SET balance = balance - ? WHERE user_id = ?")
          .run(row.reward_amount, row.user_id);
        db().prepare(`
          INSERT INTO credit_tx (user_id, amount, reason, ref_type, ref_id, at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(row.user_id, -row.reward_amount, `ad_reward_rollback:${row.slot}`,
               "ad_impression", row.id, Date.now());
        db().prepare("UPDATE ad_impressions SET status='invalid' WHERE id = ?").run(row.id);
        newBal = db().prepare("SELECT balance FROM credits WHERE user_id = ?").get(row.user_id)?.balance || 0;
        return { ok: false, error: `Fidolin: Verdacht — Reward zurueckgerollt (${review.reasons.join("; ")}).`, balance: newBal };
      }
    }

    return { ok: true, balance: newBal, rewarded: row.reward_amount, flagged: review.severity > 0 };
  });
  return tx();
}

// Anti-Inflation: aktuelle Boost-Anzeige für UI — berücksichtigt Verfall.
export function getBuschfunkBoostStatus(userId) {
  const row = db().prepare(
    "SELECT buschfunk_boosts, buschfunk_boosts_expire_at FROM users WHERE id = ?"
  ).get(userId);
  const expireAt = row?.buschfunk_boosts_expire_at || 0;
  const expired = expireAt && Date.now() >= expireAt;
  return {
    count: expired ? 0 : (row?.buschfunk_boosts || 0),
    expireAt: expired ? 0 : expireAt,
  };
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

// ============================================================
// POI-Effekt direkt auf VIBO anwenden (Pflege-Boost aus realen Orten).
// effect: { hunger, fun, hygiene, affection, health, cureAll?, cureLight? }
// ============================================================
export function applyViboPoiEffect(userId, effect = {}) {
  const v = tickAndPersistVibo(userId);
  if (!v) throw new Error("Du hast noch kein VIBO.");
  if (v.died_at) throw new Error("Dein VIBO ist verstorben.");
  const next = {
    hunger:    viboClamp(v.hunger    + (effect.hunger    || 0)),
    fun:       viboClamp(v.fun       + (effect.fun       || 0)),
    hygiene:   viboClamp(v.hygiene   + (effect.hygiene   || 0)),
    affection: viboClamp(v.affection + (effect.affection || 0)),
    health:    viboClamp(v.health    + (effect.health    || 0)),
  };
  let cured = "";
  if (effect.cureAll && v.sick) {
    cured = v.sick;
  } else if (effect.cureLight && v.sick && (v.sick === "erkaeltung" || v.sick === "bauchweh")) {
    cured = v.sick;
  }
  db().prepare(`
    UPDATE vibos SET hunger=?, fun=?, hygiene=?, affection=?, health=?, sick=?, sick_since=?, last_tick_at=?
    WHERE user_id=?
  `).run(
    next.hunger, next.fun, next.hygiene, next.affection, next.health,
    cured ? "" : (v.sick || ""),
    cured ? 0 : (v.sick_since || 0),
    Date.now(),
    userId,
  );
  return { ...next, cured };
}

// ============================================================
// POI-Nutzung (Apotheke, Park, Hotel, …) — Cooldowns pro Kategorie.
// ============================================================
export function lastPoiUseByKind(userId, kind) {
  const row = db().prepare(
    "SELECT used_at AS usedAt, poi_osm_id AS osmId FROM poi_uses WHERE user_id = ? AND poi_kind = ? ORDER BY used_at DESC LIMIT 1"
  ).get(userId, kind);
  return row || null;
}

export function recordPoiUse(userId, kind, osmId) {
  const now = Date.now();
  db().prepare(
    "INSERT INTO poi_uses (user_id, poi_kind, poi_osm_id, used_at) VALUES (?, ?, ?, ?)"
  ).run(userId, kind, String(osmId || ""), now);
  return now;
}

export function listRecentPoiUses(userId, sinceMs) {
  return db().prepare(
    "SELECT poi_kind AS kind, poi_osm_id AS osmId, used_at AS usedAt FROM poi_uses WHERE user_id = ? AND used_at >= ? ORDER BY used_at DESC"
  ).all(userId, sinceMs);
}

// ============================================================
// „Behalten"-Flag für Fänge (Aquarium / Trophäen).
// ============================================================
export function setSellableKept(userId, id, kept) {
  const r = db().prepare(
    "UPDATE sellables SET kept = ? WHERE id = ? AND user_id = ? AND sold_at = 0"
  ).run(kept ? 1 : 0, id, userId);
  return r.changes > 0;
}

export function listKeptSellables(userId) {
  return db().prepare(`
    SELECT id, item_id AS itemId, label, emoji, category, size_cm AS sizeCm, base_value AS baseValue, caught_at AS caughtAt
      FROM sellables WHERE user_id = ? AND sold_at = 0 AND kept = 1
     ORDER BY caught_at DESC
  `).all(userId);
}

// ============================================================
// Standort-Einverständnis (in-App). Browser-Permission läuft separat.
// ============================================================
export function getLocationConsent(userId) {
  const row = db().prepare("SELECT location_consent AS c FROM users WHERE id = ?").get(userId);
  return row ? Number(row.c || 0) : 0;
}

export function setLocationConsent(userId, value) {
  const v = value === true || value === 1 ? 1 : (value === false || value === -1 ? -1 : 0);
  db().prepare("UPDATE users SET location_consent = ? WHERE id = ?").run(v, userId);
  return v;
}

// ============================================================
// 🔔 Push-Präferenzen (pro User, pro Typ ein/aus). Defaults: alles an.
// ============================================================
export const PUSH_PREF_DEFAULTS = {
  message:      true,   // Chat-Nachrichten
  gift:         true,   // Profil-Geschenke
  live_started: true,   // wenn jemand live geht (Fan-Push)
  nudge:        true,   // Anklopfen
  call:         true,   // Anrufe
  pinnwand:     true,   // Pinnwand-Posts auf eigener Wand
  mod:          true,   // Mod- / Cohost-Promotion
};

export function getPushPrefs(userId) {
  const row = db().prepare("SELECT push_prefs AS p FROM users WHERE id = ?").get(userId);
  let prefs = {};
  if (row?.p) { try { prefs = JSON.parse(row.p); } catch {} }
  return { ...PUSH_PREF_DEFAULTS, ...prefs };
}

export function setPushPrefs(userId, prefs) {
  const merged = {};
  for (const k of Object.keys(PUSH_PREF_DEFAULTS)) {
    merged[k] = prefs?.[k] === false ? false : !!(prefs?.[k] ?? PUSH_PREF_DEFAULTS[k]);
  }
  db().prepare("UPDATE users SET push_prefs = ? WHERE id = ?").run(JSON.stringify(merged), userId);
  return merged;
}

// ============================================================
// 🌟 Top-5-Freunde (MySpace „Top 8"-Nostalgie). Bis zu 5 Slots.
// ============================================================
export const TOP_FRIENDS_MAX = 5;

export function listTopFriends(userId) {
  return db().prepare(`
    SELECT tf.slot, tf.pinned_at AS pinnedAt,
           u.id, u.username, u.display_name AS displayName,
           u.gender, u.birthdate, u.last_seen AS lastSeen,
           u.avatar_url AS avatarUrl, u.premium_badges AS premiumBadges
      FROM top_friends tf
      JOIN users u ON u.id = tf.buddy_id
     WHERE tf.user_id = ? AND u.status = 'approved'
     ORDER BY tf.slot ASC
  `).all(userId).map((r) => ({
    slot: r.slot, pinnedAt: r.pinnedAt,
    id: r.id, username: r.username, displayName: r.displayName,
    gender: r.gender, age: ageFromBirthdate(r.birthdate),
    lastSeen: r.lastSeen, avatarUrl: r.avatarUrl,
    premiumBadges: parseBadges(r.premiumBadges),
  }));
}

// Alle User die "userId" in ihrer Top-5 haben (= deine Fans).
// Wird für „X ist live"-Push-Benachrichtigungen genutzt.
export function listFansOf(userId) {
  return db().prepare(`
    SELECT DISTINCT tf.user_id AS fanId
      FROM top_friends tf
      JOIN users u ON u.id = tf.user_id
     WHERE tf.buddy_id = ? AND u.status = 'approved'
  `).all(userId).map((r) => r.fanId);
}

export function pinTopFriend(userId, buddyId, slot) {
  const s = Math.max(1, Math.min(TOP_FRIENDS_MAX, Number(slot)));
  if (Number(buddyId) === Number(userId)) throw new Error("Du kannst dich nicht selbst pinnen.");
  const buddy = db().prepare("SELECT id FROM users WHERE id = ? AND status = 'approved'").get(buddyId);
  if (!buddy) throw new Error("User nicht gefunden.");
  // Falls Buddy schon in einem anderen Slot ist → erst raus, sonst Konflikt
  db().prepare("DELETE FROM top_friends WHERE user_id = ? AND buddy_id = ?").run(userId, buddyId);
  db().prepare(`
    INSERT INTO top_friends (user_id, buddy_id, slot, pinned_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, slot) DO UPDATE SET buddy_id = excluded.buddy_id, pinned_at = excluded.pinned_at
  `).run(userId, buddyId, s, Date.now());
  return listTopFriends(userId);
}

export function unpinTopFriend(userId, slot) {
  db().prepare("DELETE FROM top_friends WHERE user_id = ? AND slot = ?").run(userId, Number(slot));
  return listTopFriends(userId);
}

// ============================================================
// 🎥 Live-Streams (Solo + Multi)
// ============================================================

export function createLiveStream({
  ownerId, title, mode = "solo", hasVideo = true, hasAudio = true,
  maxHosts = 1, hostPolicy = "open",
}) {
  const now = Date.now();
  // Verhindern: User streamt schon
  const active = db().prepare(
    "SELECT id FROM live_streams WHERE owner_id = ? AND status = 'live' LIMIT 1"
  ).get(ownerId);
  if (active) throw new Error("Du hast schon einen aktiven Live-Stream.");
  // Live-Sperre (nach Strikes)
  const u = db().prepare("SELECT live_blocked_until AS lbu FROM users WHERE id = ?").get(ownerId);
  if (u && u.lbu && u.lbu > now) {
    const hours = Math.ceil((u.lbu - now) / 3600_000);
    const lbl = hours > 48 ? `${Math.ceil(hours / 24)} Tage` : `${hours} h`;
    throw new Error(`Live-Sperre — du darfst erst wieder in ~${lbl} live gehen.`);
  }
  const policy = hostPolicy === "request" ? "request" : "open";

  const tx = db().transaction(() => {
    const r = db().prepare(`
      INSERT INTO live_streams (owner_id, title, mode, has_video, has_audio, max_hosts, host_policy, status, started_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'live', ?)
    `).run(ownerId, String(title || "").slice(0, 100), mode, hasVideo ? 1 : 0, hasAudio ? 1 : 0, Number(maxHosts), policy, now);
    const sid = Number(r.lastInsertRowid);
    db().prepare(`
      INSERT INTO live_stream_hosts (stream_id, user_id, role, joined_at) VALUES (?, ?, 'owner', ?)
    `).run(sid, ownerId, now);
    return sid;
  });
  return tx();
}

export function endLiveStream(streamId, byUserId) {
  const s = db().prepare("SELECT owner_id AS ownerId, status FROM live_streams WHERE id = ?").get(streamId);
  if (!s) throw new Error("Stream nicht gefunden.");
  if (s.status !== "live") return { ok: true, alreadyEnded: true };
  if (s.ownerId !== byUserId) throw new Error("Nur der Owner kann beenden.");
  const now = Date.now();
  db().prepare("UPDATE live_streams SET status = 'ended', ended_at = ? WHERE id = ?").run(now, streamId);
  db().prepare("UPDATE live_stream_hosts SET left_at = ? WHERE stream_id = ? AND left_at IS NULL").run(now, streamId);
  return { ok: true };
}

export function listLiveStreams(limit = 30) {
  return db().prepare(`
    SELECT s.id, s.title, s.mode, s.has_video AS hasVideo, s.has_audio AS hasAudio,
           s.max_hosts AS maxHosts, s.started_at AS startedAt, s.viewer_peak AS viewerPeak,
           u.username, u.display_name AS displayName, u.gender, u.birthdate,
           u.avatar_url AS avatarUrl, u.last_seen AS lastSeen, u.premium_badges AS premiumBadges,
           (SELECT COUNT(*) FROM live_stream_viewers v
              WHERE v.stream_id = s.id AND v.last_seen > ?) AS viewerCount,
           (SELECT COUNT(*) FROM live_stream_hosts h
              WHERE h.stream_id = s.id AND h.left_at IS NULL) AS hostCount
      FROM live_streams s
      JOIN users u ON u.id = s.owner_id
     WHERE s.status = 'live'
     ORDER BY s.started_at DESC
     LIMIT ?
  `).all(Date.now() - 60_000, limit).map((r) => ({
    id: r.id, title: r.title, mode: r.mode,
    hasVideo: !!r.hasVideo, hasAudio: !!r.hasAudio, maxHosts: r.maxHosts,
    startedAt: r.startedAt, viewerCount: r.viewerCount, hostCount: r.hostCount, viewerPeak: r.viewerPeak,
    owner: { username: r.username, displayName: r.displayName, gender: r.gender,
      age: ageFromBirthdate(r.birthdate), avatarUrl: r.avatarUrl, lastSeen: r.lastSeen,
      premiumBadges: parseBadges(r.premiumBadges) },
  }));
}

export function getLiveStream(streamId) {
  const s = db().prepare(`
    SELECT s.*, u.username, u.display_name AS displayName, u.gender, u.birthdate,
           u.avatar_url AS avatarUrl, u.last_seen AS lastSeen, u.premium_badges AS premiumBadges
      FROM live_streams s JOIN users u ON u.id = s.owner_id WHERE s.id = ?
  `).get(streamId);
  if (!s) return null;
  return {
    id: s.id, title: s.title, mode: s.mode,
    hasVideo: !!s.has_video, hasAudio: !!s.has_audio, maxHosts: s.max_hosts,
    status: s.status, startedAt: s.started_at, endedAt: s.ended_at,
    viewerPeak: s.viewer_peak, totalVibes: s.total_vibes,
    ownerId: s.owner_id,
    owner: { username: s.username, displayName: s.displayName, gender: s.gender,
      age: ageFromBirthdate(s.birthdate), avatarUrl: s.avatarUrl, lastSeen: s.lastSeen,
      premiumBadges: parseBadges(s.premiumBadges) },
  };
}

export function listLiveHosts(streamId) {
  return db().prepare(`
    SELECT h.user_id AS userId, h.role, h.joined_at AS joinedAt,
           u.username, u.display_name AS displayName, u.gender, u.birthdate,
           u.avatar_url AS avatarUrl, u.last_seen AS lastSeen, u.premium_badges AS premiumBadges
      FROM live_stream_hosts h JOIN users u ON u.id = h.user_id
     WHERE h.stream_id = ? AND h.left_at IS NULL
     ORDER BY h.joined_at ASC
  `).all(streamId).map((r) => ({
    userId: r.userId, role: r.role, joinedAt: r.joinedAt,
    username: r.username, displayName: r.displayName, gender: r.gender,
    age: ageFromBirthdate(r.birthdate), avatarUrl: r.avatarUrl, lastSeen: r.lastSeen,
    premiumBadges: parseBadges(r.premiumBadges),
  }));
}

// joinLiveHost: bei 'open'-Policy direkt rein; bei 'request' wird Anfrage angelegt
// und 'pendingRequest: true' zurückgegeben. Owner muss dann approveLiveHostRequest aufrufen.
export function joinLiveHost(streamId, userId) {
  const s = db().prepare(
    "SELECT owner_id AS ownerId, mode, max_hosts AS maxHosts, status, host_policy AS hostPolicy FROM live_streams WHERE id = ?"
  ).get(streamId);
  if (!s) throw new Error("Stream nicht gefunden.");
  if (s.status !== "live") throw new Error("Stream nicht mehr live.");
  if (s.mode !== "multi") throw new Error("Solo-Stream — keine Co-Hosts.");
  if (userId === s.ownerId) throw new Error("Du bist schon Owner.");
  const active = db().prepare(
    "SELECT COUNT(*) AS c FROM live_stream_hosts WHERE stream_id = ? AND left_at IS NULL"
  ).get(streamId).c;
  if (active >= s.maxHosts) throw new Error("Couch ist voll.");
  const now = Date.now();
  if (s.hostPolicy === "request") {
    // Schon ein offener Antrag?
    const existing = db().prepare(
      "SELECT id FROM live_stream_requests WHERE stream_id = ? AND user_id = ? AND status = 'pending'"
    ).get(streamId, userId);
    if (existing) return { pendingRequest: true, requestId: existing.id };
    const r = db().prepare(
      "INSERT INTO live_stream_requests (stream_id, user_id, status, requested_at) VALUES (?, ?, 'pending', ?)"
    ).run(streamId, userId, now);
    return { pendingRequest: true, requestId: Number(r.lastInsertRowid) };
  }
  // 'open' → direkt joinen
  db().prepare("DELETE FROM live_stream_hosts WHERE stream_id = ? AND user_id = ?").run(streamId, userId);
  db().prepare(`
    INSERT INTO live_stream_hosts (stream_id, user_id, role, joined_at) VALUES (?, ?, 'cohost', ?)
  `).run(streamId, userId, now);
  return { ok: true };
}

export function listPendingHostRequests(streamId) {
  return db().prepare(`
    SELECT r.id, r.user_id AS userId, r.requested_at AS requestedAt,
           u.username, u.display_name AS displayName, u.gender, u.birthdate,
           u.avatar_url AS avatarUrl, u.last_seen AS lastSeen, u.premium_badges AS premiumBadges
      FROM live_stream_requests r JOIN users u ON u.id = r.user_id
     WHERE r.stream_id = ? AND r.status = 'pending'
     ORDER BY r.requested_at ASC
  `).all(streamId).map((r) => ({
    id: r.id, userId: r.userId, requestedAt: r.requestedAt,
    username: r.username, displayName: r.displayName,
    gender: r.gender, age: ageFromBirthdate(r.birthdate),
    avatarUrl: r.avatarUrl, lastSeen: r.lastSeen,
    premiumBadges: parseBadges(r.premiumBadges),
  }));
}

export function approveHostRequest(streamId, requestId, byUserId) {
  const s = db().prepare(
    "SELECT owner_id AS ownerId, max_hosts AS maxHosts, status FROM live_streams WHERE id = ?"
  ).get(streamId);
  if (!s) throw new Error("Stream nicht gefunden.");
  if (s.ownerId !== byUserId) throw new Error("Nur der Owner darf zulassen.");
  if (s.status !== "live") throw new Error("Stream beendet.");
  const req = db().prepare(
    "SELECT user_id AS userId FROM live_stream_requests WHERE id = ? AND stream_id = ? AND status = 'pending'"
  ).get(requestId, streamId);
  if (!req) throw new Error("Anfrage nicht gefunden.");
  const active = db().prepare(
    "SELECT COUNT(*) AS c FROM live_stream_hosts WHERE stream_id = ? AND left_at IS NULL"
  ).get(streamId).c;
  if (active >= s.maxHosts) throw new Error("Couch voll.");
  const now = Date.now();
  const tx = db().transaction(() => {
    db().prepare("UPDATE live_stream_requests SET status = 'approved', decided_at = ? WHERE id = ?").run(now, requestId);
    db().prepare("DELETE FROM live_stream_hosts WHERE stream_id = ? AND user_id = ?").run(streamId, req.userId);
    db().prepare(
      "INSERT INTO live_stream_hosts (stream_id, user_id, role, joined_at) VALUES (?, ?, 'cohost', ?)"
    ).run(streamId, req.userId, now);
  });
  tx();
  return { userId: req.userId };
}

export function rejectHostRequest(streamId, requestId, byUserId) {
  const s = db().prepare("SELECT owner_id AS ownerId FROM live_streams WHERE id = ?").get(streamId);
  if (!s || s.ownerId !== byUserId) throw new Error("Nur der Owner darf ablehnen.");
  const r = db().prepare(
    "UPDATE live_stream_requests SET status = 'rejected', decided_at = ? WHERE id = ? AND stream_id = ? AND status = 'pending'"
  ).run(Date.now(), requestId, streamId);
  if (r.changes === 0) throw new Error("Anfrage nicht offen.");
  return { ok: true };
}

export function kickCohost(streamId, targetUserId, byUserId) {
  const s = db().prepare("SELECT owner_id AS ownerId FROM live_streams WHERE id = ?").get(streamId);
  if (!s || s.ownerId !== byUserId) throw new Error("Nur der Owner darf kicken.");
  if (targetUserId === byUserId) throw new Error("Du bist Owner — kick dich nicht selbst.");
  const r = db().prepare(
    "UPDATE live_stream_hosts SET left_at = ? WHERE stream_id = ? AND user_id = ? AND role = 'cohost' AND left_at IS NULL"
  ).run(Date.now(), streamId, targetUserId);
  if (r.changes === 0) throw new Error("Cohost nicht aktiv.");
  return { ok: true };
}

// ============================================================
// 🛡 Live-Moderation: Owner + Mods können kicken, muten, bannen.
// ============================================================
export function isStreamOwner(streamId, userId) {
  const r = db().prepare("SELECT owner_id AS ownerId FROM live_streams WHERE id = ?").get(streamId);
  return !!r && r.ownerId === userId;
}

export function isStreamMod(streamId, userId) {
  if (isStreamOwner(streamId, userId)) return true;
  return !!db().prepare(
    "SELECT 1 FROM live_stream_mods WHERE stream_id = ? AND user_id = ?"
  ).get(streamId, userId);
}

function requireMod(streamId, byUserId) {
  if (!isStreamMod(streamId, byUserId)) throw new Error("Nur Owner/Mod darf das.");
}

export function listLiveMods(streamId) {
  return db().prepare(`
    SELECT m.user_id AS userId, m.at,
           u.username, u.display_name AS displayName, u.gender, u.birthdate,
           u.avatar_url AS avatarUrl, u.last_seen AS lastSeen, u.premium_badges AS premiumBadges
      FROM live_stream_mods m JOIN users u ON u.id = m.user_id
     WHERE m.stream_id = ?
     ORDER BY m.at ASC
  `).all(streamId).map((r) => ({
    userId: r.userId, at: r.at,
    username: r.username, displayName: r.displayName,
    gender: r.gender, age: ageFromBirthdate(r.birthdate),
    avatarUrl: r.avatarUrl, lastSeen: r.lastSeen,
    premiumBadges: parseBadges(r.premiumBadges),
  }));
}

export function promoteMod(streamId, targetUserId, byUserId) {
  if (!isStreamOwner(streamId, byUserId)) throw new Error("Nur Owner darf Mods machen.");
  if (targetUserId === byUserId) throw new Error("Du bist Owner.");
  db().prepare(`
    INSERT OR IGNORE INTO live_stream_mods (stream_id, user_id, by_user_id, at)
    VALUES (?, ?, ?, ?)
  `).run(streamId, targetUserId, byUserId, Date.now());
  return { ok: true };
}

export function demoteMod(streamId, targetUserId, byUserId) {
  if (!isStreamOwner(streamId, byUserId)) throw new Error("Nur Owner darf Mods absetzen.");
  db().prepare("DELETE FROM live_stream_mods WHERE stream_id = ? AND user_id = ?")
    .run(streamId, targetUserId);
  return { ok: true };
}

export function muteStreamUser(streamId, targetUserId, minutes, byUserId, reason = "") {
  requireMod(streamId, byUserId);
  if (isStreamOwner(streamId, targetUserId)) throw new Error("Owner kann nicht gemutet werden.");
  const m = Math.max(1, Math.min(120, Number(minutes) || 5));
  const until = Date.now() + m * 60_000;
  db().prepare(`
    INSERT INTO live_stream_mutes (stream_id, user_id, by_user_id, until_at, reason)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(stream_id, user_id) DO UPDATE SET
      until_at = excluded.until_at, by_user_id = excluded.by_user_id, reason = excluded.reason
  `).run(streamId, targetUserId, byUserId, until, String(reason || "").slice(0, 100));
  return { untilAt: until, minutes: m };
}

export function unmuteStreamUser(streamId, targetUserId, byUserId) {
  requireMod(streamId, byUserId);
  db().prepare("DELETE FROM live_stream_mutes WHERE stream_id = ? AND user_id = ?")
    .run(streamId, targetUserId);
  return { ok: true };
}

export function isMuted(streamId, userId) {
  const r = db().prepare(
    "SELECT until_at AS untilAt FROM live_stream_mutes WHERE stream_id = ? AND user_id = ?"
  ).get(streamId, userId);
  if (!r) return null;
  if (r.untilAt < Date.now()) {
    db().prepare("DELETE FROM live_stream_mutes WHERE stream_id = ? AND user_id = ?").run(streamId, userId);
    return null;
  }
  return r.untilAt;
}

export function banStreamUser(streamId, targetUserId, byUserId, reason = "") {
  requireMod(streamId, byUserId);
  if (isStreamOwner(streamId, targetUserId)) throw new Error("Owner ist nicht bannbar.");
  const now = Date.now();
  const tx = db().transaction(() => {
    db().prepare(`
      INSERT INTO live_stream_bans (stream_id, user_id, by_user_id, at, reason)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(stream_id, user_id) DO NOTHING
    `).run(streamId, targetUserId, byUserId, now, String(reason || "").slice(0, 100));
    // Sofort als Viewer rauswerfen + als Cohost ausloggen
    db().prepare("DELETE FROM live_stream_viewers WHERE stream_id = ? AND user_id = ?").run(streamId, targetUserId);
    db().prepare(
      "UPDATE live_stream_hosts SET left_at = ? WHERE stream_id = ? AND user_id = ? AND role = 'cohost' AND left_at IS NULL"
    ).run(now, streamId, targetUserId);
    db().prepare("DELETE FROM live_stream_mods WHERE stream_id = ? AND user_id = ?").run(streamId, targetUserId);
  });
  tx();
  return { ok: true };
}

export function unbanStreamUser(streamId, targetUserId, byUserId) {
  requireMod(streamId, byUserId);
  db().prepare("DELETE FROM live_stream_bans WHERE stream_id = ? AND user_id = ?")
    .run(streamId, targetUserId);
  return { ok: true };
}

export function isStreamBanned(streamId, userId) {
  return !!db().prepare(
    "SELECT 1 FROM live_stream_bans WHERE stream_id = ? AND user_id = ?"
  ).get(streamId, userId);
}

// Cohost → Viewer (runtersetzen, ohne ban)
export function demoteCohost(streamId, targetUserId, byUserId) {
  if (!isStreamOwner(streamId, byUserId)) throw new Error("Nur Owner darf runtersetzen.");
  if (targetUserId === byUserId) throw new Error("Owner bleibt Owner.");
  const r = db().prepare(
    "UPDATE live_stream_hosts SET left_at = ? WHERE stream_id = ? AND user_id = ? AND role = 'cohost' AND left_at IS NULL"
  ).run(Date.now(), streamId, targetUserId);
  if (r.changes === 0) throw new Error("User ist kein aktiver Cohost.");
  return { ok: true };
}

// ============================================================
// 🚩 Live-Meldungen + Strikes
// ============================================================
export function addLiveReport({ streamId, targetUserId, reporterId, reason, detail = "", kind = "manual" }) {
  // Doppel-Meldungen vom selben User vermeiden
  const ex = db().prepare(
    "SELECT id FROM live_reports WHERE stream_id = ? AND reporter_id = ? AND target_user_id = ? AND status = 'open'"
  ).get(streamId, reporterId, targetUserId);
  if (ex) return { ok: true, id: ex.id, alreadyReported: true };
  const r = db().prepare(`
    INSERT INTO live_reports (stream_id, target_user_id, reporter_id, reason, detail, kind, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'open', ?)
  `).run(streamId, targetUserId, reporterId, String(reason || "").slice(0, 200), String(detail || "").slice(0, 500), kind, Date.now());
  return { ok: true, id: Number(r.lastInsertRowid) };
}

export function listOpenLiveReports(limit = 60) {
  return db().prepare(`
    SELECT r.id, r.stream_id AS streamId, r.kind, r.reason, r.detail,
           r.created_at AS createdAt,
           rp.username AS reporterUsername, rp.display_name AS reporterDisplayName,
           tg.id AS targetUserId, tg.username AS targetUsername, tg.display_name AS targetDisplayName,
           tg.live_blocked_until AS targetBlockedUntil,
           s.title AS streamTitle, s.status AS streamStatus
      FROM live_reports r
      JOIN users rp ON rp.id = r.reporter_id
      JOIN users tg ON tg.id = r.target_user_id
      LEFT JOIN live_streams s ON s.id = r.stream_id
     WHERE r.status = 'open'
     ORDER BY r.created_at DESC LIMIT ?
  `).all(limit);
}

export function resolveLiveReport(reportId, byUserId, action = "resolved") {
  const status = action === "dismissed" ? "dismissed" : "resolved";
  db().prepare(
    "UPDATE live_reports SET status = ?, resolved_at = ?, resolved_by = ? WHERE id = ?"
  ).run(status, Date.now(), byUserId, reportId);
  return { ok: true };
}

export function countOpenLiveReports() {
  return db().prepare("SELECT COUNT(*) AS n FROM live_reports WHERE status = 'open'").get().n;
}

// Strike-Stufen: 1=Warnung, 2=24h-Sperre, 3=7-Tage, 4+=permanent (365 Tage).
const STRIKE_DURATIONS_H = [0, 0, 24, 24 * 7, 24 * 365];

export function addLiveStrike(userId, { reason, kind = "manual", streamId = null, byUserId = null }) {
  const now = Date.now();
  // Aktive Strikes der letzten 90 Tage zählen
  const active = db().prepare(
    "SELECT COUNT(*) AS c FROM live_strikes WHERE user_id = ? AND created_at > ?"
  ).get(userId, now - 90 * 24 * 3600_000).c;
  const newCount = active + 1;
  const hours = STRIKE_DURATIONS_H[Math.min(newCount, STRIKE_DURATIONS_H.length - 1)] || 0;
  const expires = hours > 0 ? now + hours * 3600_000 : now;
  db().prepare(`
    INSERT INTO live_strikes (user_id, reason, kind, stream_id, by_user_id, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(userId, String(reason || "").slice(0, 200), kind, streamId, byUserId, now, expires);
  // Live-Sperre setzen, wenn Strike Sperre auslöst
  if (hours > 0) {
    db().prepare("UPDATE users SET live_blocked_until = MAX(live_blocked_until, ?) WHERE id = ?")
      .run(expires, userId);
  }
  return { strikeCount: newCount, blockedUntil: hours > 0 ? expires : 0, hours };
}

export function countActiveStrikes(userId) {
  const now = Date.now();
  return db().prepare(
    "SELECT COUNT(*) AS c FROM live_strikes WHERE user_id = ? AND created_at > ?"
  ).get(userId, now - 90 * 24 * 3600_000).c;
}

export function getLiveBlockedUntil(userId) {
  const r = db().prepare("SELECT live_blocked_until AS u FROM users WHERE id = ?").get(userId);
  return r?.u || 0;
}

export function clearLiveBlock(userId) {
  db().prepare("UPDATE users SET live_blocked_until = 0 WHERE id = ?").run(userId);
}

export function liveStreamStats(streamId) {
  const s = getLiveStream(streamId);
  if (!s) return null;
  const emotes = db().prepare(
    "SELECT COUNT(*) AS c, COALESCE(SUM(vibes_cost),0) AS v FROM live_stream_emotes WHERE stream_id = ?"
  ).get(streamId);
  const chatCount = db().prepare(
    "SELECT COUNT(*) AS c FROM live_stream_chat WHERE stream_id = ?"
  ).get(streamId).c;
  const totalViewers = db().prepare(
    "SELECT COUNT(DISTINCT user_id) AS c FROM live_stream_viewers WHERE stream_id = ?"
  ).get(streamId).c;
  return {
    durationMs: (s.endedAt || Date.now()) - s.startedAt,
    viewerPeak: s.viewerPeak, totalViewers,
    emoteCount: emotes.c, totalVibes: emotes.v,
    chatCount,
  };
}

export function leaveLiveHost(streamId, userId) {
  const now = Date.now();
  db().prepare("UPDATE live_stream_hosts SET left_at = ? WHERE stream_id = ? AND user_id = ? AND left_at IS NULL")
    .run(now, streamId, userId);
  return { ok: true };
}

export function isLiveHost(streamId, userId) {
  return !!db().prepare(
    "SELECT 1 FROM live_stream_hosts WHERE stream_id = ? AND user_id = ? AND left_at IS NULL"
  ).get(streamId, userId);
}

export function heartbeatViewer(streamId, userId) {
  const now = Date.now();
  db().prepare(`
    INSERT INTO live_stream_viewers (stream_id, user_id, joined_at, last_seen) VALUES (?, ?, ?, ?)
    ON CONFLICT(stream_id, user_id) DO UPDATE SET last_seen = excluded.last_seen
  `).run(streamId, userId, now, now);
  // Peak hochsetzen falls neu
  const cnt = db().prepare(
    "SELECT COUNT(*) AS c FROM live_stream_viewers WHERE stream_id = ? AND last_seen > ?"
  ).get(streamId, now - 60_000).c;
  db().prepare(
    "UPDATE live_streams SET viewer_peak = MAX(viewer_peak, ?) WHERE id = ?"
  ).run(cnt, streamId);
  return { viewerCount: cnt };
}

export function removeViewer(streamId, userId) {
  db().prepare("DELETE FROM live_stream_viewers WHERE stream_id = ? AND user_id = ?").run(streamId, userId);
}

export function listLiveViewers(streamId, limit = 40) {
  return db().prepare(`
    SELECT v.user_id AS userId,
           u.username, u.display_name AS displayName, u.gender, u.birthdate,
           u.avatar_url AS avatarUrl, u.last_seen AS lastSeen, u.premium_badges AS premiumBadges
      FROM live_stream_viewers v JOIN users u ON u.id = v.user_id
     WHERE v.stream_id = ? AND v.last_seen > ?
     ORDER BY v.joined_at DESC LIMIT ?
  `).all(streamId, Date.now() - 60_000, limit).map((r) => ({
    userId: r.userId, username: r.username, displayName: r.displayName,
    gender: r.gender, age: ageFromBirthdate(r.birthdate),
    avatarUrl: r.avatarUrl, lastSeen: r.lastSeen,
    premiumBadges: parseBadges(r.premiumBadges),
  }));
}

export function addLiveChatMessage(streamId, userId, text) {
  const r = db().prepare(
    "INSERT INTO live_stream_chat (stream_id, user_id, text, created_at) VALUES (?, ?, ?, ?)"
  ).run(streamId, userId, String(text || "").slice(0, 240), Date.now());
  return Number(r.lastInsertRowid);
}

export function listLiveChat(streamId, limit = 80) {
  return db().prepare(`
    SELECT c.id, c.text, c.created_at AS at,
           u.id AS userId, u.username, u.display_name AS displayName, u.gender, u.birthdate,
           u.avatar_url AS avatarUrl, u.last_seen AS lastSeen, u.premium_badges AS premiumBadges
      FROM live_stream_chat c JOIN users u ON u.id = c.user_id
     WHERE c.stream_id = ?
     ORDER BY c.created_at DESC LIMIT ?
  `).all(streamId, limit).reverse().map((r) => ({
    id: r.id, text: r.text, at: r.at,
    user: { id: r.userId, username: r.username, displayName: r.displayName,
      gender: r.gender, age: ageFromBirthdate(r.birthdate),
      avatarUrl: r.avatarUrl, lastSeen: r.lastSeen, premiumBadges: parseBadges(r.premiumBadges) },
  }));
}

export function logLiveEmote(streamId, fromUserId, emoteId, cost) {
  db().prepare(`
    INSERT INTO live_stream_emotes (stream_id, from_user_id, emote_id, vibes_cost, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(streamId, fromUserId, emoteId, cost, Date.now());
  db().prepare("UPDATE live_streams SET total_vibes = total_vibes + ? WHERE id = ?").run(cost, streamId);
}

// Wird vom SSE-Stream gepublisht — Multi-Process-fähig wäre besser, hier in-process.
export function publishLive(streamId, type, data) {
  const set = liveListeners.get(streamId);
  if (!set) return;
  const envelope = { type, data, at: Date.now() };
  for (const cb of set) try { cb(envelope); } catch {}
}

const liveListeners = new Map();
export function subscribeLive(streamId, cb) {
  if (!liveListeners.has(streamId)) liveListeners.set(streamId, new Set());
  liveListeners.get(streamId).add(cb);
  return () => {
    const set = liveListeners.get(streamId);
    if (set) { set.delete(cb); if (set.size === 0) liveListeners.delete(streamId); }
  };
}

// ============================================================
// 🎂 Wer hat heute Geburtstag (nur Monat+Tag, Jahr ignorieren).
// Anonyme Anzeige — nur User mit hinterlegtem Geburtsdatum.
// ============================================================
export function todaysBirthdays(limit = 12) {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return db().prepare(`
    SELECT id, username, display_name AS displayName, gender, birthdate,
           last_seen AS lastSeen, avatar_url AS avatarUrl, premium_badges AS premiumBadges
      FROM users
     WHERE status = 'approved'
       AND birthdate IS NOT NULL AND birthdate <> ''
       AND substr(birthdate, 6, 2) = ? AND substr(birthdate, 9, 2) = ?
     ORDER BY last_seen DESC LIMIT ?
  `).all(mm, dd, limit).map((r) => ({
    id: r.id, username: r.username, displayName: r.displayName,
    gender: r.gender, age: ageFromBirthdate(r.birthdate),
    lastSeen: r.lastSeen, avatarUrl: r.avatarUrl,
    premiumBadges: parseBadges(r.premiumBadges),
  }));
}


// ============================================================
// 🏫 SCHUL-/STADT-VERZEICHNIS (SchuelerVZ-Nostalgie)
// ============================================================

// Liefert alle Schulen mit Mitgliederzahl, sortiert nach Anzahl. Untere Schranke
// 1 Mitglied, damit auch Einzelne sichtbar bleiben. Filter optional nach city.
export function listSchools({ city = "", limit = 200 } = {}) {
  let sql = `SELECT school, city, COUNT(*) AS n
               FROM users
              WHERE status = 'approved' AND school <> ''`;
  const args = [];
  if (city) { sql += " AND lower(city) = lower(?)"; args.push(city); }
  sql += " GROUP BY school, city ORDER BY n DESC, school ASC LIMIT ?";
  args.push(limit);
  return db().prepare(sql).all(...args);
}

// Top-Staedte mit Mitgliederzahl.
export function listCities({ limit = 50 } = {}) {
  return db().prepare(`
    SELECT city, COUNT(*) AS n FROM users
     WHERE status = 'approved' AND city <> ''
     GROUP BY city ORDER BY n DESC, city ASC LIMIT ?
  `).all(limit);
}

// Alle Mitglieder einer Schule (case-insensitive).
export function usersBySchool(school, limit = 200) {
  return db().prepare(`
    SELECT id, username, display_name AS displayName, gender, birthdate,
           last_seen AS lastSeen, avatar_url AS avatarUrl, premium_badges AS premiumBadges,
           mood, city, school
      FROM users
     WHERE status = 'approved' AND lower(school) = lower(?)
     ORDER BY last_seen DESC LIMIT ?
  `).all(school, limit).map((r) => ({
    id: r.id, username: r.username, displayName: r.displayName,
    gender: r.gender, age: ageFromBirthdate(r.birthdate),
    lastSeen: r.lastSeen, avatarUrl: r.avatarUrl,
    premiumBadges: parseBadges(r.premiumBadges),
    mood: r.mood, city: r.city, school: r.school,
  }));
}

// Alle Mitglieder einer Stadt.
export function usersByCity(city, limit = 200) {
  return db().prepare(`
    SELECT id, username, display_name AS displayName, gender, birthdate,
           last_seen AS lastSeen, avatar_url AS avatarUrl, premium_badges AS premiumBadges,
           mood, city, school
      FROM users
     WHERE status = 'approved' AND lower(city) = lower(?)
     ORDER BY last_seen DESC LIMIT ?
  `).all(city, limit).map((r) => ({
    id: r.id, username: r.username, displayName: r.displayName,
    gender: r.gender, age: ageFromBirthdate(r.birthdate),
    lastSeen: r.lastSeen, avatarUrl: r.avatarUrl,
    premiumBadges: parseBadges(r.premiumBadges),
    mood: r.mood, city: r.city, school: r.school,
  }));
}

// ============================================================
// 🎁 KOMPLIMENTE — anonyme positive Spruchkarten (Vibes-Sink)
// ============================================================

export const COMPLIMENT_DAILY_CAP = 5; // wie viele kann ein User pro Tag SENDEN
export const COMPLIMENT_COST = 10;     // Vibes pro Standard-Kompliment
export const COMPLIMENT_COST_CUSTOM = 50; // Vibes fuer eigenen Text

export function sendCompliment(fromUserId, targetUserId, { text, emoji = "💖", anonymous = true }) {
  return db().prepare(`
    INSERT INTO compliments (target_user_id, from_user_id, anonymous, text, emoji, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(targetUserId, fromUserId, anonymous ? 1 : 0, String(text).slice(0, 200), String(emoji).slice(0, 8), Date.now()).lastInsertRowid;
}

// Wie viele Komplimente hat dieser User HEUTE schon verschickt? Fuer Daily-Cap.
export function complimentsSentToday(userId) {
  const since = Date.now() - 24 * 3600_000;
  return db().prepare("SELECT COUNT(*) AS n FROM compliments WHERE from_user_id = ? AND created_at > ?")
    .get(userId, since).n;
}

// Inbox eines Users (alle empfangenen Komplimente). Anonyme verstecken from_user_id im Output.
export function complimentsReceived(userId, limit = 100) {
  return db().prepare(`
    SELECT c.id, c.text, c.emoji, c.anonymous, c.created_at AS createdAt, c.seen_at AS seenAt,
           c.from_user_id AS fromUserId,
           u.username AS fromUsername, u.display_name AS fromDisplayName
      FROM compliments c
      LEFT JOIN users u ON u.id = c.from_user_id
     WHERE c.target_user_id = ?
     ORDER BY c.created_at DESC LIMIT ?
  `).all(userId, limit).map((r) => ({
    id: r.id, text: r.text, emoji: r.emoji,
    createdAt: r.createdAt, seenAt: r.seenAt,
    // Anonyme Komplimente liefern KEINE Sender-Daten an den Client.
    fromUsername: r.anonymous ? null : r.fromUsername,
    fromDisplayName: r.anonymous ? null : r.fromDisplayName,
    anonymous: !!r.anonymous,
  }));
}

// Wie viele Komplimente hat ein User insgesamt bekommen? Fuer Profil-Counter.
export function complimentsReceivedCount(userId) {
  return db().prepare("SELECT COUNT(*) AS n FROM compliments WHERE target_user_id = ?")
    .get(userId).n;
}

// Markiert alle Komplimente eines Users als gesehen.
export function markComplimentsSeen(userId) {
  db().prepare("UPDATE compliments SET seen_at = ? WHERE target_user_id = ? AND seen_at IS NULL")
    .run(Date.now(), userId);
}

// Wie viele neue (ungesehene) Komplimente hat ein User?
export function complimentsUnreadCount(userId) {
  return db().prepare("SELECT COUNT(*) AS n FROM compliments WHERE target_user_id = ? AND seen_at IS NULL")
    .get(userId).n;
}


// ============================================================
// 🐾 Nachbar-VIBOs: User mit aktueller Karten-Position UND lebendem VIBO
// die sich innerhalb von radiusM Metern um (lat,lng) aufhalten.
// Position muss frisch sein (< 10 Minuten), gestorbene Pets nicht zeigen.
// ============================================================
export function listNearbyVibos(meId, lat, lng, radiusM = 200, freshMs = 10 * 60 * 1000) {
  const since = Date.now() - freshMs;
  // grobes Bounding-Box (1° Lat ≈ 111km) → vorfiltern, danach Haversine
  const dLat = radiusM / 111000;
  const dLng = radiusM / (111000 * Math.cos((lat * Math.PI) / 180) || 1);
  const rows = db().prepare(`
    SELECT u.id AS userId, u.username, u.display_name AS displayName, u.avatar_url AS avatarUrl,
           ul.lat, ul.lng, v.species, v.name AS petName,
           v.hatched_at AS hatchedAt, v.died_at AS diedAt, v.distance_m AS distanceM
      FROM user_location ul
      JOIN vibos v ON v.user_id = ul.user_id
      JOIN users u ON u.id = ul.user_id
     WHERE ul.user_id != ?
       AND ul.updated_at > ?
       AND v.died_at IS NULL
       AND ul.lat BETWEEN ? AND ?
       AND ul.lng BETWEEN ? AND ?
  `).all(meId, since, lat - dLat, lat + dLat, lng - dLng, lng + dLng);

  const out = [];
  for (const r of rows) {
    const d = walkingDistanceMeters(lat, lng, r.lat, r.lng);
    if (d <= radiusM) out.push({ ...r, distanceFromMeM: Math.round(d) });
  }
  out.sort((a, b) => a.distanceFromMeM - b.distanceFromMeM);
  return out.slice(0, 30);
}

// 🧹 Alles auf einmal als gelesen markieren: Konversationen + Räume.
// Liefert {chats, rooms} mit Anzahl der jeweils touchten Einträge.
export function markAllChatsAndRoomsRead(userId) {
  let chats = 0, rooms = 0;
  for (const c of getConversationsForUser(userId)) {
    markConversationRead(userId, c.partnerId);
    chats++;
  }
  for (const r of listMyChatRooms(userId)) {
    markRoomRead(r.id, userId);
    rooms++;
  }
  return { chats, rooms };
}


// =================================================================
// PWA-Install-Tracking
// =================================================================
export function recordPwaInstall(userId, platform, userAgent = "") {
  if (!userId || !platform) return;
  const now = Date.now();
  const plat = String(platform).slice(0, 32);
  const ua = String(userAgent || "").slice(0, 280);
  db().prepare(`
    INSERT INTO pwa_installs (user_id, platform, user_agent, installed_at, last_seen)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, platform) DO UPDATE SET
      user_agent = excluded.user_agent,
      last_seen = excluded.last_seen
  `).run(userId, plat, ua, now, now);
}

export function listPwaInstalls() {
  return db().prepare(`
    SELECT pi.user_id AS userId, pi.platform, pi.user_agent AS userAgent,
           pi.installed_at AS installedAt, pi.last_seen AS lastSeen,
           u.username, u.display_name AS displayName
      FROM pwa_installs pi
      JOIN users u ON u.id = pi.user_id
     ORDER BY pi.installed_at DESC
  `).all();
}


// =================================================================
// Changelog-Emoji-Reaktionen
// =================================================================
export function toggleChangelogReaction(userId, entryKey, emoji) {
  if (!userId || !entryKey || !emoji) return null;
  const k = String(entryKey).slice(0, 80);
  const em = String(emoji).slice(0, 16);
  const d = db();
  const ex = d.prepare(`SELECT id FROM changelog_reactions WHERE entry_key=? AND user_id=? AND emoji=?`).get(k, userId, em);
  if (ex) {
    d.prepare(`DELETE FROM changelog_reactions WHERE id=?`).run(ex.id);
    return { active: false };
  }
  d.prepare(`INSERT INTO changelog_reactions (entry_key, user_id, emoji, created_at) VALUES (?,?,?,?)`)
    .run(k, userId, em, Date.now());
  return { active: true };
}

export function listChangelogReactions(entryKeys, viewerId = 0) {
  if (!Array.isArray(entryKeys) || entryKeys.length === 0) return {};
  const keys = entryKeys.map((k) => String(k).slice(0, 80)).filter(Boolean);
  if (keys.length === 0) return {};
  const placeholders = keys.map(() => "?").join(",");
  const rows = db().prepare(`
    SELECT entry_key, emoji, COUNT(*) AS n,
           MAX(CASE WHEN user_id = ? THEN 1 ELSE 0 END) AS mine
      FROM changelog_reactions
     WHERE entry_key IN (${placeholders})
     GROUP BY entry_key, emoji
  `).all(viewerId || 0, ...keys);
  const out = {};
  for (const r of rows) {
    if (!out[r.entry_key]) out[r.entry_key] = {};
    out[r.entry_key][r.emoji] = { count: r.n, mine: !!r.mine };
  }
  return out;
}


// =================================================================
// Fidolin-Wirtschaft: Kennzahlen fuer Inflations-Check
// =================================================================
export function getEconomyMetrics(sinceMs) {
  const d = db();
  const earnedRow = d.prepare(
    "SELECT COALESCE(SUM(amount), 0) AS s FROM credit_tx WHERE amount > 0 AND at >= ?"
  ).get(sinceMs);
  const sunkRow = d.prepare(
    "SELECT COALESCE(SUM(amount), 0) AS s FROM credit_tx WHERE amount < 0 AND at >= ?"
  ).get(sinceMs);
  const circRow = d.prepare(
    "SELECT COALESCE(SUM(balance), 0) AS s FROM credits"
  ).get();
  const usersRow = d.prepare(
    "SELECT COUNT(DISTINCT user_id) AS n FROM credit_tx WHERE at >= ?"
  ).get(sinceMs);
  return {
    earned: Number(earnedRow?.s || 0),
    sunk: Math.abs(Number(sunkRow?.s || 0)),
    circulating: Number(circRow?.s || 0),
    activeUsers: Number(usersRow?.n || 0),
  };
}

// 💳 STRIPE_GRANT_HELPERS_V1
// grantPaidVibes / grantPaidVip — werden vom Stripe-Webhook nach erfolgreicher
// Zahlung aufgerufen. Idempotenz ueber Session-ID (ref_type): doppelte Webhook-
// Zustellung schreibt nichts doppelt.
export function grantPaidVibes(userId, amount, sessionId) {
  userId = Number(userId);
  amount = Number(amount);
  if (!userId || !amount || amount <= 0 || !sessionId) {
    return { ok: false, reason: "invalid" };
  }
  ensureCreditsRow(userId);
  const dup = db().prepare(
    "SELECT 1 FROM credit_tx WHERE user_id = ? AND reason = ? AND ref_type = ? LIMIT 1"
  ).get(userId, "stripe_purchase", String(sessionId));
  if (dup) return { ok: false, reason: "duplicate", sessionId };
  const now = Date.now();
  db().prepare(
    "UPDATE credits SET balance = balance + ?, total_earned = total_earned + ? WHERE user_id = ?"
  ).run(amount, amount, userId);
  db().prepare(
    "INSERT INTO credit_tx (user_id, amount, reason, ref_type, ref_id, at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(userId, amount, "stripe_purchase", String(sessionId), 0, now);
  const row = db().prepare("SELECT balance FROM credits WHERE user_id = ?").get(userId);
  return { ok: true, amount, balance: row?.balance || 0 };
}

export function grantPaidVip(userId, days, sessionId) {
  userId = Number(userId);
  days = Number(days);
  if (!userId || !days || days <= 0 || !sessionId) {
    return { ok: false, reason: "invalid" };
  }
  ensureCreditsRow(userId);
  const dup = db().prepare(
    "SELECT 1 FROM credit_tx WHERE user_id = ? AND reason = ? AND ref_type = ? LIMIT 1"
  ).get(userId, "stripe_vip", String(sessionId));
  if (dup) return { ok: false, reason: "duplicate", sessionId };
  const before = db().prepare("SELECT vip_until FROM users WHERE id = ?").get(userId);
  const base = (before?.vip_until || 0) > Date.now() ? before.vip_until : Date.now();
  const newUntil = base + days * 24 * 3600000;
  db().prepare("UPDATE users SET vip_until = ? WHERE id = ?").run(newUntil, userId);
  // Audit-Log in credit_tx (amount=0 — kein Vibes-Effekt)
  db().prepare(
    "INSERT INTO credit_tx (user_id, amount, reason, ref_type, ref_id, at) VALUES (?, 0, ?, ?, ?, ?)"
  ).run(userId, "stripe_vip", String(sessionId), 0, Date.now());
  return { ok: true, days, vipUntil: newUntil };
}

// 🛡 PRIVACY_FN_V1
// 🛡 Update Privatsphaere-Spalten in users.
// patch: { dm_policy?, wall_policy?, hide_visits?, shield_mode? }
export function updateUserPrivacy(userId, patch) {
  const ALLOWED = ["dm_policy", "wall_policy", "hide_visits", "shield_mode"];
  const cols = []; const vals = [];
  for (const k of ALLOWED) {
    if (patch && Object.prototype.hasOwnProperty.call(patch, k)) {
      cols.push(`${k} = ?`);
      vals.push(patch[k]);
    }
  }
  if (cols.length === 0) return false;
  vals.push(userId);
  db().prepare(`UPDATE users SET ${cols.join(", ")} WHERE id = ?`).run(...vals);
  return true;
}

// 🛡 Liefert nur die 4 Privacy-Spalten (snake_case) fuer einen User — fuer
// canMessage/canWriteWall/shouldRecordVisit in lib/privacy.js.
export function getUserPrivacyFields(userId) {
  if (!userId) return null;
  const r = db().prepare(
    "SELECT dm_policy, wall_policy, hide_visits, shield_mode FROM users WHERE id = ?"
  ).get(Number(userId));
  if (!r) return null;
  return {
    dm_policy: r.dm_policy || "open",
    wall_policy: r.wall_policy || "open",
    hide_visits: r.hide_visits || 0,
    shield_mode: r.shield_mode || 0,
  };
}

// 🛡 Pruefe Freundschaft fuer Privacy-Entscheidungen.
// "Freunde" = Top-Friends in beide Richtungen, ODER bestehende Konversation,
// ODER verlinkte Partnerschaft.
export function areFriendsForPrivacy(aId, bId) {
  aId = Number(aId); bId = Number(bId);
  if (!aId || !bId || aId === bId) return aId === bId;
  const d = db();
  // Top-Friends in beide Richtungen
  const tf = d.prepare(`
    SELECT 1 FROM top_friends
    WHERE (user_id = ? AND buddy_id = ?)
       OR (user_id = ? AND buddy_id = ?)
    LIMIT 1
  `).get(aId, bId, bId, aId);
  if (tf) return true;
  // Bestehende Konversation (egal welche Richtung)
  const conv = d.prepare(`
    SELECT 1 FROM messages
    WHERE (from_user_id = ? AND to_user_id = ?)
       OR (from_user_id = ? AND to_user_id = ?)
    LIMIT 1
  `).get(aId, bId, bId, aId);
  if (conv) return true;
  // Partnerschaft
  const partner = d.prepare("SELECT partner_user_id FROM users WHERE id = ?").get(aId);
  if (partner?.partner_user_id === bId) return true;
  return false;
}

// 🛡 PRIVACY_FN_V2
// 🛡 V2: prueft ob jetzt Ruhezeit ist fuer einen User.
// Liefert true = in Ruhezeit, false = empfangsbereit
export function isInQuietHours(userId, now = new Date()) {
  if (!userId) return false;
  const r = db().prepare(
    "SELECT quiet_from_hour, quiet_to_hour FROM users WHERE id = ?"
  ).get(Number(userId));
  if (!r) return false;
  const from = r.quiet_from_hour;
  const to = r.quiet_to_hour;
  if (from == null || to == null) return false;
  if (from === to) return false; // 0-Stunden-Fenster
  const h = now.getHours();
  // Ueber-Mitternacht-Fenster (z.B. 22..6)
  if (from > to) return h >= from || h < to;
  // Normales Fenster (z.B. 12..14)
  return h >= from && h < to;
}

// 🛡 V2: hat sender schon mal mit recipient geschrieben?
// Wird genutzt um zu pruefen ob das eine Erst-Nachricht ist (strict-first-msg-Modus)
export function hasMessageHistory(senderId, recipientId) {
  if (!senderId || !recipientId) return false;
  const r = db().prepare(`
    SELECT 1 FROM messages
    WHERE (from_user_id = ? AND to_user_id = ?)
       OR (from_user_id = ? AND to_user_id = ?)
    LIMIT 1
  `).get(senderId, recipientId, recipientId, senderId);
  return !!r;
}

// 🛡 V2: erweitere updateUserPrivacy um neue Felder
export function updateUserPrivacyV2(userId, patch) {
  const ALLOWED = ["dm_policy", "wall_policy", "hide_visits", "shield_mode",
                   "quiet_from_hour", "quiet_to_hour", "strict_first_msg"];
  const cols = []; const vals = [];
  for (const k of ALLOWED) {
    if (patch && Object.prototype.hasOwnProperty.call(patch, k)) {
      cols.push(`${k} = ?`);
      vals.push(patch[k]);
    }
  }
  if (cols.length === 0) return false;
  vals.push(userId);
  db().prepare(`UPDATE users SET ${cols.join(", ")} WHERE id = ?`).run(...vals);
  return true;
}

// 🛡 V2: erweiterte Privacy-Fields fuer canMessage
export function getUserPrivacyFieldsV2(userId) {
  if (!userId) return null;
  const r = db().prepare(`
    SELECT dm_policy, wall_policy, hide_visits, shield_mode,
           quiet_from_hour, quiet_to_hour, strict_first_msg
    FROM users WHERE id = ?
  `).get(Number(userId));
  if (!r) return null;
  return {
    dm_policy: r.dm_policy || "open",
    wall_policy: r.wall_policy || "open",
    hide_visits: r.hide_visits || 0,
    shield_mode: r.shield_mode || 0,
    quiet_from_hour: r.quiet_from_hour,
    quiet_to_hour: r.quiet_to_hour,
    strict_first_msg: r.strict_first_msg || 0,
  };
}

// 🏆 ACHIEVEMENTS_FN_V1
// 🏆 Hat User die Auszeichnung schon?
export function hasAchievement(userId, slug) {
  if (!userId || !slug) return false;
  const r = db().prepare("SELECT 1 FROM user_achievements WHERE user_id = ? AND slug = ? LIMIT 1").get(userId, slug);
  return !!r;
}

// 🏆 Auszeichnung freischalten — idempotent. Liefert true wenn frisch vergeben.
export function grantAchievement(userId, slug) {
  if (!userId || !slug) return false;
  try {
    const info = db().prepare(`
      INSERT INTO user_achievements (user_id, slug, earned_at)
      VALUES (?, ?, ?)
    `).run(userId, slug, Date.now());
    return info.changes > 0;
  } catch (e) {
    // UNIQUE-Violation = schon vorhanden
    return false;
  }
}

// 🏆 Liste der Auszeichnungen eines Users (slug + Zeitpunkt)
export function listAchievements(userId) {
  if (!userId) return [];
  return db().prepare(`
    SELECT slug, earned_at AS earnedAt, claimed_at AS claimedAt
    FROM user_achievements WHERE user_id = ?
    ORDER BY earned_at DESC
  `).all(userId);
}

// 🏆 Karten-Bonus als beansprucht markieren
export function claimAchievementBonus(userId, slug) {
  if (!userId || !slug) return false;
  const info = db().prepare(`
    UPDATE user_achievements SET claimed_at = ?
    WHERE user_id = ? AND slug = ? AND claimed_at = 0
  `).run(Date.now(), userId, slug);
  return info.changes > 0;
}

// 🏆 Counter fuer Statistik: wie oft hat ein User schon X gemacht?
export function countCreditReasonForUser(userId, reason) {
  if (!userId) return 0;
  const r = db().prepare(
    "SELECT COUNT(*) AS n FROM credit_tx WHERE user_id = ? AND reason = ?"
  ).get(userId, reason);
  return r?.n || 0;
}
