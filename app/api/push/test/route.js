import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push";

// POST — schickt sich selbst eine Test-Push, damit man Lockscreen prüfen kann.
// Sperr das Handy, dann tippe „Test" — Push muss als Banner erscheinen.
export async function POST() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const r = await sendPushToUser(me.id, {
    title: "🔔 Test-Benachrichtigung",
    body: "Wenn du das auf dem Sperrbildschirm siehst, klappt alles!",
    url: "/messenger",
    tag: "vv-test",
    kind: "message",
  });
  return NextResponse.json({ ok: true, ...r });
}
