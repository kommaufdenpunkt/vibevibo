// Patcht lib/db.js: ergaenzt getEconomyMetrics() fuer Fidolin-Wirtschaft.
// Idempotent.
import fs from "fs";
const PATH = process.env.HOME + "/vibevibo/lib/db.js";

const c = fs.readFileSync(PATH, "utf-8");
if (c.includes("export function getEconomyMetrics")) {
  console.log("getEconomyMetrics schon vorhanden, skip.");
  process.exit(0);
}

const HELPER = `

// =================================================================
// Fidolin-Wirtschaft: Kennzahlen fuer Inflations-Check
// =================================================================
export function getEconomyMetrics(sinceMs) {
  const d = db();
  const earnedRow = d.prepare(
    "SELECT COALESCE(SUM(amount), 0) AS s FROM vibes_tx WHERE amount > 0 AND created_at >= ?"
  ).get(sinceMs);
  const sunkRow = d.prepare(
    "SELECT COALESCE(SUM(amount), 0) AS s FROM vibes_tx WHERE amount < 0 AND created_at >= ?"
  ).get(sinceMs);
  const circRow = d.prepare(
    "SELECT COALESCE(SUM(balance), 0) AS s FROM credits"
  ).get();
  const usersRow = d.prepare(
    "SELECT COUNT(DISTINCT user_id) AS n FROM vibes_tx WHERE created_at >= ?"
  ).get(sinceMs);
  return {
    earned: Number(earnedRow?.s || 0),
    sunk: Math.abs(Number(sunkRow?.s || 0)),
    circulating: Number(circRow?.s || 0),
    activeUsers: Number(usersRow?.n || 0),
  };
}
`;

fs.writeFileSync(PATH, c + HELPER);
console.log("getEconomyMetrics-Helper hinzugefuegt.");
