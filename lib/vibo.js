// VIBO – Pixel-Pet-Logik (Tamagotchi + Animal Crossing).
// Pure Funktionen für Stage, Stimmung, Tick-Decay. Die DB-Operationen
// liegen in lib/db.js (siehe loadVibo, hatchVibo, tickAndPersist, applyAction).

const HOUR = 3600_000;
const DAY  = 24 * HOUR;

// Pokémon-Go-Style: Ei schlüpft nach Zeit ODER Laufdistanz, was zuerst kommt.
export const EGG_HATCH_HOURS = 6;
export const EGG_HATCH_DISTANCE_M = 2000;

export function getStage(ageDays, distanceWalkedM = 0) {
  const eggDone = ageDays >= 0.25 || (distanceWalkedM || 0) >= EGG_HATCH_DISTANCE_M;
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

// Aktionen + Cooldowns + Effekte
export const ACTIONS = {
  feed:  { label: "Füttern", emoji: "🍔", hunger: +35, fun: +5,  hygiene: -3, affection: +3, health: 0,   cooldownMs: 30 * 60_000 },
  play:  { label: "Spielen", emoji: "🎮", hunger: -5,  fun: +35, hygiene: -5, affection: +8, health: 0,   cooldownMs: 20 * 60_000 },
  clean: { label: "Putzen",  emoji: "🧼", hunger: 0,   fun: -5,  hygiene: +40, affection: +2, health: +5,  cooldownMs: 60 * 60_000 },
  pet:   { label: "Knuddeln",emoji: "🫶", hunger: 0,   fun: +8,  hygiene: 0,   affection: +15, health: +2,  cooldownMs: 5  * 60_000 },
  heal:  { label: "Heilen",  emoji: "💊", hunger: 0,   fun: -10, hygiene: 0,   affection: 0,   health: +30, cooldownMs: 4 * HOUR  },
  sleep: { label: "Schlafen",emoji: "💤", hunger: -5,  fun: +5,  hygiene: 0,   affection: +3,  health: +15, cooldownMs: 6 * HOUR  },
};
