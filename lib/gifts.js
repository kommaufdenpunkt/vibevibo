// 🎁 Geschenke-Katalog (Jappy-Style): bleiben dauerhaft auf der Profil-Vitrine,
// im Gegensatz zu Live-Emotes (die fliegen weg). Kategorisiert nach Anlass.
// Vibes-Sink: Sender zahlt, Empfänger bekommt 70% gutgeschrieben, 30% verschwinden.

export const GIFT_CATEGORIES = [
  { id: "love",      label: "💗 Liebe & Romantik" },
  { id: "sweet",     label: "🍬 Süßes" },
  { id: "cute",      label: "🧸 Süße Tiere" },
  { id: "party",     label: "🎉 Party" },
  { id: "nostalgia", label: "📼 Nostalgie" },
  { id: "luxury",    label: "✨ Edel" },
  { id: "nature",    label: "🌷 Natur" },
  { id: "food",      label: "🍕 Snacks" },
  { id: "quirky",    label: "🤪 Quatsch" },
];

export const GIFTS = [
  // 💗 Liebe & Romantik
  { id: "rose",         icon: "🌹",  name: "Rote Rose",            cat: "love",      price: 5  },
  { id: "heart",        icon: "💖",  name: "Herzchen",             cat: "love",      price: 3  },
  { id: "kiss",         icon: "💋",  name: "Kuss",                 cat: "love",      price: 4  },
  { id: "loveletter",   icon: "💌",  name: "Liebesbrief",          cat: "love",      price: 8  },
  { id: "ring",         icon: "💍",  name: "Verlobungsring",       cat: "love",      price: 99 },
  { id: "heartfire",    icon: "❤️‍🔥", name: "Brennendes Herz",     cat: "love",      price: 12 },
  { id: "couple",       icon: "💑",  name: "Wir zwei",             cat: "love",      price: 18 },
  { id: "secret",       icon: "🔐",  name: "Mein Geheimnis",       cat: "love",      price: 7  },

  // 🍬 Süßes
  { id: "cake",         icon: "🍰",  name: "Stück Kuchen",         cat: "sweet",     price: 8  },
  { id: "donut",        icon: "🍩",  name: "Donut",                cat: "sweet",     price: 6  },
  { id: "icecream",     icon: "🍦",  name: "Softeis",              cat: "sweet",     price: 5  },
  { id: "chocolate",    icon: "🍫",  name: "Schokolade",           cat: "sweet",     price: 7  },
  { id: "lollipop",     icon: "🍭",  name: "Lutscher",             cat: "sweet",     price: 4  },
  { id: "candy",        icon: "🍬",  name: "Bonbon",               cat: "sweet",     price: 3  },
  { id: "cupcake",      icon: "🧁",  name: "Cupcake",              cat: "sweet",     price: 9  },
  { id: "honey",        icon: "🍯",  name: "Honigtöpfchen",        cat: "sweet",     price: 11 },

  // 🧸 Süße Tiere
  { id: "bear",         icon: "🧸",  name: "Teddy",                cat: "cute",      price: 10 },
  { id: "bunny",        icon: "🐰",  name: "Häschen",              cat: "cute",      price: 8  },
  { id: "kitten",       icon: "🐱",  name: "Mietz",                cat: "cute",      price: 8  },
  { id: "puppy",        icon: "🐶",  name: "Welpe",                cat: "cute",      price: 9  },
  { id: "penguin",      icon: "🐧",  name: "Pinguin",              cat: "cute",      price: 11 },
  { id: "hamster",      icon: "🐹",  name: "Hamster",              cat: "cute",      price: 7  },
  { id: "panda",        icon: "🐼",  name: "Panda",                cat: "cute",      price: 14 },
  { id: "fox",          icon: "🦊",  name: "Fuchs",                cat: "cute",      price: 12 },

  // 🎉 Party
  { id: "beer",         icon: "🍺",  name: "Bier",                 cat: "party",     price: 4  },
  { id: "cocktail",     icon: "🍹",  name: "Cocktail",             cat: "party",     price: 6  },
  { id: "champagne",    icon: "🍾",  name: "Sekt",                 cat: "party",     price: 15 },
  { id: "balloon",      icon: "🎈",  name: "Luftballon",           cat: "party",     price: 3  },
  { id: "confetti",     icon: "🎊",  name: "Konfetti-Bombe",       cat: "party",     price: 8  },
  { id: "birthday",     icon: "🎂",  name: "Geburtstagstorte",     cat: "party",     price: 22 },
  { id: "party",        icon: "🥳",  name: "Party-Hut",            cat: "party",     price: 5  },
  { id: "disco",        icon: "🪩",  name: "Disco-Kugel",          cat: "party",     price: 16 },

  // 📼 Nostalgie
  { id: "cassette",     icon: "📼",  name: "Mixtape",              cat: "nostalgia", price: 9  },
  { id: "diskette",     icon: "💾",  name: "Diskette",             cat: "nostalgia", price: 7  },
  { id: "phone",        icon: "📱",  name: "Klapphandy",           cat: "nostalgia", price: 11 },
  { id: "gameboy",      icon: "🎮",  name: "Gameboy",              cat: "nostalgia", price: 20 },
  { id: "camera",       icon: "📷",  name: "Polaroid",             cat: "nostalgia", price: 18 },
  { id: "cd",           icon: "💿",  name: "Mix-CD",               cat: "nostalgia", price: 10 },
  { id: "joystick",     icon: "🕹️", name: "Joystick",             cat: "nostalgia", price: 15 },
  { id: "vinyl",        icon: "🎶",  name: "Lieblingssong",        cat: "nostalgia", price: 6  },

  // ✨ Edel
  { id: "diamond",      icon: "💎",  name: "Diamant",              cat: "luxury",    price: 50 },
  { id: "crown",        icon: "👑",  name: "Krone",                cat: "luxury",    price: 75 },
  { id: "trophy",       icon: "🏆",  name: "Pokal",                cat: "luxury",    price: 40 },
  { id: "medal",        icon: "🥇",  name: "Goldmedaille",         cat: "luxury",    price: 30 },
  { id: "gem",          icon: "💠",  name: "Edelstein",            cat: "luxury",    price: 28 },
  { id: "moneybag",     icon: "💰",  name: "Geldsack",             cat: "luxury",    price: 35 },

  // 🌷 Natur
  { id: "tulip",        icon: "🌷",  name: "Tulpe",                cat: "nature",    price: 5  },
  { id: "sunflower",    icon: "🌻",  name: "Sonnenblume",          cat: "nature",    price: 6  },
  { id: "rainbow",      icon: "🌈",  name: "Regenbogen",           cat: "nature",    price: 12 },
  { id: "clover",       icon: "🍀",  name: "Glücksklee",           cat: "nature",    price: 7  },
  { id: "butterfly",    icon: "🦋",  name: "Schmetterling",        cat: "nature",    price: 8  },
  { id: "blossom",      icon: "🌸",  name: "Kirschblüte",          cat: "nature",    price: 9  },

  // 🍕 Snacks
  { id: "pizza",        icon: "🍕",  name: "Pizza",                cat: "food",      price: 7  },
  { id: "burger",       icon: "🍔",  name: "Burger",               cat: "food",      price: 6  },
  { id: "fries",        icon: "🍟",  name: "Pommes",               cat: "food",      price: 4  },
  { id: "sushi",        icon: "🍣",  name: "Sushi",                cat: "food",      price: 10 },
  { id: "pretzel",      icon: "🥨",  name: "Brezel",               cat: "food",      price: 4  },
  { id: "popcorn",      icon: "🍿",  name: "Popcorn",              cat: "food",      price: 5  },

  // 🤪 Quatsch
  { id: "tp",           icon: "🧻",  name: "Klopapier",            cat: "quirky",    price: 2  },
  { id: "monalisa",     icon: "🖼️", name: "Mona Lisa",            cat: "quirky",    price: 13 },
  { id: "palm",         icon: "🌴",  name: "Palme",                cat: "quirky",    price: 8  },
  { id: "mask",         icon: "🤿",  name: "Tauchermaske",         cat: "quirky",    price: 9  },
  { id: "corn",         icon: "🌽",  name: "Maiskolben",           cat: "quirky",    price: 3  },
  { id: "fire",         icon: "🔥",  name: "Feuer & Flamme",       cat: "quirky",    price: 6  },
  { id: "unicorn",      icon: "🦄",  name: "Einhorn",              cat: "quirky",    price: 25 },
  { id: "alien",        icon: "👽",  name: "Alien",                cat: "quirky",    price: 14 },
  { id: "poop",         icon: "💩",  name: "Häufchen",             cat: "quirky",    price: 2  },
];

