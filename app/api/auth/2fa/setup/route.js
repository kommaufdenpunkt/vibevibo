import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { setUserTotpPending, isTotpEnabled, audit } from "@/lib/db";
import { randomBase32Secret, otpauthUri } from "@/lib/totp";
import { getClientIp } from "@/lib/ip";

// Generiert ein neues TOTP-Secret und legt es als "pending" ab.
// User scannt QR / tippt Secret in Authenticator-App und ruft danach /enable auf.
export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  if (isTotpEnabled(me.id)) {
    return NextResponse.json({ error: "2FA ist bereits aktiv. Erst deaktivieren, um neu einzurichten." }, { status: 409 });
  }
  const secret = randomBase32Secret();
  setUserTotpPending(me.id, secret);
  const uri = otpauthUri({ secret, issuer: "VibeVibo", account: me.username });
  audit({
    userId: me.id, action: "2fa.setup_start",
    ip: getClientIp(req), ua: req.headers.get("user-agent") || "",
  });
  return NextResponse.json({
    secret,
    uri,
    // 4er-Gruppierung zum Eintippen
    grouped: secret.replace(/(.{4})/g, "$1 ").trim(),
  });
}
