// VIBO – Pixel-Pet-Logik (Tamagotchi + Animal Crossing).
// Pure Funktionen für Stage, Stimmung, Tick-Decay. Die DB-Operationen
// liegen in lib/db.js (siehe loadVibo, hatchVibo, tickAndPersist, applyAction).

const HOUR = 3600_000;
const DAY  = 24 * HOUR;

// Ei-Phase deaktiviert (war vorher 6h Wartezeit). VIBO ist sofort aktiv.
// Falls man Eier zurückbringen will: EGG_HATCH_HOURS hochsetzen.
// EGG_HATCH_DISTANCE_M ist für ein zukünftiges "Lauf-Ei"-Feature reserviert.
export const EGG_HATCH_HOURS = 0;
export const EGG_HATCH_DISTANCE_M = 2000;

export function getStage(ageDays, distanceWalkedM = 0) {
  const eggDone = EGG_HATCH_HOURS === 0
    || ageDays >= (EGG_HATCH_HOURS / 24)
    || (distanceWalkedM || 0) >= EGG_HATCH_DISTANCE_M;
  if (!eggDone)       return "egg";
  if (ageDays < 2)    return "baby";
  if (ageDays < 7)    return "kid";
  if (ageDays < 30)   return "teen";
  if (ageDays < 100)  return "adult";
  return "elder";
}

// Fortschritt 0..1 wie weit Ei vom Schlüpfen weg ist (max von Zeit/Distanz)
export function eggProgress(ageDays, distanceWalkedM = 0) {
  const timeP = Math.min(1, ageDays / 0.25);
  const distP = Math.min(1, (distanceWalkedM || 0) / EGG_HATCH_DISTANCE_M);
  return { time: timeP, distance: distP, max: Math.max(timeP, distP) };
}

export function stageInfo(stage) {
  switch (stage) {
    case "egg":   return { label: "Ei",      hint: "schlüpft bald…" };
    case "baby":  return { label: "Baby",    hint: "braucht viel Aufmerksamkeit" };
    case "kid":   return { label: "Kind",    hint: "neugierig und verspielt" };
    case "teen":  return { label: "Teen",    hint: "manchmal anstrengend, immer treu" };
    case "adult": return { label: "Erwachsen", hint: "stabil, ausgeglichen, weise" };
    case "elder": return { label: "Greis",   hint: "alt und weise – jeden Tag ein Geschenk" };
    case "dead":  return { label: "Verstorben", hint: "in liebevoller Erinnerung" };
    default:      return { label: stage, hint: "" };
  }
}

export function moodFromStats({ hunger, fun, hygiene, affection, health }) {
  if (health <= 0) return "tot";
  if (health < 30) return "krank";
  const avg = (hunger + fun + hygiene + affection) / 4;
  if (avg < 25) return "traurig";
  if (avg < 50) return "missmutig";
  if (avg < 75) return "okay";
  return "glücklich";
}

export function ageDaysFrom(hatchedAt, now = Date.now()) {
  return (now - hatchedAt) / DAY;
}

export const SPECIES = [
  { id: "sprout",  name: "Sprössling", emoji: "🌱", primary: "#10b981", accent: "#fbbf24" },
  { id: "kitsune", name: "Kitsune",    emoji: "🦊", primary: "#f97316", accent: "#fff"    },
  { id: "drago",   name: "Drago",      emoji: "🐉", primary: "#8b5cf6", accent: "#fde68a" },
  { id: "knuddi",  name: "Knuddi",     emoji: "🫧", primary: "#ec4899", accent: "#fff"    },
  { id: "stella",  name: "Stella",     emoji: "⭐", primary: "#fbbf24", accent: "#1f5fa8" },
  // Neue Spezies — größere Auswahl, andere Designs
  { id: "maunzi",  name: "Maunzi",     emoji: "🐱", primary: "#fb923c", accent: "#fff"    },
  { id: "boo",     name: "Boo",        emoji: "👻", primary: "#e5e7eb", accent: "#a78bfa" },
  { id: "robi",    name: "Robi",       emoji: "🤖", primary: "#60a5fa", accent: "#fde047" },
];

