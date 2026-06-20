import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { voteWish, getWish } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Login nötig" }, { status: 401 });
  const { id } = await params;
  try {
    const r = voteWish(Number(id), me.id);
    const w = getWish(Number(id), me.id);
    return NextResponse.json({ ok: true, hasVoted: r.hasVoted, upvotes: w?.upvotes ?? 0 });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Fehler" }, { status: 400 });
  }
}
