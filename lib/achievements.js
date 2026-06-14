// 🏆 Auszeichnungen — Definition + Auto-Trigger.
// Wird von DB-Funktionen (gruscheln, daily-claim, photo, etc.) aufgerufen.

import {
  hasAchievement,
  grantAchievement,
  countCreditReasonForUser,
  addNotification,
  getUserById,
} from "./db";

// 25 Auszeichnungen — kategorisiert
export const ACHIEVEMENTS = {
  // 🌱 ANFANG — sofort bei Registrierung
  first_login:     { emoji: "✨", name: "Erster Tag",         desc: "Willkommen bei VibeVibo!", cat: "anfang", hidden: false },
  first_pinnwand:  { emoji: "📌", name: "Erste Pinnwand",     desc: "Du hast deinen ersten Pinnwand-Eintrag geschrieben.", cat: "anfang", hidden: false },
  first_photo:     { emoji: "📸", name: "Erstes Profilbild",  desc: "Du hast dein erstes Profilbild hochgeladen.", cat: "anfang", hidden: false },
  first_gruschel:  { emoji: "🫶", name: "Erstes Gruscheln",   desc: "Du hast jemanden gegruschelt.", cat: "anfang", hidden: false },
  first_gift:      { emoji: "🎁", name: "Erstes Geschenk",    desc: "Du hast dein erstes Geschenk verschickt.", cat: "anfang", hidden: false },

  // 📊 SAMMLER
  bronze_knuddler: { emoji: "🥉", name: "Bronze-Knuddler",   desc: "10× gegruschelt.", cat: "sammler", hidden: false },
  silver_knuddler: { emoji: "🥈", name: "Silber-Knuddler",   desc: "100× gegruschelt.", cat: "sammler", hidden: false },
  gold_knuddler:   { emoji: "🥇", name: "Gold-Knuddler",     desc: "1000× gegruschelt.", cat: "sammler", hidden: false },
  pinnwand_100:    { emoji: "📌", name: "Pinnwand-Profi",    desc: "100 Pinnwand-Einträge geschrieben.", cat: "sammler", hidden: false },
  gift_50:         { emoji: "🎁", name: "Schenker",          desc: "50 Geschenke verteilt.", cat: "sammler", hidden: false },

  // 🔥 LOYALTY (Streak / Mitgliedschaft)
  streak_7:        { emoji: "🌅", name: "7-Tage-Streak",      desc: "7 Tage in Folge eingeloggt + Tagesbonus.", cat: "loyalty", hidden: false },
  streak_30:       { emoji: "🔥", name: "30-Tage-Streak",     desc: "Einen ganzen Monat dabei.", cat: "loyalty", hidden: false },
  streak_100:      { emoji: "💎", name: "100-Tage-Streak",    desc: "Hundert Tage am Stück!", cat: "loyalty", hidden: false },
  member_1y:       { emoji: "🏆", name: "1 Jahr dabei",       desc: "Ein ganzes Jahr Mitglied.", cat: "loyalty", hidden: false },

  // 🥚 VIBO
  vibo_birth:      { emoji: "🐣", name: "VIBO geschlüpft",    desc: "Dein erstes VIBO ist geboren.", cat: "vibo", hidden: false },
  vibo_adult:      { emoji: "🧓", name: "VIBO erwachsen",     desc: "Dein VIBO ist erwachsen geworden.", cat: "vibo", hidden: false },
  vibo_grave:      { emoji: "🪦", name: "Trauer-Erinnerung",  desc: "Erstes VIBO ist gegangen.", cat: "vibo", hidden: false },

  // 🎉 EVENTS (zeitlich begrenzt)
  halloween_26:    { emoji: "🎃", name: "Halloween 2026",     desc: "Halloween-Event mitgemacht.", cat: "events", hidden: false, eventOnly: true },
  advent_26:       { emoji: "🎄", name: "Advents-Sammler 2026", desc: "Adventskalender komplett.", cat: "events", hidden: false, eventOnly: true },
  pride_26:        { emoji: "🌈", name: "Pride 2026",         desc: "Pride-Monat gefeiert.", cat: "events", hidden: false, eventOnly: true },

  // 🤫 VERSTECKT
  nightowl:        { emoji: "🌙", name: "Nachteule",          desc: "10× zwischen 2 und 4 Uhr eingeloggt.", cat: "versteckt", hidden: true },
  earlybird:       { emoji: "🌅", name: "Frühaufsteher",      desc: "10× vor 6 Uhr eingeloggt.", cat: "versteckt", hidden: true },
  skin_chamaeleon: { emoji: "🎭", name: "Stilwechsler",       desc: "5 verschiedene Skins ausprobiert.", cat: "versteckt", hidden: true },
  fidolin_friend:  { emoji: "🤖", name: "Fidolin-Freund",     desc: "100 Posts ohne einmal blockiert zu werden.", cat: "versteckt", hidden: true },
  birthday_star:   { emoji: "🎂", name: "Geburtstags-Star",   desc: "Eigenen Geburtstag auf VibeVibo gefeiert.", cat: "versteckt", hidden: true },
};

