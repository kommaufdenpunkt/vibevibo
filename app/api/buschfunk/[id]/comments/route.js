// 💬 Kommentare auf JEDES Buschfunk-Event-Typ (status/pinnwand/gift/grouppost/newpic).
// GET    ?type=...                              — Liste
// POST   { text, replyToId?, audioUrl?, type }  — neuer Kommentar (Fidolin-geprüft)
// DELETE ?cid=...                               — eigenen Kommentar löschen

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  addBuschfunkComment, listBuschfunkComments,
  deleteBuschfunkComment, notifyMentions, bumpXP,
  getBuschfunkPostOwner, logUserAction, checkBurstSpam,
} from "@/lib/db";
import { checkTextPost, checkVoicePost, isMuted } from "@/lib/moderate";

const ALLOWED_TYPES = new Set(["status", "pinnwand", "gift", "grouppost", "newpic"]);

function pickType(req, body) {
  let t = body?.type;
  if (!t) {
    const url = new URL(req.url);
    t = url.searchParams.get("type") || "status";
  }
  return ALLOWED_TYPES.has(t) ? t : "status";
}

export async function GET(req, { params }) {
  const { id } = await params;
  const postId = Number(id);
  if (!postId) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  const type = pickType(req, null);
  const me = await getSessionUser();
  const comments = listBuschfunkComments(type, postId, { byUserId: me?.id });
  return NextResponse.json({ comments, type });
}

export async function POST(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  if (isMuted(me.id)) return NextResponse.json({ error: "Du hast aktuell einen Kommunikationsbann." }, { status: 403 });

  // 🔨 Defense-B: Burst-Spam-Limiter
  const burst = checkBurstSpam(me.id, "comment");
  if (burst.burst) {
    return NextResponse.json({
      error: `⚡ Zu schnell! Du hast in ${Math.round(burst.windowMs / 1000)}s schon ${burst.count} Kommentare geschrieben. Kurz Luft holen.`,
    }, { status: 429 });
  }
  logUserAction(me.id, "comment");

  const { id } = await params;
  const postId = Number(id);
  if (!postId) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const type = pickType(req, body);
  const text = String(body?.text || "").trim();
  const audioUrl = String(body?.audioUrl || "").trim();
  const replyToId = Number(body?.replyToId || 0);

  if (!text && !audioUrl) return NextResponse.json({ error: "Kommentar leer." }, { status: 400 });
  if (text.length > 500) return NextResponse.json({ error: "Kommentar zu lang (max 500 Zeichen)." }, { status: 400 });

  // 🛡 Wer ist Autor des Original-Posts? Bestimmt ob Frauen-Schutz greift.
  let recipientGender = "";
  try {
    const owner = typeof getBuschfunkPostOwner === "function"
      ? getBuschfunkPostOwner(type, postId) : null;
    if (owner && owner.userId !== me.id) recipientGender = owner.gender || "";
  } catch {}
  const senderGender = me.gender || "";

  // Text-Moderation
  if (text) {
    const verdict = await checkTextPost(me.id, "buschfunk_comment", text, { senderGender, recipientGender });
    if (!verdict.ok) {
      return NextResponse.json({ error: `Fidolin hat das blockiert: ${verdict.reason}` }, { status: 422 });
    }
  }

  // 🤖 Voice-Moderation: Audio wird transkribiert + auf Beleidigungen geprüft
  if (audioUrl) {
    if (!audioUrl.startsWith("data:audio/")) {
      return NextResponse.json({ error: "Ungültiges Audio-Format." }, { status: 400 });
    }
    if (audioUrl.length > 1_200_000) {
      return NextResponse.json({ error: "Sprachnachricht zu lang (max ~60 Sek)." }, { status: 413 });
    }
    const vv = await checkVoicePost(me.id, "buschfunk_voice", audioUrl, { senderGender, recipientGender });
    if (!vv.ok) {
      return NextResponse.json({
        error: `Fidolin hat die Sprachnachricht abgelehnt: ${vv.reason}`,
      }, { status: 422 });
    }
  }

  try {
    const newId = addBuschfunkComment(type, postId, me.id, text, replyToId, audioUrl);
    if (text) notifyMentions(me.id, text, "buschfunk_comment", newId);
    try { bumpXP(me.id, "group_post"); } catch {}
    const comments = listBuschfunkComments(type, postId, { byUserId: me.id });
    return NextResponse.json({ ok: true, id: newId, comments, type });
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
  const type = url.searchParams.get("type") || "status";
  if (!commentId) return NextResponse.json({ error: "cid fehlt" }, { status: 400 });
  try {
    deleteBuschfunkComment(commentId, me.id, "user");
    const comments = listBuschfunkComments(type, postId, { byUserId: me.id });
    return NextResponse.json({ ok: true, comments });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
