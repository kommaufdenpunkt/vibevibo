// Premium-Features im VIBO-Shop. Werden mit Vibes ✨ freigekauft.
// Manche permanent (Pic-Slots, Username-Change), manche pro Aktion (Custom-Status).

export const PREMIUM_ITEMS = [
  {
    kind: "extra_pic_slots",
    name: "+5 Profilbild-Slots",
    emoji: "📸",
    price: 150,
    description: "Lade bis zu 14 statt 9 Profilbilder hoch. Permanent.",
    permanent: true,
    bonus: 5,
  },
  {
    kind: "custom_status",
    name: "Eigener Status-Text",
    emoji: "💬",
    price: 50,
    description: "Schreib deinen eigenen Status (statt nur vorgegebenen). Kostet pro Setzen.",
    permanent: false,
  },
  {
    kind: "status_slot",
    name: "Status-Lieblings-Slot",
    emoji: "⭐",
    price: 100,
    description: "Speichere bis zu 3 Lieblings-Status für Schnellzugriff. Permanent.",
    permanent: true,
    maxOwn: 3,
  },
  {
    kind: "displayname_change",
    name: "Anzeigename ändern",
    emoji: "🏷️",
    price: 100,
    description: "Neuer Anzeigename — muss einzigartig sein. Pro Änderung.",
    permanent: false,
  },
  {
    kind: "username_change",
    name: "@username ändern",
    emoji: "📛",
    price: 500,
    description: "Komplett neuer Handle. ACHTUNG: alte Links zeigen ins Leere! Max 1×/Jahr.",
    permanent: false,
    cooldownDays: 365,
  },
  {
    kind: "badge_gold",
    name: "Gold-Badge",
    emoji: "🥇",
    price: 800,
    description: "Goldener Stern neben deinem Namen — sichtbar überall. Permanent.",
    permanent: true,
  },
  {
    kind: "badge_diamond",
    name: "Diamant-Badge",
    emoji: "💎",
    price: 2500,
    description: "Diamant neben deinem Namen — premium status. Permanent.",
    permanent: true,
  },
  {
    kind: "frame_rainbow",
    name: "Regenbogen-Rahmen",
    emoji: "🌈",
    price: 350,
    description: "Animierter Regenbogen-Rahmen um dein Profilbild. Permanent.",
    permanent: true,
  },
];

export const PREMIUM_MAP = Object.fromEntries(PREMIUM_ITEMS.map((p) => [p.kind, p]));
