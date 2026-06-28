// 🔮 Podium Orakel — Top-3-Tipp (Weltmeister / Vize / Platz 3).
// Idempotent, append-only in lib/db.js. Nutzt die importierten tipp_teams als Auswahl.

import fs from "node:fs";
import path from "node:path";

const DB = path.join(process.cwd(), "lib", "db.js");
if (!fs.existsSync(DB)) { console.error("⚠ lib/db.js nicht gefunden."); process.exit(0); }

let src = fs.readFileSync(DB, "utf8");
if (src.includes("export function tippSetPodium")) {
  console.log("ℹ Podium-Orakel-Funktionen bereits vorhanden — nichts zu tun.");
  process.exit(0);
}
if (!src.includes("function _tippEnsure")) {
  console.error("⚠ Basis-Tipp-Funktionen fehlen — bitte zuerst vv_tipp deployen.");
  process.exit(1);
}

const BLOCK = `

// ===== 🔮 Podium Orakel (auto-injected via scripts/patch-tipp-podium.mjs) =====
let _tippPodReady = false;
function _tippEnsurePodium() {
  if (_tippPodReady) return;
  _tippEnsure();
  db().prepare(\`CREATE TABLE IF NOT EXISTS tipp_podium_bets (
    user_id INTEGER PRIMARY KEY,
    champion TEXT, second TEXT, third TEXT,
    updated_at INTEGER
  )\`).run();
  _tippPodReady = true;
}

// Team-Liste für die Auswahl (aus dem 4ever1-Import). Leer, falls noch nicht importiert.
export function tippTeamsList() {
  _tippEnsurePodium();
  try {
    return db().prepare("SELECT code, name, flag FROM tipp_teams ORDER BY name ASC").all();
  } catch { return []; }
}

export function tippGetPodium(userId) {
  _tippEnsurePodium();
  return db().prepare("SELECT champion, second, third FROM tipp_podium_bets WHERE user_id = ?").get(Number(userId)) || null;
}

export function tippSetPodium(userId, { champion, second, third } = {}) {
  _tippEnsurePodium();
  const c = champion ? String(champion) : null;
  const s = second ? String(second) : null;
  const t = third ? String(third) : null;
  // Doppelte Teams nicht erlaubt
  const picks = [c, s, t].filter(Boolean);
  if (new Set(picks).size !== picks.length) return { ok: false, error: "Jedes Team nur einmal wählen." };
  const now = Date.now();
  db().prepare(\`INSERT INTO tipp_podium_bets (user_id, champion, second, third, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET champion=excluded.champion, second=excluded.second, third=excluded.third, updated_at=excluded.updated_at\`)
    .run(Number(userId), c, s, t, now);
  return { ok: true };
}

// Öffentlich: was alle orakeln (für die Anzeige unter dem eigenen Tipp).
export function tippPodiumBoard() {
  _tippEnsurePodium();
  try {
    return db().prepare(\`
      SELECT u.username, u.display_name AS displayName, u.avatar_url AS avatarUrl,
             p.champion, p.second, p.third, p.updated_at AS updatedAt
        FROM tipp_podium_bets p JOIN users u ON u.id = p.user_id
       ORDER BY p.updated_at DESC
    \`).all();
  } catch { return []; }
}
`;

src = src.replace(/\s*$/, "\n") + BLOCK;
fs.writeFileSync(DB, src, "utf8");
console.log("✅ lib/db.js: Podium-Orakel-Funktionen ergänzt.");
