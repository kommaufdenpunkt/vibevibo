import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import * as DB from "@/lib/db";
import { checkTextPost, isMuted } from "@/lib/moderate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET — Liste aller Polls dieser Com (mit eigenen Stimmen, falls eingeloggt)
export async function GET(_req, { params }) {
  const { slug } = await params;
  const g = DB.getGroup(slug);
  if (!g) return NextResponse.json({ error: "Com nicht gefunden" }, { status: 404 });
  const me = await getSessionUser();
  const polls = typeof DB.listComPolls === "function"
    ? DB.listComPolls(g.id, { limit: 30, byUserId: me?.id || null })
    : [];
  return NextResponse.json({ polls });
}

// POST { question, options[], multi, durationHours } — Poll erstellen.
// Voraussetzung: Member + Feature "live_polls" muss freigeschaltet sein.
export async function POST(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  if (isMuted(me.id)) return NextResponse.json({ error: "Du hast aktuell einen Kommunikationsbann." }, { status: 403 });
  const { slug } = await params;
  const g = DB.getGroup(slug);
  if (!g) return NextResponse.json({ error: "Com nicht gefunden" }, { status: 404 });

  // Nur Members dürfen Polls erstellen
  if (!DB.isMember(g.id, me.id)) {
    return NextResponse.json({ error: "Nur Mitglieder können Umfragen erstellen." }, { status: 403 });
  }

  // Feature muss freigeschaltet sein
  if (typeof DB.isComFeatureUnlocked === "function" && !DB.isComFeatureUnlocked(g.id, "live_polls")) {
    return NextResponse.json({
      error: "Live-Polls sind in dieser Com noch nicht freigeschaltet. Der Owner kann das im Funktionen-Tab tun.",
    }, { status: 403 });
  }

  let body = {};
  try { body = await req.json(); } catch {}
  const question = String(body.question || "").trim();
  const options = Array.isArray(body.options) ? body.options : [];
  const multi = !!body.multi;
  const durationHours = Number(body.durationHours);
  const endsAt = Number.isFinite(durationHours) && durationHours > 0
    ? Date.now() + durationHours * 3600 * 1000
    : null;

  // 🤖 Fidolin prüft Frage + alle Optionen
  const verdict = await checkTextPost(me.id, "com_poll", `${question}\n\n${options.join("\n")}`);
  if (!verdict.ok) {
    return NextResponse.json({ error: `Fidolin hat das blockiert: ${verdict.reason}` }, { status: 422 });
  }

  try {
    const pollId = DB.createComPoll({
      groupId: g.id, authorId: me.id, question, options, multi, endsAt,
    });
    const poll = DB.getComPoll(pollId, { byUserId: me.id });
    return NextResponse.json({ ok: true, poll });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
