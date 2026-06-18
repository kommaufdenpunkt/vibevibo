#!/usr/bin/env node
// 🎂 Com-Geburtstagskalender — Helper für anstehende Geburtstage in der Com.
// Kein Schema-Change: nutzt vorhandenes users.birthdate.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_FN = "// 🎂 COM_BIRTHDAYS_FN_V1";

let src = readFileSync(DB_PATH, "utf-8");

if (src.includes(MARK_FN)) {
  console.log("✓ Birthdays-Helper schon drin.");
  process.exit(0);
}

const FN = `

${MARK_FN}
// 🎂 Geburtstagskalender für Coms.
// Returnt Mitglieder dieser Com, deren Geburtstag in den nächsten daysAhead
// Tagen liegt — inkl. heute. Sortiert nach Tagen-bis-Geburtstag aufsteigend.

export function getUpcomingComBirthdays(groupId, { daysAhead = 7 } = {}) {
  const members = db().prepare(\`
    SELECT u.id, u.username, u.display_name AS displayName, u.emoji,
           u.birthdate, u.avatar_url AS avatarUrl, u.avatar_status AS avatarStatus
      FROM group_members gm
      JOIN users u ON u.id = gm.user_id
     WHERE gm.group_id = ?
       AND u.birthdate IS NOT NULL
       AND u.birthdate != ''
  \`).all(Number(groupId));

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const out = [];

  for (const m of members) {
    const d = new Date(m.birthdate);
    if (isNaN(d.getTime())) continue;
    // Nächster Geburtstag relativ zu heute
    let next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
    if (next < today) {
      next = new Date(today.getFullYear() + 1, d.getMonth(), d.getDate());
    }
    const daysUntil = Math.round((next - today) / (24 * 3600 * 1000));
    if (daysUntil > daysAhead) continue;
    const age = next.getFullYear() - d.getFullYear();
    out.push({
      userId: m.id,
      username: m.username,
      displayName: m.displayName,
      emoji: m.emoji,
      avatarUrl: m.avatarStatus === "approved" ? m.avatarUrl : "",
      birthMonth: d.getMonth() + 1,
      birthDay: d.getDate(),
      daysUntil,
      turningAge: age,
    });
  }
  out.sort((a, b) => a.daysUntil - b.daysUntil);
  return out;
}
`;

src += FN;
writeFileSync(DB_PATH, src);
console.log("✓ getUpcomingComBirthdays Helper angefügt.");
