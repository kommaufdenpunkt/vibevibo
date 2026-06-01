import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listChatMutes, setChatMute, removeChatMute } from "@/lib/db";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  return NextResponse.json({ mutes: listChatMutes(me.id) });
}

// POST { targetType, targetId, durationMs }  durationMs=0 => "immer"
export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  let body;
  try { body = await req.json(); } catch { body = {}; }
  const targetType = String(body?.targetType || "");
  const targetId = body?.targetId == null ? null : Number(body.targetId);
  const duration = Math.max(0, Number(body?.durationMs) || 0);
  const untilAt = duration > 0 ? Date.now() + duration : 0;
  try {
    setChatMute(me.id, targetType, targetId, untilAt);
    return NextResponse.json({ ok: true, untilAt });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "invalid" }, { status: 400 });
  }
}

// DELETE ?targetType=user&targetId=42
export async function DELETE(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const targetType = String(searchParams.get("targetType") || "");
  const targetId = searchParams.get("targetId") ? Number(searchParams.get("targetId")) : null;
  const removed = removeChatMute(me.id, targetType, targetId);
  return NextResponse.json({ ok: true, removed });
}
