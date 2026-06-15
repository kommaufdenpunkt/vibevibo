import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import * as DB from "@/lib/db";

export const dynamic = "force-dynamic";

const ALLOWED_EMOJI = ["👍", "❤️", "🤔", "🎉", "😂"];

// POST { targetType: "thread"|"reply", targetId, emoji } — toggle reaction
export async function POST(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { slug } = await params;
  const g = typeof DB.getComsBySlug === "function" ? DB.getComsBySlug(slug) : null;
  if (!g) return NextResponse.json({ error: "Com nicht gefunden" }, { status: 404 });
  const myRole = DB.getComsRole(g.id, me.id);
  if (!myRole) return NextResponse.json({ error: "Nur Mitglieder können reagieren." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const targetType = body.targetType;
  const targetId = Number(body.targetId);
  const emoji = String(body.emoji || "");

  if (!ALLOWED_EMOJI.includes(emoji)) {
    return NextResponse.json({ error: "Unzulässiges Emoji." }, { status: 400 });
  }
  if (!["thread", "reply"].includes(targetType)) {
    return NextResponse.json({ error: "Ungültiger Target-Typ." }, { status: 400 });
  }

  // Bei Thread-Reactions: validieren dass der Thread zu dieser Com gehört
  if (targetType === "thread") {
    const t = DB.getComThread(targetId);
    if (!t || t.groupId !== g.id) {
      return NextResponse.json({ error: "Thread gehört nicht zu dieser Com." }, { status: 400 });
    }
  }
  // Bei Reply-Reactions reicht der Membership-Check oben — Replies leben nur
  // innerhalb von Threads die wiederum zu einer Com gehören.

  try {
    const result = DB.toggleComReaction({ targetType, targetId, userId: me.id, emoji });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
