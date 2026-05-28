import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { toggleReaction, countReaction } from "@/lib/db";

const ALLOWED_TARGETS = new Set(["pinnwand", "status", "grouppost"]);
const ALLOWED_KINDS = new Set(["like"]);

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { targetType, targetId, kind = "like" } = await req.json();
  if (!ALLOWED_TARGETS.has(targetType) || !ALLOWED_KINDS.has(kind)) {
    return NextResponse.json({ error: "invalid target" }, { status: 400 });
  }
  const tid = Number(targetId);
  if (!tid) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  const iLiked = toggleReaction(targetType, tid, me.id, kind);
  return NextResponse.json({ iLiked, count: countReaction(targetType, tid, kind) });
}
