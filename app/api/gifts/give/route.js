import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { sendGift, getUserByUsername, isBlockedBetween } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  let body = {};
  try { body = await req.json(); } catch {}
  const { targetUsername, customGiftId, message, wrapped, scheduledFor } = body || {};
  if (!targetUsername || !customGiftId) {
    return NextResponse.json({ error: "Empfänger + Geschenk nötig" }, { status: 400 });
  }
  const target = getUserByUsername(String(targetUsername).toLowerCase());
  if (!target) return NextResponse.json({ error: "Empfänger nicht gefunden" }, { status: 404 });

  // 🚫 Block-Schutz: kein Geschenk an blockierte User
  if (isBlockedBetween(me.id, target.id)) {
    return NextResponse.json({ error: "Diese Aktion ist nicht möglich." }, { status: 403 });
  }

  try {
    const giftRowId = sendGift({
      fromUserId: me.id,
      targetUserId: target.id,
      customGiftId: Number(customGiftId),
      message: String(message || "").slice(0, 400),
      wrapped: !!wrapped,
      scheduledFor: scheduledFor ? Number(scheduledFor) : null,
    });
    return NextResponse.json({ ok: true, giftRowId });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Fehler" }, { status: 400 });
  }
}
