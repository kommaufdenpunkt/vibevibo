// 🌑 /coms dunkel: die wenigen hartkodierten hellen Stellen (Chips, Code-Slug,
// graue Labels) auf dunkel/Theme-Variablen umstellen. Idempotent, behält "use client".
import fs from "node:fs";
import path from "node:path";

const FILE = path.join(process.cwd(), "app", "coms", "page.jsx");
if (!fs.existsSync(FILE)) { console.error("⚠ app/coms/page.jsx nicht gefunden."); process.exit(0); }

let s = fs.readFileSync(FILE, "utf8");
if (s.includes("var(--vv-muted, #94a3b8)")) {
  console.log("ℹ /coms-Dark bereits aktiv — nichts zu tun.");
  process.exit(0);
}
let n = 0;
function rep(a, b) { if (s.includes(a)) { s = s.split(a).join(b); n++; } }

rep('"rgba(255,255,255,0.85)"', '"rgba(255,255,255,0.06)"');                 // Chip-Hintergrund inaktiv
rep('color: active ? "#fff" : "#475569"', 'color: active ? "#fff" : "var(--vv-text, #cbd5e1)"'); // Chip-Text
rep('background: "#f1f5f9"', 'background: "rgba(255,255,255,0.08)"');        // Code-Slug-Chip
rep('"#64748b"', '"var(--vv-muted, #94a3b8)"');                             // graue Labels/Meta

fs.writeFileSync(FILE, s, "utf8");
console.log(`✅ /coms dunkel angepasst (${n} Stellen).`);
