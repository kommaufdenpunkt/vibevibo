import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import * as DB from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST { optionIdx } — Stimme abgeben oder zurückziehen (Toggle).
export async function POST(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { slug, pollId } = await params;
  const g = DB.getGroup(slug);
  if (!g) return NextResponse.json({ error: "Com nicht gefunden" }, { status: 404 });
  if (!DB.isMember(g.id, me.id)) {
    return NextResponse.json({ error: "Nur Mitglieder können abstimmen." }, { status: 403 });
  }

  let body = {};
  try { body = await req.json(); } catch {}
  const optionIdx = Number(body.optionIdx);
  if (!Number.isInteger(optionIdx)) {
    return NextResponse.json({ error: "optionIdx fehlt" }, { status: 400 });
  }

  try {
    DB.voteComPoll(Number(pollId), me.id, optionIdx);
    const poll = DB.getComPoll(Number(pollId), { byUserId: me.id });
    return NextResponse.json({ ok: true, poll });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
