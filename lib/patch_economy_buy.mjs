// 🤖 Patcht lib/db.js: buyPremium nimmt den ECONOMY_MULTIPLIER ins Kauf-Pricing auf.
// Idempotent.
import fs from "fs";
const PATH = process.env.HOME + "/vibevibo/lib/db.js";

const c = fs.readFileSync(PATH, "utf-8");
let out = c;

// Marker: die Spend-Zeile in buyPremium
const MARK = `const spend = spendCredits(userId, item.price, \`premium:\${kind}\`,`;
const REPL = `const __econMult = Number(getSetting("ECONOMY_MULTIPLIER", "1.0")) || 1.0;
  const __adjustedPrice = Math.max(1, Math.round((item.price || 0) * __econMult));
  const spend = spendCredits(userId, __adjustedPrice, \`premium:\${kind}\`,`;

if (c.includes("const __econMult")) {
  console.log("Economy-Multiplier-Patch schon angewendet, skip.");
  process.exit(0);
}
if (!c.includes(MARK)) {
  console.error("Marker fuer spendCredits in buyPremium nicht gefunden.");
  process.exit(1);
}
out = c.replace(MARK, REPL);

// Auch das addToSink anpassen damit Sink-Counter mit dem realen Preis arbeitet
const SINK_MARK = `addToSink(Math.round(item.price * sinkShare));`;
const SINK_REPL = `addToSink(Math.round(__adjustedPrice * sinkShare));`;
if (out.includes(SINK_MARK)) {
  out = out.replace(SINK_MARK, SINK_REPL);
}

fs.writeFileSync(PATH, out);
console.log("Economy-Multiplier-Patch angewendet (buyPremium + addToSink).");
