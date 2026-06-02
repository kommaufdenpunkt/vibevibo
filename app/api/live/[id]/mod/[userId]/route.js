import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { promoteMod, demoteMod, publishLive } from "@/lib/db";

// POST   — Mod machen (nur Owner)
// DELETE — Mod absetzen
export async function POST(_req, ctx) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id, userId } = await ctx.params;
  try {
    promoteMod(Number(id), Number(userId), me.id);
    publishLive(Number(id), "mod", { userId: Number(userId), promoted: true });
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 400 }); }
}
export async function DELETE(_req, ctx) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id, userId } = await ctx.params;
  try {
    demoteMod(Number(id), Number(userId), me.id);
    publishLive(Number(id), "mod", { userId: Number(userId), promoted: false });
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 400 }); }
}
