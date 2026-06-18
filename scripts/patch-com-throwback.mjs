#!/usr/bin/env node
// 📼 Throwback — Helper für nostalgische "Vor X Monaten/Jahren"-Posts.
// Kein Schema-Change — nur SELECT-Helper auf existierende group_posts.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_FN = "// 📼 COM_THROWBACK_FN_V1";

let src = readFileSync(DB_PATH, "utf-8");

if (src.includes(MARK_FN)) {
  console.log("✓ Throwback-Helper schon drin.");
  process.exit(0);
}

const FN = `

${MARK_FN}
// 📼 Throwback-Posts: Wand-Posts dieser Com, die mindestens N Tage alt sind.
// Returnt nur "alte" Posts, sortiert nach Alter absteigend (älteste zuerst → echtes
// "tief in der Vergangenheit kramen"-Gefühl). Falls preferAnniversary=true werden
// nur Posts angezeigt, die innerhalb ±7 Tagen um das heutige Kalender-Datum vor
// X Jahren liegen (Jappy-Style "Vor genau X Jahren an diesem Tag").

export function listComThrowbacks(groupId, { minAgeDays = 30, limit = 8, preferAnniversary = true } = {}) {
  const now = Date.now();
  const cutoff = now - minAgeDays * 24 * 3600 * 1000;
  const rows = db().prepare(\`
    SELECT gp.id, gp.text, gp.created_at AS at,
           u.username, u.display_name AS displayName, u.emoji
      FROM group_posts gp
      JOIN users u ON u.id = gp.user_id
     WHERE gp.group_id = ? AND gp.created_at <= ?
     ORDER BY gp.created_at DESC
     LIMIT 200
  \`).all(Number(groupId), cutoff);

  if (!preferAnniversary || rows.length === 0) {
    return rows.slice(0, limit);
  }

  // Anniversary-Filter: gleicher Monat + Tag ±7 wie heute
  const today = new Date(now);
  const todayDOY = _dayOfYear(today);
  const annoMatches = [];
  const others = [];
  for (const r of rows) {
    const d = new Date(r.at);
    const doy = _dayOfYear(d);
    const diff = Math.min(Math.abs(doy - todayDOY), 365 - Math.abs(doy - todayDOY));
    if (diff <= 7) annoMatches.push(r);
    else others.push(r);
  }

  // Erst Anniversary-Treffer, dann Rest auffüllen
  return [...annoMatches, ...others].slice(0, limit);
}

function _dayOfYear(d) {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d - start;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
`;

src += FN;
writeFileSync(DB_PATH, src);
console.log("✓ listComThrowbacks Helper angefügt.");
