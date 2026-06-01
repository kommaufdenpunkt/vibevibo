import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listCemetery, setEpitaph } from "@/lib/db";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  return NextResponse.json({ graves: listCemetery(me.id, 50) });
}

// PATCH { id, epitaph }
export async function PATCH(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = Number(body?.id);
  if (!id) return NextResponse.json({ error: "id fehlt" }, { status: 400 });
  setEpitaph(me.id, id, String(body?.epitaph || ""));
  return NextResponse.json({ ok: true });
}
