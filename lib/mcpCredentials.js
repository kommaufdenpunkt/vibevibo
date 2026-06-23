// 🔐 MCP-Credentials — separates Passwort vom normalen vibevibo.de Login.
// Hash-Algorithmus: scrypt (Node built-in, kein extra dep).
// Format in DB: scrypt$<salt-hex>$<hash-hex>  (Spalte users.mcp_password_hash)
//
// Verwendet von:
//   • scripts/mcp-set-credentials.mjs        (lokales CLI)
//   • app/api/mcp/_setup/route.js            (Remote-Setup via curl)
//   • app/api/mcp/auth/route.js              (Phase B — verifyMcpPassword statt verifyPassword)

import Database from "better-sqlite3";
import crypto from "node:crypto";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

const SCRYPT_KEYLEN = 64;
const SCRYPT_SALTLEN = 16;
const MIN_PASSWORD_LEN = 12;

function findDbPath() {
  const env = process.env.DB_PATH || process.env.VV_DB_PATH;
  if (env && existsSync(env)) return env;
  const cwd = process.cwd();
  const candidates = [
    resolve(cwd, "data/db.sqlite"),
    resolve(cwd, "data/vibevibo.db"),
    resolve(cwd, "data/vibevibo.sqlite"),
    resolve(cwd, "vibevibo.db"),
    resolve(cwd, "db.sqlite"),
    "/data/db.sqlite",
    "/data/vibevibo.db",
    "/app/data/db.sqlite",
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  throw new Error(
    "MCP-Credentials: SQLite-DB nicht gefunden. " +
    "Setze DB_PATH env var auf den korrekten Pfad."
  );
}

let _db = null;
function db() {
  if (!_db) _db = new Database(findDbPath());
  return _db;
}

function hashScrypt(password) {
  const salt = crypto.randomBytes(SCRYPT_SALTLEN);
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

function verifyScrypt(password, stored) {
  try {
    const parts = String(stored || "").split("$");
    if (parts.length !== 3 || parts[0] !== "scrypt") return false;
    const salt = Buffer.from(parts[1], "hex");
    const expected = Buffer.from(parts[2], "hex");
    const actual = crypto.scryptSync(password, salt, expected.length);
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

// Idempotente Schema-Erweiterung. Fügt die Spalten hinzu falls noch nicht da.
// Returns: Array der frisch hinzugefügten Spaltennamen (leer = nichts zu tun).
export function ensureMcpCredentialsSchema() {
  const cols = db().prepare("PRAGMA table_info(users)").all().map((c) => c.name);
  const added = [];
  if (!cols.includes("mcp_password_hash")) {
    db().exec("ALTER TABLE users ADD COLUMN mcp_password_hash TEXT");
    added.push("mcp_password_hash");
  }
  if (!cols.includes("mcp_password_updated_at")) {
    db().exec("ALTER TABLE users ADD COLUMN mcp_password_updated_at INTEGER");
    added.push("mcp_password_updated_at");
  }
  return added;
}

export function setMcpPassword(username, password) {
  if (!username || !password) return false;
  if (password.length < MIN_PASSWORD_LEN) {
    throw new Error(`MCP-Passwort muss mindestens ${MIN_PASSWORD_LEN} Zeichen lang sein.`);
  }
  const hash = hashScrypt(password);
  const r = db()
    .prepare(
      "UPDATE users SET mcp_password_hash = ?, mcp_password_updated_at = ? WHERE LOWER(username) = LOWER(?)"
    )
    .run(hash, Date.now(), username);
  return r.changes > 0;
}

// Returns the full user row if username + MCP-password match, else null.
export function verifyMcpPassword(username, password) {
  if (!username || !password) return null;
  const row = db()
    .prepare("SELECT * FROM users WHERE LOWER(username) = LOWER(?)")
    .get(username);
  if (!row || !row.mcp_password_hash) return null;
  if (!verifyScrypt(password, row.mcp_password_hash)) return null;
  return row;
}

export function hasMcpPassword(username) {
  if (!username) return false;
  const row = db()
    .prepare("SELECT mcp_password_hash FROM users WHERE LOWER(username) = LOWER(?)")
    .get(username);
  return !!(row && row.mcp_password_hash);
}

export function getMcpPasswordInfo(username) {
  if (!username) return null;
  const row = db()
    .prepare(
      "SELECT id, username, mcp_password_hash, mcp_password_updated_at FROM users WHERE LOWER(username) = LOWER(?)"
    )
    .get(username);
  if (!row) return null;
  return {
    userId: row.id,
    username: row.username,
    hasPassword: !!row.mcp_password_hash,
    updatedAt: row.mcp_password_updated_at || null,
  };
}
