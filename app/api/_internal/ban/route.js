import { NextResponse } from "next/server";
import { addPermaban, logAttack, isPermabanned } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST { ip, pattern, severity, payload, method, path, userAgent }
// Wird AUSSCHLIESSLICH von der Middleware aufgerufen.
// Header x-internal-token muss zu VV_INTERNAL_TOKEN passen.
export async function POST(req) {
  const provided = req.headers.get("x-internal-token") || "";
  const expected = process.env.VV_INTERNAL_TOKEN || "";
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const b = await req.json().catch(() => ({}));
  const ip = String(b.ip || "").trim();
  if (!ip || ip === "unknown") {
    return NextResponse.json({ error: "no ip" }, { status: 400 });
  }

  const alreadyBanned = isPermabanned(ip);
  if (!alreadyBanned) {
    addPermaban({
      ip,
      reason: `auto: ${b.pattern || "unknown"}`,
      pattern: b.pattern,
      payload: b.payload,
      method: b.method,
      path: b.path,
      userAgent: b.userAgent,
    });
  }
  logAttack({
    ip,
    pattern: b.pattern,
    severity: b.severity,
    payload: b.payload,
    method: b.method,
    path: b.path,
    userAgent: b.userAgent,
    banned: true,
  });

  return NextResponse.json({ ok: true, banned: !alreadyBanned, alreadyBanned: !!alreadyBanned });
}
