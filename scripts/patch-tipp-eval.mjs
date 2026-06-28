// 📊 Auswertung: alle echten User-Tipps öffentlich (Username, Tipp, Punkte).
// Idempotent, append-only in lib/db.js.

import fs from "node:fs";
import path from "node:path";

const DB = path.join(process.cwd(), "lib", "db.js");
if (!fs.existsSync(DB)) { console.error("⚠ lib/db.js nicht gefunden."); process.exit(0); }

let src = fs.readFileSync(DB, "utf8");
if (src.includes("export function tippAllRealBets")) {
  console.log("ℹ Auswertungs-Funktion bereits vorhanden — nichts zu tun.");
  process.exit(0);
}
if (!src.includes("function _tippEnsure")) {
  console.error("⚠ Basis-Tipp-Funktionen fehlen — bitte zuerst vv_tipp deployen.");
  process.exit(1);
}

const BLOCK = `

// ===== 📊 Auswertung — alle echten User-Tipps (auto-injected via scripts/patch-tipp-eval.mjs) =====
export function tippAllRealBets() {
  _tippEnsure();
  try {
    return db().prepare(\`
      SELECT b.match_id AS matchId, u.username, u.display_name AS displayName, u.avatar_url AS avatarUrl,
             b.pred_home AS predHome, b.pred_away AS predAway, b.adv_pick AS advPick, b.dec_pick AS decPick,
             b.points, b.bonus
        FROM tipp_bets b JOIN users u ON u.id = b.user_id
    \`).all();
  } catch {
    try {
      return db().prepare(\`
        SELECT b.match_id AS matchId, u.username, u.display_name AS displayName, u.avatar_url AS avatarUrl,
               b.pred_home AS predHome, b.pred_away AS predAway, b.points
          FROM tipp_bets b JOIN users u ON u.id = b.user_id
      \`).all();
    } catch { return []; }
  }
}
`;

src = src.replace(/\s*$/, "\n") + BLOCK;
fs.writeFileSync(DB, src, "utf8");
console.log("✅ lib/db.js: Auswertungs-Funktion (tippAllRealBets) ergänzt.");
