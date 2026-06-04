import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { toggleReaction, countReaction, addNotification, getPinnwandAuthorId } from "@/lib/db";
import { sendPushToUser } from "@/lib/push";

const ALLOWED_TARGETS = new Set(["pinnwand", "status", "grouppost"]);
const ALLOWED_KINDS = new Set(["like", "love", "haha", "wow", "fire", "sad"]);

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { targetType, targetId, kind = "like" } = await req.json();
  if (!ALLOWED_TARGETS.has(targetType) || !ALLOWED_KINDS.has(kind)) {
    return NextResponse.json({ error: "invalid target" }, { status: 400 });
  }
  const tid = Number(targetId);
  if (!tid) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  const REACTION_EMOJI = { like: "👍", love: "❤️", haha: "😂", wow: "😍", fire: "🔥", sad: "😢" };
  const REACTION_VERB  = { like: "gefällt", love: "liebt", haha: "lacht über", wow: "ist begeistert von", fire: "feiert", sad: "trauert um" };

  const iReacted = toggleReaction(targetType, tid, me.id, kind);
  // Benachrichtigung beim Pinnwand-Reaktion (nur wenn neu hinzugefügt)
  if (iReacted && targetType === "pinnwand") {
    const authorId = getPinnwandAuthorId(tid);
    if (authorId && authorId !== me.id) {
      const emoji = REACTION_EMOJI[kind] || "❤️";
      const verb = REACTION_VERB[kind] || "reagierte auf";
      addNotification({ userId: authorId, actorId: me.id, type: "like", targetType: "pinnwand", targetId: tid, preview: `${emoji} Reaktion` });
      sendPushToUser(authorId, {
        title: `${emoji} ${me.displayName} ${verb} deinen Eintrag`,
        body: "Schau mal nach!",
        url: `/u/${me.username}`,
        tag: `vv-react-${tid}-${kind}`,
        kind: "message",
        fromUserId: me.id,
        fromUsername: me.username,
        fromDisplayName: me.displayName,
      }).catch(() => {});
    }
  }
  return NextResponse.json({ iReacted, kind, count: countReaction(targetType, tid, kind) });
}
