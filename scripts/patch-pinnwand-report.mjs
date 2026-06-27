// Idempotenter Patch: Melden-Button (🚩) an jedem Pinnwand-Eintrag.
//
// Fügt hinzu:
//   1) import ReportButton from "./ReportButton";
//   2) <ReportButton targetType="pinnwand" ...> in der Meta-Zeile jedes Eintrags
//      (nur für eingeloggte User, nicht bei eigenen Posts).
//
// Mehrfach-Ausführung ist sicher (prüft auf Marker).

import fs from "node:fs";
import path from "node:path";

const FILE = path.join(process.cwd(), "components", "Pinnwand.jsx");

if (!fs.existsSync(FILE)) {
  console.error("⚠ components/Pinnwand.jsx nicht gefunden — übersprungen.");
  process.exit(0);
}

let src = fs.readFileSync(FILE, "utf8");
let changed = false;

// ── 1) Import ────────────────────────────────────────────────────────────
const IMPORT_ANCHOR = 'import EmbeddedMedia from "./EmbeddedMedia";';
const IMPORT_LINE = 'import ReportButton from "./ReportButton";';
if (!src.includes(IMPORT_LINE)) {
  if (!src.includes(IMPORT_ANCHOR)) {
    console.error("⚠ Import-Anker nicht gefunden — Patch abgebrochen.");
    process.exit(1);
  }
  src = src.replace(IMPORT_ANCHOR, IMPORT_ANCHOR + "\n" + IMPORT_LINE);
  changed = true;
}

// ── 2) Button in der Meta-Zeile ────────────────────────────────────────────
const META_ANCHOR = '<span>{relTime(entry.at)}</span>';
const BUTTON_MARKER = 'targetType="pinnwand"';
if (!src.includes(BUTTON_MARKER)) {
  if (!src.includes(META_ANCHOR)) {
    console.error("⚠ Meta-Anker nicht gefunden — Patch abgebrochen.");
    process.exit(1);
  }
  const INSERT = META_ANCHOR +
    '\n                {me && entry.from_username !== me.username && (' +
    '\n                  <span style={{ marginLeft: 6, display: "inline-flex", verticalAlign: "middle" }}>' +
    '\n                    <ReportButton targetType="pinnwand" targetId={entry.id} contentSnapshot={entry.text || ""} variant="icon" />' +
    '\n                  </span>' +
    '\n                )}';
  src = src.replace(META_ANCHOR, INSERT);
  changed = true;
}

if (changed) {
  fs.writeFileSync(FILE, src, "utf8");
  console.log("✅ Pinnwand: Melden-Button (🚩) an jedem Eintrag eingefügt.");
} else {
  console.log("ℹ Pinnwand: Melden-Button bereits vorhanden — nichts zu tun.");
}
