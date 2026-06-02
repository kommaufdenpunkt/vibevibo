import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listSellables, listFishRecords, getSellDaily } from "@/lib/db";
import {
  weeklyMerchants, dailyFactor, isOpen, sellPrice, hotItem,
  MAX_SELL_VIBES_PER_DAY,
} from "@/lib/market";
import { FISH_TABLE, FISH_MAP } from "@/lib/fishing";

// Tagesgesuch auflösen: ein Fisch (kein Müll) wird heute doppelt bezahlt
function resolveHotItem() {
  const fishable = FISH_TABLE.filter((f) => f.cat !== "junk");
  const r = hotItem();
  const f = fishable[Math.floor(r * fishable.length)] || fishable[0];
  return f ? { id: f.id, name: f.name, emoji: f.emoji } : null;
}

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const now = Date.now();
  const merchants = weeklyMerchants(now);
  const hot = resolveHotItem();
  const dayKey = new Date(now).toISOString().slice(0, 10);
  const daily = getSellDaily(me.id, dayKey);

  // Händler mit Status + Beispiel-Preisen pro Kategorie
  const cats = ["fish", "treasure", "junk", "legendary"];
  const merchantData = merchants.map((m) => {
    const open = isOpen(m, now);
    const factors = {};
    for (const c of cats) factors[c] = dailyFactor(m.id, c, now);
    return {
      id: m.id, name: m.name, emoji: m.emoji, blurb: m.blurb,
      open, openHours: m.open,
      mult: m.mult, factors,
    };
  });

  // Inventar (unverkaufte Fänge) + Live-Preis beim besten offenen Händler
  const sellables = listSellables(me.id);
  const openMerchants = merchants.filter((m) => isOpen(m, now));
  const items = sellables.map((s) => {
    const isHot = hot && s.itemId === hot.id;
    // bester Preis unter aktuell offenen Händlern
    let best = null;
    for (const m of openMerchants) {
      const p = sellPrice(m, s.category, s.baseValue, dailyFactor(m.id, s.category, now), isHot);
      if (!best || p > best.price) best = { merchantId: m.id, price: p };
    }
    return { ...s, isHot, best };
  });

  return NextResponse.json({
    week: merchantData,
    hot,
    items,
    records: listFishRecords(me.id).slice(0, 12),
    sellCap: { earnedToday: daily.vibes, max: MAX_SELL_VIBES_PER_DAY, salesToday: daily.count },
    serverHour: new Date(now).getHours(),
  });
}
