import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  listNotifications, countUnreadNotifications, markNotificationsRead,
  blockedUserIdsFor,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const all = listNotifications(me.id, 30);
  // 🚫 Block-Filter: Notifications von blockierten Usern ausblenden
  const hidden = blockedUserIdsFor(me.id);
  const notifications = hidden.size === 0
    ? all
    : all.filter((n) => !hidden.has(Number(n.actorId || n.actor_id || 0)));
  return NextResponse.json({
    notifications,
    unread: countUnreadNotifications(me.id),
  });
}

export async function POST() {
  // markiert alle als gelesen
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  markNotificationsRead(me.id);
  return NextResponse.json({ ok: true });
}
