import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  joinLiveHost, listPendingHostRequests, publishLive, isStreamBanned,
  userRow, getUserById,
} from "@/lib/db";

// POST — Cohost-Anfrage stellen / direkt joinen (je nach Policy).
export async function POST(_req, ctx) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id } = await ctx.params;
  const sid = Number(id);
  if (isStreamBanned(sid, me.id)) {
    return NextResponse.json({ error: "Du wurdest aus diesem Stream gebannt." }, { status: 403 });
  }
  try {
    const r = joinLiveHost(sid, me.id);
    if (r.pendingRequest) {
      // Owner via SSE benachrichtigen — er sieht eine Anfrage im Mod-Panel.
      const u = userRow(getUserById(me.id));
      publishLive(sid, "cohost_request", {
        requestId: r.requestId,
        from: {
          id: me.id, username: u.username, displayName: u.displayName,
          gender: u.gender, age: u.age, avatarUrl: u.avatarUrl,
        },
      });
      return NextResponse.json({ ok: true, pendingRequest: true, message: "Anfrage gestellt — warte auf den Owner." });
    }
    publishLive(sid, "host", { userId: me.id, joined: true });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

// GET — offene Anfragen (Owner only)
export async function GET(_req, ctx) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id } = await ctx.params;
  return NextResponse.json({ requests: listPendingHostRequests(Number(id)) });
}
