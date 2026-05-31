import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { placeFurniture } from "@/lib/db";

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const kind = String(body?.kind || "");
  const slot = body?.slot === undefined || body?.slot === null ? null : Number(body.slot);
  try {
    const r = placeFurniture(me.id, kind, slot);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ error: e.message || "fehler" }, { status: 400 });
  }
}
