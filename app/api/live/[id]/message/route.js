import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  getLiveStream, addLiveChatMessage, publishLive, userRow, getUserById,
  isMuted as isStreamMuted, isStreamBanned, getWomenShieldFields,
} from "@/lib/db";
import { isMuted as isCommMuted, checkTextPost } from "@/lib/moderate";
import { CHAT_MAX_LEN, CHAT_MIN_INTERVAL_MS } from "@/lib/live";

// Pro-User-Throttle in-process (genug für Anti-Spam, nicht für Cluster)
const lastChat = new Map(); // key: streamId:userId → ts

export async function POST(req, ctx) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  if (isCommMuted(me.id)) {
    return NextResponse.json({ error: "Du hast einen Kommunikationsbann." }, { status: 403 });
  }
  const { id } = await ctx.params;
  const sid = Number(id);
  const body = await req.json().catch(() => ({}));
  const text = String(body?.text || "").trim();
  if (!text) return NextResponse.json({ error: "leer" }, { status: 400 });
  if (text.length > CHAT_MAX_LEN) return NextResponse.json({ error: "zu lang" }, { status: 400 });

  const s = getLiveStream(sid);
  if (!s || s.status !== "live") return NextResponse.json({ error: "Stream nicht aktiv." }, { status: 410 });

  if (isStreamBanned(sid, me.id)) return NextResponse.json({ error: "Du bist in diesem Stream gebannt." }, { status: 403 });
  const mutedUntil = isStreamMuted(sid, me.id);
  if (mutedUntil) {
    const min = Math.ceil((mutedUntil - Date.now()) / 60_000);
    return NextResponse.json({ error: `Du bist gemutet — noch ${min} min.`, mutedUntilAt: mutedUntil }, { status: 403 });
  }

  // 🛡 Streamer-Shield: Strict-Modus wenn Host weiblich + Mann schreibt,
  // oder wenn der Host live_strict_mode aktiv hat.
  const hostGender = s.owner?.gender || "";
  const senderGender = me.gender || "";
  const hostShield = typeof getWomenShieldFields === "function"
    ? getWomenShieldFields(s.ownerId) : null;
  const streamerStrict = !!hostShield?.live_strict_mode;

  const verdict = await checkTextPost(me.id, "live_chat", text, {
    strict: streamerStrict,
    senderGender,
    recipientGender: hostGender,
  });
  if (!verdict.ok) {
    return NextResponse.json({
      error: `Fidolin hat das blockiert: ${verdict.reason}`,
    }, { status: 422 });
  }

  // Anti-Spam-Throttle
  const key = `${sid}:${me.id}`;
  const now = Date.now();
  if ((lastChat.get(key) || 0) > now - CHAT_MIN_INTERVAL_MS) {
    return NextResponse.json({ error: "Etwas langsamer." }, { status: 429 });
  }
  lastChat.set(key, now);

  const cid = addLiveChatMessage(sid, me.id, text);
  const u = userRow(getUserById(me.id));
  const msg = {
    id: cid, text, at: now,
    user: {
      id: me.id, username: u.username, displayName: u.displayName,
      gender: u.gender, age: u.age, avatarUrl: u.avatarUrl,
      lastSeen: u.lastSeen, premiumBadges: u.premiumBadges,
    },
  };
  publishLive(sid, "chat", msg);
  return NextResponse.json({ ok: true, message: msg });
}
