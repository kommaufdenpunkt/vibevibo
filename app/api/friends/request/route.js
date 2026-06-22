import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  sendFriendRequest, acceptFriendRequest,
  getUserByUsername, addNotification,
} from "@/lib/db";
import { sendPushToUser } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 🤖 Bots nehmen Freundschaftsanfragen automatisch an.
const BOT_USERNAMES = new Set(["fidolin"]);

function botGreeting(username) {
  const u = String(username || "").toLowerCase();
  if (u === "fidolin") return "🎀 Hey! Ich freu mich, dich kennenzulernen! Schreib mir gerne mal.";
  return "👋 Hallo!";
}

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

  const isBot = BOT_USERNAMES.has(String(target.username || "").toLowerCase());
  const targetDisplay = target.displayName || target.display_name || target.username;

  try {
    const { id, autoAccepted } = sendFriendRequest(me.id, target.id, message);

    let finalAccepted = autoAccepted;

    // 🤖 Bot-Empfänger → sofort accepten
    if (isBot && !autoAccepted) {
      try {
        acceptFriendRequest(id, target.id, botGreeting(target.username));
        finalAccepted = true;
      } catch {}
    }

    // Notification + Push an Empfänger (überspringen wenn Bot — kein Mensch dahinter)
    if (!isBot) {
      try {
        addNotification({
          userId: target.id, actorId: me.id,
          type: finalAccepted ? "friend_accepted" : "friend_request",
          targetType: "friend_request", targetId: id,
          preview: finalAccepted ? "🤝 Auto-Match! Ihr seid jetzt befreundet."
                                 : (message ? `🤝 Anfrage: „${message.slice(0, 80)}"` : "🤝 Freundschaftsanfrage"),
        });
      } catch {}
      try {
        sendPushToUser(target.id, {
          title: finalAccepted
            ? `🎉 ${me.displayName} ist jetzt dein Freund!`
            : `🤝 ${me.displayName} möchte dein Freund sein`,
          body: message || (finalAccepted ? "Ihr habt euch gefunden!" : "Nimm an oder lehne ab."),
          url: "/freunde/anfragen",
          kind: "friend_request",
          fromUserId: me.id,
          fromUsername: me.username,
          fromDisplayName: me.displayName,
        }).catch(() => {});
      } catch {}
    }

    // Bei Bot-Auto-Accept: Notification an DICH (Absender) — sonst wüsstest du nicht dass es geklappt hat
    if (isBot && finalAccepted) {
      try {
        addNotification({
          userId: me.id, actorId: target.id,
          type: "friend_accepted",
          targetType: "friend_request", targetId: id,
          preview: `🎀 ${targetDisplay} ist jetzt deine Freundin!`,
        });
      } catch {}
    }

    return NextResponse.json({ ok: true, id, autoAccepted: finalAccepted });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Fehler" }, { status: 400 });
  }
}
