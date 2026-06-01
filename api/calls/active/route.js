import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listMyActiveCalls } from "@/lib/db";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  return NextResponse.json({ calls: listMyActiveCalls(me.id) });
}
