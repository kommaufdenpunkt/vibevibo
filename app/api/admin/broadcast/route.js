import { NextResponse } from "next/server";
import { isAdminRequest, adminEnabled } from "@/lib/admin";
import { broadcastSystemMessage, publishToUser } from "@/lib/db";
import { sendPushToUser } from "@/lib/push";

// POST { text } — System-Broadcast an alle aktiven User als DM von "system"
export async function POST(req) {
  if (!adminEnabled()) return NextResponse.json({ error: "Admin nicht konfiguriert." }, { status: 503 });
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const text = String(body?.text || "").trim();
  if (!text) return NextResponse.json({ error: "Text fehlt." }, { status: 400 });
  if (text.length > 1000) return NextResponse.json({ error: "Max 1000 Zeichen." }, { status: 400 });
  try {
    const r = broadcastSystemMessage(text);
    // SSE-Live-Push + Web-Push parallel (best-effort, blocken nicht)
    for (const item of r.messageIds) {
      try { publishToUser(item.userId, "message", { id: item.messageId }); } catch {}
      sendPushToUser(item.userId, {
        title: "VibeVibo",
        body: text.slice(0, 200),
        url: "/messenger",
        tag: "vv-broadcast",
        kind: "system",
        fromUsername: "system",
        fromDisplayName: "VibeVibo",
        fromUserId: r.fromUserId,
      }).catch(() => {});
    }
    return NextResponse.json({ ok: true, recipients: r.recipients });
  } catch (e) {
    return NextResponse.json({ error: e.message || "fehler" }, { status: 400 });
  }
}
