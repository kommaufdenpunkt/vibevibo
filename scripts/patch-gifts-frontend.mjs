#!/usr/bin/env node
// 🎁 Gift-Frontend — erweitert gifts-Tabelle um Päckchen-Modus + Nachricht + Custom-Gift.
//
// Felder ergänzen:
//   • custom_gift_id (FK zu custom_gifts.id, nullable für Legacy-Emoji-Gifts)
//   • message (Nachricht vom Sender)
//   • wrapped (Päckchen-Modus: 0/1)
//   • unwrapped_at (wann ausgepackt)
//   • scheduled_for (zeitversetzt — null = sofort)
//   • amount (cost in vibes)
//
// Helpers für User-Frontend.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_COL = "/* 🎁 GIFTS_FRONTEND_COL_V1 */";
const MARK_FN  = "// 🎁 GIFTS_FRONTEND_FN_V1";

let src = readFileSync(DB_PATH, "utf-8");
let changed = false;

// 1) Spalten — Anker ist gifts.created_at
if (!src.includes(MARK_COL)) {
  const ANCHOR = `addColumnIfMissing(d, "users", "gender", "TEXT DEFAULT ''");`;
  if (!src.includes(ANCHOR)) {
    console.error("✗ Anker (users.gender) nicht gefunden");
    process.exit(1);
  }
  const INJECT = `${ANCHOR}

  ${MARK_COL}
  // 🎁 Gift-Frontend — Erweiterung gifts-Tabelle für Päckchen-Modus + Custom-Gifts
  addColumnIfMissing(d, "gifts", "custom_gift_id",  "INTEGER");
  addColumnIfMissing(d, "gifts", "message",         "TEXT DEFAULT ''");
  addColumnIfMissing(d, "gifts", "wrapped",         "INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing(d, "gifts", "unwrapped_at",    "INTEGER");
  addColumnIfMissing(d, "gifts", "scheduled_for",   "INTEGER");
  addColumnIfMissing(d, "gifts", "amount",          "INTEGER NOT NULL DEFAULT 0");`;
  src = src.replace(ANCHOR, INJECT);
  changed = true;
  console.log("✓ gifts-Spalten ergänzt (custom_gift_id, message, wrapped, unwrapped_at, scheduled_for, amount).");
}

