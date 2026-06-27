// Idempotenter Patch: Melden-Button (🚩) auf Buschfunk-POSTS.
//
// Kommentare haben bereits einen Melden-Button (CommentRow → onReport).
// Den Posts selbst fehlte er — diese Lücke schließt dieser Patch.
//
// Fügt hinzu:
//   1) import ReportButton from "./ReportButton";
//   2) <ReportButton targetType="buschfunk_post" ...> in der Card-Kopfzeile
//      (rechtsbündig neben der Uhrzeit), nur wenn ev.postId > 0.
//
// Mehrfach-Ausführung ist sicher: prüft auf Marker und überspringt.

import fs from "node:fs";
import path from "node:path";

const FILE = path.join(process.cwd(), "components", "Buschfunk.jsx");

if (!fs.existsSync(FILE)) {
  console.error("⚠ components/Buschfunk.jsx nicht gefunden — übersprungen.");
  process.exit(0);
}

let src = fs.readFileSync(FILE, "utf8");
let changed = false;

// ── 1) Import ────────────────────────────────────────────────────────────
const IMPORT_ANCHOR = 'import VoiceMessage from "./VoiceMessage";';
const IMPORT_LINE = 'import ReportButton from "./ReportButton";';
if (!src.includes(IMPORT_LINE)) {
  if (!src.includes(IMPORT_ANCHOR)) {
    console.error("⚠ Import-Anker nicht gefunden — Patch abgebrochen.");
    process.exit(1);
  }
  src = src.replace(IMPORT_ANCHOR, IMPORT_ANCHOR + "\n" + IMPORT_LINE);
  changed = true;
}

// ── 2) Button in der Card-Kopfzeile ───────────────────────────────────────
const HEAD_ANCHOR = '<span className="vv-bf-card-time">{relTime(ev.at)}</span>';
const BUTTON_MARKER = 'targetType="buschfunk_post"';
if (!src.includes(BUTTON_MARKER)) {
  if (!src.includes(HEAD_ANCHOR)) {
    console.error("⚠ Kopfzeilen-Anker nicht gefunden — Patch abgebrochen.");
    process.exit(1);
  }
  const INSERT = HEAD_ANCHOR +
    '\n          {ev.postId > 0 && (' +
    '\n            <span style={{ marginLeft: "auto", display: "inline-flex" }}>' +
    '\n              <ReportButton targetType="buschfunk_post" targetId={ev.postId} contentSnapshot={ev.detail || ""} variant="icon" />' +
    '\n            </span>' +
    '\n          )}';
  src = src.replace(HEAD_ANCHOR, INSERT);
  changed = true;
}

if (changed) {
  fs.writeFileSync(FILE, src, "utf8");
  console.log("✅ Buschfunk-Posts: Melden-Button (🚩) eingefügt.");
} else {
  console.log("ℹ Buschfunk-Posts: Melden-Button bereits vorhanden — nichts zu tun.");
}
