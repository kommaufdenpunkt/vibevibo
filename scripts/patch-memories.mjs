#!/usr/bin/env node
// 📅 „Heute vor X Jahren"-Memories — Facebook „On This Day"-Style.
//
// Findet pro User Inhalte aus dem GLEICHEN Datum (MM-DD) in vorherigen Jahren:
//   • Pinnwand-Posts die ich erhalten habe
//   • Geschenke die ich erhalten habe
//   • Fotos die ich hochgeladen habe
//   • Status-Updates die ich gepostet habe
//
// Helpers:
//   • getUserMemoriesForToday(userId, opts)  — sortiert nach Jahre-zurück DESC
//   • repostMemoryToWall(userId, memory)     — postet als „📅 Heute vor X Jahren: …"

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_FN = "// 📅 MEMORIES_FN_V1";

let src = readFileSync(DB_PATH, "utf-8");
let changed = false;

if (!src.includes(MARK_FN)) {
  const FN = `

${MARK_FN}
// 📅 „Heute vor X Jahren"-Memories — sammelt User-Content aus heutigem Tag in vorherigen Jahren

// Vergleicht created_at (ms) gegen heutiges MM-DD. Schließt aktuelles Jahr aus.
export function getUserMemoriesForToday(userId, { yearsBack = 10, limitPerType = 5 } = {}) {
  const me = Number(userId);
  if (!me) return [];

  const now = new Date();
  const todayMonth = now.getMonth() + 1;
  const todayDay = now.getDate();
  const thisYear = now.getFullYear();

  // SQLite: strftime('%m', created_at/1000, 'unixepoch') liefert "MM"-String
  // Achtung: SQLite-Integers in JS-ms umrechnen via /1000.
  const memories = [];

  // 1) Pinnwand-Posts erhalten
  try {
    const rows = db().prepare(\`
      SELECT p.id, p.text, p.from_user_id AS fromId, p.created_at AS at,
             u.username AS fromUsername, u.display_name AS fromDisplayName,
             u.avatar_url AS fromAvatarUrl, u.avatar_status AS fromAvatarStatus
        FROM pinnwand p
        JOIN users u ON u.id = p.from_user_id
       WHERE p.target_user_id = ?
         AND CAST(strftime('%m', p.created_at/1000, 'unixepoch') AS INTEGER) = ?
         AND CAST(strftime('%d', p.created_at/1000, 'unixepoch') AS INTEGER) = ?
         AND CAST(strftime('%Y', p.created_at/1000, 'unixepoch') AS INTEGER) < ?
       ORDER BY p.created_at DESC
       LIMIT ?
    \`).all(me, todayMonth, todayDay, thisYear, limitPerType) || [];
    for (const r of rows) {
      const year = new Date(r.at).getFullYear();
      memories.push({
        kind: "pinnwand",
        id: r.id,
        year,
        yearsAgo: thisYear - year,
        text: r.text,
        from: {
          username: r.fromUsername,
          displayName: r.fromDisplayName,
          avatarUrl: r.fromAvatarStatus === "approved" ? r.fromAvatarUrl : "",
        },
        at: r.at,
      });
    }
  } catch {}

  // 2) Geschenke erhalten
  try {
    const rows = db().prepare(\`
      SELECT g.id, g.gift_id AS giftId, g.from_user_id AS fromId, g.created_at AS at, g.note,
             u.username AS fromUsername, u.display_name AS fromDisplayName,
             u.avatar_url AS fromAvatarUrl, u.avatar_status AS fromAvatarStatus
        FROM gifts g
        JOIN users u ON u.id = g.from_user_id
       WHERE g.target_user_id = ?
         AND CAST(strftime('%m', g.created_at/1000, 'unixepoch') AS INTEGER) = ?
         AND CAST(strftime('%d', g.created_at/1000, 'unixepoch') AS INTEGER) = ?
         AND CAST(strftime('%Y', g.created_at/1000, 'unixepoch') AS INTEGER) < ?
       ORDER BY g.created_at DESC
       LIMIT ?
    \`).all(me, todayMonth, todayDay, thisYear, limitPerType) || [];
    for (const r of rows) {
      const year = new Date(r.at).getFullYear();
      memories.push({
        kind: "gift",
        id: r.id,
        year,
        yearsAgo: thisYear - year,
        giftId: r.giftId,
        note: r.note || "",
        from: {
          username: r.fromUsername,
          displayName: r.fromDisplayName,
          avatarUrl: r.fromAvatarStatus === "approved" ? r.fromAvatarUrl : "",
        },
        at: r.at,
      });
    }
  } catch {}

  // 3) Fotos hochgeladen
  try {
    const rows = db().prepare(\`
      SELECT id, data_url AS dataUrl, caption, created_at AS at
        FROM photos
       WHERE user_id = ?
         AND CAST(strftime('%m', created_at/1000, 'unixepoch') AS INTEGER) = ?
         AND CAST(strftime('%d', created_at/1000, 'unixepoch') AS INTEGER) = ?
         AND CAST(strftime('%Y', created_at/1000, 'unixepoch') AS INTEGER) < ?
       ORDER BY created_at DESC
       LIMIT ?
    \`).all(me, todayMonth, todayDay, thisYear, limitPerType) || [];
    for (const r of rows) {
      const year = new Date(r.at).getFullYear();
      memories.push({
        kind: "photo",
        id: r.id,
        year,
        yearsAgo: thisYear - year,
        dataUrl: r.dataUrl,
        caption: r.caption || "",
        at: r.at,
      });
    }
  } catch {}

  // 4) Eigene Status-Updates
  try {
    const rows = db().prepare(\`
      SELECT id, text, image_url AS imageUrl, created_at AS at
        FROM status_updates
       WHERE user_id = ?
         AND text != ''
         AND CAST(strftime('%m', created_at/1000, 'unixepoch') AS INTEGER) = ?
         AND CAST(strftime('%d', created_at/1000, 'unixepoch') AS INTEGER) = ?
         AND CAST(strftime('%Y', created_at/1000, 'unixepoch') AS INTEGER) < ?
       ORDER BY created_at DESC
       LIMIT ?
    \`).all(me, todayMonth, todayDay, thisYear, limitPerType) || [];
    for (const r of rows) {
      const year = new Date(r.at).getFullYear();
      memories.push({
        kind: "status",
        id: r.id,
        year,
        yearsAgo: thisYear - year,
        text: r.text,
        imageUrl: r.imageUrl || "",
        at: r.at,
      });
    }
  } catch {}

  // Sortiert: ältester Jahrgang zuerst (= „vor 5 Jahren" vor „vor 1 Jahr")
  memories.sort((a, b) => b.yearsAgo - a.yearsAgo);
  return memories;
}

// Repostet Memory auf User-Pinnwand mit Prefix-Text.
export function repostMemoryToWall(userId, { kind, originalText = "", yearsAgo = 0, customText = "" }) {
  const me = Number(userId);
  if (!me) throw new Error("Ungültiger User");

  const prefix = yearsAgo > 0
    ? \`📅 Heute vor \${yearsAgo} \${yearsAgo === 1 ? "Jahr" : "Jahren"}: \`
    : "📅 Erinnerung: ";

  const body = customText.trim() || originalText.trim() || "Erinnerst du dich?";
  const full = (prefix + body).slice(0, 1000);

  try {
    const info = db().prepare(\`
      INSERT INTO pinnwand (target_user_id, from_user_id, text, created_at)
      VALUES (?, ?, ?, ?)
    \`).run(me, me, full, Date.now());
    return Number(info.lastInsertRowid);
  } catch (e) {
    throw new Error("Konnte Erinnerung nicht reposten: " + e.message);
  }
}
`;
  src += FN;
  changed = true;
  console.log("✓ Memories Helpers angefügt.");
}

if (changed) {
  writeFileSync(DB_PATH, src);
  console.log("\\n✓ db.js gepatched (Memories).");
} else {
  console.log("\\n✓ Nichts zu tun.");
}
