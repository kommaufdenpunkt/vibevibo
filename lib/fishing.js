// Angeln auf der Realitätskarte — nur in der Nähe echter Gewässer.
// Gewässer-Erkennung via Overpass (OpenStreetMap), kostenlos & ohne Key.
// Fänge sind verkaufbar (siehe lib/market.js).

// Kategorien: fish (füttert VIBO + verkaufbar), treasure (wertvoll),
// junk (witzig, wenig wert), rare/legendary (selten, Dex-würdig).
// when: "day" | "night" | "any"  ·  weather: bevorzugtes Wetter-Thema (optional)
// sizeRange: [minCm, maxCm] — Größe beeinflusst den Verkaufswert.
export const FISH_TABLE = [
  // — Allerwelts-Fische (immer) —
  { id: "stichling",  name: "Stichling",   emoji: "🐟", weight: 26, cat: "fish",     when: "any",   base: 2,  size: [3, 9],   hunger: 8,  msg: "Ein kleiner Stichling!" },
  { id: "barsch",     name: "Barsch",      emoji: "🐠", weight: 20, cat: "fish",     when: "any",   base: 4,  size: [12, 38], hunger: 14, msg: "Ein schöner Barsch!" },
  { id: "rotauge",    name: "Rotauge",     emoji: "🐟", weight: 16, cat: "fish",     when: "any",   base: 3,  size: [10, 30], hunger: 12, msg: "Ein flinkes Rotauge!" },
  { id: "krabbe",     name: "Krabbe",      emoji: "🦀", weight: 10, cat: "fish",     when: "any",   base: 4,  size: [4, 16],  hunger: 10, msg: "Eine zwickende Krabbe!" },
  // — Tagfänge —
  { id: "forelle",    name: "Forelle",     emoji: "🎣", weight: 14, cat: "fish",     when: "day",   base: 6,  size: [20, 55], hunger: 18, msg: "Eine glitzernde Forelle!" },
  { id: "karpfen",    name: "Karpfen",     emoji: "🐟", weight: 11, cat: "fish",     when: "day",   base: 8,  size: [30, 80], hunger: 22, msg: "Ein dicker Karpfen!" },
  { id: "hecht",      name: "Hecht",       emoji: "🐊", weight: 7,  cat: "fish",     when: "day",   base: 12, size: [40, 110], hunger: 26, msg: "Ein räuberischer Hecht!" },
  // — Nachtfänge —
  { id: "aal",        name: "Aal",         emoji: "🐍", weight: 10, cat: "fish",     when: "night", base: 9,  size: [30, 95], hunger: 20, msg: "Ein glitschiger Aal!" },
  { id: "wels",       name: "Wels",        emoji: "🐟", weight: 6,  cat: "fish",     when: "night", base: 16, size: [50, 180], hunger: 30, msg: "Ein riesiger Wels!" },
  { id: "leuchtfisch",name: "Leuchtfisch", emoji: "🐡", weight: 5,  cat: "fish",     when: "night", base: 14, size: [8, 22],  hunger: 16, msg: "Ein leuchtender Tiefsee-Fisch!" },
  // — Meer (Küste) —
  { id: "tintenfisch",name: "Tintenfisch", emoji: "🦑", weight: 7,  cat: "fish",     when: "any",   base: 8,  size: [15, 60], hunger: 20, msg: "Ein glibbriger Tintenfisch!" },
  { id: "qualle",     name: "Qualle",      emoji: "🪼", weight: 5,  cat: "fish",     when: "any",   base: 3,  size: [10, 40], hunger: 6,  msg: "Eine wabbelige Qualle!" },
  // — Schätze / wertvoll —
  { id: "goldfisch",  name: "Goldfisch",   emoji: "🐠", weight: 5,  cat: "treasure", when: "any",   base: 18, size: [5, 20],  hunger: 0,  msg: "Ein Goldfisch — Glück gehabt! ✨" },
  { id: "koi",        name: "Koi-Karpfen", emoji: "🎏", weight: 3,  cat: "treasure", when: "day",   base: 30, size: [25, 70], hunger: 0,  msg: "Ein prächtiger Koi! 🎏" },
  { id: "stoer",      name: "Stör",        emoji: "🐟", weight: 2,  cat: "treasure", when: "any",   base: 45, size: [80, 250], hunger: 0, msg: "Ein uralter Stör — Kaviar-Alarm!" },
  // — Müll —
  { id: "stiefel",    name: "Alter Stiefel", emoji: "🥾", weight: 7, cat: "junk",    when: "any",   base: 1,  size: [0, 0],   hunger: 0,  msg: "Nur ein alter Stiefel… 😅" },
  { id: "dose",       name: "Blechdose",   emoji: "🥫", weight: 5,  cat: "junk",     when: "any",   base: 1,  size: [0, 0],   hunger: 0,  msg: "Müll gefischt. Immerhin sauberes Wasser!" },
  { id: "reifen",     name: "Autoreifen",  emoji: "🛞", weight: 3,  cat: "junk",     when: "any",   base: 2,  size: [0, 0],   hunger: 0,  msg: "Ein alter Reifen — schwer!" },
  // — Legendär —
  { id: "donaudrache",name: "Donau-Drache", emoji: "🐉", weight: 1, cat: "legendary", when: "any",  base: 80, size: [100, 300], hunger: 40, weather: "storm", msg: "LEGENDÄR! Der Donau-Drache! 🐉⚡" },
  { id: "goldkarpfen",name: "Goldener Karpfen", emoji: "🥇", weight: 1, cat: "legendary", when: "any", base: 120, size: [60, 140], hunger: 30, msg: "LEGENDÄR! Ein goldener Karpfen! 🥇" },
];

