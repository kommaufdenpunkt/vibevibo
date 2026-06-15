import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import * as DB from "@/lib/db";

export const dynamic = "force-dynamic";

// GET — Thread-Liste der Com + Reactions
export async function GET(_req, { params }) {
  const { slug } = await params;
  const g = typeof DB.getComsBySlug === "function" ? DB.getComsBySlug(slug) : null;
  if (!g) return NextResponse.json({ error: "Com nicht gefunden" }, { status: 404 });
  const threads = DB.getComThreads(g.id, { limit: 50 });
  const reactions = threads.length > 0
    ? DB.getComReactions("thread", threads.map((t) => t.id))
    : {};
  return NextResponse.json({ threads, reactions });
}

// POST — neuen Thread erstellen (Members only, Rate-Limit: max 3/h)
export async function POST(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { slug } = await params;
  const g = typeof DB.getComsBySlug === "function" ? DB.getComsBySlug(slug) : null;
  if (!g) return NextResponse.json({ error: "Com nicht gefunden" }, { status: 404 });

  const myRole = DB.getComsRole(g.id, me.id);
  if (!myRole) return NextResponse.json({ error: "Du bist kein Mitglied dieser Com." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  try {
    const threadId = DB.createComThread({
      groupId: g.id,
      authorId: me.id,
      title: body.title,
      body: body.body,
    });
    return NextResponse.json({ ok: true, threadId });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
