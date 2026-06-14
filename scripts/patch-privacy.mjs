// 🛡 Privatsphäre-Schutz — idempotenter DB-Patch.
// Fuegt 4 Spalten zur users-Tabelle hinzu + 2 Helper:
//   updateUserPrivacy(userId, patch)
//   areFriendsForPrivacy(aId, bId)
//
// Aufruf:
//   cd ~/vibevibo && node scripts/patch-privacy.mjs
//
// Mehrfach aufrufen ist sicher (Marker-Checks).

import fs from "fs";
import path from "path";

const ROOT = process.env.VIBEVIBO_ROOT || path.join(process.env.HOME || ".", "vibevibo");
const DB_PATH = path.join(ROOT, "lib", "db.js");

if (!fs.existsSync(DB_PATH)) {
  console.error(`✗ ${DB_PATH} nicht gefunden`);
  process.exit(1);
}

const content = fs.readFileSync(DB_PATH, "utf-8");
const MARKER_COLS = "// 🛡 PRIVACY_COLS_V1";
const MARKER_FN = "// 🛡 PRIVACY_FN_V1";

let out = content;
let changed = false;

// 1) Spalten ergaenzen
if (!out.includes(MARKER_COLS)) {
  const ADD_AFTER = `addColumnIfMissing(d, "users", "gender", "TEXT DEFAULT ''");`;
  if (!out.includes(ADD_AFTER)) {
    console.error("✗ Anker fuer Spalten-Patch nicht gefunden");
    process.exit(1);
  }
  const INJECT_COLS = `addColumnIfMissing(d, "users", "gender", "TEXT DEFAULT ''");
  ${MARKER_COLS}
  addColumnIfMissing(d, "users", "dm_policy", "TEXT DEFAULT 'open'");
  addColumnIfMissing(d, "users", "wall_policy", "TEXT DEFAULT 'open'");
  addColumnIfMissing(d, "users", "hide_visits", "INTEGER DEFAULT 0");
  addColumnIfMissing(d, "users", "shield_mode", "INTEGER DEFAULT 0");`;
  out = out.replace(ADD_AFTER, INJECT_COLS);
  changed = true;
  console.log("✓ Privacy-Spalten ergaenzt.");
} else {
  console.log("✓ Spalten schon da — skip.");
}

// 2) Helper-Funktionen ans Ende der Datei haengen
if (!out.includes(MARKER_FN)) {
  const FN_BLOCK = `

${MARKER_FN}
// 🛡 Update Privatsphaere-Spalten in users.
// patch: { dm_policy?, wall_policy?, hide_visits?, shield_mode? }
export function updateUserPrivacy(userId, patch) {
  const ALLOWED = ["dm_policy", "wall_policy", "hide_visits", "shield_mode"];
  const cols = []; const vals = [];
  for (const k of ALLOWED) {
    if (patch && Object.prototype.hasOwnProperty.call(patch, k)) {
      cols.push(\`\${k} = ?\`);
      vals.push(patch[k]);
    }
  }
  if (cols.length === 0) return false;
  vals.push(userId);
  db().prepare(\`UPDATE users SET \${cols.join(", ")} WHERE id = ?\`).run(...vals);
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
  const tf = d.prepare(\`
    SELECT 1 FROM top_friends
    WHERE (user_id = ? AND buddy_id = ?)
       OR (user_id = ? AND buddy_id = ?)
    LIMIT 1
  \`).get(aId, bId, bId, aId);
  if (tf) return true;
  // Bestehende Konversation (egal welche Richtung)
  const conv = d.prepare(\`
    SELECT 1 FROM messages
    WHERE (from_user_id = ? AND to_user_id = ?)
       OR (from_user_id = ? AND to_user_id = ?)
    LIMIT 1
  \`).get(aId, bId, bId, aId);
  if (conv) return true;
  // Partnerschaft
  const partner = d.prepare("SELECT partner_user_id FROM users WHERE id = ?").get(aId);
  if (partner?.partner_user_id === bId) return true;
  return false;
}
`;
  out = out.replace(/\s+$/, "") + FN_BLOCK;
  changed = true;
  console.log("✓ Helper-Funktionen angehaengt.");
} else {
  console.log("✓ Helper schon da — skip.");
}

if (changed) {
  fs.writeFileSync(DB_PATH, out, "utf-8");
  console.log("");
  console.log("✓ db.js gepatched. Server-Restart noetig (Coolify-Build).");
} else {
  console.log("");
  console.log("✓ Bereits aktuell — keine Aenderung.");
}
