import { NextResponse } from "next/server";
import {
  getConversation,
  getUserByUsername,
  isOnline,
  markConversationRead,
  getConversationRetention,
  setConversationRetention,
  isBlockedBetween,
} from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(_req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { partner } = await params;
  const other = getUserByUsername(partner);
  if (!other) return NextResponse.json({ error: "not found" }, { status: 404 });

  // 🚫 Block-Filter: kein Zugriff auf DM-Thread mit blockiertem User
  if (isBlockedBetween(me.id, other.id)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

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
    imageUrl: m.imageUrl || "",
  }));
  const retention = getConversationRetention(me.id, other.id);
  return NextResponse.json({
    partner: {
      id: other.id,
      username: other.username,
      displayName: other.displayName,
      emoji: other.emoji,
      mood: other.mood,
      presence: other.presence,
      lastSeen: other.lastSeen,
      online: isOnline(other.lastSeen),
      gender: other.gender,
      age: other.age,
      avatarUrl: other.avatarUrl,
    },
    retention,
    messages,
  });
}

// Setzt den Auto-Löschen-Timer für diesen Chat (gilt für beide Seiten).
// days: 0 (aus), 1, 7, 30
export async function PATCH(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { partner } = await params;
  const other = getUserByUsername(partner);
  if (!other) return NextResponse.json({ error: "not found" }, { status: 404 });

  let body;
  try { body = await req.json(); } catch { body = null; }
  const days = Number(body?.retentionDays);
  try {
    const out = setConversationRetention(me.id, other.id, days, me.id);
    return NextResponse.json({ ok: true, retention: { retentionDays: out.retentionDays, setBy: me.id, updatedAt: Date.now() } });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "invalid" }, { status: 400 });
  }
}
