import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { addLiveReport, getLiveStream, addLiveStrike, isStreamMod, publishLive } from "@/lib/db";

// POST { targetUserId, reason, detail?, kind? }
// reason: 'nudity' | 'harassment' | 'minor' | 'spam' | 'other'
// kind:   'manual' (default) | 'nsfw' (clientside auto)
export async function POST(req, ctx) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id } = await ctx.params;
  const sid = Number(id);
  const body = await req.json().catch(() => ({}));
  const targetUserId = Number(body?.targetUserId);
  const reason = String(body?.reason || "other").slice(0, 200);
  const detail = String(body?.detail || "").slice(0, 500);
  const kind = body?.kind === "nsfw" ? "nsfw" : (body?.kind === "chat" ? "chat" : "manual");
  if (!targetUserId) return NextResponse.json({ error: "targetUserId fehlt" }, { status: 400 });

  const s = getLiveStream(sid);
  if (!s) return NextResponse.json({ error: "Stream nicht gefunden." }, { status: 404 });

  addLiveReport({ streamId: sid, targetUserId, reporterId: me.id, reason, detail, kind });

  // NSFW client-side: Eigen-Report des Hosts gegen sich selbst → Auto-Strike + Stream beenden.
  // Reasoning: User hat schon im Browser gesehen dass das Modell den eigenen Stream als NSFW
  // klassifiziert hat. Server vertraut dem (nur Zähler, kein Auth-Bypass).
  if (kind === "nsfw" && targetUserId === me.id && s.ownerId === me.id) {
    const strike = addLiveStrike(me.id, {
      reason: "NSFW-Klassifizierung im eigenen Stream",
      kind: "nsfw", streamId: sid, byUserId: null,
    });
    publishLive(sid, "nsfw_strike", { strikeCount: strike.strikeCount, blockedUntil: strike.blockedUntil });
    return NextResponse.json({ ok: true, strike });
  }

  // Owner/Mod soll's mitbekommen
  publishLive(sid, "report", { from: me.id, targetUserId, reason });
  return NextResponse.json({ ok: true });
}
