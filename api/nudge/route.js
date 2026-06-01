import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getUserByUsername, publishNudge, isChatMuted } from "@/lib/db";

// POST { toUsername } – MSN-Style Nudge (Wackeln + Plop-Sound auf der anderen Seite)
// Rate-Limit: max 1 Nudge pro Minute pro Empfänger.
const lastSent = new Map();

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const to = getUserByUsername(String(body?.toUsername || ""));
  if (!to) return NextResponse.json({ error: "user not found" }, { status: 404 });
  if (to.id === me.id) return NextResponse.json({ error: "kein selbst-nudge" }, { status: 400 });

  const key = `${me.id}->${to.id}`;
  const now = Date.now();
  if ((lastSent.get(key) || 0) + 60_000 > now) {
    return NextResponse.json({ error: "Du kannst nur einmal pro Minute anklopfen." }, { status: 429 });
  }
  lastSent.set(key, now);

  if (isChatMuted(to.id, { fromUserId: me.id })) {
    // Mute respektieren: trotzdem als gesendet zurückgeben (Sender soll's nicht wissen)
    return NextResponse.json({ ok: true, muted: true });
  }
  publishNudge({ fromUserId: me.id, toUserId: to.id });
  return NextResponse.json({ ok: true });
}
