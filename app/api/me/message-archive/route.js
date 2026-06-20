// 💬 Mein Archiv — alle archivierten Nachrichten (egal ob Sender oder Empfänger).

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listArchivedMessagesForUser } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const messages = listArchivedMessagesForUser(me.id);
  return NextResponse.json({ messages, myUserId: me.id });
}
