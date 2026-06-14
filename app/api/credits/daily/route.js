import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { claimDailyBonus, bumpXP } from "@/lib/db";
import { dailyBonusFor } from "@/lib/credits";
import { checkStreakAchievements, checkLoginAchievements } from "@/lib/achievements";

export async function POST() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });

  // Saison-Multiplikator wird in awardCredits intern angewendet,
  // damit zählt hier nur der Rang- & Streak-Anteil.
  const res = claimDailyBonus(me.id, ({ totalEarned, streak }) =>
    dailyBonusFor({ totalEarned, streak, seasonMultiplier: 1 }).amount
  );
  if (!res.claimed) {
    return NextResponse.json({ error: res.reason || "Heute schon abgeholt." }, { status: 429 });
  }
  try { bumpXP(me.id, "daily_login"); } catch {}

  // 🏆 Auto-Trigger Auszeichnungen (defensive — bei fehlender Patch sind Funktionen leer-Op)
  const newAch = [];
  try { newAch.push(...checkLoginAchievements(me.id)); } catch {}
  try { newAch.push(...checkStreakAchievements(me.id, res.streak)); } catch {}

  return NextResponse.json({ ok: true, amount: res.amount, streak: res.streak, newAchievements: newAch });
}
