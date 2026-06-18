import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  getChatRoom, getRoomMessages, sendRoomMessage, isRoomMember,
  listChatRoomMemberIds, publishRoomMessage, getUserById, markRoomRead,
} from "@/lib/db";
import { checkTextPost, checkVoicePost, isMuted } from "@/lib/moderate";
import { moderateImage } from "@/lib/fidolin";
import { sendPushToUser } from "@/lib/push";

const MAX_IMG_BYTES = 700_000;
const IMG_RE = /^data:image\/(png|jpeg|jpg|webp);base64,/;
const MAX_AUDIO_BYTES = 800_000;

export async function GET(_req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id } = await params;
  const roomId = Number(id);
  if (!getChatRoom(roomId)) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!isRoomMember(roomId, me.id)) return NextResponse.json({ error: "kein mitglied" }, { status: 403 });
  markRoomRead(roomId, me.id);
  return NextResponse.json({ messages: getRoomMessages(roomId) });
}

export async function POST(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  if (isMuted(me.id)) return NextResponse.json({ error: "Du hast aktuell einen Kommunikationsbann." }, { status: 403 });
  const { id } = await params;
  const roomId = Number(id);
  if (!getChatRoom(roomId)) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!isRoomMember(roomId, me.id)) return NextResponse.json({ error: "kein mitglied" }, { status: 403 });

  const body = await req.json();

  // Voice
  if (body.kind === "voice") {
    const audioUrl = String(body.audioUrl || "");
    if (!audioUrl.startsWith("data:audio/")) return NextResponse.json({ error: "invalid audio" }, { status: 400 });
    if (audioUrl.length > MAX_AUDIO_BYTES) return NextResponse.json({ error: "audio too long" }, { status: 413 });
    // 🤖 Fidolin transkribiert + prüft Sprachnachricht
    const vv = await checkVoicePost(me.id, "gruppenchat_voice", audioUrl);
    if (!vv.ok) {
      return NextResponse.json({
        error: `Fidolin hat die Sprachnachricht abgelehnt: ${vv.reason}`,
      }, { status: 422 });
    }
    const msg = sendRoomMessage(roomId, me.id, "", { kind: "voice", audioUrl });
    const memberIds = listChatRoomMemberIds(roomId);
    publishRoomMessage(roomId, msg, memberIds);
    fanoutPush(roomId, memberIds, me, "🎤 Sprachnachricht").catch(() => {});
    return NextResponse.json({ message: { ...msg, audioUrl: undefined } });
  }

  const cleaned = String(body.text || "").trim().slice(0, 2000);
  const rawImage = body.image ? String(body.image) : "";
  if (!cleaned && !rawImage) return NextResponse.json({ error: "empty" }, { status: 400 });

  if (cleaned) {
    const v = await checkTextPost(me.id, "gruppenchat", cleaned);
    if (!v.ok) return NextResponse.json({ error: `Fidolin hat das blockiert: ${v.reason}` }, { status: 422 });
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
  if (!cleaned && !storedImage) return NextResponse.json({ error: imageNote || "Nichts zu senden." }, { status: 422 });

  const msg = sendRoomMessage(roomId, me.id, cleaned, { imageUrl: storedImage });
  const memberIds = listChatRoomMemberIds(roomId);
  publishRoomMessage(roomId, msg, memberIds);
  const preview = cleaned ? cleaned.slice(0, 140) : "📷 Bild";
  fanoutPush(roomId, memberIds, me, preview).catch(() => {});
  return NextResponse.json({ message: msg, imageNote });
}

async function fanoutPush(roomId, memberIds, me, preview) {
  const room = getChatRoom(roomId);
  for (const uid of memberIds) {
    if (uid === me.id) continue;
    sendPushToUser(uid, {
      title: `${room?.emoji || "💬"} ${room?.name || "Gruppe"}`,
      body: `${me.displayName || me.username}: ${preview}`,
      url: `/messenger/rooms/${roomId}`,
      tag: `vv-room-${roomId}`,
      fromUserId: me.id,
      roomId,
      kind: "room",
    }).catch(() => {});
  }
}
