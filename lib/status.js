// Vorgefertigte Mood/Status-Chips (Jappy-Stil) — geteilt zwischen
// Navbar-Dropdown (oben rechts) und der Status-Seite /profile/status.
// Vordefinierte Chips sind GRATIS. Custom-Text kostet 50 ✨ (siehe lib/premium.js).

export const STATUS_CATS = [
  { title: "📍 Wo bin ich?", items: [
    ["🏠", "zu Hause"], ["🚗", "unterwegs"], ["🏢", "auf der Arbeit"], ["🎓", "Schule/Uni"],
    ["🛏️", "im Bett"], ["🏖️", "im Urlaub"], ["🌳", "draußen"], ["👯", "bei Freunden"],
    ["🛒", "einkaufen"], ["☕", "im Café"], ["🏙️", "in der Stadt"], ["🚆", "im Zug"],
  ] },
  { title: "🎯 Was mache ich?", items: [
    ["😎", "chillen"], ["🎮", "zocken"], ["📚", "lernen"], ["💼", "arbeiten"], ["😴", "schlafen"],
    ["🎧", "Musik hören"], ["📺", "Serie gucken"], ["🍕", "essen"], ["🎉", "feiern"], ["📱", "am Handy"],
    ["📖", "lesen"], ["🍳", "kochen"], ["🏃", "Sport"], ["🚶", "spazieren"], ["☎️", "telefonieren"],
  ] },
  { title: "💭 Wie geht's mir?", items: [
    ["🤩", "super drauf"], ["😊", "glücklich"], ["😍", "verliebt"], ["😫", "gestresst"], ["🥱", "müde"],
    ["😢", "traurig"], ["😐", "gelangweilt"], ["😡", "wütend"], ["😌", "entspannt"], ["🤔", "verträumt"],
    ["🤒", "krank"], ["💪", "motiviert"], ["🥳", "gut gelaunt"], ["😅", "verpeilt"],
  ] },
];

// Schnellsuche flach über alle Kategorien.
export function searchStatuses(query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return null;
  const out = [];
  for (const cat of STATUS_CATS) {
    for (const [em, lbl] of cat.items) {
      if (lbl.toLowerCase().includes(q)) out.push([em, lbl]);
    }
  }
  return out;
}
