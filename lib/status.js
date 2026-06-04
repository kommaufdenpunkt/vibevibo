// Vorgefertigte Mood/Status-Chips (Jappy-Stil) — geteilt zwischen
// Navbar-Dropdown (oben rechts) und der Status-Seite /profile/status.
// Vordefinierte Chips sind GRATIS. Custom-Text kostet 50 ✨ (siehe lib/premium.js).
//
// Packs: Manche Kategorien sind erst nach Freischalten im Shop sichtbar.
// Cascading: pack2 braucht pack1, pack3 braucht pack2, etc.

export const STATUS_PACKS = [
  { id: "movie",   name: "🎬 Filme & Serien",       price: 30,  requires: null,     description: "12 neue Status rund um Kino, Netflix, Anime, Memes." },
  { id: "party",   name: "🎉 Festival & Party",     price: 60,  requires: "movie",  description: "15 Status für Festival-Saison, Cocktails, Tanzfläche." },
  { id: "love",    name: "💘 Liebe & Drama",         price: 100, requires: "party",  description: "18 Status für alle Liebes-Phasen — von verknallt bis Schluss." },
  { id: "emo",     name: "🖤 Hardcore Emo",          price: 150, requires: "love",   description: "14 dramatische Status mit Glow-Optik (geheim 😈)." },
  { id: "glam",    name: "✨ Premium Glitzer",       price: 250, requires: "emo",    description: "16 luxuriöse Promi-Vibes — exklusivste Stufe." },
];

