// Vibes-KI: heuristische Inflations-/Farming-Erkennung.
// Läuft serverseitig im /api/ping-Sweeper. Kein Gemini nötig — Mustererkennung reicht.
//
// Drei Regeln:
//   1) >50 passive Earns in 24h  → 24h Earn-Block (Bot-Verdacht)
//   2) >40 Vibes von EINER Person in 7 Tagen → 24h Block beider (Multi-Account)
//   3) >5 Earns in 60 Sekunden → 1h Block (Burst/Skript)

import {
  suspiciousVibesPatterns, vibesGiftPairs, vibesBurstUsers,
  blockEarnForUser, getUserIdByUsername,
} from "@/lib/db";

const HOUR = 3600_000;
const DAY  = 24 * HOUR;

let _lastScan = 0;
const SCAN_INTERVAL = 5 * 60_000;

export function maybeScanForFarming() {
  const now = Date.now();
  if (now - _lastScan < SCAN_INTERVAL) return { skipped: true };
  _lastScan = now;
  try { return scanForFarming(); } catch (e) {
    if (process.env.NODE_ENV !== "production") console.warn("[vibesAi]", e?.message);
    return { error: e?.message };
  }
}

export function scanForFarming() {
  let actions = 0;
  const now = Date.now();

  // Regel 1: zu viele passive Earns in 24h
  for (const s of suspiciousVibesPatterns()) {
    if (s.earnCount > 50) {
      blockEarnForUser(s.userId, now + DAY,
        `KI: ${s.earnCount} Earns in 24h, +${s.totalEarned24h} ✨`);
      actions++;
    }
  }

  // Regel 2: zu viele Vibes von einer Person → Multi-Account-Verdacht
  for (const p of vibesGiftPairs(50)) {
    if (p.sumAmount > 40) {
      const recId = getUserIdByUsername(p.recipient);
      if (recId)       { blockEarnForUser(recId, now + DAY, `KI: ${p.sumAmount} ✨ von @${p.sender} in 7d`); actions++; }
      if (p.senderId)  { blockEarnForUser(p.senderId, now + DAY, `KI: schickt zu viel an @${p.recipient}`); actions++; }
    }
  }

  // Regel 3: Burst-Detection
  for (const b of vibesBurstUsers(60_000, 5)) {
    blockEarnForUser(b.userId, now + HOUR, `KI-Burst: ${b.c} Earns in 60s`);
    actions++;
  }

  return { scanned: true, actions, at: now };
}
