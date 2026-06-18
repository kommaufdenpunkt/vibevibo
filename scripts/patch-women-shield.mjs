#!/usr/bin/env node
// 🛡 Women-Shield — verschärfter Schutz für weibliche Accounts.
// • Neue Privacy-Spalten in users
// • user_voice_samples Tabelle für KI-Stimmen-Verifikation
// • Auto-Migration: existierende weibliche Accounts (gender='w') kriegen
//   Default-Strict-Modi (nur wo sie selbst noch nicht gesetzt haben — wir
//   überschreiben KEINE Custom-Settings).
// • Helpers für Verifikations-Status & Voice-Gender-Detection.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_REPAIR = "/* 🛡 WOMEN_SHIELD_REPAIR_V1 */";
const MARK_TABLE = "/* 🛡 WOMEN_SHIELD_TABLE_V1 */";
const MARK_FN = "// 🛡 WOMEN_SHIELD_FN_V1";

let src = readFileSync(DB_PATH, "utf-8");
let changed = false;

// 1) Schema-Repair-Block: neue Spalten direkt in den existierenden _ensureCol-Block
//    einhängen (gleicher Scope wie die Arrow-Funktion `_ensureCol`).
if (!src.includes(MARK_REPAIR)) {
  // Anker: die letzte Zeile des bestehenden Schema-Repair-Blocks aus patch-schema-repair.mjs
  const ANCHORS = [
    `_ensureCol("group_posts", "fidolin_action", "TEXT DEFAULT 'none'");`,
    `_ensureCol('group_posts', 'fidolin_action', "TEXT DEFAULT 'none'");`,
  ];
  let anchor = null;
  for (const a of ANCHORS) { if (src.includes(a)) { anchor = a; break; } }
  if (!anchor) {
    console.error("✗ Schema-Repair-Block nicht gefunden — bitte 'vv vv_repair' (patch-schema-repair) zuerst laufen lassen.");
    process.exit(1);
  }
  const INJECT = `${anchor}

  ${MARK_REPAIR}
  // 🛡 Women-Shield Spalten — durch Schema-Repair-Block geschützt (idempotent).
  _ensureCol("users", "verification_status", "TEXT DEFAULT 'none'");
  _ensureCol("users", "verified_gender", "INTEGER DEFAULT 0");
  _ensureCol("users", "verification_voice_score", "INTEGER DEFAULT 0");
  _ensureCol("users", "verification_at", "INTEGER DEFAULT 0");
  _ensureCol("users", "verified_only_dm", "INTEGER DEFAULT 0");
  _ensureCol("users", "live_strict_mode", "INTEGER DEFAULT 0");
  _ensureCol("users", "women_shield_default", "INTEGER DEFAULT 0");`;
  src = src.replace(anchor, INJECT);
  changed = true;
  console.log("✓ Women-Shield Spalten-Repair eingefügt.");
}

// 2) Voice-Samples Tabelle
if (!src.includes(MARK_TABLE)) {
  const ANCHOR = "CREATE TABLE IF NOT EXISTS group_posts (";
  if (!src.includes(ANCHOR)) {
    console.error("✗ Anker group_posts nicht gefunden");
    process.exit(1);
  }
  const INJECT = `${MARK_TABLE}
    CREATE TABLE IF NOT EXISTS user_voice_samples (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      detected_gender TEXT DEFAULT '',
      confidence REAL DEFAULT 0,
      sample_kind TEXT DEFAULT 'verification',
      reason TEXT DEFAULT '',
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_voice_samples_user ON user_voice_samples(user_id, created_at DESC);

    ${ANCHOR}`;
  src = src.replace(ANCHOR, INJECT);
  changed = true;
  console.log("✓ user_voice_samples Tabelle ergänzt.");
}

