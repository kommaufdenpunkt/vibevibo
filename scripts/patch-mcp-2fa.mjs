#!/usr/bin/env node
// 🔐 MCP 2FA — Google Authenticator für Mod-Accounts.
//
// Tabelle:
//   • mcp_totp — pro Mod ein Secret + enabled-Flag
//
// Helpers:
//   • setupMcpTotp(userId) — neues Secret generieren, NOCH NICHT enabled
//   • enableMcpTotp(userId, code) — verifiziert Code, schaltet enabled=1
//   • disableMcpTotp(userId)
//   • isMcpTotpEnabled(userId)
//   • getMcpTotpSecret(userId) — für Login-Verify-Schritt
//   • verifyMcpTotpCode(userId, code) — nutzt lib/totp.js

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_TABLE = "/* 🔐 MCP_2FA_TABLE_V1 */";
const MARK_FN    = "// 🔐 MCP_2FA_FN_V1";

let src = readFileSync(DB_PATH, "utf-8");
let changed = false;

// 1) Tabelle — Anker ist mcp_sessions
if (!src.includes(MARK_TABLE)) {
  const ANCHOR = "CREATE TABLE IF NOT EXISTS mcp_sessions (";
  if (!src.includes(ANCHOR)) { console.error("✗ Anker mcp_sessions fehlt"); process.exit(1); }
  const INJECT = `${MARK_TABLE}
    CREATE TABLE IF NOT EXISTS mcp_totp (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      secret TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      enabled_at INTEGER,
      last_used_at INTEGER
    );

    ${ANCHOR}`;
  src = src.replace(ANCHOR, INJECT);
  changed = true;
  console.log("✓ MCP-2FA Tabelle ergänzt.");
}

// 2) Helpers — importiert lib/totp.js dynamisch
if (!src.includes(MARK_FN)) {
  const FN = `

${MARK_FN}
// 🔐 MCP-2FA Helpers — nutzen lib/totp.js (RFC 6238)

import * as _vvTotp from "./totp.js";

function _generateMcpTotpSecret() {
  // 20 Byte Random → base32 (Google-Authenticator-kompatibel)
  const bytes = crypto.randomBytes(20);
  const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0, buf = 0, out = "";
  for (const b of bytes) {
    buf = (buf << 8) | b;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += ALPHA[(buf >> bits) & 31];
    }
  }
  if (bits > 0) out += ALPHA[(buf << (5 - bits)) & 31];
  return out;
}

// Setup: erzeugt Secret (noch NICHT aktiv) und gibt otpauth-URL für QR-Code zurück.
export function setupMcpTotp(userId, { issuer = "VibeVibo MCP" } = {}) {
  const u = db().prepare("SELECT username FROM users WHERE id = ?").get(Number(userId));
  if (!u) throw new Error("User nicht gefunden");
  const existing = db().prepare("SELECT secret, enabled FROM mcp_totp WHERE user_id = ?").get(Number(userId));
  if (existing?.enabled) {
    throw new Error("2FA ist bereits aktiv. Vorher deaktivieren.");
  }
  const secret = _generateMcpTotpSecret();
  const now = Date.now();
  db().prepare(\`
    INSERT INTO mcp_totp (user_id, secret, enabled, created_at)
    VALUES (?, ?, 0, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      secret = excluded.secret, enabled = 0, created_at = excluded.created_at
  \`).run(Number(userId), secret, now);
  const account = encodeURIComponent(u.username);
  const issuerEnc = encodeURIComponent(issuer);
  const otpauthUrl = \`otpauth://totp/\${issuerEnc}:\${account}?secret=\${secret}&issuer=\${issuerEnc}&algorithm=SHA1&digits=6&period=30\`;
  return { secret, otpauthUrl };
}

// Aktivieren: 6-stelligen Code prüfen, bei Erfolg enabled=1
export function enableMcpTotp(userId, code) {
  const r = db().prepare("SELECT secret, enabled FROM mcp_totp WHERE user_id = ?").get(Number(userId));
  if (!r) throw new Error("Kein Setup gestartet");
  if (r.enabled) throw new Error("Schon aktiv");
  const ok = _vvTotp.verifyTotp(r.secret, String(code).replace(/\\D/g, ""));
  if (!ok) throw new Error("Code ungültig");
  db().prepare("UPDATE mcp_totp SET enabled = 1, enabled_at = ?, last_used_at = ? WHERE user_id = ?")
    .run(Date.now(), Date.now(), Number(userId));
  return true;
}

export function disableMcpTotp(userId) {
  db().prepare("DELETE FROM mcp_totp WHERE user_id = ?").run(Number(userId));
  return true;
}

export function isMcpTotpEnabled(userId) {
  try {
    const r = db().prepare("SELECT enabled FROM mcp_totp WHERE user_id = ?").get(Number(userId));
    return !!r?.enabled;
  } catch { return false; }
}

// Verify im Login-Flow
export function verifyMcpTotpCode(userId, code) {
  const r = db().prepare("SELECT secret, enabled FROM mcp_totp WHERE user_id = ?").get(Number(userId));
  if (!r || !r.enabled) return false;
  const ok = _vvTotp.verifyTotp(r.secret, String(code).replace(/\\D/g, ""));
  if (ok) {
    try { db().prepare("UPDATE mcp_totp SET last_used_at = ? WHERE user_id = ?").run(Date.now(), Number(userId)); } catch {}
  }
  return ok;
}
`;
  src += FN;
  changed = true;
  console.log("✓ MCP-2FA Helpers angefügt.");
}

if (changed) {
  writeFileSync(DB_PATH, src);
  console.log("\\n✓ db.js gepatched (MCP-2FA).");
} else {
  console.log("\\n✓ Nichts zu tun.");
}
