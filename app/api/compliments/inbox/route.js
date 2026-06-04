import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { complimentsReceived, markComplimentsSeen } from "@/lib/db";

// GET /api/compliments/inbox — eigene empfangene Komplimente.
// markiert automatisch alle als gesehen.
export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const items = complimentsReceived(me.id);
  markComplimentsSeen(me.id);
  return NextResponse.json({ items });
}