// Auto-Trigger-Map: welche Reasons triggern welche Auszeichnungen
// {reason} kommt aus credit_tx (z.B. "gruscheln_send", "daily", "pinnwand")
const COUNT_TRIGGERS = {
  gruscheln_send: [
    { count: 1,    slug: "first_gruschel" },
    { count: 10,   slug: "bronze_knuddler" },
    { count: 100,  slug: "silver_knuddler" },
    { count: 1000, slug: "gold_knuddler" },
  ],
  pinnwand: [
    { count: 1,   slug: "first_pinnwand" },
    { count: 100, slug: "pinnwand_100" },
  ],
  gift_send: [
    { count: 1,  slug: "first_gift" },
    { count: 50, slug: "gift_50" },
  ],
  photo_upload: [
    { count: 1, slug: "first_photo" },
  ],
};

// Pruefe nach einem Vibes-Earn-Event ob neue Auszeichnungen freigeschaltet werden
export function checkAchievementsForReason(userId, reason) {
  if (!userId || !reason) return [];
  if (typeof hasAchievement !== "function" || typeof grantAchievement !== "function") return [];

  const triggers = COUNT_TRIGGERS[reason];
  if (!triggers) return [];

  const newOnes = [];
  const total = typeof countCreditReasonForUser === "function"
    ? countCreditReasonForUser(userId, reason) : 0;

  for (const t of triggers) {
    if (total >= t.count && !hasAchievement(userId, t.slug)) {
      if (grantAchievement(userId, t.slug)) {
        newOnes.push(t.slug);
        notifyAchievement(userId, t.slug);
      }
    }
  }
  return newOnes;
}

// Spezifische Trigger fuer Daily-Bonus (Streak-Check)
export function checkStreakAchievements(userId, streak) {
  if (!userId || !streak) return [];
  if (typeof hasAchievement !== "function" || typeof grantAchievement !== "function") return [];
  const slugs = [];
  if (streak >= 7   && !hasAchievement(userId, "streak_7"))   slugs.push("streak_7");
  if (streak >= 30  && !hasAchievement(userId, "streak_30"))  slugs.push("streak_30");
  if (streak >= 100 && !hasAchievement(userId, "streak_100")) slugs.push("streak_100");
  for (const s of slugs) {
    grantAchievement(userId, s);
    notifyAchievement(userId, s);
  }
  return slugs;
}

// Spezifischer Trigger bei Login (Erster-Tag + Nachteule/Fruehaufsteher)
export function checkLoginAchievements(userId) {
  if (!userId) return [];
  if (typeof hasAchievement !== "function" || typeof grantAchievement !== "function") return [];
  const granted = [];
  if (!hasAchievement(userId, "first_login")) {
    if (grantAchievement(userId, "first_login")) { granted.push("first_login"); notifyAchievement(userId, "first_login"); }
  }
  // 1 Jahr Mitglied
  const u = typeof getUserById === "function" ? getUserById(userId) : null;
  if (u?.createdAt && Date.now() - u.createdAt > 365 * 86400 * 1000) {
    if (!hasAchievement(userId, "member_1y") && grantAchievement(userId, "member_1y")) {
      granted.push("member_1y"); notifyAchievement(userId, "member_1y");
    }
  }
  return granted;
}

// Notification beim Freischalten
function notifyAchievement(userId, slug) {
  const ach = ACHIEVEMENTS[slug];
  if (!ach) return;
  try {
    if (typeof addNotification === "function") {
      addNotification({
        userId,
        actorId: null,
        type: "achievement",
        targetType: "achievement",
        targetId: 0,
        preview: `🏆 ${ach.emoji} ${ach.name}`,
      });
    }
  } catch {}
}

// Lookup
export function getAchievementInfo(slug) {
  return ACHIEVEMENTS[slug] || null;
}
