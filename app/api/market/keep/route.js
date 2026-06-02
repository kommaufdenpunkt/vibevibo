import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { setSellableKept } from "@/lib/db";

// POST { id, kept: bool } — markiert einen Fang als „Behalten" (nicht verkaufen).
export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = Number(body?.id);
  const kept = !!body?.kept;
  if (!id) return NextResponse.json({ error: "id fehlt" }, { status: 400 });
  const ok = setSellableKept(me.id, id, kept);
  if (!ok) return NextResponse.json({ error: "Fang nicht gefunden." }, { status: 404 });
  return NextResponse.json({ ok: true, id, kept });
}
