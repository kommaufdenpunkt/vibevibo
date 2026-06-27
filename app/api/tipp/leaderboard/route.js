// GET /api/tipp/leaderboard → { leaderboard }
import { NextResponse } from "next/server";
import * as vvdb from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const leaderboard = (typeof vvdb.tippLeaderboard === "function") ? vvdb.tippLeaderboard(50) : [];
  return NextResponse.json({ ok: true, leaderboard });
}
