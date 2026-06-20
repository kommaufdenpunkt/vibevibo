import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getUserByUsername, submitKnowMeAttempt, addNotification } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Login nötig" }, { status: 401 });
  const { username } = await params;
  const target = getUserByUsername(String(username).toLowerCase());
  if (!target) return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });
  let body = {};
  try { body = await req.json(); } catch {}
  try {
    const result = submitKnowMeAttempt(target.id, me.id, body?.answers || []);
    // Notify quiz-owner über neuen Spieler
    try {
      addNotification({
        userId: target.id, actorId: me.id,
        type: "knowme_attempt", targetType: "knowme_attempt", targetId: 0,
        preview: `🎯 ${me.displayName} hat dein Quiz gemacht: ${result.score}/${result.max}`,
      });
    } catch {}
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Fehler" }, { status: 400 });
  }
}
