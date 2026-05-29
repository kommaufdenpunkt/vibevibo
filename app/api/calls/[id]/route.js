import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getCall, isCallParticipant } from "@/lib/db";

export async function GET(_req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id } = await params;
  const call = getCall(Number(id));
  if (!call) return NextResponse.json({ error: "not found" }, { status: 404 });
  // Eingeladene dürfen den Call abfragen (1on1: partner; group: room member)
  if (!isCallParticipant(call.id, me.id)) {
    if (call.type === "1on1" && me.id !== call.partnerId && me.id !== call.initiatorId)
      return NextResponse.json({ error: "kein zugriff" }, { status: 403 });
  }
  return NextResponse.json({ call });
}
