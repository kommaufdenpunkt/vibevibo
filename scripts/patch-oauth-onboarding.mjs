#!/usr/bin/env node
// 🎀 OAuth-Onboarding — User wählen nach Warteliste-Freischaltung selber Username + Anzeigename.
//
// Spalten:
//   • users.needs_onboarding — INTEGER DEFAULT 0 (1 = muss noch onboarden)
//
// Regeln für beide Namen (Username + Anzeigename):
//   • Min 3 Zeichen, Max 30
//   • Erlaubt: a-z, A-Z, 0-9, _ und -
//   • Keine Leerzeichen, keine Umlaute, keine sonstigen Sonderzeichen
//   • Case-insensitive unique (Gino == gino)
//
// Helpers:
//   • isValidNameFormat(name)               — Format-Check
//   • findUserByDisplayNameCI(name)         — Display-Name case-insensitive
//   • setOnboardingNeeded(userId, true/false)
//   • completeOnboarding(userId, { username, displayName, avatarUrl? })

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_COL = "/* 🎀 ONBOARDING_COL_V1 */";
const MARK_FN  = "// 🎀 ONBOARDING_FN_V1";

let src = readFileSync(DB_PATH, "utf-8");
let changed = false;

if (!src.includes(MARK_COL)) {
  const ANCHOR = `addColumnIfMissing(d, "users", "gender", "TEXT DEFAULT ''");`;
  if (!src.includes(ANCHOR)) { console.error("✗ Anker users.gender fehlt"); process.exit(1); }
  const INJECT = `${ANCHOR}

  ${MARK_COL}
  addColumnIfMissing(d, "users", "needs_onboarding", "INTEGER DEFAULT 0");`;
  src = src.replace(ANCHOR, INJECT);
  changed = true;
  console.log("✓ users.needs_onboarding ergänzt.");
}

if (!src.includes(MARK_FN)) {
  const FN = `

${MARK_FN}
// 🎀 OAuth-Onboarding Helpers

// Erlaubt: Buchstaben, Ziffern, _ und -. 3-30 Zeichen. Keine Umlaute/Leerzeichen.
export function isValidNameFormat(name) {
  const s = String(name || "").trim();
  if (s.length < 3 || s.length > 30) return false;
  return /^[a-zA-Z0-9_-]+$/.test(s);
}

export function findUserByDisplayNameCI(displayName) {
  const n = String(displayName || "").trim();
  if (!n) return null;
  try {
    const row = db().prepare("SELECT id, username FROM users WHERE LOWER(display_name) = ?").get(n.toLowerCase());
    return row || null;
  } catch { return null; }
}

export function findUserByUsernameCI(username) {
  const u = String(username || "").trim().toLowerCase();
  if (!u) return null;
  try {
    const row = db().prepare("SELECT id FROM users WHERE LOWER(username) = ?").get(u);
    return row || null;
  } catch { return null; }
}

export function setOnboardingNeeded(userId, needed) {
  try {
    db().prepare("UPDATE users SET needs_onboarding = ? WHERE id = ?")
      .run(needed ? 1 : 0, Number(userId));
    return true;
  } catch { return false; }
}

export function getOnboardingNeeded(userId) {
  try {
    const r = db().prepare("SELECT needs_onboarding FROM users WHERE id = ?").get(Number(userId));
    return !!(r?.needs_onboarding);
  } catch { return false; }
}

// Speichert Username + Anzeigename nach Validierung + Verfügbarkeitsprüfung.
// Throws bei Validation-Fehler.
export function completeOnboarding(userId, { username, displayName, avatarUrl }) {
  const uid = Number(userId);
  if (!uid) throw new Error("Ungültiger User");
  const u = String(username || "").trim();
  const d = String(displayName || "").trim();

  if (!isValidNameFormat(u)) throw new Error("Username: 3-30 Zeichen, nur a-z, A-Z, 0-9, _ und -");
  if (!isValidNameFormat(d)) throw new Error("Anzeigename: 3-30 Zeichen, nur a-z, A-Z, 0-9, _ und -");

  // Username: case-insensitive unique (nur bei Wechsel — eigener User darf behalten)
  const uTaken = findUserByUsernameCI(u);
  if (uTaken && uTaken.id !== uid) throw new Error("Dieser Username ist bereits vergeben");

  const dTaken = findUserByDisplayNameCI(d);
  if (dTaken && dTaken.id !== uid) throw new Error("Dieser Anzeigename ist bereits vergeben");

  try {
    db().prepare(\`
      UPDATE users SET
        username = ?,
        display_name = ?,
        avatar_url = COALESCE(NULLIF(?, ''), avatar_url),
        needs_onboarding = 0
      WHERE id = ?
    \`).run(u.toLowerCase(), d, String(avatarUrl || "").slice(0, 500), uid);
    return true;
  } catch (e) {
    throw new Error("Speichern fehlgeschlagen: " + e.message);
  }
}
`;
  src += FN;
  changed = true;
  console.log("✓ Onboarding Helpers angefügt.");
}

if (changed) {
  writeFileSync(DB_PATH, src);
  console.log("\\n✓ db.js gepatched (Onboarding).");
} else {
  console.log("\\n✓ Nichts zu tun.");
}
