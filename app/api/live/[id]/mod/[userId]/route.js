import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { promoteMod, demoteMod, publishLive, getLiveStream, userRow, getUserById } from "@/lib/db";
import { sendPushToUser } from "@/lib/push";

// POST   — Mod machen (nur Owner)
// DELETE — Mod absetzen
export async function POST(_req, ctx) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id, userId } = await ctx.params;
  try {
    const sid = Number(id);
    const uid = Number(userId);
    promoteMod(sid, uid, me.id);
    publishLive(sid, "mod", { userId: uid, promoted: true });
    const s = getLiveStream(sid);
    const owner = userRow(getUserById(me.id));
    if (s) sendPushToUser(uid, {
      title: `🛡 Du bist Mod bei ${owner?.displayName || me.username}!`,
      body: `Pass auf „${s.title}" mit auf.`,
      url: `/live/${sid}`,
      tag: `mod-${sid}`,
      kind: "message",
      fromUsername: me.username,
      fromUserId: me.id,
    }).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 400 }); }
}
export async function DELETE(_req, ctx) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id, userId } = await ctx.params;
  try {
    demoteMod(Number(id), Number(userId), me.id);
    publishLive(Number(id), "mod", { userId: Number(userId), promoted: false });
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 400 }); }
}
