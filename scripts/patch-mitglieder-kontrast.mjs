// Idempotenter Patch: Mitglieder-Seite lesbar auf dunklem Theme.
// NUR Texte direkt auf dem dunklen Seitenhintergrund werden hell —
// der dunkle Text in den weißen Member-Karten bleibt unangetastet.
// Anker ohne führende Einrückung → robust gegen Whitespace.

import fs from "node:fs";
import path from "node:path";

const FILE = path.join(process.cwd(), "app", "mitglieder", "page.jsx");

if (!fs.existsSync(FILE)) {
  console.error("⚠ app/mitglieder/page.jsx nicht gefunden — übersprungen.");
  process.exit(0);
}

let src = fs.readFileSync(FILE, "utf8");
let n = 0;

function swap(oldStr, newStr) {
  if (src.includes(oldStr)) { src = src.split(oldStr).join(newStr); n++; }
}

// 1) Überschrift „👥 Mitglieder" (mehrzeilig)
swap(
  '<h1 style={{\n        fontSize: 26, fontWeight: 900, color: "#1c1c1e", margin: "0 0 4px",\n        textShadow: "0 1px 2px rgba(255,255,255,0.5)",\n      }}>',
  '<h1 style={{\n        fontSize: 26, fontWeight: 900, color: "#ffffff", margin: "0 0 4px",\n        textShadow: "0 2px 4px rgba(0,0,0,0.6)",\n      }}>',
);

// 2) Untertitel „Alle aktiven Mitglieder …"
swap(
  '<p style={{ fontSize: 13, color: "#334155", margin: "0 0 14px", fontWeight: 500, lineHeight: 1.5 }}>',
  '<p style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", margin: "0 0 14px", fontWeight: 500, lineHeight: 1.5 }}>',
);

// 3) Logout-Hinweis (Überschrift + Text)
swap(
  '<h2 style={{ color: "#1c1c1e" }}>👥 Mitglieder</h2>',
  '<h2 style={{ color: "#ffffff" }}>👥 Mitglieder</h2>',
);
swap(
  '<p style={{ color: "#475569" }}>',
  '<p style={{ color: "rgba(255,255,255,0.85)" }}>',
);

// 4) „Lädt…"
swap(
  '<div style={{ padding: 30, textAlign: "center", color: "#475569" }}>Lädt…</div>',
  '<div style={{ padding: 30, textAlign: "center", color: "rgba(255,255,255,0.7)" }}>Lädt…</div>',
);

// 5) Pagination „Seite x von y"
swap(
  '<span style={{ fontSize: 13, color: "#475569", fontWeight: 800 }}>',
  '<span style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: 800 }}>',
);

if (n > 0) {
  fs.writeFileSync(FILE, src, "utf8");
  console.log(`✅ Mitglieder-Seite: ${n} Text-Stelle(n) für Dark-Theme lesbar gemacht.`);
} else {
  console.log("ℹ Mitglieder-Seite: bereits lesbar — nichts zu tun.");
}
