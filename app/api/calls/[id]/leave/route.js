import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { leaveCall, getCall, getCallParticipants, publishToUser, listChatRoomMemberIds } from "@/lib/db";

export async function POST(_req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id } = await params;
  const callId = Number(id);
  const before = getCall(callId);
  if (!before) return NextResponse.json({ ok: true });

  const res = leaveCall(callId, me.id);

  // Anderen Teilnehmern Bescheid geben
  const remaining = getCallParticipants(callId);
  for (const p of remaining) {
    publishToUser(p.id, "call-peer-left", { callId, userId: me.id });
  }
  if (res.ended) {
    // Auch den Eingeladenen, die nie geantwortet haben, "call-ended" senden,
    // damit das Klingel-Modal verschwindet.
    let pingIds = [];
    if (before.type === "1on1") {
      pingIds = [before.initiatorId, before.partnerId].filter((x) => x && x !== me.id);
    } else if (before.type === "group" && before.roomId) {
      pingIds = listChatRoomMemberIds(before.roomId).filter((x) => x !== me.id);
    }
    for (const uid of pingIds) publishToUser(uid, "call-ended", { callId });
  }
  return NextResponse.json({ ok: true, ...res });
}
