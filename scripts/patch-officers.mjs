#!/usr/bin/env node
// 👮 Officer-Permissions + Coms-Liste-Erweiterung — idempotent.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_COL = "/* 👮 OFFICER_COL_V1 */";
const MARK_FN = "// 👮 OFFICER_FN_V1";

let src = readFileSync(DB_PATH, "utf-8");
let changed = false;

// 1) Spalte officer_perms an group_members
if (!src.includes(MARK_COL)) {
  const ANCHOR = `addColumnIfMissing(d, "groups", "welcome_post", "TEXT DEFAULT ''");`;
  if (!src.includes(ANCHOR)) {
    console.error("✗ Anker welcome_post nicht gefunden — erst patch-coms-batch-a ausführen.");
    process.exit(1);
  }
  const INJECT = `${ANCHOR}
  ${MARK_COL}
  // 👮 Officer-Permissions als JSON-Array. Default = leer (View-Only-Officer).
  // Beim Promote vergibt der Owner die Rechte. Bestehende Mods werden migriert mit allen Standard-Perms.
  addColumnIfMissing(d, "group_members", "officer_perms", "TEXT DEFAULT '[]'");
  try {
    d.prepare(\`
      UPDATE group_members
         SET officer_perms = '["kick","delete-posts","pin-threads","lock-threads","delete-threads"]'
       WHERE role = 'mod' AND (officer_perms = '[]' OR officer_perms IS NULL)
    \`).run();
  } catch {}`;
  src = src.replace(ANCHOR, INJECT);
  changed = true;
  console.log("✓ group_members.officer_perms ergaenzt + Migration für bestehende Mods.");
}