export const STATUS_CATS = [
  // === BASIC — immer verfügbar ===
  { title: "📍 Wo bin ich?", packId: null, items: [
    ["🏠", "zu Hause"], ["🚗", "unterwegs"], ["🏢", "auf der Arbeit"], ["🎓", "Schule/Uni"],
    ["🛏️", "im Bett"], ["🏖️", "im Urlaub"], ["🌳", "draußen"], ["👯", "bei Freunden"],
    ["🛒", "einkaufen"], ["☕", "im Café"], ["🏙️", "in der Stadt"], ["🚆", "im Zug"],
  ] },
  { title: "🎯 Was mache ich?", packId: null, items: [
    ["😎", "chillen"], ["🎮", "zocken"], ["📚", "lernen"], ["💼", "arbeiten"], ["😴", "schlafen"],
    ["🎧", "Musik hören"], ["📺", "Serie gucken"], ["🍕", "essen"], ["🎉", "feiern"], ["📱", "am Handy"],
    ["📖", "lesen"], ["🍳", "kochen"], ["🏃", "Sport"], ["🚶", "spazieren"], ["☎️", "telefonieren"],
  ] },
  { title: "💭 Wie geht's mir?", packId: null, items: [
    ["🤩", "super drauf"], ["😊", "glücklich"], ["😍", "verliebt"], ["😫", "gestresst"], ["🥱", "müde"],
    ["😢", "traurig"], ["😐", "gelangweilt"], ["😡", "wütend"], ["😌", "entspannt"], ["🤔", "verträumt"],
    ["🤒", "krank"], ["💪", "motiviert"], ["🥳", "gut gelaunt"], ["😅", "verpeilt"],
  ] },

  // === PACK movie ===
  { title: "🎬 Filme & Serien", packId: "movie", items: [
    ["🎬", "Kino-Abend"], ["🍿", "Netflix & Chill"], ["📽️", "Serien-Marathon"], ["🎞️", "Filmklassiker"],
    ["🐉", "Anime gucken"], ["📺", "neue Folge!"], ["😱", "krasser Plot-Twist"], ["💔", "im Feels"],
    ["😂", "Comedy gucken"], ["👻", "Horror-Abend"], ["🦸", "Marvel-Marathon"], ["🤓", "Doku gucken"],
  ] },

  // === PACK party ===
  { title: "🎉 Festival & Party", packId: "party", items: [
    ["🪩", "Disco-Modus"], ["🍻", "Bierchen mit Freunden"], ["🍹", "Cocktail-Time"], ["💃", "Tanzfläche heiß"],
    ["🎤", "Karaoke-King 👑"], ["🎶", "Festival-Saison"], ["🎟️", "Konzert-Ticket gekauft!"], ["🚀", "Party of the Year"],
    ["🥂", "anstoßen"], ["🌃", "Stadt unsicher machen"], ["💜", "Berghain-Mood"], ["🔥", "Aftershow läuft"],
    ["🎆", "Silvester-Vibes"], ["🍕", "After-Party-Pizza"], ["🛏️", "Hangover Level: 9000"],
  ] },

  // === PACK love ===
  { title: "💘 Liebe & Drama", packId: "love", items: [
    ["😍", "frisch verknallt"], ["💕", "Schmetterlinge"], ["💌", "schreibt mit Crush"], ["💏", "kuscheln"],
    ["💍", "verlobt 💎"], ["👰", "heirate bald!"], ["🌹", "Date-Abend"], ["🍫", "Geschenk bekommen"],
    ["💔", "Liebeskummer"], ["🥺", "vermisst jemanden"], ["😭", "weint im Bett"], ["🚬", "Schluss gemacht"],
    ["🆓", "Single & happy"], ["💪", "self love"], ["👀", "stalkt Ex"], ["📱", "wartet auf Antwort"],
    ["🤫", "geheime Affäre"], ["🌧️", "Beziehung kompliziert"],
  ] },

  // === PACK emo ===
  { title: "🖤 Hardcore Emo", packId: "emo", items: [
    ["🥀", "alles ist leer"], ["⛓️", "in Ketten"], ["🌑", "im Dunkeln"], ["💀", "tot innerlich"],
    ["🩸", "blutet noch"], ["🕯️", "trauert"], ["📿", "betet zur Nacht"], ["🦇", "Vampir-Modus"],
    ["⚫", "schwarze Seele"], ["🥵", "im Inferno"], ["🪦", "Friedhof-Vibes"], ["🎭", "trägt Maske"],
    ["💭", "schweigt"], ["🚪", "verlässt alle"],
  ] },

  // === PACK glam ===
  { title: "✨ Premium Glitzer", packId: "glam", items: [
    ["👑", "Königin/König"], ["💎", "Diamond Life"], ["🛥️", "Yacht-Owner"], ["🥂", "Champagner zum Frühstück"],
    ["🏝️", "Privat-Insel"], ["💰", "Money on my mind"], ["🛍️", "Luxus-Shopping"], ["🚁", "Helikopter-Tour"],
    ["💄", "Make-up auf Fleek"], ["👗", "Designer-Outfit"], ["🪙", "Goldener Tag"], ["📸", "Cover-Shoot"],
    ["🌹", "VIP-Lounge"], ["🍾", "Bottle-Service"], ["🔝", "Spitzenklasse"], ["⭐", "Stardust"],
  ] },
];

// Liste der freigeschalteten Kategorien — packId === null ist immer drin
export function visibleCats(unlockedPacks = []) {
  const set = new Set(unlockedPacks);
  return STATUS_CATS.filter((c) => c.packId === null || set.has(c.packId));
}

// Schnellsuche flach über alle freigeschalteten Kategorien.
export function searchStatuses(query, unlockedPacks = []) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return null;
  const out = [];
  for (const cat of visibleCats(unlockedPacks)) {
    for (const [em, lbl] of cat.items) {
      if (lbl.toLowerCase().includes(q)) out.push([em, lbl]);
    }
  }
  return out;
}

// Welche Packs kann der User aktuell im Shop kaufen?
// (cascading: pack2 erst wenn pack1 freigeschaltet ist)
export function nextBuyablePack(unlockedPacks = []) {
  const set = new Set(unlockedPacks);
  for (const p of STATUS_PACKS) {
    if (set.has(p.id)) continue;
    if (!p.requires || set.has(p.requires)) return p;
  }
  return null;
}
