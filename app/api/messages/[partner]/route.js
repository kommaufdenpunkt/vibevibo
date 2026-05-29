import { NextResponse } from "next/server";
import { getConversation, getUserByUsername, isOnline, markConversationRead } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(_req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { partner } = await params;
  const other = getUserByUsername(partner);
  if (!other) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Beim Oeffnen des Chats: alle Nachrichten des Partners als gelesen markieren
  markConversationRead(me.id, other.id);

  const messages = getConversation(me.id, other.id).map((m) => ({
    id: m.id,
    text: m.text,
    at: m.at,
    fromMe: m.from_user_id === me.id,
    kind: m.kind,
    audioUrl: m.audioUrl,
    onceOnly: m.onceOnly,
    consumed: m.consumed,
    readAt: m.readAt || 0,
  }));
  return NextResponse.json({
    partner: {
      username: other.username,
      displayName: other.displayName,
      emoji: other.emoji,
      mood: other.mood,
      lastSeen: other.lastSeen,
      online: isOnline(other.lastSeen),
      gender: other.gender,
      age: other.age,
      avatarUrl: other.avatarUrl,
    },
    messages,
  });
}
