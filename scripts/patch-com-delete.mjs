#!/usr/bin/env node
// 🗑 Com-Delete Helper — komplette Cascade-Löschung mit Vibes-Refund-Logik.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK = "// 🗑 COM_DELETE_V1";

let src = readFileSync(DB_PATH, "utf-8");

if (src.includes(MARK)) {
  console.log("✓ Com-Delete schon drin.");
  process.exit(0);
}

const FN = `

${MARK}
// 🗑 Com komplett löschen — Cascade über FOREIGN KEY ON DELETE CASCADE,
// plus manuelle Cleanups für Tabellen ohne FK (com_reactions).

export function deleteComCompletely(groupId, { ownerId = null } = {}) {
  const gid = Number(groupId);
  const g = db().prepare("SELECT id, slug, name, owner_id, boost_until FROM groups WHERE id = ?").get(gid);
  if (!g) return { ok: false, reason: "not-found" };

  // Vorab: thread/reply IDs sammeln um com_reactions sauber wegzuräumen
  let threadIds = [];
  let replyIds = [];
  try {
    threadIds = db().prepare("SELECT id FROM com_threads WHERE group_id = ?").all(gid).map((r) => r.id);
  } catch {}
  try {
    if (threadIds.length > 0) {
      const placeholders = threadIds.map(() => "?").join(",");
      replyIds = db().prepare(\`SELECT id FROM com_thread_replies WHERE thread_id IN (\${placeholders})\`)
        .all(...threadIds).map((r) => r.id);
    }
  } catch {}

  // Refund-Logik: wenn Boost noch aktiv und Owner bekannt → Restlauf-Vibes zurück
  let refundVibes = 0;
  const now = Date.now();
  if (g.boost_until && g.boost_until > now && g.owner_id) {
    // 1 Vibe = 1 Sekunde Boost-Restzeit
    refundVibes = Math.floor((g.boost_until - now) / 1000);
    if (refundVibes > 0) {
      try {
        adminGrantCredits(g.owner_id, refundVibes, "com_delete_boost_refund", { groupId: gid, slug: g.slug });
      } catch {}
    }
  }

  const tx = db().transaction(() => {
    // Manuelle Cleanups (Tabellen ohne FK-Cascade)
    if (threadIds.length > 0) {
      const ph = threadIds.map(() => "?").join(",");
      try { db().prepare(\`DELETE FROM com_reactions WHERE target_type='thread' AND target_id IN (\${ph})\`).run(...threadIds); } catch {}
    }
    if (replyIds.length > 0) {
      const ph = replyIds.map(() => "?").join(",");
      try { db().prepare(\`DELETE FROM com_reactions WHERE target_type='reply' AND target_id IN (\${ph})\`).run(...replyIds); } catch {}
    }
    // Mod-Log eintrag
    try {
      db().prepare(\`
        INSERT INTO mod_log (user_id, action, by_admin, details, created_at)
        VALUES (?, ?, ?, ?, ?)
      \`).run(ownerId || g.owner_id || 0, "com_delete", 0,
        \`Com gelöscht: "\${g.name}" (slug=\${g.slug}, id=\${gid}) — Refund \${refundVibes} ✨\`,
        now);
    } catch {}
    // Hauptlöschung — FK-Cascade kümmert sich um group_members, group_posts,
    // com_threads (→ com_thread_replies), com_news, com_bans, fidolin_com_log
    db().prepare("DELETE FROM groups WHERE id = ?").run(gid);
  });
  tx();

  return {
    ok: true,
    groupId: gid,
    slug: g.slug,
    name: g.name,
    refundVibes,
    threadsDeleted: threadIds.length,
    repliesDeleted: replyIds.length,
  };
}
`;

src += FN;
writeFileSync(DB_PATH, src);
console.log("✓ deleteComCompletely Helper angefügt.");
