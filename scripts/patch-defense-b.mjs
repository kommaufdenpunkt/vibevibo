#!/usr/bin/env node
// 🔨 Defense-Paket B — Owner-schläft-ruhig.
//
// Schutz vor:
//   • Burst-Spam (>N Posts in Y Sek)
//   • Fidolin-Verstöße (Beleidigung/Sexismus) — Eskalations-Score
//   • Ban-Evasion (Browser-Fingerprint trotz IP-Wechsel)
//
// Tabellen:
//   • user_action_log — jede schreibende Aktion mit Zeitstempel (für Burst-Detection)
//   • fidolin_violations — pro User+Zeit jede erkannte Beleidigung/Sexismus
//   • ban_evasion_marks — Browser-Fingerprint → User-Ban-Verknüpfung
//
// Helpers:
//   • logUserAction(userId, kind)   — bei jedem Post/Kommentar/DM aufgerufen
//   • checkBurstSpam(userId)        — bool: ist gerade Burst?
//   • recordFidolinViolation(userId, kind, severity)
//   • escalateViolations(userId)    — prüft Score, verhängt Auto-Sanktion
//   • markBanEvasion(fingerprint, oldUserId, newUserId)
//   • isFingerprintBanned(fingerprint)

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_TABLE = "/* 🔨 DEFENSE_B_TABLE_V1 */";
const MARK_FN    = "// 🔨 DEFENSE_B_FN_V1";

let src = readFileSync(DB_PATH, "utf-8");
let changed = false;

if (!src.includes(MARK_TABLE)) {
  const ANCHOR = "CREATE TABLE IF NOT EXISTS top_friends (";
  if (!src.includes(ANCHOR)) { console.error("✗ Anker fehlt"); process.exit(1); }
  const INJECT = `${MARK_TABLE}
    CREATE TABLE IF NOT EXISTS user_action_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      kind TEXT NOT NULL,
      ts INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ual_user_ts ON user_action_log(user_id, ts DESC);
    CREATE INDEX IF NOT EXISTS idx_ual_user_kind ON user_action_log(user_id, kind, ts DESC);

    CREATE TABLE IF NOT EXISTS fidolin_violations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      kind TEXT NOT NULL,
      severity INTEGER NOT NULL DEFAULT 1,
      details TEXT DEFAULT '',
      ts INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_fv_user_ts ON fidolin_violations(user_id, ts DESC);

    CREATE TABLE IF NOT EXISTS ban_evasion_marks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fingerprint TEXT NOT NULL,
      banned_user_id INTEGER NOT NULL,
      sub_account_user_id INTEGER,
      ts INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_bem_fp ON ban_evasion_marks(fingerprint);

    ${ANCHOR}`;
  src = src.replace(ANCHOR, INJECT);
  changed = true;
  console.log("✓ Defense-B Tabellen ergänzt.");
}

