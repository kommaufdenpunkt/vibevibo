import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { PREMIUM_ITEMS } from "@/lib/premium";
import { getEconomyMultiplier, applyEconomyMultiplier } from "@/lib/economy";
import {
  listPremiumBadges,
  getUserPicSlots,
  getCredits,
  getShopAvailability,
  getShopSinkTotal,
  getBuschfunkBoostStatus,
} from "@/lib/db";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const credits = getCredits(me.id);
  return NextResponse.json({
    items: PREMIUM_ITEMS.map((i) => ({ ...i, price: applyEconomyMultiplier(i.price) })),
    economyMultiplier: getEconomyMultiplier(),
    balance: credits?.balance || 0,
    owned: {
      picSlots: getUserPicSlots(me.id),
      badges: listPremiumBadges(me.id),
      buschfunkBoosts: getBuschfunkBoostStatus(me.id),
    },
    // Anti-Inflation: pro Item Stock-Rest, Tages-Käufe, Saison-Status.
    availability: getShopAvailability(me.id),
    // Globaler Sink (alle bisher verbrannten Vibes durch Shop-Käufe).
    sinkTotal: getShopSinkTotal(),
  });
}
