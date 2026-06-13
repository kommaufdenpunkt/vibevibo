// Repariert getEconomyMetrics in lib/db.js: nutzt richtige Tabellen-/Spaltennamen.
// vibes_tx → credit_tx, created_at → at. Idempotent.
import fs from "fs";
const PATH = process.env.HOME + "/vibevibo/lib/db.js";

const c = fs.readFileSync(PATH, "utf-8");
let out = c;
let n = 0;

// Replace all wrong references inside the getEconomyMetrics function
const replacements = [
  ["FROM vibes_tx WHERE amount > 0 AND created_at >= ?", "FROM credit_tx WHERE amount > 0 AND at >= ?"],
  ["FROM vibes_tx WHERE amount < 0 AND created_at >= ?", "FROM credit_tx WHERE amount < 0 AND at >= ?"],
  ["FROM vibes_tx WHERE created_at >= ?", "FROM credit_tx WHERE at >= ?"],
];

for (const [from, to] of replacements) {
  if (out.includes(from)) {
    out = out.replaceAll(from, to);
    n++;
  }
}

if (n === 0 && out.includes("FROM credit_tx WHERE amount > 0 AND at >= ?")) {
  console.log("Schon gefixt, skip.");
  process.exit(0);
}
if (n === 0) {
  console.error("Keine Marker gefunden — getEconomyMetrics evtl. nicht vorhanden?");
  process.exit(1);
}

fs.writeFileSync(PATH, out);
console.log(`getEconomyMetrics gefixt (${n} Stellen).`);
