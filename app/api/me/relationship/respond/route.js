// 💑 Auf Partnerschafts-Anfrage antworten.
// POST { requestId, accept: boolean }

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  respondPartnershipRequest, addNotification,
  getUserById, userRow,
} from "@/lib/db";
import { sendPushToUser } from "@/lib/push";

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const requestId = Number(body?.requestId);
  const accept = body?.accept !== false;
  if (!requestId) return NextResponse.json({ error: "requestId fehlt" }, { status: 400 });
  try {
    const r = respondPartnershipRequest(me.id, requestId, accept);
    // Sender informieren
    if (r.partnerUserId) {
      const sender = userRow(getUserById(me.id));
      try {
        addNotification({
          userId: r.partnerUserId, actorId: me.id,
          type: "message", targetType: "partnership_response", targetId: requestId,
          preview: accept
            ? `💞 ${sender?.displayName || me.username} hat eure Partnerschaft bestätigt!`
            : `💔 ${sender?.displayName || me.username} hat die Anfrage abgelehnt.`,
        });
        sendPushToUser(r.partnerUserId, {
          title: accept ? `💞 ${sender?.displayName || me.username} sagt JA!` : `💔 ${sender?.displayName || me.username} sagt: lieber nicht`,
          body: accept ? "Eure Partnerschaft ist jetzt verlinkt!" : "Die Partnerschafts-Anfrage wurde abgelehnt.",
          url: "/profile/edit",
          tag: `partnership-resp-${requestId}`,
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
