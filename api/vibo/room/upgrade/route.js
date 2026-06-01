import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { upgradeUserRoom } from "@/lib/db";

export async function POST() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  try {
    const r = upgradeUserRoom(me.id);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ error: e.message || "fehler" }, { status: 400 });
  }
}
