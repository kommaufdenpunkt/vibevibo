import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  getLiveStream, listLiveHosts, logLiveEmote, spendCredits, adminGrantCredits,
  publishLive, userRow, getUserById, isMuted, isStreamBanned,
  heartbeatLiveHost, maintainLiveStream, isLiveHost, db,
} from "@/lib/db";
import { EMOTE_MAP, EMOTE_HOST_PAYOUT_PCT, EMOTE_MIN_INTERVAL_MS } from "@/lib/live";

const lastEmote = new Map(); // streamId:userId → ts

// POST { emoteId } — Emote senden, Vibes abziehen, Hosts kassieren 70%.
//
// 🛡 Hardening (Audit 2026-06-21):
//   - Spend + Payout + Log laufen in EINER Transaction (Race-Frei)
//   - Hosts werden INNERHALB der Transaction frisch geladen (kein "stale list")
//   - emote.cost wird server-seitig aus EMOTE_MAP gelesen (Client kann nicht
//     cost=0 spoofen — wurde nie aus body gelesen, aber explicit dokumentiert)
//   - Heartbeat falls Sender Host ist
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

  // 🛡 ATOMARE TRANSACTION: Spend + Payout + Log in einem Rutsch.
  // Falls irgendetwas crashed → SQLite rollt komplett zurück, keine
  // verlorenen Vibes, keine Vibes-aus-dem-Nichts.
  let result;
  try {
    result = db().transaction(() => {
      const spend = spendCredits(me.id, emote.cost, `live_emote:${emote.id}`, { type: "live_stream", id: sid });
      if (!spend.ok) {
        return { ok: false, missing: spend.missing };
      }
      // Hosts INNERHALB der Transaction laden — falls jemand grad ausgestiegen ist
      // kriegen wir die aktuelle Liste (kein "stale snapshot").
      const hosts = listLiveHosts(sid);
      if (hosts.length > 0) {
        const total = Math.floor((emote.cost * EMOTE_HOST_PAYOUT_PCT) / 100);
        const share = Math.floor(total / hosts.length);
        if (share > 0) {
          for (const h of hosts) {
            adminGrantCredits(h.userId, share, `live_emote_received:${emote.id} (von @${me.username})`);
          }
        }
      }
      logLiveEmote(sid, me.id, emote.id, emote.cost);
      return { ok: true, balance: spend.balance };
    })();
  } catch (e) {
    return NextResponse.json({ error: "Verarbeitung fehlgeschlagen — Vibes wurden NICHT belastet." }, { status: 500 });
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
