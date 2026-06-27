// Idempotenter Patch: Melden-Button (🚩) an jedem Gästebuch-Eintrag.
// targetType="guestbook". Nicht bei eigenen Einträgen.

import fs from "node:fs";
import path from "node:path";

const FILE = path.join(process.cwd(), "components", "Gaestebuch.jsx");

if (!fs.existsSync(FILE)) {
  console.error("⚠ components/Gaestebuch.jsx nicht gefunden — übersprungen.");
  process.exit(0);
}

let src = fs.readFileSync(FILE, "utf8");
let changed = false;

const IMPORT_ANCHOR = 'import InlineToolbar from "./InlineToolbar";';
const IMPORT_LINE = 'import ReportButton from "./ReportButton";';
if (!src.includes(IMPORT_LINE)) {
  if (!src.includes(IMPORT_ANCHOR)) { console.error("⚠ Import-Anker nicht gefunden."); process.exit(1); }
  src = src.replace(IMPORT_ANCHOR, IMPORT_ANCHOR + "\n" + IMPORT_LINE);
  changed = true;
}

const META_ANCHOR = '<span>{relTime(entry.at)}</span>';
const BUTTON_MARKER = 'targetType="guestbook"';
if (!src.includes(BUTTON_MARKER)) {
  if (!src.includes(META_ANCHOR)) { console.error("⚠ Meta-Anker nicht gefunden."); process.exit(1); }
  const INSERT = META_ANCHOR +
    '\n                {me && entry.from_username !== me.username && (' +
    '\n                  <span style={{ marginLeft: 6, display: "inline-flex", verticalAlign: "middle" }}>' +
    '\n                    <ReportButton targetType="guestbook" targetId={entry.id} contentSnapshot={entry.text || ""} variant="icon" />' +
    '\n                  </span>' +
    '\n                )}';
  src = src.replace(META_ANCHOR, INSERT);
  changed = true;
}

if (changed) {
  fs.writeFileSync(FILE, src, "utf8");
  console.log("✅ Gästebuch: Melden-Button (🚩) an jedem Eintrag eingefügt.");
} else {
  console.log("ℹ Gästebuch: Melden-Button bereits vorhanden — nichts zu tun.");
}
