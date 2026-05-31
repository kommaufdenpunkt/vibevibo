import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { SHOP_MAP } from "@/lib/shop";
import {
  spendCredits, incrementInventory, tickAndPersistVibo,
  addUserCard, buffVibo,
} from "@/lib/db";
import { drawRandomCard } from "@/lib/cards";

// POST { kind }
export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const kind = String(body?.kind || "");
  const item = SHOP_MAP[kind];
  if (!item) return NextResponse.json({ error: "Unbekanntes Item." }, { status: 400 });

  const spend = spendCredits(me.id, item.price, `shop_buy:${kind}`, { type: "shop", id: 0 });
  if (!spend.ok) {
    return NextResponse.json({ error: `Zu wenig Vibes (fehlen ${spend.missing} ✨).` }, { status: 402 });
  }

  let result = { ok: true, kind, name: item.name, emoji: item.emoji, type: item.type, balance: spend.balance };

  if (item.type === "consumable") {
    const v = tickAndPersistVibo(me.id);
    // Ei-Phase aktuell deaktiviert (EGG_HATCH_HOURS=0). Falls jemand sie
    // wieder einschaltet, blockt der Check wie vorher.
    const isEgg = false;
    if (!v || v.died_at) {
      // Gekauft aber kein VIBO da → trotzdem buchen, User kann später nachholen
      incrementInventory(me.id, kind, 1);
      result.note = "Kein aktives VIBO – im Inventar gespeichert.";
    } else if (isEgg) {
      // Ei kann nichts konsumieren → lagern für später
      incrementInventory(me.id, kind, 1);
      result.note = "🥚 Ei kann noch nichts konsumieren – gelagert, anwendbar nach Schlüpfen.";
    } else {
      buffVibo(me.id, item.effect || {});
      result.applied = item.effect;
    }
  } else if (item.type === "booster" && kind === "card_pack") {
    const cards = [drawRandomCard(), drawRandomCard(), drawRandomCard()];
    for (const c of cards) addUserCard(me.id, c.id);
    result.cards = cards;
  } else if (item.type === "booster" && kind === "mystery_egg") {
    incrementInventory(me.id, "mystery_egg", 1);
    result.note = "Mysterium-Ei im Inventar (Spezies wird beim nächsten Schlüpfen freigeschaltet).";
  } else if (item.type === "furniture") {
    incrementInventory(me.id, kind, 1);
    result.note = "Im Möbel-Inventar — jetzt im VIBO-Zimmer platzieren!";
  } else {
    incrementInventory(me.id, kind, 1);
  }

  return NextResponse.json(result);
}
