import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  getLiveStream, listLiveHosts, listLiveViewers, listLiveChat,
  endLiveStream, isLiveHost, publishLive,
} from "@/lib/db";

// GET — Stream-Details (Hosts + letzte Chats + Viewer)
export async function GET(_req, ctx) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id } = await ctx.params;
  const sid = Number(id);
  const stream = getLiveStream(sid);
  if (!stream) return NextResponse.json({ error: "Stream nicht gefunden." }, { status: 404 });
  return NextResponse.json({
    stream,
    hosts: listLiveHosts(sid),
    viewers: listLiveViewers(sid, 30),
    chat: listLiveChat(sid, 80),
    iAmHost: isLiveHost(sid, me.id),
    iAmOwner: stream.ownerId === me.id,
  });
}

// DELETE — Owner beendet Stream
export async function DELETE(_req, ctx) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id } = await ctx.params;
  try {
    endLiveStream(Number(id), me.id);
    publishLive(Number(id), "ended", { at: Date.now() });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
