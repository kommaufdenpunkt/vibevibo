// Server-Sent-Events für einen Live-Stream: chat / emote / viewer / host / ended / rtc.
// Auch RTC-Signaling läuft hier durch (Empfänger bekommt's per SSE direkt).

import { getSessionUser } from "@/lib/auth";
import { getLiveStream, subscribeLive, heartbeatViewer, isLiveHost } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req, ctx) {
  const me = await getSessionUser();
  if (!me) return new Response("auth required", { status: 401 });
  const { id } = await ctx.params;
  const sid = Number(id);
  const s = getLiveStream(sid);
  if (!s) return new Response("not found", { status: 404 });

  const encoder = new TextEncoder();
  let closed = false;
  let heartbeatTimer = null;
  let viewerTimer = null;
  let unsubscribe = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)); }
        catch { closed = true; }
      };

      send({ type: "hello", userId: me.id });

      // SSE-Heartbeat damit Proxy nicht killt
      heartbeatTimer = setInterval(() => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(`: ping\n\n`)); } catch { closed = true; }
      }, 25_000);

      // Als Viewer Heartbeat (nur wenn nicht Host)
      const isHost = isLiveHost(sid, me.id);
      if (!isHost) {
        // Heartbeat sofort + alle 30s
        heartbeatViewer(sid, me.id);
        viewerTimer = setInterval(() => {
          if (closed) return;
          try { heartbeatViewer(sid, me.id); } catch {}
        }, 30_000);
      }

      // Subscribe auf alle Events des Streams
      unsubscribe = subscribeLive(sid, (env) => {
        // RTC nur dem Empfänger zustellen (gerichtet)
        if (env.type === "rtc" && env.data?.toUserId !== me.id) return;
        send(env);
      });
    },
    cancel() {
      closed = true;
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (viewerTimer) clearInterval(viewerTimer);
      if (unsubscribe) unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
