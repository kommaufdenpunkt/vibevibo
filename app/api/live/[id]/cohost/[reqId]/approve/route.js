import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { approveHostRequest, publishLive, getLiveStream, userRow, getUserById } from "@/lib/db";
import { sendPushToUser } from "@/lib/push";

export async function POST(_req, ctx) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id, reqId } = await ctx.params;
  try {
    const sid = Number(id);
    const r = approveHostRequest(sid, Number(reqId), me.id);
    publishLive(sid, "cohost_decided", { requestId: Number(reqId), approved: true, userId: r.userId });
    publishLive(sid, "host", { userId: r.userId, joined: true });
    // Push an den User der gerade Cohost wurde
    const s = getLiveStream(sid);
    const owner = userRow(getUserById(me.id));
    if (s) sendPushToUser(r.userId, {
      title: `🛋 Auf die Couch von ${owner?.displayName || me.username}!`,
      body: `Dein Cohost-Antrag bei „${s.title}" wurde angenommen.`,
      url: `/live/${sid}`,
      tag: `cohost-${sid}`,
      kind: "message",
      fromUsername: me.username,
      fromUserId: me.id,
    }).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
