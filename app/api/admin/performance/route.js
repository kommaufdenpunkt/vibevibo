// 🚀 Performance-Diagnose + Auto-Update Endpoint.
// GET  → liefert Status-Report (Pragmas, DB-Größe, Index-Status, etc.)
// POST → optimiert (ANALYZE, VACUUM, REINDEX, pragma-Updates)

import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safe(fn, fallback) {
  try { return fn(); } catch { return fallback; }
}

function getPragma(name) {
  return safe(() => db().pragma(name, { simple: true }), "?");
}

function getDbStats() {
  const pageCount = safe(() => db().pragma("page_count", { simple: true }), 0);
  const pageSize  = safe(() => db().pragma("page_size",  { simple: true }), 4096);
  const freelist  = safe(() => db().pragma("freelist_count", { simple: true }), 0);
  return {
    sizeMB: Math.round((Number(pageCount) * Number(pageSize)) / (1024 * 1024) * 10) / 10,
    pages: Number(pageCount),
    freePages: Number(freelist),
    pageSize: Number(pageSize),
  };
}

function listIndexes() {
  return safe(() =>
    db().prepare(
      "SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY tbl_name, name"
    ).all(),
    []
  );
}

function countTables() {
  return safe(() =>
    db().prepare("SELECT COUNT(*) AS c FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").get().c,
    0
  );
}

function checkPragmas() {
  const journalMode  = String(getPragma("journal_mode")).toLowerCase();
  const synchronous  = Number(getPragma("synchronous"));
  const cacheSize    = Number(getPragma("cache_size"));
  const tempStore    = Number(getPragma("temp_store"));
  const mmapSize     = Number(getPragma("mmap_size"));
  const foreignKeys  = Number(getPragma("foreign_keys"));
  return [
    {
      key: "journal_mode",
      label: "WAL-Modus",
      value: journalMode,
      ok: journalMode === "wal",
      recommendation: journalMode === "wal" ? null : "Auf WAL umstellen",
    },
    {
      key: "synchronous",
      label: "Synchronous",
      value: ["OFF","NORMAL","FULL","EXTRA"][synchronous] || synchronous,
      ok: synchronous === 1,
      recommendation: synchronous === 1 ? null : "Auf NORMAL setzen für 2-3× Write-Speed",
    },
    {
      key: "cache_size",
      label: "Cache-Größe",
      value: cacheSize < 0 ? `${Math.abs(cacheSize / 1000).toFixed(0)} MB` : `${cacheSize} Pages`,
      ok: cacheSize === -16000 || cacheSize <= -10000,
      recommendation: cacheSize > -10000 ? "Auf 16 MB erhöhen (-16000)" : null,
    },
    {
      key: "temp_store",
      label: "Temp-Store",
      value: ["DEFAULT","FILE","MEMORY"][tempStore] || tempStore,
      ok: tempStore === 2,
      recommendation: tempStore === 2 ? null : "Auf MEMORY setzen",
    },
    {
      key: "mmap_size",
      label: "Memory-Mapped I/O",
      value: `${Math.round(mmapSize / (1024 * 1024))} MB`,
      ok: mmapSize >= 268435456,
      recommendation: mmapSize >= 268435456 ? null : "Auf 256 MB setzen",
    },
    {
      key: "foreign_keys",
      label: "Foreign-Keys",
      value: foreignKeys === 1 ? "ON" : "OFF",
      ok: foreignKeys === 1,
      recommendation: foreignKeys === 1 ? null : "Aktivieren (Datenintegrität)",
    },
  ];
}

export async function GET(req) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Admin-Auth nötig." }, { status: 401 });
  }
  const pragmas = checkPragmas();
  const dbStats = getDbStats();
  const indexes = listIndexes();
  const tableCount = countTables();
  return NextResponse.json({
    pragmas,
    dbStats,
    tableCount,
    indexCount: indexes.length,
    issues: pragmas.filter((p) => !p.ok).length,
    bytesFreeable: dbStats.freePages * dbStats.pageSize,
  });
}

export async function POST(req) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Admin-Auth nötig." }, { status: 401 });
  }
  const actions = [];
  // Apply recommended pragmas
  const fixes = [
    ["synchronous = NORMAL",   "Synchronous → NORMAL"],
    ["cache_size = -16000",    "Cache → 16 MB"],
    ["temp_store = MEMORY",    "Temp-Store → MEMORY"],
    ["mmap_size = 268435456",  "Memory-Mapped → 256 MB"],
    ["foreign_keys = ON",      "Foreign-Keys → ON"],
  ];
  for (const [p, label] of fixes) {
    try { db().pragma(p); actions.push({ label, ok: true }); }
    catch (e) { actions.push({ label, ok: false, error: e.message }); }
  }
  // ANALYZE — aktualisiert Statistiken für Query-Planer
  try { db().exec("ANALYZE"); actions.push({ label: "ANALYZE — Query-Statistiken aktualisiert", ok: true }); }
  catch (e) { actions.push({ label: "ANALYZE", ok: false, error: e.message }); }
  // INCREMENTAL VACUUM — gibt freie Pages zurück (statt full VACUUM, das blockt)
  try {
    const free = db().pragma("freelist_count", { simple: true });
    if (Number(free) > 0) {
      db().exec("PRAGMA incremental_vacuum");
      actions.push({ label: `VACUUM — ${free} freie Pages zurückgegeben`, ok: true });
    } else {
      actions.push({ label: "VACUUM — nichts zu freilassen", ok: true });
    }
  } catch (e) { actions.push({ label: "VACUUM", ok: false, error: e.message }); }
  // Re-Check WAL: oft hat WAL große .wal-Datei
  try {
    db().pragma("wal_checkpoint(TRUNCATE)");
    actions.push({ label: "WAL-Checkpoint — wal-Datei verkleinert", ok: true });
  } catch (e) { actions.push({ label: "WAL-Checkpoint", ok: false, error: e.message }); }

  return NextResponse.json({ ok: true, actions });
}
