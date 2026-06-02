import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  getLiveStream, listLiveHosts, logLiveEmote, spendCredits, adminGrantCredits,
  publishLive, userRow, getUserById, isMuted, isStreamBanned,
} from "@/lib/db";
import { EMOTE_MAP, EMOTE_HOST_PAYOUT_PCT, EMOTE_MIN_INTERVAL_MS } from "@/lib/live";

const lastEmote = new Map(); // streamId:userId → ts

// POST { emoteId }  — Emote senden, Vibes abziehen, Hosts kassieren 70%, Rest Sink.
export async function POST(req, ctx) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id } = await ctx.params;
  const sid = Number(id);
  const body = await req.json().catch(() => ({}));
  const emoteId = String(body?.emoteId || "");
  const emote = EMOTE_MAP[emoteId];
  if (!emote) return NextResponse.json({ error: "Unbekanntes Emote." }, { status: 400 });

  const s = getLiveStream(sid);
  if (!s || s.status !== "live") return NextResponse.json({ error: "Stream nicht aktiv." }, { status: 410 });

  if (isStreamBanned(sid, me.id)) return NextResponse.json({ error: "Du bist gebannt." }, { status: 403 });
  if (isMuted(sid, me.id)) return NextResponse.json({ error: "Du bist gemutet." }, { status: 403 });

  const key = `${sid}:${me.id}`;
  const now = Date.now();
  if ((lastEmote.get(key) || 0) > now - EMOTE_MIN_INTERVAL_MS) {
    return NextResponse.json({ error: "Zu schnell." }, { status: 429 });
  }
  lastEmote.set(key, now);

  // Vibes abziehen (atomar)
  const spend = spendCredits(me.id, emote.cost, `live_emote:${emote.id}`, { type: "live_stream", id: sid });
  if (!spend.ok) {
    return NextResponse.json({
      error: `Nicht genug Vibes (brauchst ${emote.cost} ✨, fehlen ${spend.missing}).`,
      missing: spend.missing,
    }, { status: 402 });
  }

  // 70% an aktive Hosts gleichmäßig verteilen — Rest wird Sink (Inflation-Bremse).
  const hosts = listLiveHosts(sid);
  if (hosts.length > 0) {
    const total = Math.floor((emote.cost * EMOTE_HOST_PAYOUT_PCT) / 100);
    const share = Math.floor(total / hosts.length);
    for (const h of hosts) {
      if (share > 0) {
        adminGrantCredits(h.userId, share, `live_emote_received:${emote.id} (von @${me.username})`);
      }
    }
  }

  logLiveEmote(sid, me.id, emote.id, emote.cost);
  const u = userRow(getUserById(me.id));
  publishLive(sid, "emote", {
    emoteId: emote.id, emoji: emote.emoji, size: emote.size, duration: emote.duration,
    cost: emote.cost,
    from: {
      id: me.id, username: u.username, displayName: u.displayName,
      gender: u.gender, age: u.age,
    },
    at: now,
  });

  return NextResponse.json({ ok: true, balance: spend.balance });
}
