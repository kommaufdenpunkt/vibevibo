// VIBO-Basar: wandernde Händler kaufen deine Fänge zu schwankenden Preisen.
// Anti-Inflation ist KERN: täglicher Verkaufs-Cap + Diminishing pro Tag,
// Preise schwanken deterministisch (alle Spieler sehen dieselben Preise).

// Deterministischer Pseudo-Zufall aus String-Seed (0..1)
function seeded(seedStr) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // in 0..1
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

// Alle Händler — jeder mit Charakter, Öffnungszeiten (Stunde 0-24) und
// Multiplikatoren pro Kategorie (fish/treasure/junk/legendary).
export const MERCHANTS = [
  { id: "fred",   name: "Fischer-Fred",  emoji: "🎣", blurb: "Zahlt top für frischen Fisch.",       open: [6, 12],  mult: { fish: 1.4, treasure: 1.0, junk: 0.5, legendary: 1.2 } },
  { id: "klara",  name: "Karten-Klara",  emoji: "🎴", blurb: "Sammlerin durch und durch.",            open: [12, 18], mult: { fish: 0.9, treasure: 1.3, junk: 0.7, legendary: 1.4 } },
  { id: "schorsch",name:"Schrott-Schorsch",emoji:"🥫", blurb: "Kauft sogar deinen Müll — fair.",       open: [18, 24], mult: { fish: 0.8, treasure: 1.0, junk: 1.8, legendary: 1.0 } },
  { id: "nadja",  name: "Nacht-Nadja",   emoji: "🌙", blurb: "Nachtschwärmerin, zahlt nachts extra.", open: [0, 6],   mult: { fish: 1.3, treasure: 1.3, junk: 1.0, legendary: 1.3 } },
  { id: "greta",  name: "Gierige Greta", emoji: "💰", blurb: "Mondpreise — aber wählerisch.",          open: [10, 20], mult: { fish: 1.6, treasure: 1.6, junk: 0.3, legendary: 1.8 } },
  { id: "olaf",   name: "Onkel Olaf",    emoji: "🧓", blurb: "Gemütlich, kauft alles solide.",         open: [8, 22],  mult: { fish: 1.1, treasure: 1.1, junk: 1.1, legendary: 1.1 } },
  { id: "mira",   name: "Markt-Mira",    emoji: "🧺", blurb: "Frühaufsteherin mit gutem Fischpreis.",  open: [5, 11],  mult: { fish: 1.5, treasure: 0.9, junk: 0.8, legendary: 1.1 } },
  { id: "bruno",  name: "Boss Bruno",    emoji: "🕶️", blurb: "Liebhaber seltener Stücke.",             open: [14, 23], mult: { fish: 0.9, treasure: 1.5, junk: 0.6, legendary: 2.0 } },
  { id: "wanda",  name: "Wander-Wanda",  emoji: "🚐", blurb: "Mobil unterwegs, faire Mischung.",       open: [9, 19],  mult: { fish: 1.2, treasure: 1.2, junk: 1.2, legendary: 1.2 } },
  { id: "kai",    name: "Küsten-Kai",    emoji: "⚓", blurb: "Meeresfrüchte sind sein Ding.",          open: [7, 15],  mult: { fish: 1.35, treasure: 1.1, junk: 0.7, legendary: 1.2 } },
];
export const MERCHANT_MAP = Object.fromEntries(MERCHANTS.map((m) => [m.id, m]));

// Die 3 Händler dieser Woche (deterministisch rotierend, alle sehen dieselben).
export function weeklyMerchants(now = Date.now()) {
  const wk = isoWeek(new Date(now));
  const picked = [];
  const pool = [...MERCHANTS];
  // 3 ziehen ohne Zurücklegen, seed pro Woche
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
  return Math.round((0.7 + r * 1.1) * 100) / 100;  // 0.70 – 1.80
}

// Tagesgesuch (Hot Item): ein zufälliger Fisch wird heute doppelt bezahlt.
export function hotItem(now = Date.now()) {
  // wird in der API mit der Fisch-Liste aufgelöst
  return seeded(`${dayKeyOf(now)}:hot`);
}

// Ist Händler gerade offen? (open = [startStunde, endStunde], lokal)
export function isOpen(merchant, now = Date.now()) {
  const h = new Date(now).getHours();
  const [a, b] = merchant.open;
  return h >= a && h < b;
}

// Verkaufspreis eines Fangs bei einem Händler:
// baseValue × Kategorie-Multiplikator × Tagesfaktor × (Hot-Item ? 2 : 1)
export function sellPrice(merchant, category, baseValue, dayFactor, isHot = false) {
  const catMult = merchant.mult[category] ?? 1;
  let p = baseValue * catMult * dayFactor * (isHot ? 2 : 1);
  return Math.max(1, Math.round(p));
}

// ---- Anti-Inflation ----
// Maximal so viele Vibes pro Tag durch Verkäufe — schützt die Währung.
export const MAX_SELL_VIBES_PER_DAY = 120;
// Ab dieser Anzahl Verkäufe am Tag sinkt der Auszahlungsfaktor.
export const SELL_DIMINISH_AFTER = 15;
