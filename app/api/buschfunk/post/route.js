// 📌 Typisierter Buschfunk-Post — Zitat/Gefühl/Erinnerung/etc.
//
// POST { postType, text } → { ok, postId, postType }
//
// Sicherheits-Pipeline (gleicher Stack wie /api/status):
//   Auth → Mute-Check → Burst-Limiter → Fidolin-Moderation → Insert

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  addTypedStatusUpdate, notifyMentions, logUserAction, checkBurstSpam,
  POST_TYPE_ALLOWED,
} from "@/lib/db";
import { checkTextPost, isMuted } from "@/lib/moderate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_LEN = 2;
const MAX_LEN = 280;

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  if (isMuted(me.id)) return NextResponse.json({ error: "Du hast aktuell einen Kommunikationsbann." }, { status: 403 });

  // Burst-Limiter (gleiche Quote wie reguläre Posts)
  const burst = checkBurstSpam(me.id, "post");
  if (burst.burst) {
    return NextResponse.json({
      error: `⚡ Zu schnell! Du hast in ${Math.round(burst.windowMs / 1000)}s schon ${burst.count} Posts geschrieben. Kurz Luft holen.`,
    }, { status: 429 });
  }

  let body = {};
  try { body = await req.json(); } catch {}
  const postType = String(body?.postType || "free").toLowerCase();
  const text = String(body?.text || "").trim().slice(0, MAX_LEN);

  if (!POST_TYPE_ALLOWED.includes(postType)) {
    return NextResponse.json({ error: "Ungültiger Post-Typ." }, { status: 400 });
  }
  if (text.length < MIN_LEN) {
    return NextResponse.json({ error: `Mindestens ${MIN_LEN} Zeichen.` }, { status: 400 });
  }

  // Fidolin-Moderation
  const verdict = await checkTextPost(me.id, "buschfunk", text);
  if (!verdict.ok) {
    return NextResponse.json({ error: `Fidolin hat das blockiert: ${verdict.reason}` }, { status: 422 });
  }

  // Logging (für Burst-Tracking)
  logUserAction(me.id, "post");

  // Einfügen
  const result = addTypedStatusUpdate(me.id, postType, text);
  if (!result?.id) {
    return NextResponse.json({ error: "Konnte nicht gespeichert werden." }, { status: 500 });
  }

  // @-Erwähnungen benachrichtigen
  try { notifyMentions(me.id, text, "status", result.id); } catch {}

  return NextResponse.json({
    ok: true,
    postId: result.id,
    postType: result.postType,
  });
}
