import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { tipspielPlaceTip } from "@/lib/db";

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  let body; try { body = await req.json(); } catch (e) { body = {}; }
  const tips = Array.isArray(body && body.tips) ? body.tips : [];
  if (!tips.length) return NextResponse.json({ error: "Keine Tipps" }, { status: 400 });
  const errors = [];
  for (const t of tips) {
    const r = tipspielPlaceTip(me.id, Number(t.matchId), Number(t.tip1), Number(t.tip2));
    if (!r.ok) errors.push({ matchId: t.matchId, error: r.error });
  }
  return NextResponse.json({ ok: errors.length === 0, errors });
}
