import { NextResponse } from "next/server";
import { getConversationsForUser, getUserByUsername, sendMessage, publishMessage } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const conversations = getConversationsForUser(me.id).map((c) => ({
    partnerUsername: c.partner_username,
    partnerDisplayName: c.partner_display_name,
    partnerEmoji: c.partner_emoji,
    partnerLastSeen: c.partner_last_seen,
    lastText: c.last_text,
    at: c.at,
    fromMe: c.last_from === me.id,
  }));
  return NextResponse.json({ conversations });
}

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { to, text } = await req.json();
  const target = getUserByUsername(to);
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });
  const cleaned = String(text || "").trim().slice(0, 2000);
  if (!cleaned) return NextResponse.json({ error: "empty" }, { status: 400 });
  const row = sendMessage(me.id, target.id, cleaned);
  publishMessage(row);
  return NextResponse.json({ message: row });
}
