import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getUserTotpSecret, activateUserTotp, audit } from "@/lib/db";
import { verifyTotp } from "@/lib/totp";
import { getClientIp } from "@/lib/ip";

// Aktiviert 2FA, sobald der erste Code aus der Authenticator-App stimmt.
export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const code = String(body?.code || "").replace(/\D/g, "");
  const { pending, active } = getUserTotpSecret(me.id);
  if (active) return NextResponse.json({ error: "2FA ist bereits aktiv." }, { status: 409 });
  if (!pending) return NextResponse.json({ error: "Bitte zuerst Setup starten." }, { status: 400 });
  if (!verifyTotp(pending, code)) {
    audit({ userId: me.id, action: "2fa.enable_fail", ip: getClientIp(req), ua: req.headers.get("user-agent") || "" });
    return NextResponse.json({ error: "Code stimmt nicht. Bitte erneut versuchen." }, { status: 422 });
  }
  activateUserTotp(me.id);
  audit({ userId: me.id, action: "2fa.enabled", ip: getClientIp(req), ua: req.headers.get("user-agent") || "" });
  return NextResponse.json({ ok: true });
}
