import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { buyPremium } from "@/lib/db";

// POST { kind, payload? }
export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  try {
    const r = buyPremium(me.id, String(body?.kind || ""), body?.payload || {});
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: e.message || "fehler" }, { status: 400 });
  }
}
