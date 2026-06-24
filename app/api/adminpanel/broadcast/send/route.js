// POST /api/admin/broadcast/send
// Sendet einen Broadcast an alle/Mods/Admins. Nur für Admins+.
//
// Body: { subject, body, category, target, requiresAck, skipAiCheck }
//
// Workflow:
//   1) Admin-Auth check
//   2) AI-Review (lokal, später Perspective API)
//   3) Wenn AI flags + skipAiCheck=false → 422 mit Hinweis
//   4) Sonst: sendBroadcast → System-DMs an alle Recipients

import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/adminAuth";
import { sendBroadcast, reviewBroadcastText } from "@/lib/broadcast";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req) {
  const me = await getAdminUser();
  if (!me) {
    return NextResponse.json({ error: "Admin-Login nötig." }, { status: 401 });
  }

  let body = {};
  try { body = await req.json(); } catch {}

  const subject = String(body?.subject || "").trim();
  const text = String(body?.body || "").trim();
  const category = String(body?.category || "info");
  const target = String(body?.target || "all");
  const requiresAck = !!body?.requiresAck;
  const skipAiCheck = !!body?.skipAiCheck;

  if (!subject) return NextResponse.json({ error: "Betreff fehlt." }, { status: 400 });
  if (!text) return NextResponse.json({ error: "Text fehlt." }, { status: 400 });
  if (subject.length > 200) return NextResponse.json({ error: "Betreff max 200 Zeichen." }, { status: 400 });
  if (text.length > 5000) return NextResponse.json({ error: "Text max 5000 Zeichen." }, { status: 400 });

  // AI-Review
  const aiReview = reviewBroadcastText({ subject, body: text });
  if (aiReview.status === "warning" && !skipAiCheck) {
    return NextResponse.json({
      error: "AI-Review hat Bedenken.",
      aiReview,
      hint: "Wenn du sicher bist, sende nochmal mit skipAiCheck=true",
    }, { status: 422 });
  }

  // Senden
  try {
    const result = sendBroadcast({
      subject,
      body: text,
      category,
      target,
      requiresAck,
      sentByAdminId: me.id,
      aiReview,
    });
    return NextResponse.json({
      ok: true,
      broadcastId: result.broadcastId,
      recipientCount: result.recipientCount,
      intendedCount: result.intendedCount,
      errors: result.errors,
      aiReview,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
