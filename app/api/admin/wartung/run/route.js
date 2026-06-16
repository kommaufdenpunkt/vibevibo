import { NextResponse } from "next/server";
import { isAdminRequest, adminEnabled } from "@/lib/admin";
import {
  cleanupExpiredSessions, walCheckpoint, dbVacuum,
  cleanupOrphanPhotos, cleanupOrphanGroupMembers,
  removePermaban, logMaintenance,
} from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST { action: string, ...args }
export async function POST(req) {
  if (!adminEnabled()) return NextResponse.json({ error: "admin disabled" }, { status: 503 });
  if (!isAdminRequest(req)) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "").trim();

  const t0 = Date.now();
  let result;
  try {
    switch (action) {
      case "cleanup-sessions": {
        const n = cleanupExpiredSessions();
        result = { ok: true, deleted: n, message: `${n} abgelaufene Sessions entfernt` };
        break;
      }
      case "wal-checkpoint": {
        const r = walCheckpoint();
        result = { ok: r.ok, message: r.ok ? `WAL kompaktiert (${r.checkpointed} Pages)` : `Fehler: ${r.error}` };
        break;
      }
      case "vacuum": {
        const r = dbVacuum();
        result = {
          ok: r.ok,
          message: r.ok
            ? `DB defragmentiert · ${(r.freedBytes / 1024).toFixed(1)} KB freigegeben`
            : `Fehler: ${r.error}`,
        };
        break;
      }
      case "cleanup-orphan-photos": {
        const n = cleanupOrphanPhotos();
        result = { ok: true, deleted: n, message: `${n} verwaiste Fotos entfernt` };
        break;
      }
      case "cleanup-orphan-members": {
        const n = cleanupOrphanGroupMembers();
        result = { ok: true, deleted: n, message: `${n} verwaiste Com-Mitgliedschaften entfernt` };
        break;
      }
      case "unban-ip": {
        const ip = String(body.ip || "").trim();
        if (!ip) return NextResponse.json({ error: "ip fehlt" }, { status: 400 });
        const ok = removePermaban(ip);
        result = { ok, message: ok ? `${ip} entbannt` : `${ip} war nicht gebannt` };
        break;
      }
      default:
        return NextResponse.json({ error: "unbekannte Aktion: " + action }, { status: 400 });
    }
  } catch (e) {
    result = { ok: false, message: `Fehler: ${e.message}` };
  }

  const durationMs = Date.now() - t0;
  logMaintenance({
    action,
    result: result.ok ? "ok" : "error",
    details: result.message,
    durationMs,
  });

  return NextResponse.json({ ...result, durationMs });
}