export const GIFT_MAP = Object.fromEntries(GIFTS.map((g) => [g.id, g]));
export function findGift(id) { return GIFT_MAP[id] || null; }

// 🎀 Verpackungen — optionaler Aufschlag, rein kosmetisch. Auch Vibes-Sink.
export const WRAPPINGS = [
  { id: "plain",     label: "ohne Verpackung", emoji: "",  surcharge: 0,  bg: "transparent" },
  { id: "pink",      label: "Pinke Schleife",  emoji: "🎀", surcharge: 2,  bg: "linear-gradient(135deg,#fce7f3,#fbcfe8)" },
  { id: "gold",      label: "Goldpapier",      emoji: "✨", surcharge: 5,  bg: "linear-gradient(135deg,#fef3c7,#fbbf24)" },
  { id: "red",       icon: "🎁", label: "Rotes Geschenk", emoji: "🎁", surcharge: 3,  bg: "linear-gradient(135deg,#fee2e2,#ef4444)" },
  { id: "confetti",  label: "Konfetti-Box",    emoji: "🎊", surcharge: 4,  bg: "linear-gradient(135deg,#f0f9ff,#a78bfa)" },
  { id: "noir",      label: "Edel-Schwarz",    emoji: "🖤", surcharge: 8,  bg: "linear-gradient(135deg,#1f2937,#0f172a)" },
];
export const WRAPPING_MAP = Object.fromEntries(WRAPPINGS.map((w) => [w.id, w]));

// Wie bei Emotes: 70% an Empfänger, 30% Sink (Anti-Inflation).
export const GIFT_RECIPIENT_PAYOUT_PCT = 70;

// Maximal so viele Geschenke kann ein User pinnen (sichtbar oben in der Vitrine).
export const PINNED_GIFTS_MAX = 6;

// Spruchkarten-Länge
export const GIFT_NOTE_MAX = 140;
