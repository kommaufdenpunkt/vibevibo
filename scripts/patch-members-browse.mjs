#!/usr/bin/env node
// 👥 Members-Browse — Helper für die öffentliche Mitglieder-Page.
//
// Nutzt existierende native Helpers (blockedUserIdsFor) — kein neues Schema.
//
// listMembersForBrowse({ meId, q, filter, limit, offset })
//   filter: "all" | "online" | "new" | "vip" | "birthday"

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK = "// 👥 MEMBERS_BROWSE_V1";

let src = readFileSync(DB_PATH, "utf-8");
if (src.includes(MARK)) {
  console.log("✓ Marker bereits drin — skip.");
  process.exit(0);
}

const FN = `

${MARK}
// 👥 Mitglieder-Browse für öffentliche /mitglieder-Page.
// Respektiert: hide_visits, Bots ausgeblendet, blockierte User (bilateral).

export function listMembersForBrowse({ meId, q = "", filter = "all", limit = 24, offset = 0 } = {}) {
  const me = Number(meId);
  if (!me) return { rows: [], total: 0 };

  const hidden = blockedUserIdsFor(me);

  let where = \`
    WHERE u.status = 'approved'
      AND COALESCE(u.role, '') != 'bot'
      AND u.id != ?
      AND COALESCE(u.hide_visits, 0) = 0
  \`;
  const params = [me];

  if (hidden && hidden.size > 0) {
    const arr = Array.from(hidden);
    const ph = arr.map(() => "?").join(",");
    where += \` AND u.id NOT IN (\${ph}) \`;
    params.push(...arr);
  }

  const qTrim = String(q || "").trim().toLowerCase();
  if (qTrim) {
    where += \` AND (
      LOWER(u.username) LIKE ? OR
      LOWER(COALESCE(u.display_name,'')) LIKE ? OR
      LOWER(COALESCE(u.city,'')) LIKE ? OR
      LOWER(COALESCE(u.school,'')) LIKE ?
    ) \`;
    const like = "%" + qTrim + "%";
    params.push(like, like, like, like);
  }

  const now = Date.now();
  if (filter === "online") {
    where += " AND u.last_seen > ? ";
    params.push(now - 5 * 60 * 1000);
  } else if (filter === "new") {
    where += " AND u.created_at > ? ";
    params.push(now - 7 * 24 * 60 * 60 * 1000);
  } else if (filter === "vip") {
    where += " AND COALESCE(u.premium_badges, '') NOT IN ('', '[]') ";
  } else if (filter === "birthday") {
    where += " AND u.birthdate IS NOT NULL AND u.birthdate != '' AND strftime('%m-%d', u.birthdate) = strftime('%m-%d', 'now') ";
  }

  let total = 0;
  try {
    const r = db().prepare(\`SELECT COUNT(*) AS c FROM users u \${where}\`).get(...params);
    total = r?.c || 0;
  } catch (e) {
    console.error("[listMembersForBrowse:count]", e?.message);
    return { rows: [], total: 0 };
  }

  let rows = [];
  try {
    rows = db().prepare(\`
      SELECT u.id, u.username, u.display_name AS displayName, u.emoji,
             u.avatar_url AS avatarUrl, u.avatar_status AS avatarStatus,
             u.gender, u.birthdate, u.last_seen AS lastSeen,
             u.city, u.school, u.premium_badges AS premiumBadges,
             u.created_at AS createdAt
        FROM users u
        \${where}
       ORDER BY u.last_seen DESC, u.id DESC
       LIMIT ? OFFSET ?
    \`).all(...params, Number(limit), Number(offset)) || [];
  } catch (e) {
    console.error("[listMembersForBrowse:list]", e?.message);
    rows = [];
  }

  return { rows, total };
}
`;

writeFileSync(DB_PATH, src + FN);
console.log("✓ listMembersForBrowse angefügt.");
