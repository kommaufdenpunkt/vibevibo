// Geschenke-Katalog im Jappy-Stil
// Statt pixeliger GIFs nutzen wir Unicode-Emojis als nostalgische Variante.

export const GIFTS = [
  { id: "rose",       icon: "🌹", name: "Rote Rose",         price: 5 },
  { id: "heart",      icon: "💖", name: "Herzchen",          price: 3 },
  { id: "bear",       icon: "🧸", name: "Teddy",             price: 10 },
  { id: "cake",       icon: "🍰", name: "Stück Kuchen",      price: 8 },
  { id: "beer",       icon: "🍺", name: "Bier",              price: 4 },
  { id: "cocktail",   icon: "🍹", name: "Cocktail",          price: 6 },
  { id: "pizza",      icon: "🍕", name: "Pizza",             price: 7 },
  { id: "diamond",    icon: "💎", name: "Diamant",           price: 50 },
  { id: "star",       icon: "⭐", name: "Sternchen",         price: 2 },
  { id: "rainbow",    icon: "🌈", name: "Regenbogen",        price: 12 },
  { id: "unicorn",    icon: "🦄", name: "Einhorn",           price: 25 },
  { id: "balloon",    icon: "🎈", name: "Luftballon",        price: 3 },
  { id: "champagne",  icon: "🍾", name: "Sekt",              price: 15 },
  { id: "ring",       icon: "💍", name: "Verlobungsring",    price: 99 },
  { id: "kiss",       icon: "💋", name: "Kuss",              price: 4 },
  { id: "flower",     icon: "🌷", name: "Tulpe",             price: 5 },
  { id: "music",      icon: "🎵", name: "Lieblingslied",     price: 6 },
  { id: "headphones", icon: "🎧", name: "Kopfhörer",         price: 14 },
  { id: "camera",     icon: "📷", name: "Polaroid",          price: 18 },
  { id: "cassette",   icon: "📼", name: "Mixtape",           price: 9 },
  { id: "diskette",   icon: "💾", name: "Diskette",          price: 7 },
  { id: "phone",      icon: "📱", name: "Klapphandy",        price: 11 },
  { id: "gameboy",    icon: "🎮", name: "Gameboy",           price: 20 },
  { id: "fire",       icon: "🔥", name: "Feuer & Flamme",    price: 6 },
];

export function findGift(id) {
  return GIFTS.find((g) => g.id === id);
}
