import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  listSellables, listFishRecords, getSellDaily,
  getUserHome, setUserHome, getUserLocation,
} from "@/lib/db";
import {
  localMerchants, dailyFactor, sellPrice, hotItem,
  distanceToMerchant, inSellRange,
  MAX_SELL_VIBES_PER_DAY, SELL_RADIUS_M,
} from "@/lib/market";
import { FISH_TABLE } from "@/lib/fishing";

// Tagesgesuch auflösen: ein Fisch (kein Müll) wird heute doppelt bezahlt.
function resolveHotItem() {
  const fishable = FISH_TABLE.filter((f) => f.cat !== "junk");
  const r = hotItem();
  const f = fishable[Math.floor(r * fishable.length)] || fishable[0];
  return f ? { id: f.id, name: f.name, emoji: f.emoji } : null;
}

// GET ?lat=&lng=  — wenn lat/lng übergeben und noch kein Anker existiert,
// wird das als „Zuhause" gesetzt. Sonst nutzen wir die letzte bekannte Position.
export async function GET(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const url = new URL(req.url);
  const qLat = parseFloat(url.searchParams.get("lat") || "");
  const qLng = parseFloat(url.searchParams.get("lng") || "");
  const hasGeo = Number.isFinite(qLat) && Number.isFinite(qLng);

  let home = getUserHome(me.id);
  if (!home && hasGeo) home = setUserHome(me.id, qLat, qLng);

  if (!home) {
    return NextResponse.json({
      needsHome: true,
      message: "Wir brauchen einmalig deine Position, damit wir die Händler in deine Nachbarschaft stellen können.",
      sellRadiusM: SELL_RADIUS_M,
    });
  }

  // Aktuelle Position (für „Du bist X m entfernt")
  let userLat = hasGeo ? qLat : null;
  let userLng = hasGeo ? qLng : null;
  if (userLat == null) {
    const loc = getUserLocation(me.id);
    if (loc && loc.lat != null) { userLat = loc.lat; userLng = loc.lng; }
  }

  const now = Date.now();
  const merchants = localMerchants(home.lat, home.lng, now);
  const hot = resolveHotItem();
  const dayKey = new Date(now).toISOString().slice(0, 10);
  const daily = getSellDaily(me.id, dayKey);

  const cats = ["fish", "treasure", "junk", "legendary"];
  const merchantData = merchants.map((m) => {
    const factors = {};
    for (const c of cats) factors[c] = dailyFactor(m.id, c, now);
    const distM = distanceToMerchant(m, userLat, userLng);
    return {
      id: m.id, name: m.name, emoji: m.emoji, blurb: m.blurb,
      lat: m.lat, lng: m.lng,
      slot: m.slot, slotLabel: m.slotLabel,
      anchorDistM: m.anchorDistM,
      distanceM: distM,
      inRange: distM != null && distM <= SELL_RADIUS_M,
      mult: m.mult, factors,
    };
  });

  // Inventar (unverkaufte Fänge) + Live-Preis beim besten Händler in Reichweite.
  // „Behalten"-Fänge sind dabei (UI zeigt sie als Aquarium), aber werden nie verkauft.
  const sellables = listSellables(me.id);
  const reachable = merchantData.filter((m) => m.inRange);
  const items = sellables.map((s) => {
    const isHot = hot && s.itemId === hot.id;
    let best = null;
    for (const m of reachable) {
      const p = sellPrice(m, s.category, s.baseValue, m.factors[s.category], isHot);
      if (!best || p > best.price) best = { merchantId: m.id, price: p };
    }
    return { ...s, kept: !!s.kept, isHot, best };
  });

  return NextResponse.json({
    home: { lat: home.lat, lng: home.lng, setAt: home.setAt },
    user: userLat != null ? { lat: userLat, lng: userLng } : null,
    week: merchantData,
    hot,
    items,
    records: listFishRecords(me.id).slice(0, 12),
    sellCap: { earnedToday: daily.vibes, max: MAX_SELL_VIBES_PER_DAY, salesToday: daily.count },
    sellRadiusM: SELL_RADIUS_M,
  });
}

// POST { lat, lng, resetHome: true } — Anker neu setzen (z.B. Umzug).
export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const lat = parseFloat(body?.lat);
  const lng = parseFloat(body?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat/lng erforderlich" }, { status: 400 });
  }
  const home = setUserHome(me.id, lat, lng);
  return NextResponse.json({ ok: true, home });
}
