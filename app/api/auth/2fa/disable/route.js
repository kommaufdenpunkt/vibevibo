import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { disableUserTotp, isTotpEnabled, checkUserPassword, getUserTotpSecret, audit } from "@/lib/db";
import { verifyTotp } from "@/lib/totp";
import { getClientIp } from "@/lib/ip";

// Deaktivierung verlangt aktuelles Passwort UND aktuellen TOTP-Code,
// damit ein gestohlenes Session-Cookie 2FA nicht abschalten kann.
export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  if (!isTotpEnabled(me.id)) return NextResponse.json({ ok: true, alreadyDisabled: true });

  const body = await req.json().catch(() => ({}));
  const password = String(body?.password || "");
  const code = String(body?.code || "").replace(/\D/g, "");
  const ip = getClientIp(req);
  const ua = req.headers.get("user-agent") || "";

  if (!checkUserPassword(me.id, password)) {
    audit({ userId: me.id, action: "2fa.disable_bad_pw", ip, ua });
    return NextResponse.json({ error: "Passwort ist falsch." }, { status: 401 });
  }
  const { active } = getUserTotpSecret(me.id);
  if (!verifyTotp(active, code)) {
    audit({ userId: me.id, action: "2fa.disable_bad_code", ip, ua });
    return NextResponse.json({ error: "2FA-Code ist ungültig." }, { status: 422 });
  }
  disableUserTotp(me.id);
  audit({ userId: me.id, action: "2fa.disabled", ip, ua });
  return NextResponse.json({ ok: true });
}
