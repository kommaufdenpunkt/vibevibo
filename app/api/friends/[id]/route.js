import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  acceptFriendRequest, declineFriendRequest, cancelFriendRequest,
  getFriendRequest, addNotification, getUserById,
} from "@/lib/db";
import { sendPushToUser } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { action: "accept" | "decline", reply?, reason? }
export async function POST(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id } = await params;
  const reqId = Number(id);
  if (!reqId) return NextResponse.json({ error: "id ungültig" }, { status: 400 });
  let body = {};
  try { body = await req.json(); } catch {}
  const action = String(body?.action || "");
  try {
    const reqRow = getFriendRequest(reqId);
    if (!reqRow) return NextResponse.json({ error: "Anfrage weg" }, { status: 404 });

    if (action === "accept") {
      const reply = String(body?.reply || "").slice(0, 300);
      acceptFriendRequest(reqId, me.id, reply);
      // Notify sender
      try {
        addNotification({
          userId: reqRow.from_id, actorId: me.id,
          type: "friend_accepted", targetType: "friend_request", targetId: reqId,
          preview: reply ? `🎉 angenommen: „${reply.slice(0, 80)}"` : "🎉 hat deine Anfrage angenommen!",
        });
      } catch {}
      try {
        sendPushToUser(reqRow.from_id, {
          title: `🎉 ${me.displayName} hat dich angenommen!`,
          body: reply || "Ihr seid jetzt befreundet.",
          url: `/u/${me.username}`,
          kind: "friend_accepted",
          fromUserId: me.id, fromUsername: me.username, fromDisplayName: me.displayName,
        }).catch(() => {});
      } catch {}
      return NextResponse.json({ ok: true, status: "accepted" });
    }

    if (action === "decline") {
      const reason = String(body?.reason || "").slice(0, 300);
      declineFriendRequest(reqId, me.id, reason);
      // Notify sender
      try {
        addNotification({
          userId: reqRow.from_id, actorId: me.id,
          type: "friend_declined", targetType: "friend_request", targetId: reqId,
          preview: reason ? `😔 abgelehnt: „${reason.slice(0, 80)}"` : "😔 Anfrage abgelehnt",
        });
      } catch {}
      return NextResponse.json({ ok: true, status: "declined" });
    }

    return NextResponse.json({ error: "Unbekannte Action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Fehler" }, { status: 400 });
  }
}

// DELETE — Sender zieht zurück
export async function DELETE(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id } = await params;
  try {
    cancelFriendRequest(Number(id), me.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Fehler" }, { status: 400 });
  }
}
