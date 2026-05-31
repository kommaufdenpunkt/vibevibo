// VIBO-Zuhause: Möbel-Katalog. Jedes Möbel kann gekauft werden (Shop)
// und in der Wohnung auf einen Slot gelegt werden. Render-Hinweise (svg)
// sind in components/RoomFurniture.jsx.

export const FURNITURE = [
  { kind: "furn_bed",       name: "Kuschelbett",   emoji: "🛏️", price: 300, w: 90, h: 50, footprint: "wide" },
  { kind: "furn_couch",     name: "Sofa",          emoji: "🛋️", price: 400, w: 96, h: 50, footprint: "wide" },
  { kind: "furn_table",     name: "Holztisch",     emoji: "🪑", price: 220, w: 70, h: 46, footprint: "wide" },
  { kind: "furn_lamp",      name: "Stehlampe",     emoji: "💡", price: 160, w: 38, h: 78, footprint: "tall" },
  { kind: "furn_plant",     name: "Zimmerpflanze", emoji: "🪴", price: 260, w: 46, h: 72, footprint: "tall" },
  { kind: "furn_tv",        name: "Flatscreen-TV", emoji: "📺", price: 380, w: 78, h: 50, footprint: "wide" },
  { kind: "furn_console",   name: "Spielkonsole",  emoji: "🎮", price: 520, w: 52, h: 38, footprint: "small" },
  { kind: "furn_frame",     name: "Bilderrahmen",  emoji: "🖼️", price: 200, w: 50, h: 40, footprint: "small" },
  { kind: "furn_bookshelf", name: "Bücherregal",   emoji: "📚", price: 290, w: 60, h: 84, footprint: "tall" },
  { kind: "furn_rug",       name: "Flokati-Teppich", emoji: "🌀", price: 180, w: 110, h: 60, footprint: "floor" },
  { kind: "furn_disco",     name: "Discokugel",    emoji: "🪩", price: 600, w: 36, h: 36, footprint: "ceil" },
  { kind: "furn_aquarium",  name: "Aquarium",      emoji: "🐟", price: 480, w: 70, h: 50, footprint: "wide" },
];

export const FURNITURE_MAP = Object.fromEntries(FURNITURE.map((f) => [f.kind, f]));

// Wohnungs-Stages: je mehr Vibes investiert, desto größer
export const ROOM_LEVELS = [
  { level: 1, label: "Studio",       capacity: 5,  upgradeCost: 0    },
  { level: 2, label: "1-Zimmer",     capacity: 8,  upgradeCost: 800  },
  { level: 3, label: "2-Zimmer-Loft", capacity: 12, upgradeCost: 2500 },
  { level: 4, label: "Penthouse",    capacity: 18, upgradeCost: 6000 },
];

export function levelInfo(level = 1) {
  return ROOM_LEVELS.find((l) => l.level === level) || ROOM_LEVELS[0];
}

export function nextLevelInfo(level = 1) {
  return ROOM_LEVELS.find((l) => l.level === level + 1) || null;
}

// Slot-Anordnung: 8 Bodenslots (4 hinten an Wand, 4 vorne) + 2 Wandslots
// Jeder Slot hat (xPct, yPct, kind) - in % der Raum-Fläche
export function slotLayout(capacity = 8) {
  // Hintere Reihe (an Wand): y=20%
  // Mittlere Reihe: y=55%
  // Vordere Reihe: y=82%
  const layout = [
    { x: 14, y: 22, area: "back" },
    { x: 38, y: 22, area: "back" },
    { x: 62, y: 22, area: "back" },
    { x: 86, y: 22, area: "back" },
    { x: 14, y: 78, area: "front" },
    { x: 38, y: 78, area: "front" },
    { x: 62, y: 78, area: "front" },
    { x: 86, y: 78, area: "front" },
    // ab Level 2:
    { x: 26, y: 50, area: "mid" },
    { x: 74, y: 50, area: "mid" },
    // ab Level 3:
    { x: 50, y: 22, area: "back" },
    { x: 50, y: 78, area: "front" },
    // ab Level 4:
    { x: 26, y: 12, area: "back" },
    { x: 74, y: 12, area: "back" },
    { x: 26, y: 90, area: "front" },
    { x: 74, y: 90, area: "front" },
    { x: 50, y: 50, area: "mid" },
    { x: 14, y: 50, area: "mid" },
  ];
  return layout.slice(0, capacity);
}

// Tageszeit-Phase aus aktuellem Datum
export function timeOfDay(now = new Date()) {
  const h = now.getHours();
  if (h >= 5  && h < 9)  return { phase: "dawn",    label: "Morgendämmerung", emoji: "🌅" };
  if (h >= 9  && h < 17) return { phase: "day",     label: "Tag",             emoji: "☀️" };
  if (h >= 17 && h < 20) return { phase: "evening", label: "Abend",           emoji: "🌇" };
  if (h >= 20 && h < 23) return { phase: "dusk",    label: "Dämmerung",       emoji: "🌆" };
  return { phase: "night", label: "Nacht", emoji: "🌙" };
}

// Hintergrund-Gradients passend zur Tageszeit
export const TIME_THEMES = {
  dawn:    { sky: "linear-gradient(180deg, #fcd34d 0%, #f97316 50%, #be185d 100%)", wall: "#fef3c7", floor: "#a16207", light: "#f59e0b40" },
  day:     { sky: "linear-gradient(180deg, #7dd3fc 0%, #38bdf8 60%, #fde68a 100%)", wall: "#fef9c3", floor: "#a16207", light: "#fde68a30" },
  evening: { sky: "linear-gradient(180deg, #f97316 0%, #ec4899 50%, #4c1d95 100%)", wall: "#fde2c4", floor: "#92400e", light: "#fb923c40" },
  dusk:    { sky: "linear-gradient(180deg, #6d28d9 0%, #312e81 60%, #0f172a 100%)", wall: "#ddd6fe", floor: "#78350f", light: "#a78bfa30" },
  night:   { sky: "linear-gradient(180deg, #0f172a 0%, #1e1b4b 60%, #312e81 100%)", wall: "#c7d2fe", floor: "#451a03", light: "#a78bfa20" },
};
