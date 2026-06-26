// 🤝 ONE-SHOT Migration für friend_requests-Tabelle.
//
// Hintergrund: lib/db.js hat zwar CREATE TABLE IF NOT EXISTS friend_requests
// im Init-Block, der lief aber auf prod nie (DB war schon erstellt bevor
// dieser Block hinzugefügt wurde). Resultat: User bekommt "no such table"
// beim Friend-Request senden.
//
// Dieser Endpoint führt die Migration idempotent direkt auf der prod-DB aus.
// → POST mit Admin-Cookie → läuft einmal → fertig.
//
// Idempotent: kann gefahrlos mehrfach aufgerufen werden (CREATE IF NOT EXISTS).

import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import Database from "better-sqlite3";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function findDbPath() {
  const env = process.env.DB_PATH || process.env.VV_DB_PATH;
  if (env && existsSync(env)) return env;
  const cwd = process.cwd();
  const candidates = [
    resolve(cwd, "data/db.sqlite"),
    resolve(cwd, "data/vibevibo.db"),
    "/data/db.sqlite",
    "/data/vibevibo.db",
    "/app/data/db.sqlite",
  ];
  for (const p of candidates) if (existsSync(p)) return p;
  return null;
}

export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Admin-Login nötig." }, { status: 401 });
  }

  const dbPath = findDbPath();
  if (!dbPath) {
    return NextResponse.json({ error: "DB nicht gefunden." }, { status: 500 });
  }

  let db;
  try {
    db = new Database(dbPath);
  } catch (e) {
    return NextResponse.json({ error: `DB konnte nicht geöffnet werden: ${e.message}` }, { status: 500 });
  }

  const actions = [];
  let tableExisted = false;

  try {
    const before = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='friend_requests'"
    ).get();
    tableExisted = !!before;

    db.exec(`
      CREATE TABLE IF NOT EXISTS friend_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        to_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending',
        decision_reason TEXT DEFAULT '',
        created_at INTEGER NOT NULL,
        decided_at INTEGER
      );
    `);
    actions.push({ step: "CREATE TABLE friend_requests", ok: true, note: tableExisted ? "schon vorhanden" : "neu angelegt" });

    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_fr_pending_pair
        ON friend_requests(from_id, to_id) WHERE status = 'pending';
    `);
    actions.push({ step: "CREATE INDEX idx_fr_pending_pair", ok: true });

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_fr_to_status ON friend_requests(to_id, status, created_at DESC);
    `);
    actions.push({ step: "CREATE INDEX idx_fr_to_status", ok: true });

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_fr_from_status ON friend_requests(from_id, status, created_at DESC);
    `);
    actions.push({ step: "CREATE INDEX idx_fr_from_status", ok: true });

    // Final-Check
    const after = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='friend_requests'"
    ).get();
    if (!after) throw new Error("Tabelle existiert NACH Migration immer noch nicht — unerwartet.");

    const count = db.prepare("SELECT COUNT(*) as c FROM friend_requests").get().c;
    actions.push({ step: "Verify", ok: true, note: `Tabelle existiert, ${count} Einträge` });
  } catch (e) {
    actions.push({ step: "FEHLER", ok: false, error: e.message });
    db.close();
    return NextResponse.json({
      ok: false, error: e.message, actions,
    }, { status: 500 });
  } finally {
    try { db.close(); } catch {}
  }

  return NextResponse.json({
    ok: true,
    message: tableExisted
      ? "friend_requests Tabelle existierte schon — Migration übersprungen."
      : "friend_requests Tabelle wurde neu angelegt. Bug behoben.",
    actions,
  });
}
