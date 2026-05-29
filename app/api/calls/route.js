import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  createCall, getUserByUsername, getChatRoom, isRoomMember,
  listChatRoomMemberIds, publishToUser, isChatMuted,
} from "@/lib/db";
import { isMuted } from "@/lib/moderate";
import { sendPushToUser } from "@/lib/push";

// POST { type: '1on1' | 'group', partnerUsername?, roomId?, withVideo }
export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  if (isMuted(me.id)) return NextResponse.json({ error: "Kommunikationsbann aktiv." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const type = body?.type === "group" ? "group" : "1on1";
  const withVideo = body?.withVideo !== false;

  let partnerId = null;
  let roomId = null;
  let inviteeIds = [];

  if (type === "1on1") {
    const partner = getUserByUsername(String(body?.partnerUsername || ""));
    if (!partner) return NextResponse.json({ error: "partner not found" }, { status: 404 });
    if (partner.id === me.id) return NextResponse.json({ error: "kein selbst-call" }, { status: 400 });
    partnerId = partner.id;
    inviteeIds = [partner.id];
  } else {
    roomId = Number(body?.roomId);
    const room = getChatRoom(roomId);
    if (!room) return NextResponse.json({ error: "room not found" }, { status: 404 });
    if (!isRoomMember(roomId, me.id)) return NextResponse.json({ error: "kein mitglied" }, { status: 403 });
    inviteeIds = listChatRoomMemberIds(roomId).filter((id) => id !== me.id);
  }

  const call = createCall({ initiatorId: me.id, type, partnerId, roomId, withVideo });

  // SSE-Klingel an die Eingeladenen + Push (außer wenn stummgeschaltet)
  for (const uid of inviteeIds) {
    publishToUser(uid, "call-incoming", {
      callId: call.id, type, withVideo,
      initiator: { id: me.id, username: me.username, displayName: me.displayName, avatarUrl: me.avatarUrl || "" },
      roomId: roomId || null,
      at: Date.now(),
    });
    if (!isChatMuted(uid, { fromUserId: me.id, roomId })) {
      sendPushToUser(uid, {
        title: withVideo ? "📹 Video-Anruf" : "📞 Anruf",
        body: `${me.displayName || me.username} ruft an…`,
        url: type === "group" ? `/messenger/rooms/${roomId}` : `/messenger/${me.username}`,
        tag: `vv-call-${call.id}`,
        fromUserId: me.id,
        roomId: roomId || undefined,
        kind: "call",
      }).catch(() => {});
    }
  }

  return NextResponse.json({ call });
}
