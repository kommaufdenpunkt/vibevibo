import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { joinLiveHost, publishLive } from "@/lib/db";

// POST — als Cohost beitreten (nur Multi-Mode). Jeder darf rein bis maxHosts erreicht.
export async function POST(_req, ctx) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id } = await ctx.params;
  const sid = Number(id);
  try {
    joinLiveHost(sid, me.id);
    publishLive(sid, "host", { userId: me.id, joined: true });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
