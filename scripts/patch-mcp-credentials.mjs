#!/usr/bin/env node
// DB-Schema-Patch: fügt Spalten `mcp_password_hash` und `mcp_password_updated_at`
// zur `users`-Tabelle hinzu — idempotent (überspringt wenn Spalten existieren).
//
// Aufruf:
//   node scripts/patch-mcp-credentials.mjs
//
// Override DB-Pfad falls nötig:
//   DB_PATH=/pfad/zur/db.sqlite node scripts/patch-mcp-credentials.mjs

import Database from "better-sqlite3";
import { resolve, dirname } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

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

const dbPath = findDb();
if (!dbPath) {
  console.error("❌ DB nicht gefunden. Versuchte Pfade:");
  console.error("    data/db.sqlite, data/vibevibo.db, data/vibevibo.sqlite,");
  console.error("    vibevibo.db, db.sqlite, /data/db.sqlite, /data/vibevibo.db");
  console.error("\n💡 Setze den Pfad explizit:");
  console.error("    DB_PATH=/pfad/zur/db.sqlite node scripts/patch-mcp-credentials.mjs");
  process.exit(1);
}

console.log("📦 DB:", dbPath);
const db = new Database(dbPath);

const cols = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
const added = [];

if (!cols.includes("mcp_password_hash")) {
  db.exec("ALTER TABLE users ADD COLUMN mcp_password_hash TEXT");
  added.push("mcp_password_hash");
}
if (!cols.includes("mcp_password_updated_at")) {
  db.exec("ALTER TABLE users ADD COLUMN mcp_password_updated_at INTEGER");
  added.push("mcp_password_updated_at");
}

if (added.length) {
  console.log("✅ Spalten hinzugefügt:", added.join(", "));
} else {
  console.log("ℹ Spalten existieren bereits — Patch übersprungen (idempotent).");
}

db.close();

console.log("\n🚀 Nächster Schritt — MCP-Passwort setzen:");
console.log("   node scripts/mcp-set-credentials.mjs <username> '<starkes-passwort-min-12-zeichen>'");
console.log("");
console.log("   Beispiel (eigenes Passwort wählen!):");
console.log("   node scripts/mcp-set-credentials.mjs eyfahrlehrer 'Sicheres-MCP-2026!'");
console.log("");
console.log("   Oder via env (taucht NICHT in shell history auf):");
console.log("   MCP_PASS='Sicheres-MCP-2026!' node scripts/mcp-set-credentials.mjs eyfahrlehrer");
