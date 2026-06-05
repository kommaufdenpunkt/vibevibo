import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { complimentsUnreadCount, complimentsReceivedCount } from "@/lib/db";
import { rankProgress, rankName, rankEmoji, rankColor } from "@/lib/rank";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null });
  // Komplimente-Counter: total empfangen (fuers Profil) + ungelesen (fuers Badge)
  const complimentsTotal = complimentsReceivedCount(user.id);
  const complimentsUnread = complimentsUnreadCount(user.id);
  // 🏅 Rang-Infos
  const p = rankProgress(user.xp || 0);
  const rankInfo = {
    xp: user.xp || 0,
    rank: p.rank,
    rankName: rankName(p.rank),
    rankEmoji: rankEmoji(p.rank),
    rankColor: rankColor(p.rank),
    progress: p.progress,
    neededXp: p.neededXp,
    totalToNext: p.totalToNext,
  };
  return NextResponse.json({ user: { ...user, complimentsTotal, complimentsUnread, rankInfo } });
}
