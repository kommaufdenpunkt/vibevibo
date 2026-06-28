// 🛟 DB-Backup-Funktion (idempotent, in db.js injiziert).
// Nutzt die offizielle better-sqlite3 .backup() API → konsistenter Snapshot auch im Betrieb.

import fs from "node:fs";
import path from "node:path";

const DB = path.join(process.cwd(), "lib", "db.js");
if (!fs.existsSync(DB)) { console.error("⚠ lib/db.js nicht gefunden."); process.exit(1); }

let src = fs.readFileSync(DB, "utf8");
if (src.includes("export async function vvBackupDatabase")) {
  console.log("ℹ Backup-Funktion bereits vorhanden — nichts zu tun.");
  process.exit(0);
}

const BLOCK = `

// ===== 🛟 DB-Backup (auto-injected via scripts/patch-tipp-backup.mjs) =====
export async function vvBackupDatabase() {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const dir = path.join(process.cwd(), "data", "backups");
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}
  const dest = path.join(dir, "vibevibo-" + Date.now() + ".sqlite");
  // Offizieller Online-Backup (sauber auch bei WAL/laufendem Betrieb).
  await db().backup(dest);
  let size = 0;
  try { size = fs.statSync(dest).size; } catch {}
  // Alte Backups aufräumen: nur die letzten 10 behalten.
  try {
    const files = fs.readdirSync(dir).filter((f) => f.startsWith("vibevibo-") && f.endsWith(".sqlite")).sort();
    while (files.length > 10) {
      const old = files.shift();
      try { fs.unlinkSync(path.join(dir, old)); } catch {}
    }
  } catch {}
  return { path: dest, size };
}
`;

src = src.replace(/\s*$/, "\n") + BLOCK;
fs.writeFileSync(DB, src, "utf8");
console.log("✅ lib/db.js: DB-Backup-Funktion ergänzt.");
