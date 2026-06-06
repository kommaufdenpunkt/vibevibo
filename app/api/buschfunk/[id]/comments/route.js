// 💬 Kommentare unter einem Buschfunk-Post.
// GET    /api/buschfunk/[id]/comments               — Liste
// POST   /api/buschfunk/[id]/comments  { text, replyToId? }  — neuer Kommentar (Fidolin-geprüft)

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  addBuschfunkComment, listBuschfunkComments,
  deleteBuschfunkComment, notifyMentions, bumpXP,
} from "@/lib/db";
import { checkTextPost, isMuted } from "@/lib/moderate";

export async function GET(_req, { params }) {
  const { id } = await params;
  const postId = Number(id);
  if (!postId) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  const me = await getSessionUser();
  const comments = listBuschfunkComments(postId, { byUserId: me?.id });
  return NextResponse.json({ comments });
}

export async function POST(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  if (isMuted(me.id)) return NextResponse.json({ error: "Du hast aktuell einen Kommunikationsbann." }, { status: 403 });
  const { id } = await params;
  const postId = Number(id);
  if (!postId) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const text = String(body?.text || "").trim();
  const replyToId = Number(body?.replyToId || 0);
  if (!text) return NextResponse.json({ error: "Kommentar leer." }, { status: 400 });
  if (text.length > 500) return NextResponse.json({ error: "Kommentar zu lang (max 500 Zeichen)." }, { status: 400 });

  // Fidolin-Check
  const verdict = await checkTextPost(me.id, "buschfunk_comment", text);
  if (!verdict.ok) {
    return NextResponse.json({ error: `Fidolin hat das blockiert: ${verdict.reason}` }, { status: 422 });
  }

  try {
    const newId = addBuschfunkComment(postId, me.id, text, replyToId);
    notifyMentions(me.id, text, "buschfunk_comment", newId);
    try { bumpXP(me.id, "group_post"); } catch {}
    const comments = listBuschfunkComments(postId, { byUserId: me.id });
    return NextResponse.json({ ok: true, id: newId, comments });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id } = await params;
  const postId = Number(id);
  if (!postId) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  const url = new URL(req.url);
  const commentId = Number(url.searchParams.get("cid"));
  if (!commentId) return NextResponse.json({ error: "cid fehlt" }, { status: 400 });
  try {
    deleteBuschfunkComment(commentId, me.id, "user");
    const comments = listBuschfunkComments(postId, { byUserId: me.id });
    return NextResponse.json({ ok: true, comments });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
