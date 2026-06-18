import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import * as DB from "@/lib/db";
import { checkTextPost, isMuted } from "@/lib/moderate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET — Liste aller Quizze dieser Com
export async function GET(_req, { params }) {
  const { slug } = await params;
  const g = DB.getGroup(slug);
  if (!g) return NextResponse.json({ error: "Com nicht gefunden" }, { status: 404 });
  const me = await getSessionUser();
  const quizzes = typeof DB.listComQuizzes === "function"
    ? DB.listComQuizzes(g.id, { limit: 30, byUserId: me?.id || null })
    : [];
  return NextResponse.json({ quizzes });
}

// POST { title, questions: [{q, options, correctIdx}] } — Quiz erstellen
export async function POST(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  if (isMuted(me.id)) return NextResponse.json({ error: "Du hast einen Kommunikationsbann." }, { status: 403 });
  const { slug } = await params;
  const g = DB.getGroup(slug);
  if (!g) return NextResponse.json({ error: "Com nicht gefunden" }, { status: 404 });
  if (!DB.isMember(g.id, me.id)) {
    return NextResponse.json({ error: "Nur Mitglieder können Quizze erstellen." }, { status: 403 });
  }
  if (typeof DB.isComFeatureUnlocked === "function" && !DB.isComFeatureUnlocked(g.id, "quiz_night")) {
    return NextResponse.json({
      error: "Quiz-Night ist in dieser Com noch nicht freigeschaltet. Der Owner kann das im Funktionen-Tab tun.",
    }, { status: 403 });
  }

  let body = {};
  try { body = await req.json(); } catch {}
  const title = String(body.title || "").trim();
  const questions = Array.isArray(body.questions) ? body.questions : [];

  // 🤖 Fidolin prüft kompletten Quiz-Text (Titel + Fragen + Optionen)
  const allText = [title, ...questions.flatMap((q) => [q.q, ...(q.options || [])])]
    .filter(Boolean).join("\n");
  const verdict = await checkTextPost(me.id, "com_quiz", allText);
  if (!verdict.ok) {
    return NextResponse.json({ error: `Fidolin hat das blockiert: ${verdict.reason}` }, { status: 422 });
  }

  try {
    const id = DB.createComQuiz({ groupId: g.id, authorId: me.id, title, questions });
    const quiz = DB.getComQuiz(id, { byUserId: me.id });
    return NextResponse.json({ ok: true, quiz });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
