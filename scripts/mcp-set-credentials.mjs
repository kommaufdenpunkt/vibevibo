#!/usr/bin/env node
// CLI: Setzt das MCP-Passwort für einen User.
//
// Voraussetzungen:
//   1. scripts/patch-mcp-credentials.mjs einmal ausgeführt (DB-Spalten exist.)
//   2. User existiert in der `users`-Tabelle (auf vibevibo.de registriert)
//   3. User hat Mod-Rolle (sonst kommt Login eh nicht durch route.js)
//
// Aufruf:
//   node scripts/mcp-set-credentials.mjs <username> '<password-min-12>'
//
// Sicherer (taucht NICHT in shell history auf):
//   MCP_PASS='dein-passwort' node scripts/mcp-set-credentials.mjs <username>
//
// Passwort wird NICHT auf der Konsole ausgegeben — nur Bestätigung.

import Database from "better-sqlite3";
import { resolve, dirname } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { setMcpPassword, getMcpPasswordInfo } from "../lib/mcpCredentials.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");

function findDb() {
  const env = process.env.DB_PATH || process.env.VV_DB_PATH;
  if (env && existsSync(env)) return env;
  const candidates = [
    resolve(ROOT, "data/db.sqlite"),
    resolve(ROOT, "data/vibevibo.db"),
    resolve(ROOT, "data/vibevibo.sqlite"),
    resolve(ROOT, "vibevibo.db"),
    resolve(ROOT, "db.sqlite"),
    "/data/db.sqlite",
    "/data/vibevibo.db",
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

const username = (process.argv[2] || "").trim();
const password = process.argv[3] || process.env.MCP_PASS || "";

if (!username) {
  console.error("❌ Username fehlt.");
  console.error("\nUsage:");
  console.error("  node scripts/mcp-set-credentials.mjs <username> '<password-min-12>'");
  console.error("");
  console.error("Oder via env (besser — taucht nicht in history auf):");
  console.error("  MCP_PASS='dein-passwort' node scripts/mcp-set-credentials.mjs <username>");
  process.exit(1);
}

if (!password) {
  console.error("❌ Passwort fehlt.");
  console.error("Setze es als 2. Argument oder via MCP_PASS env var.");
  process.exit(1);
}

if (password.length < 12) {
  console.error(`❌ Passwort zu kurz (${password.length} Zeichen). Mindestens 12 nötig.`);
  process.exit(1);
}

const dbPath = findDb();
if (!dbPath) {
  console.error("❌ DB nicht gefunden. Setze DB_PATH env var.");
  process.exit(1);
}

const db = new Database(dbPath);

// 1) User existiert?
const user = db.prepare(
  "SELECT id, username FROM users WHERE LOWER(username) = LOWER(?)"
).get(username);
if (!user) {
  console.error(`❌ User '${username}' existiert nicht in der DB.`);
  console.error("   Erst auf vibevibo.de registrieren, dann hier nochmal.");
  process.exit(1);
}

// 2) Spalte vorhanden?
const cols = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
if (!cols.includes("mcp_password_hash")) {
  console.error("❌ Spalte 'mcp_password_hash' fehlt in der DB.");
  console.error("   Erst Schema-Patch ausführen:");
  console.error("   node scripts/patch-mcp-credentials.mjs");
  process.exit(1);
}

// 3) Mod-Rolle prüfen (falls Spalte 'role' existiert)
let roleInfo = "";
if (cols.includes("role")) {
  const r = db.prepare("SELECT role FROM users WHERE id = ?").get(user.id);
  const role = r?.role || "user";
  const isMod = ["moderator", "teamleitung", "admin", "owner"].includes(role);
  if (!isMod) {
    console.warn(`⚠ User '${username}' hat Rolle '${role}' — KEIN Mod.`);
    console.warn("  Du kannst zwar das MCP-Passwort setzen, aber der Login wird");
    console.warn("  in route.js abgelehnt (isModeratorRole-Check).");
    console.warn("  Erst Rolle setzen:");
    console.warn(`    sqlite3 ${dbPath} "UPDATE users SET role='admin' WHERE id=${user.id};"`);
    console.warn("");
  }
  roleInfo = `Rolle: ${role}`;
}

db.close();

// 4) MCP-Passwort setzen
let ok = false;
try {
  ok = setMcpPassword(username, password);
} catch (e) {
  console.error("❌", e.message);
  process.exit(1);
}

if (!ok) {
  console.error("❌ Update lief durch, aber 0 Zeilen geändert.");
  console.error(`   Existiert '${username}' wirklich in der users-Tabelle?`);
  process.exit(1);
}

const info = getMcpPasswordInfo(username);

console.log("");
console.log("✅ MCP-Passwort gesetzt.");
console.log(`   • Username:  ${info.username}`);
console.log(`   • User-ID:   ${info.userId}`);
if (roleInfo) console.log(`   • ${roleInfo}`);
console.log(`   • Hash-Algo: scrypt (Node built-in)`);
console.log(`   • Spalte:    users.mcp_password_hash`);
console.log("");
console.log("⚠ WICHTIG: Phase B ist NOCH NICHT aktiv —");
console.log("   Der Auth-Endpoint nutzt aktuell noch dein normales vibevibo.de-Passwort.");
console.log("   Sobald Phase B (vv_mcp_auth_switch) deployed ist, gilt das hier gesetzte Passwort.");
console.log("");
console.log("🔐 Passwort jetzt in 1Password / Bitwarden speichern.");
