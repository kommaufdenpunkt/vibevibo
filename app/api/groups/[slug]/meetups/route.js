import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import * as DB from "@/lib/db";
import { checkTextPost, isMuted } from "@/lib/moderate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req, { params }) {
  const { slug } = await params;
  const g = DB.getGroup(slug);
  if (!g) return NextResponse.json({ error: "Com nicht gefunden" }, { status: 404 });
  const me = await getSessionUser();
  const meetups = typeof DB.listComMeetups === "function"
    ? DB.listComMeetups(g.id, { limit: 30, byUserId: me?.id || null })
    : [];
  return NextResponse.json({ meetups });
}

// POST { title, description, location, startsAt, endsAt?, maxAttendees? }
export async function POST(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  if (isMuted(me.id)) return NextResponse.json({ error: "Du hast einen Kommunikationsbann." }, { status: 403 });
  const { slug } = await params;
  const g = DB.getGroup(slug);
  if (!g) return NextResponse.json({ error: "Com nicht gefunden" }, { status: 404 });
  if (!DB.isMember(g.id, me.id)) {
    return NextResponse.json({ error: "Nur Mitglieder können Meetups erstellen." }, { status: 403 });
  }
  if (typeof DB.isComFeatureUnlocked === "function" && !DB.isComFeatureUnlocked(g.id, "meetups")) {
    return NextResponse.json({
      error: "Meetup-Planer ist noch nicht freigeschaltet. Der Owner kann das im Funktionen-Tab tun.",
    }, { status: 403 });
  }

  let body = {};
  try { body = await req.json(); } catch {}
  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const location = String(body.location || "").trim();

  // 🤖 Fidolin prüft Titel + Beschreibung + Ort
  const allText = [title, description, location].filter(Boolean).join("\n");
  const verdict = await checkTextPost(me.id, "com_meetup", allText);
  if (!verdict.ok) {
    return NextResponse.json({ error: `Fidolin hat das blockiert: ${verdict.reason}` }, { status: 422 });
  }

  try {
    const id = DB.createComMeetup({
      groupId: g.id, hostId: me.id,
      title, description, location,
      startsAt: body.startsAt, endsAt: body.endsAt,
      maxAttendees: body.maxAttendees,
    });
    const meetup = DB.getComMeetup(id, { byUserId: me.id });
    return NextResponse.json({ ok: true, meetup });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