// ============================================================
// Charakter-Eigenschaften — jedes VIBO bekommt beim Schlüpfen eine.
// Beeinflusst, wie schnell einzelne Werte sinken (Multiplikator auf Decay).
// ============================================================
export const TRAITS = [
  { id: "verfressen", name: "Verfressen", emoji: "🍔", desc: "Wird schnell hungrig, liebt Essen über alles.",
    decay: { hunger: 1.5, fun: 1.0, hygiene: 1.0, affection: 1.0 } },
  { id: "verspielt",  name: "Verspielt",  emoji: "🎮", desc: "Braucht ständig Action, sonst wird's schnell langweilig.",
    decay: { hunger: 1.0, fun: 1.5, hygiene: 1.0, affection: 1.0 } },
  { id: "schmusig",   name: "Schmusig",   emoji: "🫶", desc: "Sehnt sich nach Nähe — vergiss das Knuddeln nicht!",
    decay: { hunger: 1.0, fun: 1.0, hygiene: 1.0, affection: 1.6 } },
  { id: "reinlich",   name: "Reinlich",   emoji: "🧼", desc: "Mag's sauber, wird sonst schnell unzufrieden.",
    decay: { hunger: 1.0, fun: 1.0, hygiene: 1.5, affection: 1.0 } },
  { id: "robust",     name: "Robust",     emoji: "💪", desc: "Pflegeleicht — alle Werte sinken langsamer.",
    decay: { hunger: 0.75, fun: 0.75, hygiene: 0.75, affection: 0.85 } },
  { id: "faul",       name: "Faul",       emoji: "😴", desc: "Gemütlich, langweilt sich aber leicht.",
    decay: { hunger: 0.9, fun: 1.25, hygiene: 0.9, affection: 1.0 } },
  { id: "neugierig",  name: "Neugierig",  emoji: "🔍", desc: "Entdeckerherz — verträgt Routine schlecht.",
    decay: { hunger: 1.1, fun: 1.3, hygiene: 1.0, affection: 0.9 } },
];
export const TRAIT_MAP = Object.fromEntries(TRAITS.map((t) => [t.id, t]));

export function traitInfo(id) {
  return TRAIT_MAP[id] || { id: "robust", name: "Ausgeglichen", emoji: "✨", desc: "", decay: { hunger: 1, fun: 1, hygiene: 1, affection: 1 } };
}

// Deterministische Trait-Wahl aus userId+hatchedAt (stabil)
export function pickTrait(seedNum = 0) {
  const i = Math.abs(Math.floor(seedNum)) % TRAITS.length;
  return TRAITS[i].id;
}

// ============================================================
// Krankheiten — entstehen bei Vernachlässigung, brauchen Heilung (💊).
// ============================================================
export const SICKNESSES = {
  erkaeltung: { name: "Erkältung", emoji: "🤧", from: "hygiene",  thought: "Hatschi! Mir ist kalt… 🤧" },
  bauchweh:   { name: "Bauchweh",  emoji: "🤢", from: "hunger",   thought: "Mein Bauch tut weh… 🤢" },
  fieber:     { name: "Fieber",    emoji: "🥵", from: "health",   thought: "Mir ist ganz heiß… 🥵" },
  trübsal:    { name: "Trübsal",   emoji: "😢", from: "affection", thought: "Ich fühl mich so allein… 😢" },
};

// Aktionen + Cooldowns + Effekte
export const ACTIONS = {
  feed:  { label: "Füttern", emoji: "🍔", hunger: +35, fun: +5,  hygiene: -3, affection: +3, health: 0,   cooldownMs: 30 * 60_000 },
  play:  { label: "Spielen", emoji: "🎮", hunger: -5,  fun: +35, hygiene: -5, affection: +8, health: 0,   cooldownMs: 20 * 60_000 },
  clean: { label: "Putzen",  emoji: "🧼", hunger: 0,   fun: -5,  hygiene: +40, affection: +2, health: +5,  cooldownMs: 60 * 60_000 },
  pet:   { label: "Knuddeln",emoji: "🫶", hunger: 0,   fun: +8,  hygiene: 0,   affection: +15, health: +2,  cooldownMs: 5  * 60_000 },
  heal:  { label: "Heilen",  emoji: "💊", hunger: 0,   fun: -10, hygiene: 0,   affection: 0,   health: +30, cooldownMs: 4 * HOUR  },
  sleep: { label: "Schlafen",emoji: "💤", hunger: -5,  fun: +5,  hygiene: 0,   affection: +3,  health: +15, cooldownMs: 6 * HOUR  },
};

