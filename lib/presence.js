// MSN-Style Presence: leitet sich aus dem aktuellen Jappy-Status (chillen, arbeiten, ...)
// und dem optionalen manuellen Override (online/away/busy/invisible) ab.
// Liefert {key, color, label} für den farbigen Ring um den Avatar.

const RING = {
  online:    { key: "online",    color: "#10b981", label: "online" },
  chill:     { key: "chill",     color: "#22d3a4", label: "chillig" },
  away:      { key: "away",      color: "#f59e0b", label: "abwesend" },
  busy:      { key: "busy",      color: "#ef4444", label: "beschäftigt" },
  invisible: { key: "invisible", color: "#9ca3af", label: "unsichtbar" },
  offline:   { key: "offline",   color: "#cbd5e1", label: "offline" },
};

const TO_BUSY = new Set([
  "arbeiten", "Schule/Uni", "lernen", "telefonieren", "im Zug",
]);
const TO_AWAY = new Set([
  "schlafen", "im Bett", "müde", "im Urlaub", "feiern", "krank",
  "einkaufen", "spazieren", "Serie gucken", "Sport",
]);
const TO_CHILL = new Set([
  "chillen", "entspannt", "im Café", "draußen", "zu Hause",
  "Musik hören", "lesen", "verträumt", "verliebt", "glücklich",
  "gut gelaunt", "super drauf",
]);

export function getPresence({ statusText = "", presence = "online", online = true } = {}) {
  if (!online) return RING.offline;
  if (presence === "invisible") return RING.invisible;
  if (presence === "busy") return RING.busy;
  if (presence === "away") return RING.away;
  // Automatisch aus dem Status ableiten
  const s = String(statusText || "").trim();
  if (s) {
    if (TO_BUSY.has(s)) return RING.busy;
    if (TO_AWAY.has(s)) return RING.away;
    if (TO_CHILL.has(s)) return RING.chill;
  }
  return RING.online;
}

export const PRESENCE_OPTIONS = [
  { value: "online",    label: "🟢 Online" },
  { value: "away",      label: "🟡 Abwesend" },
  { value: "busy",      label: "🔴 Beschäftigt" },
  { value: "invisible", label: "⚪ Unsichtbar" },
];
