// 🛡 Privatsphäre-Schutz V2 — idempotenter DB-Patch.
// Erweitert V1 um Ruhezeiten + Strict-First-Message.
//
// Aufruf:
//   cd ~/vibevibo && node scripts/patch-privacy-v2.mjs

import fs from "fs";
import path from "path";

const ROOT = process.env.VIBEVIBO_ROOT || path.join(process.env.HOME || ".", "vibevibo");
const DB_PATH = path.join(ROOT, "lib", "db.js");

if (!fs.existsSync(DB_PATH)) {
  console.error(`✗ ${DB_PATH} nicht gefunden`);
  process.exit(1);
}

const content = fs.readFileSync(DB_PATH, "utf-8");
const MARKER_COLS_V2 = "// 🛡 PRIVACY_COLS_V2";
const MARKER_FN_V2 = "// 🛡 PRIVACY_FN_V2";

let out = content;
let changed = false;

// 1) Neue Spalten (V2)
if (!out.includes(MARKER_COLS_V2)) {
  // Anker: nach V1-Spalten einfuegen
  const ADD_AFTER = `addColumnIfMissing(d, "users", "shield_mode", "INTEGER DEFAULT 0");`;
  if (!out.includes(ADD_AFTER)) {
    console.error("✗ V1-Anker nicht gefunden — bitte erst patch-privacy.mjs ausfuehren");
    process.exit(1);
  }
  const INJECT = `addColumnIfMissing(d, "users", "shield_mode", "INTEGER DEFAULT 0");
  ${MARKER_COLS_V2}
  // Ruhezeit fuer eingehende DMs (0-23 Stunde). NULL = keine Ruhezeit.
  // Beispiel: from=22, to=8 -> Ruhezeit 22-08 Uhr (ueber Mitternacht moeglich)
  addColumnIfMissing(d, "users", "quiet_from_hour", "INTEGER");
  addColumnIfMissing(d, "users", "quiet_to_hour", "INTEGER");
  // Fidolin prueft Erst-Nachrichten mit strengerem Schwellwert
  addColumnIfMissing(d, "users", "strict_first_msg", "INTEGER DEFAULT 0");`;
  out = out.replace(ADD_AFTER, INJECT);
  changed = true;
  console.log("✓ V2-Spalten ergaenzt.");
} else {
  console.log("✓ V2-Spalten schon da — skip.");
}

// 2) Helper-Funktionen (V2)
if (!out.includes(MARKER_FN_V2)) {
  const FN_BLOCK = `

${MARKER_FN_V2}
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
  const r = db().prepare(\`
    SELECT 1 FROM messages
    WHERE (from_user_id = ? AND to_user_id = ?)
       OR (from_user_id = ? AND to_user_id = ?)
    LIMIT 1
  \`).get(senderId, recipientId, recipientId, senderId);
  return !!r;
}

// 🛡 V2: erweitere updateUserPrivacy um neue Felder
export function updateUserPrivacyV2(userId, patch) {
  const ALLOWED = ["dm_policy", "wall_policy", "hide_visits", "shield_mode",
                   "quiet_from_hour", "quiet_to_hour", "strict_first_msg"];
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

// 🛡 V2: erweiterte Privacy-Fields fuer canMessage
export function getUserPrivacyFieldsV2(userId) {
  if (!userId) return null;
  const r = db().prepare(\`
    SELECT dm_policy, wall_policy, hide_visits, shield_mode,
           quiet_from_hour, quiet_to_hour, strict_first_msg
    FROM users WHERE id = ?
  \`).get(Number(userId));
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
`;
  out = out.replace(/\s+$/, "") + FN_BLOCK;
  changed = true;
  console.log("✓ V2-Helper-Funktionen angehaengt.");
} else {
  console.log("✓ V2-Helper schon da — skip.");
}

if (changed) {
  fs.writeFileSync(DB_PATH, out, "utf-8");
  console.log("");
  console.log("✓ db.js V2 gepatched. Server-Restart noetig.");
} else {
  console.log("");
  console.log("✓ Bereits aktuell.");
}
