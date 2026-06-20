#!/usr/bin/env node
// 💕 Geheimer Schwarm — 3-Slot Crush-System mit Mutual-Match-Detection.
//
// Tabellen:
//   • secret_crushes — user_id, target_user_id, created_at, matched_at
//     - UNIQUE(user_id, target_user_id) — kein Doppel-Crush auf gleiche Person
//     - Max 3 Slots pro user_id (im Code geprüft, nicht DB-Constraint)
//
// Helpers:
//   • addSecretCrush(userId, targetUserId)         — fügt hinzu, prüft Match, vergibt matched_at bei mutual
//   • removeSecretCrush(userId, crushId)           — eigenen Slot freiräumen
//   • listMyCrushes(userId)                        — meine 3 Slots (max), mit isMatched-Flag
//   • listMyMatches(userId)                        — beidseitig bestätigte Crushes
//   • countMyCrushes(userId)                       — wie voll sind meine Slots
//   • isAvailableForCrush(targetUserId)            — Ziel nicht vergeben/verheiratet/verlobt
//   • searchCrushCandidates(viewerId, q, limit)    — User-Suche, filtert vergeben/verheiratet/me/eigene
//
// Sicht-Regel: Crushes sind GEHEIM. Nur der Eigentümer sieht seine Slots.
//              Matches sind GEGENSEITIG sichtbar nach Match.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_TABLE = "/* 💕 SECRET_CRUSH_TABLE_V1 */";
const MARK_FN    = "// 💕 SECRET_CRUSH_FN_V1";

let src = readFileSync(DB_PATH, "utf-8");
let changed = false;

if (!src.includes(MARK_TABLE)) {
  const ANCHOR = "CREATE TABLE IF NOT EXISTS top_friends (";
  if (!src.includes(ANCHOR)) { console.error("✗ Anker top_friends fehlt"); process.exit(1); }
  const INJECT = `${MARK_TABLE}
    CREATE TABLE IF NOT EXISTS secret_crushes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      matched_at INTEGER DEFAULT 0,
      UNIQUE(user_id, target_user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_sc_user ON secret_crushes(user_id);
    CREATE INDEX IF NOT EXISTS idx_sc_target ON secret_crushes(target_user_id);
    CREATE INDEX IF NOT EXISTS idx_sc_matched ON secret_crushes(matched_at) WHERE matched_at > 0;

    ${ANCHOR}`;
  src = src.replace(ANCHOR, INJECT);
  changed = true;
  console.log("✓ secret_crushes Tabelle ergänzt.");
}

