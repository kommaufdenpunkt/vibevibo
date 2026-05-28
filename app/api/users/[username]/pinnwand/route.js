import { NextResponse } from "next/server";
import { getUserByUsername, addPinnwand, getPinnwand } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { checkTextPost, isMuted } from "@/lib/moderate";

export async function POST(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  if (isMuted(me.id)) return NextResponse.json({ error: "Du hast aktuell einen Kommunikationsbann und kannst nichts posten." }, { status: 403 });
  const { username } = await params;
  const target = getUserByUsername(username);
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { text } = await req.json();
  const cleaned = String(text || "").trim().slice(0, 1000);
  if (!cleaned) return NextResponse.json({ error: "empty" }, { status: 400 });
  const verdict = await checkTextPost(me.id, "pinnwand", cleaned);
  if (!verdict.ok) return NextResponse.json({ error: `Fidolin hat das blockiert: ${verdict.reason}` }, { status: 422 });
  addPinnwand(target.id, me.id, cleaned);
  return NextResponse.json({ pinnwand: getPinnwand(target.id, { byUserId: me.id }) });
}
