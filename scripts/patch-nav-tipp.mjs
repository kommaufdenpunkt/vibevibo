// 🧭 Menüpunkt „⚽ Tippspiel WM" → /tipp in die Edge-Navigation einhängen (idempotent).
import fs from "node:fs";
import path from "node:path";

const FILE = path.join(process.cwd(), "components", "EdgePanels.jsx");
if (!fs.existsSync(FILE)) { console.error("⚠ components/EdgePanels.jsx nicht gefunden."); process.exit(0); }

let src = fs.readFileSync(FILE, "utf8");
if (src.includes('href: "/tipp"')) {
  console.log("ℹ Tippspiel-WM-Menüpunkt bereits vorhanden — nichts zu tun.");
  process.exit(0);
}

// Anker: die Mitglieder-Zeile in der Community-Gruppe.
const ANCHOR = `{ href: "/mitglieder", label: "Mitglieder", icon: "👥", bg: "linear-gradient(135deg, #3b82f6, #1d4ed8)" },`;
const INSERT = ANCHOR + `\n      { href: "/tipp", label: "Tippspiel WM", icon: "⚽", bg: "linear-gradient(135deg, #141414, #DD0000)" },`;

if (src.includes(ANCHOR)) {
  src = src.replace(ANCHOR, INSERT);
  fs.writeFileSync(FILE, src, "utf8");
  console.log("✅ EdgePanels.jsx: Menuepunkt Tippspiel WM -> /tipp ergaenzt.");
} else {
  console.error("⚠ Anker (Mitglieder-Navizeile) nicht gefunden — Menüpunkt NICHT ergänzt.");
}