if (!src.includes(MARK_FN)) {
  const FN = `

${MARK_FN}
// 💕 Geheimer-Schwarm-Helpers (3 Slots, Mutual-Match)

const SECRET_CRUSH_MAX_SLOTS = 3;
const UNAVAILABLE_REL_STATUSES = new Set(["taken", "engaged", "married"]);

export function isAvailableForCrush(targetUserId) {
  try {
    const r = db().prepare("SELECT relationship_status AS rel, status FROM users WHERE id = ?").get(Number(targetUserId));
    if (!r) return false;
    if (r.status === "deleted" || r.status === "banned") return false;
    if (UNAVAILABLE_REL_STATUSES.has(String(r.rel || "").toLowerCase())) return false;
    return true;
  } catch { return false; }
}

export function countMyCrushes(userId) {
  try {
    return db().prepare("SELECT COUNT(*) AS n FROM secret_crushes WHERE user_id = ?").get(Number(userId)).n || 0;
  } catch { return 0; }
}

// Returns: { ok, matched, partner?, error? }
export function addSecretCrush(userId, targetUserId) {
  const me = Number(userId);
  const target = Number(targetUserId);
  if (!me || !target) return { ok: false, error: "Ungültige Eingabe" };
  if (me === target) return { ok: false, error: "Auf dich selbst geht nicht 😄" };

  // Slot-Limit prüfen
  const used = countMyCrushes(me);
  if (used >= SECRET_CRUSH_MAX_SLOTS) {
    return { ok: false, error: \`Du hast schon \${SECRET_CRUSH_MAX_SLOTS} geheime Slots vergeben — erst einen freiräumen.\` };
  }

  // Ziel verfügbar?
  if (!isAvailableForCrush(target)) {
    return { ok: false, error: "Diese Person ist vergeben/verheiratet — kein Slot möglich." };
  }

  // Schon vorhanden?
  try {
    const existing = db().prepare("SELECT id FROM secret_crushes WHERE user_id = ? AND target_user_id = ?").get(me, target);
    if (existing) return { ok: false, error: "Hast du schon eingetragen." };
  } catch {}

  const now = Date.now();
  try {
    db().prepare("INSERT INTO secret_crushes (user_id, target_user_id, created_at) VALUES (?, ?, ?)")
      .run(me, target, now);
  } catch (e) {
    return { ok: false, error: "Konnte nicht speichern" };
  }

  // Mutual-Check: hat das Ziel mich auch?
  let matched = false;
  let partner = null;
  try {
    const reverse = db().prepare(\`
      SELECT id FROM secret_crushes WHERE user_id = ? AND target_user_id = ?
    \`).get(target, me);

    if (reverse) {
      // 💥 Match! Setze matched_at auf BEIDEN Seiten
      db().prepare("UPDATE secret_crushes SET matched_at = ? WHERE user_id = ? AND target_user_id = ?").run(now, me, target);
      db().prepare("UPDATE secret_crushes SET matched_at = ? WHERE user_id = ? AND target_user_id = ?").run(now, target, me);
      matched = true;
      partner = db().prepare("SELECT id, username, display_name AS displayName, avatar_url AS avatarUrl FROM users WHERE id = ?").get(target);
    }
  } catch {}

  return { ok: true, matched, partner };
}

export function removeSecretCrush(userId, crushId) {
  try {
    // Nur eigene Slots löschbar. Falls Match: auch die Gegenseite-matched_at zurücksetzen.
    const row = db().prepare("SELECT target_user_id AS targetId, matched_at AS matchedAt FROM secret_crushes WHERE id = ? AND user_id = ?")
      .get(Number(crushId), Number(userId));
    if (!row) return false;
    db().prepare("DELETE FROM secret_crushes WHERE id = ?").run(Number(crushId));
    // Wenn das ein Match war, auch die Gegenrichtung un-matchen (Crush bleibt aber bestehen!)
    if (row.matchedAt && row.matchedAt > 0) {
      db().prepare("UPDATE secret_crushes SET matched_at = 0 WHERE user_id = ? AND target_user_id = ?")
        .run(Number(row.targetId), Number(userId));
    }
    return true;
  } catch { return false; }
}

export function listMyCrushes(userId) {
  try {
    return db().prepare(\`
      SELECT sc.id, sc.target_user_id AS targetId, sc.created_at AS createdAt,
             sc.matched_at AS matchedAt,
             u.username, u.display_name AS displayName, u.avatar_url AS avatarUrl,
             u.avatar_status AS avatarStatus,
             u.emoji, u.gender, u.last_seen AS lastSeen,
             u.relationship_status AS relationshipStatus
        FROM secret_crushes sc
        JOIN users u ON u.id = sc.target_user_id
       WHERE sc.user_id = ?
       ORDER BY sc.matched_at DESC, sc.created_at DESC
    \`).all(Number(userId)) || [];
  } catch { return []; }
}

export function listMyMatches(userId) {
  try {
    return db().prepare(\`
      SELECT sc.id, sc.target_user_id AS targetId, sc.matched_at AS matchedAt,
             u.username, u.display_name AS displayName, u.avatar_url AS avatarUrl,
             u.avatar_status AS avatarStatus, u.emoji, u.last_seen AS lastSeen
        FROM secret_crushes sc
        JOIN users u ON u.id = sc.target_user_id
       WHERE sc.user_id = ? AND sc.matched_at > 0
       ORDER BY sc.matched_at DESC
    \`).all(Number(userId)) || [];
  } catch { return []; }
}

// User-Suche speziell für Crush-Picker.
// Filtert: mich selbst, gelöschte/gebannte, vergeben/verheiratet/verlobt,
// Personen die ich schon als Crush habe.
export function searchCrushCandidates(viewerId, q, limit = 12) {
  const me = Number(viewerId);
  const query = String(q || "").trim().slice(0, 60).toLowerCase();
  if (!query || query.length < 2) return [];
  try {
    const like = "%" + query.replace(/[%_]/g, (m) => "\\\\" + m) + "%";
    return db().prepare(\`
      SELECT u.id, u.username, u.display_name AS displayName, u.avatar_url AS avatarUrl,
             u.avatar_status AS avatarStatus, u.emoji, u.gender, u.last_seen AS lastSeen,
             u.relationship_status AS relationshipStatus
        FROM users u
       WHERE u.id != ?
         AND u.status = 'approved'
         AND (u.relationship_status IS NULL OR u.relationship_status NOT IN ('taken','engaged','married'))
         AND (LOWER(u.username) LIKE ? ESCAPE '\\\\' OR LOWER(u.display_name) LIKE ? ESCAPE '\\\\')
         AND u.id NOT IN (SELECT target_user_id FROM secret_crushes WHERE user_id = ?)
       ORDER BY u.display_name COLLATE NOCASE
       LIMIT ?
    \`).all(me, like, like, me, Number(limit)) || [];
  } catch { return []; }
}
`;
  src += FN;
  changed = true;
  console.log("✓ Geheimer-Schwarm Helpers angefügt.");
}

if (changed) {
  writeFileSync(DB_PATH, src);
  console.log("\\n✓ db.js gepatched (Secret-Crush).");
} else {
  console.log("\\n✓ Nichts zu tun.");
}
