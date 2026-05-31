import { NextResponse } from "next/server";
import { getConversationsForUser, getUserByUsername, sendMessage, publishMessage, addNotification, bumpQuestProgress } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { checkTextPost, isMuted } from "@/lib/moderate";
import { moderateImage } from "@/lib/fidolin";
import { sendPushToUser } from "@/lib/push";

const MAX_IMG_BYTES = 700_000;
const IMG_RE = /^data:image\/(png|jpeg|jpg|webp);base64,/;

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const conversations = getConversationsForUser(me.id).map((c) => ({
    partnerUsername: c.partner_username,
    partnerDisplayName: c.partner_display_name,
    partnerEmoji: c.partner_emoji,
    partnerAvatar: c.partner_avatar_status === "approved" ? (c.partner_avatar_url || "") : "",
    partnerLastSeen: c.partner_last_seen,
    partnerGender: c.partner_gender,
    partnerAge: c.partner_age,
    lastText: c.last_text,
    at: c.at,
    fromMe: c.last_from === me.id,
    unread: c.unread || 0,
  }));
  return NextResponse.json({ conversations });
}

const MAX_AUDIO_BYTES = 800_000; // ~0.8 MB Base64 (ca. 45-60 Sek Opus)

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  if (isMuted(me.id)) return NextResponse.json({ error: "Du hast aktuell einen Kommunikationsbann und kannst nicht schreiben." }, { status: 403 });
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
    addNotification({ userId: target.id, actorId: me.id, type: "message", targetType: "message", targetId: row.id, preview: "🎤 Sprachnachricht" });
    sendPushToUser(target.id, {
      title: me.displayName || me.username,
      body: "🎤 Sprachnachricht",
      url: `/messenger/${encodeURIComponent(me.username)}`,
      tag: `vv-msg-${me.username}`,
      fromUsername: me.username,
      fromDisplayName: me.displayName || me.username,
      fromUserId: me.id,
      kind: "voice",
    }).catch(() => {});
    return NextResponse.json({ message: { ...row, audioUrl: undefined } });
  }

  const cleaned = String(body.text || "").trim().slice(0, 2000);
  const rawImage = body.image ? String(body.image) : "";
  if (!cleaned && !rawImage) return NextResponse.json({ error: "empty" }, { status: 400 });

  if (cleaned) {
    const verdict = await checkTextPost(me.id, "nachricht", cleaned);
    if (!verdict.ok) return NextResponse.json({ error: `Fidolin hat das blockiert: ${verdict.reason}` }, { status: 422 });
  }

  let storedImage = "";
  let imageNote = "";
  if (rawImage) {
    if (!IMG_RE.test(rawImage) || rawImage.length > MAX_IMG_BYTES) {
      return NextResponse.json({ error: "Ungültiges Bild (PNG/JPG/WEBP, max ~0.7 MB)." }, { status: 400 });
    }
    const v = await moderateImage(rawImage);
    if (v.block) return NextResponse.json({ error: `Fidolin hat das Bild abgelehnt: ${v.reason || "Verstoß"}` }, { status: 422 });
    if (v.undecided) imageNote = "Bild konnte nicht von der KI geprüft werden – nur Text gesendet.";
    else storedImage = rawImage;
  }

  if (!cleaned && !storedImage) {
    // Falls Text leer und Bild verworfen -> nichts senden
    return NextResponse.json({ error: imageNote || "Nichts zu senden." }, { status: 422 });
  }

  const row = sendMessage(me.id, target.id, cleaned, { imageUrl: storedImage });
  publishMessage(row);
  addNotification({ userId: target.id, actorId: me.id, type: "message", targetType: "message", targetId: row.id, preview: cleaned || "📷 Bild" });

  const previewText = cleaned
    ? cleaned.slice(0, 140)
    : (storedImage ? "📷 Bild" : "Nachricht");
  sendPushToUser(target.id, {
    title: me.displayName || me.username,
    body: previewText,
    url: `/messenger/${encodeURIComponent(me.username)}`,
    tag: `vv-msg-${me.username}`,
    fromUsername: me.username,
    fromDisplayName: me.displayName || me.username,
    fromUserId: me.id,
    kind: storedImage ? "image" : "text",
  }).catch(() => {});

  try { bumpQuestProgress(me.id, "message"); } catch {}
  return NextResponse.json({ message: row, imageNote });
}
