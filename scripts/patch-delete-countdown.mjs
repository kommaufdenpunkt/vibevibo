#!/usr/bin/env node
// 🗑 24h-Lösch-Countdown — User kann Löschen anfordern, hat 24h Reue-Zeit.
//
// User-Spalten:
//   • delete_requested_at — Timestamp wann gelöscht werden soll, oder NULL
//
// Helpers:
//   • requestAccountDeletion(userId)   — startet 24h Countdown
//   • cancelAccountDeletion(userId)    — bricht ab
//   • getDeletionStatus(userId)        — { requested, remainingMs, scheduledFor }
//   • listAccountsPendingDeletion()    — Cron-Hook
//   • finalizeAccountDeletion(userId)  — wirklich löschen (oder Hard-Block)

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_COL = "/* 🗑 DELETE_COUNTDOWN_COL_V1 */";
const MARK_FN  = "// 🗑 DELETE_COUNTDOWN_FN_V1";

let src = readFileSync(DB_PATH, "utf-8");
let changed = false;

if (!src.includes(MARK_COL)) {
  const ANCHOR = `addColumnIfMissing(d, "users", "gender", "TEXT DEFAULT ''");`;
  if (!src.includes(ANCHOR)) { console.error("✗ Anker users.gender fehlt"); process.exit(1); }
  const INJECT = `${ANCHOR}

  ${MARK_COL}
  // 🗑 24h-Lösch-Countdown — Timestamp wann gelöscht werden soll
  addColumnIfMissing(d, "users", "delete_requested_at", "INTEGER DEFAULT 0");`;
  src = src.replace(ANCHOR, INJECT);
  changed = true;
  console.log("✓ delete_requested_at Spalte ergänzt.");
}

if (!src.includes(MARK_FN)) {
  const FN = `

${MARK_FN}
// 🗑 Lösch-Countdown Helpers

const DELETE_GRACE_PERIOD_MS = 24 * 3600 * 1000;

export function requestAccountDeletion(userId) {
  const u = db().prepare("SELECT id, delete_requested_at FROM users WHERE id = ?").get(Number(userId));
  if (!u) throw new Error("User nicht gefunden");
  if (u.delete_requested_at && u.delete_requested_at > 0) {
    return { alreadyRequested: true, requestedAt: u.delete_requested_at };
  }
  const now = Date.now();
  db().prepare("UPDATE users SET delete_requested_at = ? WHERE id = ?").run(now, Number(userId));
  try {
    if (typeof audit === "function") {
      audit({ userId: Number(userId), action: "user.delete_requested", detail: \`countdown=24h\` });
    }
  } catch {}
  return { requestedAt: now, scheduledFor: now + DELETE_GRACE_PERIOD_MS };
}

export function cancelAccountDeletion(userId) {
  db().prepare("UPDATE users SET delete_requested_at = 0 WHERE id = ?").run(Number(userId));
  try {
    if (typeof audit === "function") {
      audit({ userId: Number(userId), action: "user.delete_cancelled" });
    }
  } catch {}
  return true;
}

export function getDeletionStatus(userId) {
  try {
    const u = db().prepare("SELECT delete_requested_at FROM users WHERE id = ?").get(Number(userId));
    if (!u || !u.delete_requested_at) return { requested: false };
    const requestedAt = Number(u.delete_requested_at);
    const scheduledFor = requestedAt + DELETE_GRACE_PERIOD_MS;
    const remainingMs = Math.max(0, scheduledFor - Date.now());
    return {
      requested: true,
      requestedAt, scheduledFor,
      remainingMs,
      expired: remainingMs === 0,
    };
  } catch { return { requested: false }; }
}

// Cron-Hook — gibt User-IDs zurück die jetzt gelöscht werden müssen
export function listAccountsPendingDeletion() {
  const cutoff = Date.now() - DELETE_GRACE_PERIOD_MS;
  try {
    return db().prepare(\`
      SELECT id, username, delete_requested_at AS requestedAt
        FROM users
        WHERE delete_requested_at > 0 AND delete_requested_at <= ?
    \`).all(cutoff);
  } catch { return []; }
}

// Endgültige Löschung — markiert User als 'deleted', anonymisiert Personen-Daten,
// löscht Posts/DMs NICHT (ggf. forensisch relevant) — überschreibt nur PII.
export function finalizeAccountDeletion(userId) {
  const now = Date.now();
  try {
    db().prepare(\`
      UPDATE users SET
        status = 'deleted',
        display_name = CONCAT('Gelöschter User #', id),
        password_hash = '',
        avatar_url = '',
        avatar_status = 'none',
        about_me = '',
        interests = '',
        real_name = '',
        addr_street = '', addr_zip = '', addr_city = '',
        id_doc_url = '',
        admin_notes = CONCAT(admin_notes, ' [Account gelöscht ', ?, ']')
      WHERE id = ?
    \`).run(new Date(now).toISOString(), Number(userId));
    if (typeof audit === "function") {
      audit({ userId: Number(userId), action: "user.deleted_final" });
    }
    return true;
  } catch (e) {
    return false;
  }
}
`;
  src += FN;
  changed = true;
  console.log("✓ Lösch-Countdown Helpers angefügt.");
}

if (changed) {
  writeFileSync(DB_PATH, src);
  console.log("\\n✓ db.js gepatched (Delete-Countdown).");
} else {
  console.log("\\n✓ Nichts zu tun.");
}
