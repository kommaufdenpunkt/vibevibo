// 🏆 Auszeichnungen — Patch fuer DB + Auto-Trigger-Funktionen.
// Erstellt 2 Tabellen + Helper. Idempotent.
//
//   cd ~/vibevibo && node scripts/patch-achievements.mjs

import fs from "fs";
import path from "path";

const ROOT = process.env.VIBEVIBO_ROOT || path.join(process.env.HOME || ".", "vibevibo");
const DB_PATH = path.join(ROOT, "lib", "db.js");

if (!fs.existsSync(DB_PATH)) {
  console.error(`✗ ${DB_PATH} nicht gefunden`);
  process.exit(1);
}

const content = fs.readFileSync(DB_PATH, "utf-8");
const MARKER_T = "// 🏆 ACHIEVEMENTS_TABLES_V1";
const MARKER_FN = "// 🏆 ACHIEVEMENTS_FN_V1";

let out = content;
let changed = false;

// 1) Tabellen (CREATE TABLE IF NOT EXISTS — idempotent durch SQLite selbst)
if (!out.includes(MARKER_T)) {
  // An CREATE-Sektion anhaengen: Anker = letzter CREATE INDEX im init
  const ANCHOR = `CREATE INDEX IF NOT EXISTS idx_modlog_user ON mod_log(user_id, created_at DESC);`;
  if (!out.includes(ANCHOR)) {
    console.error("✗ CREATE-Anker nicht gefunden");
    process.exit(1);
  }
  const INJECT = `CREATE INDEX IF NOT EXISTS idx_modlog_user ON mod_log(user_id, created_at DESC);
    ${MARKER_T}
    CREATE TABLE IF NOT EXISTS user_achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      slug TEXT NOT NULL,
      earned_at INTEGER NOT NULL,
      claimed_at INTEGER DEFAULT 0,
      UNIQUE(user_id, slug)
    );
    CREATE INDEX IF NOT EXISTS idx_user_ach_user ON user_achievements(user_id, earned_at DESC);`;
  out = out.replace(ANCHOR, INJECT);
  changed = true;
  console.log("✓ Achievements-Tabellen-Marker eingefuegt.");
} else {
  console.log("✓ Tabellen-Marker schon da — skip.");
}

// 2) Helper-Funktionen
if (!out.includes(MARKER_FN)) {
  const FN = `

${MARKER_FN}
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
    const info = db().prepare(\`
      INSERT INTO user_achievements (user_id, slug, earned_at)
      VALUES (?, ?, ?)
    \`).run(userId, slug, Date.now());
    return info.changes > 0;
  } catch (e) {
    // UNIQUE-Violation = schon vorhanden
    return false;
  }
}

// 🏆 Liste der Auszeichnungen eines Users (slug + Zeitpunkt)
export function listAchievements(userId) {
  if (!userId) return [];
  return db().prepare(\`
    SELECT slug, earned_at AS earnedAt, claimed_at AS claimedAt
    FROM user_achievements WHERE user_id = ?
    ORDER BY earned_at DESC
  \`).all(userId);
}

// 🏆 Karten-Bonus als beansprucht markieren
export function claimAchievementBonus(userId, slug) {
  if (!userId || !slug) return false;
  const info = db().prepare(\`
    UPDATE user_achievements SET claimed_at = ?
    WHERE user_id = ? AND slug = ? AND claimed_at = 0
  \`).run(Date.now(), userId, slug);
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
`;
  out = out.replace(/\s+$/, "") + FN;
  changed = true;
  console.log("✓ Achievements-Helper angehaengt.");
} else {
  console.log("✓ Helper schon da — skip.");
}

if (changed) {
  fs.writeFileSync(DB_PATH, out, "utf-8");
  console.log("\n✓ db.js gepatched. Server-Restart noetig.");
} else {
  console.log("\n✓ Bereits aktuell.");
}
