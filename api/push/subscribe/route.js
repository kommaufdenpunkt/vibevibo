import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { addPushSubscription } from "@/lib/db";

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });

  let body;
  try { body = await req.json(); } catch { body = null; }
  const endpoint = body?.subscription?.endpoint || body?.endpoint;
  const p256dh = body?.subscription?.keys?.p256dh || body?.p256dh;
  const auth = body?.subscription?.keys?.auth || body?.auth;
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "invalid subscription" }, { status: 400 });
  }

  const ua = req.headers.get("user-agent") || "";
  const id = addPushSubscription({ userId: me.id, endpoint, p256dh, auth, userAgent: ua });
  return NextResponse.json({ ok: true, id });
}
