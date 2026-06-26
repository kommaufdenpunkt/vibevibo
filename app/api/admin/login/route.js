// POST /api/admin/login
// Body: { pw, next? }
// Setzt vv_admin Cookie (HttpOnly, 8h). Antwortet mit { ok: true, next }.
//
// Wird von /admin/performance Login-Form genutzt — Cookie ersetzt das alte
// URL-?pw=-Verfahren.

import { NextResponse } from "next/server";
import { checkAdminPassword, setAdminCookie, adminEnabled } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req) {
  if (!adminEnabled()) {
    return NextResponse.json({ error: "Admin-Bereich deaktiviert (VV_ADMIN_PASSWORD nicht gesetzt)." }, { status: 503 });
  }

  let body = {};
  try { body = await req.json(); } catch {}
  const pw = String(body?.pw || "");
  const next = String(body?.next || "/admin");

  if (!checkAdminPassword(pw)) {
    // Konstantes Timing-Element + sehr generische Antwort
    await new Promise((res) => setTimeout(res, 250));
    return NextResponse.json({ error: "Login fehlgeschlagen." }, { status: 401 });
  }

  await setAdminCookie();
  return NextResponse.json({ ok: true, next });
}
