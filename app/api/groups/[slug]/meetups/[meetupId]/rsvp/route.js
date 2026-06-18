import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import * as DB from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST { status: "yes"|"no"|"maybe"|"none" } — RSVP setzen oder entfernen
export async function POST(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { slug, meetupId } = await params;
  const g = DB.getGroup(slug);
  if (!g) return NextResponse.json({ error: "Com nicht gefunden" }, { status: 404 });
  if (!DB.isMember(g.id, me.id)) {
    return NextResponse.json({ error: "Nur Mitglieder können zusagen." }, { status: 403 });
  }
  const host = DB.getComMeetupHost(Number(meetupId));
  if (!host || host.groupId !== g.id) {
    return NextResponse.json({ error: "Meetup nicht gefunden" }, { status: 404 });
  }

  let body = {};
  try { body = await req.json(); } catch {}
  const status = String(body.status || "");
  try {
    DB.setMeetupRsvp(Number(meetupId), me.id, status);
    const meetup = DB.getComMeetup(Number(meetupId), { byUserId: me.id });
    return NextResponse.json({ ok: true, meetup });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
