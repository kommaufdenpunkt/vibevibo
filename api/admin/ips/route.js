import { NextResponse } from "next/server";
import { isAdminRequest, adminEnabled } from "@/lib/admin";
import { blockIp, unblockIp } from "@/lib/db";

export async function POST(req) {
  if (!adminEnabled()) return NextResponse.json({ error: "admin disabled" }, { status: 503 });
  if (!isAdminRequest(req)) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const { ip, action, reason } = await req.json();
  const cleaned = String(ip || "").trim();
  if (!cleaned) return NextResponse.json({ error: "ip fehlt" }, { status: 400 });

  if (action === "block") blockIp(cleaned, reason || "manuell gesperrt");
  else if (action === "unblock") unblockIp(cleaned);
  else return NextResponse.json({ error: "unknown action" }, { status: 400 });

  return NextResponse.json({ ok: true });
}
