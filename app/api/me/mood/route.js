import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { setUserMood, getUserMood, clearUserMood } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth" }, { status: 401 });
  return NextResponse.json(getUserMood(me.id));
}

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth" }, { status: 401 });
  let body = {};
  try { body = await req.json(); } catch {}
  try {
    if (body?.clear) clearUserMood(me.id);
    else setUserMood(me.id, { emoji: body?.emoji || "", text: body?.text || "" });
    return NextResponse.json({ ok: true, mood: getUserMood(me.id) });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Fehler" }, { status: 400 });
  }
}
