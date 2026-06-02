import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getLiveStream, publishLive } from "@/lib/db";

// POST { toUserId, type: 'offer'|'answer'|'ice'|'bye', payload }
// WebRTC-Signaling, leitet via SSE „rtc"-Event direkt an Empfänger weiter.
export async function POST(req, ctx) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id } = await ctx.params;
  const sid = Number(id);
  const body = await req.json().catch(() => ({}));
  const toUserId = Number(body?.toUserId);
  const type = String(body?.type || "");
  const payload = body?.payload;
  if (!toUserId || !["offer", "answer", "ice", "bye"].includes(type)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const s = getLiveStream(sid);
  if (!s || s.status !== "live") return NextResponse.json({ error: "Stream nicht aktiv." }, { status: 410 });

  const json = JSON.stringify(payload || {});
  if (json.length > 20_000) return NextResponse.json({ error: "Payload zu groß." }, { status: 413 });

  publishLive(sid, "rtc", { toUserId, fromUserId: me.id, kind: type, payload });
  return NextResponse.json({ ok: true });
}
