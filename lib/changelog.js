// 🆕 Changelog-Eintraege fuer den "NEU"-Reiter im rechten Edge-Panel.
// Neuste Eintraege oben. ISO-8601 mit Zeitzone, damit Datum/Uhrzeit
// pro User-Locale schoen formatiert werden koennen.

export const CHANGELOG = [
  { at: "2026-06-13T01:05+02:00", emoji: "💖", title: "Komplimente: doppelter Kasten weg" },
  { at: "2026-06-13T01:02+02:00", emoji: "🔔", title: "Bell als Floating-Button oben rechts" },
  { at: "2026-06-13T00:55+02:00", emoji: "🎵", title: "Profil-Musik mit Playlist + Mini-Dock (laeuft beim Browsen weiter)" },
  { at: "2026-06-13T00:55+02:00", emoji: "💬", title: "Komplimente in die rechte Profil-Sidebar verschoben" },
  { at: "2026-06-13T00:55+02:00", emoji: "📱", title: "Messenger Glas-Optik (kein schwarzer Block mehr)" },
  { at: "2026-06-13T00:36+02:00", emoji: "✎", title: "Begruessungstext direkt im Profil bearbeiten (Inline-Editor)" },
  { at: "2026-06-13T00:33+02:00", emoji: "🎨", title: "Skin-Editor: Live-Vorschau im Mini-Browser-Frame" },
  { at: "2026-06-13T00:30+02:00", emoji: "🌸", title: "Begruessungs-Editor v2 (Einfach/Profi-Modus + Templates)" },
  { at: "2026-06-13T00:26+02:00", emoji: "🛠", title: "Audit-Fixes: Bell-Kontrast, Inhalte-Gruppe, Logout im Edge-Panel" },
  { at: "2026-06-13T00:23+02:00", emoji: "🟣", title: "Home-Tiles einreihig + horizontales Swipen ohne Scrollbar" },
  { at: "2026-06-13T00:20+02:00", emoji: "⚡", title: "Alte Navbar raus, Vibes/Status in den rechten Edge-Panel" },
  { at: "2026-06-13T00:15+02:00", emoji: "🔍", title: "Messenger Filter-Chips (Alle/Ungelesen/Gruppen) + bessere Empty-States" },
  { at: "2026-06-13T00:00+02:00", emoji: "💰", title: "Shop-Preise hochgezogen + Profilbild-Slots nur 1x freischaltbar" },
  { at: "2026-06-13T00:00+02:00", emoji: "📲", title: "PWA-Install-Tracking (Admin sieht wer auf welcher Plattform installiert hat)" },
  { at: "2026-06-13T00:00+02:00", emoji: "🌸", title: "Jappy-Style Begruessungsbox mit Glitzer-Borders + Edit-Knopf" },
  { at: "2026-06-13T00:00+02:00", emoji: "📣", title: "Eigene /buschfunk-Seite (Link war broken)" },
  { at: "2026-06-12T23:51+02:00", emoji: "🎮", title: "Spiele-Sammlung + S8-Edge-Panels + /installieren-Seite" },
  { at: "2026-06-12T23:51+02:00", emoji: "🥚", title: "VIBO-Minigame fluessiger (60fps + Pet-Bounce bei Snack-Catch)" },
];

// Helfer fuer das UI — gibt eine schoene relative Zeit zurueck
export function formatChangelogTime(iso, now = Date.now()) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const diffMs = now - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  const hhmm = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  if (diffMin < 1) return "Gerade eben";
  if (diffMin < 60) return `vor ${diffMin} Min`;
  if (diffH < 4) return `vor ${diffH} Std`;
  // gleicher Kalendertag?
  const today = new Date(now);
  const sameDay = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
  if (sameDay) return `Heute, ${hhmm}`;
  // gestern?
  const yest = new Date(today); yest.setDate(yest.getDate() - 1);
  const isYest = d.getFullYear() === yest.getFullYear() && d.getMonth() === yest.getMonth() && d.getDate() === yest.getDate();
  if (isYest) return `Gestern, ${hhmm}`;
  if (diffD < 7) {
    const wd = d.toLocaleDateString("de-DE", { weekday: "short" });
    return `${wd} ${hhmm}`;
  }
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) + " " + hhmm;
}

// Letzter Eintrags-Timestamp — nutzbar fuer "NEU"-Badge wenn lokaler
// vv_changelog_seen Wert kleiner ist.
export function latestChangelogAt() {
  if (!CHANGELOG.length) return 0;
  return new Date(CHANGELOG[0].at).getTime();
}
