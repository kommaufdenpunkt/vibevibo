import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getLiveStream, heartbeatViewer, publishLive } from "@/lib/db";

// POST — als Zuschauer beitreten / Heartbeat
export async function POST(_req, ctx) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id } = await ctx.params;
  const sid = Number(id);
  const s = getLiveStream(sid);
  if (!s) return NextResponse.json({ error: "Stream nicht gefunden." }, { status: 404 });
  if (s.status !== "live") return NextResponse.json({ error: "Stream beendet." }, { status: 410 });
  const { viewerCount } = heartbeatViewer(sid, me.id);
  publishLive(sid, "viewer", { userId: me.id, count: viewerCount, joined: true });
  return NextResponse.json({ ok: true, viewerCount });
}
