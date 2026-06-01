import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  getCall, isCallParticipant, endCall, publishToUser,
  listChatRoomMemberIds, addSanction, logMod,
} from "@/lib/db";
import { moderateImage } from "@/lib/fidolin";

const MAX_BYTES = 250_000;
const IMG_RE = /^data:image\/(png|jpeg|jpg|webp);base64,/;

// POST { image: dataURL }
// Stichproben-Screenshot vom lokalen Video. Bei eindeutigem Verstoß: Call beenden,
// Sender für 10 Min in Kommunikationsbann + Mod-Log-Eintrag.
export async function POST(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id } = await params;
  const callId = Number(id);
  const call = getCall(callId);
  if (!call || call.endedAt) return NextResponse.json({ ok: true, ended: true });
  if (!isCallParticipant(callId, me.id)) return NextResponse.json({ error: "kein teilnehmer" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const image = String(body?.image || "");
  if (!IMG_RE.test(image) || image.length > MAX_BYTES) {
    return NextResponse.json({ error: "ungültiges Bild" }, { status: 400 });
  }

  const verdict = await moderateImage(image);
  if (verdict?.block) {
    // Call beenden + Sender für 10 Minuten Kommunikationsbann
    endCall(callId);
    addSanction(me.id, "mute", Date.now() + 10 * 60_000, `Live-Cam: ${verdict.reason || "Verstoß"}`, "fidolin");
    logMod({ userId: me.id, kind: "live-cam", decision: "blocked", reason: verdict.reason || "Verstoß", by: "fidolin" });

    let pingIds = [];
    if (call.type === "1on1") pingIds = [call.initiatorId, call.partnerId].filter(Boolean);
    else if (call.roomId) pingIds = listChatRoomMemberIds(call.roomId);
    for (const uid of pingIds) {
      publishToUser(uid, "call-ended", { callId, reason: "fidolin", detail: verdict.reason || "" });
    }
    return NextResponse.json({ block: true, reason: verdict.reason || "Verstoß" });
  }
  return NextResponse.json({ ok: true, block: false });
}
