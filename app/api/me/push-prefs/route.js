import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getPushPrefs, setPushPrefs } from "@/lib/db";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  return NextResponse.json({ prefs: getPushPrefs(me.id) });
}

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const prefs = setPushPrefs(me.id, body?.prefs || {});
  return NextResponse.json({ ok: true, prefs });
}
