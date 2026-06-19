import { NextResponse } from "next/server";
import { getMcpUser } from "@/lib/modAuth";
import { getMcpDashboardStats, listMcpReports } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const me = await getMcpUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const stats = getMcpDashboardStats();
  // "Meine offenen" — Anzahl der Reports die ich gerade gezogen habe
  const mine = listMcpReports({ status: "mine", byModId: me.id, limit: 999 });
  stats.reportsMine = mine.length;
  return NextResponse.json({
    user: {
      id: me.id, username: me.username, displayName: me.displayName,
      emoji: me.emoji, role: me.role,
    },
    stats,
  });
}
