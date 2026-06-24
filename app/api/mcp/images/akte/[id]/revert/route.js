// POST /api/mcp/images/akte/:id/revert
// Body: { message? }  — Mod überstimmt einen Fidolin-Auto-Reject.
// Akte-Eintrag wird entfernt, Queue-Eintrag (falls vorhanden) auf 'approved' gesetzt,
// orange Korrektur-System-DM geht an den User raus.

import { NextResponse } from "next/server";
import { getMcpUser } from "@/lib/modAuth";
import { revertAutoReject } from "@/lib/imageModeration";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req, { params }) {
  const me = await getMcpUser();
  if (!me) return NextResponse.json({ error: "Mod-Login nötig." }, { status: 401 });

  const { id } = await params;
  const akteId = parseInt(id, 10);
  if (!Number.isInteger(akteId) || akteId <= 0) {
    return NextResponse.json({ error: "Ungültige Akte-ID." }, { status: 400 });
  }

  let body = {};
  try { body = await req.json(); } catch {}
  const customMessage = body?.message ? String(body.message).trim().slice(0, 500) : null;

  try {
    revertAutoReject({ akteId, modId: me.id, customMessage });
    return NextResponse.json({ ok: true, action: "reverted", akteId });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
