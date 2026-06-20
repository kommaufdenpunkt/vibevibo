#!/usr/bin/env node
// 📌 Buschfunk-Post-Typen — kategorisierte Posts (Zitat/Gefühl/Erinnerung/...).
//
// Erweitert:
//   • status_updates.post_type — Kategorie-Tag (default 'free')
//   • getBuschfunk-SELECT um post_type → events.postType
//
// Helpers:
//   • addTypedStatusUpdate(userId, postType, text, opts) — wrapped addStatusUpdate
//   • POST_TYPE_ALLOWED                                    — Whitelist

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_COL = "/* 📌 BUSCHFUNK_TYPES_COL_V1 */";
const MARK_FN  = "// 📌 BUSCHFUNK_TYPES_FN_V1";

let src = readFileSync(DB_PATH, "utf-8");
let changed = false;

if (!src.includes(MARK_COL)) {
  const ANCHOR = `addColumnIfMissing(d, "users", "xp", "INTEGER DEFAULT 0");`;
  if (!src.includes(ANCHOR)) { console.error("✗ Anker users.xp fehlt"); process.exit(1); }
  const INJECT = `${ANCHOR}

  ${MARK_COL}
  addColumnIfMissing(d, "status_updates", "post_type", "TEXT DEFAULT 'free'");`;
  src = src.replace(ANCHOR, INJECT);
  changed = true;
  console.log("✓ status_updates.post_type ergänzt.");
}

// SELECT in getBuschfunk erweitern um post_type
const OLD_SELECT = `SELECT s.id AS postId, s.text AS detail, s.image_url AS picUrl, s.audio_url AS audioUrl,
           s.media_url AS mediaJson,
           s.created_at AS at, s.boosted_until AS boostedUntil,`;
const NEW_SELECT = `SELECT s.id AS postId, s.text AS detail, s.image_url AS picUrl, s.audio_url AS audioUrl,
           s.media_url AS mediaJson,
           s.created_at AS at, s.boosted_until AS boostedUntil,
           s.post_type AS postType,`;

if (src.includes(OLD_SELECT) && !src.includes("s.post_type AS postType,")) {
  src = src.replace(OLD_SELECT, NEW_SELECT);
  changed = true;
  console.log("✓ getBuschfunk SELECT erweitert.");
}

// events.push() in getBuschfunk um postType erweitern
const OLD_PUSH = `events.push({ type: "status", postId: s.postId, at: s.at, detail: s.detail, picUrl: s.picUrl || "",
      audioUrl: s.audioUrl || "", media: s.mediaJson || "",
      boostedUntil: s.boostedUntil || 0,`;
const NEW_PUSH = `events.push({ type: "status", postId: s.postId, at: s.at, detail: s.detail, picUrl: s.picUrl || "",
      audioUrl: s.audioUrl || "", media: s.mediaJson || "",
      boostedUntil: s.boostedUntil || 0, postType: s.postType || "free",`;

if (src.includes(OLD_PUSH) && !src.includes("postType: s.postType")) {
  src = src.replace(OLD_PUSH, NEW_PUSH);
  changed = true;
  console.log("✓ getBuschfunk events.push() erweitert.");
}

if (!src.includes(MARK_FN)) {
  const FN = `

${MARK_FN}
// 📌 Buschfunk-Post-Typen Helpers

export const POST_TYPE_ALLOWED = [
  "free", "quote", "feeling", "mention", "memory",
  "gift_show", "now_playing", "never_forget",
];

// Erstellt einen typisierten Buschfunk-Post.
// postType wird gegen Whitelist geprüft, sonst 'free'.
export function addTypedStatusUpdate(userId, postType, text, opts = {}) {
  const type = POST_TYPE_ALLOWED.includes(String(postType)) ? String(postType) : "free";
  const result = addStatusUpdate(userId, text, opts.imageUrl || "", {
    boostedHours: opts.boostedHours || 0,
    audioUrl: opts.audioUrl || "",
    mediaJson: opts.mediaJson || "",
  });
  if (result?.id) {
    try {
      db().prepare("UPDATE status_updates SET post_type = ? WHERE id = ?")
        .run(type, result.id);
    } catch {}
  }
  return { ...result, postType: type };
}
`;
  src += FN;
  changed = true;
  console.log("✓ Buschfunk-Typen Helpers angefügt.");
}

if (changed) {
  writeFileSync(DB_PATH, src);
  console.log("\\n✓ db.js gepatched (Buschfunk-Typen).");
} else {
  console.log("\\n✓ Nichts zu tun.");
}
