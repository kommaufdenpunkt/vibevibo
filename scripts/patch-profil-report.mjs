// Idempotenter Patch: Melden-Button (🚩) in der Sicherheits-Sektion fremder Profile.
//
// Setzt den Button direkt neben SOS + Block (genau dort, wo der Besucher
// schon „Sicherheits-Aktionen" erwartet). targetType="profile".
//
// Mehrfach-Ausführung ist sicher (prüft auf Marker).

import fs from "node:fs";
import path from "node:path";

const FILE = path.join(process.cwd(), "components", "NostalgicProfileView.jsx");

if (!fs.existsSync(FILE)) {
  console.error("⚠ components/NostalgicProfileView.jsx nicht gefunden — übersprungen.");
  process.exit(0);
}

let src = fs.readFileSync(FILE, "utf8");
let changed = false;

// ── 1) Import ────────────────────────────────────────────────────────────
const IMPORT_ANCHOR = 'import BlockButton from "@/components/BlockButton";';
const IMPORT_LINE = 'import ReportButton from "@/components/ReportButton";';
if (!src.includes(IMPORT_LINE)) {
  if (!src.includes(IMPORT_ANCHOR)) {
    console.error("⚠ Import-Anker nicht gefunden — Patch abgebrochen.");
    process.exit(1);
  }
  src = src.replace(IMPORT_ANCHOR, IMPORT_ANCHOR + "\n" + IMPORT_LINE);
  changed = true;
}

// ── 2) Button neben SOS + Block ────────────────────────────────────────────
const ANCHOR = '<BlockButton username={profile.username} compact />';
const BUTTON_MARKER = 'targetType="profile"';
if (!src.includes(BUTTON_MARKER)) {
  if (!src.includes(ANCHOR)) {
    console.error("⚠ Sicherheits-Anker nicht gefunden — Patch abgebrochen.");
    process.exit(1);
  }
  const INSERT = ANCHOR +
    '\n            <ReportButton targetType="profile" targetId={profile.id} targetOwnerId={profile.id} contentSnapshot={`@${profile.username} · ${profile.displayName}`} variant="text" title="Profil melden" />';
  src = src.replace(ANCHOR, INSERT);
  changed = true;
}

if (changed) {
  fs.writeFileSync(FILE, src, "utf8");
  console.log("✅ Profil: Melden-Button (🚩) in Sicherheits-Sektion eingefügt.");
} else {
  console.log("ℹ Profil: Melden-Button bereits vorhanden — nichts zu tun.");
}
