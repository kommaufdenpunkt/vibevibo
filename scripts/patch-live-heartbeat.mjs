#!/usr/bin/env node
// 🛡 Patch: Live-Security-Hardening
//
// 1. Spalte `last_heartbeat` an live_stream_hosts → ermöglicht Stale-Detection
// 2. Helper-Funktionen:
//    • heartbeatLiveHost(sid, uid)        — markiert Host als aktiv (timestamp)
//    • cleanupStaleLiveHosts(sid, maxIdleMs) — Cohosts mit altem Heartbeat raus
//    • isStreamOwnerStale(sid, maxIdleMs) — Owner-Heartbeat-Check für Auto-End
//    • endStaleStreamsIfNeeded(sid)        — convenience: ruft beide Cleaner

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_COL = "/* 🛡 LIVE_HOST_HEARTBEAT_COL_V1 */";
const MARK_FN  = "// 🛡 LIVE_HOST_HEARTBEAT_FN_V1";

let src = readFileSync(DB_PATH, "utf-8");
let changed = false;

// ─── 1. Spalte ───
if (!src.includes(MARK_COL)) {
  const ANCHOR = `addColumnIfMissing(d, "users", "bg_music_url", "TEXT DEFAULT ''");`;
  if (src.includes(ANCHOR)) {
    const INJECT = `${ANCHOR}
    addColumnIfMissing(d, "live_stream_hosts", "last_heartbeat", "INTEGER DEFAULT 0"); ${MARK_COL}`;
    src = src.replace(ANCHOR, INJECT);
    changed = true;
    console.log("✓ live_stream_hosts.last_heartbeat ergänzt.");
  } else {
    console.warn("⚠ Anker bg_music_url nicht gefunden — Spalten-Patch übersprungen.");
  }
} else {
  console.log("✓ Spalten-Marker bereits drin — skip.");
}

// ─── 2. Helper-Funktionen ───
if (!src.includes(MARK_FN)) {
  const FN = `

${MARK_FN}
// 💓 Live-Host-Heartbeat: jeder Aktion (signal, emote, message) ruft das auf,
// sodass wir wissen wer noch aktiv ist und Stale-Slots cleanen können.
export function heartbeatLiveHost(streamId, userId) {
  try {
    db().prepare(\`
      UPDATE live_stream_hosts
         SET last_heartbeat = ?
       WHERE stream_id = ? AND user_id = ? AND left_at IS NULL
    \`).run(Date.now(), streamId, userId);
  } catch {}
}

// 🧹 Cohosts kicken die seit maxIdleMs nichts mehr getan haben.
// Owner wird NIE gekickt — fuer den ist endStaleStream zustaendig.
// Liefert die Liste der gekickten userIds.
export function cleanupStaleLiveHosts(streamId, maxIdleMs = 5 * 60_000) {
  const cutoff = Date.now() - maxIdleMs;
  try {
    const stale = db().prepare(\`
      SELECT user_id FROM live_stream_hosts
       WHERE stream_id = ? AND left_at IS NULL AND role = 'cohost'
         AND (last_heartbeat = 0 OR last_heartbeat < ?)
         AND joined_at < ?
    \`).all(streamId, cutoff, cutoff).map((r) => r.user_id);
    if (stale.length === 0) return [];
    const now = Date.now();
    const stmt = db().prepare(\`
      UPDATE live_stream_hosts
         SET left_at = ?
       WHERE stream_id = ? AND user_id = ? AND role = 'cohost' AND left_at IS NULL
    \`);
    const tx = db().transaction(() => { for (const uid of stale) stmt.run(now, streamId, uid); });
    tx();
    return stale;
  } catch { return []; }
}

// 👑 Owner inaktiv? (kein Heartbeat seit maxIdleMs)
export function isStreamOwnerStale(streamId, maxIdleMs = 10 * 60_000) {
  try {
    const cutoff = Date.now() - maxIdleMs;
    const row = db().prepare(\`
      SELECT joined_at, last_heartbeat FROM live_stream_hosts
       WHERE stream_id = ? AND role = 'owner' AND left_at IS NULL
       LIMIT 1
    \`).get(streamId);
    if (!row) return true; // Owner-Slot leer = stream tot
    const lastSign = row.last_heartbeat || row.joined_at || 0;
    return lastSign < cutoff;
  } catch { return false; }
}

// 🚨 Convenience: prueft beide Faelle und beendet ggf. den Stream.
// Wird opportunistisch von Routes aufgerufen (z.B. von /emote, /signal).
// Liefert { kickedCohosts, streamEnded }.
export function maintainLiveStream(streamId, opts = {}) {
  const maxCohostIdleMs = opts.maxCohostIdleMs || 5 * 60_000;
  const maxOwnerIdleMs  = opts.maxOwnerIdleMs  || 10 * 60_000;
  const kicked = cleanupStaleLiveHosts(streamId, maxCohostIdleMs);
  let ended = false;
  if (isStreamOwnerStale(streamId, maxOwnerIdleMs)) {
    try {
      const s = db().prepare("SELECT owner_id, status FROM live_streams WHERE id = ?").get(streamId);
      if (s && s.status === "live") {
        endLiveStream(streamId, s.owner_id);
        ended = true;
      }
    } catch {}
  }
  return { kickedCohosts: kicked, streamEnded: ended };
}

// 💰 Atomare Vibes-Verarbeitung fuer Live-Emotes.
// Spend + Payout + Log laufen in EINER SQLite-Transaction —
// kein Race-Window zwischen Debit und Verteilung.
// Liefert { ok, balance, missing? }.
export function processLiveEmotePayment(streamId, fromUserId, fromUsername, emote, hostPayoutPct) {
  const tx = db().transaction(() => {
    const spend = spendCredits(fromUserId, emote.cost, \`live_emote:\${emote.id}\`, { type: "live_stream", id: streamId });
    if (!spend.ok) return { ok: false, missing: spend.missing };
    const hosts = listLiveHosts(streamId);
    if (hosts.length > 0) {
      const total = Math.floor((emote.cost * hostPayoutPct) / 100);
      const share = Math.floor(total / hosts.length);
      if (share > 0) {
        for (const h of hosts) {
          adminGrantCredits(h.userId, share, \`live_emote_received:\${emote.id} (von @\${fromUsername})\`);
        }
      }
    }
    logLiveEmote(streamId, fromUserId, emote.id, emote.cost);
    return { ok: true, balance: spend.balance };
  });
  try { return tx(); } catch { return { ok: false, missing: 0, error: true }; }
}
`;
  src += FN;
  changed = true;
  console.log("✓ heartbeatLiveHost + cleanupStaleLiveHosts + maintainLiveStream ergänzt.");
} else {
  console.log("✓ Helper-Marker bereits drin — skip.");
}

if (changed) {
  writeFileSync(DB_PATH, src);
  console.log("✓ lib/db.js geschrieben.");
} else {
  console.log("ℹ Keine Änderungen.");
}
