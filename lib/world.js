// Realitätskarte: Items spawnen in 100–450 m Radius um den User.
// Distanz wird per Haversine berechnet (Meter). Server-seitig wird beim
// Pickup geprüft, dass der User tatsächlich nah genug am Item ist.

// Erdradius in Metern
const R = 6_371_000;
const toRad = (d) => (d * Math.PI) / 180;

// Genaue Distanz in Metern zwischen zwei GPS-Koordinaten
export function distanceMeters(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Setzt einen Punkt in Distanz `distM` m und Winkel `bearingDeg` um (lat,lng).
export function offsetPoint(lat, lng, distM, bearingDeg) {
  const br = toRad(bearingDeg);
  const lat1 = toRad(lat);
  const lng1 = toRad(lng);
  const d = distM / R;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(br));
  const lng2 = lng1 + Math.atan2(Math.sin(br) * Math.sin(d) * Math.cos(lat1),
                                 Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: (lat2 * 180) / Math.PI, lng: (lng2 * 180) / Math.PI };
}

// Item-Definitionen — Drop-Wahrscheinlichkeit + Wirkung
export const ITEMS = {
  vibe_coin: { name: "Vibe-Münze",      emoji: "✨", weight: 60, color: "#fbbf24", description: "+2 Vibes" },
  apple:     { name: "VIBO-Apfel",      emoji: "🍎", weight: 25, color: "#ef4444", description: "+10 VIBO-Hunger" },
  card:      { name: "Sammelkarte",     emoji: "🎴", weight: 12, color: "#8b5cf6", description: "Für die Sammlung" },
  egg:       { name: "Mysterium-Ei",    emoji: "🥚", weight:  2, color: "#86efac", description: "Neue VIBO-Spezies?!" },
  crystal:   { name: "Vibe-Kristall",   emoji: "💎", weight:  1, color: "#06b6d4", description: "+10 Vibes (Selten!)" },
};

function pickRandomKind() {
  const total = Object.values(ITEMS).reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const [k, i] of Object.entries(ITEMS)) {
    if ((r -= i.weight) <= 0) return k;
  }
  return "vibe_coin";
}

// Generiert eine Liste neuer Items um (lat,lng): zufällige Distanz 80-450m,
// zufällige Richtung 0-360°. Dauer 30 Min.
export function generateSpawns(lat, lng, count) {
  const now = Date.now();
  const ttl = 30 * 60_000;
  const out = [];
  for (let i = 0; i < count; i++) {
    const dist = 80 + Math.random() * 370;
    const bearing = Math.random() * 360;
    const pt = offsetPoint(lat, lng, dist, bearing);
    out.push({
      kind: pickRandomKind(),
      lat: Math.round(pt.lat * 1e6) / 1e6,
      lng: Math.round(pt.lng * 1e6) / 1e6,
      spawned_at: now,
      expires_at: now + ttl,
    });
  }
  return out;
}

// Konstanten
export const PICKUP_RADIUS_M = 30;        // Wie nah man dran sein muss
export const SPAWN_TARGET_DENSITY = 6;     // Items in 500m Radius
export const SPAWN_RADIUS_M = 500;
export const PICKUP_COOLDOWN_MS = 25_000;  // 25 s zwischen Pickups
export const MAX_PICKUPS_PER_DAY = 80;
export const MAX_SPEED_KMH = 200;          // Über 200 km/h = Cheat
