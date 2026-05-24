import { NextResponse } from "next/server";
import { checkAdminPassword, setAdminCookie, adminEnabled } from "@/lib/admin";

export async function POST(req) {
  if (!adminEnabled()) {
    return NextResponse.json({ error: "Admin-Bereich nicht konfiguriert (VV_ADMIN_PASSWORD fehlt)." }, { status: 503 });
  }
  const { password } = await req.json();
  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: "Falsches Admin-Passwort." }, { status: 401 });
  }
  await setAdminCookie();
  return NextResponse.json({ ok: true });
}
