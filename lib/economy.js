// 🤖 Fidolin-Wirtschaft — automatischer Inflations-Wächter.
//
// Misst regelmaessig die Vibes-Oekonomie und passt einen globalen
// Preis-Multiplikator an, damit der Shop nicht in Inflation versinkt.
//
// Kern-Metriken (letzte N Tage):
//   - earned:  Summe positiver Tx (Vibes erschaffen — durch Werbung, Quests, etc.)
//   - sunk:    Summe negativer Tx (Vibes vernichtet — durch Shop, Verfall)
//   - flow:    sunk / earned  (1.0 = balanciert, < 0.7 = Inflation, > 1.3 = Deflation)
//   - circulating: SUM(balance) aller User
//
// Multiplikator-Logik (sanft, max ±5% pro Lauf):
//   flow < 0.5  → +5%  (starke Inflation, schnell teurer)
//   flow < 0.7  → +3%
//   flow < 0.9  → +1%
//   flow 0.9-1.1 → ±0
//   flow > 1.3  → -3%  (Deflation, billiger)
//
// Multiplikator clamp: 0.7 .. 2.0

import { getSetting, setSetting, db } from "@/lib/db";

const MIN_MULT = 0.7;
const MAX_MULT = 2.0;

export function getEconomyMultiplier() {
  const raw = Number(getSetting("ECONOMY_MULTIPLIER", "1.0"));
  if (!Number.isFinite(raw)) return 1.0;
  return Math.max(MIN_MULT, Math.min(MAX_MULT, raw));
}

export function setEconomyMultiplier(v) {
  const clamped = Math.max(MIN_MULT, Math.min(MAX_MULT, Number(v) || 1.0));
  setSetting("ECONOMY_MULTIPLIER", String(clamped));
  return clamped;
}

// Berechnet die Wirtschafts-Gesundheit ueber die letzten N Tage.
export function computeEconomyHealth(days = 7) {
  const sinceMs = Date.now() - days * 86400_000;
  const d = db();

  // Earned: Summe positiver Tx
  const earnedRow = d.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS s
      FROM vibes_tx
     WHERE amount > 0 AND created_at >= ?
  `).get(sinceMs);
  const earned = Math.max(0, Number(earnedRow?.s || 0));

  // Sunk: Summe |negativer Tx|
  const sunkRow = d.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS s
      FROM vibes_tx
     WHERE amount < 0 AND created_at >= ?
  `).get(sinceMs);
  const sunk = Math.max(0, Math.abs(Number(sunkRow?.s || 0)));

  // Gesamt-Vibes in Umlauf
  const circRow = d.prepare(`
    SELECT COALESCE(SUM(balance), 0) AS s FROM credits
  `).get();
  const circulating = Number(circRow?.s || 0);

  // Aktive User der Periode
  const usersRow = d.prepare(`
    SELECT COUNT(DISTINCT user_id) AS n FROM vibes_tx WHERE created_at >= ?
  `).get(sinceMs);
  const activeUsers = Number(usersRow?.n || 0);

  // Flow-Verhaeltnis: wie viel von dem was reinkam wieder ausgegeben wurde
  const flow = earned > 0 ? sunk / earned : 1.0;

  // Status-Klassifizierung
  let status, statusEmoji, recommendation;
  if (flow < 0.5) {
    status = "Hyper-Inflation";
    statusEmoji = "🔥";
    recommendation = +0.05;
  } else if (flow < 0.7) {
    status = "Inflation";
    statusEmoji = "📈";
    recommendation = +0.03;
  } else if (flow < 0.9) {
    status = "Leichte Inflation";
    statusEmoji = "↗️";
    recommendation = +0.01;
  } else if (flow <= 1.1) {
    status = "Balanciert";
    statusEmoji = "✅";
    recommendation = 0;
  } else if (flow <= 1.3) {
    status = "Leichte Deflation";
    statusEmoji = "↘️";
    recommendation = -0.01;
  } else {
    status = "Deflation";
    statusEmoji = "📉";
    recommendation = -0.03;
  }

  const currentMult = getEconomyMultiplier();
  const suggestedMult = Math.max(MIN_MULT, Math.min(MAX_MULT, currentMult + recommendation));

  return {
    days,
    earned,
    sunk,
    flow: Math.round(flow * 1000) / 1000,
    circulating,
    activeUsers,
    avgWealth: activeUsers > 0 ? Math.round(circulating / activeUsers) : 0,
    status,
    statusEmoji,
    currentMultiplier: currentMult,
    recommendation: Math.round(recommendation * 1000) / 1000,
    suggestedMultiplier: Math.round(suggestedMult * 1000) / 1000,
    lastCheckAt: Number(getSetting("ECONOMY_LAST_CHECK", "0")) || 0,
    lastCheckBy: getSetting("ECONOMY_LAST_CHECK_BY", "—"),
  };
}

// Fuehrt den automatischen Check durch und passt den Multiplikator an.
// Markiert wer's gemacht hat (z.B. "fidolin" oder "admin-username").
export function runFidolinEconomyCheck(by = "fidolin") {
  const h = computeEconomyHealth(7);
  if (h.recommendation === 0) {
    setSetting("ECONOMY_LAST_CHECK", String(Date.now()));
    setSetting("ECONOMY_LAST_CHECK_BY", by);
    return { ...h, applied: false, reason: "Wirtschaft balanciert — kein Eingriff." };
  }
  const newMult = setEconomyMultiplier(h.suggestedMultiplier);
  setSetting("ECONOMY_LAST_CHECK", String(Date.now()));
  setSetting("ECONOMY_LAST_CHECK_BY", by);
  return {
    ...h,
    applied: true,
    appliedMultiplier: newMult,
    reason: `${h.statusEmoji} ${h.status} erkannt → Preise um ${(h.recommendation * 100).toFixed(1)}% angepasst.`,
  };
}

// Wendet den Multiplikator auf einen Preis an.
// Verwendet von /api/premium (Display) und lib/db.js buyPremium (Kauf).
export function applyEconomyMultiplier(price, mult = null) {
  const m = mult ?? getEconomyMultiplier();
  if (m === 1.0) return price;
  return Math.max(1, Math.round(Number(price) * m));
}
