// VibeVibo Sammelkarten — werden via Welt-Pickup ('card') oder Shop-Pack erhalten.
// 20 verschiedene Karten, 4 Raritäten.

export const CARDS = [
  // common
  { id: "blume",      name: "Blümchen",     emoji: "🌸", rarity: "common",    color: "#fda4af" },
  { id: "kaffee",     name: "Kaffee",       emoji: "☕",  rarity: "common",    color: "#92400e" },
  { id: "wolke",      name: "Wolke",        emoji: "☁️", rarity: "common",    color: "#cbd5e1" },
  { id: "stein",      name: "Stein",        emoji: "🪨", rarity: "common",    color: "#78716c" },
  { id: "blatt",      name: "Blatt",        emoji: "🍃", rarity: "common",    color: "#65a30d" },
  // uncommon
  { id: "regenbogen", name: "Regenbogen",   emoji: "🌈", rarity: "uncommon",  color: "#a855f7" },
  { id: "stern",      name: "Stern",        emoji: "⭐", rarity: "uncommon",  color: "#fbbf24" },
  { id: "musik",      name: "Musikbox",     emoji: "🎵", rarity: "uncommon",  color: "#ec4899" },
  { id: "kuchen",     name: "Kuchenstück",  emoji: "🍰", rarity: "uncommon",  color: "#fb7185" },
  { id: "ufo",        name: "UFO",          emoji: "🛸", rarity: "uncommon",  color: "#06b6d4" },
  // rare
  { id: "drache",     name: "Drache",       emoji: "🐲", rarity: "rare",      color: "#7c3aed" },
  { id: "krone",      name: "Krone",        emoji: "👑", rarity: "rare",      color: "#eab308" },
  { id: "raumschiff", name: "Raumschiff",   emoji: "🚀", rarity: "rare",      color: "#0ea5e9" },
  { id: "phoenix",    name: "Phönix",       emoji: "🔥", rarity: "rare",      color: "#ef4444" },
  { id: "kristall",   name: "Kristall",     emoji: "💎", rarity: "rare",      color: "#22d3ee" },
  // legendary
  { id: "einhorn",    name: "Einhorn",      emoji: "🦄", rarity: "legendary", color: "#d946ef" },
  { id: "weltraum",   name: "Galaxie",      emoji: "🌌", rarity: "legendary", color: "#6366f1" },
  { id: "vibo_gold",  name: "Goldenes VIBO",emoji: "🥇", rarity: "legendary", color: "#facc15" },
  { id: "herz",       name: "Pixel-Herz",   emoji: "❤️‍🔥",rarity: "legendary", color: "#dc2626" },
  { id: "regenbow_dragon", name: "Regenbogen-Drache", emoji: "🐉", rarity: "legendary", color: "#a78bfa" },
];

export const CARDS_MAP = Object.fromEntries(CARDS.map((c) => [c.id, c]));

const WEIGHTS = { common: 60, uncommon: 25, rare: 12, legendary: 3 };

export function drawRandomCard() {
  const total = Object.values(WEIGHTS).reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  let pickedRarity = "common";
  for (const [rar, w] of Object.entries(WEIGHTS)) {
    if ((r -= w) <= 0) { pickedRarity = rar; break; }
  }
  const pool = CARDS.filter((c) => c.rarity === pickedRarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

export const RARITY_COLORS = {
  common:    "#9ca3af",
  uncommon:  "#22c55e",
  rare:      "#3b82f6",
  legendary: "#fbbf24",
};
export const RARITY_LABELS = {
  common: "Gewöhnlich", uncommon: "Ungewöhnlich", rare: "Selten", legendary: "Legendär",
};
