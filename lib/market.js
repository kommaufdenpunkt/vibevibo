// VIBO-Basar: lokale Händler in deiner Nachbarschaft.
// 3 Händler pro Woche kommen ins „Viertel" — ihre Stände wandern täglich
// (50-80m / 150-250m / 400-600m vom Anker). Verkauft wird nur, wenn du
// physisch hinläufst (≤ 30m). Preise schwanken deterministisch (alle sehen dieselben).
// Anti-Inflation bleibt KERN: Tages-Cap + Diminishing pro Verkauf.

// Deterministischer Pseudo-Zufall aus String-Seed (0..1)
function seeded(seedStr) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

function isoWeek(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((date - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${date.getUTCFullYear()}-W${week}`;
}

function dayKeyOf(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10);
}

// Alle Händler — jeder mit Charakter + Kategorie-Multiplikatoren (fish/treasure/junk/legendary).
// Keine Öffnungszeiten mehr — sie stehen den ganzen Tag dort, wo du sie heute findest.
export const MERCHANTS = [
  { id: "fred",    name: "Fischer-Fred",     emoji: "🎣", blurb: "Zahlt top für frischen Fisch.",         mult: { fish: 1.4, treasure: 1.0, junk: 0.5, legendary: 1.2 } },
  { id: "klara",   name: "Karten-Klara",     emoji: "🎴", blurb: "Sammlerin durch und durch.",             mult: { fish: 0.9, treasure: 1.3, junk: 0.7, legendary: 1.4 } },
  { id: "schorsch",name: "Schrott-Schorsch", emoji: "🥫", blurb: "Kauft sogar deinen Müll — fair.",         mult: { fish: 0.8, treasure: 1.0, junk: 1.8, legendary: 1.0 } },
  { id: "nadja",   name: "Nacht-Nadja",      emoji: "🌙", blurb: "Geheimnisvoll, zahlt für alles solide.",  mult: { fish: 1.3, treasure: 1.3, junk: 1.0, legendary: 1.3 } },
  { id: "greta",   name: "Gierige Greta",    emoji: "💰", blurb: "Mondpreise — aber wählerisch.",            mult: { fish: 1.6, treasure: 1.6, junk: 0.3, legendary: 1.8 } },
  { id: "olaf",    name: "Onkel Olaf",       emoji: "🧓", blurb: "Gemütlich, kauft alles solide.",           mult: { fish: 1.1, treasure: 1.1, junk: 1.1, legendary: 1.1 } },
  { id: "mira",    name: "Markt-Mira",       emoji: "🧺", blurb: "Frühaufsteherin mit gutem Fischpreis.",    mult: { fish: 1.5, treasure: 0.9, junk: 0.8, legendary: 1.1 } },
  { id: "bruno",   name: "Boss Bruno",       emoji: "🕶️", blurb: "Liebhaber seltener Stücke.",               mult: { fish: 0.9, treasure: 1.5, junk: 0.6, legendary: 2.0 } },
  { id: "wanda",   name: "Wander-Wanda",     emoji: "🚐", blurb: "Mobil unterwegs, faire Mischung.",         mult: { fish: 1.2, treasure: 1.2, junk: 1.2, legendary: 1.2 } },
  { id: "kai",     name: "Küsten-Kai",       emoji: "⚓", blurb: "Meeresfrüchte sind sein Ding.",            mult: { fish: 1.35, treasure: 1.1, junk: 0.7, legendary: 1.2 } },
];
export const MERCHANT_MAP = Object.fromEntries(MERCHANTS.map((m) => [m.id, m]));

// Die 3 Händler dieser Woche (deterministisch rotierend, alle sehen dieselben).
export function weeklyMerchants(now = Date.now()) {
  const wk = isoWeek(new Date(now));
  const picked = [];
  const pool = [...MERCHANTS];
  for (let i = 0; i < 3 && pool.length; i++) {
    const r = seeded(`${wk}:merch:${i}`);
    const idx = Math.floor(r * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

// Tages-Preisfaktor pro Händler+Kategorie (0,7–1,8), schwankt täglich.
export function dailyFactor(merchantId, category, now = Date.now()) {
  const r = seeded(`${dayKeyOf(now)}:${merchantId}:${category}`);
  return Math.round((0.7 + r * 1.1) * 100) / 100;
}

// Tagesgesuch (Hot Item): ein zufälliger Fisch wird heute doppelt bezahlt.
export function hotItem(now = Date.now()) {
  return seeded(`${dayKeyOf(now)}:hot`);
}

// Verkaufspreis eines Fangs bei einem Händler.
export function sellPrice(merchant, category, baseValue, dayFactor, isHot = false) {
  const catMult = merchant.mult[category] ?? 1;
  let p = baseValue * catMult * dayFactor * (isHot ? 2 : 1);
  return Math.max(1, Math.round(p));
}

// ---- Anti-Inflation ----
export const MAX_SELL_VIBES_PER_DAY = 120;
export const SELL_DIMINISH_AFTER = 15;

// ---- Lokale Händler-Standorte ----
// Drei „Slots" um den Anker (dein Zuhause): nah / mittel / weiter weg.
// Position rotiert täglich, Distanz innerhalb der Spannweite ebenfalls.
export const MERCHANT_SLOTS = [
  { id: "near",   minM:  40, maxM:  90, label: "gleich um die Ecke" },
  { id: "block",  minM: 150, maxM: 260, label: "nächste Querstraße" },
  { id: "far",    minM: 420, maxM: 620, label: "ein paar Straßen weiter" },
];

// Muss in diesen Radius (in m), um zu verkaufen.
export const SELL_RADIUS_M = 30;

// Versetzt einen Lat/Lng-Punkt um `dist` Meter in `bearing` Grad (0=N, 90=O).
function offsetLatLng(lat, lng, distM, bearingDeg) {
  const R = 6371000;
  const br = (bearingDeg * Math.PI) / 180;
  const latR = (lat * Math.PI) / 180;
  const dN = distM * Math.cos(br);
  const dE = distM * Math.sin(br);
  const dLat = dN / R;
  const dLng = dE / (R * Math.cos(latR));
  return {
    lat: lat + (dLat * 180) / Math.PI,
    lng: lng + (dLng * 180) / Math.PI,
  };
}

function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Liefert die 3 Wochen-Händler mit täglich rotierenden Standorten um den Anker.
export function localMerchants(homeLat, homeLng, now = Date.now()) {
  const week = weeklyMerchants(now);
  const day = dayKeyOf(now);
  return week.map((m, i) => {
    const slot = MERCHANT_SLOTS[i] || MERCHANT_SLOTS[MERCHANT_SLOTS.length - 1];
    const rDist = seeded(`${day}:${m.id}:dist`);
    const rBear = seeded(`${day}:${m.id}:bear`);
    const dist = Math.round(slot.minM + rDist * (slot.maxM - slot.minM));
    const bearing = Math.round(rBear * 360);
    const pos = offsetLatLng(homeLat, homeLng, dist, bearing);
    return {
      ...m,
      slot: slot.id,
      slotLabel: slot.label,
      lat: pos.lat,
      lng: pos.lng,
      anchorDistM: dist,
      bearingDeg: bearing,
    };
  });
}

// Entfernung User → Händler (in m, gerundet).
export function distanceToMerchant(merchant, userLat, userLng) {
  if (userLat == null || userLng == null) return null;
  return Math.round(haversineM(merchant.lat, merchant.lng, userLat, userLng));
}

// In Verkaufsreichweite?
export function inSellRange(merchant, userLat, userLng) {
  const d = distanceToMerchant(merchant, userLat, userLng);
  return d != null && d <= SELL_RADIUS_M;
}
