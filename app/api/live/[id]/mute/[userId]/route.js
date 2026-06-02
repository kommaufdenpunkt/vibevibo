import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { muteStreamUser, unmuteStreamUser, publishLive } from "@/lib/db";

// POST { minutes? } — User muten (1-120 min, default 5)
// DELETE — entmuten
export async function POST(req, ctx) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id, userId } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  try {
    const r = muteStreamUser(Number(id), Number(userId), Number(body?.minutes) || 5, me.id, body?.reason || "");
    publishLive(Number(id), "mute", { userId: Number(userId), untilAt: r.untilAt, minutes: r.minutes });
    return NextResponse.json({ ok: true, ...r });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 400 }); }
}
export async function DELETE(_req, ctx) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id, userId } = await ctx.params;
  try {
    unmuteStreamUser(Number(id), Number(userId), me.id);
    publishLive(Number(id), "mute", { userId: Number(userId), untilAt: 0 });
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 400 }); }
}
