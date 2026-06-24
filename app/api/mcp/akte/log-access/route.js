// POST /api/mcp/akte/log-access — loggt einen Akte-Zugriff mit Begründung.
// Body: { targetUserId, reason }
// Antwort: { ok: true, accessId } oder { error }
//
// Nur eingeloggte Mods/Teamleitungen/Admins.

import { NextResponse } from "next/server";
import { getMcpUser } from "@/lib/modAuth";
import { logAkteAccess } from "@/lib/akteAudit";
import { getClientIp } from "@/lib/ip";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req) {
  const me = await getMcpUser();
  if (!me) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  let body = {};
  try { body = await req.json(); } catch {}

  const targetUserId = Number(body?.targetUserId);
  const reason = String(body?.reason || "").trim();

  if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
    return NextResponse.json({ error: "targetUserId fehlt oder ungültig." }, { status: 400 });
  }
  if (reason.length < 10) {
    return NextResponse.json({ error: "Begründung muss mindestens 10 Zeichen lang sein." }, { status: 400 });
  }
  if (reason.length > 500) {
    return NextResponse.json({ error: "Begründung max. 500 Zeichen." }, { status: 400 });
  }

  const ip = getClientIp(req);
  const ua = req.headers.get("user-agent") || "";

  try {
    const accessId = logAkteAccess({
      modId: me.id,
      targetUserId,
      reason,
      ip,
      ua,
    });
    return NextResponse.json({ ok: true, accessId: Number(accessId) });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
