import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createChatRoom, listMyChatRooms, getUserByUsername } from "@/lib/db";
import { isMuted } from "@/lib/moderate";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  return NextResponse.json({ rooms: listMyChatRooms(me.id) });
}

// POST { name, emoji, memberUsernames: [...] }
export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  if (isMuted(me.id)) return NextResponse.json({ error: "Du hast aktuell einen Kommunikationsbann." }, { status: 403 });
  let body;
  try { body = await req.json(); } catch { body = {}; }
  const name = String(body?.name || "").trim();
  const emoji = String(body?.emoji || "💬");
  const memberUsernames = Array.isArray(body?.memberUsernames) ? body.memberUsernames : [];
  if (!name) return NextResponse.json({ error: "Name fehlt." }, { status: 400 });

  const memberIds = [];
  for (const u of memberUsernames) {
    const user = getUserByUsername(u);
    if (user && user.id !== me.id) memberIds.push(user.id);
  }
  try {
    const room = createChatRoom({ ownerId: me.id, name, emoji, memberIds });
    return NextResponse.json({ room });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "fehler" }, { status: 400 });
  }
}
