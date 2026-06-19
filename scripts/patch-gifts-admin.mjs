#!/usr/bin/env node
// 🎁 Geschenke-Admin — DB-Schema für Owner-verwaltete Geschenke.
//
// Tabellen:
//   • gift_categories — Kategorien (Liebe, Süßes, Limitiert, Saison, …)
//   • custom_gifts    — vom Admin hochgeladene Geschenke (PNG-Datenstring in DB)
//
// Helpers:
//   • listGiftCategories(), addGiftCategory, updateGiftCategory, deleteGiftCategory
//   • listCustomGifts({filter, categoryCode, limit, offset, includeInactive})
//   • addCustomGift, updateCustomGift, deleteCustomGift
//   • setCustomGiftActive(id, active)
//   • giftIsAvailable(gift)  — Saison-Range + Limited-Sold-Check

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_TABLE = "/* 🎁 GIFTS_ADMIN_TABLE_V1 */";
const MARK_FN    = "// 🎁 GIFTS_ADMIN_FN_V1";

let src = readFileSync(DB_PATH, "utf-8");
let changed = false;

// 1) Tabellen — Anker ist die existierende gifts-Tabelle
if (!src.includes(MARK_TABLE)) {
  const ANCHOR = "CREATE TABLE IF NOT EXISTS gifts (";
  if (!src.includes(ANCHOR)) { console.error("✗ Anker gifts fehlt"); process.exit(1); }
  const INJECT = `${MARK_TABLE}
    CREATE TABLE IF NOT EXISTS gift_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      emoji TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      created_by INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_gift_cat_sort ON gift_categories(sort_order, label);

    CREATE TABLE IF NOT EXISTS custom_gifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      category_code TEXT DEFAULT '',
      price INTEGER NOT NULL DEFAULT 5,
      image_url TEXT DEFAULT '',
      is_limited INTEGER NOT NULL DEFAULT 0,
      limit_qty INTEGER NOT NULL DEFAULT 0,
      limit_sold INTEGER NOT NULL DEFAULT 0,
      is_seasonal INTEGER NOT NULL DEFAULT 0,
      season_start INTEGER DEFAULT 0,
      season_end INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      created_by INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_custom_gifts_active ON custom_gifts(active, sort_order, id);
    CREATE INDEX IF NOT EXISTS idx_custom_gifts_cat    ON custom_gifts(category_code, active);
    CREATE INDEX IF NOT EXISTS idx_custom_gifts_lim    ON custom_gifts(is_limited, active);
    CREATE INDEX IF NOT EXISTS idx_custom_gifts_sea    ON custom_gifts(is_seasonal, season_start, season_end);

    ${ANCHOR}`;
  src = src.replace(ANCHOR, INJECT);
  changed = true;
  console.log("✓ Geschenke-Admin Tabellen ergänzt.");
}

