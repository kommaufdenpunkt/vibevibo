// Reports.
// Akzeptiert entweder { messageId, reason } (legacy) ODER { targetType, targetId, reason } (generic).
// targetType: "message" | "buschfunk_comment" | "pinnwand" | "guestbook"
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { addMessageReport, addGenericReport } from "@/lib/db";

const ALLOWED_TARGETS = new Set(["message", "buschfunk_comment", "pinnwand", "guestbook", "photo"]);

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const body = await req.json();
  const reason = String(body?.reason || "").slice(0, 300);

  // Legacy-Variante
  if (body?.messageId) {
    const mid = Number(body.messageId);
    if (!mid) return NextResponse.json({ error: "invalid messageId" }, { status: 400 });
    const id = addMessageReport(mid, me.id, reason);
    return NextResponse.json({ ok: true, id });
  }

  // Generic
  const targetType = String(body?.targetType || "");
  const targetId = Number(body?.targetId);
  if (!ALLOWED_TARGETS.has(targetType)) return NextResponse.json({ error: "invalid targetType" }, { status: 400 });
  if (!targetId) return NextResponse.json({ error: "invalid targetId" }, { status: 400 });
  const id = addGenericReport(targetType, targetId, me.id, reason);
  return NextResponse.json({ ok: true, id });
}
