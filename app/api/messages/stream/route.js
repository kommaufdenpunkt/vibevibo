import { getSessionUser } from "@/lib/auth";
import { subscribe, getUserById } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return new Response("auth required", { status: 401 });

  const encoder = new TextEncoder();
  let unsubscribe = null;
  let pingInterval = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event, data) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {}
      };

      send("ready", { ok: true });

      unsubscribe = subscribe(me.id, (msg) => {
        const fromUser = getUserById(msg.fromUserId);
        const toUser = getUserById(msg.toUserId);
        send("message", {
          id: msg.id,
          text: msg.text,
          at: msg.at,
          from: fromUser ? { username: fromUser.username, displayName: fromUser.displayName, emoji: fromUser.emoji } : null,
          to: toUser ? { username: toUser.username, displayName: toUser.displayName, emoji: toUser.emoji } : null,
          fromMe: msg.fromUserId === me.id,
        });
      });

      pingInterval = setInterval(() => {
        try { controller.enqueue(encoder.encode(": ping\n\n")); } catch {}
      }, 25000);
    },
    cancel() {
      if (unsubscribe) unsubscribe();
      if (pingInterval) clearInterval(pingInterval);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
