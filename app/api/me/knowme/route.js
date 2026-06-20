import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { saveKnowMeQuiz, getKnowMeQuiz } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth" }, { status: 401 });
  const q = getKnowMeQuiz(me.id, { hideAnswers: false });
  return NextResponse.json({ quiz: q });
}

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth" }, { status: 401 });
  let body = {};
  try { body = await req.json(); } catch {}
  try {
    const count = saveKnowMeQuiz(me.id, body?.questions || []);
    return NextResponse.json({ ok: true, count });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Fehler" }, { status: 400 });
  }
}
