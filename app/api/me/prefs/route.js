import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { setSoundPack, setPresence, getSoundPack } from "@/lib/db";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  return NextResponse.json({ soundPack: getSoundPack(me.id) });
}

// PATCH { soundPack?, presence? }
export async function PATCH(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const out = {};
  if (body.soundPack) out.soundPack = setSoundPack(me.id, String(body.soundPack));
  if (body.presence) out.presence = setPresence(me.id, String(body.presence));
  return NextResponse.json({ ok: true, ...out });
}
