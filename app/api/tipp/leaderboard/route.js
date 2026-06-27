// GET /api/tipp/leaderboard → importierte 4ever1-Bestenliste (falls vorhanden), sonst die Live-Bestenliste.
import { NextResponse } from "next/server";
import * as vvdb from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const imported = (typeof vvdb.tippImportedBoard === "function") ? vvdb.tippImportedBoard() : [];
  if (imported.length) {
    const leaderboard = imported.map((u) => ({
      id: u.name,
      username: u.name,
      displayName: u.name,
      avatarUrl: u.avatar || null,
      points: u.points,
      bets: u.scored,
      imported: true,
    }));
    return NextResponse.json({ ok: true, leaderboard, imported: true });
  }
  const leaderboard = (typeof vvdb.tippLeaderboard === "function") ? vvdb.tippLeaderboard(50) : [];
  return NextResponse.json({ ok: true, leaderboard, imported: false });
}
