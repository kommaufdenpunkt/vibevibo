// 🧹 Entfernt übrig gebliebene Tippspiel-Kacheln/Links (z. B. „Tippspiel WM").
// Scannt app/ und components/ und löscht Zeilen mit einer Tippspiel-Kachel bzw. /tipp-Link.
// Idempotent: läuft mehrfach ohne Schaden — was schon weg ist, bleibt weg.

import fs from "node:fs";
import path from "node:path";

const ROOTS = ["app", "components"];
const EXT = new Set([".jsx", ".js", ".tsx", ".ts"]);

// Eine Zeile wird entfernt, wenn sie eindeutig zur Tippspiel-Kachel/Link gehört.
function isTippLine(line) {
  if (/Tippspiel/i.test(line)) return true;           // Titel „Tippspiel WM"
  if (/["'`]\/tipp(["'`\/?#])/.test(line)) return true; // href/Link auf /tipp
  return false;
}

function walk(dir, out) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next" || e.name === ".git") continue;
      walk(p, out);
    } else if (EXT.has(path.extname(e.name))) {
      out.push(p);
    }
  }
}

const files = [];
for (const r of ROOTS) {
  const abs = path.join(process.cwd(), r);
  if (fs.existsSync(abs)) walk(abs, files);
}

let totalRemoved = 0;
const touched = [];

for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  if (!/Tippspiel/i.test(src) && !/\/tipp/.test(src)) continue;

  const lines = src.split("\n");
  const kept = lines.filter((l) => !isTippLine(l));
  const removed = lines.length - kept.length;
  if (removed > 0) {
    fs.writeFileSync(f, kept.join("\n"), "utf8");
    totalRemoved += removed;
    touched.push(`${path.relative(process.cwd(), f)} (${removed})`);
  }
}

if (totalRemoved === 0) {
  console.log("ℹ Keine Tippspiel-Kachel/Link gefunden — nichts zu entfernen.");
} else {
  console.log(`✅ Tippspiel entfernt: ${totalRemoved} Zeile(n) in ${touched.length} Datei(en):`);
  for (const t of touched) console.log("   – " + t);
}
