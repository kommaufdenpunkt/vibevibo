// Aktivitäts-Stufen wie früher bei Jappy (5 Balken).
// Basiert auf last_seen-Heartbeats vom Server.

export const ONLINE_THRESHOLD_MS = 10 * 60_000; // <10 Min = "online" (grün)

// Liefert eine Stufe 0-5:
//   5 = super aktiv (<1 Min seit letztem Ping)
//   4 = aktiv (<3 Min)
//   3 = online (<10 Min)
//   2 = kurz weg (<30 Min)
//   1 = länger abwesend (<60 Min)
//   0 = offline (>60 Min)
export function activityLevel(lastSeen) {
  if (!lastSeen) return 0;
  const diff = Date.now() - lastSeen;
  if (diff < 60_000) return 5;
  if (diff < 3 * 60_000) return 4;
  if (diff < 10 * 60_000) return 3;
  if (diff < 30 * 60_000) return 2;
  if (diff < 60 * 60_000) return 1;
  return 0;
}

// Online im Sinne von „Name grün hinterlegt"
export function isOnlineActivity(lastSeen) {
  return activityLevel(lastSeen) >= 3;
}

// "Zuletzt aktiv vor …" – wie früher bei Jappy/SchülerVZ formuliert.
export function formatLastActive(lastSeen) {
  if (!lastSeen) return "noch nie";
  const diff = Date.now() - lastSeen;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "gerade eben";
  const min = Math.floor(sec / 60);
  if (min < 60) return `vor ${min} Min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `vor ${hr} Std`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "vor 1 Tag";
  if (day < 7) return `vor ${day} Tagen`;
  if (day < 30) return `vor ${Math.floor(day / 7)} Wochen`;
  return new Date(lastSeen).toLocaleDateString("de-DE");
}

export function activityLabel(level) {
  switch (level) {
    case 5: return "super aktiv";
    case 4: return "aktiv";
    case 3: return "online";
    case 2: return "kurz weg";
    case 1: return "abwesend";
    default: return "offline";
  }
}

// Farbe für die Aktivitätsbalken
export function activityColor(level) {
  if (level >= 4) return "#10b981";  // sattes grün
  if (level === 3) return "#84cc16"; // hellgrün
  if (level === 2) return "#eab308"; // gelb
  if (level === 1) return "#f97316"; // orange
  return "rgba(60,60,67,0.25)";       // grau
}
