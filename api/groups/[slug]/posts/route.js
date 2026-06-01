import { NextResponse } from "next/server";
import { getGroup, isMember, addGroupPost, getGroupPosts } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { checkTextPost, isMuted } from "@/lib/moderate";

export async function POST(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  if (isMuted(me.id)) return NextResponse.json({ error: "Du hast aktuell einen Kommunikationsbann und kannst nichts posten." }, { status: 403 });
  const { slug } = await params;
  const g = getGroup(slug);
  if (!g) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!isMember(g.id, me.id)) return NextResponse.json({ error: "not a member" }, { status: 403 });
  const { text } = await req.json();
  const cleaned = String(text || "").trim().slice(0, 2000);
  if (!cleaned) return NextResponse.json({ error: "empty" }, { status: 400 });
  const verdict = await checkTextPost(me.id, "gruppenpost", cleaned);
  if (!verdict.ok) return NextResponse.json({ error: `Fidolin hat das blockiert: ${verdict.reason}` }, { status: 422 });
  addGroupPost(g.id, me.id, cleaned);
  return NextResponse.json({ posts: getGroupPosts(g.id) });
}
