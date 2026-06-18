import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import * as DB from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST { action: "close" } — Poll schließen (Author oder Owner)
export async function POST(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { slug, pollId } = await params;
  const g = DB.getGroup(slug);
  if (!g) return NextResponse.json({ error: "Com nicht gefunden" }, { status: 404 });

  const author = DB.getComPollAuthor(Number(pollId));
  if (!author || author.groupId !== g.id) {
    return NextResponse.json({ error: "Umfrage nicht gefunden" }, { status: 404 });
  }
  const isOwner = g.owner_id === me.id;
  const isAuthor = author.authorId === me.id;
  if (!isOwner && !isAuthor) {
    return NextResponse.json({ error: "Nur Author oder Owner können die Umfrage schließen." }, { status: 403 });
  }

  let body = {};
  try { body = await req.json(); } catch {}
  if (body.action === "close") {
    DB.closeComPoll(Number(pollId));
    const poll = DB.getComPoll(Number(pollId), { byUserId: me.id });
    return NextResponse.json({ ok: true, poll });
  }
  return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
}

// DELETE — Poll komplett löschen (Author oder Owner)
export async function DELETE(_req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { slug, pollId } = await params;
  const g = DB.getGroup(slug);
  if (!g) return NextResponse.json({ error: "Com nicht gefunden" }, { status: 404 });

  const author = DB.getComPollAuthor(Number(pollId));
  if (!author || author.groupId !== g.id) {
    return NextResponse.json({ error: "Umfrage nicht gefunden" }, { status: 404 });
  }
  const isOwner = g.owner_id === me.id;
  const isAuthor = author.authorId === me.id;
  if (!isOwner && !isAuthor) {
    return NextResponse.json({ error: "Nur Author oder Owner können die Umfrage löschen." }, { status: 403 });
  }

  DB.deleteComPoll(Number(pollId));
  return NextResponse.json({ ok: true });
}
