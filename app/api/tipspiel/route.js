import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  tipspielUpsertMatches, tipspielSettleAndPayout, tipspielCurrentMatchday,
  tipspielListMatchday, tipspielHasEntry, tipspielPot,
  tipspielLeaderboardSeason, tipspielLeaderboardMatchday, TIPSPIEL_ENTRY_COST,
} from "@/lib/db";
import { fetchCurrentMatchday } from "@/lib/openliga";

export async function GET() {
  const me = await getSessionUser();
  try { const f = await fetchCurrentMatchday(); if (f.length) tipspielUpsertMatches(f); } catch (e) {}
  try { tipspielSettleAndPayout(); } catch (e) {}
  const cur = tipspielCurrentMatchday();
  if (!cur) return NextResponse.json({ ok: true, season: null, matchday: null, matches: [], myEntry: false, pot: { pot: 0, paidOutAt: null }, leaderboardSeason: [], leaderboardMd: [], entryCost: TIPSPIEL_ENTRY_COST });
  return NextResponse.json({
    ok: true, season: cur.season, matchday: cur.matchday,
    matches: tipspielListMatchday(cur.season, cur.matchday, me && me.id),
    myEntry: me ? tipspielHasEntry(me.id, cur.season, cur.matchday) : false,
    pot: tipspielPot(cur.season, cur.matchday),
    leaderboardSeason: tipspielLeaderboardSeason(cur.season, 10),
    leaderboardMd: tipspielLeaderboardMatchday(cur.season, cur.matchday, 10),
    entryCost: TIPSPIEL_ENTRY_COST,
  });
}
