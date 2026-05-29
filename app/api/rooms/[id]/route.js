import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  getChatRoom, isRoomMember, isRoomOwner, removeRoomMember, deleteChatRoom, markRoomRead,
} from "@/lib/db";

export async function GET(_req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id } = await params;
  const roomId = Number(id);
  const room = getChatRoom(roomId);
  if (!room) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!isRoomMember(roomId, me.id)) return NextResponse.json({ error: "kein mitglied" }, { status: 403 });
  markRoomRead(roomId, me.id);
  return NextResponse.json({ room });
}

// DELETE: Owner löscht den Raum. Member verlässt nur sich selbst.
export async function DELETE(_req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id } = await params;
  const roomId = Number(id);
  if (!getChatRoom(roomId)) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (isRoomOwner(roomId, me.id)) {
    deleteChatRoom(roomId);
    return NextResponse.json({ ok: true, deleted: true });
  }
  if (!isRoomMember(roomId, me.id)) return NextResponse.json({ error: "kein mitglied" }, { status: 403 });
  removeRoomMember(roomId, me.id);
  return NextResponse.json({ ok: true, left: true });
}