// ============================================================
// Stimmungs-Tagebuch — was das VIBO gerade "denkt" (Sprechblase).
// ============================================================
const HAPPY_LINES = [
  "Schön, dass du da bist! 💖", "Heute ist ein super Tag! ✨",
  "Ich mag dich richtig gern! 🥰", "Lass uns was zusammen machen! 😄",
  "Mir geht's blendend! 🌟",
];
const TRAIT_LINES = {
  verfressen: "Gibt's was zu essen? 👀🍪",
  verspielt:  "Spielen, spielen, spielen! 🎮",
  schmusig:   "Knuddel mich mal? 🫶",
  reinlich:   "Ich glänze heute, oder? ✨🧼",
  robust:     "Mir kann so schnell nichts! 💪",
  faul:       "Chillen ist auch ein Hobby 😎",
  neugierig:  "Was gibt's Neues draußen? 🔍",
};

export function viboThought(v, { sleeping = false } = {}) {
  if (sleeping) return "Zzz… träumt vor sich hin 💤";
  if (v.sick && SICKNESSES[v.sick]) return SICKNESSES[v.sick].thought;
  if (v.health < 30) return "Mir geht's gar nicht gut… 😣";
  if (v.hunger < 25) return "Ich hab Huuunger! 🍔";
  if (v.fun < 25) return "Mir ist sooo langweilig… 🥱";
  if (v.hygiene < 25) return "Igitt, ich bin ganz schmutzig 🛁";
  if (v.affection < 25) return "Hast du mich noch lieb? 🥺";
  // glücklich → Trait-Spruch oder zufällige Happy-Line (stabil pro Stunde)
  const hourSeed = Math.floor(Date.now() / 3600_000) + (v.user_id || 0);
  if (v.trait && TRAIT_LINES[v.trait] && hourSeed % 2 === 0) return TRAIT_LINES[v.trait];
  return HAPPY_LINES[hourSeed % HAPPY_LINES.length];
}

// ============================================================
// Achievements / Trophäen — werden serverseitig geprüft + belohnt.
// check(ctx) bekommt abgeleitete Werte und gibt true zurück, wenn erfüllt.
// ============================================================
export const ACHIEVEMENTS = [
  { id: "hatched",     emoji: "🥚", name: "Erste Schritte",   desc: "Dein erstes VIBO geschlüpft.",        reward: 5,   check: () => true },
  { id: "bond50",      emoji: "💗", name: "Dicke Freunde",    desc: "Bindung über 50 erreicht.",           reward: 10,  check: (c) => c.affection >= 50 },
  { id: "bond100",     emoji: "💞", name: "Seelenverwandte",  desc: "Maximale Bindung (100) erreicht.",    reward: 25,  check: (c) => c.affection >= 100 },
  { id: "healthy",     emoji: "💪", name: "Kerngesund",       desc: "Alle Werte über 80 gleichzeitig.",    reward: 20,  check: (c) => c.minStat >= 80 },
  { id: "age7",        emoji: "📅", name: "Eine Woche!",      desc: "VIBO 7 Tage am Leben.",               reward: 15,  check: (c) => c.ageDays >= 7 },
  { id: "age30",       emoji: "🎂", name: "Ein Monat!",       desc: "VIBO 30 Tage am Leben.",              reward: 50,  check: (c) => c.ageDays >= 30 },
  { id: "age100",      emoji: "👑", name: "Methusalem",       desc: "VIBO 100 Tage am Leben.",             reward: 200, check: (c) => c.ageDays >= 100 },
  { id: "cards5",      emoji: "🎴", name: "Sammler",          desc: "5 verschiedene Karten gesammelt.",    reward: 15,  check: (c) => c.cardCount >= 5 },
  { id: "cards20",     emoji: "🃏", name: "Komplett-Sammler", desc: "20 Karten gesammelt.",                reward: 60,  check: (c) => c.cardCount >= 20 },
  { id: "decorator",   emoji: "🛋️", name: "Innenarchitekt",   desc: "5 Möbel im Zuhause platziert.",       reward: 20,  check: (c) => c.furnitureCount >= 5 },
  { id: "walker2k",    emoji: "🚶", name: "Spaziergänger",    desc: "2 km mit dem VIBO gelaufen.",         reward: 15,  check: (c) => c.distanceWalkedM >= 2000 },
  { id: "walker10k",   emoji: "🏃", name: "Marathon-VIBO",    desc: "10 km gelaufen.",                     reward: 50,  check: (c) => c.distanceWalkedM >= 10000 },
  { id: "elder",       emoji: "🧓", name: "Weiser Greis",     desc: "VIBO bis zum Greisen-Alter gepflegt.",reward: 80,  check: (c) => c.stage === "elder" },
];
export const ACHIEVEMENT_MAP = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
