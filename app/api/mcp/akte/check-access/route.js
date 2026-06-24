// GET /api/mcp/akte/check-access?targetUserId=X
// Prüft ob der eingeloggte Mod bereits in den letzten 30min einen Akte-Zugriff
// auf diese targetUserId mit Begründung geloggt hat.
//
// Antwort: { hasAccess: bool, lastReason?: string, lastAccessedAt?: number }

import { NextResponse } from "next/server";
import { getMcpUser } from "@/lib/modAuth";
import { hasRecentAkteAccess } from "@/lib/akteAudit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req) {
  const me = await getMcpUser();
  if (!me) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const url = new URL(req.url);
  const targetUserId = Number(url.searchParams.get("targetUserId"));

  if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
    return NextResponse.json({ error: "targetUserId fehlt oder ungültig." }, { status: 400 });
  }

  const recent = hasRecentAkteAccess(me.id, targetUserId);
  if (recent) {
    return NextResponse.json({
      hasAccess: true,
      lastReason: recent.reason,
      lastAccessedAt: recent.accessed_at,
    });
  }
  return NextResponse.json({ hasAccess: false });
}
