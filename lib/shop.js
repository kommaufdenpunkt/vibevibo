// VIBO-Shop: Items mit Vibes kaufen.
// 'consumable' wirkt sofort, 'cosmetic' / 'furniture' landet im Inventar.
import { FURNITURE } from "@/lib/room";

export const SHOP_ITEMS = [
  // Konsumierbar — sofortige VIBO-Wirkung
  { kind: "feast",        name: "Festmahl",        emoji: "🍱", price: 20, type: "consumable", description: "Setzt Hunger auf 100", effect: { hunger: 100 } },
  { kind: "potion",       name: "Heiltrank",       emoji: "🧪", price: 30, type: "consumable", description: "+50 Gesundheit", effect: { health: 50 } },
  { kind: "spa_day",      name: "Wellness-Tag",    emoji: "🛁", price: 25, type: "consumable", description: "Putzt komplett", effect: { hygiene: 100 } },
  { kind: "love_potion",  name: "Liebes-Trank",    emoji: "💗", price: 35, type: "consumable", description: "Affection auf 100", effect: { affection: 100 } },

  // Booster
  { kind: "card_pack",    name: "Sammelkarten-Pack", emoji: "🎁", price: 25, type: "booster", description: "3 zufällige Sammelkarten" },
  { kind: "mystery_egg",  name: "Mysterium-Ei",     emoji: "🥚", price: 80, type: "booster", description: "Vielleicht eine neue Spezies?!" },

  // Kosmetik (landet im Inventar)
  { kind: "hat_pirate",   name: "Piraten-Hut",     emoji: "🏴‍☠️", price: 50,  type: "cosmetic", description: "Für dein VIBO" },
  { kind: "hat_crown",    name: "Krone",           emoji: "👑",   price: 120, type: "cosmetic", description: "Königlich (selten)" },
  { kind: "hat_party",    name: "Partyhut",        emoji: "🥳",   price: 35,  type: "cosmetic", description: "Geburtstag jeden Tag" },
  { kind: "sticker_xmas", name: "Weihnachts-Sticker", emoji: "🎄", price: 15, type: "cosmetic", description: "Profil-Verschönerung" },
  { kind: "sticker_heart",name: "Herz-Sticker",    emoji: "💖",   price: 12,  type: "cosmetic", description: "Profil-Verschönerung" },

  // Möbel für die VIBO-Wohnung (landen im Inventar, dann platzieren)
  ...FURNITURE.map((f) => ({
    kind: f.kind,
    name: f.name,
    emoji: f.emoji,
    price: f.price,
    type: "furniture",
    description: "Stell's in dein VIBO-Zuhause",
  })),
];

export const SHOP_MAP = Object.fromEntries(SHOP_ITEMS.map((i) => [i.kind, i]));
