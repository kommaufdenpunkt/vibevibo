import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  getLiveStream, publishLive, userRow, getUserById,
  isMuted, isStreamBanned,
  heartbeatLiveHost, maintainLiveStream, isLiveHost,
  processLiveEmotePayment,
} from "@/lib/db";
import { EMOTE_MAP, EMOTE_HOST_PAYOUT_PCT, EMOTE_MIN_INTERVAL_MS } from "@/lib/live";

const lastEmote = new Map(); // streamId:userId → ts

// POST { emoteId } — Emote senden, Vibes abziehen, Hosts kassieren 70%.
//
// 🛡 Hardening (Audit 2026-06-21):
//   - Spend + Payout + Log laufen in EINER Transaction (Race-Frei)
//     via processLiveEmotePayment() — siehe lib/db.js
//   - Hosts werden INNERHALB der Transaction frisch geladen (kein stale snapshot)
//   - emote.cost wird server-seitig aus EMOTE_MAP gelesen (Client kann nicht spoofen)
//   - Heartbeat falls Sender Host ist + Stale-Cleanup opportunistisch
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

  // 🛡 ATOMARE TRANSACTION: Spend + Payout + Log in EINER db().transaction().
  // Wrapped in lib/db.js → processLiveEmotePayment.
  const result = processLiveEmotePayment(sid, me.id, me.username, emote, EMOTE_HOST_PAYOUT_PCT);
  if (result?.error) {
    return NextResponse.json({ error: "Verarbeitung fehlgeschlagen — Vibes NICHT belastet." }, { status: 500 });
  }
  if (!result.ok) {
    return NextResponse.json({
      error: `Nicht genug Vibes (brauchst ${emote.cost} ✨, fehlen ${result.missing}).`,
      missing: result.missing,
    }, { status: 402 });
  }

  // 💓 Wenn Sender selbst Host ist → Heartbeat
  try { if (isLiveHost(sid, me.id)) heartbeatLiveHost(sid, me.id); } catch {}

  // 🧹 Opportunistic Cleanup (10%)
  if (Math.random() < 0.1) {
    try { maintainLiveStream(sid); } catch {}
  }

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

  return NextResponse.json({ ok: true, balance: result.balance });
}
