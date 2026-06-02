import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { demoteCohost, publishLive } from "@/lib/db";

// POST — Cohost runtersetzen (Owner only). User wird normaler Viewer.
export async function POST(_req, ctx) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id, userId } = await ctx.params;
  try {
    demoteCohost(Number(id), Number(userId), me.id);
    publishLive(Number(id), "host", { userId: Number(userId), left: true, demoted: true });
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 400 }); }
}
