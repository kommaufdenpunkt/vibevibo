import { NextResponse } from "next/server";
import { getGroup, joinGroup, leaveGroup } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function POST(_req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { slug } = await params;
  const g = getGroup(slug);
  if (!g) return NextResponse.json({ error: "not found" }, { status: 404 });
  joinGroup(g.id, me.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { slug } = await params;
  const g = getGroup(slug);
  if (!g) return NextResponse.json({ error: "not found" }, { status: 404 });
  leaveGroup(g.id, me.id);
  return NextResponse.json({ ok: true });
}
