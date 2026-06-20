import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  sendFriendRequest, getUserByUsername, addNotification,
} from "@/lib/db";
import { sendPushToUser } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  let body = {};
  try { body = await req.json(); } catch {}
  const targetUsername = String(body?.targetUsername || body?.username || "").trim().toLowerCase();
  const message = String(body?.message || "").slice(0, 400);
  if (!targetUsername) return NextResponse.json({ error: "Empfänger fehlt" }, { status: 400 });
  const target = getUserByUsername(targetUsername);
  if (!target) return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });
  try {
    const { id, autoAccepted } = sendFriendRequest(me.id, target.id, message);
    // Notification an Empfänger
    try {
      addNotification({
        userId: target.id, actorId: me.id,
        type: autoAccepted ? "friend_accepted" : "friend_request",
        targetType: "friend_request", targetId: id,
        preview: autoAccepted ? "🤝 Auto-Match! Ihr seid jetzt befreundet."
                              : (message ? `🤝 Anfrage: „${message.slice(0, 80)}"` : "🤝 Freundschaftsanfrage"),
      });
    } catch {}
    try {
      sendPushToUser(target.id, {
        title: autoAccepted
          ? `🎉 ${me.displayName} ist jetzt dein Freund!`
          : `🤝 ${me.displayName} möchte dein Freund sein`,
        body: message || (autoAccepted ? "Ihr habt euch gefunden!" : "Nimm an oder lehne ab."),
        url: "/freunde/anfragen",
        kind: "friend_request",
        fromUserId: me.id,
        fromUsername: me.username,
        fromDisplayName: me.displayName,
      }).catch(() => {});
    } catch {}
    return NextResponse.json({ ok: true, id, autoAccepted });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Fehler" }, { status: 400 });
  }
}
