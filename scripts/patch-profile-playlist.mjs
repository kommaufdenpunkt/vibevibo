#!/usr/bin/env node
// 🎵 Profil-Playlist — 3-5 Songs pro User, YouTube-IDs oder HTTPS-Audio-URL.
//
// Tabelle:
//   • profile_playlists — user_id, position, music_url, title, created_at
//   • Max 5 Einträge pro User (im Code geprüft)
//
// Helpers:
//   • getProfilePlaylist(userId)         — sortierte Liste der Songs
//   • addToProfilePlaylist(userId, ...)  — neuer Song (Slot-Check)
//   • removeFromProfilePlaylist(userId, entryId)
//   • reorderProfilePlaylist(userId, orderedIds)

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_TABLE = "/* 🎵 PROFILE_PLAYLIST_TABLE_V1 */";
const MARK_FN    = "// 🎵 PROFILE_PLAYLIST_FN_V1";

let src = readFileSync(DB_PATH, "utf-8");
let changed = false;

if (!src.includes(MARK_TABLE)) {
  const ANCHOR = "CREATE TABLE IF NOT EXISTS top_friends (";
  if (!src.includes(ANCHOR)) { console.error("✗ Anker top_friends fehlt"); process.exit(1); }
  const INJECT = `${MARK_TABLE}
    CREATE TABLE IF NOT EXISTS profile_playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      position INTEGER NOT NULL DEFAULT 0,
      music_url TEXT NOT NULL,
      title TEXT DEFAULT '',
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_pp_user ON profile_playlists(user_id, position);

    ${ANCHOR}`;
  src = src.replace(ANCHOR, INJECT);
  changed = true;
  console.log("✓ profile_playlists Tabelle ergänzt.");
}

if (!src.includes(MARK_FN)) {
  const FN = `

${MARK_FN}
// 🎵 Profil-Playlist Helpers

const PROFILE_PLAYLIST_MAX = 5;

export function getProfilePlaylist(userId) {
  const me = Number(userId);
  if (!me) return [];
  try {
    return db().prepare(\`
      SELECT id, music_url AS musicUrl, title, position, created_at AS createdAt
        FROM profile_playlists
       WHERE user_id = ?
       ORDER BY position ASC, id ASC
    \`).all(me) || [];
  } catch { return []; }
}

export function countProfilePlaylist(userId) {
  try {
    return db().prepare("SELECT COUNT(*) AS n FROM profile_playlists WHERE user_id = ?").get(Number(userId)).n || 0;
  } catch { return 0; }
}

// Validiert die URL minimal — entweder YouTube-ID (11 Zeichen) oder https://-Audio
function normalizeMusicUrl(raw) {
  const s = String(raw || "").trim().slice(0, 400);
  if (!s) return null;
  // YouTube-ID direkt
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  // youtube.com/watch?v=XXX oder youtu.be/XXX → extract ID
  const ytMatch = s.match(/(?:youtube\\.com\\/watch\\?v=|youtu\\.be\\/|youtube\\.com\\/embed\\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return ytMatch[1];
  // HTTPS Audio
  if (/^https:\\/\\/.+\\.(mp3|m4a|ogg|wav|webm)(\\?.*)?$/i.test(s)) return s;
  // Fallback: jede HTTPS-URL erlaubt (z.B. Streams)
  if (/^https:\\/\\//.test(s)) return s;
  return null;
}

export function addToProfilePlaylist(userId, { musicUrl, title = "" }) {
  const me = Number(userId);
  if (!me) throw new Error("Ungültiger User");
  const url = normalizeMusicUrl(musicUrl);
  if (!url) throw new Error("Ungültige Musik-URL (YouTube-Link oder HTTPS-Audio)");
  const used = countProfilePlaylist(me);
  if (used >= PROFILE_PLAYLIST_MAX) {
    throw new Error(\`Maximal \${PROFILE_PLAYLIST_MAX} Songs. Erst einen löschen.\`);
  }
  // Doppel-Check
  try {
    const dup = db().prepare("SELECT id FROM profile_playlists WHERE user_id = ? AND music_url = ?").get(me, url);
    if (dup) throw new Error("Song schon in deiner Playlist.");
  } catch (e) {
    if (e.message.includes("schon in")) throw e;
  }
  const info = db().prepare(\`
    INSERT INTO profile_playlists (user_id, position, music_url, title, created_at)
    VALUES (?, ?, ?, ?, ?)
  \`).run(me, used, url, String(title || "").slice(0, 120), Date.now());
  return Number(info.lastInsertRowid);
}

export function removeFromProfilePlaylist(userId, entryId) {
  try {
    const r = db().prepare("DELETE FROM profile_playlists WHERE id = ? AND user_id = ?")
      .run(Number(entryId), Number(userId));
    return r.changes > 0;
  } catch { return false; }
}

// Sortiert neu: orderedIds = Array von Playlist-Entry-IDs in gewünschter Reihenfolge.
export function reorderProfilePlaylist(userId, orderedIds) {
  const me = Number(userId);
  if (!me || !Array.isArray(orderedIds)) return false;
  try {
    const update = db().prepare("UPDATE profile_playlists SET position = ? WHERE id = ? AND user_id = ?");
    const tx = db().transaction((ids) => {
      ids.forEach((id, idx) => update.run(idx, Number(id), me));
    });
    tx(orderedIds);
    return true;
  } catch { return false; }
}
`;
  src += FN;
  changed = true;
  console.log("✓ Profil-Playlist Helpers angefügt.");
}

if (changed) {
  writeFileSync(DB_PATH, src);
  console.log("\\n✓ db.js gepatched (Profil-Playlist).");
} else {
  console.log("\\n✓ Nichts zu tun.");
}
