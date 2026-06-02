import { NextResponse } from "next/server";
import {
  getUserByUsername, addGift, getGifts, addNotification,
  spendCredits, adminGrantCredits,
} from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import {
  findGift, GIFT_RECIPIENT_PAYOUT_PCT, GIFT_NOTE_MAX, WRAPPING_MAP,
} from "@/lib/gifts";

// POST { giftId, note?, visibility?: 'public'|'private', wrap?: id }
// Vibes-Sink: Sender zahlt Preis + ggf. Verpackungs-Aufschlag.
// Empfänger bekommt 70% des Geschenk-Preises, 30% verschwinden.
export async function POST(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { username } = await params;
  const target = getUserByUsername(username);
  if (!target) return NextResponse.json({ error: "User nicht gefunden." }, { status: 404 });
  if (target.id === me.id) return NextResponse.json({ error: "Du kannst dir nichts selbst schenken 😄" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const giftId = String(body?.giftId || "");
  const note = String(body?.note || "").slice(0, GIFT_NOTE_MAX).trim();
  const visibility = body?.visibility === "private" ? "private" : "public";
  const wrapId = String(body?.wrap || "");
  const g = findGift(giftId);
  if (!g) return NextResponse.json({ error: "Unbekanntes Geschenk." }, { status: 400 });
  const wrap = wrapId ? WRAPPING_MAP[wrapId] : null;
  const wrapCost = wrap ? wrap.surcharge : 0;
  const total = g.price + wrapCost;

  const spend = spendCredits(me.id, total, `gift_send:${g.id}${wrap ? ":wrap:" + wrap.id : ""}`,
    { type: "to_user", id: target.id });
  if (!spend.ok) {
    return NextResponse.json({
      error: `Nicht genug Vibes (brauchst ${total} ✨, fehlen ${spend.missing}).`,
      missing: spend.missing,
    }, { status: 402 });
  }

  // Empfänger kriegt 70% des reinen Gift-Preises (Verpackung ist immer Sink).
  const payout = Math.floor((g.price * GIFT_RECIPIENT_PAYOUT_PCT) / 100);
  if (payout > 0) {
    adminGrantCredits(target.id, payout, `gift_recv:${g.id} (von @${me.username})`);
  }

  addGift(target.id, me.id, giftId, { note, vibesCost: total, visibility, wrap: wrap?.id || "" });
  addNotification({
    userId: target.id, actorId: me.id, type: "gift",
    targetType: "gift", targetId: null,
    preview: `${wrap?.emoji || ""}${g.icon} ${g.name}${note ? `: "${note.slice(0, 60)}"` : ""}`,
  });

  return NextResponse.json({
    ok: true, balance: spend.balance, gifts: getGifts(target.id, me.id),
  });
}

export async function GET(_req, { params }) {
  const me = await getSessionUser();
  const { username } = await params;
  const target = getUserByUsername(username);
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ gifts: getGifts(target.id, me?.id || null) });
}
