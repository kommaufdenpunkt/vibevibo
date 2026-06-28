// POST /api/tipp/backup — erstellt eine konsistente Sicherungskopie der Live-DB.
// Freigabe: Owner (eyfahrlehrer) ODER Rolle admin/teamleitung/moderator.

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import * as vvdb from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

const OWNERS = new Set(["eyfahrlehrer"]);

function isStaff(me) {
  if (!me) return false;
  if (me.username && OWNERS.has(String(me.username).toLowerCase())) return true;
  try { if (typeof vvdb.isAdminRole === "function" && vvdb.isAdminRole(me.id)) return true; } catch {}
  try { if (typeof vvdb.isModeratorRole === "function" && vvdb.isModeratorRole(me.id)) return true; } catch {}
  return false;
}

export async function POST() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Bitte einloggen." }, { status: 401 });
  if (!isStaff(me)) return NextResponse.json({ error: "Nur für Admin/Owner." }, { status: 403 });
  if (typeof vvdb.vvBackupDatabase !== "function") {
    return NextResponse.json({ error: "Backup-Funktion nicht verfügbar (Patch nicht aktiv?)." }, { status: 500 });
  }
  try {
    const r = await vvdb.vvBackupDatabase();
    return NextResponse.json({ ok: true, path: r.path, size: r.size });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Backup fehlgeschlagen." }, { status: 500 });
  }
}
