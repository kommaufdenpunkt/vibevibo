// POST /api/tipp/bet → Tipp abgeben/ändern. Body: { matchId, predHome, predAway }
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
  if (!matchId || !Number.isInteger(h) || !Number.isInteger(a) || h < 0 || a < 0 || h > 99 || a > 99) {
    return NextResponse.json({ error: "Ungültiger Tipp." }, { status: 400 });
  }
  if (typeof vvdb.tippPlaceBet !== "function") {
    return NextResponse.json({ error: "Tipp-Funktion nicht verfügbar." }, { status: 500 });
  }
  const r = vvdb.tippPlaceBet(me.id, matchId, h, a);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
