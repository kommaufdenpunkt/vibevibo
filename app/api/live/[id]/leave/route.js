import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { removeViewer, leaveLiveHost, isLiveHost, publishLive } from "@/lib/db";

// POST — Stream verlassen (Viewer ODER Cohost, je nach Rolle)
export async function POST(_req, ctx) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id } = await ctx.params;
  const sid = Number(id);
  if (isLiveHost(sid, me.id)) {
    leaveLiveHost(sid, me.id);
    publishLive(sid, "host", { userId: me.id, left: true });
  } else {
    removeViewer(sid, me.id);
    publishLive(sid, "viewer", { userId: me.id, left: true });
  }
  return NextResponse.json({ ok: true });
}
