// 🔍 Live-Verfügbarkeits-Check für Username + Anzeigename
//
// GET ?username=X → { ok: true, available: bool }
// GET ?displayName=X → { ok: true, available: bool }

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isValidNameFormat, findUserByUsernameCI, findUserByDisplayNameCI } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const url = new URL(req.url);
  const username = url.searchParams.get("username");
  const displayName = url.searchParams.get("displayName");

  if (username != null) {
    if (!isValidNameFormat(username)) {
      return NextResponse.json({ ok: true, available: false, reason: "invalid" });
    }
    const taken = findUserByUsernameCI(username);
    const available = !taken || taken.id === me.id;
    return NextResponse.json({ ok: true, available, reason: available ? null : "taken" });
  }
  if (displayName != null) {
    if (!isValidNameFormat(displayName)) {
      return NextResponse.json({ ok: true, available: false, reason: "invalid" });
    }
    const taken = findUserByDisplayNameCI(displayName);
    const available = !taken || taken.id === me.id;
    return NextResponse.json({ ok: true, available, reason: available ? null : "taken" });
  }
  return NextResponse.json({ error: "Param username oder displayName fehlt" }, { status: 400 });
}
