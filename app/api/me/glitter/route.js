import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { setGlitterStatus } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth" }, { status: 401 });
  let body = {};
  try { body = await req.json(); } catch {}
  try {
    setGlitterStatus(me.id, !!body?.enabled);
    return NextResponse.json({ ok: true, enabled: !!body?.enabled });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Fehler" }, { status: 400 });
  }
}
