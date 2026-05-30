import { NextResponse } from "next/server";
import { getUserByUsername, addGift, getGifts, addNotification, awardCredits } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { findGift } from "@/lib/gifts";
import { EARN } from "@/lib/credits";

export async function POST(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { username } = await params;
  const target = getUserByUsername(username);
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (target.id === me.id) return NextResponse.json({ error: "self gift" }, { status: 400 });
  const { giftId } = await req.json();
  const g = findGift(giftId);
  if (!g) return NextResponse.json({ error: "unknown gift" }, { status: 400 });
  addGift(target.id, me.id, giftId);
  addNotification({ userId: target.id, actorId: me.id, type: "gift", targetType: "gift", targetId: null, preview: `${g.icon} ${g.name}` });
  // Vibes: Sender +2, Empfänger +8. Ref = Gegenseite → max 1x pro Person/Tag,
  // verhindert Multi-Account-Farming (Doppel-Account schickt sich 100 Geschenke).
  awardCredits(me.id, EARN.gift_send, "gift_send", { type: "to", id: target.id });
  awardCredits(target.id, EARN.gift_recv, "gift_recv", { type: "from", id: me.id });
  return NextResponse.json({ gifts: getGifts(target.id) });
}
