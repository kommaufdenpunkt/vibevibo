#!/usr/bin/env node
// 🧹 clearFriendshipBetween — entfernt alle friend_requests Einträge zwischen 2 Usern.
//
// Wird vom /api/me/blocks POST-Endpoint aufgerufen, damit eine bestehende
// Freundschaft beim Block automatisch aufgehoben wird.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK = "// 🧹 CLEAR_FRIENDSHIP_V1";

let src = readFileSync(DB_PATH, "utf-8");
if (src.includes(MARK)) {
  console.log("✓ Marker bereits drin — skip.");
  process.exit(0);
}

const FN = `

${MARK}
// 🧹 Entfernt alle friend_requests in BEIDE Richtungen zwischen 2 Usern.
// Egal welcher Status — pending, accepted, declined — alles weg.
// Return: Anzahl der gelöschten Zeilen.

export function clearFriendshipBetween(aId, bId) {
  const a = Number(aId), b = Number(bId);
  if (!a || !b || a === b) return 0;
  try {
    const r = db().prepare(\`
      DELETE FROM friend_requests
       WHERE (from_id = ? AND to_id = ?)
          OR (from_id = ? AND to_id = ?)
    \`).run(a, b, b, a);
    return r.changes || 0;
  } catch (e) {
    console.error("[clearFriendshipBetween]", e?.message);
    return 0;
  }
}
`;

writeFileSync(DB_PATH, src + FN);
console.log("✓ clearFriendshipBetween angefügt.");