// 2) Helpers
if (!src.includes(MARK_FN)) {
  const FN = `

${MARK_FN}
// 👮 Officer-Permissions + Owner-Transfer Helpers

export const OFFICER_PERMS = [
  { id: "kick",           label: "Mitglieder kicken" },
  { id: "delete-posts",   label: "Wand-Posts löschen" },
  { id: "pin-threads",    label: "Threads anpinnen" },
  { id: "lock-threads",   label: "Threads sperren" },
  { id: "delete-threads", label: "Threads/Replies löschen" },
  { id: "edit-meta",      label: "Com-Infos bearbeiten (Motto/Regeln/Theme)" },
  { id: "post-news",      label: "News-Posts schreiben" },
  { id: "create-events",  label: "Events erstellen" },
];
export const ALL_PERM_IDS = OFFICER_PERMS.map((p) => p.id);

export function getOfficerPerms(groupId, userId) {
  const row = db().prepare(\`
    SELECT role, officer_perms AS perms FROM group_members
     WHERE group_id = ? AND user_id = ?
  \`).get(Number(groupId), Number(userId));
  if (!row) return [];
  if (row.role === "owner") return ALL_PERM_IDS; // Owner hat alles
  if (row.role !== "mod") return [];
  try {
    const arr = JSON.parse(row.perms || "[]");
    return Array.isArray(arr) ? arr.filter((x) => ALL_PERM_IDS.includes(x)) : [];
  } catch { return []; }
}

export function hasOfficerPerm(groupId, userId, perm) {
  return getOfficerPerms(groupId, userId).includes(perm);
}

export function setOfficerPerms(groupId, userId, perms) {
  const clean = Array.isArray(perms)
    ? perms.filter((p) => ALL_PERM_IDS.includes(p))
    : [];
  db().prepare(\`
    UPDATE group_members SET officer_perms = ?
     WHERE group_id = ? AND user_id = ? AND role IN ('mod','owner')
  \`).run(JSON.stringify(clean), Number(groupId), Number(userId));
  return clean;
}

export function transferComOwnership(groupId, fromUserId, toUserId) {
  // beide müssen Mitglied sein, fromUser muss Owner sein
  const from = db().prepare("SELECT role FROM group_members WHERE group_id = ? AND user_id = ?")
    .get(Number(groupId), Number(fromUserId));
  if (!from || from.role !== "owner") throw new Error("Du bist nicht Owner.");
  const to = db().prepare("SELECT role FROM group_members WHERE group_id = ? AND user_id = ?")
    .get(Number(groupId), Number(toUserId));
  if (!to) throw new Error("Der neue Owner muss Mitglied sein.");
  const tx = db().transaction(() => {
    // Alter Owner wird Mod (mit allen Rechten als historischer Owner)
    db().prepare(\`
      UPDATE group_members
         SET role = 'mod',
             officer_perms = ?
       WHERE group_id = ? AND user_id = ?
    \`).run(JSON.stringify(ALL_PERM_IDS), Number(groupId), Number(fromUserId));
    // Neuer Owner
    db().prepare(\`
      UPDATE group_members
         SET role = 'owner', officer_perms = '[]'
       WHERE group_id = ? AND user_id = ?
    \`).run(Number(groupId), Number(toUserId));
    db().prepare(\`UPDATE groups SET owner_id = ? WHERE id = ?\`)
      .run(Number(toUserId), Number(groupId));
  });
  tx();
  return true;
}

// Owner verlässt die Com komplett — Com wird besitzerlos.
export function releaseComOwnership(groupId, userId) {
  const row = db().prepare("SELECT role FROM group_members WHERE group_id = ? AND user_id = ?")
    .get(Number(groupId), Number(userId));
  if (!row || row.role !== "owner") throw new Error("Nur Owner kann sich abdanken.");
  const tx = db().transaction(() => {
    db().prepare("UPDATE groups SET owner_id = NULL WHERE id = ?").run(Number(groupId));
    db().prepare("DELETE FROM group_members WHERE group_id = ? AND user_id = ?")
      .run(Number(groupId), Number(userId));
  });
  tx();
  return true;
}

// Ein Mod beansprucht die besitzerlose Com.
export function claimOrphanCom(groupId, userId) {
  const g = db().prepare("SELECT owner_id FROM groups WHERE id = ?").get(Number(groupId));
  if (!g) throw new Error("Com nicht gefunden.");
  if (g.owner_id != null) throw new Error("Com hat schon einen Owner.");
  const m = db().prepare("SELECT role FROM group_members WHERE group_id = ? AND user_id = ?")
    .get(Number(groupId), Number(userId));
  if (!m || m.role !== "mod") throw new Error("Nur Officer können besitzerlose Coms übernehmen.");
  const tx = db().transaction(() => {
    db().prepare(\`
      UPDATE group_members SET role = 'owner', officer_perms = '[]'
       WHERE group_id = ? AND user_id = ?
    \`).run(Number(groupId), Number(userId));
    db().prepare("UPDATE groups SET owner_id = ? WHERE id = ?")
      .run(Number(userId), Number(groupId));
  });
  tx();
  return true;
}

// Erweiterte Coms-Liste mit Owner-Username
export function listGroupsWithOwner() {
  return db().prepare(\`
    SELECT g.id, g.slug, g.name, g.description, g.emoji, g.created_at AS at,
           (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) AS member_count,
           (SELECT COUNT(*) FROM group_posts WHERE group_id = g.id) AS post_count,
           u.username AS owner_username,
           u.display_name AS owner_display_name,
           u.emoji AS owner_emoji
      FROM groups g
      LEFT JOIN users u ON u.id = g.owner_id
     ORDER BY g.created_at DESC
  \`).all();
}
`;
  src += FN;
  changed = true;
  console.log("✓ Officer-Helper angehängt (getOfficerPerms, setOfficerPerms, transferComOwnership, releaseComOwnership, claimOrphanCom, listGroupsWithOwner).");
}

if (changed) {
  writeFileSync(DB_PATH, src);
  console.log("\\n✓ db.js gepatched.");
} else {
  console.log("\\n✓ Nichts zu tun.");
}
