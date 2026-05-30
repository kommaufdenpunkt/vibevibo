// Credits – virtuelle Währung im Jappy-Stil.
// Wird verdient durch Aktivität (Login-Streak, Pinnwand, Gruscheln, Geschenke).
// Wird (später) ausgegeben für Geschenke, Profil-Upgrades, VIBO-Items.

const RANKS = [
  { id: "newbie",  label: "Newbie",  threshold:    0, dailyBase: 5 },
  { id: "regular", label: "Regular", threshold:   50, dailyBase: 10 },
  { id: "star",    label: "Star",    threshold:  500, dailyBase: 15 },
  { id: "legend",  label: "Legend",  threshold: 2000, dailyBase: 25 },
];

export function rankFromEarned(totalEarned) {
  let current = RANKS[0];
  for (const r of RANKS) {
    if (totalEarned >= r.threshold) current = r;
  }
  return current;
}

// Streak-Bonus: bis +25% bei 5+ Tagen.
export function streakMultiplier(streak) {
  if (streak <= 1) return 1.00;
  if (streak === 2) return 1.05;
  if (streak === 3) return 1.10;
  if (streak === 4) return 1.15;
  if (streak === 5) return 1.20;
  return 1.25;
}

export function dailyBonusFor({ totalEarned, streak, seasonMultiplier = 1 }) {
  const rank = rankFromEarned(totalEarned);
  const raw = rank.dailyBase * streakMultiplier(streak) * seasonMultiplier;
  return { amount: Math.round(raw), rank, streak: Math.max(streak, 1) };
}

// Earn-Raten für Standard-Aktionen.
export const EARN = {
  gruscheln_send: 1,
  gruscheln_recv: 2,
  pinnwand_post:  3,
  gift_send:      2,   // Geben kostet was, soll aber auch bisschen lohnen
  gift_recv:      8,   // Empfangen lohnt sich mehr
  like_recv:      1,
  photo_upload:   5,
  new_user_bonus: 50,  // Einmalig bei Registrierung-Freischaltung
};

export { RANKS };
