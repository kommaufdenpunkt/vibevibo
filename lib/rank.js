// 🏅 Rang-System à la Jappy — 0 bis 200 Ränge mit XP-Kurve und Feature-Gates.
//
// XP-Quellen (server-seitig per bumpXP):
//   pinnwand_post         5 XP
//   guestbook_post        5 XP
//   gift_send             5 XP
//   gift_recv             8 XP
//   compliment_send       3 XP
//   compliment_recv      10 XP
//   photo_upload          5 XP
//   daily_login          10 XP
//   quest_complete       25 XP
//   vibo_care             1 XP (max 1×/5min)
//   world_pickup          2 XP
//
// Rang-Formel: quadratische Kurve.
//   Rang 0 = 0 XP
//   Rang n braucht ceil(n^2 * 50) XP (kumuliert)
//   Rang 1: 50 · Rang 2: 200 · Rang 5: 1.250 · Rang 10: 5.000 · Rang 25: 31.250
//   Rang 50: 125.000 · Rang 100: 500.000 · Rang 150: 1.125.000 · Rang 200: 2.000.000

export const MAX_RANK = 200;

export function xpForRank(rank) {
  if (rank <= 0) return 0;
  return Math.ceil(rank * rank * 50);
}

// Aktueller Rang aus XP
export function rankFromXp(xp) {
  if (!xp || xp < xpForRank(1)) return 0;
  // Binäre Suche durchs Rang-Spektrum
  let lo = 1, hi = MAX_RANK, res = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (xpForRank(mid) <= xp) { res = mid; lo = mid + 1; }
    else hi = mid - 1;
  }
  return res;
}

// Fortschritt im aktuellen Rang (0..1) + XP zum nächsten Rang
export function rankProgress(xp) {
  const rank = rankFromXp(xp);
  if (rank >= MAX_RANK) return { rank, progress: 1, currentXp: xp, neededXp: 0, totalToNext: 0 };
  const cur = xpForRank(rank);
  const next = xpForRank(rank + 1);
  const span = next - cur;
  const progress = span > 0 ? Math.max(0, Math.min(1, (xp - cur) / span)) : 0;
  return {
    rank,
    progress,
    currentXp: xp,
    neededXp: next - xp,
    totalToNext: span,
  };
}

// Rang-Namen — alle 10 Stufen ein neuer Name
const RANK_NAMES = [
  [0,   "Neuling"],          // 0-4
  [5,   "Gast"],             // 5-9
  [10,  "Mitläufer"],        // 10-14
  [15,  "Stammgast"],        // 15-19
  [20,  "Insider"],          // 20-29
  [30,  "Pinnwand-Held"],    // 30-39
  [40,  "Vibe-Profi"],       // 40-49
  [50,  "Glitzer-Star"],     // 50-69
  [70,  "Community-Hero"],   // 70-89
  [90,  "Legende im Werden"],// 90-109
  [110, "Vibe-Veteran"],     // 110-129
  [130, "Skater-Senpai"],    // 130-149
  [150, "Glamour-Queen/King"],//150-169
  [170, "Hall-of-Fame"],     // 170-189
  [190, "Mythen-Status"],    // 190-199
  [200, "★ Vibe★Vibo-Legende ★"], // 200
];

export function rankName(rank) {
  let name = RANK_NAMES[0][1];
  for (const [min, n] of RANK_NAMES) {
    if (rank >= min) name = n;
    else break;
  }
  return name;
}

// Rang-Emoji nach Stufen-Tier
export function rankEmoji(rank) {
  if (rank >= 200) return "👑";
  if (rank >= 170) return "🏆";
  if (rank >= 150) return "💎";
  if (rank >= 130) return "🌟";
  if (rank >= 110) return "🥇";
  if (rank >= 90)  return "🥈";
  if (rank >= 70)  return "🥉";
  if (rank >= 50)  return "✨";
  if (rank >= 30)  return "🔥";
  if (rank >= 15)  return "🌸";
  if (rank >= 5)   return "🌱";
  return "🐣";
}

// Rang-Farbe für Hero/Badges
export function rankColor(rank) {
  if (rank >= 200) return "#fbbf24"; // gold
  if (rank >= 150) return "#06b6d4"; // diamond
  if (rank >= 100) return "#a855f7"; // royal violet
  if (rank >= 50)  return "#ec4899"; // pink
  if (rank >= 25)  return "#f97316"; // orange
  if (rank >= 10)  return "#22c55e"; // green
  return "#94a3b8"; // grey
}