// 3) Helpers
if (!src.includes(MARK_FN)) {
  const FN = `

${MARK_FN}
// 🛡 Women-Shield Helpers

export function getUserGender(userId) {
  const r = db().prepare("SELECT gender FROM users WHERE id = ?").get(Number(userId));
  return r?.gender || "";
}

export function getUserGenderByUsername(username) {
  const r = db().prepare("SELECT id, gender FROM users WHERE username = ?").get(String(username || ""));
  return r ? { id: r.id, gender: r.gender || "" } : null;
}

// 🛡 Original-Post-Author finden — über target_type des Buschfunk-Kommentars.
// Liefert { userId, gender } oder null.
export function getBuschfunkPostOwner(targetType, postId) {
  if (!targetType || !postId) return null;
  let row = null;
  try {
    if (targetType === "status") {
      row = db().prepare(\`
        SELECT s.user_id AS uid, u.gender FROM status_updates s
        LEFT JOIN users u ON u.id = s.user_id WHERE s.id = ?
      \`).get(Number(postId));
    } else if (targetType === "pinnwand") {
      // Bei Pinnwand-Posts ist der EMPFÄNGER (Profil-Inhaber) der "geschützte" Adressat
      row = db().prepare(\`
        SELECT p.to_user_id AS uid, u.gender FROM pinnwand p
        LEFT JOIN users u ON u.id = p.to_user_id WHERE p.id = ?
      \`).get(Number(postId));
    } else if (targetType === "grouppost") {
      row = db().prepare(\`
        SELECT g.user_id AS uid, u.gender FROM group_posts g
        LEFT JOIN users u ON u.id = g.user_id WHERE g.id = ?
      \`).get(Number(postId));
    } else if (targetType === "gift") {
      row = db().prepare(\`
        SELECT gi.to_user_id AS uid, u.gender FROM gifts gi
        LEFT JOIN users u ON u.id = gi.to_user_id WHERE gi.id = ?
      \`).get(Number(postId));
    } else if (targetType === "newpic") {
      row = db().prepare(\`
        SELECT pp.user_id AS uid, u.gender FROM profile_pics pp
        LEFT JOIN users u ON u.id = pp.user_id WHERE pp.id = ?
      \`).get(Number(postId));
    }
  } catch {}
  if (!row || !row.uid) return null;
  return { userId: row.uid, gender: row.gender || "" };
}

export function getVerificationStatus(userId) {
  const r = db().prepare(\`
    SELECT verification_status, verified_gender, verification_voice_score, verification_at
      FROM users WHERE id = ?
  \`).get(Number(userId));
  if (!r) return null;
  return {
    status: r.verification_status || "none",
    verifiedGender: !!r.verified_gender,
    voiceScore: r.verification_voice_score || 0,
    verifiedAt: r.verification_at || 0,
  };
}

export function setVerificationStatus(userId, { status, verifiedGender, voiceScore }) {
  const fields = [];
  const vals = [];
  if (status !== undefined) { fields.push("verification_status = ?"); vals.push(String(status)); }
  if (verifiedGender !== undefined) { fields.push("verified_gender = ?"); vals.push(verifiedGender ? 1 : 0); }
  if (voiceScore !== undefined) { fields.push("verification_voice_score = ?"); vals.push(Math.max(0, Math.min(100, Number(voiceScore) || 0))); }
  fields.push("verification_at = ?"); vals.push(Date.now());
  vals.push(Number(userId));
  db().prepare(\`UPDATE users SET \${fields.join(", ")} WHERE id = ?\`).run(...vals);
  return getVerificationStatus(userId);
}

export function isGenderVerified(userId) {
  const r = db().prepare("SELECT verified_gender, verification_status FROM users WHERE id = ?").get(Number(userId));
  return !!(r && r.verified_gender && r.verification_status === "verified");
}

export function recordVoiceSample({ userId, detectedGender, confidence, sampleKind = "verification", reason = "" }) {
  db().prepare(\`
    INSERT INTO user_voice_samples (user_id, detected_gender, confidence, sample_kind, reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  \`).run(
    Number(userId), String(detectedGender || ""),
    Number(confidence) || 0, String(sampleKind), String(reason).slice(0, 280),
    Date.now()
  );
}

// Liefert die letzten N Voice-Samples eines Users (Admin-Review)
export function listVoiceSamples(userId, { limit = 10 } = {}) {
  return db().prepare(\`
    SELECT id, detected_gender AS detectedGender, confidence,
           sample_kind AS sampleKind, reason, created_at AS createdAt
      FROM user_voice_samples WHERE user_id = ?
      ORDER BY created_at DESC LIMIT ?
  \`).all(Number(userId), Number(limit));
}

// Wenn eine Sprachnachricht eines "weiblichen" Accounts klar männlich klingt
// (oder umgekehrt), wird das in user_voice_samples geloggt. Liegen mind. 3
// gegenteilige Samples vor, wird verification_status='suspicious' gesetzt.
export function flagVoiceMismatch(userId, detectedGender, confidence) {
  const u = db().prepare("SELECT gender, verification_status FROM users WHERE id = ?").get(Number(userId));
  if (!u || !u.gender) return false;
  recordVoiceSample({
    userId, detectedGender, confidence, sampleKind: "passive",
    reason: \`claimed=\${u.gender} detected=\${detectedGender}\`,
  });
  // Wieviele Mismatch-Samples insgesamt?
  const opposite = u.gender === "w" ? "m" : "w";
  const mismatchCount = db().prepare(\`
    SELECT COUNT(*) AS c FROM user_voice_samples
     WHERE user_id = ? AND detected_gender = ? AND confidence >= 0.7
  \`).get(Number(userId), opposite).c || 0;
  if (mismatchCount >= 3 && u.verification_status !== "verified") {
    db().prepare(\`UPDATE users SET verification_status = 'suspicious' WHERE id = ?\`).run(Number(userId));
    return true;
  }
  return false;
}

// Initial-Setup für neu registrierte weibliche Accounts:
// Nur wenn der User noch ALLE Default-Werte hat — wir überschreiben nie eine bewusste Wahl.
export function applyWomenShieldDefaults(userId) {
  const r = db().prepare(\`
    SELECT dm_policy, shield_mode, strict_first_msg, women_shield_default, gender
      FROM users WHERE id = ?
  \`).get(Number(userId));
  if (!r || r.gender !== "w") return false;
  if (r.women_shield_default) return false; // schon angewendet
  const isDefault =
    (!r.dm_policy || r.dm_policy === "open") &&
    !r.shield_mode &&
    !r.strict_first_msg;
  if (!isDefault) {
    // User hat schon was Eigenes — Marker setzen, aber nichts überschreiben
    db().prepare("UPDATE users SET women_shield_default = 1 WHERE id = ?").run(Number(userId));
    return false;
  }
  db().prepare(\`
    UPDATE users
       SET dm_policy = 'friends',
           shield_mode = 1,
           strict_first_msg = 1,
           live_strict_mode = 1,
           women_shield_default = 1
     WHERE id = ?
  \`).run(Number(userId));
  return true;
}

// 🛡 Women-Shield Privacy-Fields lesen — wird vom Privacy-Endpoint genutzt
export function getWomenShieldFields(userId) {
  const r = db().prepare(\`
    SELECT verified_only_dm, live_strict_mode, women_shield_default
      FROM users WHERE id = ?
  \`).get(Number(userId));
  if (!r) return null;
  return {
    verified_only_dm: r.verified_only_dm || 0,
    live_strict_mode: r.live_strict_mode || 0,
    women_shield_default: r.women_shield_default || 0,
  };
}

export function setWomenShieldFields(userId, patch) {
  const ALLOWED = ["verified_only_dm", "live_strict_mode"];
  const cols = []; const vals = [];
  for (const k of ALLOWED) {
    if (patch && Object.prototype.hasOwnProperty.call(patch, k)) {
      cols.push(\`\${k} = ?\`);
      vals.push(patch[k] ? 1 : 0);
    }
  }
  if (cols.length === 0) return false;
  vals.push(Number(userId));
  db().prepare(\`UPDATE users SET \${cols.join(", ")} WHERE id = ?\`).run(...vals);
  return true;
}

// Migration: alle existierenden weiblichen User, die noch nicht das Default-Setup haben
export function migrateExistingWomenAccounts() {
  const targets = db().prepare(\`
    SELECT id FROM users WHERE gender = 'w' AND COALESCE(women_shield_default,0) = 0
  \`).all();
  let count = 0;
  for (const t of targets) {
    if (applyWomenShieldDefaults(t.id)) count++;
  }
  return { totalExamined: targets.length, applied: count };
}

// Admin-Helpers (listVerificationCandidates, adminSetVerification) sind
// in patch-women-shield-admin.mjs ausgelagert — separater MARK_FN damit
// auch nach erstem Patch noch nachgereicht werden kann.
`;
  src += FN;
  changed = true;
  console.log("✓ Women-Shield Helpers angefügt.");
}

if (changed) {
  writeFileSync(DB_PATH, src);
  console.log("\\n✓ db.js gepatched. Schema-Repair läuft beim nächsten DB-Init automatisch.");
} else {
  console.log("\\n✓ Nichts zu tun.");
}