if (!src.includes(MARK_FN)) {
  const FN = `

${MARK_FN}
// 🔨 Defense-Paket B Helpers

const BURST_LIMITS = {
  post:     { window: 30_000,  max: 5  },   // 5 Posts in 30s
  comment:  { window: 30_000,  max: 8  },
  dm:       { window: 60_000,  max: 15 },
  reaction: { window: 10_000,  max: 20 },
};

const VIOLATION_THRESHOLDS = [
  { count: 1,  duration: 30 * 60 * 1000,     label: "30 Min Stumm" },
  { count: 3,  duration: 24 * 3600 * 1000,   label: "24h Stumm" },
  { count: 5,  duration: 7 * 24 * 3600 * 1000, label: "7d Stumm" },
  { count: 10, duration: null,                label: "Permanent" },
];

export function logUserAction(userId, kind) {
  if (!userId || !kind) return;
  try {
    db().prepare("INSERT INTO user_action_log (user_id, kind, ts) VALUES (?, ?, ?)")
      .run(Number(userId), String(kind).slice(0, 40), Date.now());
    // GC: alte Einträge >24h gelegentlich löschen
    if (Math.random() < 0.01) {
      try { db().prepare("DELETE FROM user_action_log WHERE ts < ?").run(Date.now() - 24 * 3600 * 1000); } catch {}
    }
  } catch {}
}

// Liefert true wenn Burst → Frontend soll Aktion blockieren
export function checkBurstSpam(userId, kind) {
  const limit = BURST_LIMITS[kind];
  if (!limit) return { burst: false };
  try {
    const since = Date.now() - limit.window;
    const c = db().prepare("SELECT COUNT(*) AS n FROM user_action_log WHERE user_id = ? AND kind = ? AND ts > ?")
      .get(Number(userId), String(kind), since).n || 0;
    return {
      burst: c >= limit.max,
      count: c,
      max: limit.max,
      windowMs: limit.window,
      retryAfter: limit.window,
    };
  } catch { return { burst: false }; }
}

export function recordFidolinViolation(userId, kind, severity = 1, details = "") {
  if (!userId || !kind) return;
  try {
    db().prepare(\`
      INSERT INTO fidolin_violations (user_id, kind, severity, details, ts)
      VALUES (?, ?, ?, ?, ?)
    \`).run(Number(userId), String(kind), Number(severity) || 1, String(details).slice(0, 300), Date.now());
  } catch {}
}

// Prüft den 24h-Score und verhängt automatisch Sanktion bei Überschreitung
// Returns: { action: "muted" | "extended" | "permaban" | null, threshold, until }
export function escalateViolations(userId) {
  try {
    const since = Date.now() - 24 * 3600 * 1000;
    const total = db().prepare(\`
      SELECT COALESCE(SUM(severity), 0) AS s FROM fidolin_violations
      WHERE user_id = ? AND ts > ?
    \`).get(Number(userId), since).s || 0;
    // Welche Schwelle wurde überschritten?
    let triggered = null;
    for (const t of VIOLATION_THRESHOLDS) {
      if (total >= t.count) triggered = t;
    }
    if (!triggered) return { action: null, total };
    // Sanktion verhängen (sofern noch keine läuft die strenger ist)
    const until = triggered.duration ? Date.now() + triggered.duration : null;
    try {
      if (typeof addSanction === "function") {
        addSanction(Number(userId), "comm", until, \`Auto-Hammer Fidolin: \${total} Punkte 24h\`, "fidolin");
      }
    } catch {}
    return { action: "muted", threshold: triggered, total, until };
  } catch { return { action: null }; }
}

export function markBanEvasion(fingerprint, bannedUserId, subAccountUserId = null) {
  if (!fingerprint) return;
  try {
    db().prepare(\`
      INSERT INTO ban_evasion_marks (fingerprint, banned_user_id, sub_account_user_id, ts)
      VALUES (?, ?, ?, ?)
    \`).run(String(fingerprint).slice(0, 128), Number(bannedUserId), subAccountUserId ? Number(subAccountUserId) : null, Date.now());
  } catch {}
}

export function isFingerprintBanned(fingerprint) {
  if (!fingerprint) return false;
  try {
    const r = db().prepare(\`
      SELECT banned_user_id FROM ban_evasion_marks WHERE fingerprint = ? LIMIT 1
    \`).get(String(fingerprint));
    return !!r;
  } catch { return false; }
}

// Liste der Burst-Spammer der letzten Stunde (für MCP-Dashboard)
export function listBurstSpammers({ windowMs = 3600 * 1000, minActions = 30 } = {}) {
  try {
    const since = Date.now() - Number(windowMs);
    return db().prepare(\`
      SELECT user_id AS userId, COUNT(*) AS actions
        FROM user_action_log WHERE ts > ?
        GROUP BY user_id HAVING actions >= ?
        ORDER BY actions DESC LIMIT 50
    \`).all(since, Number(minActions));
  } catch { return []; }
}
`;
  src += FN;
  changed = true;
  console.log("✓ Defense-B Helpers angefügt.");
}

if (changed) {
  writeFileSync(DB_PATH, src);
  console.log("\\n✓ db.js gepatched (Defense-B).");
} else {
  console.log("\\n✓ Nichts zu tun.");
}
