import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { toggleReaction, countReaction, addNotification, getPinnwandAuthorId } from "@/lib/db";
import { sendPushToUser } from "@/lib/push";

const ALLOWED_TARGETS = new Set(["pinnwand", "status", "grouppost"]);
const ALLOWED_KINDS = new Set(["like"]);

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { targetType, targetId, kind = "like" } = await req.json();
  if (!ALLOWED_TARGETS.has(targetType) || !ALLOWED_KINDS.has(kind)) {
    return NextResponse.json({ error: "invalid target" }, { status: 400 });
  }
  const tid = Number(targetId);
  if (!tid) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  const iLiked = toggleReaction(targetType, tid, me.id, kind);
  // Benachrichtigung beim Pinnwand-Like (nur wenn neu hinzugefuegt)
  if (iLiked && targetType === "pinnwand") {
    const authorId = getPinnwandAuthorId(tid);
    if (authorId && authorId !== me.id) {
      addNotification({ userId: authorId, actorId: me.id, type: "like", targetType: "pinnwand", targetId: tid, preview: "Gefällt mir" });
      sendPushToUser(authorId, {
        title: `❤️ ${me.displayName} mag deinen Eintrag`,
        body: "Schau mal nach!",
        url: `/u/${me.username}`,
        tag: `vv-like-${tid}`,
        kind: "message",
        fromUserId: me.id,
        fromUsername: me.username,
        fromDisplayName: me.displayName,
      }).catch(() => {});
    }
  }
  return NextResponse.json({ iLiked, count: countReaction(targetType, tid, kind) });
}
