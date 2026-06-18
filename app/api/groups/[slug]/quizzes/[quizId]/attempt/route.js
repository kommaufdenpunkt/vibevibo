import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import * as DB from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST { answers: [idx, idx, ...] } — Quiz-Versuch absenden.
// Antworten werden serverseitig bewertet, Result mit Score + Breakdown zurück.
export async function POST(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { slug, quizId } = await params;
  const g = DB.getGroup(slug);
  if (!g) return NextResponse.json({ error: "Com nicht gefunden" }, { status: 404 });
  if (!DB.isMember(g.id, me.id)) {
    return NextResponse.json({ error: "Nur Mitglieder können teilnehmen." }, { status: 403 });
  }
  const author = DB.getComQuizAuthor(Number(quizId));
  if (!author || author.groupId !== g.id) {
    return NextResponse.json({ error: "Quiz nicht gefunden" }, { status: 404 });
  }

  let body = {};
  try { body = await req.json(); } catch {}
  const answers = Array.isArray(body.answers) ? body.answers : [];

  try {
    const result = DB.submitQuizAttempt(Number(quizId), me.id, answers);
    const quiz = DB.getComQuiz(Number(quizId), { byUserId: me.id });
    const leaderboard = DB.getQuizLeaderboard(Number(quizId), { limit: 20 });
    return NextResponse.json({ ok: true, result, quiz, leaderboard });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
