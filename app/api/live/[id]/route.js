import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  getLiveStream, listLiveHosts, listLiveViewers, listLiveChat,
  listLiveMods, listPendingHostRequests,
  endLiveStream, isLiveHost, isStreamMod, isStreamOwner, isMuted,
  liveStreamStats, publishLive,
} from "@/lib/db";

// GET — Stream-Details (Hosts + letzte Chats + Viewer)
export async function GET(_req, ctx) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id } = await ctx.params;
  const sid = Number(id);
  const stream = getLiveStream(sid);
  if (!stream) return NextResponse.json({ error: "Stream nicht gefunden." }, { status: 404 });
  const iAmOwner = stream.ownerId === me.id;
  const iAmMod = isStreamMod(sid, me.id);
  return NextResponse.json({
    stream,
    hosts: listLiveHosts(sid),
    viewers: listLiveViewers(sid, 60),
    chat: listLiveChat(sid, 80),
    mods: listLiveMods(sid),
    requests: iAmOwner ? listPendingHostRequests(sid) : [],
    iAmHost: isLiveHost(sid, me.id),
    iAmOwner, iAmMod,
    iAmMuted: isMuted(sid, me.id),
  });
}

// DELETE — Owner beendet Stream. Antwort enthält Endstats.
export async function DELETE(_req, ctx) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id } = await ctx.params;
  const sid = Number(id);
  try {
    endLiveStream(sid, me.id);
    const stats = liveStreamStats(sid);
    publishLive(sid, "ended", { at: Date.now(), stats });
    return NextResponse.json({ ok: true, stats });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
