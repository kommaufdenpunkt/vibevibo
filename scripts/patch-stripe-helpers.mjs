// 💳 Idempotenter Patch: fuegt grantPaidVibes() und grantPaidVip() zu lib/db.js
// hinzu — Echtgeld-Zugaenge ohne Inflations-Caps, mit Session-ID-Idempotenz.
//
// Ausfuehren auf dem Server:
//   cd /home/user/vibevibo && node scripts/patch-stripe-helpers.mjs
//
// Nochmal laufen lassen ist OK — der Patch ist idempotent (skip wenn schon drin).

import fs from "fs";
import path from "path";

const ROOT = process.env.VIBEVIBO_ROOT || path.join(process.env.HOME || ".", "vibevibo");
const DB_PATH = path.join(ROOT, "lib", "db.js");

if (!fs.existsSync(DB_PATH)) {
  console.error(`✗ ${DB_PATH} nicht gefunden — VIBEVIBO_ROOT setzen?`);
  process.exit(1);
}

const content = fs.readFileSync(DB_PATH, "utf-8");

const MARKER = "// 💳 STRIPE_GRANT_HELPERS_V1";
if (content.includes(MARKER)) {
  console.log("✓ Stripe-Grant-Helpers schon installiert — skip.");
  process.exit(0);
}

const BLOCK = `

${MARKER}
// grantPaidVibes / grantPaidVip — werden vom Stripe-Webhook nach erfolgreicher
// Zahlung aufgerufen. Idempotenz ueber Session-ID (ref_type): doppelte Webhook-
// Zustellung schreibt nichts doppelt.
export function grantPaidVibes(userId, amount, sessionId) {
  userId = Number(userId);
  amount = Number(amount);
  if (!userId || !amount || amount <= 0 || !sessionId) {
    return { ok: false, reason: "invalid" };
  }
  ensureCreditsRow(userId);
  const dup = db().prepare(
    "SELECT 1 FROM credit_tx WHERE user_id = ? AND reason = ? AND ref_type = ? LIMIT 1"
  ).get(userId, "stripe_purchase", String(sessionId));
  if (dup) return { ok: false, reason: "duplicate", sessionId };
  const now = Date.now();
  db().prepare(
    "UPDATE credits SET balance = balance + ?, total_earned = total_earned + ? WHERE user_id = ?"
  ).run(amount, amount, userId);
  db().prepare(
    "INSERT INTO credit_tx (user_id, amount, reason, ref_type, ref_id, at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(userId, amount, "stripe_purchase", String(sessionId), 0, now);
  const row = db().prepare("SELECT balance FROM credits WHERE user_id = ?").get(userId);
  return { ok: true, amount, balance: row?.balance || 0 };
}

export function grantPaidVip(userId, days, sessionId) {
  userId = Number(userId);
  days = Number(days);
  if (!userId || !days || days <= 0 || !sessionId) {
    return { ok: false, reason: "invalid" };
  }
  ensureCreditsRow(userId);
  const dup = db().prepare(
    "SELECT 1 FROM credit_tx WHERE user_id = ? AND reason = ? AND ref_type = ? LIMIT 1"
  ).get(userId, "stripe_vip", String(sessionId));
  if (dup) return { ok: false, reason: "duplicate", sessionId };
  const before = db().prepare("SELECT vip_until FROM users WHERE id = ?").get(userId);
  const base = (before?.vip_until || 0) > Date.now() ? before.vip_until : Date.now();
  const newUntil = base + days * 24 * 3600000;
  db().prepare("UPDATE users SET vip_until = ? WHERE id = ?").run(newUntil, userId);
  // Audit-Log in credit_tx (amount=0 — kein Vibes-Effekt)
  db().prepare(
    "INSERT INTO credit_tx (user_id, amount, reason, ref_type, ref_id, at) VALUES (?, 0, ?, ?, ?, ?)"
  ).run(userId, "stripe_vip", String(sessionId), 0, Date.now());
  return { ok: true, days, vipUntil: newUntil };
}
`;

// An ans Ende der Datei haengen (keine bestehenden Funktionen anfassen).
const out = content.replace(/\s+$/, "") + BLOCK;
fs.writeFileSync(DB_PATH, out, "utf-8");
console.log(`✓ Stripe-Grant-Helpers in ${DB_PATH} eingefuegt.`);
console.log("  Naechster Schritt: npm install stripe && Coolify-Build triggern.");