// 2) Helpers
if (!src.includes(MARK_FN)) {
  const FN = `

${MARK_FN}
// 🎁 Geschenke-Admin Helpers

// — Default-Kategorien beim ersten Aufruf seeden (idempotent)
const _DEFAULT_GIFT_CATEGORIES = [
  { code: "limitiert", label: "✨ Limitiert",        emoji: "✨", sort_order: 0  },
  { code: "saison",    label: "🎄 Saison",           emoji: "🎄", sort_order: 1  },
  { code: "love",      label: "💗 Liebe & Romantik", emoji: "💗", sort_order: 10 },
  { code: "sweet",     label: "🍬 Süßes",            emoji: "🍬", sort_order: 11 },
  { code: "cute",      label: "🧸 Süße Tiere",       emoji: "🧸", sort_order: 12 },
  { code: "party",     label: "🎉 Party",            emoji: "🎉", sort_order: 13 },
  { code: "nostalgia", label: "📼 Nostalgie",        emoji: "📼", sort_order: 14 },
  { code: "luxury",    label: "✨ Edel",             emoji: "💎", sort_order: 15 },
  { code: "nature",    label: "🌷 Natur",            emoji: "🌷", sort_order: 16 },
  { code: "food",      label: "🍕 Snacks",           emoji: "🍕", sort_order: 17 },
  { code: "quirky",    label: "🤪 Quatsch",          emoji: "🤪", sort_order: 18 },
];

export function seedGiftCategories() {
  try {
    const cnt = db().prepare("SELECT COUNT(*) AS c FROM gift_categories").get().c || 0;
    if (cnt > 0) return false;
    const stmt = db().prepare(
      "INSERT INTO gift_categories (code, label, emoji, sort_order, created_at) VALUES (?, ?, ?, ?, ?)"
    );
    const now = Date.now();
    for (const c of _DEFAULT_GIFT_CATEGORIES) {
      try { stmt.run(c.code, c.label, c.emoji, c.sort_order, now); } catch {}
    }
    return true;
  } catch { return false; }
}

export function listGiftCategories() {
  // Selbstheilung: wenn leer, seedeb.
  try {
    const cnt = db().prepare("SELECT COUNT(*) AS c FROM gift_categories").get().c || 0;
    if (cnt === 0) seedGiftCategories();
  } catch {}
  try {
    return db().prepare(\`
      SELECT id, code, label, emoji, sort_order AS sortOrder, created_at AS createdAt
        FROM gift_categories
        ORDER BY sort_order ASC, label ASC
    \`).all();
  } catch { return []; }
}

export function addGiftCategory({ code, label, emoji = "", sortOrder = 100, createdBy = null }) {
  const c = String(code || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40);
  if (!c) throw new Error("Kategorie-Code ungültig");
  if (!label) throw new Error("Label nötig");
  try {
    db().prepare(\`
      INSERT INTO gift_categories (code, label, emoji, sort_order, created_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    \`).run(c, String(label).slice(0, 60), String(emoji || "").slice(0, 8), Number(sortOrder) || 0, Date.now(), createdBy);
  } catch (e) {
    if (String(e.message || "").includes("UNIQUE")) throw new Error("Kategorie existiert bereits");
    throw e;
  }
  return c;
}

export function updateGiftCategory(id, { label, emoji, sortOrder } = {}) {
  const sets = [], params = [];
  if (label !== undefined)     { sets.push("label = ?");     params.push(String(label).slice(0, 60)); }
  if (emoji !== undefined)     { sets.push("emoji = ?");     params.push(String(emoji || "").slice(0, 8)); }
  if (sortOrder !== undefined) { sets.push("sort_order = ?"); params.push(Number(sortOrder) || 0); }
  if (!sets.length) return false;
  params.push(Number(id));
  db().prepare(\`UPDATE gift_categories SET \${sets.join(", ")} WHERE id = ?\`).run(...params);
  return true;
}

export function deleteGiftCategory(id) {
  // Geschenke in dieser Kategorie auf 'sonstiges' setzen
  try {
    const cat = db().prepare("SELECT code FROM gift_categories WHERE id = ?").get(Number(id));
    if (cat?.code) {
      db().prepare("UPDATE custom_gifts SET category_code = '' WHERE category_code = ?").run(cat.code);
    }
  } catch {}
  db().prepare("DELETE FROM gift_categories WHERE id = ?").run(Number(id));
  return true;
}

// — Geschenke
export function giftIsAvailable(g) {
  if (!g || !g.active) return false;
  if (g.isLimited && g.limitQty > 0 && g.limitSold >= g.limitQty) return false;
  if (g.isSeasonal) {
    const now = Date.now();
    if (g.seasonStart && now < g.seasonStart) return false;
    if (g.seasonEnd && now > g.seasonEnd) return false;
  }
  return true;
}

export function listCustomGifts({ filter = "all", categoryCode = "", search = "", limit = 200, offset = 0, includeInactive = false } = {}) {
  const where = [];
  const params = [];
  if (!includeInactive) where.push("active = 1");
  if (filter === "limited")  where.push("is_limited = 1");
  if (filter === "seasonal") where.push("is_seasonal = 1");
  if (filter === "available") where.push("active = 1");
  if (categoryCode) { where.push("category_code = ?"); params.push(String(categoryCode)); }
  if (search) {
    where.push("(name LIKE ? OR code LIKE ? OR description LIKE ?)");
    const q = "%" + String(search) + "%";
    params.push(q, q, q);
  }
  const whereSql = where.length ? \`WHERE \${where.join(" AND ")}\` : "";
  params.push(Number(limit), Number(offset));
  try {
    return db().prepare(\`
      SELECT id, code, name, description, category_code AS categoryCode,
             price, image_url AS imageUrl,
             is_limited AS isLimited, limit_qty AS limitQty, limit_sold AS limitSold,
             is_seasonal AS isSeasonal, season_start AS seasonStart, season_end AS seasonEnd,
             sort_order AS sortOrder, active, created_at AS createdAt
        FROM custom_gifts
        \${whereSql}
        ORDER BY sort_order ASC, created_at DESC
        LIMIT ? OFFSET ?
    \`).all(...params);
  } catch { return []; }
}

export function getCustomGift(id) {
  try {
    return db().prepare(\`
      SELECT id, code, name, description, category_code AS categoryCode,
             price, image_url AS imageUrl,
             is_limited AS isLimited, limit_qty AS limitQty, limit_sold AS limitSold,
             is_seasonal AS isSeasonal, season_start AS seasonStart, season_end AS seasonEnd,
             sort_order AS sortOrder, active, created_at AS createdAt
        FROM custom_gifts WHERE id = ?
    \`).get(Number(id));
  } catch { return null; }
}

export function addCustomGift({ code, name, description = "", categoryCode = "", price = 5, imageUrl = "",
                                isLimited = false, limitQty = 0, isSeasonal = false,
                                seasonStart = 0, seasonEnd = 0, sortOrder = 100, createdBy = null }) {
  const c = String(code || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40);
  if (!c) throw new Error("Code ungültig");
  if (!name) throw new Error("Name nötig");
  if (imageUrl && !String(imageUrl).startsWith("data:image/")) {
    throw new Error("Bild muss data:image/-URL sein (PNG/WebP)");
  }
  if (imageUrl && imageUrl.length > 800_000) {
    throw new Error("Bild zu groß (max 800 KB)");
  }
  const info = db().prepare(\`
    INSERT INTO custom_gifts
      (code, name, description, category_code, price, image_url,
       is_limited, limit_qty, is_seasonal, season_start, season_end,
       sort_order, active, created_at, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  \`).run(
    c, String(name).slice(0, 80), String(description || "").slice(0, 400),
    String(categoryCode || ""), Math.max(0, Number(price) || 0), String(imageUrl || ""),
    isLimited ? 1 : 0, Math.max(0, Number(limitQty) || 0),
    isSeasonal ? 1 : 0, Number(seasonStart) || 0, Number(seasonEnd) || 0,
    Number(sortOrder) || 100, Date.now(), createdBy
  );
  return info.lastInsertRowid;
}

export function updateCustomGift(id, patch = {}) {
  const allowed = {
    name: "name", description: "description", categoryCode: "category_code",
    price: "price", imageUrl: "image_url",
    isLimited: "is_limited", limitQty: "limit_qty",
    isSeasonal: "is_seasonal", seasonStart: "season_start", seasonEnd: "season_end",
    sortOrder: "sort_order", active: "active",
  };
  const sets = [], params = [];
  for (const [k, col] of Object.entries(allowed)) {
    if (patch[k] === undefined) continue;
    let v = patch[k];
    if (["isLimited","isSeasonal","active"].includes(k)) v = v ? 1 : 0;
    if (["price","limitQty","seasonStart","seasonEnd","sortOrder"].includes(k)) v = Math.max(0, Number(v) || 0);
    if (k === "imageUrl" && v && !String(v).startsWith("data:image/")) {
      throw new Error("Bild muss data:image/-URL sein (PNG/WebP)");
    }
    sets.push(\`\${col} = ?\`);
    params.push(v);
  }
  if (!sets.length) return false;
  params.push(Number(id));
  db().prepare(\`UPDATE custom_gifts SET \${sets.join(", ")} WHERE id = ?\`).run(...params);
  return true;
}

export function setCustomGiftActive(id, active) {
  db().prepare("UPDATE custom_gifts SET active = ? WHERE id = ?").run(active ? 1 : 0, Number(id));
  return true;
}

export function deleteCustomGift(id) {
  db().prepare("DELETE FROM custom_gifts WHERE id = ?").run(Number(id));
  return true;
}

export function countCustomGifts() {
  const out = { all: 0, limited: 0, seasonal: 0, inactive: 0 };
  try {
    out.all      = db().prepare("SELECT COUNT(*) AS c FROM custom_gifts WHERE active = 1").get().c || 0;
    out.limited  = db().prepare("SELECT COUNT(*) AS c FROM custom_gifts WHERE active = 1 AND is_limited = 1").get().c || 0;
    out.seasonal = db().prepare("SELECT COUNT(*) AS c FROM custom_gifts WHERE active = 1 AND is_seasonal = 1").get().c || 0;
    out.inactive = db().prepare("SELECT COUNT(*) AS c FROM custom_gifts WHERE active = 0").get().c || 0;
  } catch {}
  return out;
}
`;
  src += FN;
  changed = true;
  console.log("✓ Geschenke-Admin Helpers angefügt.");
}

if (changed) {
  writeFileSync(DB_PATH, src);
  console.log("\\n✓ db.js gepatched (Geschenke-Admin).");
} else {
  console.log("\\n✓ Nichts zu tun (Geschenke-Admin bereits installiert).");
}
