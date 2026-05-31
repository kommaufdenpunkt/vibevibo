// Tagesquests: täglich 3 zufällige Quests werden für dich gerollt.
// Auto-Tracking läuft serverseitig — wird bei Vibes-Earn / Pickup / VIBO-Action erhöht.

export const QUEST_POOL = [
  { id: "login",          label: "Schau bei VibeVibo vorbei",        target: 1, reward: 5,  emoji: "👋" },
  { id: "pinnwand",       label: "Schreib 3 Pinnwand-Beiträge",      target: 3, reward: 10, emoji: "📌" },
  { id: "gift",           label: "Verschenke etwas an 2 Leute",      target: 2, reward: 12, emoji: "🎀" },
  { id: "world_pickup",   label: "Sammel 5 Items in der Welt",       target: 5, reward: 15, emoji: "🗺️" },
  { id: "knuddle",        label: "Knuddel 2 fremde VIBOs",           target: 2, reward: 8,  emoji: "🫶" },
  { id: "vibo_care",      label: "Pflege dein VIBO 5×",              target: 5, reward: 10, emoji: "🥚" },
  { id: "gruscheln",      label: "Grushcle 3 Personen",              target: 3, reward: 8,  emoji: "✨" },
  { id: "photo",          label: "Lade ein neues Foto hoch",         target: 1, reward: 8,  emoji: "📷" },
  { id: "guestbook",      label: "Schreib in 2 Gästebücher",         target: 2, reward: 8,  emoji: "📖" },
  { id: "message",        label: "Schreib 10 Nachrichten",           target: 10,reward: 5,  emoji: "💬" },
];

export const QUEST_MAP = Object.fromEntries(QUEST_POOL.map((q) => [q.id, q]));

// Tageskey – deterministisch pro User damit jeder seine eigenen 3 hat
export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

// Mische deterministisch basierend auf userId+date, damit der Pool stabil ist
function seeded(seed, max) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % max;
}

export function rollQuestsForUser(userId, date) {
  const seed = `${userId}-${date}`;
  // Wähle 3 unterschiedliche aus QUEST_POOL ohne reproduzierbare Permutation
  const pool = [...QUEST_POOL];
  const picked = [];
  for (let i = 0; i < 3 && pool.length; i++) {
    const idx = seeded(seed + ":" + i, pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}
