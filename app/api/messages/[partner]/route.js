import { NextResponse } from "next/server";
import { getConversation, getUserByUsername } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(_req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { partner } = await params;
  const other = getUserByUsername(partner);
  if (!other) return NextResponse.json({ error: "not found" }, { status: 404 });
  const messages = getConversation(me.id, other.id).map((m) => ({
    id: m.id,
    text: m.text,
    at: m.at,
    fromMe: m.from_user_id === me.id,
  }));
  return NextResponse.json({
    partner: {
      username: other.username,
      displayName: other.displayName,
      emoji: other.emoji,
      mood: other.mood,
      lastSeen: other.lastSeen,
    },
    messages,
  });
}
