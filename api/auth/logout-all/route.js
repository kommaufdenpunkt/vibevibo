import { NextResponse } from "next/server";
import { getSessionUser, getSessionToken, clearSessionCookie } from "@/lib/auth";
import { deleteAllSessionsForUser, audit } from "@/lib/db";
import { getClientIp } from "@/lib/ip";

// Beendet ALLE Sessions des aktuellen Users (auf allen Geräten).
// Nutzlich bei Verdacht auf Kompromittierung.
export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const removed = deleteAllSessionsForUser(me.id);
  await clearSessionCookie();
  audit({
    userId: me.id, action: "logout_all",
    ip: getClientIp(req), ua: req.headers.get("user-agent") || "",
    detail: `sessions=${removed}`,
  });
  return NextResponse.json({ ok: true, removed });
}
