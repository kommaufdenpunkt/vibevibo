// 📝 Manuelle Changelog-Highlights — werden mit den Auto-Eintraegen aus
// lib/changelog.generated.js gemerged. Eintraege hier haben Vorrang
// und erscheinen oben in der Timeline (so lange das Datum passt).
//
// Format pro Eintrag:
//   - id   : eindeutiger Key (fuer Reaktionen). Nicht wiederverwenden!
//   - at   : ISO-8601 Datum + Zeit mit Zeitzone
//   - emoji: Anzeige-Symbol
//   - title: Klartext (ohne fuehrendes Emoji)

export const MANUAL_CHANGELOG = [
  {
    id: "neu-mit-reaktionen",
    at: "2026-06-13T10:30+02:00",
    emoji: "💬",
    title: "Reaktionen auf Neuigkeiten — klick die Emoji-Knöpfe unter jedem Eintrag ✿",
  },
  {
    id: "neu-page-launch",
    at: "2026-06-13T10:15+02:00",
    emoji: "🆕",
    title: "Eigene „Was ist neu?\"-Seite mit kompletter Timeline und Datum + Uhrzeit",
  },
  {
    id: "music-playlist-dock",
    at: "2026-06-13T00:55+02:00",
    emoji: "🎵",
    title: "Profil-Musik mit Playlist + schwebender Mini-Player der weiterspielt wenn du surfst",
  },
  {
    id: "inline-greeting",
    at: "2026-06-13T00:36+02:00",
    emoji: "✎",
    title: "Begrüßungstext direkt am Profil bearbeiten — keine Extra-Seite mehr nötig",
  },
  {
    id: "skin-preview",
    at: "2026-06-13T00:33+02:00",
    emoji: "🎨",
    title: "Skin-Editor zeigt jetzt ein Mini-Profil als Live-Vorschau im Browser-Rahmen",
  },
  {
    id: "buschfunk-page",
    at: "2026-06-13T00:00+02:00",
    emoji: "📣",
    title: "/buschfunk hat jetzt seine eigene Seite mit Freundes-Posts zuerst",
  },
];
