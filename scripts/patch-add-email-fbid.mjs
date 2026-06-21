#!/usr/bin/env node
// 🔧 Hot-Fix: stellt sicher dass users.email und users.facebook_id existieren.
//
// Hintergrund: patch-facebook-oauth.mjs hat addColumnIfMissing INJIZIERT, aber
// die Injection landete eventuell außerhalb der init()-Funktion, sodass die
// Spalten nicht erstellt wurden. Dieser Patch hängt einen Self-Healing-Block
// AM ENDE von db.js an, der beim ersten Import safeguard-Spalten anlegt.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK = "// 🔧 EMAIL_FBID_SAFEGUARD_V1";

let src = readFileSync(DB_PATH, "utf-8");

if (src.includes(MARK)) {
  console.log("✓ Safeguard schon drin — skip.");
  process.exit(0);
}

const APPEND = `

${MARK}
// Stellt sicher dass die OAuth-Spalten existieren, auch wenn frühere
// addColumnIfMissing-Calls aus irgendeinem Grund nicht griffen.
// Wird bei jedem Module-Import einmal ausgeführt (idempotent).
(function ensureOauthColumns() {
  try {
    const d = db();
    const cols = d.prepare("PRAGMA table_info(users)").all().map(c => c.name);
    if (!cols.includes("email")) {
      try { d.exec("ALTER TABLE users ADD COLUMN email TEXT DEFAULT ''"); console.log("✓ users.email nachträglich angelegt"); } catch (e) {}
    }
    if (!cols.includes("facebook_id")) {
      try { d.exec("ALTER TABLE users ADD COLUMN facebook_id TEXT DEFAULT ''"); console.log("✓ users.facebook_id nachträglich angelegt"); } catch (e) {}
    }
    if (!cols.includes("google_id")) {
      try { d.exec("ALTER TABLE users ADD COLUMN google_id TEXT DEFAULT ''"); console.log("✓ users.google_id nachträglich angelegt"); } catch (e) {}
    }
  } catch (e) {
    console.error("[ensureOauthColumns]", e?.message);
  }
})();
`;

src += APPEND;
writeFileSync(DB_PATH, src);
console.log("✓ Safeguard-Block an db.js angehängt.");
