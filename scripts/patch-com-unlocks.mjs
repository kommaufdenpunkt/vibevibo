#!/usr/bin/env node
// 🔓 Com-Feature-Unlocks — Tabelle + Helpers für freigeschaltete Com-Funktionen.
// Owner zahlt einmalig Vibes aus eigenem Konto; Feature bleibt dauerhaft frei.
// Manche Features haben zusätzlich ein Member-Gate (z. B. Watch-Party ab 5 Members).

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_TABLE = "/* 🔓 COM_UNLOCK_TABLE_V1 */";
const MARK_FN = "// 🔓 COM_UNLOCK_FN_V1";

let src = readFileSync(DB_PATH, "utf-8");
let changed = false;

// 1) Tabelle vor groups-bezogenen Tabellen einfügen
if (!src.includes(MARK_TABLE)) {
  const ANCHOR = "CREATE TABLE IF NOT EXISTS group_posts (";
  if (!src.includes(ANCHOR)) {
    console.error("✗ Anker group_posts nicht gefunden");
    process.exit(1);
  }
  const INJECT = `${MARK_TABLE}
    CREATE TABLE IF NOT EXISTS com_unlocked_features (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      feature_key TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      unlocked_by_user_id INTEGER,
      unlocked_at INTEGER NOT NULL,
      vibes_paid INTEGER NOT NULL DEFAULT 0,
      UNIQUE(group_id, feature_key)
    );
    CREATE INDEX IF NOT EXISTS idx_com_unlock_group ON com_unlocked_features(group_id);

    ${ANCHOR}`;
  src = src.replace(ANCHOR, INJECT);
  changed = true;
  console.log("✓ com_unlocked_features Tabelle ergänzt.");
}

// 2) Helpers anhängen
if (!src.includes(MARK_FN)) {
  const FN = `

${MARK_FN}
// 🔓 Com-Feature-Unlock Helpers

function _parseUnlockRow(r) {
  if (!r) return null;
  let payload = {};
  try { payload = JSON.parse(r.payload || "{}"); } catch {}
  return {
    id: r.id,
    groupId: r.group_id,
    featureKey: r.feature_key,
    payload,
    unlockedByUserId: r.unlocked_by_user_id,
    unlockedAt: r.unlocked_at,
    vibesPaid: r.vibes_paid,
  };
}

export function isComFeatureUnlocked(groupId, featureKey) {
  const r = db().prepare(\`
    SELECT 1 FROM com_unlocked_features WHERE group_id = ? AND feature_key = ?
  \`).get(Number(groupId), String(featureKey));
  return !!r;
}

export function getComUnlock(groupId, featureKey) {
  const r = db().prepare(\`
    SELECT * FROM com_unlocked_features WHERE group_id = ? AND feature_key = ?
  \`).get(Number(groupId), String(featureKey));
  return _parseUnlockRow(r);
}

export function listComUnlocks(groupId) {
  const rows = db().prepare(\`
    SELECT * FROM com_unlocked_features WHERE group_id = ?
    ORDER BY unlocked_at ASC
  \`).all(Number(groupId));
  return rows.map(_parseUnlockRow);
}

export function unlockComFeature({ groupId, featureKey, userId, vibesPaid = 0, payload = {} }) {
  const now = Date.now();
  const existing = getComUnlock(groupId, featureKey);
  if (existing) return existing;
  const payloadStr = JSON.stringify(payload || {});
  db().prepare(\`
    INSERT INTO com_unlocked_features
      (group_id, feature_key, payload, unlocked_by_user_id, unlocked_at, vibes_paid)
    VALUES (?, ?, ?, ?, ?, ?)
  \`).run(Number(groupId), String(featureKey), payloadStr,
    userId ? Number(userId) : null, now, Number(vibesPaid) || 0);
  return getComUnlock(groupId, featureKey);
}

export function setComUnlockPayload(groupId, featureKey, payload) {
  const payloadStr = JSON.stringify(payload || {});
  const info = db().prepare(\`
    UPDATE com_unlocked_features SET payload = ?
     WHERE group_id = ? AND feature_key = ?
  \`).run(payloadStr, Number(groupId), String(featureKey));
  if (info.changes === 0) return null;
  return getComUnlock(groupId, featureKey);
}

export function removeComUnlock(groupId, featureKey) {
  const info = db().prepare(\`
    DELETE FROM com_unlocked_features WHERE group_id = ? AND feature_key = ?
  \`).run(Number(groupId), String(featureKey));
  return info.changes > 0;
}

// 🤖 Fidolin beobachtet jedes Unlock-Event — Eintrag im fidolin_com_log,
// damit Owner/Officers im Fidolin-Log sehen wer wann was freigeschaltet/konfiguriert hat.
export function logComFeatureEvent({ groupId, authorId, action, featureKey, details }) {
  try {
    db().prepare(\`
      INSERT INTO fidolin_com_log (group_id, ts, target_type, target_id, author_id, score, action, reason, content_preview)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    \`).run(
      Number(groupId), Date.now(), "feature", 0,
      authorId ? Number(authorId) : null, 0, "hint",
      \`Feature \${action}: \${featureKey}\`,
      (details || "").slice(0, 280)
    );
  } catch {}
}
`;
  src += FN;
  changed = true;
  console.log("✓ Unlock-Helpers angefügt.");
}

if (changed) {
  writeFileSync(DB_PATH, src);
  console.log("\\n✓ db.js gepatched.");
} else {
  console.log("\\n✓ Nichts zu tun.");
}
