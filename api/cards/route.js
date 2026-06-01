import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listUserCards } from "@/lib/db";
import { CARDS, CARDS_MAP, RARITY_COLORS, RARITY_LABELS } from "@/lib/cards";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const owned = listUserCards(me.id);
  const ownedMap = Object.fromEntries(owned.map((o) => [o.cardId, o]));
  const all = CARDS.map((c) => {
    const o = ownedMap[c.id];
    return {
      ...c,
      rarityLabel: RARITY_LABELS[c.rarity],
      rarityColor: RARITY_COLORS[c.rarity],
      owned: !!o,
      count: o?.count || 0,
      firstAt: o?.firstAt || null,
    };
  });
  return NextResponse.json({
    cards: all,
    stats: {
      total: CARDS.length,
      owned: owned.length,
      byRarity: {
        common: all.filter((c) => c.rarity === "common" && c.owned).length,
        uncommon: all.filter((c) => c.rarity === "uncommon" && c.owned).length,
        rare: all.filter((c) => c.rarity === "rare" && c.owned).length,
        legendary: all.filter((c) => c.rarity === "legendary" && c.owned).length,
      },
    },
  });
}
