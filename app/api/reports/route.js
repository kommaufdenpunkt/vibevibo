import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { addMessageReport } from "@/lib/db";

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { messageId, reason } = await req.json();
  const mid = Number(messageId);
  if (!mid) return NextResponse.json({ error: "invalid messageId" }, { status: 400 });
  const id = addMessageReport(mid, me.id, reason);
  return NextResponse.json({ ok: true, id });
}
