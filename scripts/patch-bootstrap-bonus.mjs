#!/usr/bin/env node
// 🎁 Welcome-Bonus + Sicherheits-Härtungen — idempotent.
// • Helper `ensureBootstrapBonus()` — gibt User_id=1 einmalig 10000 ✨
// • Helper `getFirstUser()` für Diagnose

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK = "// 🎁 BOOTSTRAP_BONUS_V1";

let src = readFileSync(DB_PATH, "utf-8");

if (src.includes(MARK)) {
  console.log("✓ Bootstrap-Bonus-Helpers schon da — skip.");
  process.exit(0);
}

const FN = `

${MARK}
// 🎁 Welcome-Bonus für den ersten registrierten User (= Admin)

export function getFirstUser() {
  return db().prepare("SELECT id, username, display_name AS displayName FROM users ORDER BY id ASC LIMIT 1").get() || null;
}

export function ensureBootstrapBonus({ amount = 10000 } = {}) {
  const done = getSetting("BOOTSTRAP_BONUS_DONE", "");
  if (done === "1") {
    return { granted: false, reason: "already-done" };
  }
  const first = getFirstUser();
  if (!first) {
    return { granted: false, reason: "no-user-yet" };
  }
  adminGrantCredits(first.id, amount, "welcome_bonus");
  setSetting("BOOTSTRAP_BONUS_DONE", "1");
  setSetting("BOOTSTRAP_BONUS_AT", String(Date.now()));
  setSetting("BOOTSTRAP_BONUS_USER", first.username);
  const credits = getCredits(first.id);
  return {
    granted: true,
    username: first.username,
    displayName: first.displayName,
    amount,
    newBalance: credits.balance,
  };
}

// Diagnose für /admin/wartung
export function getBootstrapStatus() {
  const done = getSetting("BOOTSTRAP_BONUS_DONE", "") === "1";
  if (!done) return { done: false };
  return {
    done: true,
    at: Number(getSetting("BOOTSTRAP_BONUS_AT", "0")) || 0,
    username: getSetting("BOOTSTRAP_BONUS_USER", ""),
  };
}
`;

src += FN;
writeFileSync(DB_PATH, src);
console.log("✓ Bootstrap-Bonus-Helpers angefügt.");
console.log("  Funktionen: getFirstUser, ensureBootstrapBonus, getBootstrapStatus");
