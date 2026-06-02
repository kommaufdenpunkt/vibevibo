import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createLiveStream, listLiveStreams } from "@/lib/db";
import { LIVE_MODES, MAX_HOSTS_MULTI } from "@/lib/live";

// GET — Liste aller aktiven Streams
export async function GET() {
  return NextResponse.json({ streams: listLiveStreams(30) });
}

// POST { title, mode, hasVideo, hasAudio, maxHosts?, hostPolicy? }
export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const mode = body?.mode === "multi" ? "multi" : "solo";
  const cfg = LIVE_MODES[mode];
  const title = String(body?.title || "Live!").trim().slice(0, 100);
  const hasVideo = body?.hasVideo !== false;
  const hasAudio = body?.hasAudio !== false;
  if (!hasVideo && !hasAudio) {
    return NextResponse.json({ error: "Mindestens Audio oder Video an." }, { status: 400 });
  }
  // Multi: User kann maxHosts bis 16 wählen; Solo immer 1.
  const requestedMax = Number(body?.maxHosts) || cfg.maxHosts;
  const maxHosts = mode === "multi"
    ? Math.max(2, Math.min(MAX_HOSTS_MULTI, requestedMax))
    : 1;
  const hostPolicy = body?.hostPolicy === "request" ? "request" : "open";
  try {
    const id = createLiveStream({
      ownerId: me.id, title, mode, hasVideo, hasAudio, maxHosts, hostPolicy,
    });
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
