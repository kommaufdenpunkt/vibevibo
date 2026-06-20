import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getUserByUsername, getKnowMeQuiz, getMyKnowMeAttempt } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  const { username } = await params;
  const target = getUserByUsername(String(username).toLowerCase());
  if (!target) return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });
  const me = await getSessionUser();
  // Owner sieht Antworten, andere nicht
  const isOwner = me && me.id === target.id;
  const quiz = getKnowMeQuiz(target.id, { hideAnswers: !isOwner });
  if (!quiz) return NextResponse.json({ quiz: null, target: { username: target.username, displayName: target.display_name } });
  // Hat aktueller User schon gespielt?
  let myAttempt = null;
  if (me && !isOwner) {
    myAttempt = getMyKnowMeAttempt(target.id, me.id);
  }
  return NextResponse.json({
    quiz, isOwner,
    target: { username: target.username, displayName: target.display_name, emoji: target.emoji },
    myAttempt,
  });
}
