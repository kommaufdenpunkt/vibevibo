#!/usr/bin/env node
// 🎭 Mood + Profil-Musik + Glitter — Nostalgie-Profil-Customization.
//
// Spalten in users:
//   • mood_emoji    — "😊" o.ä.
//   • mood_text     — "Glücklich mit Familie!"
//   • mood_set_at   — Timestamp
//   • profile_music_url — YouTube-ID oder Audio-URL
//   • glitter_status — 0/1, Glitter-Animation auf Status-Display

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_COL = "/* 🎭 MOOD_MUSIC_COL_V1 */";
const MARK_FN  = "// 🎭 MOOD_MUSIC_FN_V1";

let src = readFileSync(DB_PATH, "utf-8");
let changed = false;

if (!src.includes(MARK_COL)) {
  const ANCHOR = `addColumnIfMissing(d, "users", "gender", "TEXT DEFAULT ''");`;
  if (!src.includes(ANCHOR)) { console.error("✗ Anker users.gender fehlt"); process.exit(1); }
  const INJECT = `${ANCHOR}

  ${MARK_COL}
  // 🎭 Mood + Profil-Musik + Bling
  addColumnIfMissing(d, "users", "mood_emoji",        "TEXT DEFAULT ''");
  addColumnIfMissing(d, "users", "mood_text",         "TEXT DEFAULT ''");
  addColumnIfMissing(d, "users", "mood_set_at",       "INTEGER DEFAULT 0");
  addColumnIfMissing(d, "users", "profile_music_url", "TEXT DEFAULT ''");
  addColumnIfMissing(d, "users", "glitter_status",    "INTEGER DEFAULT 0");`;
  src = src.replace(ANCHOR, INJECT);
  changed = true;
  console.log("✓ Mood/Music/Glitter Spalten ergänzt.");
}

if (!src.includes(MARK_FN)) {
  const FN = `

${MARK_FN}
// 🎭 Mood + Profil-Musik Helpers

export function setUserMood(userId, { emoji = "", text = "" } = {}) {
  const e = String(emoji || "").slice(0, 8);
  const t = String(text || "").slice(0, 160);
  db().prepare(\`
    UPDATE users SET mood_emoji = ?, mood_text = ?, mood_set_at = ?
     WHERE id = ?
  \`).run(e, t, Date.now(), Number(userId));
  return true;
}

export function getUserMood(userId) {
  try {
    return db().prepare(\`
      SELECT mood_emoji AS emoji, mood_text AS text, mood_set_at AS setAt
        FROM users WHERE id = ?
    \`).get(Number(userId)) || { emoji: "", text: "", setAt: 0 };
  } catch { return { emoji: "", text: "", setAt: 0 }; }
}

export function clearUserMood(userId) {
  db().prepare(\`UPDATE users SET mood_emoji = '', mood_text = '', mood_set_at = 0 WHERE id = ?\`).run(Number(userId));
  return true;
}

export function setProfileMusicUrl(userId, url) {
  // Akzeptiert nur https-URLs oder YouTube-IDs
  const u = String(url || "").trim().slice(0, 500);
  if (u && !u.startsWith("https://") && !/^[a-zA-Z0-9_-]{11}$/.test(u)) {
    throw new Error("Nur HTTPS-URL oder YouTube-Video-ID erlaubt");
  }
  db().prepare("UPDATE users SET profile_music_url = ? WHERE id = ?").run(u, Number(userId));
  return u;
}

export function setGlitterStatus(userId, enabled) {
  db().prepare("UPDATE users SET glitter_status = ? WHERE id = ?").run(enabled ? 1 : 0, Number(userId));
  return !!enabled;
}

export function getProfileCustomization(userId) {
  try {
    return db().prepare(\`
      SELECT mood_emoji AS moodEmoji, mood_text AS moodText, mood_set_at AS moodSetAt,
             profile_music_url AS profileMusicUrl, glitter_status AS glitterStatus
        FROM users WHERE id = ?
    \`).get(Number(userId)) || {};
  } catch { return {}; }
}
`;
  src += FN;
  changed = true;
  console.log("✓ Mood/Music Helpers angefügt.");
}

if (changed) {
  writeFileSync(DB_PATH, src);
  console.log("\\n✓ db.js gepatched.");
} else {
  console.log("\\n✓ Nichts zu tun.");
}
