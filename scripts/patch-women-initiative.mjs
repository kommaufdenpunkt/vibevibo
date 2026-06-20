#!/usr/bin/env node
// 🩷 Frauen-Initiative-System — Männer können nicht direkt anschreiben.
//
// Spalten:
//   • users.women_initiative — 0/1 (opt-in für Frauen)
//
// Regel:
//   • Frau mit women_initiative=1 + Mann ohne Chat-Vorgeschichte + nicht-Friend
//     → DM blockiert. Mann muss kommentieren/reagieren bis Frau zuerst schreibt.
//   • Männer können weiterhin kommentieren/reagieren auf Posts der Frau.
//   • Wenn ein Mann ≥3× auf ihre Posts kommentiert → erscheint im 🩷 Admirers-Tab.
//
// Helpers:
//   • setWomenInitiative(userId, enabled)
//   • getWomenInitiative(userId)
//   • listMyAdmirers(womanId) — Männer mit ≥3 Kommentaren/Pinnwand auf ihre Posts

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_COL = "/* 🩷 WOMEN_INITIATIVE_COL_V1 */";
const MARK_FN  = "// 🩷 WOMEN_INITIATIVE_FN_V1";

let src = readFileSync(DB_PATH, "utf-8");
let changed = false;

if (!src.includes(MARK_COL)) {
  const ANCHOR = `addColumnIfMissing(d, "users", "gender", "TEXT DEFAULT ''");`;
  if (!src.includes(ANCHOR)) { console.error("✗ Anker users.gender fehlt"); process.exit(1); }
  const INJECT = `${ANCHOR}

  ${MARK_COL}
  addColumnIfMissing(d, "users", "women_initiative", "INTEGER DEFAULT 0");`;
  src = src.replace(ANCHOR, INJECT);
  changed = true;
  console.log("✓ users.women_initiative ergänzt.");
}

if (!src.includes(MARK_FN)) {
  const FN = `

${MARK_FN}
// 🩷 Frauen-Initiative-System Helpers

const ADMIRER_MIN_INTERACTIONS = 3;

export function setWomenInitiative(userId, enabled) {
  try {
    db().prepare("UPDATE users SET women_initiative = ? WHERE id = ?")
      .run(enabled ? 1 : 0, Number(userId));
    return true;
  } catch { return false; }
}

export function getWomenInitiative(userId) {
  try {
    const r = db().prepare("SELECT women_initiative FROM users WHERE id = ?").get(Number(userId));
    return !!(r?.women_initiative);
  } catch { return false; }
}

// Liste der Männer die mindestens N-mal auf Posts der Frau kommentiert/reagiert haben.
// Quellen: pinnwand (sie als target), buschfunk_comments auf ihre status_updates/pinnwand.
export function listMyAdmirers(womanId) {
  const me = Number(womanId);
  if (!me) return [];
  try {
    const rows = db().prepare(\`
      SELECT u.id, u.username, u.display_name AS displayName,
             u.avatar_url AS avatarUrl, u.avatar_status AS avatarStatus,
             u.emoji, u.gender, u.last_seen AS lastSeen, u.xp,
             COUNT(*) AS interactions,
             MAX(ts) AS lastInteractionAt
        FROM (
          SELECT from_user_id AS uid, created_at AS ts
            FROM pinnwand
           WHERE target_user_id = ?
          UNION ALL
          SELECT bc.user_id AS uid, bc.created_at AS ts
            FROM buschfunk_comments bc
            JOIN status_updates su ON su.id = bc.post_id AND bc.post_type = 'status'
           WHERE su.user_id = ?
          UNION ALL
          SELECT bc.user_id AS uid, bc.created_at AS ts
            FROM buschfunk_comments bc
            JOIN pinnwand p ON p.id = bc.post_id AND bc.post_type = 'pinnwand'
           WHERE p.target_user_id = ?
        ) src
        JOIN users u ON u.id = src.uid
       WHERE u.gender = 'm'
         AND u.id != ?
         AND u.status = 'approved'
       GROUP BY u.id
      HAVING interactions >= ?
       ORDER BY interactions DESC, lastInteractionAt DESC
       LIMIT 50
    \`).all(me, me, me, me, ADMIRER_MIN_INTERACTIONS) || [];
    return rows;
  } catch (e) {
    return [];
  }
}

// Berücksichtigt von canMessage (privacy.js): blockt Mann→Frau ohne Chat-Vorgeschichte
// wenn die Frau women_initiative=1 hat.
export function isWomenInitiativeBlocking(senderId, recipientId) {
  try {
    const recip = db().prepare("SELECT gender, women_initiative AS wi FROM users WHERE id = ?").get(Number(recipientId));
    if (!recip || !recip.wi || recip.gender !== "w") return false;
    const sender = db().prepare("SELECT gender FROM users WHERE id = ?").get(Number(senderId));
    if (!sender || sender.gender !== "m") return false;
    // Mann an Frau → wenn schon Chat-Verlauf existiert: erlaubt
    if (typeof hasMessageHistory === "function" && hasMessageHistory(senderId, recipientId)) return false;
    // Freunde: erlaubt
    if (typeof areFriendsForPrivacy === "function" && areFriendsForPrivacy(senderId, recipientId)) return false;
    return true;
  } catch { return false; }
}
`;
  src += FN;
  changed = true;
  console.log("✓ Frauen-Initiative Helpers angefügt.");
}

if (changed) {
  writeFileSync(DB_PATH, src);
  console.log("\\n✓ db.js gepatched (Frauen-Initiative).");
} else {
  console.log("\\n✓ Nichts zu tun.");
}
