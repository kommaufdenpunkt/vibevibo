import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import * as DB from "@/lib/db";

export const dynamic = "force-dynamic";

// GET — Thread + alle Replies + Reactions
export async function GET(_req, { params }) {
  const { slug, id } = await params;
  const g = typeof DB.getComsBySlug === "function" ? DB.getComsBySlug(slug) : null;
  if (!g) return NextResponse.json({ error: "Com nicht gefunden" }, { status: 404 });
  const thread = DB.getComThread(id);
  if (!thread || thread.groupId !== g.id) {
    return NextResponse.json({ error: "Thread nicht gefunden" }, { status: 404 });
  }
  const replies = DB.getComThreadReplies(thread.id);
  const threadReactions = DB.getComReactions("thread", [thread.id]);
  const replyReactions = replies.length > 0
    ? DB.getComReactions("reply", replies.map((r) => r.id))
    : {};
  return NextResponse.json({
    thread, replies,
    reactions: {
      thread: threadReactions[thread.id] || {},
      replies: replyReactions,
    },
  });
}

// POST — Antwort hinzufügen
export async function POST(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { slug, id } = await params;
  const g = typeof DB.getComsBySlug === "function" ? DB.getComsBySlug(slug) : null;
  if (!g) return NextResponse.json({ error: "Com nicht gefunden" }, { status: 404 });
  const thread = DB.getComThread(id);
  if (!thread || thread.groupId !== g.id) {
    return NextResponse.json({ error: "Thread nicht gefunden" }, { status: 404 });
  }
  const myRole = DB.getComsRole(g.id, me.id);
  if (!myRole) return NextResponse.json({ error: "Nur Mitglieder können antworten." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  try {
    const replyId = DB.addComThreadReply({
      threadId: thread.id,
      authorId: me.id,
      body: body.body,
    });
    return NextResponse.json({ ok: true, replyId });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

// PATCH — Mod-Aktionen: lock, pin, delete (owner+mod)
export async function PATCH(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { slug, id } = await params;
  const g = typeof DB.getComsBySlug === "function" ? DB.getComsBySlug(slug) : null;
  if (!g) return NextResponse.json({ error: "Com nicht gefunden" }, { status: 404 });
  const thread = DB.getComThread(id);
  if (!thread || thread.groupId !== g.id) {
    return NextResponse.json({ error: "Thread nicht gefunden" }, { status: 404 });
  }
  const myRole = DB.getComsRole(g.id, me.id);
  if (myRole !== "owner" && myRole !== "mod") {
    return NextResponse.json({ error: "Nur Owner und Mods können moderieren." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");

  if (action === "lock") {
    DB.setComThreadLocked(thread.id, !!body.locked);
    return NextResponse.json({ ok: true });
  }
  if (action === "pin") {
    DB.setComThreadPinned(thread.id, !!body.pinned);
    return NextResponse.json({ ok: true });
  }
  if (action === "delete") {
    DB.deleteComThread(thread.id);
    return NextResponse.json({ ok: true });
  }
  if (action === "deleteReply") {
    const ok = DB.deleteComThreadReply(Number(body.replyId));
    return NextResponse.json({ ok });
  }
  return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
}
