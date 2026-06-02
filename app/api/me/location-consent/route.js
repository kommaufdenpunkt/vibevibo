import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getLocationConsent, setLocationConsent } from "@/lib/db";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  return NextResponse.json({ value: getLocationConsent(me.id) });
}

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  let v = body?.value;
  if (v === "yes" || v === true || v === 1) v = 1;
  else if (v === "no" || v === false || v === -1) v = -1;
  else v = 0;
  const value = setLocationConsent(me.id, v);
  return NextResponse.json({ ok: true, value });
}
