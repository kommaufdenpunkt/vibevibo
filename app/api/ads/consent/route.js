import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { setAdsConsent, getAdsConsent } from "@/lib/db";

// POST { consent: 1 (ja personalisiert) | 2 (ja nicht-personalisiert) | -1 (nein) }
// DSGVO-Pflicht: User muss explizit Werbung zustimmen, bevor wir Tracking-Cookies setzen.
export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  try {
    const out = setAdsConsent(me.id, body?.consent);
    return NextResponse.json({ ok: true, ...out });
  } catch (e) {
    return NextResponse.json({ error: e.message || "fehler" }, { status: 400 });
  }
}

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  return NextResponse.json(getAdsConsent(me.id));
}