// Was wird ab welchem Rang freigeschaltet? — komplette Tabelle für /rang
export const RANK_FEATURES = [
  { rank: 0,   icon: "👀", text: "Profile lesen, Suche, Mitgliederliste" },
  { rank: 1,   icon: "✏", text: "Eigene Pinnwand schreiben (5/Tag)" },
  { rank: 2,   icon: "📌", text: "Auf fremde Pinnwand schreiben (5/Tag)" },
  { rank: 3,   icon: "📖", text: "Gästebuch schreiben (10/Tag) · 💖 Komplimente schicken" },
  { rank: 5,   icon: "🖼", text: "Bilder in Pinnwand & Gästebuch posten" },
  { rank: 7,   icon: "🎀", text: "Geschenke verschicken · Top-5-Freunde wählen" },
  { rank: 10,  icon: "🎨", text: "Profil-Skin & CSS anpassen · eigene Schriftart" },
  { rank: 12,  icon: "💬", text: "Eigene Buschfunk-Posts (20/Tag) · Mood ändern (∞)" },
  { rank: 15,  icon: "🥚", text: "VIBO-Pet züchten & auf der Karte zeigen" },
  { rank: 18,  icon: "📸", text: "Foto-Galerie freischalten (bis 9 Bilder)" },
  { rank: 20,  icon: "🏘", text: "Gruppen (Foren) erstellen" },
  { rank: 25,  icon: "🗺", text: "Karten-Items + Basar nutzen · Fische sammeln" },
  { rank: 30,  icon: "🔥", text: "Sprachnachrichten · Live-Anrufe starten" },
  { rank: 35,  icon: "💌", text: "Komplimente anonym verschicken" },
  { rank: 40,  icon: "🎤", text: "Karaoke-Status & Festival-Pack günstiger" },
  { rank: 50,  icon: "✨", text: "Sammelkarten-Trade · Wer-besucht-mich Detail" },
  { rank: 60,  icon: "🪩", text: "Profil-Hintergrund-Musik aktivieren" },
  { rank: 70,  icon: "🥉", text: "Eigene Status-Vorlagen erstellen (3 Slots)" },
  { rank: 80,  icon: "🎯", text: "Doppelter Tages-Bonus für Vibes" },
  { rank: 90,  icon: "🥈", text: "Wochen-Quest-Slot · Premium-Skins -25%" },
  { rank: 100, icon: "🥇", text: "Sammelkarten-Tausch international" },
  { rank: 110, icon: "🛡", text: "Eigener Rahmen für Kommentare" },
  { rank: 125, icon: "🌟", text: "Sterne-Badge neben deinem Namen" },
  { rank: 140, icon: "💫", text: "Animierter Name (Sparkle-FX)" },
  { rank: 150, icon: "💎", text: "Diamant-Status — Buschfunk-Boost gratis 1×/Woche" },
  { rank: 170, icon: "🏆", text: "Hall-of-Fame-Eintrag · eigene Profil-Vorlage" },
  { rank: 190, icon: "👁", text: "Mythen-Status — alle Schul-Verzeichnisse sortierbar" },
  { rank: 200, icon: "👑", text: "★ VIBE★VIBO-LEGENDE ★ — alles frei, Name in der Hall of Fame" },
];

// Per-Aktion XP-Beträge (Server liest das hier).
export const XP_REWARDS = {
  pinnwand_post:   5,
  guestbook_post:  5,
  gift_send:       5,
  gift_recv:       8,
  compliment_send: 3,
  compliment_recv: 10,
  photo_upload:    5,
  daily_login:     10,
  quest_complete:  25,
  vibo_care:       1,
  world_pickup:    2,
  status_set:      1,
  group_post:      3,
};

// Anti-Spam: einige XP-Quellen haben Cooldown (Sekunden).
export const XP_COOLDOWNS = {
  vibo_care:   5 * 60,   // alle 5 Min
  status_set:  10 * 60,  // alle 10 Min
  group_post:  60,       // 1×/min
};

// Rang-Multiplikator für Vibes-Drops (Quest-Belohnung, Daily etc.)
// rank 0:  1.0×   rank 50: 1.5×   rank 100: 2.0×   rank 200: 3.0×
export function vibesMultiplier(rank) {
  return Math.round((1 + (rank / 100)) * 100) / 100;
}
