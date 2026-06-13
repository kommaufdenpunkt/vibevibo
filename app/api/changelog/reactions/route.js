import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { toggleChangelogReaction, listChangelogReactions } from "@/lib/db";

// GET /api/changelog/reactions?keys=a,b,c → { reactions: { a: { "👍": {count, mine} } } }
export async function GET(req) {
  const me = await getSessionUser();
  const url = new URL(req.url);
  const raw = url.searchParams.get("keys") || "";
  const keys = raw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 80);
  if (keys.length === 0) return NextResponse.json({ reactions: {} });
  const reactions = listChangelogReactions(keys, me?.id || 0);
  return NextResponse.json({ reactions });
}

// POST /api/changelog/reactions  { entryKey, emoji } → { active: true|false }
export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const entryKey = String(body?.entryKey || "").trim();
  const emoji = String(body?.emoji || "").trim();
  if (!entryKey || !emoji) return NextResponse.json({ error: "entryKey + emoji required" }, { status: 400 });
  const r = toggleChangelogReaction(me.id, entryKey, emoji);
  return NextResponse.json(r || { active: false });
}
