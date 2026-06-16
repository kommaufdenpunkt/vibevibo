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
    id: "coms-mega-v1",
    at: "2026-06-17T01:40+02:00",
    emoji: "🌟",
    title: "Coms Mega-Update — Officer mit 8 einzelnen Rechten, Owner-Übergabe/Abdankung, ⛔ Bann-System pro Com, 🤖 Fidolin-Log für Owner+Officer, 📰 News-Posts, 14 Kategorien, Trending-Sortierung, ✨ Boost-Glow",
  },
  {
    id: "coms-list-discover",
    at: "2026-06-17T01:30+02:00",
    emoji: "🔍",
    title: "/coms mit Filter-Chips — sortieren nach Neu/Trending/Aktiv-24h/Größte + 14 Kategorien (Musik/Sport/Gaming/Kunst/Lokal/…), Owner und Posts-heute pro Karte",
  },
  {
    id: "coms-officer-perms",
    at: "2026-06-17T01:20+02:00",
    emoji: "👮",
    title: "Officer-System — Owner promotet Member, vergibt 8 Rechte einzeln (kick, posts löschen, threads pinnen/sperren/löschen, Meta bearbeiten, News schreiben, Events erstellen)",
  },
  {
    id: "coms-owner-transfer",
    at: "2026-06-17T01:10+02:00",
    emoji: "👑",
    title: "Owner kann Eigentum übergeben oder komplett abgeben — besitzerlose Coms (N/A) können von Officers beansprucht werden",
  },
  {
    id: "coms-ban",
    at: "2026-06-17T01:00+02:00",
    emoji: "⛔",
    title: "Com-Bann — Officer/Owner sperren störende Mitglieder dauerhaft aus ihrer Com mit Begründung; Liste der Bans mit Unban-Knopf",
  },
  {
    id: "admin-inspector",
    at: "2026-06-16T23:45+02:00",
    emoji: "🔍",
    title: "Admin-User-Inspector unter /admin/inspector — jeden User durchleuchten (Vibes-Tx, Aktivitäts-Zähler, Coms, Sessions, Strafen) + Vibes direkt gutschreiben mit einem Klick",
  },
  {
    id: "wartung-zentrale",
    at: "2026-06-16T23:00+02:00",
    emoji: "🛡",
    title: "Wartungs-Zentrale unter /admin/wartung — DB-Integrität, Bann-Statistik, Live-Angriffs-Log, ENV-Variablen-Check, Aufräum-Aktionen (Sessions, Waisen, VACUUM)",
  },
  {
    id: "hacker-guard",
    at: "2026-06-16T22:30+02:00",
    emoji: "🔒",
    title: "Anti-Hacker-Schutz — Middleware erkennt 50+ Angriffsmuster (SQL-Injection, XSS, Path-Traversal, Scanner-Bots) und sperrt IPs sofort dauerhaft",
  },
  {
    id: "ipv6-cidr",
    at: "2026-06-16T21:45+02:00",
    emoji: "🌐",
    title: "Admin-Whitelist mit IPv6-Prefix-Matching — Heim-Netz mit /64-Block ist gegen Selbstbann immun",
  },
  {
    id: "admin-credits",
    at: "2026-06-16T20:30+02:00",
    emoji: "✨",
    title: "Admin-Vibes-Form unter /admin/credits — Username + Betrag eingeben, ein Klick = gutgeschrieben (Preset-Buttons für 55/100/500/1000)",
  },
  {
    id: "welcome-bonus",
    at: "2026-06-16T20:00+02:00",
    emoji: "🎁",
    title: "Welcome-Bonus für den ersten registrierten Account — einmalig 10000 ✨ für den Plattform-Gründer",
  },
  {
    id: "coms-reactions",
    at: "2026-06-15T23:25+02:00",
    emoji: "❤️",
    title: "Coms-Reactions — 👍 ❤️ 🤔 🎉 😂 auf Threads und Antworten",
  },
  {
    id: "coms-welcome",
    at: "2026-06-15T23:20+02:00",
    emoji: "✿",
    title: "Coms-Willkommens-Post — Owner setzt einen gepinnten Begrüßungs-Text auf der Übersicht",
  },
  {
    id: "coms-activity",
    at: "2026-06-15T23:18+02:00",
    emoji: "📊",
    title: "Coms-Aktivität — Mini-Timeline zeigt was zuletzt in deiner Com passiert ist",
  },
  {
    id: "apps-off",
    at: "2026-06-14T23:35+02:00",
    emoji: "🧹",
    title: "Apps-Launcher entfernt — aufgeräumte Navigation. QuickDock führt jetzt direkt zu Coms.",
  },
  {
    id: "coms-jappy-tabs",
    at: "2026-06-14T22:45+02:00",
    emoji: "🏘",
    title: "Coms im Jappy-Look — 4 Tabs (Übersicht · Forum · Mitglieder · Infos), gelber Beitritts-Banner, Avatar-Grid",
  },
  {
    id: "coms-forum",
    at: "2026-06-14T22:30+02:00",
    emoji: "📖",
    title: "Coms-Forum — Diskussionen mit Threads, Antworten, Anpinnen und Sperren wie früher bei Jappy",
  },
  {
    id: "coms-url",
    at: "2026-06-14T22:25+02:00",
    emoji: "🌐",
    title: "Coms haben ihren eigenen URL-Raum bekommen — /coms statt /gruppen, alte Links leiten 301 weiter",
  },
  {
    id: "coms-rename-cost",
    at: "2026-06-14T22:15+02:00",
    emoji: "👥",
    title: "Aus „Gruppen\" werden „Coms\" — gründen kostet 500 ✨, dafür gehört sie dir und du baust sie aus mit Events, News, Forum, Chat",
  },
  {
    id: "achievement-toast",
    at: "2026-06-14T22:00+02:00",
    emoji: "🏆",
    title: "Schicker Toast wenn du eine neue Auszeichnung freischaltest — animiert, gold und nicht zu übersehen ✨",
  },
  {
    id: "premium-hero-spiele",
    at: "2026-06-14T21:55+02:00",
    emoji: "🎮",
    title: "Spiele-Seite frisch gemacht — Mitternachts-Lila-Hero mit Würfel-Sparkles",
  },
  {
    id: "premium-hero-gruppen",
    at: "2026-06-14T21:50+02:00",
    emoji: "👥",
    title: "Gruppen-Seite mit Rosé-Hero im SchülerVZ-Stil + Live-Zähler (alle / eigene)",
  },
  {
    id: "premium-hero",
    at: "2026-06-14T19:30+02:00",
    emoji: "✨",
    title: "Frischer Look — animierte Hero-Banner auf /heute, /privacy, /auszeichnungen und /dashboard",
  },
  {
    id: "premium-tiles",
    at: "2026-06-14T19:28+02:00",
    emoji: "🚀",
    title: "Sanftere Buttons & Tiles — Spring-Hover, Multi-Layer-Schatten, weicher Druck-Effekt",
  },
  {
    id: "premium-skeleton",
    at: "2026-06-14T19:26+02:00",
    emoji: "⏳",
    title: "Shimmer-Loading-Skelette beim Laden statt nacktem „Lade…\"",
  },
  {
    id: "accessibility-pass",
    at: "2026-06-14T19:24+02:00",
    emoji: "♿",
    title: "Tastatur-Fokus-Ringe & Respekt vor „prefers-reduced-motion\" — barrierefreier",
  },
  {
    id: "dashboard-editor",
    at: "2026-06-14T17:00+02:00",
    emoji: "🎛",
    title: "Dashboard-Editor unter /profile/dashboard — wähle was auf /heute erscheint",
  },
  {
    id: "achievements-25",
    at: "2026-06-14T16:30+02:00",
    emoji: "🏆",
    title: "Auszeichnungen — 25 Awards in 6 Kategorien mit eigener Galerie-Seite",
  },
  {
    id: "coms-groups",
    at: "2026-06-14T16:00+02:00",
    emoji: "👥",
    title: "Coms — Gruppen mit Owner/Mod/Member-Rollen, Cover-Emoji, Motto und Theme-Farbe",
  },
  {
    id: "privacy-v2",
    at: "2026-06-14T15:30+02:00",
    emoji: "🛡",
    title: "Privatsphäre v2 — Ruhezeiten für DMs + Fidolin-Strict-Modus für Erstkontakt",
  },
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
