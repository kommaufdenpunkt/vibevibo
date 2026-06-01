import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { PREMIUM_ITEMS } from "@/lib/premium";
import { listPremiumBadges, getUserPicSlots, getCredits } from "@/lib/db";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const credits = getCredits(me.id);
  return NextResponse.json({
    items: PREMIUM_ITEMS,
    balance: credits?.balance || 0,
    owned: {
      picSlots: getUserPicSlots(me.id),
      badges: listPremiumBadges(me.id),
    },
  });
}
