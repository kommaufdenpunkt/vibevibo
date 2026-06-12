import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { recordPwaInstall } from "@/lib/db";

// POST /api/me/pwa-install { platform, userAgent? }
export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const platform = String(body?.platform || "").trim();
  if (!platform) return NextResponse.json({ error: "platform required" }, { status: 400 });
  const userAgent = String(body?.userAgent || req.headers.get("user-agent") || "").slice(0, 280);
  recordPwaInstall(me.id, platform, userAgent);
  return NextResponse.json({ ok: true });
}
