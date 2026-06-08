import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getShieldSettings, setShieldSettings } from "@/lib/db";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  return NextResponse.json(getShieldSettings(me.id));
}
export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  let body; try { body = await req.json(); } catch (e) { body = {}; }
  return NextResponse.json(setShieldSettings(me.id, body || {}));
}
