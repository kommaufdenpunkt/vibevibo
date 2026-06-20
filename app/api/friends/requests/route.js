import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listIncomingRequests, listOutgoingRequests, countPendingIncoming } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  return NextResponse.json({
    incoming: listIncomingRequests(me.id, { status: "pending", limit: 50 }),
    outgoing: listOutgoingRequests(me.id, { status: "pending", limit: 50 }),
    incomingHistory: listIncomingRequests(me.id, { status: "declined", limit: 20 }),
    pendingCount: countPendingIncoming(me.id),
  });
}
