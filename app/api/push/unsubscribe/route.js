import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { removePushSubscriptionByEndpoint } from "@/lib/db";

export async function POST(req) {
  const me = await getSessionUser();
  // Erlaube unsubscribe auch ohne aktive Session (z.B. nach Logout) – nur via Endpoint.
  let body;
  try { body = await req.json(); } catch { body = null; }
  const endpoint = body?.subscription?.endpoint || body?.endpoint;
  if (!endpoint) return NextResponse.json({ error: "invalid endpoint" }, { status: 400 });

  const removed = removePushSubscriptionByEndpoint(endpoint, me?.id);
  return NextResponse.json({ ok: true, removed });
}
