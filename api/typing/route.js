import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getUserByUsername, publishTyping, isRoomMember, isChatMuted } from "@/lib/db";

// POST { toUsername?, roomId? }  – schickt ein flüchtiges "tippt..."-Signal
// In-Memory Rate-Limit: max 1 Event pro 2s pro (Sender, Ziel)
const lastSeen = new Map(); // key -> ts

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const toUsername = body?.toUsername;
  const roomId = body?.roomId ? Number(body.roomId) : null;
  let toUserId = null;
  if (toUsername) {
    const u = getUserByUsername(toUsername);
    if (!u) return NextResponse.json({ ok: false }, { status: 404 });
    toUserId = u.id;
    // Wenn der Empfänger den Sender stumm geschaltet hat: kein Signal raus
    if (isChatMuted(toUserId, { fromUserId: me.id })) return NextResponse.json({ ok: true, muted: true });
  } else if (roomId) {
    if (!isRoomMember(roomId, me.id)) return NextResponse.json({ ok: false }, { status: 403 });
  } else {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const key = `${me.id}->${toUserId || `r${roomId}`}`;
  const now = Date.now();
  if ((lastSeen.get(key) || 0) + 2000 > now) return NextResponse.json({ ok: true, throttled: true });
  lastSeen.set(key, now);

  publishTyping({ fromUserId: me.id, toUserId, roomId });
  return NextResponse.json({ ok: true });
}
