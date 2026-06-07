import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { tipspielBuyEntry, tipspielCurrentMatchday, TIPSPIEL_ENTRY_COST } from "@/lib/db";

export async function POST() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const cur = tipspielCurrentMatchday();
  if (!cur) return NextResponse.json({ error: "Kein aktiver Spieltag" }, { status: 400 });
  const r = tipspielBuyEntry(me.id, cur.season, cur.matchday);
  if (!r.ok) return NextResponse.json({ error: "Zu wenig Vibes (es fehlen " + r.missing + " Vibes)", balance: r.balance }, { status: 402 });
  return NextResponse.json({ ok: true, alreadyPaid: !!r.alreadyPaid, cost: TIPSPIEL_ENTRY_COST });
}
