import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import * as DB from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET — Quiz-Detail + Leaderboard
export async function GET(_req, { params }) {
  const { slug, quizId } = await params;
  const g = DB.getGroup(slug);
  if (!g) return NextResponse.json({ error: "Com nicht gefunden" }, { status: 404 });
  const me = await getSessionUser();
  const quiz = DB.getComQuiz(Number(quizId), { byUserId: me?.id || null });
  if (!quiz || quiz.groupId !== g.id) {
    return NextResponse.json({ error: "Quiz nicht gefunden" }, { status: 404 });
  }
  const leaderboard = typeof DB.getQuizLeaderboard === "function"
    ? DB.getQuizLeaderboard(Number(quizId), { limit: 20 }) : [];
  return NextResponse.json({ quiz, leaderboard });
}

// POST { action: "close" } — Author oder Owner kann schließen
export async function POST(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { slug, quizId } = await params;
  const g = DB.getGroup(slug);
  if (!g) return NextResponse.json({ error: "Com nicht gefunden" }, { status: 404 });
  const author = DB.getComQuizAuthor(Number(quizId));
  if (!author || author.groupId !== g.id) {
    return NextResponse.json({ error: "Quiz nicht gefunden" }, { status: 404 });
  }
  if (author.authorId !== me.id && g.owner_id !== me.id) {
    return NextResponse.json({ error: "Nur Author oder Owner können das Quiz schließen." }, { status: 403 });
  }
  let body = {};
  try { body = await req.json(); } catch {}
  if (body.action === "close") {
    DB.closeComQuiz(Number(quizId));
    const quiz = DB.getComQuiz(Number(quizId), { byUserId: me.id });
    return NextResponse.json({ ok: true, quiz });
  }
  return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
}

// DELETE — Author oder Owner kann löschen
export async function DELETE(_req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { slug, quizId } = await params;
  const g = DB.getGroup(slug);
  if (!g) return NextResponse.json({ error: "Com nicht gefunden" }, { status: 404 });
  const author = DB.getComQuizAuthor(Number(quizId));
  if (!author || author.groupId !== g.id) {
    return NextResponse.json({ error: "Quiz nicht gefunden" }, { status: 404 });
  }
  if (author.authorId !== me.id && g.owner_id !== me.id) {
    return NextResponse.json({ error: "Nur Author oder Owner können das Quiz löschen." }, { status: 403 });
  }
  DB.deleteComQuiz(Number(quizId));
  return NextResponse.json({ ok: true });
}
