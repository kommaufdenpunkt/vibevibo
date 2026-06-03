import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getAdRewardStats, isVipActive } from "@/lib/db";
import { getProviderConfig } from "@/lib/ads";

// Frontend fragt: wie viele Rewards heute schon? Wie viel uebrig? Cooldown?
export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const vip = isVipActive(me.id);
  const stats = getAdRewardStats(me.id);
  return NextResponse.json({
    ...stats,
    vip,
    config: getProviderConfig(),
    // Frontend zeigt darauf basierend Button enabled/disabled
    canRequest: !vip && stats.rewardsToday < stats.maxRewardsPerDay
                && stats.vibesToday < stats.maxVibesPerDay
                && stats.nextRewardAt <= Date.now()
                && stats.pendingCount === 0,
  });
}
