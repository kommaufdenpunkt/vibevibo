// Shop-Items (offizieller Shop /shop) — Account-Features mit Vibes ✨ freikaufen.
// Manche permanent, manche pro Aktion.
//
// ANTI-INFLATION-Metadaten (optional pro Item):
//   stock           Maximale Gesamt-Verkäufe weltweit (null = unbegrenzt).
//   dailyMax        Max Käufe pro User pro Tag (default unbegrenzt).
//   seasonFrom/To   ISO-Datum 'MM-DD' — nur in diesem Kalender-Fenster verkäuflich
//                   (Jahresübergreifend: 'sommer' = '06-01'..'08-31').
//   expiresAfterDays  Für Verbrauchsmaterial: nach N Tagen ohne Nutzung weg.
//   sinkShare       0..1 — wieviel Prozent vom Preis ins Sink (Default 1.0 = alles).
//                   Bei Übertragungen (z.B. Geschenke) ginge der Rest an den Empfänger.

export const PREMIUM_ITEMS = [
  // ---- Profilbild-Slots (3 Stufen) ----
  {
    kind: "extra_pic_slots",
    name: "+5 Profilbild-Slots",
    emoji: "📸",
    price: 150,
    description: "Lade bis zu 14 statt 9 Profilbilder hoch. Permanent.",
    permanent: true,
    bonus: 5,
    group: "slots",
  },
  {
    kind: "extra_pic_slots_xl",
    name: "+10 Profilbild-Slots",
    emoji: "📷",
    price: 280,
    description: "Lade insgesamt 24 statt 9 Profilbilder hoch. Permanent (zusätzlich).",
    permanent: true,
    bonus: 10,
    group: "slots",
  },
  {
    kind: "extra_pic_slots_mega",
    name: "+25 Profilbild-Slots (Mega)",
    emoji: "🖼️",
    price: 600,
    description: "Bis zu 49 Profilbilder. Für ausführliche Galerie-Sammler. Permanent (zusätzlich).",
    permanent: true,
    bonus: 25,
    group: "slots",
  },

  // ---- Name & Identität ----
  {
    kind: "displayname_change",
    name: "Anzeigename ändern",
    emoji: "🏷️",
    price: 100,
    description: "Neuer Anzeigename — muss einzigartig sein. Pro Änderung.",
    permanent: false,
    group: "name",
  },
  {
    kind: "displayname_3pack",
    name: "Anzeigename-3er-Pack",
    emoji: "🎫",
    price: 220,
    description: "3 Namens-Wechsel auf Vorrat (sonst 3×100=300 ✨). Speichert 3 Guthaben.",
    permanent: false,
    pack: 3,
    group: "name",
  },
  {
    kind: "username_change",
    name: "@username ändern (1×/Jahr)",
    emoji: "📛",
    price: 500,
    description: "Komplett neuer Handle. ACHTUNG: alte Links zeigen ins Leere! Max 1×/Jahr.",
    permanent: false,
    cooldownDays: 365,
    group: "name",
  },
  {
    kind: "username_change_fast",
    name: "@username sofort ändern",
    emoji: "⚡",
    price: 1500,
    description: "Username-Wechsel ohne 1-Jahr-Sperre. Für Wechsler die's eilig haben.",
    permanent: false,
    group: "name",
  },
  {
    kind: "vanity_url",
    name: "Vanity-URL freischalten",
    emoji: "🔗",
    price: 300,
    description: "Eigener kurzer Profil-Link statt /u/dein_name (kommt in Kürze).",
    permanent: true,
    group: "name",
  },

  // ---- Status & Texte ----
  {
    kind: "custom_status",
    name: "Eigener Status-Text",
    emoji: "💬",
    price: 50,
    description: "Schreib deinen eigenen Status (statt nur vorgegebenen). Kostet pro Setzen.",
    permanent: false,
    group: "status",
  },
  {
    kind: "status_slot",
    name: "Status-Lieblings-Slots",
    emoji: "⭐",
    price: 100,
    description: "Speichere bis zu 3 Lieblings-Status für Schnellzugriff. Permanent.",
    permanent: true,
    group: "status",
  },
  {
    kind: "bio_xl",
    name: "Lange Bio (1000 Zeichen)",
    emoji: "📝",
    price: 120,
    description: "Bio bis 1000 statt 200 Zeichen. Erzähl deine Story. Permanent.",
    permanent: true,
    group: "status",
  },
  {
    kind: "presence_invisible",
    name: "Dauer-Unsichtbar",
    emoji: "👻",
    price: 250,
    description: "Niemand sieht wann du online bist. Du siehst andere weiterhin. Permanent.",
    permanent: true,
    group: "status",
  },

  // ---- Status-Packs (cascading, mehr Status-Vorlagen) ----
  {
    kind: "status_pack_movie",
    name: "Status-Pack: Filme & Serien",
    emoji: "🎬",
    price: 30,
    description: "12 neue Status-Vorlagen rund um Kino, Netflix, Anime, Memes. Permanent. Schaltet das nächste Pack frei.",
    permanent: true,
    group: "status_packs",
    statusPack: "movie",
  },
  {
    kind: "status_pack_party",
    name: "Status-Pack: Festival & Party",
    emoji: "🎉",
    price: 60,
    description: "15 Status für Festival-Saison, Cocktails, Tanzfläche. Permanent. Braucht das Filme-Pack.",
    permanent: true,
    group: "status_packs",
    statusPack: "party",
    requiresPack: "movie",
  },
  {
    kind: "status_pack_love",
    name: "Status-Pack: Liebe & Drama",
    emoji: "💘",
    price: 100,
    description: "18 Status für alle Liebes-Phasen — von verknallt bis Schluss. Permanent. Braucht das Party-Pack.",
    permanent: true,
    group: "status_packs",
    statusPack: "love",
    requiresPack: "party",
  },
  {
    kind: "status_pack_emo",
    name: "Status-Pack: Hardcore Emo",
    emoji: "🖤",
    price: 150,
    description: "14 dramatische Status mit Glow-Optik (geheim 😈). Permanent. Braucht das Love-Pack.",
    permanent: true,
    group: "status_packs",
    statusPack: "emo",
    requiresPack: "love",
  },
  {
    kind: "status_pack_glam",
    name: "Status-Pack: Premium Glitzer",
    emoji: "✨",
    price: 250,
    description: "16 luxuriöse Promi-Vibes — exklusivste Stufe. Permanent. Braucht das Emo-Pack.",
    permanent: true,
    group: "status_packs",
    statusPack: "glam",
    requiresPack: "emo",
  },

  // ---- Badges & Rahmen ----
  {
    kind: "badge_gold",
    name: "Gold-Badge",
    emoji: "🥇",
    price: 800,
    description: "Goldener Stern neben deinem Namen — sichtbar überall. Permanent.",
    permanent: true,
    group: "badges",
  },
  {
    kind: "badge_diamond",
    name: "Diamant-Badge",
    emoji: "💎",
    price: 2500,
    description: "Diamant neben deinem Namen — premium status. Permanent.",
    permanent: true,
    group: "badges",
  },
  {
    kind: "frame_rainbow",
    name: "Regenbogen-Rahmen",
    emoji: "🌈",
    price: 350,
    description: "Animierter Regenbogen-Rahmen um dein Profilbild. Permanent.",
    permanent: true,
    group: "badges",
  },
  {
    kind: "frame_neon",
    name: "Neon-Glow-Rahmen",
    emoji: "🟪",
    price: 250,
    description: "Pulsierender Neon-Glow um dein Profilbild. Permanent.",
    permanent: true,
    group: "badges",
  },
  {
    kind: "frame_gold",
    name: "Gold-Rahmen",
    emoji: "🟨",
    price: 220,
    description: "Eleganter Gold-Rahmen um dein Profilbild. Permanent.",
    permanent: true,
    group: "badges",
  },

  // ---- Name-Color (überschreibt die Geschlechts-Farbe deines Namens überall) ----
  {
    kind: "name_color_pink",
    name: "Name-Color: Bubblegum-Pink",
    emoji: "💗",
    price: 60,
    description: "Dein Name leuchtet überall in sattem Pink (statt blau/pink nach Geschlecht). Permanent.",
    permanent: true,
    group: "colors",
  },
  {
    kind: "name_color_cyan",
    name: "Name-Color: Cyber-Cyan",
    emoji: "🩵",
    price: 60,
    description: "Y2K-Cyan für deinen Namen. Permanent.",
    permanent: true,
    group: "colors",
  },
  {
    kind: "name_color_lila",
    name: "Name-Color: Galaxy-Lila",
    emoji: "💜",
    price: 60,
    description: "Tiefes Lila wie aus 'nem MySpace-Layout. Permanent.",
    permanent: true,
    group: "colors",
  },
  {
    kind: "name_color_rainbow",
    name: "Name-Color: Regenbogen-Verlauf",
    emoji: "🌈",
    price: 200,
    description: "Dein Name als Regenbogen-Verlauf. Permanent.",
    permanent: true,
    group: "colors",
  },
  {
    kind: "name_color_glitter",
    name: "Name-Color: Glitzer-Gold",
    emoji: "✨",
    price: 250,
    description: "Glitzer-Verlauf in Gold-Tönen. Permanent.",
    permanent: true,
    group: "colors",
  },
  {
    kind: "name_color_sparkle_fx",
    name: "Name-FX: Sparkle-Animation",
    emoji: "💫",
    price: 350,
    description: "Animierter Glanz-Schweif hinter deinem Namen. Permanent.",
    permanent: true,
    group: "colors",
    stock: 500, // Anti-Inflation: nur 500 Stück weltweit verkäuflich
  },
  {
    kind: "name_color_pride",
    name: "Name-Color: Pride 🏳️‍🌈",
    emoji: "🏳️‍🌈",
    price: 100,
    description: "Pride-Regenbogen für deinen Namen — nur im Juni / Pride-Month verkäuflich. Permanent.",
    permanent: true,
    group: "colors",
    seasonFrom: "06-01",
    seasonTo:   "06-30",
  },

  // ---- Profil-Skins (MySpace-Style Hintergründe für DEIN Profil) ----
  {
    kind: "skin_y2k",
    name: "Profil-Skin: Y2K-Lila",
    emoji: "💿",
    price: 150,
    description: "Y2K-Tapete mit Verlauf, Sterne, Holo-Effekt. Permanent.",
    permanent: true,
    group: "skins",
  },
  {
    kind: "skin_glitter",
    name: "Profil-Skin: Glitzer-Wolke",
    emoji: "☁️",
    price: 180,
    description: "Pastell-Glitzer-Wolke als Profil-Hintergrund. Permanent.",
    permanent: true,
    group: "skins",
  },
  {
    kind: "skin_skater",
    name: "Profil-Skin: Skater-Park",
    emoji: "🛹",
    price: 180,
    description: "Streetwear-Grunge-Look mit Asphalt-Texture. Permanent.",
    permanent: true,
    group: "skins",
  },
  {
    kind: "skin_anime",
    name: "Profil-Skin: Anime-Sakura",
    emoji: "🌸",
    price: 200,
    description: "Sakura-Blütenregen, Pastell-Pink, weicher Glow. Permanent.",
    permanent: true,
    group: "skins",
  },
  {
    kind: "skin_matrix",
    name: "Profil-Skin: Hacker-Matrix",
    emoji: "🟢",
    price: 220,
    description: "Schwarzer Hintergrund mit grünem Zeichen-Regen. Permanent.",
    permanent: true,
    group: "skins",
  },
  {
    kind: "skin_sailor",
    name: "Profil-Skin: Sailor-Moon",
    emoji: "🌙",
    price: 250,
    description: "Mond, Sterne, lila Verlauf — magical girl vibes. Permanent.",
    permanent: true,
    group: "skins",
    stock: 300, // limited edition
  },
  {
    kind: "skin_pride",
    name: "Profil-Skin: Pride-Parade",
    emoji: "🏳️‍🌈",
    price: 200,
    description: "Regenbogen-Streifen + Konfetti — nur im Pride-Month (Juni) verkäuflich. Permanent.",
    permanent: true,
    group: "skins",
    seasonFrom: "06-01",
    seasonTo:   "06-30",
  },

  // ---- VIP (keine Werbung) ----
  {
    kind: "vip_30",
    name: "VIP — 30 Tage werbefrei",
    emoji: "💎",
    price: 1500,
    description: "Komplett werbefrei für 30 Tage. Kein Banner, keine Rewarded-Ads (=keine Gratis-Vibes aus Werbung). Stapelbar — Käufe verlängern die Laufzeit.",
    permanent: false,
    durationDays: 30,
    group: "vip",
  },
  {
    kind: "vip_365",
    name: "VIP — 1 Jahr werbefrei",
    emoji: "💠",
    price: 12000,
    description: "Komplett werbefrei für 365 Tage. Spart gegenüber 12×1500 = 18000 ✨. Stapelbar.",
    permanent: false,
    durationDays: 365,
    group: "vip",
  },

  // ---- Buschfunk-Boost (Verbrauchsmaterial — Anti-Inflation: einzeln, klein) ----
  {
    kind: "buschfunk_boost_1",
    name: "Buschfunk-Boost (1×)",
    emoji: "📣",
    price: 50,
    description: "Dein nächster Buschfunk-Post bleibt 24h ganz oben + hat einen Glow-Rahmen. Verfällt nach 30 Tagen ungenutzt.",
    permanent: false,
    pack: 1,
    group: "boosts",
    dailyMax: 5, // max 5 Einzel-Boosts/Tag
    expiresAfterDays: 30,
  },
  {
    kind: "buschfunk_boost_3",
    name: "Buschfunk-Boost (3er-Pack)",
    emoji: "📢",
    price: 130,
    description: "Drei Boosts auf Vorrat (statt 3×50=150 ✨). Verfällt nach 30 Tagen ungenutzt.",
    permanent: false,
    pack: 3,
    group: "boosts",
    dailyMax: 3, // max 3 Packs/Tag = 9 Boosts/Tag (höherer Cap, kleinerer Preis pro Stk.)
    expiresAfterDays: 30,
  },
];

