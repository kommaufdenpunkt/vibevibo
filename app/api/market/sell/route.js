import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getSellableByIds, commitSale, getSellDaily } from "@/lib/db";
import {
  MERCHANT_MAP, weeklyMerchants, dailyFactor, isOpen, sellPrice, hotItem,
  MAX_SELL_VIBES_PER_DAY, SELL_DIMINISH_AFTER,
} from "@/lib/market";
import { FISH_TABLE } from "@/lib/fishing";

function resolveHotId() {
  const fishable = FISH_TABLE.filter((f) => f.cat !== "junk");
  const r = hotItem();
  return (fishable[Math.floor(r * fishable.length)] || fishable[0])?.id || null;
}

// POST { merchantId, ids:[...] } — Fänge an einen Händler verkaufen
export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const merchantId = String(body?.merchantId || "");
  const ids = Array.isArray(body?.ids) ? body.ids.map((n) => Number(n)).filter(Boolean) : [];

  const merchant = MERCHANT_MAP[merchantId];
  if (!merchant) return NextResponse.json({ error: "Unbekannter Händler." }, { status: 400 });

  const now = Date.now();
  // Händler muss diese Woche da + gerade offen sein
  const thisWeek = weeklyMerchants(now).some((m) => m.id === merchantId);
  if (!thisWeek) return NextResponse.json({ error: "Dieser Händler ist diese Woche nicht da." }, { status: 403 });
  if (!isOpen(merchant, now)) {
    const [a, b] = merchant.open;
    return NextResponse.json({ error: `${merchant.name} hat geschlossen (offen ${a}–${b} Uhr).` }, { status: 403 });
  }
  if (!ids.length) return NextResponse.json({ error: "Nichts ausgewählt." }, { status: 400 });

  const rows = getSellableByIds(me.id, ids);
  if (!rows.length) return NextResponse.json({ error: "Fänge nicht gefunden (schon verkauft?)." }, { status: 410 });

  const hotId = resolveHotId();
  const dayKey = new Date(now).toISOString().slice(0, 10);
  let { vibes: earnedToday, count: salesToday } = getSellDaily(me.id, dayKey);

  // Preise berechnen + Anti-Inflation: Tages-Cap + Diminishing pro Verkauf
  const payouts = [];
  let blockedByCap = false;
  for (const s of rows) {
    const isHot = hotId && s.itemId === hotId;
    let price = sellPrice(merchant, s.category, s.baseValue, dailyFactor(merchant.id, s.category, now), isHot);
    // Diminishing: ab N Verkäufen am Tag sinkt die Auszahlung
    if (salesToday >= SELL_DIMINISH_AFTER) {
      const over = salesToday - SELL_DIMINISH_AFTER;
      const f = Math.max(0.25, 1 - over * 0.05);
      price = Math.max(1, Math.round(price * f));
    }
    // Tages-Cap
    if (earnedToday + price > MAX_SELL_VIBES_PER_DAY) {
      const remaining = MAX_SELL_VIBES_PER_DAY - earnedToday;
      if (remaining <= 0) { blockedByCap = true; break; }
      price = remaining;
    }
    payouts.push({ id: s.id, vibes: price });
    earnedToday += price;
    salesToday += 1;
  }

  if (!payouts.length) {
    return NextResponse.json({ error: "Tages-Verkaufslimit erreicht (120 ✨). Morgen wieder!" }, { status: 429 });
  }

  const res = commitSale(me.id, payouts);
  return NextResponse.json({
    ok: true,
    sold: res.sold,
    vibes: res.vibes,
    cappedSome: blockedByCap,
    earnedToday: earnedToday,
    merchant: { id: merchant.id, name: merchant.name, emoji: merchant.emoji },
  });
}