export const FISH_MAP = Object.fromEntries(FISH_TABLE.map((f) => [f.id, f]));

// Fisch ziehen, abhängig von Tageszeit + Wetter. Bei passendem Wetter
// erhält die wetter-spezifische Spezies (z.B. Donau-Drache bei Gewitter)
// extra Gewicht.
export function pickFish({ isNight = false, weatherKey = null } = {}) {
  const pool = FISH_TABLE.map((f) => {
    let w = f.weight;
    if (f.when === "day" && isNight) w *= 0.3;
    if (f.when === "night" && !isNight) w *= 0.3;
    if (f.weather && f.weather === weatherKey) w *= 6;  // Gewitter → Drache
    return { f, w };
  });
  const total = pool.reduce((s, p) => s + p.w, 0);
  let r = Math.random() * total;
  for (const p of pool) {
    if ((r -= p.w) <= 0) return p.f;
  }
  return FISH_TABLE[0];
}

// Größe würfeln (cm) — leicht zur Mitte gewichtet, große Fänge selten.
export function rollSize(fish) {
  const [lo, hi] = fish.size || [0, 0];
  if (hi <= 0) return 0;
  const a = Math.random(), b = Math.random();
  const mid = (a + b) / 2;              // Dreiecksverteilung → Mitte häufiger
  return Math.round(lo + (hi - lo) * mid);
}

// Wert eines konkreten Fangs: base × Größen-Faktor (relativ zur Max-Größe).
export function catchValue(fish, sizeCm) {
  const [lo, hi] = fish.size || [0, 0];
  let sizeFactor = 1;
  if (hi > lo) sizeFactor = 0.7 + 0.8 * ((sizeCm - lo) / (hi - lo)); // 0.7–1.5
  return Math.max(1, Math.round(fish.base * sizeFactor));
}

export async function waterNearby(lat, lng, radiusM = 150) {
  const waters = await listWaters(lat, lng, radiusM);
  if (waters === null) return null;
  return waters.length > 0;
}

// Liefert eine Liste der Gewaesser in der Naehe: Seen, Teiche, Fluesse.
// Jeder Eintrag: { id, kind, name, lat, lng, radiusM }.
// Cache 5 Min pro Gridzelle, damit Overpass nicht ueberlastet wird.
export async function listWaters(lat, lng, radiusM = 600) {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)},${radiusM}`;
  const cached = _waterListCache.get(key);
  if (cached && Date.now() - cached.at < WATER_TTL) return cached.waters;

  // out center bb: liefert Zentrum + Bounding-Box pro Way/Relation.
  // So koennen wir den Radius aus der BB ableiten.
  const q = `[out:json][timeout:8];(
    way(around:${radiusM},${lat},${lng})["natural"="water"];
    way(around:${radiusM},${lat},${lng})["waterway"~"river|canal|stream"];
    relation(around:${radiusM},${lat},${lng})["natural"="water"];
    way(around:${radiusM},${lat},${lng})["leisure"="swimming_pool"];
  );out center bb;`;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(q),
      signal: ctrl.signal,
    });
    if (!r.ok) {
      _waterListCache.set(key, { at: Date.now(), waters: [] });
      return [];
    }
    const d = await r.json();
    const waters = [];
    for (const el of d.elements || []) {
      const c = el.center || { lat: el.lat, lon: el.lon };
      const bb = el.bounds;
      if (!c?.lat || !c?.lon) continue;
      // Radius aus BB ableiten (Halbe Diagonale), Floor 25m, Ceil 350m
      let rM = 60;
      if (bb) {
        const dLat = (bb.maxlat - bb.minlat) * 111000;
        const dLng = (bb.maxlon - bb.minlon) * 111000 * Math.cos((c.lat * Math.PI) / 180);
        rM = Math.max(25, Math.min(350, Math.round(Math.sqrt(dLat * dLat + dLng * dLng) / 2)));
      }
      const tags = el.tags || {};
      const kind = tags.waterway ? "river"
                 : tags.leisure === "swimming_pool" ? "pool"
                 : "lake";
      waters.push({
        id: `${el.type[0]}${el.id}`,
        kind,
        name: tags.name || (kind === "river" ? "Fluss" : kind === "pool" ? "Pool" : "Gewässer"),
        lat: c.lat,
        lng: c.lon,
        radiusM: rM,
      });
    }
    _waterListCache.set(key, { at: Date.now(), waters });
    return waters;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

const _waterListCache = new Map();
const WATER_TTL = 5 * 60_000;

export const FISH_COOLDOWN_MS = 20_000;
export const MAX_FISH_PER_DAY = 60;
