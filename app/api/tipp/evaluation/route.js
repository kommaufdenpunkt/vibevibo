// GET /api/tipp/evaluation → { matches, realBets, importedTips }
// Öffentliche Auswertung: pro Spiel alle Tipps (importierte 4ever1-Tipper + echte vibevibo-User) + Punkte.
import { NextResponse } from "next/server";
import * as vvdb from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const matches = (typeof vvdb.tippMatchesRichKO === "function")
    ? vvdb.tippMatchesRichKO()
    : (typeof vvdb.tippMatchesRich === "function" ? vvdb.tippMatchesRich() : []);
  const realBets = (typeof vvdb.tippAllRealBets === "function") ? vvdb.tippAllRealBets() : [];
  const importedTips = (typeof vvdb.tippAllImportTips === "function") ? vvdb.tippAllImportTips() : [];
  return NextResponse.json({ ok: true, matches, realBets, importedTips });
}
