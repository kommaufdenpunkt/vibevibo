import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { removeFurniture } from "@/lib/db";

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const slot = Number(body?.slot);
  try {
    const r = removeFurniture(me.id, slot);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ error: e.message || "fehler" }, { status: 400 });
  }
}
