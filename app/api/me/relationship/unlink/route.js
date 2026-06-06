// 💔 Bestehende Partnerschaft auflösen (beidseitig).

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { unlinkPartnership, getUserById, userRow, addNotification } from "@/lib/db";
import { sendPushToUser } from "@/lib/push";

export async function POST() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  // Partner-ID für Benachrichtigung merken
  const before = getUserById(me.id);
  const partnerId = before?.partner_user_id || 0;
  try {
    const r = unlinkPartnership(me.id);
    if (partnerId && r.hadPartner) {
      const sender = userRow(getUserById(me.id));
      try {
        addNotification({
          userId: partnerId, actorId: me.id,
          type: "message", targetType: "partnership_unlink", targetId: null,
          preview: `💔 ${sender?.displayName || me.username} hat die Partnerschaft aufgelöst.`,
        });
        sendPushToUser(partnerId, {
          title: `💔 Partnerschaft aufgelöst`,
          body: `${sender?.displayName || me.username} hat eure Verlinkung beendet.`,
          url: "/profile/edit",
          tag: `partnership-unlink-${me.id}`,
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
