import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listNotifications, countUnreadNotifications, markNotificationsRead } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  return NextResponse.json({
    notifications: listNotifications(me.id, 30),
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
