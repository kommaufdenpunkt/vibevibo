# VibeVibo — Operator's Guide

Nostalgische Social-Plattform (Next.js 16 + SQLite + Coolify).

## Repo-Wahrheiten

| Wo            | Pfad                              | Branch |
|---------------|-----------------------------------|--------|
| GitHub        | `kommaufdenpunkt/vibevibo`        | `main` |
| Mac (User)    | `~/vibevibo`                      | `main` |
| Sandbox       | `/home/user/fahrschulo/vibevibo/` | (egal) |

**Sandbox-Push ist tot.** Der eingebaute Proxy ist auf ein nicht-existentes Repo (`ginoheidrichhh-dot/fahrschulo`) gepinnt. Sandbox-`origin` wurde entfernt → Stop-Hook bail-outet. Niemals versuchen, von hier aus zu pushen.

## Deploy-Workflow (für Claude)

1. Änderungen in `/home/user/fahrschulo/vibevibo/` editieren
2. Tarball bauen unter `/tmp/vv_<feature>.tar.gz` (Paths beginnen mit `vibevibo/...`)
3. Via `SendUserFile` an User schicken
4. User führt `vv` auf Mac aus

**NIEMALS** einen `bash`-Installer mit eingebettetem base64 schicken. Tarball pur ist kleiner und der `vv`-Helper macht den Rest.

## Deploy-Workflow (für User auf Mac)

```bash
vv                    # Wendet neuestes vv_*.tar.gz aus ~/Downloads an
vv vv_premium         # Wendet ~/Downloads/vv_premium.tar.gz an (Suffix-Lookup)
vv ~/Pfad/xyz.tar.gz  # Wendet konkreten Pfad an
vv status             # Zeigt git status + letzte 5 Commits
vv list               # Listet verfügbare Tarballs in ~/Downloads
```

Der Helper macht: entpacken → `npm install` falls package.json drin → `node scripts/patch-*.mjs` falls Patch drin → commit → push mit Retry → fertig.

## Harte Regeln (security/safety)

- **`lib/db.js` NIEMALS aus Tarball überschreiben.** Alle DB-Änderungen via idempotenten `scripts/patch-*.mjs`-Node-Skripts. Der `vv`-Helper führt sie automatisch aus.
- **Secrets niemals im Chat-Output zurückgeben.** Auch nicht "zur Verifikation". Sandbox-Stripe-Keys sind risiko-tolerabel, Live-Keys würden Rotation erfordern.
- **Coolify deployt 1-2 Min nach Push.** Test-URL: https://vibevibo.de

## Architektur-Kernpunkte

- **Hooks vor Early-Returns!** React-Crash sonst. Wenn du eine Komponente bearbeitest: erst alle `useState`/`useEffect`/`useMemo`/`useSearchParams`, DANN `if (!me) return`.
- **`useSearchParams`** braucht `<Suspense fallback={null}>`-Wrapper (Next.js 16).
- **Fidolin** ist der AI-Moderator (Gemini). Strict-Mode für Erstkontakt aktivierbar via `strict_first_msg`-Flag.
- **Privacy-Felder** (User-Spalten): `dm_policy`, `wall_policy`, `hide_visits`, `shield_mode`, `quiet_from_hour`, `quiet_to_hour`, `strict_first_msg`. NIE direkt über `userRow()` lesen → `getUserPrivacyFieldsV2()` nutzen.
- **Achievements** triggern automatisch in `creditDailyBonus()` und Streak-Funktionen via `lib/achievements.js`.
- **Coms-Gruppen** haben Owner/Mod/Member-Rollen. Theme-Farbe + Cover-Emoji + Motto pro Gruppe.

## Premium-Pass (live)

- `components/PremiumHero.jsx` — animierte Hero mit 8 Gradient-Paletten
- `components/PremiumSkeleton.jsx` — Shimmer-Loading
- Globale CSS in `app/layout.jsx`: `vv-prem-btn`, `vv-prem-tile`, Focus-Rings, `prefers-reduced-motion`

## Workflow für Patches die `db.js` brauchen

Tarball enthält `scripts/patch-<feature>.mjs`. Der `vv`-Helper erkennt das und führt es vor dem commit aus. Patches sind idempotent — können mehrfach laufen.

## Geschichte / vermiedene Fallen

- **SSH-Setup zu falschem Repo** — niemals `git remote set-url origin git@github.com:ginoheidrichhh-dot/...` vorschlagen. Das ist die Sandbox-Welt, nicht der User-Mac.
- **Hook-Order-Bugs** — `/heute` und `NotificationsBell` hatten Hooks nach Early-Return → React crash. Immer doppelt prüfen.
- **Privacy-Bug #2** — `userRow()` filterte Privacy-Spalten raus, deshalb gab `/api/me/privacy` Defaults statt Werte zurück. Lösung: `readPrivacyRaw()` ruft direkt `getUserPrivacyFieldsV2()`.
