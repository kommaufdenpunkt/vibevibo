import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { addLiveStrike, clearLiveBlock, getUserByUsername } from "@/lib/db";

// POST { username, reason } — manueller Strike vom Admin
export async function POST(req) {
  if (!(await isAdmin())) return NextResponse.json({ error: "admin only" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const username = String(body?.username || "");
  const reason = String(body?.reason || "Admin-Entscheidung").slice(0, 200);
  const u = getUserByUsername(username);
  if (!u) return NextResponse.json({ error: "User nicht gefunden." }, { status: 404 });
  const r = addLiveStrike(u.id, { reason, kind: "manual", byUserId: 0 });
  return NextResponse.json({ ok: true, ...r });
}

// DELETE { username } — Live-Sperre aufheben
export async function DELETE(req) {
  if (!(await isAdmin())) return NextResponse.json({ error: "admin only" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const username = String(body?.username || "");
  const u = getUserByUsername(username);
  if (!u) return NextResponse.json({ error: "User nicht gefunden." }, { status: 404 });
  clearLiveBlock(u.id);
  return NextResponse.json({ ok: true });
}
