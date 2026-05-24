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

const MAX_AUDIO_BYTES = 800_000; // ~0.8 MB Base64 (ca. 45-60 Sek Opus)

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const body = await req.json();
  const target = getUserByUsername(body.to);
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (body.kind === "voice") {
    const audioUrl = String(body.audioUrl || "");
    if (!audioUrl.startsWith("data:audio/")) {
      return NextResponse.json({ error: "invalid audio" }, { status: 400 });
    }
    if (audioUrl.length > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: "audio too long (max ~60s)" }, { status: 413 });
    }
    const row = sendMessage(me.id, target.id, "", {
      kind: "voice",
      audioUrl,
      onceOnly: !!body.onceOnly,
    });
    publishMessage(row);
    return NextResponse.json({ message: { ...row, audioUrl: undefined } });
  }

  const cleaned = String(body.text || "").trim().slice(0, 2000);
  if (!cleaned) return NextResponse.json({ error: "empty" }, { status: 400 });
  const row = sendMessage(me.id, target.id, cleaned);
  publishMessage(row);
  return NextResponse.json({ message: row });
}
