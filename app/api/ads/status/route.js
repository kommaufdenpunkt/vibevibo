import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getAdRewardStats, isVipActive } from "@/lib/db";
import { getProviderConfig } from "@/lib/ads";

// Public-Endpoint — Landing braucht die Display-/Popunder-Config OHNE Login.
// Eingeloggte User bekommen zusätzlich Reward-Stats + VIP-Status.
export async function GET() {
  const me = await getSessionUser();
  const config = getProviderConfig();
  if (!me) {
    return NextResponse.json({ config, vip: false });
  }
  const vip = isVipActive(me.id);
  const stats = getAdRewardStats(me.id);
  return NextResponse.json({
    ...stats,
    vip,
    config,
    canRequest: !vip && stats.rewardsToday < stats.maxRewardsPerDay
                && stats.vibesToday < stats.maxVibesPerDay
                && stats.nextRewardAt <= Date.now()
                && stats.pendingCount === 0,
  });
}
