import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listWishes, createWish, countWishesByStatus } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const me = await getSessionUser();
  const url = new URL(req.url);
  const status   = url.searchParams.get("status") || null;
  const category = url.searchParams.get("category") || null;
  const sort     = url.searchParams.get("sort") || "top";
  const search   = url.searchParams.get("q") || "";
  const wishes = listWishes({
    status, category, sort, search,
    limit: 100,
    currentUserId: me?.id,
  });
  return NextResponse.json({
    wishes,
    counts: countWishesByStatus(),
    me: me ? { id: me.id, username: me.username } : null,
  });
}

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Login nötig" }, { status: 401 });
  let body = {};
  try { body = await req.json(); } catch {}
  try {
    const id = createWish({
      userId: me.id,
      title: String(body?.title || ""),
      body:  String(body?.body || ""),
      category: String(body?.category || "feature"),
    });
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Fehler" }, { status: 400 });
  }
}
