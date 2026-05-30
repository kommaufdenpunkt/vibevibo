import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getCredits, listCreditTx, currentSeasonMultiplier, listActiveSeasonEvents } from "@/lib/db";
import { rankFromEarned, dailyBonusFor } from "@/lib/credits";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const c = getCredits(me.id);
  const rank = rankFromEarned(c.totalEarned);
  const seasonM = currentSeasonMultiplier();
  const seasonEvents = listActiveSeasonEvents();
  const nextDaily = dailyBonusFor({ totalEarned: c.totalEarned, streak: c.dailyStreak + 1, seasonMultiplier: seasonM });
  // Tagesgrenze (UTC)
  const now = Date.now();
  const lastKey = c.lastDailyAt ? new Date(c.lastDailyAt).toISOString().slice(0, 10) : null;
  const todayKey = new Date(now).toISOString().slice(0, 10);
  const canClaimDaily = lastKey !== todayKey;
  return NextResponse.json({
    balance: c.balance,
    totalEarned: c.totalEarned,
    streak: c.dailyStreak,
    rank,
    seasonMultiplier: seasonM,
    canClaimDaily,
    nextDailyPreview: nextDaily.amount,
    seasonEvents,
    history: listCreditTx(me.id, 30),
  });
}
