import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  getChatRoom, isRoomMember, isRoomOwner, addRoomMember, removeRoomMember,
  getUserByUsername,
} from "@/lib/db";

// POST { username }
export async function POST(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id } = await params;
  const roomId = Number(id);
  if (!getChatRoom(roomId)) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!isRoomMember(roomId, me.id)) return NextResponse.json({ error: "kein mitglied" }, { status: 403 });

  const body = await req.json();
  const user = getUserByUsername(String(body?.username || ""));
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });
  try {
    addRoomMember(roomId, user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "fehler" }, { status: 400 });
  }
}

// DELETE ?username=foo  – Owner kickt, oder User entfernt sich selbst
export async function DELETE(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id } = await params;
  const roomId = Number(id);
  if (!getChatRoom(roomId)) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const targetUsername = searchParams.get("username");
  const target = targetUsername ? getUserByUsername(targetUsername) : me;
  if (!target) return NextResponse.json({ error: "user not found" }, { status: 404 });

  if (target.id !== me.id && !isRoomOwner(roomId, me.id)) {
    return NextResponse.json({ error: "nur owner darf kicken" }, { status: 403 });
  }
  removeRoomMember(roomId, target.id);
  return NextResponse.json({ ok: true });
}