// 2) Helpers
if (!src.includes(MARK_FN)) {
  const FN = `

${MARK_FN}
// 🎁 Gift-Frontend Helpers

// Katalog aus Custom-Gifts (nur aktive + verfügbare)
export function listCatalogGifts({ search = "", categoryCode = "", filter = "all", limit = 200 } = {}) {
  const where = ["active = 1"];
  const params = [];
  if (search) {
    where.push("(name LIKE ? OR description LIKE ?)");
    const q = "%" + String(search) + "%";
    params.push(q, q);
  }
  if (categoryCode) { where.push("category_code = ?"); params.push(String(categoryCode)); }
  if (filter === "limited")  where.push("is_limited = 1");
  if (filter === "seasonal") where.push("is_seasonal = 1");

  params.push(Number(limit));
  let rows;
  try {
    rows = db().prepare(\`
      SELECT id, code, name, description, category_code AS categoryCode,
             price, image_url AS imageUrl,
             is_limited AS isLimited, limit_qty AS limitQty, limit_sold AS limitSold,
             is_seasonal AS isSeasonal, season_start AS seasonStart, season_end AS seasonEnd
        FROM custom_gifts
        WHERE \${where.join(" AND ")}
        ORDER BY sort_order ASC, created_at DESC
        LIMIT ?
    \`).all(...params);
  } catch { rows = []; }
  // Saison + Limited Filterung nach Verfügbarkeit
  const now = Date.now();
  return rows.filter((g) => {
    if (g.isLimited && g.limitQty > 0 && g.limitSold >= g.limitQty) return false;
    if (g.isSeasonal) {
      if (g.seasonStart && now < g.seasonStart) return false;
      if (g.seasonEnd && now > g.seasonEnd) return false;
    }
    return true;
  });
}

// Geschenk verschicken (mit Päckchen-Modus + Vibes-Kosten)
export function sendGift({ fromUserId, targetUserId, customGiftId, message = "", wrapped = false, scheduledFor = null }) {
  if (Number(fromUserId) === Number(targetUserId)) {
    throw new Error("Du kannst dir selbst nichts schenken.");
  }
  const gift = db().prepare(\`
    SELECT id, name, price, is_limited AS isLimited, limit_qty AS limitQty, limit_sold AS limitSold,
           is_seasonal AS isSeasonal, season_start AS seasonStart, season_end AS seasonEnd, active
      FROM custom_gifts WHERE id = ?
  \`).get(Number(customGiftId));
  if (!gift) throw new Error("Geschenk nicht gefunden.");
  if (!gift.active) throw new Error("Geschenk nicht mehr verfügbar.");
  if (gift.isLimited && gift.limitQty > 0 && gift.limitSold >= gift.limitQty) {
    throw new Error("Geschenk ist ausverkauft.");
  }
  const now = Date.now();
  if (gift.isSeasonal) {
    if (gift.seasonStart && now < gift.seasonStart) throw new Error("Geschenk ist noch nicht verfügbar.");
    if (gift.seasonEnd && now > gift.seasonEnd) throw new Error("Geschenk ist nicht mehr verfügbar.");
  }

  // Vibes prüfen + abziehen
  const cost = Math.max(0, Number(gift.price) || 0);
  try {
    if (typeof adminGrantCredits === "function" && cost > 0) {
      const credits = (typeof getCredits === "function") ? getCredits(Number(fromUserId)) : 0;
      if (credits < cost) throw new Error("Nicht genug Vibes.");
      adminGrantCredits(Number(fromUserId), -cost, "gift_send");
    }
  } catch (e) {
    if (e.message === "Nicht genug Vibes.") throw e;
  }

  const info = db().prepare(\`
    INSERT INTO gifts
      (target_user_id, from_user_id, gift_id, custom_gift_id, message, wrapped, scheduled_for, amount, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  \`).run(
    Number(targetUserId), Number(fromUserId),
    "custom:" + String(customGiftId),
    Number(customGiftId),
    String(message || "").slice(0, 400),
    wrapped ? 1 : 0,
    scheduledFor ? Number(scheduledFor) : null,
    cost, now
  );

  // Limitiert-Counter erhöhen
  if (gift.isLimited) {
    try { db().prepare("UPDATE custom_gifts SET limit_sold = limit_sold + 1 WHERE id = ?").run(Number(customGiftId)); } catch {}
  }

  // Empfänger bekommt 70% (wenn nicht eingepackt: sofort gutgeschrieben)
  try {
    if (cost > 0 && typeof adminGrantCredits === "function") {
      const payout = Math.floor(cost * 0.7);
      if (payout > 0) adminGrantCredits(Number(targetUserId), payout, "gift_recv");
    }
  } catch {}

  return info.lastInsertRowid;
}

// Geschenk auspacken (Päckchen-Modus)
export function unwrapGift(giftRowId, userId) {
  const r = db().prepare("SELECT id, target_user_id, wrapped, unwrapped_at FROM gifts WHERE id = ?").get(Number(giftRowId));
  if (!r) throw new Error("Geschenk nicht gefunden");
  if (Number(r.target_user_id) !== Number(userId)) throw new Error("Nicht dein Geschenk");
  if (!r.wrapped) return false; // war nicht eingepackt
  if (r.unwrapped_at) return false; // schon ausgepackt
  db().prepare("UPDATE gifts SET unwrapped_at = ? WHERE id = ?").run(Date.now(), Number(giftRowId));
  return true;
}

// User-Vitrine (erhaltene Geschenke)
export function listReceivedGifts(userId, { limit = 100 } = {}) {
  try {
    return db().prepare(\`
      SELECT g.id, g.gift_id AS giftId, g.custom_gift_id AS customGiftId,
             g.from_user_id AS fromUserId, g.message,
             g.wrapped, g.unwrapped_at AS unwrappedAt,
             g.amount, g.created_at AS createdAt,
             u.username AS fromUsername, u.display_name AS fromDisplayName,
             cg.code AS code, cg.name AS name, cg.image_url AS imageUrl
        FROM gifts g
        LEFT JOIN users u ON u.id = g.from_user_id
        LEFT JOIN custom_gifts cg ON cg.id = g.custom_gift_id
        WHERE g.target_user_id = ?
          AND (g.scheduled_for IS NULL OR g.scheduled_for <= ?)
        ORDER BY g.created_at DESC
        LIMIT ?
    \`).all(Number(userId), Date.now(), Number(limit));
  } catch { return []; }
}
`;
  src += FN;
  changed = true;
  console.log("✓ Gift-Frontend Helpers angefügt.");
}

if (changed) {
  writeFileSync(DB_PATH, src);
  console.log("\\n✓ db.js gepatched (Gift-Frontend).");
} else {
  console.log("\\n✓ Nichts zu tun.");
}
