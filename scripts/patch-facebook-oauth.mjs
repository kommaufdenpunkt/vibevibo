#!/usr/bin/env node
// 🔐 Facebook OAuth — Spalten + Helpers für users
//
// Spalten:
//   • facebook_id — TEXT DEFAULT '' (FB-User-ID aus Graph-API)
//
// Helpers:
//   • findUserByFacebookId(fbId)
//   • linkFacebookAccount(userId, fbId, email)
//   • createUserFromFacebook({ facebookId, email, displayName, avatarUrl })
//
// (E-Mail-Spalte wird vom Google-OAuth-Patch mit angelegt — falls noch nicht da
//  wird sie hier zur Sicherheit auch ergänzt.)

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_COL = "/* 🔐 FACEBOOK_OAUTH_COL_V1 */";
const MARK_FN  = "// 🔐 FACEBOOK_OAUTH_FN_V1";

let src = readFileSync(DB_PATH, "utf-8");
let changed = false;

if (!src.includes(MARK_COL)) {
  const ANCHOR = `addColumnIfMissing(d, "users", "gender", "TEXT DEFAULT ''");`;
  if (!src.includes(ANCHOR)) { console.error("✗ Anker users.gender fehlt"); process.exit(1); }
  const INJECT = `${ANCHOR}

  ${MARK_COL}
  addColumnIfMissing(d, "users", "email",       "TEXT DEFAULT ''");
  addColumnIfMissing(d, "users", "facebook_id", "TEXT DEFAULT ''");
  try { d.exec("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email != ''"); } catch {}
  try { d.exec("CREATE INDEX IF NOT EXISTS idx_users_facebook ON users(facebook_id) WHERE facebook_id != ''"); } catch {}`;
  src = src.replace(ANCHOR, INJECT);
  changed = true;
  console.log("✓ users.facebook_id (+ email falls fehlt) ergänzt.");
}

if (!src.includes(MARK_FN)) {
  const FN = `

${MARK_FN}
// 🔐 Facebook-OAuth Helpers

export function findUserByFacebookId(fbId) {
  const f = String(fbId || "").trim();
  if (!f) return null;
  try {
    const row = db().prepare("SELECT * FROM users WHERE facebook_id = ? AND facebook_id != ''").get(f);
    return row ? userRow(row) : null;
  } catch { return null; }
}

export function linkFacebookAccount(userId, fbId, email) {
  const uid = Number(userId);
  const f = String(fbId || "").trim();
  const e = String(email || "").trim().toLowerCase();
  if (!uid || !f) return false;
  try {
    db().prepare("UPDATE users SET facebook_id = ?, email = COALESCE(NULLIF(email, ''), ?) WHERE id = ?")
      .run(f, e, uid);
    return true;
  } catch { return false; }
}

export function createUserFromFacebook({ facebookId, email, displayName, avatarUrl }) {
  const f = String(facebookId || "").trim();
  const e = String(email || "").trim().toLowerCase();
  if (!f) throw new Error("Facebook-ID erforderlich");

  // Username aus Email-Prefix oder displayName ableiten
  const baseRaw = e ? e.split("@")[0] : (displayName || "user").replace(/\\s+/g, "");
  const base = baseRaw.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 18) || "user";
  let username = base;
  let counter = 0;
  while (db().prepare("SELECT id FROM users WHERE username = ?").get(username)) {
    counter++;
    username = \`\${base}\${counter}\`;
    if (counter > 1000) throw new Error("Username-Kollision");
  }

  const now = Date.now();
  const dn = String(displayName || username).slice(0, 60);
  const av = String(avatarUrl || "").slice(0, 500);

  // OAUTH_AUTO_APPROVE=1 → User direkt freigeschaltet. Sonst Warteliste (pending).
  const status = process.env.OAUTH_AUTO_APPROVE === "1" ? "approved" : "pending";

  const info = db().prepare(\`
    INSERT INTO users (
      username, display_name, password_hash, status, role,
      email, facebook_id,
      avatar_url, avatar_status,
      created_at, last_seen
    ) VALUES (?, ?, '', ?, 'user', ?, ?, ?, ?, ?, ?)
  \`).run(username, dn, status, e, f, av, av ? 'approved' : 'none', now, now);

  return getUserById(Number(info.lastInsertRowid));
}

// findUserByEmail — wird auch vom Google-Patch geliefert, hier mit
// anderem Funktions-Namen damit es keine Duplikat-Exports gibt wenn beide
// Patches angewendet werden. Facebook-Callback nutzt findUserByEmailFB.
export function findUserByEmailFB(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return null;
  try {
    const row = db().prepare("SELECT * FROM users WHERE LOWER(email) = ? AND email != ''").get(e);
    return row ? userRow(row) : null;
  } catch { return null; }
}
`;
  src += FN;
  changed = true;
  console.log("✓ Facebook-OAuth Helpers angefügt.");
}

if (changed) {
  writeFileSync(DB_PATH, src);
  console.log("\\n✓ db.js gepatched (Facebook-OAuth).");
} else {
  console.log("\\n✓ Nichts zu tun.");
}
