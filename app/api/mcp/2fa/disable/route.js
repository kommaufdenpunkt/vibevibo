import { NextResponse } from "next/server";
import { getMcpUser } from "@/lib/modAuth";
import { disableMcpTotp, isAdminRole } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const me = await getMcpUser();
  if (!me) return NextResponse.json({ error: "Mod-Login nötig." }, { status: 401 });
  // Self-disable allowed; admin can disable any
  let body = {};
  try { body = await req.json(); } catch {}
  const targetUserId = Number(body?.targetUserId) || me.id;
  if (targetUserId !== me.id && !isAdminRole(me.id)) {
    return NextResponse.json({ error: "Nur Admins dürfen 2FA für andere deaktivieren." }, { status: 403 });
  }
  try {
    disableMcpTotp(targetUserId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Fehler" }, { status: 400 });
  }
}
