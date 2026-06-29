// ⚽ Sicherer 4ever1-Abgleich: Spiele entfernen, die NICHT mehr im Feed sind.
// Idempotent, hängt tippSyncPrune an lib/db.js an (überschreibt db.js NICHT).
// Schutz: löscht NIE beendete Spiele oder Spiele mit echten User-Tipps; nie bei leerem Feed.

import fs from "node:fs";
import path from "node:path";

const DB = path.join(process.cwd(), "lib", "db.js");
if (!fs.existsSync(DB)) { console.error("⚠ lib/db.js nicht gefunden."); process.exit(0); }

let src = fs.readFileSync(DB, "utf8");
if (!src.includes("function _tippEnsureImport")) {
  console.error("⚠ _tippEnsureImport fehlt — bitte zuerst die Tipp-Migration deployen.");
  process.exit(1);
}
if (src.includes("export function tippSyncPrune")) {
  console.log("ℹ tippSyncPrune bereits vorhanden — nichts zu tun.");
  process.exit(0);
}

const BLOCK = `

// ===== ⚽ Abgleich mit 4ever1: verschwundene Spiele entfernen (sicher) =====
// Löscht nur Spiele, die NICHT mehr im 4ever1-Feed sind UND weder beendet sind
// noch echte (User-)Tipps haben. So verschwinden Test-/Karteileichen, echte
// (getippte oder gespielte) Spiele bleiben IMMER erhalten.
export function tippSyncPrune(extIds) {
  _tippEnsureImport();
  const keep = new Set((extIds || []).map(Number).filter((n) => Number.isFinite(n)));
  if (keep.size === 0) return { pruned: 0, skipped: "leerer Feed" }; // Sicherheit: nie bei leerem Feed löschen
  const all = db().prepare("SELECT id, ext_id AS extId, status FROM tipp_matches WHERE ext_id IS NOT NULL").all();
  const hasReal = db().prepare("SELECT 1 FROM tipp_bets WHERE match_id = ? LIMIT 1");
  const delTips = db().prepare("DELETE FROM tipp_import_tips WHERE ext_match_id = ?");
  const delMatch = db().prepare("DELETE FROM tipp_matches WHERE id = ?");
  let pruned = 0;
  const tx = db().transaction(() => {
    for (const m of all) {
      if (keep.has(Number(m.extId))) continue;   // noch im Feed -> behalten
      if (m.status === "finished") continue;       // beendet -> nie loeschen
      if (hasReal.get(m.id)) continue;             // echte User-Tipps -> nie loeschen
      delTips.run(Number(m.extId));
      delMatch.run(m.id);
      pruned++;
    }
  });
  tx();
  return { pruned };
}
`;

src += BLOCK;
fs.writeFileSync(DB, src, "utf8");
console.log("✅ lib/db.js ergänzt: tippSyncPrune (sicherer 4ever1-Abgleich)");
