# 🛁 VibeVibo — Badewannen-Roadmap

Sammlung aller Ideen aus den Brainstorming-Sessions. Lebendiges Dokument —
wird mit jedem neuen Gedanken erweitert, nicht überschrieben.

**Stand:** 20.06.2026 (abends — Phase 1 abgeschlossen, Phase 2 angefangen)
**Persona Fidolin:** weiblich (sie/ihr) — Name bleibt „Fidolin"

---

## 🎯 Top-Prioritäten (in Build-Reihenfolge)

### Phase 1 — Schutz zuerst (Mensch geht vor Marke) ✅ KOMPLETT
1. ✅ **🆘 Safety-Net** — Suizid-Detection + Hilfe-Banner + Mod-Alarm + Forensik-Export
2. ✅ **🔨 Defense-Paket** — Burst-Limiter + Fidolin-Auto-Hammer + Ban-Evasion **+ verkabelt**
3. ✅ **🗑 24h-Lösch-Countdown** + AGB-Klausel + Cron-Finalisierung

### Phase 2 — Killer-Features (Wachstum) — angefangen
4. ✅ **💕 Geheimer Schwarm** (3 Slots, Match-Animation, „vergeben"-Filter)
5. ⏳ **🎀 Fidolin-Erinnerungs-Posts** („Kannst du dich erinnern?" — unpolitisch)
6. ⏳ **🏆 XP-Ranking + Bronze/Silber/Gold-Avatar-Rahmen** (Anti-Fake-Vertrauen)

### Phase 3 — Buschfunk-Massiv
7. **📌 Buschfunk-Post-Typen-Editor** (Zitate, Gefühle, Markieren, „Ich werde nie vergessen")
8. **📅 „Heute vor X Jahren"-Memories**
9. **💬 Overlay-Chat-Upgrade** (Pin + Erinnerungen-Archiv + Letzte-Nachrichten-Preview)

### Phase 4 — Profil-Customization
10. **🎵 Profil-Playlist** (3-5 Songs, Auto-Next)
11. **🩷 Frauen-Initiative-System** (Männer → nur kommentieren, Frauen → schreiben)
12. **🎁 Geschenke-Sammlungen** (Sets, Achievements, Editions)

### Phase 5 — Premium-Features (Live)
13. **📞 1-zu-1 Live-Calls + Fidolin-Cam-Monitor** (Sexismus/Bedrohungen)
14. **🎥 Multi-User Live** (Bigo-Style, Host + 12 Plätze)

---

## 📋 Detail-Spec pro Feature

### 1. 🆘 Safety-Net Paket

**Suizid-Früherkennung:**
- Fidolin scannt Posts + DMs auf Krisen-Signale
- Hilfe-Banner mit:
  - Telefonseelsorge 0800-111-0-111 (24/7, kostenlos, anonym)
  - krisenchat.de (24/7 Chat)
  - 116-111 Nummer gegen Kummer (Jüngere)
  - 112 für akute Gefahr
- Mod-Alarm „🆘 Kritisches Signal von @username" im MCP

**Anti-Mobbing-Erkennung:**
- Eskalations-Score zwischen 2 Usern
- Patterns: gezielte Beleidigung über mehrere Posts/DMs
- Auto-Mute des Täters + Beweise sichern

**Forensik-Daten-Export:**
- Admin-Endpoint: 1-Klick-ZIP für Polizei
- Komplette User-Akte: Personalien, Adresse, Handy, IPs, Geräte, Posts, DMs, Geschenke
- Standardisierter Cover-Brief mit §-Hinweisen

**AGB-Klausel §X — Schutz vulnerabler Nutzer:**
- Anhaltspunkte auf Selbst-/Fremdgefährdung → Hilfe-Angebote + Mod-Info + Polizei-Übermittlung
- Anstifter zu Selbsttötung → dauerhafter Ausschluss + Datenaufbewahrung 10 Jahre + Strafanzeige
- §§ 211, 212, 217 StGB Hinweis
- Rechtsgrundlage: Art. 6 Abs. 1 lit. d DSGVO

**🆘-Knopf auf jedem Profil:** „Sorgst du dich um diesen User?" → Hilfe-Banner für betroffenen User + Mod-Check

**Handy-Verifikation:**
- Optional bei Anmeldung
- Pflicht bei: 1-zu-1 Live-Calls, DMs an Frauen, hohe Geschenke

---

### 2. 🔨 Defense-Paket (Anti-Fake-Stress)

**Burst-Rate-Limiter:**
- >5 Posts/30s oder >20/5min → 30 Min Auto-Mute
- Pro Aktion-Typ separat (Posts, Kommentare, DMs, Reactions)

**Fidolin-Auto-Hammer-Score:**
- Bei N Verstößen (Beleidigung/Sexismus/etc.) in 24h:
  - 1. Verstoß: 30 Min Stumm
  - 3. Verstoß: 24h Stumm
  - 5. Verstoß: 7d Stumm
  - 10. Verstoß: Permanent
- Kein menschlicher Mod nötig

**Ban-Evasion-Erkennung:**
- Browser-Fingerprint + Canvas-Hash + Cookie-Marker + LocalStorage-Token
- Gleicher Fingerprint trotz IP-Wechsel → Auto-Re-Ban
- Bei wiederholtem VPN-Ban-Umgehen: Subnet-Sperre

**Ältestes-Profil = Haupt-Identität:**
- Multi-Account-Detection markiert ältestes Profil als „Haupt"
- Neue Profile mit gleichem Fingerprint/IP → automatisch als Sub-Accounts geflaggt
- Sub-Accounts kriegen Light-Stress-Test (Email-Verify, Captcha bei Posts)

**VPN-Härtung (Stufen-System):**
- Stufe 1: VPN erkannt → strengere Limits (1 Post/10min, Live/Voice off, keine DMs an Fremde)
- Stufe 2: Bei wiederholtem Umgehen → Browser-Fingerprint-Tracking
- Stufe 3: Hochkritische Aktionen → SMS-Verifikation Pflicht

**Burst-Spam-Cascade-Ban:**
- Wilder Spam → Account + Gerät + IP + Subnet (`/24`) gleichzeitig

---

### 3. 🗑 24h-Lösch-Countdown

**AGB-Update:**
- Nach Lösch-Antrag: Account 24h pausiert, dann endgültig gelöscht
- Wiederherstellung in dieser Zeit möglich (1 Klick)

**Login-Banner während Countdown:**
- Live-Countdown „Noch 20h 1Min 44Sek bis zur endgültigen Löschung"
- Emotionaler Hinweis: „Wir vermissen dich. Bleib gerne!"
- Großer Button „Account behalten"
- Klein „Endgültig löschen"

---

### 4. 💕 Geheimer Schwarm

**Mechanik:**
- 3 geheime Slots pro User
- Nur User selbst sieht seine Crushes
- Vergebene/Verheiratete (User mit `relationship_status = vergeben/verheiratet`) tauchen gar nicht in Auswahl auf

**Match-Logik:**
- Wenn A → B (geheim) UND B → A (geheim) = MATCH
- Beide bekommen Push: „💥 Es hat gefunkt! Du und @other habt euch gegenseitig als geheime Nummer eingetragen!"
- Match-Animation (Konfetti, Herzen)

**Engagement-Ping:**
- Fidolin flüstert ab und zu: „Hast du deinen geheimen Crush schon eingetragen?"

---

### 5. 🎀 Fidolin-Erinnerungs-Posts (Fidolin = sie/ihr)

**Persona:** weiblich, freundlich, nostalgisch („Hey ihr, kennt ihr noch …?")

**Posting-Typen:**
- Datum-Trigger: „📅 Heute vor 35 Jahren ist die Mauer gefallen! Wer war damals dabei?"
- Saison: „🏆 Sommermärchen 2006 — was war euer schönster Moment?"
- Pop-Kultur: „📺 Lindenstraße — wer hat noch geheult bei der letzten Folge 2020?"
- Tech-Nostalgie: „📞 ICQ-Sound: Uh-oh! 🎵 Wer kann's noch nachmachen?"
- Süßigkeiten: „🍫 Negro-Kuss heißt heute Schaumkuss. Wer kennt's noch?"
- Mode: „👟 Buffalo-Schuhe — Schande oder Stil-Ikone?"

**Themen-Whitelist (UNPOLITISCH):**
- ✅ Mauerfall, Sportereignisse, Filme, Songs, TV-Shows, Spielzeug, Süßigkeiten, Mode, Tech
- ❌ Aktuelle Politik (Kanzler:innen, Magdeburg, Parteien)

**Trigger-System:**
- Jahreskalender mit Daten
- Auto-Post 1× täglich/wöchentlich
- Manuell vom Admin verschiebbar

---

### 6. 🏆 XP-Ranking + Avatar-Rahmen

**XP-Stufen:**
| Rang | XP | Belohnung |
|---|---|---|
| 0 | Anmeldung | — |
| 1-49 | 1-1.500 | Anfänger |
| 50-149 | bis ~5.000 | Sterne-Vergabe |
| 150+ | ~10.000 | 🥉 Bronze-Avatar-Rahmen |
| 300+ | | 🥈 Silber |
| 500+ | | 🥇 Gold |

**XP-Quellen:**
- Login-Streak
- Posts (begrenzt)
- Reaktionen erhalten (passiv = mehr Wert als selbst geben)
- Geschenke senden/empfangen
- Quiz spielen
- Matches (geheimer Schwarm)
- Mod-Aktionen helfen

**Anti-Fake-Mechanismus:**
- Gold-Rahmen = nachweislich aktiv seit Monaten = vertrauenswürdig
- Frische Profile = klar erkennbar grau
- Bei Verdacht: Bronze/Silber Profile nicht sofort als „echt" markieren

**Bestehendes nutzen:**
- Achievements-System
- Quests-System
- → XP-Aggregator drüberlegen, nicht neu starten

---

### 7. 📌 Buschfunk-Post-Typen-Editor

**Post-Typen-Palette:**
| Typ | Beispiel |
|---|---|
| 🌹 Zitat | „‚Das Leben ist wie Schokolade…' — Forrest Gump" |
| 💭 Gefühl | „Fühl mich heute mega motiviert! 💪" (verlinkt mit Mood) |
| 👯 Mit-Markierung | „War mit @sarah_92 + @kevin_lol auf dem Sommerfest 🌞" |
| 📅 Tag-Erinnerung | „Vor 2 Jahren: ICQ-Sound im Ohr, Sommer 2003 🍦" |
| 🎁 Geschenk-Showcase | „🎁 Habe limitiertes Frühling-Geschenk bekommen!" |
| 🎵 Now-Playing | „🎵 Hört gerade ‚Mr. Brightside'" |
| 💔 Ich werde nie vergessen | „11.09.2001 — ich saß in Mathe, als der Lehrer reinkam…" |

**Editor:** Twitter-Compose-Style aber mit Typ-Auswahl oben.

---

### 8. 📅 „Heute vor X Jahren"-Memories

- Wie Facebook „On This Day"
- Zeigt Pinnwand-Posts, Geschenke, Fotos aus dem gleichen Tag in vergangenen Jahren
- Push-Notification morgens
- Option zu reposten („Erinnerst du dich?")
- Erst gut nach 1-2 Jahren Datenbestand — bauen aber jetzt

---

### 9. 💬 Overlay-Chat-Upgrade

- ✓ Pin-Nachrichten (wie WhatsApp)
- ✓ „Erinnerungen"-Archiv (Nachrichten dauerhaft retten ohne Chat-Spam)
- ✓ „Bombe aus" = Letzte Nachrichten-Preview im Chat-Header

---

### 10. 🎵 Profil-Playlist

- 3-5 Songs (YouTube-IDs oder HTTPS-Audio)
- Auto-Next bei Track-Ende
- Shuffle-Option
- ⚠ Browser BLOCKEN Autoplay — User muss EINMAL klicken, dann läuft alles weiter
- Realistische Erwartung: ▶-Button bleibt, MySpace-Auto-Loop ist tot

---

### 11. 🩷 Frauen-Initiative-System

**Asymmetrische Initiative-Regel:**
- Männer können Frauen NICHT direkt aus heiterem Himmel anschreiben
- Männer können nur kommentieren / reagieren auf Posts
- Wenn ein Mann mehrfach (3+ Kommentare) interagiert → er wird der Frau in einem „🩷 Hat dich öfter gesehen"-Tab angezeigt
- **Sie** entscheidet, ihn anzuschreiben — er kann dann antworten

**Mein Take:** Frauen-zentriertes Design. Innovativ.

---

### 12. 🎁 Geschenke-Sammlungen

- Limitierte Geschenke gibt's schon
- Neu: Sammlungen (z.B. „Frühlings-Edition 2026: 8 Blumen-Geschenke")
- Wenn jemand alle sammelt → Achievement + Profil-Badge
- Premium kann seltenere Sammlungen sehen / ältere Editions kaufen

---

### 13. 📞 1-zu-1 Live + Fidolin-Cam-Monitor

- Cam zu Cam (User sieht sich selbst)
- Fidolin analysiert Stream: Sexismus, Bedrohungen, Beleidigungen → Eingriff
- Premium-only (Cost-Druck wegen Gemini-Vision API)

---

### 14. 🎥 Multi-User Live (Bigo-Style)

- Host + 12 Gäste, einzeln Sitzplätze schließbar/öffnbar
- Andere Community kann zuschauen
- WebRTC-Heavy → LiveKit/Daily.co Integration
- Erst bei 1k MAU sinnvoll

---

## 🚫 Entschiedene No-Gos

- ❌ **Fake-KI-Bots die wie echte User wirken** (Pusteblume_03 als 23-jährige)
  - Vertrauensbruch, DSGVO/UWG-Risiko, AdSense Invalid-Traffic
  - → Stattdessen: transparente 🤖-Helper-Bots erlaubt (Fidolin, Welcome-Bot mit Badge)
- ❌ **Politische Aktualpolitik in Erinnerungs-Posts** (Kanzler:in, Magdeburg-Attentat)
- ❌ **VPN komplett blockieren** (sperrt zu viele Legit-User aus)

---

## 🔁 Pipeline-Status

### Bereits Live (gebaut, deployed)
- ✓ AdSense komplett compliant (Phase 1)
- ✓ Owner-Cockpit radikal aufgeräumt (Mitglieder + Werbung + Geschenke + Performance + Wünsche)
- ✓ Mitglieder-Verwaltung mit Userakte (Anschrift, Sanktionen, Rollen)
- ✓ Geschenke-Admin mit PNG-Upload + Limitiert + Saison
- ✓ MCP-Foundation (Login, Dashboard, Sicherheits-Analyse mit CCleaner-Scan)
- ✓ Frauen-Filter (rosa Highlights für Frauen-Meldungen)
- ✓ Security-Paket A (CSRF, Rate-Limit, Security-Headers)
- ✓ Performance-Paket (SQLite-Pragmas, AdSense lazy-load, Diagnose-Page)
- ✓ Anti-Cheat B (Multi-Account-Detektor, Self-Like-Block)
- ✓ MCP 2FA (Google Authenticator)
- ✓ Gift-Frontend (Beschenken-Flow + Päckchen-Modus)
- ✓ Friend-Requests + Drag-Bar Bell
- ✓ Wunschseite (User-Feedback + Voting)
- ✓ Mood + Profil-Musik + Glitter (DB-Layer)
- ✓ Anonyme Komplimente (DB-Layer)
- ✓ „Wer kennt mich am besten?"-Quiz
- ✓ Safety-Net Phase 1 (Suizid-Detection, Hilfe-Banner, SOS-Knopf, Forensik-Export)
- ✓ Defense-Paket B (Burst-Limiter + Fidolin-Auto-Hammer + Ban-Evasion-Tabellen)
- ✓ 24h-Lösch-Countdown — Anfordern + roter Banner mit Live-Countdown + 1-Klick-Cancel
- ✓ Anonymisierungs-Helpers (`finalizeAccountDeletion` → display_name = N/A, PII gelöscht, Posts/DMs/Geschenke bleiben)
- ✓ Cron-Endpoint `/api/cron/finalize-deletions` (x-cron-secret-Auth) — stündlich von Coolify
- ✓ Middleware: `/api/cron/` in Public-Prefix-Liste
- ✓ AGB § 13a (Krisen-/Suizidprävention, Polizei-Übermittlung, 10-Jahre-Aufbewahrung, §§ 211/212/217/222/238 StGB)
- ✓ AGB § 16 neu (24h-Gnadenfrist + Forensik-Aufbewahrung + Geschenke-Persistenz)
- ✓ **Defense-B verkabelt** in 5 Routes: Pinnwand/Status/Comments/DMs/Reactions (Burst-429 + logUserAction)
- ✓ **UI-Integration der Profil-Customization:** MoodDisplay (Header), ProfileMusicPlayer (linke Spalte), ComplimentsPanel (rechte Spalte), KnowMeBestQuiz (unter Gästebuch)
- ✓ **💕 Geheimer Schwarm** — 3 Slots, Live-User-Suche (filtert taken/engaged/married), Mutual-Match-Detection, Konfetti-Overlay, Push an beide, Edge-Panel-Nav

### In Planung (siehe Top-Prioritäten oben)
- Phase 2 (5/6): Fidolin-Erinnerungs-Posts, XP-Ranking + Avatar-Rahmen
- Phase 3: Buschfunk-Post-Typen-Editor, Heute-vor-X-Jahren, Overlay-Chat-Upgrade
- Phase 4: Profil-Playlist, Frauen-Initiative-System, Geschenke-Sammlungen
- Phase 5: 1-zu-1 Live + Fidolin-Cam-Monitor, Multi-User Live (Bigo-Style)

---

## 📞 Kontakt-Persona

**Fidolin = sie/ihr.** Weiblich, freundlich, nostalgisch.
Schreibt z.B.: „Hey, ich hab gesehen…" / „Schau mal, ich erinner mich noch…"

---

*Dieses Dokument wächst. Bei jeder Badewannen-Session anhängen, niemals löschen.*