export const PREMIUM_MAP = Object.fromEntries(PREMIUM_ITEMS.map((p) => [p.kind, p]));

// Gruppen-Labels für die UI
export const PREMIUM_GROUPS = [
  { id: "vip",          label: "💎 VIP (werbefrei)" },
  { id: "slots",        label: "📷 Profilbild-Slots" },
  { id: "name",         label: "🏷️ Name & Identität" },
  { id: "status",       label: "💬 Status & Bio" },
  { id: "status_packs", label: "🎭 Status-Packs (Cascading)" },
  { id: "colors",       label: "🎨 Name-Color" },
  { id: "skins",        label: "💿 Profil-Skins (MySpace-Style)" },
  { id: "badges",       label: "🥇 Badges & Rahmen" },
  { id: "boosts",       label: "📣 Boosts (Verbrauch)" },
];

// Hex-Farben + Style-Tags für Name-Color (Frontend liest das hier).
// "fx" = Animations-Effekt (nur sichtbar wenn passender Owner-Flag gesetzt ist).
export const NAME_COLOR_STYLES = {
  pink:        { color: "#ff3e9d" },
  cyan:        { color: "#00bcd4" },
  lila:        { color: "#8b5cf6" },
  rainbow:     { gradient: "linear-gradient(90deg, #ff3e9d, #ffb347, #ffe066, #50c878, #00bcd4, #8b5cf6)" },
  glitter:     { gradient: "linear-gradient(90deg, #f9d976, #f39f86, #f9d976, #fff5b7)" },
  sparkle_fx:  { gradient: "linear-gradient(90deg, #fde68a, #f59e0b, #fde68a)", fx: "sparkle" },
  pride:       { gradient: "linear-gradient(90deg, #e40303, #ff8c00, #ffed00, #008026, #004dff, #750787)" },
};

// Liste der gültigen Name-Color-Keys (für Validierung + Auswahl-UI)
export const NAME_COLOR_KEYS = Object.keys(NAME_COLOR_STYLES);

// Liste der gültigen Profil-Skin-Keys (für Validierung + Auswahl-UI)
export const PROFILE_SKIN_KEYS = ["y2k", "glitter", "skater", "anime", "matrix", "sailor", "pride"];

// ============================================================
// Anti-Inflation-Helfer
// ============================================================

// Saison-Fenster prüfen — seasonFrom/To sind 'MM-DD' (jahresübergreifend).
// Gibt true zurück wenn now innerhalb des Fensters liegt.
export function isInSeason(item, now = Date.now()) {
  if (!item.seasonFrom || !item.seasonTo) return true;
  const d = new Date(now);
  const today = `${String(d.getMonth() + 1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  // Normal (z.B. 06-01 .. 06-30)
  if (item.seasonFrom <= item.seasonTo) {
    return today >= item.seasonFrom && today <= item.seasonTo;
  }
  // Wrap (z.B. 12-15 .. 01-15)
  return today >= item.seasonFrom || today <= item.seasonTo;
}
