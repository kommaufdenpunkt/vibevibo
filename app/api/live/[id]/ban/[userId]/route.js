import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { banStreamUser, unbanStreamUser, publishLive } from "@/lib/db";

// POST { reason? } — User aus dem Stream rauswerfen + permanent ban (für diesen Stream).
// DELETE — Ban aufheben.
export async function POST(req, ctx) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id, userId } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  try {
    banStreamUser(Number(id), Number(userId), me.id, body?.reason || "");
    publishLive(Number(id), "ban", { userId: Number(userId), banned: true });
    publishLive(Number(id), "host", { userId: Number(userId), left: true });
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 400 }); }
}
export async function DELETE(_req, ctx) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id, userId } = await ctx.params;
  try {
    unbanStreamUser(Number(id), Number(userId), me.id);
    publishLive(Number(id), "ban", { userId: Number(userId), banned: false });
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 400 }); }
}
