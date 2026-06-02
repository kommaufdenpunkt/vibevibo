// Reale Pflege-Orte (POI = Points of Interest) aus OpenStreetMap.
// Wir holen Apotheken, Parks, Hotels, … im Umkreis (Overpass-API, kostenlos)
// und mappen sie auf VIBO-Pflege-Effekte mit Cooldowns (Anti-Inflation).

// Wirkung auf VIBO-Stats (siehe lib/vibo.js Stats). Plus optional:
// cureLight (heilt Erkältung+Bauchweh), cureAll (heilt alle Krankheiten).
export const POI_TYPES = {
  pharmacy: {
    emoji: "💊", label: "Apotheke", color: "#16a34a", cooldownH: 6,
    desc: "Schnelle Heilung für leichte Beschwerden.",
    effect: { health: 25, cureLight: true },
  },
  hospital: {
    emoji: "🏥", label: "Krankenhaus", color: "#dc2626", cooldownH: 24,
    desc: "Heilt auch schwere Krankheiten.",
    effect: { health: 45, affection: 15, cureAll: true },
  },
  veterinary: {
    emoji: "🐾", label: "Tierarzt", color: "#9333ea", cooldownH: 168,
    desc: "Voll-Check für dein VIBO — einmal pro Woche.",
    effect: { hunger: 25, fun: 20, hygiene: 25, affection: 20, health: 40, cureAll: true },
  },
  park: {
    emoji: "🌳", label: "Park", color: "#22c55e", cooldownH: 12,
    desc: "Frische Luft, Bäume, gute Laune.",
    effect: { fun: 25, affection: 15, health: 10 },
  },
  playground: {
    emoji: "🎢", label: "Spielplatz", color: "#f59e0b", cooldownH: 8,
    desc: "Toben und klettern bis zum Umfallen.",
    effect: { fun: 35, affection: 10 },
  },
  hotel: {
    emoji: "🏨", label: "Hotel", color: "#0ea5e9", cooldownH: 24,
    desc: "Mal richtig ausschlafen — danach wie neu.",
    effect: { health: 50, fun: 15, affection: 5 },
  },
  cafe: {
    emoji: "☕", label: "Café / Restaurant", color: "#a16207", cooldownH: 4,
    desc: "Snack-Pause — kleiner Hunger-Boost.",
    effect: { hunger: 30, fun: 8 },
  },
  fountain: {
    emoji: "💧", label: "Brunnen", color: "#06b6d4", cooldownH: 2,
    desc: "Kurz was trinken.",
    effect: { hunger: 15 },
  },
  bench: {
    emoji: "😌", label: "Bank", color: "#737373", cooldownH: 1,
    desc: "Eine Minute Pause auf der Bank.",
    effect: { fun: 10, health: 5 },
  },
};

export const POI_KINDS = Object.keys(POI_TYPES);

// OSM-Tag → unsere Kategorie. Reihenfolge wichtig (spezifischer zuerst).
function classify(tags) {
  if (!tags) return null;
  const am = (tags.amenity || "").toLowerCase();
  const lei = (tags.leisure || "").toLowerCase();
  const tour = (tags.tourism || "").toLowerCase();
  if (am === "pharmacy") return "pharmacy";
  if (am === "hospital" || am === "clinic" || am === "doctors") return "hospital";
  if (am === "veterinary") return "veterinary";
  if (lei === "park" || lei === "garden") return "park";
  if (lei === "playground") return "playground";
  if (tour === "hotel" || tour === "hostel" || tour === "guest_house" || tour === "motel") return "hotel";
  if (am === "cafe" || am === "restaurant" || am === "bar" || am === "pub" || am === "fast_food" || am === "ice_cream") return "cafe";
  if (am === "fountain" || am === "drinking_water") return "fountain";
  if (am === "bench") return "bench";
  return null;
}

const _poiCache = new Map();
const POI_TTL = 10 * 60_000;
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

// POIs im Umkreis (Default 500 m). Liefert Array {kind, osmId, lat, lng, name?}.
export async function poiNearby(lat, lng, radiusM = 500) {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)},${radiusM}`;
  const cached = _poiCache.get(key);
  if (cached && Date.now() - cached.at < POI_TTL) return cached.pois;

  const aroundN = `node(around:${radiusM},${lat},${lng})`;
  const aroundW = `way(around:${radiusM},${lat},${lng})`;
  const q = `[out:json][timeout:10];(
    ${aroundN}["amenity"~"pharmacy|hospital|clinic|doctors|veterinary|cafe|restaurant|bar|pub|fast_food|ice_cream|fountain|drinking_water|bench"];
    ${aroundN}["leisure"~"park|garden|playground"];
    ${aroundN}["tourism"~"hotel|hostel|guest_house|motel"];
    ${aroundW}["leisure"~"park|garden|playground"];
    ${aroundW}["tourism"~"hotel|hostel|guest_house|motel"];
  );out center 120;`;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const r = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(q),
      signal: ctrl.signal,
    });
    if (!r.ok) return [];
    const data = await r.json();
    const out = [];
    for (const el of (data.elements || [])) {
      const kind = classify(el.tags);
      if (!kind) continue;
      const pLat = el.lat ?? el.center?.lat;
      const pLng = el.lon ?? el.center?.lon;
      if (pLat == null || pLng == null) continue;
      out.push({
        kind,
        osmId: `${el.type}/${el.id}`,
        lat: pLat,
        lng: pLng,
        name: el.tags?.name || null,
      });
    }
    _poiCache.set(key, { at: Date.now(), pois: out });
    return out;
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

export function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Muss man in diesen Radius (m) sein, um den POI zu „nutzen".
export const POI_USE_RADIUS_M = 30;
