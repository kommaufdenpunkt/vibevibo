// POST /api/tipp/bet → Tipp abgeben/ändern.
// Gruppe:  { matchId, predHome, predAway }
// K.o.:    { matchId, advPick: 'home'|'away', decPick: 'reg'|'aet'|'pen' }   (kein Ergebnis)
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
  if (!matchId) return NextResponse.json({ error: "matchId fehlt." }, { status: 400 });

  // Bevorzugt K.o. v3 (Ergebnis + Weiterkommen + Entscheidung, 20-Min-Schluss); sonst Fallbacks.
  let r;
  if (typeof vvdb.tippPlaceBetKO3 === "function") {
    r = vvdb.tippPlaceBetKO3(me.id, matchId, {
      predHome: b?.predHome, predAway: b?.predAway,
      advPick: b?.advPick, decPick: b?.decPick,
    });
  } else if (typeof vvdb.tippPlaceBetKO2 === "function") {
    r = vvdb.tippPlaceBetKO2(me.id, matchId, {
      predHome: b?.predHome, predAway: b?.predAway,
      advPick: b?.advPick, decPick: b?.decPick,
    });
  } else if (typeof vvdb.tippPlaceBetKO === "function") {
    r = vvdb.tippPlaceBetKO(me.id, matchId, Number(b?.predHome), Number(b?.predAway), b?.advPick);
  } else if (typeof vvdb.tippPlaceBet === "function") {
    r = vvdb.tippPlaceBet(me.id, matchId, Number(b?.predHome), Number(b?.predAway));
  } else {
    return NextResponse.json({ error: "Tipp-Funktion nicht verfügbar." }, { status: 500 });
  }

  if (!r || !r.ok) return NextResponse.json({ error: r?.error || "Fehler." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
