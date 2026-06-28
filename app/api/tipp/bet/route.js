// POST /api/tipp/bet → Tipp abgeben/ändern. Body: { matchId, predHome, predAway, advPick? }
// advPick ('home'|'away') = Pflicht-Tipp bei K.o.-Spielen mit Unentschieden-Ergebnis (wer kommt weiter).
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import * as vvdb from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Bitte einloggen." }, { status: 401 });

  let b = {};
  try { b = await req.json(); } catch {}
  const matchId = Number(b?.matchId);
  const h = Number(b?.predHome);
  const a = Number(b?.predAway);
  const advPick = (b?.advPick === "home" || b?.advPick === "away") ? b.advPick : null;
  if (!matchId || !Number.isInteger(h) || !Number.isInteger(a) || h < 0 || a < 0 || h > 99 || a > 99) {
    return NextResponse.json({ error: "Ungültiger Tipp." }, { status: 400 });
  }

  let r;
  if (typeof vvdb.tippPlaceBetKO === "function") r = vvdb.tippPlaceBetKO(me.id, matchId, h, a, advPick);
  else if (typeof vvdb.tippPlaceBet === "function") r = vvdb.tippPlaceBet(me.id, matchId, h, a);
  else return NextResponse.json({ error: "Tipp-Funktion nicht verfügbar." }, { status: 500 });

  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
