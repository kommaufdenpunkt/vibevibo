// 📅 Heute-vor-X-Jahren-Memories — eigene Inhalte aus heutigem Tag in vergangenen Jahren.
//
// GET   → { memories: [...], todayLabel: "20. Juni" }
// POST  { kind, originalText?, yearsAgo, customText? } → repostet auf eigene Pinnwand

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getUserMemoriesForToday, repostMemoryToWall } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function todayLabel() {
  const d = new Date();
  return d.toLocaleDateString("de-DE", { day: "numeric", month: "long" });
}

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const memories = getUserMemoriesForToday(me.id, { yearsBack: 10, limitPerType: 5 });
  return NextResponse.json({ memories, todayLabel: todayLabel() });
}

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  let body = {};
  try { body = await req.json(); } catch {}
  const kind = String(body?.kind || "");
  const originalText = String(body?.originalText || "");
  const yearsAgo = Number(body?.yearsAgo || 0);
  const customText = String(body?.customText || "");
  try {
    const id = repostMemoryToWall(me.id, { kind, originalText, yearsAgo, customText });
    return NextResponse.json({ ok: true, pinnwandId: id });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
