import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  getUserByUsername, addUserBlock, removeUserBlock, hasUserBlocked,
} from "@/lib/db";

// POST /api/users/[username]/block { reason? }
// User blockiert anderen User — hart, bidirektional wirksam.
export async function POST(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { username } = await params;
  const target = getUserByUsername(decodeURIComponent(username));
  if (!target) return NextResponse.json({ error: "Nutzer nicht gefunden" }, { status: 404 });
  if (target.id === me.id) return NextResponse.json({ error: "Dich selbst kannst du nicht blockieren." }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const reason = String(body?.reason || "").slice(0, 200);
  const ok = addUserBlock(me.id, target.id, reason);
  return NextResponse.json({ ok, blocked: hasUserBlocked(me.id, target.id) });
}

// DELETE /api/users/[username]/block — entsperren
export async function DELETE(_req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { username } = await params;
  const target = getUserByUsername(decodeURIComponent(username));
  if (!target) return NextResponse.json({ error: "Nutzer nicht gefunden" }, { status: 404 });
  removeUserBlock(me.id, target.id);
  return NextResponse.json({ ok: true });
}
