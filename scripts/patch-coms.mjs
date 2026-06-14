// 🏘 Gruppen → Coms — Patch fuer Moderator-System + Nostalgia-Erweiterungen.
//
//   cd ~/vibevibo && node scripts/patch-coms.mjs

import fs from "fs";
import path from "path";

const ROOT = process.env.VIBEVIBO_ROOT || path.join(process.env.HOME || ".", "vibevibo");
const DB_PATH = path.join(ROOT, "lib", "db.js");

if (!fs.existsSync(DB_PATH)) {
  console.error(`✗ ${DB_PATH} nicht gefunden`);
  process.exit(1);
}

const content = fs.readFileSync(DB_PATH, "utf-8");
const MARKER_COLS = "// 🏘 COMS_COLS_V1";
const MARKER_FN = "// 🏘 COMS_FN_V1";

let out = content;
let changed = false;

// 1) Neue Spalten zu groups-Tabelle (via addColumnIfMissing)
if (!out.includes(MARKER_COLS)) {
  // Anker: irgendwo wo addColumnIfMissing fuer groups verwendet wird, oder allgemein
  // Wir suchen nach dem Punkt direkt nach den users-Patches
  const ANCHOR = `addColumnIfMissing(d, "users", "strict_first_msg", "INTEGER DEFAULT 0");`;
  if (!out.includes(ANCHOR)) {
    console.error("✗ Anker nicht gefunden — bitte erst patch-privacy-v2.mjs ausfuehren");
    process.exit(1);
  }
  const INJECT = `addColumnIfMissing(d, "users", "strict_first_msg", "INTEGER DEFAULT 0");
  ${MARKER_COLS}
  // 🏘 Coms-Erweiterungen fuer groups
  addColumnIfMissing(d, "groups", "motto", "TEXT DEFAULT ''");
  addColumnIfMissing(d, "groups", "rules", "TEXT DEFAULT ''");
  addColumnIfMissing(d, "groups", "cover_emoji", "TEXT DEFAULT ''");
  addColumnIfMissing(d, "groups", "join_mode", "TEXT DEFAULT 'open'");  // open|request|invite
  addColumnIfMissing(d, "groups", "theme_color", "TEXT DEFAULT '#ec4899'");`;
  out = out.replace(ANCHOR, INJECT);
  changed = true;
  console.log("✓ Coms-Spalten ergaenzt.");
} else {
  console.log("✓ Spalten schon da — skip.");
}

// 2) Helper-Funktionen
if (!out.includes(MARKER_FN)) {
  const FN = `

${MARKER_FN}
// 🏘 Coms-Helpers

// Liste der Members mit Rollen (owner > mod > member)
export function getComsMembers(groupId) {
  return db().prepare(\`
    SELECT gm.user_id AS userId, gm.role, gm.joined_at AS joinedAt,
           u.username, u.display_name AS displayName, u.emoji, u.avatar_url AS avatarUrl,
           u.avatar_status AS avatarStatus, u.last_seen AS lastSeen, u.gender, u.birthdate
    FROM group_members gm JOIN users u ON u.id = gm.user_id
    WHERE gm.group_id = ?
    ORDER BY
      CASE gm.role WHEN 'owner' THEN 0 WHEN 'mod' THEN 1 ELSE 2 END,
      gm.joined_at ASC
  \`).all(Number(groupId));
}

// Rolle eines Users in einer Gruppe pruefen
export function getComsRole(groupId, userId) {
  const r = db().prepare(
    "SELECT role FROM group_members WHERE group_id = ? AND user_id = ?"
  ).get(Number(groupId), Number(userId));
  return r?.role || null;
}

// Rolle setzen (Owner promoviert User zu Mod oder degradiert)
export function setComsRole(groupId, userId, role) {
  if (!["owner", "mod", "member"].includes(role)) return false;
  // Owner-Rolle kann nicht ueber diese Funktion vergeben werden (nur via Transfer)
  if (role === "owner") return false;
  const info = db().prepare(\`
    UPDATE group_members SET role = ?
    WHERE group_id = ? AND user_id = ? AND role != 'owner'
  \`).run(role, Number(groupId), Number(userId));
  return info.changes > 0;
}

// User aus Gruppe entfernen (Owner kann nicht gekickt werden)
export function kickComsMember(groupId, userId) {
  const info = db().prepare(\`
    DELETE FROM group_members
    WHERE group_id = ? AND user_id = ? AND role != 'owner'
  \`).run(Number(groupId), Number(userId));
  return info.changes > 0;
}

// Gruppe modifizieren (Owner only, Whitelist)
export function updateComsMeta(groupId, patch) {
  const ALLOWED = ["name", "description", "emoji", "motto", "rules", "cover_emoji", "join_mode", "theme_color"];
  const cols = []; const vals = [];
  for (const k of ALLOWED) {
    if (patch && Object.prototype.hasOwnProperty.call(patch, k)) {
      cols.push(\`\${k} = ?\`);
      vals.push(patch[k]);
    }
  }
  if (cols.length === 0) return false;
  vals.push(Number(groupId));
  db().prepare(\`UPDATE groups SET \${cols.join(", ")} WHERE id = ?\`).run(...vals);
  return true;
}

// Gruppen-Post loeschen (Mod/Owner)
export function deleteComsPost(postId) {
  const info = db().prepare("DELETE FROM group_posts WHERE id = ?").run(Number(postId));
  return info.changes > 0;
}

// Detailliertes Gruppen-Info inkl. Coms-Felder
export function getComsBySlug(slug) {
  const g = db().prepare(\`
    SELECT g.*,
      (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) AS memberCount,
      (SELECT COUNT(*) FROM group_posts WHERE group_id = g.id) AS postCount,
      o.username AS ownerUsername, o.display_name AS ownerDisplayName
    FROM groups g LEFT JOIN users o ON o.id = g.owner_id
    WHERE g.slug = ?
  \`).get(slug);
  return g || null;
}
`;
  out = out.replace(/\s+$/, "") + FN;
  changed = true;
  console.log("✓ Coms-Helper angehaengt.");
} else {
  console.log("✓ Helper schon da — skip.");
}

if (changed) {
  fs.writeFileSync(DB_PATH, out, "utf-8");
  console.log("\n✓ db.js gepatched. Server-Restart noetig.");
} else {
  console.log("\n✓ Bereits aktuell.");
}
