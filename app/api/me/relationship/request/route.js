// 💑 Partnerschafts-Anfrage senden ODER eingehende listen.
// POST { targetUsername } — sendet Anfrage
// GET                    — listet eingehende offene Anfragen + ausgehende

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  sendPartnershipRequest,
  listIncomingPartnershipRequests,
  listOutgoingPartnershipRequests,
  addNotification,
  getUserById, userRow,
} from "@/lib/db";
import { sendPushToUser } from "@/lib/push";

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const targetUsername = String(body?.targetUsername || "").trim();
  try {
    const r = sendPartnershipRequest(me.id, targetUsername);
    const sender = userRow(getUserById(me.id));
    const out = listOutgoingPartnershipRequests(me.id).find((x) => x.id === r.id);
    if (out) {
      try {
        addNotification({
          userId: out.to_user_id, actorId: me.id,
          type: "message", targetType: "partnership_request", targetId: r.id,
          preview: `Partnerschafts-Anfrage von ${sender?.displayName || me.username}`,
        });
        sendPushToUser(out.to_user_id, {
          title: `${sender?.displayName || me.username} moechte sich mit dir verlinken`,
          body: `Schau in Profil bearbeiten -> Beziehung um zu antworten.`,
          url: "/profile/edit",
          tag: `partnership-${r.id}`,
          kind: "message",
          fromUserId: me.id,
          fromUsername: me.username,
          fromDisplayName: sender?.displayName || me.username,
        }).catch(() => {});
      } catch {}
    }
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  return NextResponse.json({
    incoming: listIncomingPartnershipRequests(me.id),
    outgoing: listOutgoingPartnershipRequests(me.id),
  });
}
