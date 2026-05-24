# VibeVibo

> ✿ deine Erinnerungen, deine Community, dein Vibe ✿

Eine nostalgische Social-Plattform im Geiste von **MySpace**, **SchülerVZ**,
**Jappy**, **Lokalisten**, **wer-kennt-wen**, **Kwick**, **Knuddels** und
**MeineFreundeInsel** - alles unter einem Dach.

## Features

- **Echtes Login** mit Username + Passwort (bcrypt-Hash, Cookie-Sessions).
- **Profile mit Hintergrundmusik** (MySpace) - animierter Equalizer.
- **Custom-CSS pro Profil** (MySpace-Style) - eigener Skin, sicher gefiltert
  und auf das Profil-Element gescopt. Inkl. Live-Vorschau + 4 Presets.
- **Pinnwand & Gruscheln** (SchülerVZ).
- **Geschenke & Smileys** (Jappy) - 24 Geschenke, Vitrine, Geschenke-Shop.
- **Echtzeit-Messenger** (1:1) via Server-Sent Events - eingehende
  Nachrichten erscheinen ohne Reload.
- **Foto-Alben** (SchülerVZ) - Upload, Browser-seitiges Downscaling auf
  max. 1024px, Alben anlegen, Bildunterschriften, Fremd-Profile haben
  eigenen Fotos-Tab.
- **Gruppen/Communities** (SchülerVZ/Lokalisten) - Gruppen gründen,
  beitreten, Wand-Posts, Mitgliederliste.
- **Online-Anzeige** (basiert auf `last_seen` der letzten 5 Minuten).
- **Marquee-Banner**, **Mood-Status**, **Sparkles**, Retro-Cursor.

## Tech

- **Next.js 16** (App Router) + **React 19**
- **SQLite** via `better-sqlite3` (Datei: `data/vibevibo.db`, WAL-Mode)
- **bcryptjs** für Passwort-Hashing
- **Server-Sent Events** für den Live-Messenger (in-process Pub/Sub)
- CSS-Scoping via einfacher Regex-Parser - `dangerouslySetInnerHTML`
  wird gegen `expression()`, `@import`, `javascript:` etc. abgehärtet.

## Setup

```bash
cd vibevibo
npm install
npm run dev          # http://localhost:3000
# oder Production:
npm run build && npm run start
```

Die SQLite-DB wird beim ersten Start automatisch unter `data/vibevibo.db`
angelegt und mit 6 Demo-Usern, 3 Gruppen und einer Beispiel-Konversation
befüllt.

## Demo-Accounts

Alle Demo-Accounts haben das Passwort **`vibe123`**:

| Username        | Stil                 |
| --------------- | -------------------- |
| `anna_2003`     | 🌸 verliebt          |
| `kevin_skater`  | 🛹 chillig           |
| `lisa_princess` | 👑 happy             |
| `max_zocker`    | 🎮 zocken            |
| `julia_diva`    | 💅 diva mode         |
| `tom_dj`        | 🎧 Beats raushauen   |

## API

REST-Endpoints unter `/api/...`:

- `POST /api/auth/{login,register,logout}` · `GET /api/me`
- `GET /api/users` · `GET|PATCH /api/users/[username]`
- `POST /api/users/[username]/{pinnwand,gifts}` · `DELETE /api/pinnwand/[id]`
- `GET|POST /api/messages` · `GET /api/messages/[partner]` · `GET /api/messages/stream` (SSE)
- `GET|POST /api/users/[username]/{albums,photos}` · `DELETE /api/photos/[id]`
- `GET|POST /api/groups` · `GET /api/groups/[slug]`
  · `POST|DELETE /api/groups/[slug]/join` · `POST /api/groups/[slug]/posts`

## Reset

DB komplett zurücksetzen:

```bash
rm -rf data/
```

Beim nächsten Start wird neu geseedet.

## Roadmap

- Echte Datei-Uploads (S3/Disk statt Base64)
- Push-Benachrichtigungen
- Forum/Diskussionen pro Gruppe
- Top-Freunde-Reihenfolge editierbar
- Avatare als Bild statt nur Emoji
