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
  // ─── 🚀 GROSSES VIBEVIBO-UPDATE — Juni 2026 ─────────────────────────────
  {
    id: "mega-update-juni-2026",
    at: "2026-06-18T23:30+02:00",
    emoji: "🚀",
    title: "Großes VibeVibo-Update — Frauen-Schutz mit Stimm-Verifikation (✓-Badge), KI-moderierte Sprachnachrichten in DMs/Räumen/Kommentaren, Live-Chat-Fidolin, 8 neue freischaltbare Com-Funktionen (Animated Theme, Saisonal Hero, Sound-FX, Live-Polls, Throwback, Geburtstags-Kalender, Quiz-Night, Meetup-Planer), neues Impressum + Datenschutz, öffentliche /about /faq /hilfe-Seiten. Scroll runter für alle Details!",
  },

  // ─── 🆕 21.06.2026 — UI-Welle: Theme, Layout, Sicherheit, Personalisierung
  {
    id: "myspace-blau-theme",
    at: "2026-06-21T20:00+02:00",
    emoji: "🌌",
    title: "Komplettes Theme-Refresh — alle Seiten auf MySpace-Blau (Königsblau + Weiß + Orange-Akzent). Klare Kanten, Tahoma/Verdana-Schrift, geprägte Buttons mit 3D-Tiefe. Login, Buschfunk, /heute, Edge-Navigation, Live-Call-Buttons, Komponist-Modal — alles durchgezogen.",
  },
  {
    id: "facebook-login-launch",
    at: "2026-06-21T19:45+02:00",
    emoji: "📘",
    title: "Login mit Facebook — alternativ zum Username/Passwort. Beim ersten Login darfst du dir Username und Anzeigenamen selbst aussuchen (beide eindeutig, nur a-z, A-Z, 0-9, _ und -). Profilbild kommt direkt von Facebook. Du landest auf der Warteliste bis wir freischalten.",
  },
  {
    id: "warteliste-page",
    at: "2026-06-21T19:30+02:00",
    emoji: "⏳",
    title: "Neue Warteliste-Seite — wenn du auf Freigabe wartest, siehst du eine schöne Übersicht statt einer Fehlermeldung. Drei-Schritt-Erklärung, Feature-Vorschau, Sicherheits-Info. Erreichbar unter /warteliste.",
  },
  {
    id: "register-profile-photo",
    at: "2026-06-21T19:15+02:00",
    emoji: "📸",
    title: "Profilfoto direkt bei der Anmeldung — Statt Emoji-Picker lädst du jetzt ein echtes Foto hoch (oder per Smartphone-Kamera). Fidolin (unsere KI-Moderation) prüft jedes Bild automatisch vor der Freischaltung. Auch ohne Foto kannst du dich anmelden.",
  },
  {
    id: "greeting-fullwidth",
    id_legacy: "greeting-fullwidth",
    at: "2026-06-21T18:30+02:00",
    emoji: "📐",
    title: "Begrüßungsbox auf voller Breite — der Willkommens-Text auf deinem Profil nutzt jetzt den ganzen verfügbaren Platz und passt sich Phone/Tablet/Desktop sauber an. Editor ebenso.",
  },
  {
    id: "profile-avatar-layout-fix",
    at: "2026-06-21T18:15+02:00",
    emoji: "🪪",
    title: "Profil-Layout-Bug behoben — dein Profilbild steht jetzt zuverlässig zentriert über dem Anzeigenamen (vorher rutschten beide auf großen Bildschirmen nebeneinander).",
  },
  {
    id: "topfriends-fullwidth",
    at: "2026-06-21T18:00+02:00",
    emoji: "👯",
    title: "Top-5-Freunde füllen jetzt die volle Spaltenbreite — vorher quetschten sie sich auf 240px zusammen. Die Avatare werden auf großen Profilen endlich groß angezeigt.",
  },
  {
    id: "modal-mobile-fix",
    at: "2026-06-21T17:30+02:00",
    emoji: "📱",
    title: "Mobile-Optimierung für Modals — Kompliment-Modal, Quiz, Live-Setup, Push-Banner und Karten-Datenschutz nutzen jetzt dynamische Viewport-Höhe (100dvh) und überlaufen nicht mehr auf schmalen Phones.",
  },
  {
    id: "heute-grid-responsive",
    at: "2026-06-21T17:15+02:00",
    emoji: "📅",
    title: "Heute-Hub: Tiles sind responsiv geworden — vorher feste 2 Spalten, jetzt automatisches Anpassen je nach Bildschirmbreite. Auch Coms-Detailseiten und Wunsch-Kategorien skalieren sauber mit.",
  },
  {
    id: "avatar-rank-frames",
    at: "2026-06-21T17:00+02:00",
    emoji: "🏅",
    title: "Avatar-Rang-Rahmen erweitert — drei neue Tiers für aktive Mitglieder: 🌱 Rookie (Rang 10+, dezenter Königsblau-Rahmen), 🔥 Active (Rang 30+, oranger Rahmen), ✨ Hot (Rang 50+, pulsierender Orange-Gold-Verlauf). Plus Bronze/Silber/Gold/Diamant/Legende für die Spitze.",
  },
  {
    id: "gift-collections-admin",
    at: "2026-06-21T16:30+02:00",
    audience: "admin",
    emoji: "📚",
    title: "Admin-UI für Geschenke-Sammlungen unter /admin/geschenke → Tab „📚 Sammlungen“. Anlegen, bearbeiten, Items per Multi-Select aus dem Custom-Gift-Pool zuweisen, soft-deleten, pausieren/aktivieren.",
  },
  {
    id: "oauth-self-heal",
    at: "2026-06-21T16:00+02:00",
    audience: "admin",
    emoji: "🛡",
    title: "OAuth-Schema-Self-Heal — neuer Schutz-Layer (lib/ensureOauthSchema.js) der vor jedem Facebook-Login die nötigen DB-Spalten prüft und nachzieht. „table users has no column named email“ kann nicht mehr passieren.",
  },
  // ─── 📄 Rechtliches + AdSense-Compliance ────────────────────────────────
  {
    id: "legal-ads-launch",
    at: "2026-06-18T23:00+02:00",
    emoji: "📄",
    title: "Rechtliches aufgeräumt — neues Impressum (4ever1.tv c/o IP-Management Hamburg) und vollständige Datenschutzerklärung. Öffentliche Seiten /about, /faq, /hilfe für bessere Auffindbarkeit. Footer-Navigation überall.",
  },
  {
    id: "adsense-integration",
    at: "2026-06-18T22:45+02:00",
    audience: "admin",
    emoji: "📢",
    title: "Google AdSense als Display-Provider integriert (intern) — neue Settings ADSENSE_PUB_ID und ADSENSE_AUTO_ADS im Admin-Panel. AdSense-Loader respektiert Cookie-Consent + Google Consent Mode v2. Dynamische /ads.txt + /sitemap.xml.",
  },
  // ─── 🛡 Frauen-Schutz Update (Juni 2026) ────────────────────────────────
  {
    id: "women-shield-bundle",
    at: "2026-06-18T20:00+02:00",
    emoji: "🛡",
    title: "Frauen-Schutz — strenger Anti-Anmache-Filter für DMs/Kommentare/Live-Chat, Stimm-Verifikation mit ✓-Badge, automatischer Schutz-Modus für neue weibliche Accounts. Mehr unter Einstellungen → Privatsphäre.",
  },
  {
    id: "voice-verification",
    at: "2026-06-18T19:45+02:00",
    emoji: "🎤",
    title: "Stimm-Verifikation — beweise mit einer 5-15-Sekunden-Sprachprobe dass dein angegebenes Geschlecht stimmt. Gemini-KI checkt die Stimme, du bekommst dauerhaft ein ✓-Verifiziert-Badge. Unter /profile/verify.",
  },
  {
    id: "live-chat-fidolin",
    at: "2026-06-18T19:30+02:00",
    emoji: "🤖",
    title: "Fidolin in Live-Stream-Chat — Text-Nachrichten werden ab sofort auch im Live-Chat moderiert. Beleidigungen, Hass, Anmache fliegt sofort raus.",
  },
  {
    id: "voice-moderation",
    at: "2026-06-18T18:00+02:00",
    emoji: "🎙",
    title: "Sprachnachrichten-Moderation — Fidolin hört jetzt zu! In DMs, Räumen und Buschfunk-Kommentaren werden Sprachnachrichten transkribiert und auf Beleidigungen/Hass geprüft. Bei Verstoß: Nachricht kommt erst gar nicht an.",
  },
  // ─── 🔓 Com-Feature-Unlock-System ───────────────────────────────────────
  {
    id: "com-meetups",
    at: "2026-06-18T22:30+02:00",
    emoji: "🤝",
    title: "Meetup-Planer für Coms (600 ✨, ab 8 Members) — plant echte Treffen mit Titel, Ort, Datum, Uhrzeit, Beschreibung und Max-Teilnehmer-Limit. Mitglieder sagen ✅ zu / 🤔 vielleicht / 🚫 ab. Host kann absagen, Owner kann löschen.",
  },
  {
    id: "com-quiz-night",
    at: "2026-06-18T22:00+02:00",
    emoji: "🧠",
    title: "Quiz-Night für Coms (1000 ✨, ab 5 Members) — erstelle Multiple-Choice-Quizze mit bis zu 15 Fragen, andere nehmen wann sie wollen teil. Live-Leaderboard mit Top-Spielern + Antwort-Review wie früher beim Wohnzimmer-Quiz.",
  },
  {
    id: "com-birthday-calendar",
    at: "2026-06-18T21:00+02:00",
    emoji: "🎂",
    title: "Geburtstagskalender für Coms (400 ✨) — zeigt wer in den nächsten 7 Tagen Geburtstag hat, mit Alter und Datum. Am Geburtstag selbst: „🎁 Glückwunsch“-Knopf der eine vorgefertigte DM verschickt.",
  },
  {
    id: "com-throwback",
    at: "2026-06-18T17:30+02:00",
    emoji: "📼",
    title: "Throwback-Feed für Coms (600 ✨) — alte Posts deiner Com tauchen wieder auf, gruppiert nach „Vor 1 Monat / 1 Jahr / 5 Jahren“. Anniversary-Bonus für Posts vom gleichen Datum aus früheren Jahren.",
  },
  {
    id: "com-live-polls",
    at: "2026-06-18T17:00+02:00",
    emoji: "📊",
    title: "Live-Polls für Coms (400 ✨) — Mitglieder erstellen Umfragen mit 2-6 Optionen, Mehrfachauswahl + Dauer einstellbar. Live-Balken, ⋯-Menü zum Schließen/Löschen für Author und Owner.",
  },
  {
    id: "com-visual-bundle",
    at: "2026-06-18T16:30+02:00",
    emoji: "✨",
    title: "Visuelle Com-Features — Animated Theme (500 ✨, Schnee/Konfetti/Herbstlaub/Herzen/Sterne), Saisonal Hero-Schmuck (700 ✨, 9 Themes + Auto-Modus), Sound-FX beim Beitritt (300 ✨, 5 Töne). Owner schaltet im 🔓-Tab frei.",
  },
  {
    id: "com-unlock-system",
    at: "2026-06-18T16:00+02:00",
    emoji: "🔓",
    title: "Com-Funktionen freischalten — Owner können in ihrem Com-🔓-Tab 14 Features einzeln freischalten (Animated Theme, Watch-Party, Quiz, Karaoke, Member-Map, Meetups u.v.m.). Einmal Vibes zahlen, dauerhaft an.",
  },
  // ─── 📷 Live-Berechtigungen ─────────────────────────────────────────────
  {
    id: "media-permission-notice",
    at: "2026-06-17T22:00+02:00",
    emoji: "📷",
    title: "Live-Stream-Hinweis — Beim Erstellen eines Streams und Beitritt zu Multi-Couch-Räumen wird jetzt klar angesagt, dass Browser nach Kamera- und Mikrofon-Erlaubnis fragt. Chrome/Edge/Safari werden empfohlen.",
  },
  // ─── ✍ Rich-Text-Editor ────────────────────────────────────────────────
  {
    id: "rich-text-editor",
    at: "2026-06-17T20:00+02:00",
    emoji: "✍",
    title: "Rich-Text-Editor überall in Coms — fett, kursiv, durchgestrichen, Link mit Beschriftung, Bild einbetten, Listen, Zitate, Überschriften. Plus 500-Emoji-Picker mit Kategorien und Verlauf in Welcome-Posts, Forum, Wand.",
  },
  // ─── INTERNE / ADMIN-Eintraege ─────────────────────────────────────────
  {
    id: "admin-verifications-page",
    at: "2026-06-18T20:30+02:00",
    audience: "admin",
    emoji: "🛡",
    title: "Admin-Verifikations-Review unter /admin/verifications — Filter nach Status (verdächtig/verifiziert/abgelehnt), Voice-Samples pro User einsehen, manuelles Verify/Reject/Reset.",
  },
  {
    id: "anti-fake-female-passive",
    at: "2026-06-18T20:15+02:00",
    audience: "admin",
    emoji: "🕵",
    title: "Passive Voice-Gender-Detection — Bei jeder Sprachnachricht läuft im Hintergrund eine KI-Stimm-Analyse. Wenn ein Account behauptet weiblich/männlich zu sein, aber 3+ Sprachproben das Gegenteil zeigen (Konfidenz ≥0.7), wird er automatisch als „suspicious“ markiert.",
  },
  {
    id: "streamer-shield-internal",
    at: "2026-06-18T19:35+02:00",
    audience: "admin",
    emoji: "🛡",
    title: "Streamer-Shield (intern) — Im Live-Chat wird der Strict-Modus erzwungen wenn der Streamer live_strict_mode aktiv hat ODER wenn Sender männlich + Streamer weiblich (automatischer m→w-Filter).",
  },
  {
    id: "women-shield-defaults-internal",
    at: "2026-06-18T19:20+02:00",
    audience: "admin",
    emoji: "🛠",
    title: "Default-Strict für weibliche Neu-Registrierungen (intern) — Bei Registrierung mit gender='w' werden automatisch shield_mode, strict_first_msg, dm_policy='friends' und live_strict_mode aktiviert. Idempotent: überschreibt keine bewussten Custom-Settings.",
  },
  {
    id: "com-throwback-internal",
    at: "2026-06-18T17:35+02:00",
    audience: "admin",
    emoji: "🧠",
    title: "Throwback-Helper mit Anniversary-Algorithmus (intern) — _dayOfYear-Distanz wird genutzt um Posts vom heutigen Kalendertag aus früheren Jahren zu bevorzugen. Min-Alter 30 Tage, Limit 8 Posts.",
  },
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
    title: "Aus „Gruppen\“ werden „Coms\“ — gründen kostet 500 ✨, dafür gehört sie dir und du baust sie aus mit Events, News, Forum, Chat",
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
    title: "Shimmer-Loading-Skelette beim Laden statt nacktem „Lade…\“",
  },
  {
    id: "accessibility-pass",
    at: "2026-06-14T19:24+02:00",
    emoji: "♿",
    title: "Tastatur-Fokus-Ringe & Respekt vor „prefers-reduced-motion\“ — barrierefreier",
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
    title: "Eigene „Was ist neu?\“-Seite mit kompletter Timeline und Datum + Uhrzeit",
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
