import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { unwrapGift } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  let body = {};
  try { body = await req.json(); } catch {}
  const giftRowId = Number(body?.giftRowId);
  if (!giftRowId) return NextResponse.json({ error: "giftRowId fehlt" }, { status: 400 });
  try {
    const ok = unwrapGift(giftRowId, me.id);
    return NextResponse.json({ ok });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Fehler" }, { status: 400 });
  }
}
