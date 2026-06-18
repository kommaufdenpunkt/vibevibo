// 🔓 Katalog der freischaltbaren Com-Funktionen.
// Jede Funktion: einmaliger Vibes-Preis aus Owner-Konto, optional Member-Gate.
// `available: false` = noch nicht gebaut, im Shop als "Bald verfügbar" sichtbar.

export const COM_FEATURE_CATEGORIES = {
  visual: { label: "✨ Visuelle Spielereien", color: "#a855f7" },
  live: { label: "🎬 Live & Echtzeit", color: "#ec4899" },
  social: { label: "🌍 Real-Life-Brücken", color: "#10b981" },
};

export const COM_FEATURES = [
  // ─── ✨ VISUELL ────────────────────────────────────────────────
  {
    key: "animated_theme",
    emoji: "❄",
    label: "Animated Theme",
    description: "Schnee, Konfetti, Herbstlaub, Herzen oder Sterne schweben dezent über der Com-Seite.",
    category: "visual",
    costVibes: 500,
    memberGate: 0,
    available: true,
    configurable: true,
    options: [
      { id: "snow", label: "❄ Schnee" },
      { id: "confetti", label: "🎉 Konfetti" },
      { id: "leaves", label: "🍂 Herbstlaub" },
      { id: "hearts", label: "💖 Herzen" },
      { id: "stars", label: "⭐ Sterne" },
    ],
    defaultPayload: { theme: "snow" },
  },
  {
    key: "hero_seasonal",
    emoji: "🎨",
    label: "Saisonaler Hero-Schmuck",
    description: "Cover-Banner kriegt einen saisonalen Rahmen (Frühling, Sommer, Halloween, Weihnachten).",
    category: "visual",
    costVibes: 700,
    memberGate: 0,
    available: false,
  },
  {
    key: "sound_fx",
    emoji: "🔊",
    label: "Sound-FX beim Beitritt",
    description: "Kurzer Sound (Glocke, Pling, Türklingel) wenn ein Mitglied die Com öffnet.",
    category: "visual",
    costVibes: 300,
    memberGate: 0,
    available: false,
  },
  {
    key: "live_view",
    emoji: "👀",
    label: "Live-Ansicht",
    description: "Sieh in Echtzeit wer gerade in der Com online ist (Avatare am Rand pulsen).",
    category: "visual",
    costVibes: 900,
    memberGate: 5,
    available: false,
  },

  // ─── 🎬 LIVE & ECHTZEIT ───────────────────────────────────────
  {
    key: "lounge",
    emoji: "🛋",
    label: "Lounge-Stream",
    description: "Permanenter Audio-Treffpunkt mit bis zu 6 Sprechern — wer mag joint, wer mag hört zu.",
    category: "live",
    costVibes: 1200,
    memberGate: 8,
    available: false,
  },
  {
    key: "watch_party",
    emoji: "🎬",
    label: "Watch-Party",
    description: "Synchrones Video-gucken: einer startet, alle sehen denselben Frame zur selben Zeit.",
    category: "live",
    costVibes: 800,
    memberGate: 5,
    available: false,
  },
  {
    key: "quiz_night",
    emoji: "🧠",
    label: "Quiz-Night",
    description: "Owner stellt Fragen, Mitglieder buzzern, Punkte werden gezählt. Wie früher im Wohnzimmer.",
    category: "live",
    costVibes: 1000,
    memberGate: 5,
    available: false,
  },
  {
    key: "karaoke",
    emoji: "🎤",
    label: "Karaoke-Night",
    description: "Songtexte-Overlay + Mic-Loop. Wer traut sich? Reihum, Applaus per Reaktion.",
    category: "live",
    costVibes: 1500,
    memberGate: 10,
    available: false,
  },
  {
    key: "live_polls",
    emoji: "📊",
    label: "Live-Polls",
    description: "Schnelle Ja/Nein- oder Multi-Choice-Umfragen mit Live-Balken — fühlt sich an wie Twitch-Chat.",
    category: "live",
    costVibes: 400,
    memberGate: 0,
    available: false,
  },
  {
    key: "throwback",
    emoji: "📼",
    label: "Throwback-Feed",
    description: "Posts von vor 1, 5, 10 Jahren tauchen wieder auf. Pure Nostalgie.",
    category: "live",
    costVibes: 600,
    memberGate: 0,
    available: false,
  },

  // ─── 🌍 REAL-LIFE-BRÜCKEN ─────────────────────────────────────
  {
    key: "member_map",
    emoji: "🗺",
    label: "Member-Map",
    description: "Wer wohnt wo? Mitglieder pinnen sich freiwillig (PLZ-genau, nicht straßengenau).",
    category: "social",
    costVibes: 1200,
    memberGate: 15,
    available: false,
  },
  {
    key: "meetups",
    emoji: "🤝",
    label: "Meetup-Planer",
    description: "Plant echte Treffen mit Ort, Datum, Zusagen. Erinnerungen automatisch raus.",
    category: "social",
    costVibes: 600,
    memberGate: 8,
    available: false,
  },
  {
    key: "birthday_calendar",
    emoji: "🎂",
    label: "Geburtstags-Kalender",
    description: "Sidebar zeigt, wer in den nächsten 7 Tagen Geburtstag hat. Glückwunsch-Knopf inklusive.",
    category: "social",
    costVibes: 400,
    memberGate: 0,
    available: false,
  },
  {
    key: "charity",
    emoji: "💝",
    label: "Charity-Linktree",
    description: "Owner verlinkt Spenden-Aktionen oder gute Zwecke direkt in der Com.",
    category: "social",
    costVibes: 700,
    memberGate: 10,
    available: false,
  },
  {
    key: "merch_shelf",
    emoji: "👕",
    label: "Merch-Regal",
    description: "Schwarzes Brett für Com-eigenes Merch: T-Shirts, Sticker, Aufnäher. (Externe Shop-Links.)",
    category: "social",
    costVibes: 2000,
    memberGate: 20,
    available: false,
  },
];

export function findComFeature(key) {
  return COM_FEATURES.find((f) => f.key === key) || null;
}

export function getFeaturesByCategory(cat) {
  return COM_FEATURES.filter((f) => f.category === cat);
}
