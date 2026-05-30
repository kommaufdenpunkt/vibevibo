// Einfache In-Memory Rate-Limiter (kein Redis nötig). Reicht für moderaten Traffic.
// Bei mehreren Prozessen / Skalierung wären persistente Counter besser.

const buckets = new Map(); // key -> { count, resetAt }

function getKeyBucket(key, windowMs) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    const next = { count: 0, resetAt: now + windowMs };
    buckets.set(key, next);
    return next;
  }
  return b;
}

// Gibt {allowed, remaining, retryAfterSec} zurück. Inkrementiert den Zähler bei allowed=true.
export function rateLimit(key, max, windowMs) {
  const b = getKeyBucket(key, windowMs);
  if (b.count >= max) {
    return { allowed: false, remaining: 0, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - Date.now()) / 1000)) };
  }
  b.count++;
  return { allowed: true, remaining: max - b.count, retryAfterSec: 0 };
}

// Bei erfolgreichem Login: Zähler zurücksetzen.
export function resetRateLimit(key) {
  buckets.delete(key);
}

// Periodisches Aufräumen abgelaufener Buckets (alle 5 Minuten).
if (typeof globalThis.__vvRateLimitGC === "undefined") {
  globalThis.__vvRateLimitGC = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of buckets.entries()) if (v.resetAt <= now) buckets.delete(k);
  }, 5 * 60_000);
  if (typeof globalThis.__vvRateLimitGC.unref === "function") globalThis.__vvRateLimitGC.unref();
}
