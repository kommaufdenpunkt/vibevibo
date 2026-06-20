// 💬 Einzel-Nachrichten-Aktion — Pin/Unpin/Archive/Unarchive
//
// PATCH { action: "pin"|"unpin"|"archive"|"unarchive" }

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { togglePinMessage, toggleArchiveMessage } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id } = await params;
  const messageId = Number(id);
  if (!messageId) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  let body = {};
  try { body = await req.json(); } catch {}
  const action = String(body?.action || "").toLowerCase();

  try {
    if (action === "pin" || action === "unpin") {
      const r = togglePinMessage(messageId, me.id);
      return NextResponse.json({ ok: true, pinned: r.pinned });
    }
    if (action === "archive" || action === "unarchive") {
      const r = toggleArchiveMessage(messageId, me.id);
      return NextResponse.json({ ok: true, archived: r.archived });
    }
    return NextResponse.json({ error: "Unbekannte Action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
