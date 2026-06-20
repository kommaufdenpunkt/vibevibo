import { NextResponse } from "next/server";
import { getUserByUsername, listKnowMeLeaderboard } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  const { username } = await params;
  const target = getUserByUsername(String(username).toLowerCase());
  if (!target) return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });
  return NextResponse.json({ leaderboard: listKnowMeLeaderboard(target.id, 20) });
}
