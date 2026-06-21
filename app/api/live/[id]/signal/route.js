import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  getLiveStream, publishLive,
  isLiveHost, heartbeatLiveHost, maintainLiveStream,
} from "@/lib/db";

// In-Memory Rate-Limit: 30 Signale/Sekunde/User (legitime WebRTC-ICE-Floods OK,
// aber 1000+/s wäre Bot-Spam). Map<streamId:userId, [count, windowStart]>
const sigLimit = new Map();
function tooFast(key) {
  const now = Date.now();
  const win = sigLimit.get(key);
  if (!win || now - win[1] > 1000) { sigLimit.set(key, [1, now]); return false; }
  win[0]++;
  return win[0] > 30;
}

// POST { toUserId, type: 'offer'|'answer'|'ice'|'bye', payload }
// WebRTC-Signaling, leitet via SSE „rtc"-Event direkt an Empfänger weiter.
//
// 🛡 Hardening (Audit 2026-06-21):
//   - Sender MUSS aktiver Host des Streams sein (sonst SDP-Injection von außen)
//   - Empfänger MUSS aktiver Host des Streams sein (kein Cross-Stream-Hijacking)
//   - Rate-Limit: max 30 Signale/s pro User
//   - Stale-Cohost-Cleanup wird opportunistisch ausgelöst
export async function POST(req, ctx) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id } = await ctx.params;
  const sid = Number(id);
  const body = await req.json().catch(() => ({}));
  const toUserId = Number(body?.toUserId);
  const type = String(body?.type || "");
  const payload = body?.payload;
  if (!toUserId || !["offer", "answer", "ice", "bye"].includes(type)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const s = getLiveStream(sid);
  if (!s || s.status !== "live") return NextResponse.json({ error: "Stream nicht aktiv." }, { status: 410 });

  // 🛡 Beide Seiten müssen aktiver Host sein — verhindert SDP-Hijacking
  if (!isLiveHost(sid, me.id)) {
    return NextResponse.json({ error: "Du bist kein Host dieses Streams." }, { status: 403 });
  }
  if (!isLiveHost(sid, toUserId)) {
    return NextResponse.json({ error: "Empfänger ist kein Host dieses Streams." }, { status: 403 });
  }
  if (toUserId === me.id) {
    return NextResponse.json({ error: "Selbst-Signaling sinnlos." }, { status: 400 });
  }

  // 🛡 Rate-Limit gegen Signal-Flood
  if (tooFast(`${sid}:${me.id}`)) {
    return NextResponse.json({ error: "Zu schnell — Signal-Rate-Limit." }, { status: 429 });
  }

  const json = JSON.stringify(payload || {});
  if (json.length > 20_000) return NextResponse.json({ error: "Payload zu groß." }, { status: 413 });

  // 💓 Heartbeat — beweist dass der Host noch aktiv ist
  heartbeatLiveHost(sid, me.id);

  // 🧹 Opportunistic Cleanup (jede 10. Anfrage statistisch — billig)
  if (Math.random() < 0.1) {
    try { maintainLiveStream(sid); } catch {}
  }

  publishLive(sid, "rtc", { toUserId, fromUserId: me.id, kind: type, payload });
  return NextResponse.json({ ok: true });
}
