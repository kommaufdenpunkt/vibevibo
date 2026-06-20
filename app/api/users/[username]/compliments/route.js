import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  getUserByUsername, sendComplimentNew, listCompliments,
  addNotification,
} from "@/lib/db";
import { sendPushToUser } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — Liste der Komplimente für diesen User (öffentlich sichtbar, anonym)
export async function GET(req, { params }) {
  const { username } = await params;
  const target = getUserByUsername(String(username).toLowerCase());
  if (!target) return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });
  const me = await getSessionUser();
  const isOwner = me && me.id === target.id;
  return NextResponse.json({
    compliments: listCompliments(target.id, {
      limit: 50, includeHidden: !!isOwner, viewerIsOwner: !!isOwner,
    }),
    isOwner: !!isOwner,
  });
}

// POST — Kompliment senden (anonym, nur eingeloggte User)
export async function POST(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Login nötig" }, { status: 401 });
  const { username } = await params;
  const target = getUserByUsername(String(username).toLowerCase());
  if (!target) return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });
  let body = {};
  try { body = await req.json(); } catch {}
  try {
    const id = sendComplimentNew({
      toUserId: target.id, fromUserId: me.id,
      body: String(body?.body || ""), emoji: String(body?.emoji || "💌"),
    });
    // Notification (anonym, Sender NICHT preisgeben)
    try {
      addNotification({
        userId: target.id, actorId: null,
        type: "compliment", targetType: "compliment", targetId: id,
        preview: `${body?.emoji || "💌"} Jemand hat dir ein anonymes Kompliment geschickt!`,
      });
    } catch {}
    try {
      sendPushToUser(target.id, {
        title: `${body?.emoji || "💌"} Anonymes Kompliment!`,
        body: "Jemand findet was an dir toll. Schau auf dein Profil.",
        url: `/u/${target.username}`,
        kind: "compliment",
      }).catch(() => {});
    } catch {}
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Fehler" }, { status: 400 });
  }
}
