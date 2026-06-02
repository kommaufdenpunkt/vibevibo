import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getSellableByIds, commitSale, getSellDaily, getUserHome, getUserLocation } from "@/lib/db";
import {
  localMerchants, dailyFactor, sellPrice, hotItem,
  distanceToMerchant, SELL_RADIUS_M,
  MAX_SELL_VIBES_PER_DAY, SELL_DIMINISH_AFTER,
} from "@/lib/market";
import { FISH_TABLE } from "@/lib/fishing";

function resolveHotId() {
  const fishable = FISH_TABLE.filter((f) => f.cat !== "junk");
  const r = hotItem();
  return (fishable[Math.floor(r * fishable.length)] || fishable[0])?.id || null;
}

// POST { merchantId, ids:[...], lat?, lng? } — Fänge an einen Händler verkaufen.
// Du musst in ≤ 30m vom heutigen Standort des Händlers stehen.
export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const merchantId = String(body?.merchantId || "");
  const ids = Array.isArray(body?.ids) ? body.ids.map((n) => Number(n)).filter(Boolean) : [];

  const home = getUserHome(me.id);
  if (!home) {
    return NextResponse.json({ error: "Kein Zuhause-Anker gesetzt. Öffne erst die Karte." }, { status: 400 });
  }

  const now = Date.now();
  const merchants = localMerchants(home.lat, home.lng, now);
  const merchant = merchants.find((m) => m.id === merchantId);
  if (!merchant) {
    return NextResponse.json({ error: "Dieser Händler ist diese Woche nicht da." }, { status: 403 });
  }

  // Aktuelle Position: bevorzugt aus Request (frischer), sonst aus DB
  let userLat = parseFloat(body?.lat);
  let userLng = parseFloat(body?.lng);
  if (!Number.isFinite(userLat) || !Number.isFinite(userLng)) {
    const loc = getUserLocation(me.id);
    userLat = loc?.lat; userLng = loc?.lng;
  }
  if (userLat == null || userLng == null) {
    return NextResponse.json({ error: "Wir brauchen deine aktuelle Position, um zu verkaufen." }, { status: 400 });
  }

  const distM = distanceToMerchant(merchant, userLat, userLng);
  if (distM == null || distM > SELL_RADIUS_M) {
    return NextResponse.json({
      error: `Du bist ${distM} m von ${merchant.name} entfernt. Geh näher ran (≤ ${SELL_RADIUS_M} m).`,
      distanceM: distM,
    }, { status: 403 });
  }

  if (!ids.length) return NextResponse.json({ error: "Nichts ausgewählt." }, { status: 400 });

  const rows = getSellableByIds(me.id, ids);
  if (!rows.length) return NextResponse.json({ error: "Fänge nicht gefunden (schon verkauft?)." }, { status: 410 });

  const hotId = resolveHotId();
  const dayKey = new Date(now).toISOString().slice(0, 10);
  let { vibes: earnedToday, count: salesToday } = getSellDaily(me.id, dayKey);

  const payouts = [];
  let blockedByCap = false;
  for (const s of rows) {
    const isHot = hotId && s.itemId === hotId;
    let price = sellPrice(merchant, s.category, s.baseValue, dailyFactor(merchant.id, s.category, now), isHot);
    if (salesToday >= SELL_DIMINISH_AFTER) {
      const over = salesToday - SELL_DIMINISH_AFTER;
      const f = Math.max(0.25, 1 - over * 0.05);
      price = Math.max(1, Math.round(price * f));
    }
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
