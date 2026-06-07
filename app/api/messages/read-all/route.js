import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { markAllChatsAndRoomsRead, markNotificationsRead } from "@/lib/db";

export async function POST() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  markNotificationsRead(me.id);
  const r = markAllChatsAndRoomsRead(me.id);
  return NextResponse.json({ ok: true, ...r });
}
