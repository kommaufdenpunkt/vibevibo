import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import * as DB from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req, { params }) {
  const { slug, meetupId } = await params;
  const g = DB.getGroup(slug);
  if (!g) return NextResponse.json({ error: "Com nicht gefunden" }, { status: 404 });
  const me = await getSessionUser();
  const meetup = DB.getComMeetup(Number(meetupId), { byUserId: me?.id || null });
  if (!meetup || meetup.groupId !== g.id) {
    return NextResponse.json({ error: "Meetup nicht gefunden" }, { status: 404 });
  }
  const url = new URL(req.url);
  const status = url.searchParams.get("attendees");
  let attendees = null;
  if (status && ["yes", "no", "maybe"].includes(status)) {
    attendees = DB.listMeetupAttendees(Number(meetupId), { status, limit: 100 });
  }
  return NextResponse.json({ meetup, attendees });
}

// POST { action: "cancel" } — Host oder Com-Owner kann absagen
export async function POST(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { slug, meetupId } = await params;
  const g = DB.getGroup(slug);
  if (!g) return NextResponse.json({ error: "Com nicht gefunden" }, { status: 404 });
  const host = DB.getComMeetupHost(Number(meetupId));
  if (!host || host.groupId !== g.id) {
    return NextResponse.json({ error: "Meetup nicht gefunden" }, { status: 404 });
  }
  if (host.hostId !== me.id && g.owner_id !== me.id) {
    return NextResponse.json({ error: "Nur Host oder Owner können das Meetup absagen." }, { status: 403 });
  }
  let body = {};
  try { body = await req.json(); } catch {}
  if (body.action === "cancel") {
    DB.cancelComMeetup(Number(meetupId));
    const meetup = DB.getComMeetup(Number(meetupId), { byUserId: me.id });
    return NextResponse.json({ ok: true, meetup });
  }
  return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
}

export async function DELETE(_req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { slug, meetupId } = await params;
  const g = DB.getGroup(slug);
  if (!g) return NextResponse.json({ error: "Com nicht gefunden" }, { status: 404 });
  const host = DB.getComMeetupHost(Number(meetupId));
  if (!host || host.groupId !== g.id) {
    return NextResponse.json({ error: "Meetup nicht gefunden" }, { status: 404 });
  }
  if (host.hostId !== me.id && g.owner_id !== me.id) {
    return NextResponse.json({ error: "Nur Host oder Owner können das Meetup löschen." }, { status: 403 });
  }
  DB.deleteComMeetup(Number(meetupId));
  return NextResponse.json({ ok: true });
}
